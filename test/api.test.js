const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghazal-api-'));
process.env.GHAZAL_DATA_DIR = dataDir;
process.env.GHAZAL_ADMIN_PASSWORD = 'secret';
const { db, createOrder, transitionOrder, passwordHash, sendMetaPurchase, subscribeNewsletter, orderView, permissionsFor, can, catalogPayload } = require('../server');

test.after(() => fs.rmSync(dataDir, { recursive:true, force:true }));

test('catalog is seeded and orders reserve stock transactionally', () => {
  assert.equal(db.prepare('SELECT COUNT(*) n FROM books').get().n, 12);
  assert.deepEqual(catalogPayload().bookGenres, ['أدب · رسائل','أدب الأطفال','الأدب العالمي','الأدب العربي','الاقتصاد','التاريخ','التربية','التنمية الذاتية','الدين والفكر الإسلامي','الرحلات','الرواية','السياسة','السيرة الذاتية','الشعر','العلوم','الفلسفة','الفنون','القصص القصيرة','المسرح','رواية · تاريخ','رواية · فلسفة','رواية مترجمة','سيرة · تاريخ','علم · إنسانيات','علم الاجتماع','علم النفس','فكر · إنسانيات','فكر · علم نفس','فكر · نقد ثقافي','فلسفة · كلاسيكيات']);
  const reference = createOrder({ customer:{customer:'اختبار الغزال',phone:'0555555555'}, items:[{id:'stranger',qty:2}], shipping:{type:'home',wilayaCode:16,wilaya:'Alger',commune:'Alger Centre',address:'شارع الاختبار 1',price:600} });
  assert.match(reference, /^GZ-/);
  const book = db.prepare('SELECT stock,reserved,stock-reserved available FROM books WHERE id=?').get('stranger');
  assert.equal(book.available, 8);
  assert.equal(db.prepare('SELECT status FROM orders WHERE reference=?').get(reference).status, 'new');
});

test('insufficient stock is rejected without a partial reservation', () => {
  assert.throws(() => createOrder({ customer:{customer:'اختبار الغزال',phone:'0555555555'}, items:[{id:'stranger',qty:99}], shipping:{type:'home',wilayaCode:16,commune:'Alger Centre',address:'شارع الاختبار 1',price:600} }), /insufficient_stock/);
  assert.equal(db.prepare('SELECT reserved FROM books WHERE id=?').get('stranger').reserved, 2);
});

test('checkout rejects a commune that is not in the selected wilaya', () => {
  assert.throws(() => createOrder({ customer:{customer:'اختبار العنوان',phone:'0555555555'}, items:[{id:'stranger',qty:1}], shipping:{type:'home',wilayaCode:16,commune:'Commune inexistante',address:'شارع الاختبار 3',price:600} }), /invalid_commune/);
});

test('checkout accepts the canonical commune id from the selector', () => {
  const commune = require('../data/algeria-communes-58-wilayas.json').find(item => item.wilaya_code === '16');
  const reference = createOrder({ customer:{customer:'اختبار المعرّف',phone:'0555555555'}, items:[{id:'brief-time',qty:1}], shipping:{type:'home',wilayaCode:16,communeId:commune.id,commune:commune.commune_name_ascii,address:'شارع الاختبار 4',price:600} });
  assert.match(reference, /^GZ-/);
});

test('checkout accepts an order without a delivery address', () => {
  const reference = createOrder({ customer:{customer:'اختبار العنوان الاختياري',phone:'0555555555'}, items:[{id:'plague',qty:1}], shipping:{type:'home',wilayaCode:16,commune:'Alger Centre',price:600} });
  assert.match(reference, /^GZ-/);
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
  const reference = createOrder({ customer:{customer:'اختبار المخزون',phone:'0666666666'}, items:[{id:'meaning',qty:3},{id:'meaning',qty:2}], shipping:{type:'home',wilayaCode:16,commune:'Alger Centre',address:'شارع الاختبار 2',price:600} });
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
  const reference = createOrder({ customer:{customer:'اختبار الإلغاء',phone:'0777777777'}, items:[{id:'letters',qty:2}], shipping:{type:'office',wilayaCode:16,commune:'Alger Centre',address:'مكتب الاختبار',price:300} });
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
