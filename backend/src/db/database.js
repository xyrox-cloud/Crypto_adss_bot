const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let db;

function initDb() {
  const dbPath = process.env.DB_PATH || './data/adshare.db';
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT UNIQUE NOT NULL,
      username TEXT,
      first_name TEXT,
      photo_url TEXT,
      balance REAL DEFAULT 0.0,
      total_earned REAL DEFAULT 0.0,
      total_ads_watched INTEGER DEFAULT 0,
      referral_count INTEGER DEFAULT 0,
      referral_code TEXT UNIQUE,
      referred_by TEXT,
      banned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_daily_claim DATETIME,
      daily_streak INTEGER DEFAULT 0,
      last_minigame_claim DATETIME,
      last_scratch_claim DATETIME,
      referral_bonus_paid INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ad_watches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      telegram_id TEXT NOT NULL,
      reward_amount REAL NOT NULL,
      platform_cut REAL NOT NULL,
      ip_address TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS withdrawals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      telegram_id TEXT NOT NULL,
      amount REAL NOT NULL,
      wallet_address TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      ip_address TEXT,
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      paid_at DATETIME,
      admin_note TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS platform_revenue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ad_watch_id INTEGER,
      amount REAL NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin TEXT DEFAULT 'admin',
      action TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ad_rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      ip TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      telegram_id TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      admin_reply TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Add new columns to existing users table if they don't exist (migration)
  const userCols = db.pragma('table_info(users)').map(c => c.name);
  if (!userCols.includes('banned'))
    db.exec('ALTER TABLE users ADD COLUMN banned INTEGER DEFAULT 0');
  if (!userCols.includes('total_ads_watched'))
    db.exec('ALTER TABLE users ADD COLUMN total_ads_watched INTEGER DEFAULT 0');
  if (!userCols.includes('referral_count'))
    db.exec('ALTER TABLE users ADD COLUMN referral_count INTEGER DEFAULT 0');
  if (!userCols.includes('blitz_rounds'))
    db.exec('ALTER TABLE users ADD COLUMN blitz_rounds INTEGER DEFAULT 0');
  if (!userCols.includes('top_score'))
    db.exec('ALTER TABLE users ADD COLUMN top_score INTEGER DEFAULT 0');
  if (!userCols.includes('total_score_today'))
    db.exec('ALTER TABLE users ADD COLUMN total_score_today INTEGER DEFAULT 0');
  if (!userCols.includes('all_time_score'))
    db.exec('ALTER TABLE users ADD COLUMN all_time_score INTEGER DEFAULT 0');
  if (!userCols.includes('last_daily_claim'))
    db.exec('ALTER TABLE users ADD COLUMN last_daily_claim DATETIME');
  if (!userCols.includes('daily_streak'))
    db.exec('ALTER TABLE users ADD COLUMN daily_streak INTEGER DEFAULT 0');
  if (!userCols.includes('last_minigame_claim'))
    db.exec('ALTER TABLE users ADD COLUMN last_minigame_claim DATETIME');
  if (!userCols.includes('referral_bonus_paid'))
    db.exec('ALTER TABLE users ADD COLUMN referral_bonus_paid INTEGER DEFAULT 0');
  if (!userCols.includes('last_scratch_claim'))
    db.exec('ALTER TABLE users ADD COLUMN last_scratch_claim DATETIME');
  // Daily quest tracking columns
  if (!userCols.includes('blitz_rounds_today'))
    db.exec('ALTER TABLE users ADD COLUMN blitz_rounds_today INTEGER DEFAULT 0');
  if (!userCols.includes('quest_rounds_claimed'))
    db.exec('ALTER TABLE users ADD COLUMN quest_rounds_claimed INTEGER DEFAULT 0');
  if (!userCols.includes('quest_score_claimed'))
    db.exec('ALTER TABLE users ADD COLUMN quest_score_claimed INTEGER DEFAULT 0');
  if (!userCols.includes('quest_grinder_claimed'))
    db.exec('ALTER TABLE users ADD COLUMN quest_grinder_claimed INTEGER DEFAULT 0');
  if (!userCols.includes('quests_last_reset'))
    db.exec("ALTER TABLE users ADD COLUMN quests_last_reset TEXT DEFAULT ''");

  // Add new columns to existing ad_watches table if they don't exist (migration)
  const adWatchCols = db.pragma('table_info(ad_watches)').map(c => c.name);
  if (!adWatchCols.includes('source'))
    db.exec('ALTER TABLE ad_watches ADD COLUMN source TEXT DEFAULT "client"');

  // Seed default settings if not present
  const seedSettings = db.prepare(`INSERT OR IGNORE INTO settings (key, value, description) VALUES (?, ?, ?)`);
  const seedMany = db.transaction(() => {
    seedSettings.run('reward_per_ad',      process.env.AD_REWARD_USDT   || '0.01',  'USDT paid out per ad watched (user + platform share combined)');
    seedSettings.run('platform_cut_pct',   '40',                                     'Platform keeps this % of each ad reward');
    seedSettings.run('revenue_split',      '60',                                     'User % cut of the ad reward');
    seedSettings.run('max_ads_per_day',    process.env.MAX_ADS_PER_DAY  || '20',    'Max ads a user can watch per calendar day');
    seedSettings.run('max_ads_per_hour',   process.env.MAX_ADS_PER_HOUR || '5',     'Max ads a user can watch per hour');
    seedSettings.run('min_withdrawal',     process.env.MIN_WITHDRAWAL   || '2.00',  'Minimum USDT amount for a withdrawal request');
    seedSettings.run('ad_cooldown_secs',   '30',                                     'Seconds a user must wait between ad watches');
    seedSettings.run('daily_bonus_amount', '0.001',                                  'USDT amount for daily check-in bonus');
    seedSettings.run('minigame_min_reward','0.001',                                  'Minimum USDT reward for daily minigame');
    seedSettings.run('minigame_max_reward','0.005',                                  'Maximum USDT reward for daily minigame');
    seedSettings.run('referral_bonus',     '0.005',                                  'One-time USDT bonus for referring a user who completes an action');
  });
  seedMany();
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

/**
 * Read all settings into a plain object keyed by setting key.
 * Values are cast to numbers where possible.
 */
function getSettings() {
  const rows = getDb().prepare('SELECT key, value FROM settings').all();
  const out = {};
  for (const row of rows) {
    const n = Number(row.value);
    out[row.key] = isNaN(n) ? row.value : n;
  }
  return out;
}

function generateReferralCode() {
  return crypto.randomBytes(4).toString('hex').slice(0, 8);
}

/**
 * Process one-time referral bonus if the user was referred and hasn't triggered the bonus yet.
 */
function processReferralBonus(db, user, ipAddress) {
  if (!user.referred_by || user.referral_bonus_paid) return;

  const referrer = db.prepare('SELECT id, telegram_id FROM users WHERE telegram_id = ?').get(user.referred_by);
  if (!referrer) return;

  const settings = getSettings();
  const bonusAmount = parseFloat(settings.referral_bonus || '0.005');

  const tx = db.transaction(() => {
    // Mark user as having paid the referral bonus
    db.prepare('UPDATE users SET referral_bonus_paid = 1 WHERE id = ?').run(user.id);

    // Give bonus to referrer
    db.prepare(`
      UPDATE users
      SET balance = balance + ?,
          total_earned = total_earned + ?,
          referral_count = referral_count + 1
      WHERE id = ?
    `).run(bonusAmount, bonusAmount, referrer.id);

    // Record reward
    db.prepare(`
      INSERT INTO ad_rewards (user_id, amount, ip)
      VALUES (?, ?, ?)
    `).run(referrer.id, bonusAmount, ipAddress || 'system');

    // Record activity
    db.prepare(`
      INSERT INTO activity_log (action, details) VALUES (?, ?)
    `).run('referral_bonus_granted', `Referrer ${referrer.telegram_id} earned ${bonusAmount} USDT for referring ${user.telegram_id}`);
  });
  
  try {
    tx();
  } catch (err) {
    console.error('Failed to process referral bonus:', err);
  }
}

module.exports = {
  initDb,
  getDb,
  getSettings,
  generateReferralCode,
  processReferralBonus
};
