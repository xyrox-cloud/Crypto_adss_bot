const express = require('express');
const rateLimit = require('express-rate-limit');
const { getDb, getSettings } = require('../db/database');
const { extractTelegramUser } = require('../middleware/auth');
const router = express.Router();

const rewardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' }
});

// ── GET /api/ads/reward (Adsgram Webhook) ────────────────────────────────────
router.get('/reward', rewardLimiter, (req, res) => {
  try {
    const db = getDb();
    let telegramId = req.query.userid;
    const token = req.query.token;

    if (telegramId) telegramId = String(telegramId).split('.')[0];

    // 1. Verify request authenticity
    const secret = process.env.ADSGRAM_SECRET;
    if (secret && token !== secret) {
      return res.status(403).json({ error: 'Forbidden: Invalid token' });
    }
    
    if (!telegramId) {
      return res.status(400).json({ error: 'Missing userid parameter' });
    }

    // 2. Look up user
    const user = db.prepare(
      'SELECT id, balance, total_earned, total_ads_watched, banned FROM users WHERE telegram_id = ?'
    ).get(telegramId);

    if (!user) return res.status(400).json({ error: 'User not found' });
    if (user.banned) return res.status(403).json({ error: 'Account is banned' });

    // 3. Read live settings from DB
    const settings = getSettings();
    const maxAdsPerDay    = Math.floor(settings.max_ads_per_day  ?? 20);
    const sharedConfig    = require('../../../config.json');
    const rewardUsdt      = sharedConfig.REWARD_PER_AD;
    
    // Fetch revenue_split or calculate from platform_cut_pct
    const userSplitPct    = parseFloat(settings.revenue_split ?? (100 - parseFloat(settings.platform_cut_pct ?? 40)));
    const cooldownSecs    = parseInt(settings.ad_cooldown_secs   ?? 30, 10);

    // 4. Daily limit check
    const todayCount = db.prepare(`
      SELECT COUNT(*) as count FROM ad_watches
      WHERE user_id = ? AND date(timestamp) = date('now')
    `).get(user.id).count;

    if (todayCount >= maxAdsPerDay) {
      return res.status(429).json({ error: `Daily ad limit reached (${maxAdsPerDay}/day)` });
    }

    // Hourly limit check
    const maxAdsPerHour = Math.floor(settings.max_ads_per_hour ?? 5);
    const hourCount = db.prepare(`
      SELECT COUNT(*) as count FROM ad_watches
      WHERE user_id = ? AND timestamp >= datetime('now', '-1 hour')
    `).get(user.id).count;

    if (hourCount >= maxAdsPerHour) {
      return res.status(429).json({ error: `Hourly ad limit reached (${maxAdsPerHour}/hour)` });
    }

    // Cooldown check (similar to hourly/rate limit)
    if (cooldownSecs > 0) {
      const lastWatch = db.prepare(`
        SELECT timestamp FROM ad_watches
        WHERE user_id = ?
        ORDER BY timestamp DESC
        LIMIT 1
      `).get(user.id);

      if (lastWatch) {
        const secsSinceLast = (Date.now() - new Date(lastWatch.timestamp).getTime()) / 1000;
        if (secsSinceLast < cooldownSecs) {
          const waitSecs = Math.ceil(cooldownSecs - secsSinceLast);
          return res.status(429).json({ error: `Please wait ${waitSecs}s before watching another ad` });
        }
      }
    }

    // 5. Calculate shares
    const userShare    = rewardUsdt * (userSplitPct / 100);
    const platformCut  = rewardUsdt - userShare;
    const ipAddress    = req.ip || req.connection?.remoteAddress;

    // 6. Atomic transaction to credit user and record ad watch / reward
    const watchTx = db.transaction(() => {
      const watchInfo = db.prepare(`
        INSERT INTO ad_watches (user_id, telegram_id, reward_amount, platform_cut, ip_address, source)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(user.id, telegramId, userShare, platformCut, ipAddress, 'adsgram_callback');

      db.prepare(`
        INSERT INTO ad_rewards (user_id, amount, ip)
        VALUES (?, ?, ?)
      `).run(user.id, userShare, ipAddress);

      db.prepare(`
        UPDATE users
        SET balance = balance + ?,
            total_earned = total_earned + ?,
            total_ads_watched = total_ads_watched + 1,
            last_seen = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(userShare, userShare, user.id);

      db.prepare(`
        INSERT INTO platform_revenue (ad_watch_id, amount) VALUES (?, ?)
      `).run(watchInfo.lastInsertRowid, platformCut);

      db.prepare(`
        INSERT INTO activity_log (action, details) VALUES (?, ?)
      `).run('ad_reward_granted', `User ${telegramId} earned ${userShare} TON`);

      return watchInfo.lastInsertRowid;
    });

    watchTx();

    // Check for referral bonus if this is their first action
    // Fetch user again to have the latest state (referral_bonus_paid)
    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    const { processReferralBonus } = require('../db/database');
    processReferralBonus(db, updatedUser, ipAddress);

    // 7. Return plain 200 OK
    res.status(200).json({ success: true });

  } catch (err) {
    console.error('Adsgram webhook error:', err);
    res.status(500).json({ error: 'Failed to process ad watch webhook' });
  }
});

// ── GET /api/ads/stats ───────────────────────────────────────────────────────
router.get('/stats', extractTelegramUser, (req, res) => {
  try {
    const db = getDb();
    const telegramId = req.telegramUser.id;

    const user = db.prepare('SELECT id, total_earned FROM users WHERE telegram_id = ?').get(telegramId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const todayCount = db.prepare(`
      SELECT COUNT(*) as count FROM ad_watches
      WHERE user_id = ? AND date(timestamp) = date('now')
    `).get(user.id).count;

    const weekCount = db.prepare(`
      SELECT COUNT(*) as count FROM ad_watches
      WHERE user_id = ? AND timestamp >= datetime('now', '-7 days')
    `).get(user.id).count;

    res.json({
      ads_today: todayCount,
      ads_this_week: weekCount,
      total_earned: user.total_earned
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch ad stats' });
  }
});

// ── GET /api/ads/history ─────────────────────────────────────────────────────
router.get('/history', extractTelegramUser, (req, res) => {
  try {
    const db = getDb();
    const telegramId = req.telegramUser.id;
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit)  || 50));
    const offset = Math.max(0, parseInt(req.query.offset) || 0);

    const user = db.prepare('SELECT id FROM users WHERE telegram_id = ?').get(telegramId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const watches = db.prepare(`
      SELECT id, reward_amount, timestamp
      FROM ad_watches
      WHERE user_id = ?
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `).all(user.id, limit, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM ad_watches WHERE user_id = ?').get(user.id).count;

    res.json({ watches, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch ad watch history' });
  }
});

module.exports = router;
