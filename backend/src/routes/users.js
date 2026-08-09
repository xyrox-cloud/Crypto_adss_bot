const express = require('express');
const { getDb, generateReferralCode } = require('../db/database');
const { extractTelegramUser } = require('../middleware/auth');
const router = express.Router();

router.post('/register', (req, res) => {
  try {
    const { telegram_id, username, first_name, referral_code } = req.body;
    if (!telegram_id) {
      return res.status(400).json({ error: 'telegram_id is required' });
    }

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

module.exports = router;
