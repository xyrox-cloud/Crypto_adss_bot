const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { getDb, generateReferralCode } = require('../db/database');
const { verifyTelegramInitData } = require('../middleware/auth');

const router = express.Router();

// Rate limiter for login endpoint
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit to 15 login requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' }
});

/**
 * POST /api/auth/login
 * Standard Phase 1 Login API for Telegram Mini App users
 * Accepts initData from Telegram WebApp SDK or direct payload,
 * validates cryptographic signatures, registers/fetches the user,
 * and returns a JWT access token along with user profile information.
 */
router.post('/login', loginRateLimiter, (req, res) => {
  try {
    const { initData, referral_code, telegram_id: fallbackTgId, username: fallbackUsername, first_name: fallbackFirstName, photo_url: fallbackPhotoUrl } = req.body;
    const botToken = process.env.BOT_TOKEN;

    let telegramId = null;
    let username = fallbackUsername || '';
    let firstName = fallbackFirstName || 'User';
    let photoUrl = fallbackPhotoUrl || null;

    // Cryptographic validation via Telegram initData
    if (initData && botToken && botToken !== 'placeholder_bot_token') {
      const verifiedUser = verifyTelegramInitData(initData, botToken);
      if (!verifiedUser) {
        return res.status(401).json({ error: 'Invalid or expired Telegram initData signature' });
      }
      telegramId = String(verifiedUser.id).split('.')[0];
      if (verifiedUser.username) username = verifiedUser.username;
      if (verifiedUser.first_name) firstName = verifiedUser.first_name;
      if (verifiedUser.photo_url) photoUrl = verifiedUser.photo_url;
    } else if (fallbackTgId) {
      // Fallback for development / API testing
      telegramId = String(fallbackTgId).split('.')[0];
    } else {
      return res.status(400).json({ error: 'Missing Telegram authentication credentials (initData or telegram_id)' });
    }

    const db = getDb();
    let user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);

    if (!user) {
      // Process Referral Code
      let validReferral = null;
      if (referral_code) {
        let referrer;
        if (referral_code.startsWith('ref_')) {
          const refTgId = referral_code.slice(4);
          referrer = db.prepare('SELECT telegram_id FROM users WHERE telegram_id = ?').get(refTgId);
        } else {
          referrer = db.prepare('SELECT telegram_id FROM users WHERE referral_code = ?').get(referral_code);
        }
        if (referrer && referrer.telegram_id !== telegramId) {
          validReferral = referrer.telegram_id;
        }
      }

      const newRefCode = generateReferralCode();
      const superAdminId = process.env.SUPER_ADMIN_ID;
      const isAdmin = (superAdminId && telegramId === superAdminId) ? 1 : 0;

      const tx = db.transaction(() => {
        let initialScore = 0;
        if (validReferral) {
          initialScore = 100;
          const referrerRow = db.prepare('SELECT id FROM users WHERE telegram_id = ?').get(validReferral);
          if (referrerRow) {
            db.prepare('UPDATE users SET all_time_score = all_time_score + 250, referral_count = referral_count + 1 WHERE id = ?').run(referrerRow.id);
            db.prepare('INSERT INTO activity_log (action, details) VALUES (?, ?)').run(
              'referral_bonus_granted',
              `Referrer ${validReferral} earned 250 pts for referring ${telegramId}`
            );
          }
        }

        const insertUser = db.prepare(`
          INSERT INTO users (telegram_id, username, first_name, photo_url, referral_code, referred_by, all_time_score, referral_bonus_paid, is_admin)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const info = insertUser.run(telegramId, username, firstName, photoUrl, newRefCode, validReferral, initialScore, 1, isAdmin);
        return info.lastInsertRowid;
      });

      const newId = tx();
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(newId);
    } else {
      // Check super admin override and update profile
      const superAdminId = process.env.SUPER_ADMIN_ID;
      if (superAdminId && telegramId === superAdminId && !user.is_admin) {
        db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(user.id);
        user.is_admin = 1;
      }

      db.prepare('UPDATE users SET username = ?, first_name = ?, photo_url = COALESCE(?, photo_url), last_seen = CURRENT_TIMESTAMP WHERE telegram_id = ?')
        .run(username, firstName, photoUrl, telegramId);
      user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
    }

    if (user.banned) {
      return res.status(403).json({ error: 'Account has been suspended' });
    }

    // Generate JWT Access Token
    const jwtSecret = process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET || 'blitz_secure_jwt_secret_key_2026';
    const token = jwt.sign(
      {
        id: user.id,
        telegram_id: user.telegram_id,
        username: user.username,
        is_admin: Boolean(user.is_admin)
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        telegram_id: user.telegram_id,
        username: user.username,
        first_name: user.first_name,
        photo_url: user.photo_url,
        balance: user.balance,
        total_earned: user.total_earned,
        referral_code: user.referral_code,
        is_admin: Boolean(user.is_admin),
        created_at: user.created_at
      }
    });

  } catch (err) {
    console.error('[AUTH LOGIN ERROR]', err);
    return res.status(500).json({ error: 'Authentication failed due to internal server error' });
  }
});

/**
 * GET /api/auth/verify
 * Verifies validity of the current JWT bearer token
 */
router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false, error: 'Missing token' });
  }

  const token = authHeader.split(' ')[1];
  const jwtSecret = process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET || 'blitz_secure_jwt_secret_key_2026';

  try {
    const decoded = jwt.verify(token, jwtSecret);
    return res.json({ valid: true, user: decoded });
  } catch (err) {
    return res.status(401).json({ valid: false, error: 'Token expired or invalid' });
  }
});

module.exports = router;
