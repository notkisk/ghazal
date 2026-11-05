const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghazal-api-'));
process.env.GHAZAL_DATA_DIR = dataDir;
process.env.GHAZAL_ADMIN_PASSWORD = 'secret';
const { db, server, createOrder, transitionOrder, passwordHash, sendMetaPurchase, subscribeNewsletter, orderView, permissionsFor, can, catalogPayload, migrateEmbeddedCovers, repairCorruptedText, syncPublisherFeatureDesigns, COVERS_DIR } = require('../server');

// The production catalog now starts empty and is rebuilt from spreadsheets, so
// the test suite seeds its own deterministic fixtures after the server boots.
const fixtureBooks = [
  ['stranger','الغريب','ألبير كامو','منشورات الجمل','literature','رواية مترجمة',1900],
  ['world-yesterday','عالم الأمس','شتيفان تسفايغ','دار المدى','history','سيرة · تاريخ',2600],
  ['meaning','الإنسان يبحث عن معنى','فيكتور فرانكل','آكيول','thought','فكر · علم نفس',2200],
  ['orientalism','الاستشراق','إدوارد سعيد','دار الآداب','history','فكر · نقد ثقافي',3900],
  ['meditations','التأملات','ماركوس أوريليوس','طبعة عربية','thought','فلسفة · كلاسيكيات',2100],
  ['solitude','مئة عام من العزلة','غابرييل غارسيا ماركيز','دار التنوير','literature','رواية مترجمة',3200],
  ['letters','رسائل إلى شاعر شاب','راينر ماريا ريلكه','دار الكرمة','literature','أدب · رسائل',1500],
  ['sophies-world','عالم صوفي','جوستاين غاردر','دار المنى','thought','رواية · فلسفة',3600],
  ['plague','الطاعون','ألبير كامو','دار التنوير','literature','رواية مترجمة',2400],
  ['name-of-rose','اسم الوردة','أمبرتو إيكو','دار الكتاب الجديد','literature','رواية · تاريخ',3200],
  ['art-of-loving','فن الحب','إريك فروم','طبعة عربية','thought','فكر · إنسانيات',1800],
  ['brief-time','تاريخ موجز للزمان','ستيفن هوكينغ','دار التنوير','history','علم · إنسانيات',2900]
];
{
  const stamp = new Date().toISOString();
  const insert = db.prepare('INSERT INTO books (id,title,author,publisher,category,genre,price,stock,image,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
  for (const book of fixtureBooks) insert.run(...book, 10, '', 'كتاب اختبار.', stamp, stamp);
}

const PNG_BYTES = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const PNG_DATA_URL = `data:image/png;base64,${PNG_BYTES.toString('base64')}`;
async function listen() { await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); return `http://127.0.0.1:${server.address().port}`; }
async function closeServer() { await new Promise(resolve => server.close(resolve)); }
async function ownerToken(base) {
  const response = await fetch(`${base}/api/auth/login`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ email:'owner@alghazal.local', password:'secret' }) });
  return (await response.json()).token;
}

test.after(() => fs.rmSync(dataDir, { recursive:true, force:true }));

test('catalog is seeded and orders reserve stock transactionally', () => {
  assert.equal(db.prepare('SELECT COUNT(*) n FROM books').get().n, 12);
  assert.deepEqual(catalogPayload().bookGenres, [...new Set(fixtureBooks.map(book => book[5]))].sort((a, b) => a.localeCompare(b, 'ar')));
  const reference = createOrder({ customer:{customer:'اختبار الغزال',phone:'0555555555'}, items:[{id:'stranger',qty:2}], shipping:{type:'home',wilayaCode:16,wilaya:'Alger',commune:'Alger Centre',price:600} });
  assert.match(reference, /^GZ-/);
  const book = db.prepare('SELECT stock,reserved,stock-reserved available FROM books WHERE id=?').get('stranger');
  assert.equal(book.available, 8);
  assert.equal(db.prepare('SELECT status FROM orders WHERE reference=?').get(reference).status, 'new');
});

test('insufficient stock is rejected without a partial reservation', () => {
  assert.throws(() => createOrder({ customer:{customer:'اختبار الغزال',phone:'0555555555'}, items:[{id:'stranger',qty:99}], shipping:{type:'home',wilayaCode:16,commune:'Alger Centre',price:600} }), /insufficient_stock/);
  assert.equal(db.prepare('SELECT reserved FROM books WHERE id=?').get('stranger').reserved, 2);
});

test('checkout rejects a commune that is not in the selected wilaya', () => {
  assert.throws(() => createOrder({ customer:{customer:'اختبار العنوان',phone:'0555555555'}, items:[{id:'stranger',qty:1}], shipping:{type:'home',wilayaCode:16,commune:'Commune inexistante',price:600} }), /invalid_commune/);
});

test('checkout accepts the canonical commune id from the selector', () => {
  const commune = require('../data/algeria-communes-58-wilayas.json').find(item => item.wilaya_code === '16');
  const reference = createOrder({ customer:{customer:'اختبار المعرّف',phone:'0555555555'}, items:[{id:'brief-time',qty:1}], shipping:{type:'home',wilayaCode:16,communeId:commune.id,commune:commune.commune_name_ascii,price:600} });
  assert.match(reference, /^GZ-/);
});

test('checkout accepts an order without a delivery address and derives one for Ecotrack', () => {
  const reference = createOrder({ customer:{customer:'اختبار العنوان الاختياري',phone:'0555555555'}, items:[{id:'plague',qty:1}], shipping:{type:'home',wilayaCode:16,commune:'Alger Centre',price:600} });
  assert.match(reference, /^GZ-/);
  const view = orderView(db.prepare('SELECT * FROM orders WHERE reference=?').get(reference));
  assert.match(view.ecotrackRow['adresse de livraison*'], /Alger Centre/);
});

test('checkout ignores client shipping prices and applies database discounts', () => {
  db.prepare('UPDATE store_content SET value_json=?,updated_at=? WHERE key=?').run(JSON.stringify([{ id:'test-discount', name:'اختبار', code:'READ10', type:'percent', value:10, appliesToAll:true, active:true }]), new Date().toISOString(), 'discounts');
  const reference = createOrder({ customer:{customer:'اختبار السعر',phone:'0555555555'}, items:[{id:'name-of-rose',qty:1}], discountCode:'read10', shipping:{type:'home',wilayaCode:16,commune:'Alger Centre',price:0} });
  const order = db.prepare('SELECT subtotal,discount,delivery,total FROM orders WHERE reference=?').get(reference);
  assert.deepEqual({ ...order }, { subtotal:3200, discount:320, delivery:600, total:3480 });
});

test('stock reservations reject a competing order after available stock is consumed', () => {
  createOrder({ customer:{customer:'اختبار التزامن 1',phone:'0555555555'}, items:[{id:'art-of-loving',qty:8}], shipping:{type:'office',wilayaCode:16,commune:'Alger Centre',price:0} });
  assert.throws(() => createOrder({ customer:{customer:'اختبار التزامن 2',phone:'0555555555'}, items:[{id:'art-of-loving',qty:3}], shipping:{type:'office',wilayaCode:16,commune:'Alger Centre',price:9999} }), /insufficient_stock/);
});

test('newsletter subscriptions are normalized and idempotent in SQLite', () => {
  assert.equal(subscribeNewsletter(' Reader@Example.COM '), 'reader@example.com');
  assert.equal(subscribeNewsletter('reader@example.com'), 'reader@example.com');
  assert.equal(db.prepare('SELECT COUNT(*) n FROM newsletter_subscribers WHERE email=?').get('reader@example.com').n, 1);
  assert.throws(() => subscribeNewsletter('not-an-email'), /invalid_email/);
});

test('newsletter API persists subscriptions and exposes the list to owners only', async () => {
  const base = await listen(); const token = await ownerToken(base);
  const subscribed = await fetch(`${base}/api/newsletter`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ email:'Dashboard.Reader@example.com' }) });
  assert.equal(subscribed.status, 201);
  const listed = await fetch(`${base}/api/admin/newsletter`, { headers:{ authorization:`Bearer ${token}` } });
  assert.equal(listed.status, 200);
  const payload = await listed.json();
  assert.ok(payload.subscribers.some(item => item.email === 'dashboard.reader@example.com'));
  const denied = await fetch(`${base}/api/admin/newsletter`);
  assert.equal(denied.status, 401);
  await closeServer();
});

test('permissions separate owner access from limited staff access', () => {
  const staff = { role:'admin', permissions_json:JSON.stringify({ view_orders:true, update_orders:false }) };
  assert.equal(can(staff, 'view_orders'), true);
  assert.equal(can(staff, 'update_orders'), false);
  assert.equal(can({ role:'owner' }, 'manage_staff'), true);
  assert.equal(Object.values(permissionsFor({ role:'owner' })).every(Boolean), true);
});

test('orders expose the Ecotrack row required by the exporter', () => {
  const reference = createOrder({ customer:{customer:'اختبار التصدير',phone:'0555555555'}, items:[{id:'sophies-world',qty:1}], shipping:{type:'office',wilayaCode:16,commune:'Alger Centre',price:0} });
  const order = db.prepare('SELECT * FROM orders WHERE reference=?').get(reference);
  const view = orderView(order);
  assert.equal(view.ecotrackRow['reference commande'], reference);
  assert.equal(view.ecotrackRow['telephone*'], '0555555555');
  assert.equal(view.ecotrackRow['STOP DESK\n( si oui mettez OUI sinon laissez vide )'], 'OUI');
});

test('password hashes are salted and do not contain the plaintext', () => {
  const stored = passwordHash('secret');
  assert.notEqual(stored, 'secret');
  assert.equal(stored.includes('secret'), false);
});

test('confirmation settles reservations and returns restore physical stock once', () => {
  const reference = createOrder({ customer:{customer:'اختبار المخزون',phone:'0666666666'}, items:[{id:'meaning',qty:3},{id:'meaning',qty:2}], shipping:{type:'home',wilayaCode:16,commune:'Alger Centre',price:600} });
  assert.equal(db.prepare('SELECT stock FROM books WHERE id=?').get('meaning').stock, 10);
  assert.equal(db.prepare('SELECT reserved FROM books WHERE id=?').get('meaning').reserved, 5);
  transitionOrder(reference, 'confirmed', 'تم التأكيد', { id: 1 });
  assert.equal(db.prepare('SELECT stock FROM books WHERE id=?').get('meaning').stock, 5);
  assert.equal(db.prepare('SELECT reserved FROM books WHERE id=?').get('meaning').reserved, 0);
  transitionOrder(reference, 'shipped', '', { id: 1 });
  transitionOrder(reference, 'delivered', '', { id: 1 });
  transitionOrder(reference, 'returned', 'إرجاع', { id: 1 });
  assert.equal(db.prepare('SELECT stock FROM books WHERE id=?').get('meaning').stock, 10);
  assert.equal(db.prepare('SELECT reserved FROM books WHERE id=?').get('meaning').reserved, 0);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM restocks WHERE book_id='meaning' AND reason='customer_return'").get().n, 1);
});

test('cancelling an unconfirmed order releases reservation without reducing stock', () => {
  const reference = createOrder({ customer:{customer:'اختبار الإلغاء',phone:'0777777777'}, items:[{id:'letters',qty:2}], shipping:{type:'office',wilayaCode:16,commune:'Alger Centre',price:300} });
  transitionOrder(reference, 'cancelled', 'لا حاجة', { id: 1 });
  assert.equal(db.prepare('SELECT stock FROM books WHERE id=?').get('letters').stock, 10);
  assert.equal(db.prepare('SELECT reserved FROM books WHERE id=?').get('letters').reserved, 0);
});

test('Meta Purchase conversion is sent once and duplicate event ids are suppressed', async () => {
  process.env.META_PIXEL_ID = 'pixel-test';
  process.env.META_ACCESS_TOKEN = 'token-test';
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => { calls += 1; return new Response(JSON.stringify({ events_received:1 }), { status:200, headers:{'content-type':'application/json'} }); };
  const body = { metaEventId:'meta-event-once', customer:{ phone:'0555555555' } };
  const request = { headers:{ host:'test.local', 'user-agent':'test-agent' } };
  await Promise.all([sendMetaPurchase(body,'GZ-TEST-ONCE',1900,[{id:'stranger'}],request), sendMetaPurchase(body,'GZ-TEST-ONCE',1900,[{id:'stranger'}],request)]);
  assert.equal(calls, 1);
  const logged = db.prepare('SELECT event_id,status FROM conversion_events WHERE event_id=?').get('meta-event-once');
  assert.equal(logged.event_id, 'meta-event-once');
  assert.equal(logged.status, 'sent');
  await sendMetaPurchase(body,'GZ-TEST-ONCE',1900,[{id:'stranger'}],request);
  assert.equal(calls, 1);
  global.fetch = originalFetch;
  delete process.env.META_PIXEL_ID;
  delete process.env.META_ACCESS_TOKEN;
});

test('catalog sync stores the optional page count without requiring it', async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const login = await fetch(`${base}/api/auth/login`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ email:'owner@alghazal.local', password:'secret' }) });
    const { token } = await login.json();
    const withPages = { id:'pages-test', title:'كتاب الصفحات', author:'كاتب', publisher:'ناشر', price:1500, stock:2, pages:312, image:'meaning.jpg' };
    const withoutPages = { id:'no-pages-test', title:'كتاب بلا صفحات', author:'كاتب', publisher:'ناشر', price:900, stock:1, image:'meaning.jpg' };
    const response = await fetch(`${base}/api/admin/catalog`, { method:'PUT', headers:{'content-type':'application/json', authorization:`Bearer ${token}`}, body:JSON.stringify({ books:[withPages, withoutPages] }) });
    assert.equal(response.status, 200);
    const saved = catalogPayload().books;
    assert.equal(saved.find(book => book.id === 'pages-test').pages, 312);
    assert.equal(saved.find(book => book.id === 'no-pages-test').pages, null);
  } finally {
    db.prepare('DELETE FROM books WHERE id IN (?,?)').run('pages-test', 'no-pages-test');
    await new Promise(resolve => server.close(resolve));
  }
});

test('request bodies split inside a multi-byte character keep the Arabic text intact', async () => {
  const base = await listen();
  const id = 'utf8-split-test';
  try {
    const token = await ownerToken(base);
    const note = 'يبحث في أسباب التعاسة والسعادة ليعيش حياة أكثر رضًا.';
    const body = Buffer.from(JSON.stringify({ books:[{ id, title:'كتاب الحروف', author:'كاتب', publisher:'ناشر', price:1000, stock:1, note }] }));
    const marker = Buffer.from('أكثر');
    const at = body.indexOf(marker);
    assert.ok(at > 0);
    // Split between the two bytes of "ث" so each chunk contains an incomplete
    // UTF-8 sequence, which used to become two U+FFFD replacement characters.
    const cut = at + 5;
    const response = await new Promise((resolve, reject) => {
      const request = http.request(`${base}/api/admin/catalog`, { method:'PUT', headers:{ 'content-type':'application/json', authorization:`Bearer ${token}`, 'content-length':body.length } }, res => {
        const chunks = []; res.on('data', chunk => chunks.push(chunk)); res.on('end', () => resolve({ status:res.statusCode, body:Buffer.concat(chunks).toString('utf8') }));
      });
      request.on('error', reject);
      request.write(body.subarray(0, cut));
      setTimeout(() => request.end(body.subarray(cut)), 25);
    });
    assert.equal(response.status, 200);
    assert.equal(catalogPayload().books.find(book => book.id === id).note, note);
  } finally {
    db.prepare('DELETE FROM books WHERE id=?').run(id);
    await closeServer();
  }
});

test('cover upload stores a deduplicated file and serves it immutably', async () => {
  const base = await listen();
  try {
    const authorization = `Bearer ${await ownerToken(base)}`;
    const upload = await fetch(`${base}/api/admin/covers`, { method:'POST', headers:{'content-type':'application/json', authorization}, body:JSON.stringify({ dataUrl: PNG_DATA_URL }) });
    assert.equal(upload.status, 201);
    const stored = await upload.json();
    assert.match(stored.image, /^\/covers\/[a-f0-9]{64}\.png$/);
    const filePath = path.join(COVERS_DIR, path.basename(stored.image));
    assert.ok(fs.existsSync(filePath));
    assert.deepEqual(fs.readFileSync(filePath), PNG_BYTES);
    const duplicate = await fetch(`${base}/api/admin/covers`, { method:'POST', headers:{'content-type':'application/json', authorization}, body:JSON.stringify({ dataUrl: PNG_DATA_URL }) });
    assert.equal((await duplicate.json()).image, stored.image);
    const served = await fetch(`${base}${stored.image}`);
    assert.equal(served.status, 200);
    assert.equal(served.headers.get('content-type'), 'image/png');
    assert.match(served.headers.get('cache-control'), /immutable/);
    assert.deepEqual(Buffer.from(await served.arrayBuffer()), PNG_BYTES);
    const missing = await fetch(`${base}/covers/${'0'.repeat(64)}.png`);
    assert.equal(missing.status, 404);
    const invalid = await fetch(`${base}/api/admin/covers`, { method:'POST', headers:{'content-type':'application/json', authorization}, body:JSON.stringify({ dataUrl: 'data:image/png;base64,bm90LWFuLWltYWdl' }) });
    assert.equal(invalid.status, 422);
    const derived = await fetch(`${base}/api/admin/covers`, { method:'POST', headers:{'content-type':'application/json', authorization}, body:JSON.stringify({ source: stored.image, thumb: PNG_DATA_URL, display: PNG_DATA_URL }) });
    assert.equal(derived.status, 201);
    const variants = await derived.json();
    assert.equal(variants.image, stored.image);
    assert.match(variants.thumb, /^\/covers\/[a-f0-9]{64}\.png$/);
    const unsafe = await fetch(`${base}/api/admin/covers`, { method:'POST', headers:{'content-type':'application/json', authorization}, body:JSON.stringify({ source: '/covers/../../server.js', thumb: PNG_DATA_URL }) });
    assert.equal(unsafe.status, 400);
  } finally { await closeServer(); }
});

test('cover endpoint downloads remote images on the server', async () => {
  const remote = http.createServer((req, res) => { res.writeHead(200, { 'content-type':'image/png', 'content-length':PNG_BYTES.length }); res.end(PNG_BYTES); });
  await new Promise(resolve => remote.listen(0, '127.0.0.1', resolve));
  const remoteUrl = `http://127.0.0.1:${remote.address().port}/cover.png`;
  const base = await listen();
  try {
    const authorization = `Bearer ${await ownerToken(base)}`;
    const response = await fetch(`${base}/api/admin/covers`, { method:'POST', headers:{'content-type':'application/json', authorization}, body:JSON.stringify({ url: remoteUrl }) });
    assert.equal(response.status, 201);
    const stored = await response.json();
    assert.match(stored.image, /^\/covers\/[a-f0-9]{64}\.png$/);
    assert.ok(fs.existsSync(path.join(COVERS_DIR, path.basename(stored.image))));
  } finally {
    await closeServer();
    await new Promise(resolve => remote.close(resolve));
  }
});

test('embedded data-url covers migrate to files exactly once', () => {
  const id = 'cover-migration-test';
  const stamp = new Date().toISOString();
  db.prepare('INSERT INTO books (id,title,author,publisher,category,genre,price,stock,image,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(id, 'كتاب الترحيل', 'كاتب', 'ناشر', 'literature', 'رواية', 1000, 1, PNG_DATA_URL, stamp, stamp);
  assert.ok(migrateEmbeddedCovers() >= 1);
  const row = db.prepare('SELECT image,thumb,display FROM books WHERE id=?').get(id);
  assert.match(row.image, /^\/covers\/[a-f0-9]{64}\.png$/);
  assert.equal(row.thumb, null);
  assert.equal(row.display, null);
  assert.ok(fs.existsSync(path.join(COVERS_DIR, path.basename(row.image))));
  assert.equal(migrateEmbeddedCovers(), 0);
  db.prepare('DELETE FROM books WHERE id=?').run(id);
});

test('startup text repair restores words corrupted by split UTF-8 chunks', () => {
  const stamp = new Date().toISOString();
  const insert = db.prepare('INSERT INTO books (id,title,author,publisher,category,genre,price,stock,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
  insert.run('repair-good', 'كتاب سليم', 'كاتب', 'ناشر', 'literature', 'رواية', 1000, 1, 'كتاب أكثر من رائع.', stamp, stamp);
  insert.run('repair-bad', 'كتاب تالف', 'كاتب', 'ناشر', 'literature', 'رواية', 1000, 1, 'حياة أك\uFFFD\uFFFDر رضًا.', stamp, stamp);
  try {
    assert.ok(repairCorruptedText() >= 1);
    assert.equal(db.prepare('SELECT note FROM books WHERE id=?').get('repair-bad').note, 'حياة أكثر رضًا.');
  } finally {
    db.prepare('DELETE FROM books WHERE id IN (?,?)').run('repair-good', 'repair-bad');
  }
});

test('text repair merges duplicate publisher and author names without losing books', () => {
  const stamp = new Date().toISOString();
  const canonicalPublisher = 'دار النشر العربية';
  const duplicatePublisher = 'دار النشر الع\uFFFD\uFFFDبية';
  const canonicalAuthor = 'كاتب معروف';
  const duplicateAuthor = 'كاتب مع\uFFFD\uFFFDوف';
  db.prepare('INSERT INTO publishers (name,city,description,logo,created_at) VALUES (?,?,?,?,?)').run(canonicalPublisher, '', '', 'د', stamp);
  db.prepare('INSERT INTO publishers (name,city,description,logo,created_at) VALUES (?,?,?,?,?)').run(duplicatePublisher, 'الجزائر', 'وصف الدار', 'د', stamp);
  db.prepare('INSERT INTO authors (name,bio,photo,created_at) VALUES (?,?,?,?)').run(canonicalAuthor, '', null, stamp);
  db.prepare('INSERT INTO authors (name,bio,photo,created_at) VALUES (?,?,?,?)').run(duplicateAuthor, 'سيرة الكاتب', null, stamp);
  db.prepare('INSERT INTO books (id,title,author,publisher,category,genre,price,stock,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run('repair-merge', 'كتاب الدمج', duplicateAuthor, duplicatePublisher, 'literature', 'رواية', 1000, 1, '', stamp, stamp);
  try {
    assert.ok(repairCorruptedText() >= 1);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM publishers WHERE name=?').get(canonicalPublisher).n, 1);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM publishers WHERE name=?').get(duplicatePublisher).n, 0);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM authors WHERE name=?').get(canonicalAuthor).n, 1);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM authors WHERE name=?').get(duplicateAuthor).n, 0);
    const publisher = db.prepare('SELECT city,description FROM publishers WHERE name=?').get(canonicalPublisher);
    assert.equal(publisher.city, 'الجزائر');
    assert.equal(publisher.description, 'وصف الدار');
    const author = db.prepare('SELECT bio FROM authors WHERE name=?').get(canonicalAuthor);
    assert.equal(author.bio, 'سيرة الكاتب');
    const book = db.prepare('SELECT author,publisher FROM books WHERE id=?').get('repair-merge');
    assert.deepEqual({ ...book }, { author: canonicalAuthor, publisher: canonicalPublisher });
    assert.equal(repairCorruptedText(), 0);
  } finally {
    db.prepare('DELETE FROM books WHERE id=?').run('repair-merge');
    db.prepare('DELETE FROM publishers WHERE name=?').run(canonicalPublisher);
    db.prepare('DELETE FROM authors WHERE name=?').run(canonicalAuthor);
  }
});

test('publisher feature designs are restored without overwriting custom values', () => {
  const stamp = new Date().toISOString();
  const original = db.prepare("SELECT value_json FROM store_content WHERE key='publisherFeatures'").get();
  const originalMarker = db.prepare("SELECT value_json FROM store_content WHERE key='publisherFeaturesDesign'").get();
  const write = value => db.prepare("INSERT INTO store_content (key,value_json,updated_at) VALUES ('publisherFeatures',?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at").run(JSON.stringify(value), stamp);
  const genericJamal = { id:'jamal', publisher:'منشورات الجمل', active:true, mark:'م', slogan:'', kicker:'إصدارات مختارة', description:'اكتشف كتب هذه الدار من رفوف الغزال.', accent:'#8f5e3b', surface:'#eee2ce', ink:'#1b1915' };
  const customNetwork = { id:'arab-network', publisher:'الشبكة العربية للأبحاث والنشر', active:false, mark:'ش', slogan:'شعار خاص', kicker:'نص خاص', description:'وصف خاص', accent:'#123456', surface:'#abcdef', ink:'#111111' };
  write([genericJamal, customNetwork]);
  db.prepare("DELETE FROM store_content WHERE key='publisherFeaturesDesign'").run();
  try {
    assert.ok(syncPublisherFeatureDesigns() >= 1);
    const features = JSON.parse(db.prepare("SELECT value_json FROM store_content WHERE key='publisherFeatures'").get().value_json);
    const jamal = features.find(feature => feature.publisher === 'منشورات الجمل');
    assert.equal(jamal.id, 'jamal');
    assert.equal(jamal.slogan, 'أصواتٌ من العالم');
    assert.equal(jamal.kicker, 'أصواتٌ لا تشبه سواها');
    assert.equal(jamal.mark, 'ج');
    assert.equal(jamal.accent, '#bd1d2d');
    assert.match(jamal.logo, /assets\/publishers\/al-jamal\.png$/);
    const network = features.find(feature => feature.publisher === 'الشبكة العربية للأبحاث والنشر');
    assert.equal(network.slogan, 'شعار خاص');
    assert.equal(network.kicker, 'نص خاص');
    assert.equal(network.description, 'وصف خاص');
    assert.equal(network.accent, '#123456');
    assert.equal(network.active, false);
    assert.match(network.logo, /assets\/publishers\/arab-network\.png$/);
    assert.ok(features.some(feature => feature.id === 'mada' && feature.logo === 'assets/publishers/al-mada.png'));
    assert.ok(features.some(feature => feature.id === 'rafidain' && feature.logo === 'assets/publishers/al-rafidain.png'));
    assert.equal(syncPublisherFeatureDesigns(), 0);
  } finally {
    if (original) write(JSON.parse(original.value_json));
    else db.prepare("DELETE FROM store_content WHERE key='publisherFeatures'").run();
    if (originalMarker) db.prepare("INSERT INTO store_content (key,value_json,updated_at) VALUES ('publisherFeaturesDesign',?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at").run(originalMarker.value_json, stamp);
    else db.prepare("DELETE FROM store_content WHERE key='publisherFeaturesDesign'").run();
  }
});

test('catalog sync stores cover paths without embedded image data', async () => {
  const base = await listen();
  const id = 'cover-path-test';
  try {
    const authorization = `Bearer ${await ownerToken(base)}`;
    const stored = await (await fetch(`${base}/api/admin/covers`, { method:'POST', headers:{'content-type':'application/json', authorization}, body:JSON.stringify({ dataUrl: PNG_DATA_URL }) })).json();
    const book = { id, title:'كتاب الأغلفة', author:'كاتب', publisher:'ناشر', price:1200, stock:3, image:stored.image, thumb:stored.image, display:stored.image };
    const sync = await fetch(`${base}/api/admin/catalog`, { method:'PUT', headers:{'content-type':'application/json', authorization}, body:JSON.stringify({ books:[book] }) });
    assert.equal(sync.status, 200);
    const payloadText = await (await fetch(`${base}/api/catalog`)).text();
    assert.ok(!payloadText.includes('data:image'));
    const saved = catalogPayload().books.find(item => item.id === id);
    assert.equal(saved.image, stored.image);
    assert.equal(saved.thumb, stored.image);
    assert.equal(saved.display, stored.image);
    const withoutVariants = { ...book, thumb: undefined, display: undefined };
    await fetch(`${base}/api/admin/catalog`, { method:'PUT', headers:{'content-type':'application/json', authorization}, body:JSON.stringify({ books:[withoutVariants] }) });
    const kept = catalogPayload().books.find(item => item.id === id);
    assert.equal(kept.thumb, stored.image);
    assert.equal(kept.display, stored.image);
  } finally {
    db.prepare('DELETE FROM books WHERE id=?').run(id);
    await closeServer();
  }
});

test('catalog sync derives publishers, authors, categories, and subcategories from books', async () => {
  const base = await listen();
  const book = { id:'derived-test', title:'كتاب مشتق', author:'مؤلف جديد', publisher:'ناشر جديد', price:1000, stock:2, category:'تصنيف جديد', genre:'نوع جديد', image:'' };
  try {
    const authorization = `Bearer ${await ownerToken(base)}`;
    const response = await fetch(`${base}/api/admin/catalog`, { method:'PUT', headers:{'content-type':'application/json', authorization}, body:JSON.stringify({ books:[book] }) });
    assert.equal(response.status, 200);
    assert.ok(db.prepare('SELECT 1 FROM publishers WHERE name=?').get('ناشر جديد'));
    assert.ok(db.prepare('SELECT 1 FROM authors WHERE name=?').get('مؤلف جديد'));
    const payload = catalogPayload();
    assert.equal(payload.genres['تصنيف جديد'].title, 'تصنيف جديد');
    assert.ok(payload.bookGenres.includes('نوع جديد'));
  } finally {
    db.prepare('DELETE FROM books WHERE id=?').run('derived-test');
    await closeServer();
  }
});

test('catalog sync persists and sanitizes custom home sections', async () => {
  const base = await listen();
  const stamp = new Date().toISOString();
  const original = db.prepare("SELECT value_json FROM store_content WHERE key='homeSections'").get();
  db.prepare('INSERT INTO collections (id,slug,title,description,active,homepage,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').run('section-test-collection', 'section-test-collection', 'مجموعة الاختبار', '', 1, 0, stamp, stamp);
  try {
    const authorization = `Bearer ${await ownerToken(base)}`;
    const response = await fetch(`${base}/api/admin/catalog`, {
      method:'PUT',
      headers:{ 'content-type':'application/json', authorization },
      body:JSON.stringify({ homeSections:[
        { id:'section-books', title:'رفّ الاختبار', description:'وصف القسم', type:'books', bookIds:['stranger','missing-book','stranger'], placement:'after-new', active:true },
        { id:'section-collection', title:'مجموعة الاختبار', type:'collection', collectionId:'section-test-collection', bookIds:['meaning'], placement:'not-a-place', active:false },
        { id:'section-missing-collection', title:'مجموعة مفقودة', type:'collection', collectionId:'missing-collection', placement:'end', active:true },
        { id:'section-empty-title', title:'   ', type:'books', bookIds:['meaning'] },
        { id:'section-books', title:'معرّف مكرر', type:'books', bookIds:['meaning'] }
      ] })
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.homeSections.length, 3);
    assert.deepEqual(payload.homeSections[0], { id:'section-books', title:'رفّ الاختبار', description:'وصف القسم', type:'books', collectionId:'', bookIds:['stranger'], placement:'after-new', active:true });
    assert.deepEqual(payload.homeSections[1], { id:'section-collection', title:'مجموعة الاختبار', description:'', type:'collection', collectionId:'section-test-collection', bookIds:[], placement:'after-shelves', active:false });
    assert.equal(payload.homeSections[2].collectionId, '');
    assert.deepEqual(catalogPayload().homeSections, payload.homeSections);
    const publicCatalog = await (await fetch(`${base}/api/catalog`)).json();
    assert.deepEqual(publicCatalog.homeSections, payload.homeSections);
    const stored = JSON.parse(db.prepare("SELECT value_json FROM store_content WHERE key='homeSections'").get().value_json);
    assert.deepEqual(stored, payload.homeSections);
  } finally {
    db.prepare('DELETE FROM collections WHERE id=?').run('section-test-collection');
    if (original) db.prepare("UPDATE store_content SET value_json=?,updated_at=? WHERE key='homeSections'").run(original.value_json, stamp);
    else db.prepare("DELETE FROM store_content WHERE key='homeSections'").run();
    await closeServer();
  }
});

test('catalog responses are gzipped for clients that accept it', async () => {
  const base = await listen();
  try {
    const compressed = await new Promise((resolve, reject) => {
      const request = http.get(`${base}/api/catalog`, { headers:{ 'accept-encoding':'gzip' } }, response => {
        assert.equal(response.headers['content-encoding'], 'gzip');
        const chunks = [];
        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
      });
      request.on('error', reject);
    });
    const payload = JSON.parse(zlib.gunzipSync(compressed).toString('utf8'));
    assert.ok(payload.books.length >= 12);
  } finally { await closeServer(); }
});
