const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/adshare.db');
const db = new Database(dbPath);

const RATE = 6.0; // 1 TON = 6 USDT -> so TON amount = USDT amount / 6

console.log('Starting USDT to TON database migration...');

const tx = db.transaction(() => {
  // Update users balances
  db.prepare('UPDATE users SET balance = balance / ?, total_earned = total_earned / ?').run(RATE, RATE);
  
  // Update ad_watches
  db.prepare('UPDATE ad_watches SET reward_amount = reward_amount / ?, platform_cut = platform_cut / ?').run(RATE, RATE);
  
  // Update withdrawals
  db.prepare('UPDATE withdrawals SET amount = amount / ?').run(RATE);
  
  // Update platform_revenue
  db.prepare('UPDATE platform_revenue SET amount = amount / ?').run(RATE);
  
  // Update ad_rewards
  db.prepare('UPDATE ad_rewards SET amount = amount / ?').run(RATE);
  
  // Update settings for defaults if they exist
  // We'll reset reward_per_ad and min_withdrawal specifically if they match old defaults
  const settings = db.prepare('SELECT * FROM settings').all();
  for (const s of settings) {
    if (['reward_per_ad', 'min_withdrawal', 'daily_bonus_amount', 'minigame_min_reward', 'minigame_max_reward', 'referral_bonus'].includes(s.key)) {
      const val = parseFloat(s.value);
      if (!isNaN(val)) {
        db.prepare('UPDATE settings SET value = ? WHERE key = ?').run((val / RATE).toFixed(5), s.key);
      }
      
      // Update description text from USDT to TON
      const newDesc = s.description ? s.description.replace(/USDT/g, 'TON') : s.description;
      db.prepare('UPDATE settings SET description = ? WHERE key = ?').run(newDesc, s.key);
    }
  }
});

try {
  tx();
  console.log('Migration completed successfully.');
} catch (e) {
  console.error('Migration failed:', e);
}
