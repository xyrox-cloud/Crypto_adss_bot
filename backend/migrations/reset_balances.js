const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/adshare.db');
const db = new Database(dbPath);

console.log('Starting full database reset to 0...');

const tx = db.transaction(() => {
  // 1. Reset Users Table (Balances and Leaderboards)
  const userResult = db.prepare(`
    UPDATE users SET 
      balance = 0.0,
      total_earned = 0.0,
      total_ads_watched = 0,
      blitz_rounds = 0,
      top_score = 0,
      total_score_today = 0,
      all_time_score = 0,
      blitz_rounds_today = 0,
      quest_rounds_claimed = 0,
      quest_score_claimed = 0,
      quest_grinder_claimed = 0,
      referral_count = 0,
      daily_streak = 0,
      last_daily_claim = NULL,
      last_minigame_claim = NULL,
      last_scratch_claim = NULL,
      referral_bonus_paid = 0
  `).run();
  
  console.log(`Reset users table - Rows affected: ${userResult.changes}`);

  // 2. Clear Economy/History Tables
  const wResult = db.prepare('DELETE FROM withdrawals').run();
  console.log(`Cleared withdrawals - Rows affected: ${wResult.changes}`);

  const awResult = db.prepare('DELETE FROM ad_watches').run();
  console.log(`Cleared ad_watches - Rows affected: ${awResult.changes}`);

  const arResult = db.prepare('DELETE FROM ad_rewards').run();
  console.log(`Cleared ad_rewards - Rows affected: ${arResult.changes}`);

  const prResult = db.prepare('DELETE FROM platform_revenue').run();
  console.log(`Cleared platform_revenue - Rows affected: ${prResult.changes}`);

  const logResult = db.prepare('DELETE FROM activity_log').run();
  console.log(`Cleared activity_log - Rows affected: ${logResult.changes}`);
});

try {
  tx();
  console.log('Database reset completed successfully. The economy is now completely fresh.');
} catch (e) {
  console.error('Database reset failed:', e);
}
