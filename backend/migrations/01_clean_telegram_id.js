const { initDb, getDb } = require('../src/db/database');

function runMigration() {
  initDb();
  const db = getDb();
  
  const usersWithDot = db.prepare("SELECT id, telegram_id FROM users WHERE telegram_id LIKE '%.0'").all();
  let updatedUsers = 0;
  for (const u of usersWithDot) {
    const cleanId = u.telegram_id.split('.')[0];
    db.prepare('UPDATE users SET telegram_id = ? WHERE id = ?').run(cleanId, u.id);
    updatedUsers++;
  }
  
  const refsWithDot = db.prepare("SELECT id, referred_by FROM users WHERE referred_by LIKE '%.0'").all();
  for (const u of refsWithDot) {
    const cleanId = u.referred_by.split('.')[0];
    db.prepare('UPDATE users SET referred_by = ? WHERE id = ?').run(cleanId, u.id);
  }
  
  const watchesWithDot = db.prepare("SELECT id, telegram_id FROM ad_watches WHERE telegram_id LIKE '%.0'").all();
  for (const w of watchesWithDot) {
    const cleanId = w.telegram_id.split('.')[0];
    db.prepare('UPDATE ad_watches SET telegram_id = ? WHERE id = ?').run(cleanId, w.id);
  }
  
  console.log('Migration complete. Updated ' + updatedUsers + ' rows in users table.');
}

if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
