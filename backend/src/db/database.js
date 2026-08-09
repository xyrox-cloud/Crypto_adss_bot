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
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
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

module.exports = {
  initDb,
  getDb,
  getSettings,
  generateReferralCode
};
