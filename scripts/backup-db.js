const fs = require('node:fs');
const path = require('node:path');
const { db, COVERS_DIR } = require('../server');

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
// One folder per backup so the SQLite file and the cover files it references
// stay together. Covers live outside the database, so a DB-only backup would
// restore a catalog full of broken images.
const destination = path.join(backupDir, `ghazal-${stamp}`);
fs.mkdirSync(destination, { recursive: true });
fs.copyFileSync(source, path.join(destination, 'ghazal.sqlite'));
let covers = 0;
if (fs.existsSync(COVERS_DIR)) {
  const coverBackup = path.join(destination, 'covers');
  fs.cpSync(COVERS_DIR, coverBackup, { recursive: true });
  covers = fs.readdirSync(coverBackup).length;
}
console.log(`Backup created: ${destination} (${covers} cover files)`);
