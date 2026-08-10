const path = require('path');
const fs = require('fs');
const Database = require('../backend/node_modules/better-sqlite3');

const backupDir = path.join(__dirname, '..', 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const dbPath = path.join(__dirname, '..', 'backend', 'data', 'adshare.db');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(backupDir, `adshare-backup-${timestamp}.db`);

console.log(`[BACKUP] Starting SQLite database backup...`);
try {
  const db = new Database(dbPath);
  db.backup(backupPath)
    .then(() => {
      console.log(`[BACKUP] Database successfully backed up to ${backupPath}`);
      // Retention policy: purge backups older than 7 days
      const retentionMs = 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      const files = fs.readdirSync(backupDir);
      for (const file of files) {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > retentionMs) {
          fs.unlinkSync(filePath);
          console.log(`[BACKUP] Purged expired backup: ${file}`);
        }
      }
      db.close();
    })
    .catch((err) => {
      console.error(`[BACKUP ERROR] Failed during backup operation:`, err);
      process.exit(1);
    });
} catch (err) {
  console.error(`[BACKUP ERROR] Could not open database file:`, err);
  process.exit(1);
}
