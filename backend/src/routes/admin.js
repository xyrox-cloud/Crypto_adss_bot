const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { getDb, getSettings } = require('../db/database');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

/* ─────────────────────────────────────────────────────────────────
   Payout Announcement Helper
───────────────────────────────────────────────────────────────── */
function generatePayoutMessage(amount, userIdentifier, walletAddress, txHash = null) {
  const displayWallet = walletAddress.length > 10 
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` 
    : walletAddress;
  
  let msg = `✅ <b>PAYOUT SUCCESSFUL</b>\n\n`;
  msg += `💰 <b>Amount:</b> ${parseFloat(amount).toFixed(2)} USDT\n`;
  msg += `👤 <b>User:</b> ${userIdentifier}\n`;
  msg += `🌐 <b>Network:</b> BEP20\n`;
  msg += `📮 <b>To:</b> <code>${displayWallet}</code>\n`;
  
  if (txHash) {
    msg += `🔍 <b>Tx:</b> <a href="https://bscscan.com/tx/${txHash}">${txHash}</a>`;
  }
  
  return msg;
}

function sendPayoutAnnouncement(amount, userIdentifier, walletAddress, txHash) {
  if (process.env.ENABLE_PAYOUT_ANNOUNCEMENTS !== 'true' || !process.env.PAYOUT_CHANNEL_ID || !process.env.BOT_TOKEN) {
    return;
  }
  
  const message = generatePayoutMessage(amount, userIdentifier, walletAddress, txHash);
  
  fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: process.env.PAYOUT_CHANNEL_ID,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    })
  })
  .then(res => res.json())
  .then(data => {
    if (!data.ok) {
      console.error('[PAYOUT ANNOUNCEMENT FAILED]', data);
    }
  })
  .catch(err => console.error('[PAYOUT ANNOUNCEMENT ERROR]', err));
}

/* ─────────────────────────────────────────────────────────────────
   Helper: log an admin action to the activity_log table
───────────────────────────────────────────────────────────────── */
function logAction(db, action, details) {
  try {
    db.prepare(
      `INSERT INTO activity_log (admin, action, details) VALUES ('admin', ?, ?)`
    ).run(action, typeof details === 'object' ? JSON.stringify(details) : String(details));
  } catch (e) {
    console.error('[AUDIT LOG ERROR]', e);
  }
}

/* ─────────────────────────────────────────────────────────────────
   POST /api/admin/login
───────────────────────────────────────────────────────────────── */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 login requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' }
});

router.post('/login', loginLimiter, (req, res) => {
  const { password } = req.body;
  const storedHash = process.env.ADMIN_PASSWORD;

  if (!password || !storedHash) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Support both plain-text (legacy dev) and bcrypt hashes
  let valid = false;
  if (storedHash.startsWith('$2')) {
    // bcrypt hash
    valid = bcrypt.compareSync(password, storedHash);
  } else {
    // plain text (dev only)
    valid = password === storedHash;
  }

  if (!valid) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const token = jwt.sign(
    { role: 'admin', iat: Date.now() },
    process.env.ADMIN_JWT_SECRET,
    { expiresIn: '30m' }  // 30-min inactivity — client renews on each action
  );

  res.json({ token });
});

/* ─────────────────────────────────────────────────────────────────
   POST /api/admin/refresh  — sliding session renewal (Deprecated)
───────────────────────────────────────────────────────────────── */
router.post('/refresh', requireAdmin, (req, res) => {
  const token = jwt.sign(
    { role: 'admin', iat: Date.now() },
    process.env.ADMIN_JWT_SECRET,
    { expiresIn: '30m' }
  );
  res.json({ token });
});

/* ─────────────────────────────────────────────────────────────────
   GET /api/admin/stats  — dashboard overview
───────────────────────────────────────────────────────────────── */
router.get('/stats', requireAdmin, (req, res) => {
  try {
    const db = getDb();

    const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    const bannedUsers = db.prepare('SELECT COUNT(*) as c FROM users WHERE banned = 1').get().c;

    const adsToday    = db.prepare(`SELECT COUNT(*) as c FROM ad_watches WHERE date(timestamp)=date('now')`).get().c;
    const adsThisWeek = db.prepare(`SELECT COUNT(*) as c FROM ad_watches WHERE timestamp>=datetime('now','-7 days')`).get().c;
    const adsAllTime  = db.prepare('SELECT COUNT(*) as c FROM ad_watches').get().c;

    const totalRevenue = db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM platform_revenue`).get().t;
    const totalPaidOut = db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM withdrawals WHERE status='paid'`).get().t;

    const pendingCount = db.prepare(`SELECT COUNT(*) as c FROM withdrawals WHERE status='pending'`).get().c;
    const pendingAmount = db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM withdrawals WHERE status='pending'`).get().t;

    res.json({
      total_users: totalUsers,
      banned_users: bannedUsers,
      ads_today: adsToday,
      ads_this_week: adsThisWeek,
      ads_all_time: adsAllTime,
      total_revenue: totalRevenue,
      total_paid_out: totalPaidOut,
      pending_withdrawals_count: pendingCount,
      pending_withdrawals_amount: pendingAmount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/* ─────────────────────────────────────────────────────────────────
   GET /api/admin/withdrawals
   ?status=pending|paid|rejected&search=&page=&limit=
───────────────────────────────────────────────────────────────── */
router.get('/withdrawals', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { status, search } = req.query;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    if (status && ['pending', 'paid', 'rejected'].includes(status)) {
      conditions.push('w.status = ?');
      params.push(status);
    }
    if (search) {
      conditions.push('(u.username LIKE ? OR u.first_name LIKE ? OR w.wallet_address LIKE ? OR w.telegram_id LIKE ?)');
      const q = `%${search}%`;
      params.push(q, q, q, q);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = db.prepare(`
      SELECT w.id, w.telegram_id, w.amount, w.wallet_address, w.status,
             w.requested_at, w.paid_at, w.admin_note,
             u.username, u.first_name
      FROM withdrawals w
      LEFT JOIN users u ON w.user_id = u.id
      ${where}
      ORDER BY
        CASE w.status WHEN 'pending' THEN 0 WHEN 'paid' THEN 1 ELSE 2 END,
        w.requested_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    const total = db.prepare(`
      SELECT COUNT(*) as c
      FROM withdrawals w LEFT JOIN users u ON w.user_id=u.id
      ${where}
    `).all(...params)[0].c;

    res.json({
      withdrawals: rows,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch withdrawals' });
  }
});

/* ─────────────────────────────────────────────────────────────────
   PATCH /api/admin/withdrawals/:id
   body: { action: 'approve'|'reject', admin_note? }
───────────────────────────────────────────────────────────────── */
router.patch('/withdrawals/:id', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { action, admin_note } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'action must be approve or reject' });
    }

    const withdrawal = db.prepare(`
      SELECT w.*, u.username FROM withdrawals w
      LEFT JOIN users u ON w.user_id = u.id
      WHERE w.id = ?
    `).get(id);

    if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });
    if (withdrawal.status !== 'pending') {
      return res.status(409).json({ error: `Withdrawal is already ${withdrawal.status}` });
    }

    const newStatus = action === 'approve' ? 'paid' : 'rejected';

    const tx = db.transaction(() => {
      if (newStatus === 'paid') {
        db.prepare(`
          UPDATE withdrawals SET status='paid', paid_at=CURRENT_TIMESTAMP, admin_note=? WHERE id=?
        `).run(admin_note || null, id);
      } else {
        // Refund balance on rejection
        db.prepare(`
          UPDATE withdrawals SET status='rejected', admin_note=? WHERE id=?
        `).run(admin_note || null, id);
        db.prepare(`
          UPDATE users SET balance = balance + ? WHERE id=?
        `).run(withdrawal.amount, withdrawal.user_id);
      }
    });

    tx();

    logAction(db, action === 'approve' ? 'WITHDRAWAL_APPROVED' : 'WITHDRAWAL_REJECTED', {
      withdrawal_id: id,
      telegram_id: withdrawal.telegram_id,
      username: withdrawal.username,
      amount: withdrawal.amount,
      wallet: withdrawal.wallet_address,
      note: admin_note || null,
    });

    // Trigger fire-and-forget announcement if approved
    if (newStatus === 'paid') {
      const userIdentifier = withdrawal.username ? `@${withdrawal.username}` : withdrawal.telegram_id;
      sendPayoutAnnouncement(withdrawal.amount, userIdentifier, withdrawal.wallet_address, admin_note);
    }

    res.json({ success: true, status: newStatus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update withdrawal' });
  }
});

/* ─────────────────────────────────────────────────────────────────
   GET /api/admin/users
   ?search=&page=&limit=&sort=created_at|balance|total_ads_watched&order=asc|desc
───────────────────────────────────────────────────────────────── */
router.get('/users', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { search } = req.query;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
    const offset = (page - 1) * limit;

    const allowedSorts = ['created_at', 'balance', 'total_earned', 'total_ads_watched', 'last_seen'];
    const sort  = allowedSorts.includes(req.query.sort) ? req.query.sort : 'created_at';
    const order = req.query.order === 'asc' ? 'ASC' : 'DESC';

    const params = [];
    let where = '';
    if (search) {
      where = `WHERE (username LIKE ? OR first_name LIKE ? OR telegram_id LIKE ?)`;
      const q = `%${search}%`;
      params.push(q, q, q);
    }

    const rows = db.prepare(`
      SELECT id, telegram_id, username, first_name, balance, total_earned,
             total_ads_watched, referral_count, banned, created_at, last_seen
      FROM users
      ${where}
      ORDER BY ${sort} ${order}
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    const total = db.prepare(`SELECT COUNT(*) as c FROM users ${where}`).all(...params)[0].c;

    res.json({
      users: rows,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/* ─────────────────────────────────────────────────────────────────
   PATCH /api/admin/users/:id/balance
   body: { delta: number (positive or negative), reason: string }
───────────────────────────────────────────────────────────────── */
router.patch('/users/:id/balance', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { delta, reason } = req.body;

    if (typeof delta !== 'number' || isNaN(delta)) {
      return res.status(400).json({ error: 'delta must be a number' });
    }
    if (!reason || reason.trim().length < 3) {
      return res.status(400).json({ error: 'reason is required (min 3 chars)' });
    }

    const user = db.prepare('SELECT id, telegram_id, username, balance FROM users WHERE id=?').get(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newBalance = Math.max(0, user.balance + delta);
    db.prepare('UPDATE users SET balance=? WHERE id=?').run(newBalance, id);

    logAction(db, 'BALANCE_ADJUST', {
      user_id: id,
      telegram_id: user.telegram_id,
      username: user.username,
      delta,
      old_balance: user.balance,
      new_balance: newBalance,
      reason: reason.trim(),
    });

    res.json({ success: true, new_balance: newBalance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to adjust balance' });
  }
});

/* ─────────────────────────────────────────────────────────────────
   PATCH /api/admin/users/:id/ban
   body: { banned: 0|1, reason? }
───────────────────────────────────────────────────────────────── */
router.patch('/users/:id/ban', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { banned } = req.body;

    if (banned !== 0 && banned !== 1) {
      return res.status(400).json({ error: 'banned must be 0 or 1' });
    }

    const user = db.prepare('SELECT id, telegram_id, username FROM users WHERE id=?').get(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Prevent banning the Super Admin
    if (process.env.SUPER_ADMIN_ID && String(user.telegram_id) === process.env.SUPER_ADMIN_ID) {
      return res.status(403).json({ error: 'Cannot ban the Super Admin' });
    }

    db.prepare('UPDATE users SET banned=? WHERE id=?').run(banned, id);

    logAction(db, banned ? 'USER_BANNED' : 'USER_UNBANNED', {
      user_id: id,
      telegram_id: user.telegram_id,
      username: user.username,
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update ban status' });
  }
});

/* ─────────────────────────────────────────────────────────────────
   GET /api/admin/settings
───────────────────────────────────────────────────────────────── */
router.get('/settings', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT key, value, description, updated_at FROM settings ORDER BY key').all();
    res.json({ settings: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/* ─────────────────────────────────────────────────────────────────
   PUT /api/admin/settings
   body: { settings: [{ key, value }] }
───────────────────────────────────────────────────────────────── */
router.put('/settings', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { settings } = req.body;

    if (!Array.isArray(settings) || settings.length === 0) {
      return res.status(400).json({ error: 'settings must be a non-empty array' });
    }

    const allowed = ['reward_per_ad', 'platform_cut_pct', 'max_ads_per_day', 'min_withdrawal', 'ad_cooldown_secs'];
    const updated = [];

    const upsert = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP
    `);

    const tx = db.transaction(() => {
      for (const { key, value } of settings) {
        if (!allowed.includes(key)) continue;
        const strVal = String(value).trim();
        upsert.run(key, strVal);
        updated.push({ key, value: strVal });
      }
    });
    tx();

    logAction(db, 'SETTINGS_CHANGED', { updated });

    res.json({ success: true, updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

/* ─────────────────────────────────────────────────────────────────
   GET /api/admin/activity-log
   ?page=&limit=
───────────────────────────────────────────────────────────────── */
router.get('/activity-log', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30));
    const offset = (page - 1) * limit;

    const rows = db.prepare(`
      SELECT id, admin, action, details, created_at
      FROM activity_log
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const total = db.prepare('SELECT COUNT(*) as c FROM activity_log').get().c;

    res.json({
      logs: rows,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
});

/* ─────────────────────────────────────────────────────────────────
   GET /api/admin/ad-watches  (legacy compat)
───────────────────────────────────────────────────────────────── */
router.get('/ad-watches', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const limit = Math.max(1, parseInt(req.query.limit) || 100);
    const watches = db.prepare(`
      SELECT a.*, u.username
      FROM ad_watches a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.timestamp DESC
      LIMIT ?
    `).all(limit);
    res.json({ watches });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch ad watches' });
  }
});

/* ─────────────────────────────────────────────────────────────────
   GET /api/admin/tickets
   ?status=open|closed&page=&limit=
───────────────────────────────────────────────────────────────── */
router.get('/tickets', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { status, search } = req.query;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    if (status && ['open', 'closed'].includes(status)) {
      conditions.push('t.status = ?');
      params.push(status);
    }
    if (search) {
      conditions.push('(u.username LIKE ? OR u.first_name LIKE ? OR t.telegram_id LIKE ?)');
      const q = `%${search}%`;
      params.push(q, q, q);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = db.prepare(`
      SELECT t.*, u.username, u.first_name
      FROM support_tickets t
      LEFT JOIN users u ON t.user_id = u.id
      ${where}
      ORDER BY 
        CASE t.status WHEN 'open' THEN 0 ELSE 1 END,
        t.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    const total = db.prepare(`
      SELECT COUNT(*) as c
      FROM support_tickets t LEFT JOIN users u ON t.user_id=u.id
      ${where}
    `).all(...params)[0].c;

    res.json({
      tickets: rows,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

/* ─────────────────────────────────────────────────────────────────
   PATCH /api/admin/tickets/:id
   body: { status: 'closed', admin_reply: 'text' }
───────────────────────────────────────────────────────────────── */
router.patch('/tickets/:id', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { status, admin_reply } = req.body;

    const ticket = db.prepare('SELECT * FROM support_tickets WHERE id=?').get(id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    db.prepare(`
      UPDATE support_tickets 
      SET status = ?, admin_reply = COALESCE(?, admin_reply)
      WHERE id = ?
    `).run(status || ticket.status, admin_reply, id);

    logAction(db, 'TICKET_UPDATED', { ticket_id: id, status });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

module.exports = router;
