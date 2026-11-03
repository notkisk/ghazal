const crypto = require('node:crypto');
const { db, passwordHash } = require('../server');

const email = process.argv[2] || process.env.GHAZAL_ADMIN_EMAIL || 'owner@alghazal.local';
const password = process.argv[3] || process.env.GHAZAL_ADMIN_PASSWORD;
if (!password || password.length < 10) {
  console.error('Usage: node scripts/set-admin-password.js <email> <password>');
  console.error('Password must be at least 10 characters.');
  process.exit(1);
}
const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email);
if (existing) {
  db.prepare('UPDATE users SET password_hash=?,role=? WHERE id=?').run(passwordHash(password), 'owner', existing.id);
} else {
  db.prepare('INSERT INTO users (email,password_hash,role,created_at) VALUES (?,?,?,?)').run(email, passwordHash(password), 'owner', new Date().toISOString());
}
console.log(`Admin credentials updated for ${email}`);
