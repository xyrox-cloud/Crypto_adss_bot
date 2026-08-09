const express = require('express');
const { getDb, generateReferralCode } = require('../db/database');
const { extractTelegramUser } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const router = express.Router();

router.post('/register', (req, res) => {
  try {
    let { telegram_id, username, first_name, photo_url, referral_code } = req.body;
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
        let referrer;
        if (referral_code.startsWith('ref_')) {
          const refTgId = referral_code.slice(4);
          referrer = db.prepare('SELECT telegram_id FROM users WHERE telegram_id = ?').get(refTgId);
        } else {
          referrer = db.prepare('SELECT telegram_id FROM users WHERE referral_code = ?').get(referral_code);
        }
        if (referrer && referrer.telegram_id !== telegram_id) {
          validReferral = referrer.telegram_id;
        }
      }

      const newRefCode = generateReferralCode();
      const insertUser = db.prepare(`
        INSERT INTO users (telegram_id, username, first_name, photo_url, referral_code, referred_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const info = insertUser.run(telegram_id, username, first_name, photo_url || null, newRefCode, validReferral);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
    } else {
      // Update last_seen and other details if needed
      db.prepare('UPDATE users SET username = ?, first_name = ?, photo_url = ?, last_seen = CURRENT_TIMESTAMP WHERE telegram_id = ?')
        .run(username, first_name, photo_url || null, telegram_id);
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
    const user = db.prepare('SELECT balance, total_earned, referral_code, created_at, first_name, username, blitz_rounds, top_score, total_score_today, all_time_score, last_daily_claim, daily_streak, last_minigame_claim FROM users WHERE telegram_id = ?')
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

const gameRewardLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Max 5 round submissions per minute (allows for early quits/restarts)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many game rewards submitted. Please wait.' }
});

/* ─────────────────────────────────────────────────────────────────
   POST /api/users/game-reward
───────────────────────────────────────────────────────────────── */
router.post('/game-reward', extractTelegramUser, gameRewardLimiter, (req, res) => {
  try {
    const { credits, score } = req.body;
    if (credits === undefined || score === undefined) return res.status(400).json({ error: 'Missing credits or score' });

    const parsedScore = Number(score);
    const parsedCredits = Number(credits);

    if (isNaN(parsedScore) || isNaN(parsedCredits) || parsedScore < 0 || parsedCredits < 0) {
      console.warn(`[Anti-Cheat] Invalid payload from user ${req.telegramUser.id}: score=${score}, credits=${credits}`);
      return res.status(400).json({ error: 'Invalid payload' });
    }

    if (parsedScore > 50000) {
      console.warn(`[Anti-Cheat] Impossible score from user ${req.telegramUser.id}: ${parsedScore}`);
      return res.status(400).json({ error: 'Score exceeds maximum possible value' });
    }

    const maxCredits = (parsedScore / 10) * 2;
    if (parsedCredits > maxCredits + 10) {
      console.warn(`[Anti-Cheat] Credits mismatch from user ${req.telegramUser.id}: score=${parsedScore}, credits=${parsedCredits}`);
      return res.status(400).json({ error: 'Credits mismatch detected' });
    }

    // Convert credits to a balanced USDT fraction:
    // Best-case round: 1350 credits * 0.000005 = 0.00675 USDT (matches 1 ad watch)
    const usdtReward = parsedCredits * 0.000005;

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(req.telegramUser.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    db.prepare(`
      UPDATE users 
      SET balance = balance + ?, 
          total_earned = total_earned + ?,
          blitz_rounds = blitz_rounds + 1,
          top_score = CASE WHEN ? > top_score THEN ? ELSE top_score END,
          total_score_today = total_score_today + ?,
          all_time_score = all_time_score + ?,
          last_seen = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(usdtReward, usdtReward, parsedScore, parsedScore, parsedScore, parsedScore, user.id);
    
    // Record activity
    db.prepare('INSERT INTO activity_log (action, details) VALUES (?, ?)').run('game_reward_granted', `User ${req.telegramUser.id} earned ${usdtReward} USDT from game score ${parsedScore}`);

    res.json({ success: true, added: usdtReward });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process game reward' });
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
        SELECT u.id, u.telegram_id, u.username, u.first_name, u.photo_url, COUNT(a.id) as score
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
        SELECT id, telegram_id, username, first_name, photo_url, total_ads_watched as score
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
   GET /api/users/avatar/:telegramId
───────────────────────────────────────────────────────────────── */
router.get('/avatar/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) return res.status(404).send('No bot token');

    const photosRes = await fetch(`https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${telegramId}&limit=1`);
    const photosData = await photosRes.json();
    
    if (!photosData.ok || photosData.result.total_count === 0) {
      return res.status(404).send('No photo');
    }

    const fileId = photosData.result.photos[0][0].file_id;
    const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
    const fileData = await fileRes.json();
    
    if (!fileData.ok) {
      return res.status(404).send('Cannot get file path');
    }

    const filePath = fileData.result.file_path;
    const imageRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
    
    res.set('Content-Type', imageRes.headers.get('content-type'));
    res.set('Cache-Control', 'public, max-age=86400');
    
    const buffer = await imageRes.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('[Avatar Proxy Error]', err);
    res.status(500).send('Server Error');
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

/* ─────────────────────────────────────────────────────────────────
   POST /api/users/daily-claim
───────────────────────────────────────────────────────────────── */
router.post('/daily-claim', extractTelegramUser, (req, res) => {
  try {
    const db = getDb();
    const telegramId = req.telegramUser.id;
    const { getSettings, processReferralBonus } = require('../db/database');

    const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.banned) return res.status(403).json({ error: 'Account is banned' });

    const now = new Date();
    const lastClaim = user.last_daily_claim ? new Date(user.last_daily_claim) : null;
    
    // Check if claimed in the last 24 hours
    if (lastClaim && (now - lastClaim) < 24 * 60 * 60 * 1000) {
      const waitMs = (24 * 60 * 60 * 1000) - (now - lastClaim);
      const hours = Math.floor(waitMs / (1000 * 60 * 60));
      const minutes = Math.floor((waitMs % (1000 * 60 * 60)) / (1000 * 60));
      return res.status(429).json({ error: `Please wait ${hours}h ${minutes}m before claiming again` });
    }

    const settings = getSettings();
    const rewardUsdt = parseFloat(settings.daily_bonus_amount || '0.001');

    let newStreak = user.daily_streak + 1;
    // Reset streak if more than 48 hours have passed
    if (lastClaim && (now - lastClaim) > 48 * 60 * 60 * 1000) {
      newStreak = 1;
    }

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE users
        SET balance = balance + ?,
            total_earned = total_earned + ?,
            last_daily_claim = CURRENT_TIMESTAMP,
            daily_streak = ?,
            last_seen = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(rewardUsdt, rewardUsdt, newStreak, user.id);

      db.prepare(`
        INSERT INTO ad_rewards (user_id, amount, ip)
        VALUES (?, ?, ?)
      `).run(user.id, rewardUsdt, req.ip || req.connection?.remoteAddress || 'system');

      db.prepare(`
        INSERT INTO activity_log (action, details) VALUES (?, ?)
      `).run('daily_bonus_granted', `User ${telegramId} claimed daily bonus ${rewardUsdt} USDT. Streak: ${newStreak}`);
    });

    tx();

    // Check referral bonus
    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    processReferralBonus(db, updatedUser, req.ip || req.connection?.remoteAddress);

    res.json({ success: true, reward: rewardUsdt, streak: newStreak });
  } catch (err) {
    console.error('[Daily Claim Error]', err);
    res.status(500).json({ error: 'Failed to claim daily bonus' });
  }
});

/* ─────────────────────────────────────────────────────────────────
   POST /api/users/minigame-claim
───────────────────────────────────────────────────────────────── */
router.post('/minigame-claim', extractTelegramUser, (req, res) => {
  try {
    const db = getDb();
    const telegramId = req.telegramUser.id;
    const { getSettings, processReferralBonus } = require('../db/database');

    const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.banned) return res.status(403).json({ error: 'Account is banned' });

    const now = new Date();
    const lastClaim = user.last_minigame_claim ? new Date(user.last_minigame_claim) : null;
    
    // Check if claimed in the last 24 hours
    if (lastClaim && (now - lastClaim) < 24 * 60 * 60 * 1000) {
      const waitMs = (24 * 60 * 60 * 1000) - (now - lastClaim);
      const hours = Math.floor(waitMs / (1000 * 60 * 60));
      const minutes = Math.floor((waitMs % (1000 * 60 * 60)) / (1000 * 60));
      return res.status(429).json({ error: `Please wait ${hours}h ${minutes}m before playing again` });
    }

    const rand = Math.random() * 100;
    let rewardUsdt = 0;
    let message = '';

    if (rand < 50) {
      rewardUsdt = 0.001;
    } else if (rand < 85) {
      rewardUsdt = 0;
      message = 'Better luck next time!';
    } else if (rand < 90) {
      rewardUsdt = 0.01;
    } else {
      rewardUsdt = 0.0015;
    }

    const tx = db.transaction(() => {
      if (rewardUsdt > 0) {
        db.prepare(`
          UPDATE users
          SET balance = balance + ?,
              total_earned = total_earned + ?,
              last_minigame_claim = CURRENT_TIMESTAMP,
              last_seen = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(rewardUsdt, rewardUsdt, user.id);

        db.prepare(`
          INSERT INTO ad_rewards (user_id, amount, ip)
          VALUES (?, ?, ?)
        `).run(user.id, rewardUsdt, req.ip || req.connection?.remoteAddress || 'system');
      } else {
        db.prepare(`
          UPDATE users
          SET last_minigame_claim = CURRENT_TIMESTAMP,
              last_seen = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(user.id);
      }

      db.prepare(`
        INSERT INTO activity_log (action, details) VALUES (?, ?)
      `).run('minigame_reward_granted', `User ${telegramId} won minigame reward ${rewardUsdt} USDT.`);
    });

    tx();

    if (rewardUsdt > 0) {
      const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
      processReferralBonus(db, updatedUser, req.ip || req.connection?.remoteAddress);
    }

    res.json({ success: true, reward: rewardUsdt, message });
  } catch (err) {
    console.error('[Minigame Claim Error]', err);
    res.status(500).json({ error: 'Failed to process minigame claim' });
  }
});

module.exports = router;
