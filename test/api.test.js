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
const { db, server, createOrder, transitionOrder, passwordHash, sendMetaPurchase, subscribeNewsletter, orderView, permissionsFor, can, catalogPayload, migrateEmbeddedCovers, COVERS_DIR } = require('../server');

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
  assert.deepEqual(catalogPayload().bookGenres, ['أدب · رسائل','أدب الأطفال','الأدب العالمي','الأدب العربي','الاقتصاد','التاريخ','التربية','التنمية الذاتية','الدين والفكر الإسلامي','الرحلات','الرواية','السياسة','السيرة الذاتية','الشعر','العلوم','الفلسفة','الفنون','القصص القصيرة','المسرح','رواية · تاريخ','رواية · فلسفة','رواية مترجمة','سيرة · تاريخ','علم · إنسانيات','علم الاجتماع','علم النفس','فكر · إنسانيات','فكر · علم نفس','فكر · نقد ثقافي','فلسفة · كلاسيكيات']);
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
