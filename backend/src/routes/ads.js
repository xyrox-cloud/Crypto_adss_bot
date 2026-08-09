const express = require('express');
const { getDb, getSettings } = require('../db/database');
const { extractTelegramUser } = require('../middleware/auth');
const router = express.Router();

// ── POST /api/ads/watched ────────────────────────────────────────────────────
router.post('/watched', extractTelegramUser, (req, res) => {
  try {
    const db = getDb();
    const telegramId = req.telegramUser.id;
    const ipAddress = req.ip || req.connection?.remoteAddress;

    // Read live settings from DB (not hardcoded env)
    const settings = getSettings();
    const maxAdsPerDay    = Math.floor(settings.max_ads_per_day  ?? 20);
    const rewardUsdt      = parseFloat(settings.reward_per_ad    ?? 0.01);
    const platformCutPct  = parseFloat(settings.platform_cut_pct ?? 40) / 100;
    const cooldownSecs    = parseInt(settings.ad_cooldown_secs   ?? 30, 10);

    const user = db.prepare(
      'SELECT id, balance, total_earned, total_ads_watched, banned FROM users WHERE telegram_id = ?'
    ).get(telegramId);

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.banned) return res.status(403).json({ error: 'Account is banned' });

    // Daily limit check
    const todayCount = db.prepare(`
      SELECT COUNT(*) as count FROM ad_watches
      WHERE user_id = ? AND date(timestamp) = date('now')
    `).get(user.id).count;

    if (todayCount >= maxAdsPerDay) {
      return res.status(429).json({ error: `Daily ad limit reached (${maxAdsPerDay}/day)` });
    }

    // Cooldown check
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

    const userShare    = rewardUsdt * (1 - platformCutPct);
    const platformCut  = rewardUsdt * platformCutPct;

    // Atomic transaction
    const watchTx = db.transaction(() => {
      const watchInfo = db.prepare(`
        INSERT INTO ad_watches (user_id, telegram_id, reward_amount, platform_cut, ip_address)
        VALUES (?, ?, ?, ?, ?)
      `).run(user.id, telegramId, userShare, platformCut, ipAddress);

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

      return watchInfo.lastInsertRowid;
    });

    watchTx();

    res.json({
      success: true,
      reward: userShare,
      new_balance: user.balance + userShare,
      ads_today: todayCount + 1
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process ad watch' });
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
