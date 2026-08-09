const express = require('express');
const { getDb, generateReferralCode } = require('../db/database');
const { extractTelegramUser } = require('../middleware/auth');
const router = express.Router();

router.post('/register', (req, res) => {
  try {
    let { telegram_id, username, first_name, referral_code } = req.body;
    if (!telegram_id) {
      return res.status(400).json({ error: 'telegram_id is required' });
    }
    telegram_id = String(telegram_id).split('.')[0];

    const db = getDb();
    
    // Check if user exists
    let user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegram_id);
    
    if (!user) {
      // Handle referral logic
      let validReferral = null;
      if (referral_code) {
        const referrer = db.prepare('SELECT telegram_id FROM users WHERE referral_code = ?').get(referral_code);
        if (referrer && referrer.telegram_id !== telegram_id) {
          validReferral = referrer.telegram_id;
        }
      }

      const newRefCode = generateReferralCode();
      const insertUser = db.prepare(`
        INSERT INTO users (telegram_id, username, first_name, referral_code, referred_by)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const info = insertUser.run(telegram_id, username, first_name, newRefCode, validReferral);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
    } else {
      // Update last_seen and other details if needed
      db.prepare('UPDATE users SET username = ?, first_name = ?, last_seen = CURRENT_TIMESTAMP WHERE telegram_id = ?')
        .run(username, first_name, telegram_id);
      user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegram_id);
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to register/fetch user' });
  }
});

router.get('/me', extractTelegramUser, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT balance, total_earned, referral_code, created_at, first_name, username FROM users WHERE telegram_id = ?')
                   .get(req.telegramUser.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

router.get('/referrals', extractTelegramUser, (req, res) => {
  try {
    const db = getDb();
    
    // referred_by stores the referrer's telegram_id (set at registration time)
    const referrals = db.prepare('SELECT username, first_name, created_at FROM users WHERE referred_by = ?')
                        .all(req.telegramUser.id);
                        
    res.json(referrals);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch referrals' });
  }
});

/* ─────────────────────────────────────────────────────────────────
   GET /api/users/leaderboard
───────────────────────────────────────────────────────────────── */
router.get('/leaderboard', extractTelegramUser, (req, res) => {
  try {
    const db = getDb();
    const { time } = req.query; // 'today' or 'all_time'

    let orderCol = 'total_ads_watched';
    let whereClause = '';

    if (time === 'today') {
      // For today, we might need to count from ad_watches, but since we don't have a daily column in users,
      // we join and group.
      const rows = db.prepare(`
        SELECT u.id, u.telegram_id, u.username, u.first_name, COUNT(a.id) as score
        FROM users u
        JOIN ad_watches a ON u.id = a.user_id
        WHERE date(a.timestamp) = date('now')
        GROUP BY u.id
        ORDER BY score DESC
        LIMIT 50
      `).all();

      res.json({ leaderboard: rows });
    } else {
      // All time
      const rows = db.prepare(`
        SELECT id, telegram_id, username, first_name, total_ads_watched as score
        FROM users
        ORDER BY total_ads_watched DESC
        LIMIT 50
      `).all();

      res.json({ leaderboard: rows });
    }
  } catch (err) {
    console.error('[Leaderboard]', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/* ─────────────────────────────────────────────────────────────────
   GET /api/users/channel-status
───────────────────────────────────────────────────────────────── */
router.get('/channel-status', extractTelegramUser, async (req, res) => {
  try {
    const telegramId = req.telegramUser.id;
    const botToken = process.env.BOT_TOKEN;
    const channel1 = process.env.REQUIRED_CHANNEL_1;
    const channel2 = process.env.REQUIRED_CHANNEL_2;
    
    if (!channel1 || !channel2) {
      // If not configured, assume they don't need to join
      return res.json({ required: false, isMember: true });
    }

    const checkChannel = async (channel) => {
      const url = `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${channel}&user_id=${telegramId}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data.ok) {
        // Handle failure cases (bot not admin, etc.)
        console.error(`[Channel Status] Error checking ${channel}:`, data.description);
        throw new Error(`Failed to check membership for ${channel}: ${data.description}`);
      }

      const status = data.result.status;
      return ['creator', 'administrator', 'member', 'restricted'].includes(status);
    };

    let isMember1 = false;
    let isMember2 = false;

    try {
      isMember1 = await checkChannel(channel1);
      isMember2 = await checkChannel(channel2);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }

    res.json({
      required: true,
      isMember: isMember1 && isMember2,
      channels: [channel1, channel2],
      details: {
        channel1: isMember1,
        channel2: isMember2
      }
    });

  } catch (err) {
    console.error('[Channel Status]', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
