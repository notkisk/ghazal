const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const dataDir = process.env.GHAZAL_DATA_DIR || path.join(root, '.data');
const source = path.join(dataDir, 'ghazal.sqlite');
const coverDir = process.env.GHAZAL_COVERS_DIR || path.join(dataDir, 'covers');
const backupDir = process.env.GHAZAL_BACKUP_DIR || path.join(dataDir, 'backups');

if (!fs.existsSync(source)) {
  console.error(`Database not found: ${source}`);
  process.exit(1);
}

// Copy the database directly instead of requiring server.js: requiring the
// server opens the database and runs migrations/resets, and a backup must never
// mutate the data it is about to preserve.
fs.mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
// One folder per backup so the SQLite file and the cover files it references
// stay together. Covers live outside the database, so a DB-only backup would
// restore a catalog full of broken images.
const destination = path.join(backupDir, `ghazal-${stamp}`);
fs.mkdirSync(destination, { recursive: true });
fs.copyFileSync(source, path.join(destination, 'ghazal.sqlite'));
let covers = 0;
if (fs.existsSync(coverDir)) {
  const coverBackup = path.join(destination, 'covers');
  fs.cpSync(coverDir, coverBackup, { recursive: true });
  covers = fs.readdirSync(coverBackup).length;
}
console.log(`Backup created: ${destination} (${covers} cover files)`);
