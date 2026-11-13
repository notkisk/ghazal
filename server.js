const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { DatabaseSync } = require('node:sqlite');
const communes = require(path.join(__dirname, 'data/algeria-communes-58-wilayas.json'));
// Ecotrack Stop Desk locations supplied by the carrier. Match normalized
// commune names so Arabic/Latin spelling and accents in the source data work.
const stopDeskLocations = [
  [1,'Adrar'],[2,'Chlef'],[2,'Tenes'],[3,'Laghouat'],[3,'Aflou'],[4,'Oum El Bouaghi'],[4,'Ain Fekroune'],[4,"Ain M'lila"],[5,'Batna'],[5,'Oued Chaaba'],[5,'Barika'],[6,'Bejaia'],[6,'Akbou'],[6,'El Kseur'],[7,'Biskra'],[8,'Bechar'],[9,'Blida'],[9,'Boufarik'],[9,'El Affroun'],[9,'Ouled Yaich'],[10,'Bouira'],[10,'Lakhdaria'],[11,'Tamanrasset'],[12,'Tebessa'],[12,'Cheria'],[13,'Tlemcen'],[13,'Maghnia'],[14,'Tiaret'],[15,'Tizi Ouzou'],[15,'Boghni'],[15,'Draa Ben Khedda'],[16,'Kouba'],[16,'Cheraga'],[16,'Oued Smar'],[16,'Reghaia'],[16,'Alger Centre'],[16,'Bab El Oued'],[16,'Ain Benian'],[16,'Draria'],[16,'Bordj El Bahri'],[16,'Les Eucalyptus'],[16,'Dely Ibrahim'],[16,'Djasr Kasentina'],[16,'Rouiba'],[16,'Maalma'],[16,'Bab Ezzouar'],[16,'Bir Touta'],[17,'Djelfa'],[17,'Ain Oussera'],[18,'Jijel'],[19,'El Eulma'],[19,'Setif'],[19,'Ain Oulmane'],[19,'Ain Azel'],[19,'Ain Arnat'],[20,'Saida'],[21,'Skikda'],[21,'Collo'],[22,'Sidi Bel Abbes'],[22,'Telagh'],[23,'Annaba'],[23,'El Bouni'],[23,'Seraidi'],[24,'Guelma'],[25,'El Khroub'],[25,'Didouche Mourad'],[26,'Medea'],[26,'Ksar El Boukhari'],[27,'Hadjadj'],[27,'Mostaganem'],[28,"M'Sila"],[28,'Bou Saada'],[29,'Sig'],[29,'Mascara'],[30,'Ouargla'],[30,'Hassi Messaoud'],[31,'Oran'],[31,'Bir El Djir'],[31,'Es Senia'],[31,'Mers El Kebir'],[31,'Ain Turk'],[31,'Arzew'],[32,'El Bayadh'],[33,'Illizi'],[33,'In Amenas'],[34,'Bordj Bou Arreridj'],[35,'Boumerdes'],[35,'Bordj Menaiel'],[35,'Dellys'],[35,'Boudouaou'],[36,'El Tarf'],[38,'Tissemsilt'],[38,'Bordj Bounaama'],[39,'El Oued'],[40,'Khenchela'],[41,'Souk Ahras'],[42,'Tipaza'],[42,'Hadjout'],[42,'Kolea'],[42,'Cherchell'],[43,'Mila'],[43,'Chelghoum Laid'],[43,'Ferdjioua'],[44,'Ain Defla'],[44,'Khemis Miliana'],[45,'Mecheria'],[46,'Ain Temouchent'],[46,'Beni Saf'],[47,'Ghardaia'],[48,'Relizane'],[48,'Oued Rhiou'],[49,'Timimoun'],[51,'Ouled Djellal'],[53,'In Salah'],[55,'Touggourt'],[56,'Djanet'],[57,"El M'Ghair"],[58,'El Meniaa']
];
const normalizeCommune = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const stopDeskKeys = new Set(stopDeskLocations.map(([code,name]) => `${code}:${normalizeCommune(name)}`));
function hasStopDesk(wilayaCode, commune) { return stopDeskKeys.has(`${Number(wilayaCode)}:${normalizeCommune(commune?.commune_name_ascii || commune?.commune_name || commune)}`); }

const ROOT = __dirname;
const DATA_DIR = process.env.GHAZAL_DATA_DIR || path.join(ROOT, '.data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'ghazal.sqlite'));
db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('owner','admin')), permissions_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS books (id TEXT PRIMARY KEY, title TEXT NOT NULL, author TEXT NOT NULL, publisher TEXT NOT NULL, category TEXT NOT NULL, genre TEXT NOT NULL, price INTEGER NOT NULL CHECK(price >= 0), stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0), reserved INTEGER NOT NULL DEFAULT 0 CHECK(reserved >= 0), isbn TEXT, pages INTEGER, image TEXT, thumb TEXT, display TEXT, note TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS authors (id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, bio TEXT NOT NULL DEFAULT '', photo TEXT, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS publishers (id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, city TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '', logo TEXT, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS discounts (id INTEGER PRIMARY KEY, code TEXT UNIQUE, type TEXT NOT NULL CHECK(type IN ('percent','fixed')), value REAL NOT NULL CHECK(value >= 0), active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY, reference TEXT UNIQUE NOT NULL, customer_json TEXT NOT NULL, subtotal INTEGER NOT NULL, delivery INTEGER NOT NULL, total INTEGER NOT NULL, payment TEXT NOT NULL, shipment_type TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('new','confirmed','preparing','shipped','delivered','cancelled','returned')), notes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS order_items (order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE, book_id TEXT NOT NULL, title TEXT NOT NULL, qty INTEGER NOT NULL CHECK(qty > 0), unit_price INTEGER NOT NULL, PRIMARY KEY(order_id, book_id));
  CREATE TABLE IF NOT EXISTS order_events (id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE, status TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', user_id INTEGER REFERENCES users(id), created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS reservations (order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE, book_id TEXT NOT NULL REFERENCES books(id), qty INTEGER NOT NULL, released_at TEXT, PRIMARY KEY(order_id, book_id));
  CREATE TABLE IF NOT EXISTS restocks (id INTEGER PRIMARY KEY, book_id TEXT NOT NULL REFERENCES books(id), quantity INTEGER NOT NULL, reason TEXT NOT NULL, user_id INTEGER REFERENCES users(id), created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id), action TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT, details_json TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS exports (id INTEGER PRIMARY KEY, fingerprint TEXT UNIQUE NOT NULL, order_refs_json TEXT NOT NULL, filename TEXT NOT NULL, user_id INTEGER REFERENCES users(id), created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS collections (id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1, homepage INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS collection_books (collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE, book_id TEXT NOT NULL REFERENCES books(id), position INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(collection_id, book_id));
  CREATE TABLE IF NOT EXISTS store_content (key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS conversion_events (id INTEGER PRIMARY KEY, event_id TEXT UNIQUE NOT NULL, event_name TEXT NOT NULL, reference TEXT, provider TEXT NOT NULL, status TEXT NOT NULL, response_json TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS error_log (id INTEGER PRIMARY KEY, source TEXT NOT NULL, message TEXT NOT NULL, details_json TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS newsletter_subscribers (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, source TEXT NOT NULL DEFAULT 'storefront', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
`);

// Keep this migration idempotent for databases created by earlier versions.
const reservationColumns = db.prepare('PRAGMA table_info(reservations)').all().map(column => column.name);
if (!reservationColumns.includes('settled_at')) db.exec('ALTER TABLE reservations ADD COLUMN settled_at TEXT');
const orderColumns = db.prepare('PRAGMA table_info(orders)').all().map(column => column.name);
if (!orderColumns.includes('discount')) db.exec('ALTER TABLE orders ADD COLUMN discount INTEGER NOT NULL DEFAULT 0');
if (!orderColumns.includes('coupon_code')) db.exec("ALTER TABLE orders ADD COLUMN coupon_code TEXT NOT NULL DEFAULT ''");
if (!orderColumns.includes('total_adjustment')) db.exec('ALTER TABLE orders ADD COLUMN total_adjustment INTEGER NOT NULL DEFAULT 0');
// Pending orders no longer reserve inventory. Release legacy reservations from
// orders that have not been confirmed so old carts cannot hide stock.
db.exec("UPDATE books SET reserved=MAX(0,reserved-(SELECT COALESCE(SUM(r.qty),0) FROM reservations r JOIN orders o ON o.id=r.order_id WHERE r.book_id=books.id AND r.settled_at IS NULL AND r.released_at IS NULL AND o.status IN ('new','cancelled'))) WHERE reserved>0");
db.exec("UPDATE reservations SET released_at=datetime('now') WHERE settled_at IS NULL AND released_at IS NULL AND order_id IN (SELECT id FROM orders WHERE status IN ('new','cancelled'))");
const userColumns = db.prepare('PRAGMA table_info(users)').all().map(column => column.name);
if (!userColumns.includes('permissions_json')) db.exec("ALTER TABLE users ADD COLUMN permissions_json TEXT NOT NULL DEFAULT '{}'");
const bookColumns = db.prepare('PRAGMA table_info(books)').all().map(column => column.name);
if (!bookColumns.includes('pages')) db.exec('ALTER TABLE books ADD COLUMN pages INTEGER');
if (!bookColumns.includes('thumb')) db.exec('ALTER TABLE books ADD COLUMN thumb TEXT');
if (!bookColumns.includes('display')) db.exec('ALTER TABLE books ADD COLUMN display TEXT');
// Orders keep their line-item snapshots (title, qty, price) even after a book is
// removed from the catalog. Older databases enforced a FK to books, which made a
// full catalog reset impossible without losing order history.
const orderItemSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='order_items'").get()?.sql || '';
if (/REFERENCES\s+books\s*\(/i.test(orderItemSql)) {
  db.exec('PRAGMA foreign_keys = OFF');
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec('CREATE TABLE order_items_new (order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE, book_id TEXT NOT NULL, title TEXT NOT NULL, qty INTEGER NOT NULL CHECK(qty > 0), unit_price INTEGER NOT NULL, PRIMARY KEY(order_id, book_id))');
    db.exec('INSERT INTO order_items_new (order_id,book_id,title,qty,unit_price) SELECT order_id,book_id,title,qty,unit_price FROM order_items');
    db.exec('DROP TABLE order_items');
    db.exec('ALTER TABLE order_items_new RENAME TO order_items');
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  finally { db.exec('PRAGMA foreign_keys = ON'); }
}

const now = () => new Date().toISOString();
const rateBuckets = new Map();
const metaEventsInFlight = new Set();
const json = (value) => JSON.stringify(value ?? {});
const parse = (value, fallback = {}) => { try { return JSON.parse(value); } catch { return fallback; } };
const hash = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
const passwordHash = (value, salt = crypto.randomBytes(16).toString('hex')) => `${salt}:${crypto.scryptSync(String(value), salt, 32).toString('hex')}`;
const passwordMatches = (value, stored) => { const [salt, expected] = String(stored).split(':'); if (!salt || !expected) return false; const actual = crypto.scryptSync(String(value), salt, 32).toString('hex'); return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected)); };
const send = (res, status, payload, headers = {}) => { const raw = Buffer.from(JSON.stringify(payload)); const gzip = Boolean(res._ghazalGzip) && raw.length > 1024; const body = gzip ? zlib.gzipSync(raw) : raw; res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...(gzip ? { 'content-encoding': 'gzip', vary: 'accept-encoding' } : {}), ...headers }); res.end(body); };
const MAX_JSON_BODY_SIZE = 25 * 1024 * 1024;
// Decode the request only after every byte has arrived. Calling toString() on
// each chunk corrupts multi-byte UTF-8 characters (Arabic text especially) when
// a character straddles a TCP chunk boundary, producing U+FFFD.
const readBody = (req) => new Promise((resolve, reject) => { const chunks = []; let size = 0; let tooLarge = false; req.on('data', chunk => { if (tooLarge) return; chunks.push(chunk); size += chunk.length; if (size > MAX_JSON_BODY_SIZE) { tooLarge = true; reject(new Error('request_too_large')); req.resume(); } }); req.on('end', () => { if (tooLarge) return; try { const body = Buffer.concat(chunks).toString('utf8'); resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('invalid_json')); } }); req.on('error', reject); });
const headerToken = (req) => (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
function userFromRequest(req) { const token = headerToken(req); if (!token) return null; return db.prepare(`SELECT users.* FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at>?`).get(hash(token), now()) || null; }
function requireRole(req, res, role = 'admin') { const user = userFromRequest(req); if (!user || (role === 'owner' && user.role !== 'owner')) { send(res, 401, { error: 'unauthorized' }); return null; } return user; }
function requireOwner(req, res) { return requireRole(req, res, 'owner'); }
const permissionNames = ['view_orders','update_orders','view_catalog','edit_catalog','view_finance','export_orders','edit_inventory','edit_store','manage_staff','view_history'];
const defaultAdminPermissions = { view_orders:true, update_orders:true, view_catalog:true };
const deliveryRates = {
  1:{home:1100,office:500},2:{home:800,office:400},3:{home:800,office:400},4:{home:700,office:400},5:{home:650,office:400},6:{home:700,office:400},7:{home:650,office:400},8:{home:1050,office:400},9:{home:750,office:400},10:{home:750,office:400},11:{home:1050,office:400},12:{home:650,office:400},13:{home:800,office:400},14:{home:800,office:400},15:{home:750,office:400},16:{home:600,office:400},17:{home:800,office:400},18:{home:700,office:400},19:{home:700,office:400},20:{home:800,office:400},21:{home:700,office:400},22:{home:800,office:400},23:{home:700,office:400},24:{home:700,office:400},25:{home:700,office:400},26:{home:750,office:400},27:{home:800,office:400},28:{home:750,office:400},29:{home:800,office:400},30:{home:750,office:400},31:{home:850,office:400},32:{home:1000,office:500},33:{home:1400,office:700},34:{home:700,office:400},35:{home:750,office:400},36:{home:700,office:400},37:{home:1400,office:700},38:{home:850,office:450},39:{home:450,office:350},40:{home:700,office:400},41:{home:700,office:400},42:{home:750,office:400},43:{home:700,office:400},44:{home:850,office:450},45:{home:950,office:500},46:{home:850,office:450},47:{home:1000,office:400},48:{home:850,office:450},49:{home:1050,office:550},50:{home:1800,office:800},51:{home:650,office:550},52:{home:1050,office:550},53:{home:1350,office:750},54:{home:1350,office:750},55:{home:650,office:400},56:{home:1800,office:800},57:{home:650,office:500},58:{home:950,office:550}
};
function permissionsFor(user) { if (user.role === 'owner') return Object.fromEntries(permissionNames.map(name => [name,true])); return { ...defaultAdminPermissions, ...parse(user.permissions_json, {}) }; }
function can(user, permission) { return Boolean(permissionsFor(user)[permission]); }
function requirePermission(req, res, permission) { const user = requireRole(req, res); if (!user) return null; if (!can(user, permission)) { send(res,403,{error:'permission_denied',permission}); return null; } return user; }
function audit(user, action, entity, entityId, details) { db.prepare('INSERT INTO audit_log (user_id,action,entity,entity_id,details_json,created_at) VALUES (?,?,?,?,?,?)').run(user?.id || null, action, entity, entityId == null ? null : String(entityId), json(details), now()); }
function createSession(userId) { const token = crypto.randomBytes(32).toString('base64url'); db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(hash(token), userId, new Date(Date.now() + 8 * 3600e3).toISOString()); return token; }
function authResponse(user, token) { return { token, user: { id:user.id, email:user.email, role:user.role, permissions:permissionsFor(user) } }; }
function requestIp(req) {
  // Forwarded headers are attacker-controlled unless the origin is reachable
  // only through the trusted proxy. Keep them disabled by default.
  if (process.env.GHAZAL_TRUST_PROXY === 'true') {
    const proxyIp = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'];
    if (proxyIp) return String(proxyIp).split(',')[0].trim().slice(0, 100) || 'unknown';
  }
  return String(req.socket.remoteAddress || 'unknown').slice(0, 100);
}
function rateLimit(req, key, limit, windowMs, identity = requestIp(req)) {
  const bucketKey = `${key}:${identity}`; const current = Date.now(); const bucket = rateBuckets.get(bucketKey) || { startedAt: current, count: 0, windowMs };
  if (current - bucket.startedAt >= windowMs) { bucket.startedAt = current; bucket.count = 0; }
  bucket.count += 1; rateBuckets.set(bucketKey, bucket);
  if (rateBuckets.size > 5000) for (const [storedKey, stored] of rateBuckets) if (current - stored.startedAt >= stored.windowMs) rateBuckets.delete(storedKey);
  return bucket.count <= limit ? 0 : Math.max(1, Math.ceil((bucket.startedAt + windowMs - current) / 1000));
}
function recordConversion(eventId, eventName, reference, provider, status, response) { try { db.prepare('INSERT INTO conversion_events (event_id,event_name,reference,provider,status,response_json,created_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(event_id) DO UPDATE SET status=excluded.status,response_json=excluded.response_json,created_at=excluded.created_at').run(String(eventId),eventName,reference,provider,status,json(response),now()); } catch (error) { console.error(`conversion_log_${error.message}`); } }
function logError(source, error, details = {}) { try { db.prepare('INSERT INTO error_log (source,message,details_json,created_at) VALUES (?,?,?,?)').run(source,String(error?.message || error),json(details),now()); } catch {} }

// Covers live on disk as content-addressed files. The catalog and the JSON API
// only ever carry short paths, so payload size no longer grows with the number
// of books. Originals are kept untouched; the browser generates smaller
// `thumb` and `display` derivatives at import time for fast delivery.
const COVERS_DIR = process.env.GHAZAL_COVERS_DIR || path.join(DATA_DIR, 'covers');
fs.mkdirSync(COVERS_DIR, { recursive: true });
const MAX_COVER_BYTES = 8 * 1024 * 1024;
const coverTypes = { jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', webp:'image/webp', gif:'image/gif', avif:'image/avif', svg:'image/svg+xml' };
function detectCoverType(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png';
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'gif';
  if (bytes.length >= 12 && bytes.toString('latin1', 0, 4) === 'RIFF' && bytes.toString('latin1', 8, 12) === 'WEBP') return 'webp';
  if (bytes.length >= 12 && bytes.toString('latin1', 4, 8) === 'ftyp' && ['avif','avis'].includes(bytes.toString('latin1', 8, 12))) return 'avif';
  return '';
}
function storeCover(bytes) {
  if (!bytes || !bytes.length) throw new Error('cover_empty');
  if (bytes.length > MAX_COVER_BYTES) throw new Error('cover_too_large');
  const ext = detectCoverType(bytes); if (!ext) throw new Error('cover_not_image');
  const name = `${crypto.createHash('sha256').update(bytes).digest('hex')}.${ext}`;
  const target = path.join(COVERS_DIR, name);
  if (!fs.existsSync(target)) { const temp = `${target}.${crypto.randomBytes(4).toString('hex')}.tmp`; fs.writeFileSync(temp, bytes); fs.renameSync(temp, target); }
  return `/covers/${name}`;
}
function decodeCoverData(value) {
  const match = /^data:image\/[a-z0-9.+-]+;base64,([a-z0-9+/=\s]+)$/i.exec(String(value || ''));
  if (!match) throw new Error('invalid_image_data');
  return Buffer.from(match[1].replace(/\s+/g, ''), 'base64');
}
async function fetchCoverFile(address) {
  const url = String(address || '').trim();
  if (!/^https?:\/\//i.test(url)) throw new Error('invalid_image_url');
  const response = await fetch(url, { redirect:'follow', signal:AbortSignal.timeout(15000), headers:{ 'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Ghazal-Bookstore-Cover/1.0', accept:'image/*' } });
  if (!response.ok) throw new Error('image_fetch_failed');
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > MAX_COVER_BYTES) throw new Error('cover_too_large');
  return storeCover(Buffer.from(await response.arrayBuffer()));
}
async function cacheRemoteCovers() {
  const rows = db.prepare("SELECT id,image FROM books WHERE image LIKE 'http://%' OR image LIKE 'https://%'").all();
  if (!rows.length) return 0;
  const update = db.prepare('UPDATE books SET image=?,updated_at=? WHERE id=?');
  let cached = 0;
  for (const row of rows) {
    try {
      const stored = await fetchCoverFile(row.image);
      update.run(stored, now(), row.id);
      cached += 1;
    } catch (error) {
      console.warn(`remote_cover_cache_failed ${row.id}: ${error.message}`);
    }
  }
  return cached;
}
function migrateEmbeddedCovers() {
  const rows = db.prepare("SELECT id,image FROM books WHERE image LIKE 'data:image/%'").all();
  if (!rows.length) return 0;
  const update = db.prepare('UPDATE books SET image=?,thumb=NULL,display=NULL,updated_at=? WHERE id=?');
  let migrated = 0;
  for (const row of rows) { try { update.run(storeCover(decodeCoverData(row.image)), now(), row.id); migrated += 1; } catch (error) { console.warn(`cover_migration_failed ${row.id}: ${error.message}`); } }
  return migrated;
}

// Older uploads could corrupt a multi-byte character when a TCP chunk split it
// in half, leaving runs of U+FFFD (�) inside otherwise valid Arabic words.
// The original bytes are gone, so repair conservatively: if exactly one intact
// word already used elsewhere in the catalog matches the corrupted word with
// each U+FFFD run standing in for a single letter, use that word. Anything
// ambiguous is left untouched.
const TEXT_WORD = /[\p{L}\p{M}\uFFFD]+/gu;
const REPLACEMENT_RUN = /\uFFFD+/g;
const TEXT_REPAIR_VERSION = '2026-11-text-repair-1';
const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function repairWord(word, vocabulary) {
  if (!word.includes('\uFFFD')) return word;
  const pattern = new RegExp(`^${word.split(REPLACEMENT_RUN).map(escapeRegExp).join('[\\p{L}\\p{M}]')}$`, 'u');
  const matches = [...vocabulary].filter(candidate => pattern.test(candidate));
  return matches.length === 1 ? matches[0] : word;
}
function repairString(value, vocabulary) {
  return String(value ?? '').replace(TEXT_WORD, word => repairWord(word, vocabulary));
}
function repairValue(value, vocabulary) {
  if (typeof value === 'string') return repairString(value, vocabulary);
  if (Array.isArray(value)) return value.map(item => repairValue(item, vocabulary));
  if (value && typeof value === 'object') {
    // Repairing an object key can collide with an existing key (for example a
    // corrupted genre key and its already-correct twin). Keep the original key
    // in that case so neither value is silently discarded.
    const entries = Object.entries(value).map(([key, item]) => ({ key, nextKey: repairString(key, vocabulary), item: repairValue(item, vocabulary) }));
    const counts = new Map();
    entries.forEach(entry => counts.set(entry.nextKey, (counts.get(entry.nextKey) || 0) + 1));
    const result = {};
    for (const entry of entries) {
      const key = counts.get(entry.nextKey) > 1 && entry.key !== entry.nextKey ? entry.key : entry.nextKey;
      result[key] = entry.item;
    }
    return result;
  }
  return value;
}
// Names are UNIQUE in publishers/authors. If repairing a corrupted name lands
// on a name that already exists, the two records are the same entity, so merge
// the duplicate into the canonical row instead of failing the whole migration.
const uniqueTextTables = {
  publishers: {
    columns: ['name','city','description','logo'],
    mergeColumns: ['city','description','logo'],
    mergeSql: "city=CASE WHEN TRIM(COALESCE(city,''))='' THEN ? ELSE city END, description=CASE WHEN TRIM(COALESCE(description,''))='' THEN ? ELSE description END, logo=COALESCE(logo, ?)",
    references: [['books','publisher']]
  },
  authors: {
    columns: ['name','bio','photo'],
    mergeColumns: ['bio','photo'],
    mergeSql: "bio=CASE WHEN TRIM(COALESCE(bio,''))='' THEN ? ELSE bio END, photo=COALESCE(photo, ?)",
    references: [['books','author']]
  }
};
function repairUniqueTextTable(table, config, vocabulary) {
  const rows = db.prepare(`SELECT rowid AS rowid,${config.columns.join(',')} FROM ${table}`).all();
  let repaired = 0;
  for (const row of rows) {
    const next = config.columns.map(column => repairString(row[column], vocabulary));
    const nextName = next[0];
    const oldName = String(row.name ?? '');
    const target = nextName === oldName ? null : db.prepare(`SELECT rowid AS rowid FROM ${table} WHERE name=?`).get(nextName);
    if (target && target.rowid !== row.rowid) {
      const mergeValues = config.mergeColumns.map(column => next[config.columns.indexOf(column)]);
      db.prepare(`UPDATE ${table} SET ${config.mergeSql} WHERE rowid=?`).run(...mergeValues, target.rowid);
      for (const [refTable, refColumn] of config.references) db.prepare(`UPDATE ${refTable} SET ${refColumn}=? WHERE ${refColumn}=?`).run(nextName, oldName);
      db.prepare(`DELETE FROM ${table} WHERE rowid=?`).run(row.rowid);
      console.warn(`text_repair_merged ${table} ${JSON.stringify(oldName)} -> ${JSON.stringify(nextName)}`);
      repaired += 1;
      continue;
    }
    if (next.some((value, index) => value !== String(row[config.columns[index]] ?? ''))) {
      db.prepare(`UPDATE ${table} SET ${config.columns.map(column => `${column}=?`).join(',')} WHERE rowid=?`).run(...next, row.rowid);
      repaired += 1;
    }
  }
  return repaired;
}
function repairCorruptedText() {
  const textTables = {
    books: ['title','author','publisher','category','genre','note'],
    collections: ['title','description']
  };
  const vocabulary = new Set();
  const collect = value => { for (const word of String(value ?? '').match(TEXT_WORD) || []) if (!word.includes('\uFFFD')) vocabulary.add(word); };
  const contentRows = db.prepare('SELECT key,value_json FROM store_content').all();
  for (const [table, config] of Object.entries(uniqueTextTables)) for (const row of db.prepare(`SELECT ${config.columns.join(',')} FROM ${table}`).all()) for (const column of config.columns) collect(row[column]);
  for (const [table, columns] of Object.entries(textTables)) for (const row of db.prepare(`SELECT ${columns.join(',')} FROM ${table}`).all()) for (const column of columns) collect(row[column]);
  for (const row of contentRows) { try { const value = JSON.parse(row.value_json); const walk = item => { if (typeof item === 'string') collect(item); else if (Array.isArray(item)) item.forEach(walk); else if (item && typeof item === 'object') Object.entries(item).forEach(([key, child]) => { collect(key); walk(child); }); }; walk(value); } catch {} }
  let repaired = 0;
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const [table, config] of Object.entries(uniqueTextTables)) repaired += repairUniqueTextTable(table, config, vocabulary);
    for (const [table, columns] of Object.entries(textTables)) {
      const rows = db.prepare(`SELECT rowid AS rowid,${columns.join(',')} FROM ${table}`).all();
      const update = db.prepare(`UPDATE ${table} SET ${columns.map(column => `${column}=?`).join(',')} WHERE rowid=?`);
      for (const row of rows) {
        const next = columns.map(column => repairString(row[column], vocabulary));
        if (next.some((value, index) => value !== String(row[columns[index]] ?? ''))) { update.run(...next, row.rowid); repaired += 1; }
      }
    }
    const updateContent = db.prepare('UPDATE store_content SET value_json=? WHERE key=?');
    for (const row of contentRows) {
      let value;
      try { value = JSON.parse(row.value_json); } catch { continue; }
      const next = JSON.stringify(repairValue(value, vocabulary));
      if (next !== row.value_json) { updateContent.run(next, row.key); repaired += 1; }
    }
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  return repaired;
}
function repairCorruptedTextOnce() {
  const row = db.prepare('SELECT value_json FROM store_content WHERE key=?').get('textRepair');
  if (row && parse(row.value_json) === TEXT_REPAIR_VERSION) return 0;
  const repaired = repairCorruptedText();
  db.prepare('INSERT INTO store_content (key,value_json,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at').run('textRepair', json(TEXT_REPAIR_VERSION), now());
  return repaired;
}
// One-time clean slate: the catalog is now built exclusively from uploaded
// spreadsheets. The version key makes this safe to keep in the startup path —
// after the first run it never touches imported books again.
const CATALOG_RESET_VERSION = '2026-11-clean-slate';
function resetCatalogOnce() {
  const row = db.prepare('SELECT value_json FROM store_content WHERE key=?').get('catalogReset');
  if (row && parse(row.value_json) === CATALOG_RESET_VERSION) return false;
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('DELETE FROM reservations').run();
    db.prepare('DELETE FROM restocks').run();
    db.prepare('DELETE FROM collection_books').run();
    db.prepare('DELETE FROM collections').run();
    db.prepare('DELETE FROM books').run();
    db.prepare('DELETE FROM publishers').run();
    db.prepare('DELETE FROM authors').run();
    for (const key of ['genres','bookGenres','featured','publisherFeatures','authorProfiles','homeSections']) db.prepare('DELETE FROM store_content WHERE key=?').run(key);
    db.prepare('DELETE FROM store_content WHERE key=?').run('catalogReset');
    db.prepare('INSERT INTO store_content (key,value_json,updated_at) VALUES (?,?,?)').run('catalogReset', json(CATALOG_RESET_VERSION), now());
    db.exec('COMMIT');
    return true;
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
if (resetCatalogOnce()) console.log('Ghazal: catalog reset to an empty state (re-import your books to rebuild it)');
function seedOpeningStockLedger() {
  const migrationKey = 'inventoryOpeningStockLedger';
  if (db.prepare('SELECT 1 FROM store_content WHERE key=?').get(migrationKey)) return 0;
  db.exec('BEGIN IMMEDIATE');
  try {
    const soldRows = db.prepare(`SELECT b.id book_id,MAX(0,COALESCE(s.units,0)-COALESCE(r.returned,0)) sold FROM books b
      LEFT JOIN (SELECT book_id,SUM(qty) units FROM reservations WHERE settled_at IS NOT NULL GROUP BY book_id) s ON s.book_id=b.id
      LEFT JOIN (SELECT book_id,SUM(quantity) returned FROM restocks WHERE reason='customer_return' GROUP BY book_id) r ON r.book_id=b.id`).all();
    const soldByBook = new Map(soldRows.map(row => [row.book_id, Number(row.sold) || 0]));
    const books = db.prepare('SELECT id,stock FROM books').all();
    const priorPurchases = db.prepare("SELECT COALESCE(SUM(quantity),0) quantity FROM restocks WHERE book_id=? AND reason NOT IN ('customer_return','stock_adjustment')");
    const addOpeningStock = db.prepare("INSERT INTO restocks (book_id,quantity,reason,created_at) VALUES (?,?,?,?)");
    for (const book of books) {
      const alreadySeeded = db.prepare("SELECT 1 FROM restocks WHERE book_id=? AND reason='opening_stock' LIMIT 1").get(book.id);
      if (alreadySeeded) continue;
      const acquiredBeforeLedger = Math.max(0, Number(book.stock) + (soldByBook.get(book.id) || 0) - Number(priorPurchases.get(book.id).quantity || 0));
      if (acquiredBeforeLedger) addOpeningStock.run(book.id, acquiredBeforeLedger, 'opening_stock', now());
    }
    db.prepare('INSERT INTO store_content (key,value_json,updated_at) VALUES (?,?,?)').run(migrationKey, json(true), now());
    db.exec('COMMIT');
    return books.length;
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
seedOpeningStockLedger();
const configuredPassword = process.env.GHAZAL_ADMIN_PASSWORD;
if (!db.prepare('SELECT 1 FROM users LIMIT 1').get() && configuredPassword) db.prepare('INSERT INTO users (email,password_hash,role,created_at) VALUES (?,?,?,?)').run(process.env.GHAZAL_ADMIN_EMAIL || 'owner@alghazal.local', passwordHash(configuredPassword), 'owner', now());
const emptyContent = { genres:'{}', bookGenres:'[]', discounts:'[]', featured:'[]', authorProfiles:'{}', publisherFeatures:'[]', homeSections:'[]' };
for (const [key, value] of Object.entries(emptyContent)) if (!db.prepare('SELECT 1 FROM store_content WHERE key=?').get(key)) db.prepare('INSERT INTO store_content (key,value_json,updated_at) VALUES (?,?,?)').run(key, value, now());
if (repairCorruptedTextOnce()) console.log('Ghazal: repaired corrupted text left by older imports');
const DEFAULT_PUBLISHER_FEATURES = [
  { id:'mada', publisher:'دار المدى', active:true, layoutVersion:3, logo:'assets/publishers/al-mada.png', slogan:'بيت الثقافة والإبداع', kicker:'أدبٌ وفكرٌ وفنون', description:'رفّ من الكتب التي تصنع ذائقة، وتترك أثرًا أبعد من الصفحة الأخيرة.', accent:'#e51c2a', surface:'#f4d8c8', ink:'#251b19', mark:'م' },
  { id:'jamal', publisher:'منشورات الجمل', active:true, layoutVersion:3, logo:'assets/publishers/al-jamal.png', slogan:'أصواتٌ من العالم', kicker:'أصواتٌ لا تشبه سواها', description:'دار عريقة في الترجمة الأدبية والفلسفية، وكتب تمنح القارئ فرصة الإصغاء إلى أصوات مختلفة.', accent:'#bd1d2d', surface:'#e9d8b9', ink:'#271914', mark:'ج' },
  { id:'arab-network', publisher:'الشبكة العربية للأبحاث والنشر', active:true, layoutVersion:3, logo:'assets/publishers/arab-network.png', slogan:'بوابتك نحو عالم المعرفة', kicker:'معرفةٌ عربيةٌ رصينة', description:'كتب الفكر والتاريخ والسياسة التي تمنح السؤال العربي مساحة أوسع.', accent:'#2e579a', surface:'#dbe8ef', ink:'#18243b', mark:'ش' },
  { id:'rafidain', publisher:'دار الرافدين', active:true, layoutVersion:3, logo:'assets/publishers/al-rafidain.png', slogan:'من وادي الرافدين بدأت الكتابة والمدنية', kicker:'للكتاب العربي الجميل', description:'إصدارات تحمل حيوية المكتبة العربية، بين التراث والقراءة المعاصرة.', accent:'#20205e', surface:'#e5e1ee', ink:'#171735', mark:'ر' }
  ,{ id:'page7', publisher:'صفحة 7', active:true, layoutVersion:3, logo:'assets/publishers/safha.png', slogan:'حكاياتٌ تفتح نوافذ جديدة', kicker:'مساحةٌ للخيال والمعرفة', description:'اكتشف عوالم صفحة 7 المختارة بعناية، من الرواية إلى الفكر.', accent:'#6c345f', surface:'#f3e8f0', ink:'#281d29', mark:'٧' }
  ,{ id:'dar-masria-lubnania', publisher:'الدار المصرية اللبنانية', active:true, layoutVersion:3, logo:'assets/publishers/aldar-almisriya-allubnaniya.png', slogan:'كتابٌ عربيّ برؤيةٍ عصرية', kicker:'من القاهرة إلى كل قارئ', description:'إصدارات تجمع الأدب والفكر والمعرفة في اختيارات عربية راسخة.', accent:'#17624f', surface:'#e7f0e9', ink:'#172d27', mark:'م' }
  ,{ id:'mahrousa', publisher:'المحروسة', active:true, layoutVersion:3, logo:'assets/publishers/al-mahrousa.png', slogan:'مساحةٌ للأفكار والناس', kicker:'كتبٌ من قلب المجتمع', description:'عناوين تقترب من الإنسان وتفتح حوارًا مع تفاصيل الحياة.', accent:'#a44832', surface:'#f5e9df', ink:'#35221e', mark:'م' }
  ,{ id:'jadid-muttahida', publisher:'دار الكتاب الجديد المتحدة', active:true, layoutVersion:3, logo:'assets/publishers/alkitab-aljadeed.png', slogan:'أفقٌ جديد للكتاب العربي', kicker:'فكرٌ وأدبٌ بلا حدود', description:'إصدارات فكرية وأدبية تعبر الحدود وتوسّع أفق القراءة.', accent:'#315c85', surface:'#e8eef4', ink:'#1d2a38', mark:'ج' }
  ,{ id:'arab-scientific', publisher:'الدار العربية للعلوم ناشرون', active:true, layoutVersion:3, logo:'assets/publishers/arab-scientific.png', slogan:'المعرفة تبدأ من كتاب', kicker:'فكرٌ وأدبٌ وعلوم', description:'مكتبة عربية واسعة من الكتب الفكرية والأدبية والعلمية.', accent:'#16548a', surface:'#e7f0f7', ink:'#16283a', mark:'ع' }
  ,{ id:'sutoor', publisher:'دار سطور', active:true, layoutVersion:3, logo:'assets/publishers/dar-sutoor.webp', slogan:'سطورٌ تبقى في الذاكرة', kicker:'حكايةٌ تبدأ من هنا', description:'إصدارات عربية معاصرة تجمع متعة الحكاية وعمق الفكرة.', accent:'#b52b55', surface:'#17151b', ink:'#f7f1f2', mark:'س' }
  ,{ id:'afaq', publisher:'آفاق للنشر والتوزيع', active:true, layoutVersion:3, logo:'assets/publishers/afaq-books.png', slogan:'كتبٌ تفتح آفاقًا جديدة', kicker:'معرفةٌ تمتد إلى العالم', description:'اكتشف إصدارات آفاق للنشر والتوزيع من رفوف الغزال.', accent:'#f5ae0b', surface:'#fff5d9', ink:'#12334a', mark:'آ' }
];
const GENERIC_PUBLISHER_FEATURE = { slogan:'', kicker:'إصدارات مختارة', description:'اكتشف كتب هذه الدار من رفوف الغزال.', accent:'#8f5e3b', surface:'#eee2ce', ink:'#1b1915' };
function mergePublisherFeatureDesign(feature, design) {
  const next = { ...feature, id:design.id, publisher:feature.publisher || design.publisher, logo:feature.logo || design.logo, layoutVersion:feature.layoutVersion || design.layoutVersion, active:feature.active === undefined ? true : feature.active };
  for (const key of ['slogan','kicker','description','accent','surface','ink','mark']) {
    const value = String(next[key] ?? '').trim();
    const generic = key === 'mark' ? value === String(next.publisher || '').slice(0,1) : value === GENERIC_PUBLISHER_FEATURE[key];
    if (!value || generic) next[key] = design[key];
  }
  return next;
}
// The clean-slate catalog migration removed the old in-code spotlight defaults.
// Restore those four original designs once, from the values shipped before the
// reset, without overwriting any spotlight configuration an owner has saved.
if (!db.prepare("SELECT 1 FROM store_content WHERE key='publisherFeaturesRestored'").get()) {
  const saved = contentValue('publisherFeatures', []);
  if (!Array.isArray(saved) || !saved.length) {
    db.prepare('INSERT INTO store_content (key,value_json,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at').run('publisherFeatures', json(DEFAULT_PUBLISHER_FEATURES.map(feature => ({ ...feature }))), now());
  }
  db.prepare('INSERT INTO store_content (key,value_json,updated_at) VALUES (?,?,?)').run('publisherFeaturesRestored', 'true', now());
}
// Older deployments created publisher features manually, so a known publisher
// (for example منشورات الجمل) could end up with the generic placeholder design
// instead of the designed logo, colours, and copy. Merge the shipped designs in
// once, keeping any custom value an owner has already set.
const PUBLISHER_FEATURE_DESIGN_VERSION = '2026-11-publisher-design-6';
const HIDDEN_PUBLISHER_FEATURE_IDS = new Set(['page7','dar-masria-lubnania','mahrousa','jadid-muttahida','arab-scientific','sutoor']);
function syncPublisherFeatureDesigns() {
  const marker = db.prepare("SELECT value_json FROM store_content WHERE key='publisherFeaturesDesign'").get();
  if (marker && parse(marker.value_json) === PUBLISHER_FEATURE_DESIGN_VERSION) return 0;
  const saved = contentValue('publisherFeatures', []);
  const features = Array.isArray(saved) ? saved.map(feature => ({ ...feature })) : [];
  let changed = 0;
  for (const design of DEFAULT_PUBLISHER_FEATURES) {
    let index = features.findIndex(feature => String(feature.publisher || '').trim() === design.publisher);
    if (index < 0) index = features.findIndex(feature => feature.id === design.id);
    if (index < 0) { features.push({ ...design }); changed += 1; continue; }
    const next = mergePublisherFeatureDesign(features[index], design);
    if (HIDDEN_PUBLISHER_FEATURE_IDS.has(design.id)) next.active = false;
    if (JSON.stringify(next) !== JSON.stringify(features[index])) { features[index] = next; changed += 1; }
  }
  if (changed) db.prepare('INSERT INTO store_content (key,value_json,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at').run('publisherFeatures', json(features), now());
  db.prepare('INSERT INTO store_content (key,value_json,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at').run('publisherFeaturesDesign', json(PUBLISHER_FEATURE_DESIGN_VERSION), now());
  return changed;
}
if (syncPublisherFeatureDesigns()) console.log('Ghazal: restored the designed publisher feature sections');

const migratedCovers = migrateEmbeddedCovers();
if (migratedCovers) console.log(`Ghazal: migrated ${migratedCovers} embedded cover(s) to ${COVERS_DIR}`);

function bookList(url) { const q = String(url.searchParams.get('q') || '').trim(); const where = q ? `WHERE title LIKE @q OR author LIKE @q OR publisher LIKE @q OR genre LIKE @q OR isbn LIKE @q` : ''; return db.prepare(`SELECT *, stock-reserved AS available FROM books ${where} ORDER BY title`).all(q ? { q: `%${q}%` } : {}); }
function collectionList(includeInactive = false) { const collections = db.prepare(`SELECT * FROM collections ${includeInactive ? '' : 'WHERE active=1'} ORDER BY created_at`).all(); return collections.map(collection => ({ ...collection, active: Boolean(collection.active), homepage: Boolean(collection.homepage), bookIds: db.prepare('SELECT book_id FROM collection_books WHERE collection_id=? ORDER BY position').all(collection.id).map(item => item.book_id) })); }
function contentValue(key, fallback) { const row = db.prepare('SELECT value_json FROM store_content WHERE key=?').get(key); return row ? parse(row.value_json, fallback) : fallback; }
// Custom homepage carousels. Keep the value list in sync with script.js and
// admin.js: each key maps to a fixed anchor on the storefront homepage.
const HOME_SECTION_PLACEMENTS = ['top','after-selections','after-story','after-shelves','after-new','after-publishers-features','after-departments','after-publishers','end'];
function sanitizeHomeSections(value, bookIds = new Set(), collectionIds = new Set()) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.slice(0, 40).map(section => {
    if (!section || typeof section !== 'object') return null;
    const id = String(section.id || '').trim().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80);
    if (!id || seen.has(id)) return null;
    seen.add(id);
    const title = String(section.title || '').trim().slice(0, 120);
    if (!title) return null;
    const type = section.type === 'collection' ? 'collection' : 'books';
    const collectionId = type === 'collection' ? String(section.collectionId || '').trim() : '';
    const ids = Array.isArray(section.bookIds)
      ? [...new Set(section.bookIds.map(item => String(item || '').trim()).filter(item => item && bookIds.has(item)))].slice(0, 500)
      : [];
    const placement = HOME_SECTION_PLACEMENTS.includes(section.placement) ? section.placement : 'after-shelves';
    return {
      id,
      title,
      description: String(section.description || '').trim().slice(0, 300),
      type,
      collectionId: collectionIds.has(collectionId) ? collectionId : '',
      bookIds: type === 'books' ? ids : [],
      placement,
      active: section.active !== false
    };
  }).filter(Boolean);
}
function deriveGenres(books, stored = {}) {
  const genres = {};
  for (const book of books) {
    const id = String(book.category || '').trim();
    if (!id) continue;
    genres[id] = { title: stored[id]?.title || id, description: stored[id]?.description || '' };
  }
  return genres;
}
function deriveBookGenres(books) {
  return [...new Set(books.map(book => String(book.genre || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar'));
}
function catalogPayload() {
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const weeklySales = db.prepare("SELECT book_id, SUM(qty) AS quantity FROM order_items JOIN orders ON orders.id=order_items.order_id WHERE orders.status='confirmed' AND orders.created_at >= ? GROUP BY book_id ORDER BY quantity DESC, MAX(orders.created_at) DESC LIMIT 8").all(weekStart);
  const allTimeSales = db.prepare("SELECT book_id, SUM(qty) AS quantity FROM order_items JOIN orders ON orders.id=order_items.order_id WHERE orders.status='confirmed' GROUP BY book_id ORDER BY quantity DESC, MAX(orders.created_at) DESC LIMIT 8").all();
  const bestSellerRows = weeklySales.length ? weeklySales : allTimeSales;
  const fallbackFeatured = contentValue('featured', []);
  const bestSellerBookIds = bestSellerRows.map(row => row.book_id);
  const profiles = contentValue('authorProfiles', {}); const books = bookList(new URL('http://local/api/books'));
  const genres = deriveGenres(books, contentValue('genres', {}));
  const bookGenres = deriveBookGenres(books);
  const authorSpotlight = Object.entries(profiles).map(([name, profile]) => ({ name, ...profile, bookIds: db.prepare('SELECT id FROM books WHERE author=? ORDER BY title').all(name).map(row => row.id) })).filter(author => author.bio && author.bookIds.length >= 2).sort((a,b) => Number(b.featured) - Number(a.featured) || b.bookIds.length - a.bookIds.length)[0] || null;
  return { books, publishers: db.prepare('SELECT * FROM publishers ORDER BY name').all(), genres, bookGenres, discounts: contentValue('discounts', []), featuredBookIds: fallbackFeatured, publisherFeatures: contentValue('publisherFeatures', []), homeSections: contentValue('homeSections', []), bestSellerBookIds, bestSellerSales: bestSellerRows, bestSellerWindow: weeklySales.length ? 'weekly' : allTimeSales.length ? 'all-time' : 'none', authorProfiles: profiles, authorSpotlight, collections: collectionList(false) };
}
function inventoryReportRows() {
  return db.prepare(`SELECT b.*,b.stock-b.reserved available,
      COALESCE(p.purchased,0) purchased,
      MAX(0,COALESCE(s.units,0)-COALESCE(r.returned,0)) sold
    FROM books b
    LEFT JOIN (SELECT book_id,SUM(quantity) purchased FROM restocks WHERE reason NOT IN ('customer_return','stock_adjustment') GROUP BY book_id) p ON p.book_id=b.id
    LEFT JOIN (SELECT book_id,SUM(qty) units FROM reservations WHERE settled_at IS NOT NULL GROUP BY book_id) s ON s.book_id=b.id
    LEFT JOIN (SELECT book_id,SUM(quantity) returned FROM restocks WHERE reason='customer_return' GROUP BY book_id) r ON r.book_id=b.id
    ORDER BY b.title`).all();
}
function salesReportRows(startDate, endDate, scope = 'all') {
  const validDate = value => {
    if (!value) return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === value;
  };
  if (!validDate(startDate) || !validDate(endDate) || Boolean(startDate) !== Boolean(endDate) || (startDate && startDate > endDate)) throw new Error('invalid_sales_report_range');
  if (!['all','confirmed'].includes(scope)) throw new Error('invalid_sales_report_scope');
  const conditions = [];
  const params = [];
  const algeriaDayStart = value => { const [year,month,day] = value.split('-').map(Number); return new Date(Date.UTC(year,month-1,day)-60*60*1000).toISOString(); };
  if (startDate) { conditions.push('o.created_at>=?'); params.push(algeriaDayStart(startDate)); }
  if (endDate) { const afterEnd = new Date(`${endDate}T12:00:00.000Z`); afterEnd.setUTCDate(afterEnd.getUTCDate()+1); conditions.push('o.created_at<?'); params.push(algeriaDayStart(afterEnd.toISOString().slice(0,10))); }
  conditions.push(scope === 'confirmed' ? "o.status IN ('confirmed','preparing','shipped','delivered')" : "o.status NOT IN ('cancelled','returned')");
  const orders = db.prepare(`SELECT o.* FROM orders o WHERE ${conditions.join(' AND ')} ORDER BY o.created_at,o.reference`).all(...params).map(order => {
    const customer = parse(order.customer_json);
    const items = db.prepare('SELECT book_id id,title,qty,unit_price FROM order_items WHERE order_id=? ORDER BY title,book_id').all(order.id).map(item => ({ ...item, qty:Number(item.qty), unit_price:Number(item.unit_price), line_total:Number(item.qty)*Number(item.unit_price) }));
    return { reference:order.reference, created_at:order.created_at, status:order.status, subtotal:Number(order.subtotal), discount:Number(order.discount), delivery:Number(order.delivery), total:Number(order.total), items, book_count:items.reduce((sum,item)=>sum+item.qty,0), books_total:Math.max(0,Number(order.subtotal)-Number(order.discount)), customer_name:String(customer.customer || '') };
  });
  return { startDate:startDate || '', endDate:endDate || '', scope, orders, totals:orders.reduce((totals,order)=>({ orders:totals.orders+1, book_count:totals.book_count+order.book_count, books_total:totals.books_total+order.books_total, discount:totals.discount+order.discount, delivery:totals.delivery+order.delivery, total:totals.total+order.total }),{ orders:0,book_count:0,books_total:0,discount:0,delivery:0,total:0 }) };
}
// The public catalog is identical for every visitor, so build it at most once
// per content change and serve a pre-compressed copy. The cache is keyed by a
// signature derived from the data instead of the write routes, so imports,
// direct database edits, and order reservations all invalidate it too.
const CATALOG_CACHE_TTL = 30 * 1000;
const catalogSignatureStmt = db.prepare(`
  SELECT (SELECT COUNT(*) || ':' || COALESCE(MAX(updated_at),'') FROM books)
      || '/' || (SELECT COUNT(*) || ':' || COALESCE(MAX(updated_at),'') FROM store_content)
      || '/' || (SELECT COUNT(*) || ':' || COALESCE(MAX(updated_at),'') FROM collections)
      || '/' || (SELECT COUNT(*) || ':' || COALESCE(SUM(position),0) FROM collection_books)
      || '/' || (SELECT COUNT(*) || ':' || COALESCE(SUM(COALESCE(LENGTH(name),0)+COALESCE(LENGTH(city),0)+COALESCE(LENGTH(description),0)+COALESCE(LENGTH(logo),0)),0) FROM publishers) AS signature
`);
let catalogCache = null;
function catalogResponse() {
  const signature = catalogSignatureStmt.get().signature;
  if (catalogCache && catalogCache.signature === signature && Date.now() - catalogCache.builtAt < CATALOG_CACHE_TTL) return catalogCache;
  const raw = Buffer.from(json(catalogPayload()));
  const etag = `W/"${crypto.createHash('sha1').update(raw).digest('base64url')}"`;
  catalogCache = { signature, builtAt: Date.now(), etag, raw, gzip: raw.length > 1024 ? zlib.gzipSync(raw) : null };
  return catalogCache;
}
function sendCatalog(req, res) {
  const entry = catalogResponse();
  const headers = { 'content-type':'application/json; charset=utf-8', etag:entry.etag, 'cache-control':'public, max-age=30, stale-while-revalidate=300', vary:'accept-encoding' };
  const ifNoneMatch = String(req.headers['if-none-match'] || '').split(',').map(value => value.trim());
  if (ifNoneMatch.includes(entry.etag)) { res.writeHead(304, headers); return res.end(); }
  const gzip = Boolean(res._ghazalGzip) && Boolean(entry.gzip);
  res.writeHead(200, { ...headers, ...(gzip ? { 'content-encoding':'gzip' } : {}) });
  return res.end(gzip ? entry.gzip : entry.raw);
}
async function sendMetaPurchase(body, reference, total, items, request) {
  const pixel = process.env.META_PIXEL_ID; const token = process.env.META_ACCESS_TOKEN; const eventId = String(body.metaEventId || reference); const previous = db.prepare('SELECT status FROM conversion_events WHERE event_id=?').get(eventId); if (previous?.status === 'sent' || metaEventsInFlight.has(eventId)) return; if (!pixel || !token) { recordConversion(eventId,'Purchase',reference,'meta','skipped',{reason:'not_configured'}); return; }
  metaEventsInFlight.add(eventId);
  const rawPhone = String(body.customer?.phone || '').replace(/\D/g, ''); const phone = rawPhone.startsWith('0') ? `213${rawPhone.slice(1)}` : rawPhone; const hashedPhone = phone ? hash(phone) : undefined;
  const protocol = request.headers['x-forwarded-proto'] || 'https';
  const payload = { data: [{ event_name:'Purchase', event_time:Math.floor(Date.now() / 1000), event_id:eventId, action_source:'website', event_source_url:`${protocol}://${request.headers.host || 'localhost'}/`, user_data:{ ph:hashedPhone ? [hashedPhone] : [], client_user_agent:request.headers['user-agent'] || '' }, custom_data:{ currency:'DZD', value:Number(total), order_id:reference, content_type:'product', content_ids:items.map(item => item.id) } }] };
  try { const response = await fetch(`https://graph.facebook.com/${process.env.META_GRAPH_VERSION || 'v22.0'}/${encodeURIComponent(pixel)}/events?access_token=${encodeURIComponent(token)}`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(payload) }); const responseBody = await response.text(); recordConversion(eventId,'Purchase',reference,'meta',response.ok ? 'sent' : 'failed',{status:response.status,body:responseBody.slice(0,1000)}); if (!response.ok) throw new Error(`meta_capi_${response.status}`); } catch (error) { recordConversion(eventId,'Purchase',reference,'meta','failed',{message:error.message}); throw error; } finally { metaEventsInFlight.delete(eventId); }
}
function telegramEscape(value) { return String(value ?? '').replace(/[&<>]/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[character])); }
async function sendTelegramOrderNotification(reference) {
  const token = process.env.TELEGRAM_BOT_TOKEN; const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  const order = db.prepare('SELECT * FROM orders WHERE reference=?').get(reference); if (!order) return;
  const customer = parse(order.customer_json); const items = db.prepare('SELECT title,qty,unit_price FROM order_items WHERE order_id=?').all(order.id);
  const lines = items.map(item => `• ${telegramEscape(item.title)} × ${item.qty} — ${Number(item.unit_price * item.qty).toLocaleString('en-US')} DZD`).join('\n');
  const message = `<b>طلب جديد — الغزال للكتب</b>\n\n<b>${telegramEscape(order.reference)}</b>\nالعميل: ${telegramEscape(customer.customer)}\nالهاتف: ${telegramEscape(customer.phone)}\nالموقع: ${telegramEscape(customer.wilaya)}، ${telegramEscape(customer.commune)}\nالشحن: ${order.shipment_type === 'office' ? 'مكتب' : 'منزل'}\n\n<b>الكتب</b>\n${lines}\n\n<b>الإجمالي: ${Number(order.total).toLocaleString('en-US')} DZD</b>`;
  const response = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ chat_id:chatId, text:message, parse_mode:'HTML', disable_web_page_preview:true }) });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`telegram_${response.status}: ${details.slice(0, 500)}`);
  }
}
function validateOrder(body) {
  if (!body.customer || !Array.isArray(body.items) || !body.items.length || !body.shipping) throw new Error('order_fields_required');
  if (!/^0[5-7]\d{8}$/.test(String(body.customer.phone || ''))) throw new Error('invalid_phone');
  if (!Number.isInteger(body.shipping.wilayaCode) || !body.shipping.commune) throw new Error('invalid_shipping');
  const wilayaCode = String(body.shipping.wilayaCode).padStart(2, '0');
  const communeId = Number(body.shipping.communeId);
  const normalizedCommune = String(body.shipping.commune).trim().toLocaleLowerCase();
  const validCommune = (Number.isInteger(communeId) && communes.find(item => item.wilaya_code === wilayaCode && Number(item.id) === communeId)) || communes.find(item => item.wilaya_code === wilayaCode && [item.commune_name_ascii, item.commune_name].some(name => String(name).trim().toLocaleLowerCase() === normalizedCommune));
  if (!validCommune) throw new Error('invalid_commune');
  if (!['home', 'office'].includes(body.shipping.type)) throw new Error('invalid_shipment_type');
  if (body.shipping.type === 'office' && !hasStopDesk(wilayaCode, validCommune)) throw new Error('stop_desk_unavailable');
  if (!deliveryRates[body.shipping.wilayaCode]?.[body.shipping.type]) throw new Error('invalid_shipping');
  for (const item of body.items) if (!item.id || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 100) throw new Error('invalid_item');
}
function discountFor(book, code = '') {
  const normalizedCode = String(code || '').trim().toUpperCase();
  return contentValue('discounts', []).filter(discount => {
    if (discount.active === false) return false;
    if (normalizedCode ? String(discount.code || '').trim().toUpperCase() !== normalizedCode : String(discount.code || '').trim()) return false;
    return discount.appliesToAll || (Array.isArray(discount.bookIds) && discount.bookIds.map(String).includes(String(book.id)));
  }).sort((a, b) => {
    const amount = discount => discount.type === 'fixed' ? Number(discount.value || 0) : Number(book.price) * Math.min(100, Number(discount.value || 0)) / 100;
    return amount(b) - amount(a);
  })[0] || null;
}
function discountAmount(book, code = '') {
  const discount = discountFor(book, code); if (!discount) return 0;
  const raw = discount.type === 'fixed' ? Number(discount.value || 0) : Number(book.price) * Math.min(100, Number(discount.value || 0)) / 100;
  return Math.min(Number(book.price), Math.max(0, Math.round(raw)));
}
function subscribeNewsletter(email, source = 'storefront') {
  const normalized = String(email || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(normalized)) throw new Error('invalid_email');
  const stamp = now();
  db.prepare('INSERT INTO newsletter_subscribers (email,source,created_at,updated_at) VALUES (?,?,?,?) ON CONFLICT(email) DO UPDATE SET source=excluded.source,updated_at=excluded.updated_at').run(normalized, String(source || 'storefront'), stamp, stamp);
  return normalized;
}
function createOrder(body) {
  validateOrder(body); db.exec('BEGIN IMMEDIATE');
  try {
    const stamp = now(); const itemsById = new Map();
    for (const item of body.items) itemsById.set(String(item.id), (itemsById.get(String(item.id)) || 0) + item.qty);
    const items = []; let subtotal = 0; let discount = 0;
    const discountCode = String(body.discountCode || '').trim();
    if (discountCode && !contentValue('discounts', []).some(item => item.active !== false && String(item.code || '').trim().toUpperCase() === discountCode.toUpperCase())) throw new Error('invalid_discount_code');
    for (const [id, qty] of itemsById) {
      const book = db.prepare('SELECT * FROM books WHERE id=?').get(id); if (!book) throw new Error('book_not_found');
      const itemDiscount = discountAmount(book, discountCode); items.push({ qty, book, itemDiscount }); subtotal += book.price * qty; discount += itemDiscount * qty;
    }
    if (discountCode && discount <= 0) throw new Error('invalid_discount_code');
    const reference = `GZ-${stamp.slice(0,10).replaceAll('-','')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const delivery = deliveryRates[Number(body.shipping.wilayaCode)][body.shipping.type];
    const customerShipping = { ...body.shipping, price: delivery };
    const result = db.prepare('INSERT INTO orders (reference,customer_json,subtotal,discount,coupon_code,delivery,total,payment,shipment_type,status,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(reference, json({ ...body.customer, ...customerShipping }), subtotal, discount, discountCode.toUpperCase(), delivery, Math.max(0, subtotal - discount) + delivery, 'cash_on_delivery', body.shipping.type, 'new', String(body.notes || ''), stamp, stamp);
    for (const item of items) db.prepare('INSERT INTO order_items VALUES (?,?,?,?,?)').run(result.lastInsertRowid, item.book.id, item.book.title, item.qty, item.book.price);
    db.prepare('INSERT INTO order_events (order_id,status,created_at) VALUES (?,?,?)').run(result.lastInsertRowid, 'new', stamp); db.exec('COMMIT'); return reference;
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
function transitionOrder(reference, status, notes, user) {
  const allowed = ['new','confirmed','preparing','shipped','delivered','cancelled','returned'];
  if (!allowed.includes(status)) throw new Error('invalid_status');
  db.exec('BEGIN IMMEDIATE');
  try {
    const order = db.prepare('SELECT * FROM orders WHERE reference=?').get(reference); if (!order) throw new Error('not_found');
    const stamp = now(); const reservations = db.prepare('SELECT * FROM reservations WHERE order_id=?').all(order.id);
    if (status === 'confirmed' && order.status !== 'confirmed' && order.status !== 'preparing' && order.status !== 'shipped' && order.status !== 'delivered') {
      const orderedItems=db.prepare('SELECT * FROM order_items WHERE order_id=?').all(order.id);
      for (const item of orderedItems) {
        const book=db.prepare('SELECT stock,reserved FROM books WHERE id=?').get(item.book_id); if(!book) continue;
        const legacyReservation=db.prepare('SELECT * FROM reservations WHERE order_id=? AND book_id=? AND settled_at IS NULL AND released_at IS NULL').get(order.id,item.book_id);
        const otherReserved=Math.max(0,Number(book.reserved)-Number(legacyReservation?.qty||0));
        const fulfilled=Math.min(Number(item.qty),Math.max(0,Number(book.stock)-otherReserved));
        db.prepare('UPDATE books SET stock=stock-?,reserved=MAX(0,reserved-?),updated_at=? WHERE id=?').run(fulfilled,legacyReservation?.qty||0,stamp,item.book_id);
        if(fulfilled>0) db.prepare('UPDATE order_items SET qty=? WHERE order_id=? AND book_id=?').run(fulfilled,order.id,item.book_id);
        else db.prepare('DELETE FROM order_items WHERE order_id=? AND book_id=?').run(order.id,item.book_id);
        if(legacyReservation) db.prepare('UPDATE reservations SET qty=?,settled_at=? WHERE order_id=? AND book_id=?').run(fulfilled,stamp,order.id,item.book_id);
        else if(fulfilled>0) db.prepare('INSERT INTO reservations (order_id,book_id,qty,settled_at) VALUES (?,?,?,?)').run(order.id,item.book_id,fulfilled,stamp);
      }
      const finalItems = db.prepare('SELECT qty,unit_price FROM order_items WHERE order_id=?').all(order.id);
      const finalSubtotal = finalItems.reduce((sum, item) => sum + Number(item.qty) * Number(item.unit_price), 0);
      const finalDiscount = Math.min(Number(order.discount || 0), finalSubtotal);
      db.prepare('UPDATE orders SET subtotal=?,discount=?,total=? WHERE id=?').run(finalSubtotal, finalDiscount, Math.max(0, finalSubtotal - finalDiscount + Number(order.delivery) + Number(order.total_adjustment || 0)), order.id);
    }
    if (status === 'cancelled' && order.status !== 'cancelled') for (const item of reservations.filter(row => !row.settled_at && !row.released_at)) { db.prepare('UPDATE books SET reserved=MAX(0,reserved-?),updated_at=? WHERE id=?').run(item.qty,stamp,item.book_id); db.prepare('UPDATE reservations SET released_at=? WHERE order_id=? AND book_id=?').run(stamp,order.id,item.book_id); }
    if (status === 'returned' && order.status !== 'returned' && ['shipped','delivered'].includes(order.status)) for (const item of reservations.filter(row => row.settled_at)) { db.prepare('UPDATE books SET stock=stock+?,updated_at=? WHERE id=?').run(item.qty,stamp,item.book_id); db.prepare('INSERT INTO restocks (book_id,quantity,reason,user_id,created_at) VALUES (?,?,?,?,?)').run(item.book_id,item.qty,'customer_return',user?.id || null,stamp); }
    db.prepare('UPDATE orders SET status=?,notes=?,updated_at=? WHERE id=?').run(status, notes == null ? order.notes : String(notes), stamp, order.id); db.prepare('INSERT INTO order_events (order_id,status,note,user_id,created_at) VALUES (?,?,?,?,?)').run(order.id,status,String(notes || ''),user?.id || null,stamp); audit(user,'status_change','order',reference,{from:order.status,to:status}); db.exec('COMMIT'); return order;
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
function orderView(order) { const customer = parse(order.customer_json); const items = db.prepare('SELECT book_id id,title,qty,unit_price FROM order_items WHERE order_id=?').all(order.id); const timeline = db.prepare('SELECT status,note,created_at,user_id FROM order_events WHERE order_id=? ORDER BY created_at').all(order.id); return { ...order, placedAt: order.created_at, customer, shipping: { type: order.shipment_type, wilayaCode: customer.wilayaCode, wilaya: customer.wilaya, commune: customer.commune, price: order.delivery }, items, timeline, ecotrackRow: { 'reference commande': order.reference, 'nom et prenom du destinataire*': customer.customer || '', 'telephone*': customer.phone || '', 'telephone 2': customer.phone2 || '', 'code wilaya*': customer.wilayaCode || '', 'wilaya de livraison': customer.wilaya || '', 'commune de livraison*': customer.commune || '', 'adresse de livraison*': [customer.address, customer.communeArabic || customer.commune, customer.wilaya].filter(Boolean).join('، '), 'produit*': items.map(item => `${item.title} x${item.qty}`).join(' + '), 'poids (kg)': 0, 'montant du colis*': order.total, 'remarque': order.notes || '', 'FRAGILE\n( si oui mettez OUI sinon laissez vide )': '', 'ECHANGE\n( si oui mettez OUI sinon laissez vide )': '', 'PICK UP\n( si oui mettez OUI sinon laissez vide )': '', 'RECOUVREMENT\n( si oui mettez OUI sinon laissez vide )': 'OUI', 'STOP DESK\n( si oui mettez OUI sinon laissez vide )': order.shipment_type === 'office' ? 'OUI' : '', 'Lien map': customer.mapLink || '' } }; }
function publicOrderView(order) { const view = orderView(order); return { reference:view.reference, status:view.status, total:view.total, created_at:view.created_at, updated_at:view.updated_at, placedAt:view.placedAt, timeline:view.timeline.map(event => ({ status:event.status, created_at:event.created_at })) }; }

async function api(req, res, url) {
  res._ghazalGzip = /\bgzip\b/.test(String(req.headers['accept-encoding'] || '').toLowerCase());
  try {
    if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { ok:true, service:'ghazal', time:now(), checks:{ database:Boolean(db.prepare('SELECT 1').get()) } });
    if (req.method === 'GET' && url.pathname === '/api/shipping-options') return send(res,200,{stopDeskCommuneIds:communes.filter(item=>hasStopDesk(item.wilaya_code,item)).map(item=>Number(item.id))});
    const limited = req.method === 'POST' && url.pathname === '/api/auth/login' ? rateLimit(req, 'login', 10, 15 * 60e3) : req.method === 'POST' && url.pathname === '/api/auth/signup' ? rateLimit(req, 'signup', 3, 15 * 60e3) : req.method === 'POST' && url.pathname === '/api/orders' ? rateLimit(req, 'orders', 60, 60 * 60e3) : req.method === 'GET' && url.pathname === '/api/orders/lookup' ? rateLimit(req, 'order-lookup', 30, 15 * 60e3) : req.method === 'POST' && url.pathname === '/api/newsletter' ? rateLimit(req, 'newsletter', 5, 15 * 60e3) : 0;
    if (limited) return send(res, 429, { error:'rate_limited', retryAfter:limited }, { 'retry-after':String(limited) });
    if (req.method === 'GET' && url.pathname === '/api/auth/status') return send(res, 200, { setupAvailable: !db.prepare('SELECT 1 FROM users LIMIT 1').get() });
    if (req.method === 'GET' && url.pathname === '/api/auth/me') { const user = userFromRequest(req); if (!user) return send(res,401,{error:'unauthorized'}); return send(res,200,{user:{id:user.id,email:user.email,role:user.role,permissions:permissionsFor(user)}}); }
    if (req.method === 'POST' && url.pathname === '/api/auth/signup') {
      const body = await readBody(req); const email = String(body.email || '').trim().toLowerCase(); const password = String(body.password || '');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12) return send(res, 400, { error:'invalid_signup' });
      db.exec('BEGIN IMMEDIATE'); try { if (db.prepare('SELECT 1 FROM users LIMIT 1').get()) { db.exec('ROLLBACK'); return send(res, 409, { error:'signup_closed' }); } const result = db.prepare('INSERT INTO users (email,password_hash,role,created_at) VALUES (?,?,?,?)').run(email,passwordHash(password),'owner',now()); const user = db.prepare('SELECT id,email,role FROM users WHERE id=?').get(result.lastInsertRowid); const token = createSession(user.id); audit(user,'signup','user',user.id,{email}); db.exec('COMMIT'); return send(res,201,authResponse(user,token)); } catch (error) { db.exec('ROLLBACK'); throw error; }
    }
    if (req.method === 'POST' && url.pathname === '/api/auth/login') { const body = await readBody(req); const email = String(body.email || '').trim().toLowerCase(); const user = db.prepare('SELECT * FROM users WHERE email=?').get(email); if (!user || !passwordMatches(body.password, user.password_hash)) return send(res, 401, { error: 'invalid_credentials' }); return send(res, 200, authResponse(user, createSession(user.id))); }
    if (req.method === 'GET' && url.pathname === '/api/books') return send(res, 200, { books: bookList(url) });
    if (req.method === 'GET' && url.pathname === '/api/collections') return send(res, 200, { collections: collectionList(false) });
    if (req.method === 'GET' && url.pathname === '/api/catalog') return sendCatalog(req, res);
    if (req.method === 'POST' && url.pathname === '/api/orders') { const body = await readBody(req); validateOrder(body); const phone = String(body.customer?.phone || '').replace(/\D/g, ''); const phoneLimited = phone ? rateLimit(req, 'orders-phone', 3, 15 * 60e3, `${requestIp(req)}:${phone}`) : 0; if (phoneLimited) return send(res,429,{error:'rate_limited',retryAfter:phoneLimited},{'retry-after':String(phoneLimited)}); const reference = createOrder(body); const order = db.prepare('SELECT subtotal,discount,delivery,total FROM orders WHERE reference=?').get(reference); sendMetaPurchase(body, reference, order.total, body.items || [], req).catch(error => console.error(error.message)); sendTelegramOrderNotification(reference).catch(error => console.error(error.message)); return send(res, 201, { reference, status: 'new', ...order }); }
    if (req.method === 'POST' && url.pathname === '/api/newsletter') {
      const body = await readBody(req); const email = String(body.email || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return send(res,400,{error:'invalid_email'});
      subscribeNewsletter(email, body.source);
      return send(res, 201, { ok:true, subscribed:true });
    }
    if (req.method === 'GET' && url.pathname === '/api/admin/newsletter') {
      const owner = requireRole(req, res, 'owner'); if (!owner) return;
      const subscribers = db.prepare('SELECT email,source,created_at,updated_at FROM newsletter_subscribers ORDER BY created_at DESC,email COLLATE NOCASE').all();
      return send(res, 200, { subscribers });
    }
    if (req.method === 'GET' && url.pathname === '/api/orders/lookup') { const ref = String(url.searchParams.get('reference') || '').trim(); if (!/^GZ-[A-Z0-9-]{8,32}$/.test(ref)) return send(res, 400, { error:'invalid_reference' }); const order = db.prepare('SELECT * FROM orders WHERE reference=?').get(ref); if (!order) return send(res, 404, { error:'not_found' }); return send(res, 200, publicOrderView(order)); }
    const user = requireRole(req, res); if (!user) return;
    if (req.method === 'POST' && url.pathname === '/api/admin/users') { const owner = requirePermission(req,res,'manage_staff'); if (!owner) return; const body = await readBody(req); const email = String(body.email || '').trim().toLowerCase(); const password = String(body.password || ''); const role = body.role === 'owner' ? 'owner' : 'admin'; const permissions = role === 'owner' ? permissionsFor({role:'owner'}) : Object.fromEntries(permissionNames.map(name => [name, Boolean(body.permissions?.[name])])); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12) return send(res,400,{error:'invalid_user'}); if (db.prepare('SELECT 1 FROM users WHERE email=?').get(email)) return send(res,409,{error:'duplicate_user'}); const result = db.prepare('INSERT INTO users (email,password_hash,role,permissions_json,created_at) VALUES (?,?,?,?,?)').run(email,passwordHash(password),role,json(permissions),now()); audit(owner,'create','user',result.lastInsertRowid,{email,role,permissions}); return send(res,201,{user:{id:result.lastInsertRowid,email,role,permissions}}); }
    if (req.method === 'GET' && url.pathname === '/api/admin/users') { const owner = requirePermission(req,res,'manage_staff'); if (!owner) return; const users = db.prepare("SELECT id,email,role,permissions_json,created_at FROM users ORDER BY role DESC,created_at").all().map(item => ({...item,permissions:permissionsFor(item)})); return send(res,200,{users}); }
    if (req.method === 'PATCH' && url.pathname.startsWith('/api/admin/users/')) { const owner = requirePermission(req,res,'manage_staff'); if (!owner) return; const id = Number(url.pathname.split('/').pop()); if (id === owner.id) return send(res,400,{error:'cannot_edit_self'}); const target = db.prepare('SELECT * FROM users WHERE id=?').get(id); if (!target) return send(res,404,{error:'employee_not_found'}); const body = await readBody(req); const role = body.role === 'owner' ? 'owner' : 'admin'; const permissions = role === 'owner' ? permissionsFor({role:'owner'}) : Object.fromEntries(permissionNames.map(name => [name, Boolean(body.permissions?.[name])])); db.prepare('UPDATE users SET role=?,permissions_json=? WHERE id=?').run(role,json(permissions),id); audit(owner,'update','user',id,{email:target.email,role,permissions}); return send(res,200,{user:{id,email:target.email,role,permissions}}); }
    if (req.method === 'DELETE' && url.pathname.startsWith('/api/admin/users/')) { const owner = requirePermission(req,res,'manage_staff'); if (!owner) return; const id = Number(url.pathname.split('/').pop()); if (id === owner.id) return send(res,400,{error:'cannot_delete_self'}); const employee = db.prepare('SELECT id,email,role FROM users WHERE id=?').get(id); if (!employee) return send(res,404,{error:'employee_not_found'}); db.prepare('UPDATE audit_log SET user_id=NULL WHERE user_id=?').run(employee.id); db.prepare('DELETE FROM users WHERE id=?').run(employee.id); audit(owner,'delete','user',employee.id,{email:employee.email,role:employee.role}); return send(res,200,{ok:true}); }
    if (req.method === 'GET' && url.pathname === '/api/admin/orders') { const viewer = requirePermission(req,res,'view_orders'); if (!viewer) return; const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all().map(orderView); return send(res, 200, { orders }); }
    if (req.method === 'POST' && url.pathname === '/api/admin/books/prices') {
      const editor = requirePermission(req,res,'edit_catalog'); if (!editor) return;
      const body = await readBody(req); const updates = Array.isArray(body.updates) ? body.updates : [];
      if (!updates.length || updates.length > 5000 || updates.some(item => !item || typeof item.id !== 'string' || !item.id.trim() || !Number.isInteger(item.price) || item.price < 0 || item.price > 100000000) || new Set(updates.map(item => item.id)).size !== updates.length) return send(res,400,{error:'invalid_book_price_updates'});
      const findBook = db.prepare('SELECT id FROM books WHERE id=?');
      if (updates.some(item => !findBook.get(item.id))) return send(res,404,{error:'book_not_found'});
      const stamp = now(); db.exec('BEGIN IMMEDIATE');
      try {
        const updatePrice = db.prepare('UPDATE books SET price=?,updated_at=? WHERE id=?');
        for (const item of updates) updatePrice.run(item.price,stamp,item.id);
        audit(editor,'bulk_price_update','book',null,{updated:updates.length});
        db.exec('COMMIT');
        return send(res,200,{ok:true,updated:updates.length});
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    }
    if (req.method === 'DELETE' && url.pathname === '/api/admin/orders') { const body = await readBody(req); const references = Array.isArray(body.references) ? [...new Set(body.references.map(value => String(value || '').trim()).filter(Boolean))] : []; if (!references.length || references.length > 500 || references.some(reference => !/^GZ-[A-Z0-9-]{8,32}$/.test(reference))) return send(res,400,{error:'invalid_orders'}); const placeholders = references.map(() => '?').join(','); const matches = db.prepare(`SELECT id,reference FROM orders WHERE reference IN (${placeholders})`).all(...references); if (matches.length !== references.length) return send(res,404,{error:'orders_not_found'}); db.exec('BEGIN IMMEDIATE'); try { const release = db.prepare('SELECT * FROM reservations WHERE order_id=? AND released_at IS NULL'); const releaseBook = db.prepare('UPDATE books SET reserved=MAX(0,reserved-?),updated_at=? WHERE id=?'); const remove = db.prepare('DELETE FROM orders WHERE id=?'); for (const order of matches) { for (const item of release.all(order.id)) releaseBook.run(item.qty,now(),item.book_id); remove.run(order.id); audit(user,'delete','order',order.reference,{bulk:true}); } db.exec('COMMIT'); return send(res,200,{ok:true,deleted:matches.length,references:matches.map(order=>order.reference)}); } catch (error) { db.exec('ROLLBACK'); throw error; } }
    if (req.method === 'GET' && url.pathname === '/api/admin/catalog') { const viewer = requirePermission(req,res,'view_catalog'); if (!viewer) return; return send(res, 200, catalogPayload()); }
    if (req.method === 'GET' && url.pathname === '/api/admin/inventory-report') { const viewer = requirePermission(req,res,'view_catalog'); if (!viewer) return; return send(res,200,{books:inventoryReportRows()}); }
    if (req.method === 'GET' && url.pathname === '/api/admin/sales-report') { const viewer = requirePermission(req,res,'view_finance'); if (!viewer) return; try { return send(res,200,salesReportRows(url.searchParams.get('from') || '',url.searchParams.get('to') || '',url.searchParams.get('scope') || 'all')); } catch (error) { return send(res,400,{error:error.message || 'invalid_sales_report_range'}); } }
    if (req.method === 'POST' && url.pathname === '/api/admin/covers') {
      const editor = requirePermission(req,res,'edit_catalog'); if (!editor) return;
      const body = await readBody(req);
      const stored = {};
      // A derivative may be uploaded as a data URL or reference a file that is
      // already stored (used by the cover backfill for small originals).
      const existingCoverPath = value => { const candidate = String(value || ''); return /^\/covers\/[a-f0-9]{64}\.[a-z]+$/.test(candidate) && fs.existsSync(path.join(COVERS_DIR, path.basename(candidate))) ? candidate : ''; };
      const existingCover = String(body.source || '');
      if (body.original || body.thumb || body.display) {
        if (body.original) stored.image = storeCover(decodeCoverData(body.original));
        else if (existingCoverPath(existingCover)) stored.image = existingCoverPath(existingCover);
        if (body.thumb) stored.thumb = existingCoverPath(body.thumb) || storeCover(decodeCoverData(body.thumb));
        if (body.display) stored.display = existingCoverPath(body.display) || storeCover(decodeCoverData(body.display));
        if (!stored.image) return send(res,400,{error:'invalid_cover'});
      } else if (body.dataUrl) stored.image = storeCover(decodeCoverData(body.dataUrl));
      else if (body.url) stored.image = await fetchCoverFile(body.url);
      else return send(res,400,{error:'invalid_cover'});
      return send(res,201, stored);
    }
    if (req.method === 'POST' && url.pathname === '/api/admin/covers/backfill') {
      // Attach pre-generated derivatives to books that predate them without
      // rewriting the whole catalog (which would re-send stock and prices).
      const editor = requirePermission(req,res,'edit_catalog'); if (!editor) return;
      const body = await readBody(req); const items = Array.isArray(body.items) ? body.items : [];
      const derivativePath = value => /^\/covers\/[a-f0-9]{64}\.[a-z]+$/.test(String(value || ''));
      const update = db.prepare('UPDATE books SET thumb=?,display=?,updated_at=? WHERE id=?');
      const stamp = now(); let updated = 0; const skipped = [];
      db.exec('BEGIN IMMEDIATE');
      try {
        for (const item of items) {
          const id = String(item?.id || ''); const thumb = String(item?.thumb || ''); const display = String(item?.display || '');
          if (!id || !derivativePath(thumb) || !derivativePath(display)) { skipped.push(id); continue; }
          if (update.run(thumb, display, stamp, id).changes) updated += 1; else skipped.push(id);
        }
        audit(editor,'backfill','cover',null,{updated,skipped:skipped.length});
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
      return send(res, 200, { ok:true, updated, skipped });
    }
    if (req.method === 'POST' && url.pathname === '/api/admin/covers/cache-remote') {
      const editor = requirePermission(req,res,'edit_catalog'); if (!editor) return;
      const cached = await cacheRemoteCovers();
      return send(res, 200, { ok:true, cached });
    }
    if (req.method === 'POST' && url.pathname === '/api/admin/cache-image') { const viewer = requirePermission(req,res,'edit_catalog'); if (!viewer) return; const body = await readBody(req); const imageUrl = String(body.url || '').trim(); if (!/^https?:\/\//i.test(imageUrl)) return send(res,400,{error:'invalid_image_url'}); const response = await fetch(imageUrl, { redirect:'follow', signal:AbortSignal.timeout(12000), headers:{'user-agent':'Ghazal-Bookstore-Image-Cache/1.0'} }); if (!response.ok) return send(res,422,{error:'image_fetch_failed'}); const contentType = String(response.headers.get('content-type') || '').split(';')[0].toLowerCase(); if (!contentType.startsWith('image/')) return send(res,422,{error:'image_not_image'}); const bytes = new Uint8Array(await response.arrayBuffer()); if (bytes.length > 5 * 1024 * 1024) return send(res,413,{error:'image_too_large'}); return send(res,200,{data:`data:${contentType};base64,${Buffer.from(bytes).toString('base64')}`}); }
    if (req.method === 'PUT' && url.pathname === '/api/admin/catalog') {
      if (!can(user,'edit_catalog')) return send(res,403,{error:'permission_denied',permission:'edit_catalog'});
      const body = await readBody(req); const books = Array.isArray(body.books) ? body.books : []; const publishers = Array.isArray(body.publishers) ? body.publishers : []; const stamp = now();
      db.exec('BEGIN IMMEDIATE'); try {
        const bookUpsert = db.prepare('INSERT INTO books (id,title,author,publisher,category,genre,price,stock,isbn,pages,image,thumb,display,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,author=excluded.author,publisher=excluded.publisher,category=excluded.category,genre=excluded.genre,price=excluded.price,stock=excluded.stock,isbn=excluded.isbn,pages=excluded.pages,image=excluded.image,thumb=COALESCE(excluded.thumb,books.thumb),display=COALESCE(excluded.display,books.display),note=excluded.note,updated_at=excluded.updated_at');
        const findExistingBook = db.prepare('SELECT 1 FROM books WHERE id=?');
        const recordOpeningStock = db.prepare("INSERT INTO restocks (book_id,quantity,reason,user_id,created_at) VALUES (?,?, 'opening_stock',?,?)");
        for (const book of books) { if (!book.id || !book.title || !book.author || !book.publisher) throw new Error('invalid_book'); const id = String(book.id); const existed = Boolean(findExistingBook.get(id)); const stock = Math.max(0,Number(book.stock)||0); const pages = Math.trunc(Number(book.pages)); bookUpsert.run(id,String(book.title),String(book.author),String(book.publisher),String(book.category || 'غير مصنف'),String(book.genre || 'عام'),Math.max(0,Number(book.price)||0),stock,String(book.isbn || ''),Number.isFinite(pages) && pages > 0 ? pages : null,String(book.image || ''),book.thumb ? String(book.thumb) : null,book.display ? String(book.display) : null,String(book.note || book.review || ''),stamp,stamp); if (!existed && stock > 0) recordOpeningStock.run(id,stock,user.id,stamp); }
        // Publishers, authors, categories, and sub-categories are derived from
        // the catalog itself so an uploaded spreadsheet is the single source of
        // truth. Existing descriptions survive when the name is unchanged.
        const dbBooks = db.prepare('SELECT author,publisher,category,genre FROM books').all();
        const derivedPublishers = [...new Set(dbBooks.map(book => String(book.publisher || '').trim()).filter(Boolean))];
        // Keep the publisher directory aligned with the catalog. Empty
        // publishers are removable from the dashboard; deleting them here
        // makes that change durable instead of reappearing on the next load.
        db.prepare('DELETE FROM publishers WHERE name NOT IN (SELECT DISTINCT publisher FROM books)').run();
        const publisherInsert = db.prepare('INSERT OR IGNORE INTO publishers (name,city,description,logo,created_at) VALUES (?,?,?,?,?)');
        derivedPublishers.forEach(name => publisherInsert.run(name,'','إصدارات من هذا الناشر.',name.slice(0,1),stamp));
        const publisherUpsert = db.prepare('INSERT INTO publishers (name,city,description,logo,created_at) VALUES (?,?,?,?,?) ON CONFLICT(name) DO UPDATE SET city=excluded.city,description=excluded.description,logo=excluded.logo');
        for (const publisher of publishers) if (publisher.name) publisherUpsert.run(String(publisher.name),String(publisher.city || ''),String(publisher.description || ''),String(publisher.logo || publisher.name.slice(0,1)),stamp);
        const authorInsert = db.prepare('INSERT INTO authors (name,created_at) VALUES (?,?) ON CONFLICT(name) DO NOTHING');
        [...new Set(dbBooks.map(book => String(book.author || '').trim()).filter(Boolean))].forEach(name => authorInsert.run(name,stamp));
        const storedGenres = contentValue('genres', {});
        const incomingGenres = body.genres && typeof body.genres === 'object' ? body.genres : {};
        const genresPayload = deriveGenres(dbBooks, { ...storedGenres, ...incomingGenres });
        const bookGenresPayload = deriveBookGenres(dbBooks);
        db.prepare('INSERT INTO store_content (key,value_json,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at').run('genres',json(genresPayload),stamp);
        db.prepare('INSERT INTO store_content (key,value_json,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at').run('bookGenres',json(bookGenresPayload),stamp);
        for (const key of ['discounts','featured','authorProfiles','publisherFeatures']) if (body[key] !== undefined) db.prepare('INSERT INTO store_content (key,value_json,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at').run(key,json(body[key]),stamp);
        if (body.homeSections !== undefined) {
          const validBookIds = new Set(db.prepare('SELECT id FROM books').all().map(row => String(row.id)));
          const validCollectionIds = new Set(db.prepare('SELECT id FROM collections').all().map(row => String(row.id)));
          const homeSections = sanitizeHomeSections(body.homeSections, validBookIds, validCollectionIds);
          db.prepare('INSERT INTO store_content (key,value_json,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at').run('homeSections',json(homeSections),stamp);
        }
        audit(user,'update','catalog','store',{books:books.length,publishers:publishers.length}); db.exec('COMMIT'); if (books.some(b => /^https?:\/\//i.test(b?.image || ''))) setTimeout(() => cacheRemoteCovers().catch(() => {}), 100); return send(res,200,catalogPayload());
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    }
    if (req.method === 'GET' && url.pathname === '/api/admin/collections') return send(res, 200, { collections: collectionList(true) });
    if (req.method === 'POST' && url.pathname === '/api/admin/collections') { if (!can(user, 'edit_catalog')) return send(res,403,{error:'permission_denied',permission:'edit_catalog'}); const body = await readBody(req); const title = String(body.title || '').trim(); const slug = String(body.slug || '').trim().toLowerCase(); const bookIds = Array.isArray(body.bookIds) ? [...new Set(body.bookIds.map(String))] : []; if (!title || !/^[a-z0-9-]+$/.test(slug)) return send(res,400,{error:'invalid_collection'}); if (db.prepare('SELECT 1 FROM collections WHERE slug=?').get(slug)) return send(res,409,{error:'duplicate_collection'}); if (bookIds.some(id => !db.prepare('SELECT 1 FROM books WHERE id=?').get(id))) return send(res,400,{error:'invalid_collection_book'}); const id = String(body.id || `collection-${Date.now()}`); const stamp = now(); db.prepare('INSERT INTO collections (id,slug,title,description,active,homepage,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').run(id,slug,title,String(body.description || ''),body.active === false ? 0 : 1,body.homepage === true ? 1 : 0,stamp,stamp); const link = db.prepare('INSERT INTO collection_books (collection_id,book_id,position) VALUES (?,?,?)'); bookIds.forEach((bookId,index) => link.run(id,bookId,index)); audit(user,'create','collection',id,{slug,title,bookIds}); return send(res,201,{collection:collectionList(true).find(item => item.id === id)}); }
    if (req.method === 'PATCH' && url.pathname.startsWith('/api/admin/collections/')) { if (!can(user, 'edit_catalog')) return send(res,403,{error:'permission_denied',permission:'edit_catalog'}); const id = decodeURIComponent(url.pathname.split('/').pop()); const body = await readBody(req); const existing = db.prepare('SELECT * FROM collections WHERE id=?').get(id); if (!existing) return send(res,404,{error:'not_found'}); const title = body.title === undefined ? existing.title : String(body.title || '').trim(); const slug = body.slug === undefined ? existing.slug : String(body.slug || '').trim().toLowerCase(); const description = body.description === undefined ? existing.description : String(body.description || '').trim(); const bookIds = body.bookIds === undefined ? null : (Array.isArray(body.bookIds) ? [...new Set(body.bookIds.map(String))] : []); if (!title || !/^[a-z0-9-]+$/.test(slug)) return send(res,400,{error:'invalid_collection'}); if (db.prepare('SELECT 1 FROM collections WHERE slug=? AND id<>?').get(slug,id)) return send(res,409,{error:'duplicate_collection'}); if (bookIds && bookIds.some(bookId => !db.prepare('SELECT 1 FROM books WHERE id=?').get(bookId))) return send(res,400,{error:'invalid_collection_book'}); const active = body.active === undefined ? existing.active : body.active ? 1 : 0; const homepage = body.homepage === undefined ? existing.homepage : body.homepage ? 1 : 0; db.exec('BEGIN IMMEDIATE'); try { db.prepare('UPDATE collections SET slug=?,title=?,description=?,active=?,homepage=?,updated_at=? WHERE id=?').run(slug,title,description,active,homepage,now(),id); if (bookIds) { db.prepare('DELETE FROM collection_books WHERE collection_id=?').run(id); const link = db.prepare('INSERT INTO collection_books (collection_id,book_id,position) VALUES (?,?,?)'); bookIds.forEach((bookId,index) => link.run(id,bookId,index)); } audit(user,'update','collection',id,{slug,title,bookIds,active,homepage}); db.exec('COMMIT'); } catch (error) { db.exec('ROLLBACK'); throw error; } return send(res,200,{collection:collectionList(true).find(item => item.id === id)}); }
    if (req.method === 'DELETE' && url.pathname.startsWith('/api/admin/collections/')) { if (!can(user, 'edit_catalog')) return send(res,403,{error:'permission_denied',permission:'edit_catalog'}); const id = decodeURIComponent(url.pathname.split('/').pop()); const collection = db.prepare('SELECT id,slug,title FROM collections WHERE id=?').get(id); if (!collection) return send(res,404,{error:'not_found'}); db.exec('BEGIN IMMEDIATE'); try { db.prepare('DELETE FROM collections WHERE id=?').run(id); const sections = contentValue('homeSections', []); if (Array.isArray(sections) && sections.some(section => String(section?.collectionId || '') === id)) { const next = sections.map(section => String(section?.collectionId || '') === id ? { ...section, collectionId:'' } : section); db.prepare('INSERT INTO store_content (key,value_json,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at').run('homeSections',json(next),now()); } audit(user,'delete','collection',id,{slug:collection.slug,title:collection.title}); db.exec('COMMIT'); } catch (error) { db.exec('ROLLBACK'); throw error; } return send(res,200,{ok:true,id}); }
    if (req.method === 'DELETE' && url.pathname.startsWith('/api/admin/books/')) { if (user.role !== 'owner') return send(res,403,{error:'owner_only'}); const bookId = decodeURIComponent(url.pathname.split('/').pop()); const book = db.prepare('SELECT id,title FROM books WHERE id=?').get(bookId); if (!book) return send(res,404,{error:'not_found'}); if (db.prepare('SELECT 1 FROM order_items WHERE book_id=? LIMIT 1').get(bookId)) return send(res,409,{error:'book_has_orders'}); db.exec('BEGIN IMMEDIATE'); try { db.prepare('DELETE FROM collection_books WHERE book_id=?').run(bookId); db.prepare('DELETE FROM reservations WHERE book_id=?').run(bookId); db.prepare('DELETE FROM restocks WHERE book_id=?').run(bookId); db.prepare('DELETE FROM books WHERE id=?').run(bookId); audit(user,'delete','book',bookId,{title:book.title}); db.exec('COMMIT'); return send(res,200,{ok:true}); } catch (error) { db.exec('ROLLBACK'); throw error; } }
    if (req.method === 'DELETE' && url.pathname.startsWith('/api/admin/orders/')) { const reference = decodeURIComponent(url.pathname.split('/').pop()); const order = db.prepare('SELECT * FROM orders WHERE reference=?').get(reference); if (!order) return send(res,404,{error:'not_found'}); db.exec('BEGIN IMMEDIATE'); try { for (const item of db.prepare('SELECT * FROM reservations WHERE order_id=? AND released_at IS NULL').all(order.id)) db.prepare('UPDATE books SET reserved=MAX(0,reserved-?),updated_at=? WHERE id=?').run(item.qty,now(),item.book_id); db.prepare('DELETE FROM orders WHERE id=?').run(order.id); audit(user,'delete','order',reference,{}); db.exec('COMMIT'); return send(res,200,{ok:true}); } catch (error) { db.exec('ROLLBACK'); throw error; } }
    if (req.method === 'PATCH' && url.pathname.startsWith('/api/admin/orders/')) { if (!can(user,'update_orders')) return send(res,403,{error:'permission_denied',permission:'update_orders'}); const reference = decodeURIComponent(url.pathname.split('/').pop()); const body = await readBody(req); transitionOrder(reference, body.status, body.notes, user); return send(res,200,{ok:true, order:orderView(db.prepare('SELECT * FROM orders WHERE reference=?').get(reference))}); }
    if (req.method === 'POST' && /\/api\/admin\/orders\/[^/]+\/coupon$/.test(url.pathname)) {
      if (!can(user,'update_orders')) return send(res,403,{error:'permission_denied',permission:'update_orders'});
      const parts=url.pathname.split('/'), reference=decodeURIComponent(parts[parts.length-2]), body=await readBody(req), code=String(body.code||'').trim().toUpperCase();
      const order=db.prepare('SELECT * FROM orders WHERE reference=?').get(reference); if(!order) return send(res,404,{error:'not_found'});
      if (!code) {
        const total=Math.max(0,Number(order.subtotal)+Number(order.delivery)+Number(order.total_adjustment||0));
        db.prepare("UPDATE orders SET discount=0,coupon_code='',total=?,updated_at=? WHERE id=?").run(total,now(),order.id);
        audit(user,'remove_coupon','order',reference,{});
        return send(res,200,{ok:true,order:orderView(db.prepare('SELECT * FROM orders WHERE id=?').get(order.id))});
      }
      const configured=contentValue('discounts',[]).find(item=>item.active!==false&&String(item.code||'').trim().toUpperCase()===code);
      if(!configured) return send(res,422,{error:'invalid_discount_code'});
      const items=db.prepare('SELECT book_id id,title,qty,unit_price FROM order_items WHERE order_id=?').all(order.id);
      const discount=items.reduce((sum,item)=>sum+discountAmount({id:item.id,price:Number(item.unit_price)},code)*Number(item.qty),0);
      if(discount<=0) return send(res,422,{error:'coupon_not_applicable'});
      const finalDiscount=Math.min(discount,Number(order.subtotal));
      db.prepare('UPDATE orders SET discount=?,coupon_code=?,total=?,updated_at=? WHERE id=?').run(finalDiscount,code,Math.max(0,Number(order.subtotal)-finalDiscount+Number(order.delivery)+Number(order.total_adjustment||0)),now(),order.id);
      audit(user,'apply_coupon','order',reference,{code,discount});
      return send(res,200,{ok:true,order:orderView(db.prepare('SELECT * FROM orders WHERE id=?').get(order.id))});
    }
    if (req.method === 'PUT' && url.pathname.startsWith('/api/admin/orders/')) {
      if (!can(user,'update_orders')) return send(res,403,{error:'permission_denied',permission:'update_orders'});
      const reference=decodeURIComponent(url.pathname.split('/').pop()), body=await readBody(req);
      const order=db.prepare('SELECT * FROM orders WHERE reference=?').get(reference); if(!order) return send(res,404,{error:'not_found'});
      const customer=parse(order.customer_json), fields=body.customer||{};
      if (!/^0[5-7]\d{8}$/.test(String(fields.phone||''))) return send(res,400,{error:'invalid_phone'});
      const wilayaCode=Number(fields.wilayaCode), communeId=Number(fields.communeId);
      const commune=communes.find(item=>item.wilaya_code===String(wilayaCode).padStart(2,'0')&&Number(item.id)===communeId);
      if(!commune||!deliveryRates[wilayaCode]) return send(res,400,{error:'invalid_shipping'});
      if(!Array.isArray(body.items)||!body.items.length||body.items.some(item=>!item.id||!Number.isInteger(item.qty)||item.qty<1||item.qty>100||(item.unit_price!==undefined&&(!Number.isInteger(item.unit_price)||item.unit_price<0||item.unit_price>100000000)))||new Set(body.items.map(item=>String(item.id))).size!==body.items.length) return send(res,400,{error:'invalid_items'});
      if(body.total!==undefined&&(!Number.isInteger(body.total)||body.total<0||body.total>1000000000))return send(res,400,{error:'invalid_total'});
      if(order.status==='returned') return send(res,409,{error:'returned_order_items_locked'});
      db.exec('BEGIN IMMEDIATE'); try {
        const existing=db.prepare('SELECT * FROM order_items WHERE order_id=?').all(order.id), requested=new Map(body.items.map(item=>[String(item.id),item]));
        const existingIds=new Set(existing.map(item=>String(item.book_id))), stamp=now(), inventorySettled=['confirmed','preparing','shipped','delivered'].includes(order.status);
        for(const old of existing){const reservation=db.prepare('SELECT * FROM reservations WHERE order_id=? AND book_id=?').get(order.id,old.book_id),requestedItem=requested.get(String(old.book_id));const next=requestedItem?.qty||0, delta=next-Number(old.qty), settled=Boolean(reservation?.settled_at)||(!reservation&&inventorySettled); if(settled&&delta!==0){const book=db.prepare('SELECT stock,reserved FROM books WHERE id=?').get(old.book_id);if(delta>0){const available=Math.max(0,Number(book.stock)-Number(book.reserved));if(delta>available)throw new Error(`insufficient_stock:${old.book_id}`);db.prepare('UPDATE books SET stock=stock-?,updated_at=? WHERE id=?').run(delta,stamp,old.book_id);}else db.prepare('UPDATE books SET stock=stock+?,updated_at=? WHERE id=?').run(-delta,stamp,old.book_id);}
          else if(reservation&&!reservation.settled_at&&!reservation.released_at&&delta!==0){const book=db.prepare('SELECT stock,reserved FROM books WHERE id=?').get(old.book_id);if(delta>0&&delta>Math.max(0,Number(book.stock)-Number(book.reserved)))throw new Error(`insufficient_stock:${old.book_id}`);db.prepare('UPDATE books SET reserved=MAX(0,reserved+?),updated_at=? WHERE id=?').run(delta,stamp,old.book_id);}
          if(reservation&&settled)db.prepare('UPDATE reservations SET qty=?,settled_at=COALESCE(settled_at,?) WHERE order_id=? AND book_id=?').run(next,stamp,order.id,old.book_id);
          else if(reservation&&!reservation.released_at)db.prepare('UPDATE reservations SET qty=? WHERE order_id=? AND book_id=?').run(next,order.id,old.book_id);
          if(next) db.prepare('UPDATE order_items SET qty=?,unit_price=? WHERE order_id=? AND book_id=?').run(next,Number(requestedItem.unit_price??old.unit_price),order.id,old.book_id); else db.prepare('DELETE FROM order_items WHERE order_id=? AND book_id=?').run(order.id,old.book_id);
        }
        for(const [bookId,item] of requested){if(existingIds.has(bookId))continue;const book=db.prepare('SELECT id,title,price,stock,reserved FROM books WHERE id=?').get(bookId);if(!book)throw new Error('invalid_order_book');if(inventorySettled){const available=Math.max(0,Number(book.stock)-Number(book.reserved));if(item.qty>available)throw new Error(`insufficient_stock:${bookId}`);db.prepare('UPDATE books SET stock=stock-?,updated_at=? WHERE id=?').run(item.qty,stamp,bookId);db.prepare('INSERT INTO reservations (order_id,book_id,qty,settled_at) VALUES (?,?,?,?)').run(order.id,bookId,item.qty,stamp);}db.prepare('INSERT INTO order_items (order_id,book_id,title,qty,unit_price) VALUES (?,?,?,?,?)').run(order.id,bookId,book.title,item.qty,Number(item.unit_price??book.price));}
        const updatedItems=db.prepare('SELECT book_id id,qty,unit_price FROM order_items WHERE order_id=?').all(order.id);
        const subtotal=updatedItems.reduce((sum,item)=>sum+Number(item.qty)*Number(item.unit_price),0);
        const discount=order.coupon_code ? updatedItems.reduce((sum,item)=>sum+discountAmount({id:item.id,price:Number(item.unit_price)},order.coupon_code)*Number(item.qty),0) : Number(order.discount||0);
        const shipmentType=body.shipmentType===undefined?(customer.shipmentType||order.shipment_type):String(body.shipmentType);
        if(!['home','office'].includes(shipmentType))throw new Error('invalid_shipment_type');
        if(shipmentType==='office'&&!hasStopDesk(wilayaCode,commune))throw new Error('stop_desk_unavailable');
        const delivery=deliveryRates[wilayaCode][shipmentType]; Object.assign(customer,fields,{wilayaCode,wilaya:fields.wilaya,communeId,commune:commune.commune_name_ascii,communeArabic:commune.commune_name,city:commune.commune_name_ascii,shipmentType,price:delivery});
        const finalDiscount=Math.min(discount,subtotal);
        const totalAdjustment=body.total===undefined?Number(order.total_adjustment||0):Number(body.total)-(subtotal-finalDiscount+delivery);
        const finalTotal=Math.max(0,subtotal-finalDiscount+delivery+totalAdjustment);
        db.prepare('UPDATE orders SET customer_json=?,subtotal=?,discount=?,delivery=?,shipment_type=?,total_adjustment=?,total=?,updated_at=? WHERE id=?').run(json(customer),subtotal,finalDiscount,delivery,shipmentType,totalAdjustment,finalTotal,now(),order.id);
        audit(user,'update','order',reference,{items:body.items,customer:fields,total:body.total});db.exec('COMMIT');
      } catch(error){db.exec('ROLLBACK');throw error;}
      return send(res,200,{ok:true,order:orderView(db.prepare('SELECT * FROM orders WHERE id=?').get(order.id))});
    }
    if (req.method === 'POST' && url.pathname === '/api/admin/restock') { if (!can(user,'edit_inventory')) return send(res,403,{error:'permission_denied',permission:'edit_inventory'}); const body = await readBody(req); const quantity = Number(body.quantity); if (!body.bookId || !Number.isInteger(quantity) || quantity < 1) return send(res,400,{error:'invalid_restock'}); const book = db.prepare('SELECT id FROM books WHERE id=?').get(body.bookId); if (!book) return send(res,404,{error:'not_found'}); db.prepare('UPDATE books SET stock=stock+?,updated_at=? WHERE id=?').run(quantity,now(),body.bookId); db.prepare('INSERT INTO restocks (book_id,quantity,reason,user_id,created_at) VALUES (?,?,?,?,?)').run(body.bookId,quantity,String(body.reason || 'restock'),user.id,now()); audit(user,'restock','book',body.bookId,{quantity,reason:body.reason}); return send(res,200,{ok:true}); }
    if (req.method === 'POST' && url.pathname === '/api/admin/restock-bulk') {
      if (!can(user,'edit_inventory')) return send(res,403,{error:'permission_denied',permission:'edit_inventory'});
      const body = await readBody(req), mode = body.mode, updates = Array.isArray(body.updates) ? body.updates : [];
      if (!['add','set'].includes(mode) || !updates.length || updates.length > 5000 || updates.some(item => !item || typeof item.id !== 'string' || !item.id.trim() || !Number.isInteger(item.quantity) || item.quantity < 0 || item.quantity > (mode === 'add' ? 1000000 : 1000000000) || (mode === 'add' && item.quantity < 1)) || new Set(updates.map(item => item.id)).size !== updates.length) return send(res,400,{error:'invalid_bulk_restock'});
      const stamp = now(); db.exec('BEGIN IMMEDIATE');
      try {
        const selectBook = db.prepare('SELECT id,stock,reserved FROM books WHERE id=?');
        const current = updates.map(item => ({ ...item, book:selectBook.get(item.id) }));
        if (current.some(item => !item.book)) { db.exec('ROLLBACK'); return send(res,404,{error:'book_not_found'}); }
        if (mode === 'set' && current.some(item => item.quantity < Number(item.book.reserved))) { db.exec('ROLLBACK'); return send(res,409,{error:'stock_below_reserved'}); }
        if (current.some(item => (mode === 'add' ? Number(item.book.stock) + item.quantity : item.quantity) > 1000000000)) { db.exec('ROLLBACK'); return send(res,400,{error:'invalid_bulk_restock'}); }
        const setStock = db.prepare('UPDATE books SET stock=?,updated_at=? WHERE id=?');
        const addStock = db.prepare('UPDATE books SET stock=stock+?,updated_at=? WHERE id=?');
        const movement = db.prepare('INSERT INTO restocks (book_id,quantity,reason,user_id,created_at) VALUES (?,?,?,?,?)');
        for (const item of current) {
          if (mode === 'add') { addStock.run(item.quantity,stamp,item.id); movement.run(item.id,item.quantity,'supplier_purchase',user.id,stamp); }
          else { const delta = item.quantity - Number(item.book.stock); if (delta) { setStock.run(item.quantity,stamp,item.id); movement.run(item.id,delta,'stock_adjustment',user.id,stamp); } }
        }
        audit(user,'bulk_restock','book',null,{mode,count:current.length,quantity:current.reduce((sum,item)=>sum+(mode==='add'?item.quantity:Math.abs(item.quantity-Number(item.book.stock))),0)});
        db.exec('COMMIT');
        return send(res,200,{ok:true,updated:current.length,mode});
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    }
    if (req.method === 'POST' && url.pathname === '/api/admin/exports') { if (user.role !== 'owner') return send(res,403,{error:'owner_only'}); const body = await readBody(req); if (!body.fingerprint || !Array.isArray(body.references) || !body.filename) return send(res,400,{error:'invalid_export'}); const notConfirmed = body.references.filter(reference => { const order = db.prepare('SELECT status FROM orders WHERE reference=?').get(reference); return !order || order.status !== 'confirmed'; }); if (notConfirmed.length) return send(res,409,{error:'unconfirmed_orders',references:notConfirmed}); const existing = db.prepare('SELECT id,filename,created_at FROM exports WHERE fingerprint=?').get(body.fingerprint); if (existing) return send(res,409,{error:'duplicate_export',export:existing}); db.prepare('INSERT INTO exports (fingerprint,order_refs_json,filename,user_id,created_at) VALUES (?,?,?,?,?)').run(body.fingerprint,json(body.references),body.filename,user.id,now()); audit(user,'export','orders',body.fingerprint,{references:body.references,filename:body.filename}); return send(res,201,{ok:true}); }
    if (req.method === 'GET' && url.pathname === '/api/admin/exports') return send(res,200,{exports:db.prepare('SELECT * FROM exports ORDER BY created_at DESC LIMIT 100').all()});
    if (req.method === 'GET' && url.pathname === '/api/admin/conversions') { if (user.role !== 'owner') return send(res,403,{error:'owner_only'}); return send(res,200,{events:db.prepare('SELECT * FROM conversion_events ORDER BY created_at DESC LIMIT 100').all()}); }
    if (req.method === 'GET' && url.pathname === '/api/admin/diagnostics') { if (user.role !== 'owner') return send(res,403,{error:'owner_only'}); return send(res,200,{ok:true,integrations:{metaCapiConfigured:Boolean(process.env.META_PIXEL_ID && process.env.META_ACCESS_TOKEN),telegramConfigured:Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)},counts:{orders:db.prepare('SELECT COUNT(*) count FROM orders').get().count,conversionEvents:db.prepare('SELECT COUNT(*) count FROM conversion_events').get().count,errors:db.prepare('SELECT COUNT(*) count FROM error_log').get().count,lowStock:db.prepare('SELECT COUNT(*) count FROM books WHERE stock-reserved <= 3').get().count},recentErrors:db.prepare('SELECT source,message,created_at FROM error_log ORDER BY created_at DESC LIMIT 20').all()}); }
    if (req.method === 'GET' && url.pathname === '/api/admin/audit') { if (!can(user,'view_history')) return send(res,403,{error:'permission_denied',permission:'view_history'}); return send(res,200,{events:db.prepare('SELECT audit_log.*,users.email FROM audit_log LEFT JOIN users ON users.id=audit_log.user_id ORDER BY audit_log.created_at DESC LIMIT 500').all()}); }
    if (req.method === 'GET' && url.pathname === '/api/admin/analytics') { if (!can(user,'view_finance')) return send(res,403,{error:'permission_denied',permission:'view_finance'}); const orders = db.prepare('SELECT status,total,created_at FROM orders').all(); const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); const weeklyBooksSold = db.prepare("SELECT book_id id,title,SUM(qty) quantity FROM order_items JOIN orders ON orders.id=order_items.order_id WHERE orders.status='confirmed' AND orders.created_at >= ? GROUP BY book_id,title ORDER BY quantity DESC").all(weekStart); const allTimeBooksSold = db.prepare("SELECT book_id id,title,SUM(qty) quantity FROM order_items JOIN orders ON orders.id=order_items.order_id WHERE orders.status='confirmed' GROUP BY book_id,title ORDER BY quantity DESC").all(); const weeklyAllBooksSold = db.prepare("SELECT book_id id,title,SUM(qty) quantity FROM order_items JOIN orders ON orders.id=order_items.order_id WHERE orders.status NOT IN ('cancelled','returned') AND orders.created_at >= ? GROUP BY book_id,title ORDER BY quantity DESC").all(weekStart); const allTimeAllBooksSold = db.prepare("SELECT book_id id,title,SUM(qty) quantity FROM order_items JOIN orders ON orders.id=order_items.order_id WHERE orders.status NOT IN ('cancelled','returned') GROUP BY book_id,title ORDER BY quantity DESC").all(); const booksSold = weeklyBooksSold.length ? weeklyBooksSold : allTimeBooksSold; const allBooksSold = weeklyAllBooksSold.length ? weeklyAllBooksSold : allTimeAllBooksSold; return send(res,200,{orders,booksSold,allBooksSold,booksSoldWindow:weeklyBooksSold.length ? 'weekly' : 'all-time',allBooksSoldWindow:weeklyAllBooksSold.length ? 'weekly' : 'all-time',lowStock:db.prepare('SELECT id,title,author,publisher,stock,reserved,stock-reserved available FROM books WHERE stock-reserved <= 3 ORDER BY available').all(),newsletterSubscribers:db.prepare('SELECT COUNT(*) count FROM newsletter_subscribers').get().count}); }
    return send(res,404,{error:'not_found'});
  } catch (error) { logError('api',error,{method:req.method,path:url.pathname}); const status = error.message === 'invalid_json' ? 400 : error.message.startsWith('insufficient_stock') ? 409 : 422; return send(res,status,{error:error.message}); }
}

const staticServer = http.createServer(async (req,res) => {
  if (process.env.FORCE_HTTPS === 'true' && req.headers['x-forwarded-proto'] !== 'https') { const host = String(req.headers.host || '').replace(/:\d+$/, ''); res.writeHead(301, { location:`https://${host}${req.url}` }); return res.end(); }
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`); if (url.pathname.startsWith('/api/')) return api(req,res,url);
  if (url.pathname.startsWith('/covers/')) {
    const name = url.pathname.slice('/covers/'.length);
    const type = coverTypes[name.split('.').pop()];
    const filePath = path.join(COVERS_DIR, name);
    if (!type || !/^[a-f0-9]{64}\.[a-z]+$/.test(name) || !fs.existsSync(filePath)) { res.writeHead(404, { 'content-type':'text/plain; charset=utf-8', 'x-content-type-options':'nosniff' }); return res.end('Not found'); }
    res.writeHead(200, { 'content-type':type, 'cache-control':'public, max-age=31536000, immutable', 'x-content-type-options':'nosniff', 'referrer-policy':'strict-origin-when-cross-origin' });
    return fs.createReadStream(filePath).pipe(res);
  }
  let filePath = path.normalize(path.join(ROOT, url.pathname === '/' ? 'index.html' : url.pathname)); if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) filePath = path.join(ROOT,'index.html');
  const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.xml':'application/xml; charset=utf-8', '.txt':'text/plain; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.gif':'image/gif', '.avif':'image/avif', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
  const isAsset = /\.(?:css|js|png|jpg|jpeg|webp|svg|ico|xlsx)$/i.test(filePath);
  const versionedAsset = isAsset && url.searchParams.has('v');
  const stat = fs.statSync(filePath);
  const compressible = /\.(?:html|js|css|json|xml|txt|svg)$/i.test(filePath);
  const useGzip = compressible && stat.size > 1024 && /(?:^|,)\s*gzip(?:\s*;\s*q=(?!0(?:\.0*)?\s*(?:,|$))[\d.]+)?\s*(?:,|$)/i.test(String(req.headers['accept-encoding'] || ''));
  const etag = `W/\"${stat.size.toString(16)}-${Math.trunc(stat.mtimeMs).toString(16)}\"`;
  const requestEtags = String(req.headers['if-none-match'] || '').split(',').map(value => value.trim());
  const notModified = req.headers['if-none-match'] ? requestEtags.includes('*') || requestEtags.includes(etag) : Boolean(req.headers['if-modified-since'] && Date.parse(req.headers['if-modified-since']) >= Math.floor(stat.mtimeMs / 1000) * 1000);
  const headers = { 'content-type':types[path.extname(filePath)] || 'application/octet-stream', 'x-content-type-options':'nosniff', 'x-frame-options':'DENY', 'referrer-policy':'strict-origin-when-cross-origin', 'permissions-policy':'camera=(), microphone=(), geolocation=()', 'cache-control':versionedAsset ? 'public, max-age=31536000, immutable' : isAsset ? 'public, max-age=86400' : 'no-cache', etag, 'last-modified':stat.mtime.toUTCString(), ...(compressible ? { vary:'Accept-Encoding' } : {}), ...(useGzip ? { 'content-encoding':'gzip' } : {}) };
  if (notModified) { res.writeHead(304, headers); return res.end(); }
  res.writeHead(200, headers);
  const source = fs.createReadStream(filePath);
  return useGzip ? source.pipe(zlib.createGzip({ level:zlib.constants.Z_BEST_SPEED })).pipe(res) : source.pipe(res);
});
if (require.main === module) staticServer.listen(Number(process.env.PORT || 3000), () => console.log(`Ghazal listening on http://localhost:${process.env.PORT || 3000}`));
module.exports = { db, server:staticServer, createOrder, transitionOrder, passwordHash, sendMetaPurchase, subscribeNewsletter, orderView, permissionsFor, can, catalogPayload, inventoryReportRows, salesReportRows, seedOpeningStockLedger, migrateEmbeddedCovers, repairCorruptedText, repairCorruptedTextOnce, syncPublisherFeatureDesigns, cacheRemoteCovers, storeCover, sanitizeHomeSections, HOME_SECTION_PLACEMENTS, COVERS_DIR };
