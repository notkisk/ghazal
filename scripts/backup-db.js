const fs = require('node:fs');
const path = require('node:path');
const { db } = require('../server');

const root = path.join(__dirname, '..');
const dataDir = process.env.GHAZAL_DATA_DIR || path.join(root, '.data');
const source = path.join(dataDir, 'ghazal.sqlite');
const backupDir = process.env.GHAZAL_BACKUP_DIR || path.join(dataDir, 'backups');

if (!fs.existsSync(source)) {
  console.error(`Database not found: ${source}`);
  process.exit(1);
}

db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
fs.mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const destination = path.join(backupDir, `ghazal-${stamp}.sqlite`);
fs.copyFileSync(source, destination);
console.log(`Backup created: ${destination}`);
