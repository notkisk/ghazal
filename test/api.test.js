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
const { db, server, createOrder, transitionOrder, passwordHash, sendMetaPurchase, subscribeNewsletter, orderView, permissionsFor, can, catalogPayload, inventoryReportRows, salesReportRows, migrateEmbeddedCovers, repairCorruptedText, syncPublisherFeatureDesigns, COVERS_DIR } = require('../server');

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
let ownerTokenCache = null;
async function ownerToken(base) {
  // Logins are rate limited to 10 per IP per 15 minutes, so reuse one session
  // across the suite instead of burning a slot per test.
  if (ownerTokenCache) return ownerTokenCache;
  const response = await fetch(`${base}/api/auth/login`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ email:'owner@alghazal.local', password:'secret' }) });
  ownerTokenCache = (await response.json()).token;
  return ownerTokenCache;
}

test.after(() => fs.rmSync(dataDir, { recursive:true, force:true }));

test('catalog is seeded and pending orders defer stock settlement', () => {
  assert.equal(db.prepare('SELECT COUNT(*) n FROM books').get().n, 12);
  assert.deepEqual(catalogPayload().bookGenres, [...new Set(fixtureBooks.map(book => book[5]))].sort((a, b) => a.localeCompare(b, 'ar')));
  const reference = createOrder({ customer:{customer:'اختبار الغزال',phone:'0555555555'}, items:[{id:'stranger',qty:2}], shipping:{type:'home',wilayaCode:16,wilaya:'Alger',commune:'Alger Centre',price:600} });
  assert.match(reference, /^GZ-/);
  const book = db.prepare('SELECT stock,reserved,stock-reserved available FROM books WHERE id=?').get('stranger');
  assert.deepEqual({ stock:book.stock, reserved:book.reserved, available:book.available }, { stock:10, reserved:0, available:10 });
  assert.equal(db.prepare('SELECT status FROM orders WHERE reference=?').get(reference).status, 'new');
});

test('pending orders can exceed current stock and do not reserve it', () => {
  const reference=createOrder({ customer:{customer:'اختبار الغزال',phone:'0555555555'}, items:[{id:'stranger',qty:99}], shipping:{type:'home',wilayaCode:16,commune:'Alger Centre',price:600} });
  assert.equal(db.prepare('SELECT qty FROM order_items WHERE order_id=(SELECT id FROM orders WHERE reference=?)').get(reference).qty,99);
  assert.equal(db.prepare('SELECT reserved FROM books WHERE id=?').get('stranger').reserved,0);
});

test('checkout rejects a commune that is not in the selected wilaya', () => {
  assert.throws(() => createOrder({ customer:{customer:'اختبار العنوان',phone:'0555555555'}, items:[{id:'stranger',qty:1}], shipping:{type:'home',wilayaCode:16,commune:'Commune inexistante',price:600} }), /invalid_commune/);
});

test('checkout accepts the canonical commune id from the selector', () => {
  const commune = require('../data/algeria-communes-58-wilayas.json').find(item => item.wilaya_code === '16');
  const reference = createOrder({ customer:{customer:'اختبار المعرّف',phone:'0555555555'}, items:[{id:'brief-time',qty:1}], shipping:{type:'home',wilayaCode:16,communeId:commune.id,commune:commune.commune_name_ascii,price:600} });
  assert.match(reference, /^GZ-/);
});

test('admin order edits persist added books and custom unit prices in totals', async () => {
  const reference=createOrder({ customer:{customer:'تعديل الطلب',phone:'0555555555'},items:[{id:'stranger',qty:1}],shipping:{type:'home',wilayaCode:16,commune:'Alger Centre'} });
  const base=await listen(), token=await ownerToken(base), commune=require('../data/algeria-communes-58-wilayas.json').find(item=>item.wilaya_code==='16');
  try {
  const response=await fetch(`${base}/api/admin/orders/${encodeURIComponent(reference)}`,{method:'PUT',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify({customer:{customer:'تعديل الطلب',phone:'0555555555',address:'',wilayaCode:16,wilaya:'Alger',communeId:commune.id},items:[{id:'stranger',qty:1,unit_price:2450},{id:'world-yesterday',qty:2,unit_price:1700}]})});
  assert.equal(response.status,200);
  const {order}=await response.json();
  assert.equal(order.subtotal,5850);
  assert.equal(order.total,6450);
  assert.deepEqual(order.items.map(item=>[item.id,item.qty,item.unit_price]).sort(),[['stranger',1,2450],['world-yesterday',2,1700]].sort());
  db.prepare('UPDATE store_content SET value_json=?,updated_at=? WHERE key=?').run(JSON.stringify([{id:'test-order-coupon',name:'اختبار',code:'READ10',type:'percent',value:10,appliesToAll:true,active:true}]),new Date().toISOString(),'discounts');
  const applied=await fetch(`${base}/api/admin/orders/${encodeURIComponent(reference)}/coupon`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify({code:'READ10'})});
  assert.equal((await applied.json()).order.discount,585);
  const removed=await fetch(`${base}/api/admin/orders/${encodeURIComponent(reference)}/coupon`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify({code:''})});
  const cleared=(await removed.json()).order;
  assert.equal(cleared.discount,0);
  assert.equal(cleared.coupon_code,'');
  assert.equal(cleared.total,6450);
  } finally {
    db.prepare('DELETE FROM orders WHERE reference=?').run(reference);
    await closeServer();
  }
});

test('bulk price updates change only existing book prices', async () => {
  const base=await listen(), token=await ownerToken(base);
  try {
    const response=await fetch(`${base}/api/admin/books/prices`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify({updates:[{id:'stranger',price:2450},{id:'world-yesterday',price:3100}]})});
    assert.equal(response.status,200);
    assert.deepEqual(await response.json(),{ok:true,updated:2});
    assert.deepEqual(db.prepare('SELECT id,price,stock,reserved FROM books WHERE id IN (?,?) ORDER BY id').all('stranger','world-yesterday').map(book=>[book.id,book.price,book.stock,book.reserved]),[
      ['stranger',2450,10,0],
      ['world-yesterday',3100,10,0]
    ]);
  } finally {
    db.prepare('UPDATE books SET price=1900 WHERE id=?').run('stranger');
    db.prepare('UPDATE books SET price=2600 WHERE id=?').run('world-yesterday');
    await closeServer();
  }
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

test('competing pending orders settle against available stock when confirmed', () => {
  const first=createOrder({ customer:{customer:'اختبار التزامن 1',phone:'0555555555'}, items:[{id:'art-of-loving',qty:8}], shipping:{type:'office',wilayaCode:16,commune:'Alger Centre',price:0} });
  const second=createOrder({ customer:{customer:'اختبار التزامن 2',phone:'0555555555'}, items:[{id:'art-of-loving',qty:3}], shipping:{type:'office',wilayaCode:16,commune:'Alger Centre',price:9999} });
  transitionOrder(first,'confirmed','',{id:1});
  transitionOrder(second,'confirmed','',{id:1});
  assert.equal(db.prepare('SELECT stock FROM books WHERE id=?').get('art-of-loving').stock,0);
  assert.equal(db.prepare("SELECT qty FROM order_items WHERE order_id=(SELECT id FROM orders WHERE reference=?) AND book_id='art-of-loving'").get(second).qty,2);
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
  assert.equal(db.prepare('SELECT reserved FROM books WHERE id=?').get('meaning').reserved, 0);
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
    db.prepare('DELETE FROM restocks WHERE book_id IN (?,?)').run('pages-test','no-pages-test');
    db.prepare('DELETE FROM books WHERE id IN (?,?)').run('pages-test', 'no-pages-test');
    await new Promise(resolve => server.close(resolve));
  }
});

test('inventory report keeps bought copies stable when catalog stock is changed and counts completed sales', async () => {
  const base = await listen();
  const token = await ownerToken(base);
  const id = `inventory-ledger-${Date.now()}`;
  const headers = { 'content-type':'application/json', authorization:`Bearer ${token}` };
  const book = { id, title:'كتاب سجل المخزون', author:'كاتب السجل', publisher:'دار الاختبار', category:'literature', genre:'رواية', price:1200, stock:8, image:'' };
  let reference = '';
  try {
    const firstSync = await fetch(`${base}/api/admin/catalog`, { method:'PUT', headers, body:JSON.stringify({ books:[book] }) });
    assert.equal(firstSync.status, 200);
    assert.equal(db.prepare("SELECT SUM(quantity) quantity FROM restocks WHERE book_id=? AND reason<>'customer_return'").get(id).quantity, 8);

    reference = createOrder({ customer:{customer:'اختبار المخزون',phone:'0555555555'}, items:[{id,qty:2}], shipping:{type:'office',wilayaCode:16,commune:'Alger Centre',price:9999} });
    transitionOrder(reference, 'confirmed', '', null);

    const changedStockSync = await fetch(`${base}/api/admin/catalog`, { method:'PUT', headers, body:JSON.stringify({ books:[{ ...book, stock:20 }] }) });
    assert.equal(changedStockSync.status, 200);
    const response = await fetch(`${base}/api/admin/inventory-report`, { headers:{ authorization:`Bearer ${token}` } });
    assert.equal(response.status, 200);
    const report = (await response.json()).books.find(item => item.id === id);
    assert.deepEqual([report.purchased,report.sold,report.stock,report.reserved,report.available], [8,2,20,0,20]);
    assert.equal(inventoryReportRows().find(item => item.id === id).purchased, 8);

    const receipt = await fetch(`${base}/api/admin/restock`, { method:'POST', headers, body:JSON.stringify({ bookId:id, quantity:5, reason:'supplier_purchase' }) });
    assert.equal(receipt.status, 200);
    const afterReceipt = inventoryReportRows().find(item => item.id === id);
    assert.deepEqual([afterReceipt.purchased,afterReceipt.sold,afterReceipt.stock,afterReceipt.available], [13,2,25,25]);
  } finally {
    if (reference) db.prepare('DELETE FROM orders WHERE reference=?').run(reference);
    db.prepare("DELETE FROM audit_log WHERE entity='book' AND entity_id=? AND action='restock'").run(id);
    db.prepare('DELETE FROM restocks WHERE book_id=?').run(id);
    db.prepare('DELETE FROM books WHERE id=?').run(id);
    db.prepare("DELETE FROM publishers WHERE name='دار الاختبار' AND NOT EXISTS (SELECT 1 FROM books WHERE publisher='دار الاختبار')").run();
    await closeServer();
  }
});

test('sales report returns a date-bounded order sheet and item details with shipment totals', async () => {
  const base = await listen();
  const token = await ownerToken(base);
  const id = `sales-report-book-${Date.now()}`;
  const stamp = new Date().toISOString();
  db.prepare('INSERT INTO books (id,title,author,publisher,category,genre,price,stock,image,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(id,'كتاب تقرير المبيعات','كاتب التقرير','دار الاختبار','literature','رواية',1300,20,'','',stamp,stamp);
  const today = '2001-02-03';
  const yesterday = '2001-02-02';
  const references = [];
  try {
    const makeOrder = name => createOrder({ customer:{customer:name,phone:'0555555555'}, items:[{id,qty:2}], shipping:{type:'office',wilayaCode:16,commune:'Alger Centre',price:0} });
    const included = makeOrder('طلب ضمن الفترة'); references.push(included);
    const cancelled = makeOrder('طلب ملغى'); references.push(cancelled); transitionOrder(cancelled,'cancelled','',null);
    const outside = makeOrder('طلب خارج الفترة'); references.push(outside);
    db.prepare('UPDATE orders SET created_at=? WHERE reference=?').run(`${today}T12:00:00.000Z`,included);
    db.prepare('UPDATE orders SET created_at=? WHERE reference=?').run(`${today}T12:00:00.000Z`,cancelled);
    db.prepare('UPDATE orders SET created_at=? WHERE reference=?').run(`${yesterday}T12:00:00.000Z`,outside);

    const response = await fetch(`${base}/api/admin/sales-report?from=${today}&to=${today}&scope=all`,{headers:{authorization:`Bearer ${token}`}});
    assert.equal(response.status,200);
    const report=await response.json();
    assert.deepEqual(report.orders.map(order=>order.reference),[included]);
    const order=report.orders[0];
    assert.deepEqual([order.book_count,order.items.length,order.items[0].title,order.items[0].qty,order.items[0].line_total],[2,1,'كتاب تقرير المبيعات',2,2600]);
    assert.equal(order.delivery,db.prepare('SELECT delivery FROM orders WHERE reference=?').get(included).delivery);
    assert.equal(order.total,order.books_total+order.delivery);
    assert.deepEqual(report.totals,{orders:1,book_count:2,books_total:2600,discount:0,delivery:order.delivery,total:order.total});
    assert.deepEqual(salesReportRows(today,today,'confirmed').orders,[]);
    const badRange=await fetch(`${base}/api/admin/sales-report?from=${today}&to=${yesterday}`,{headers:{authorization:`Bearer ${token}`}});
    assert.equal(badRange.status,400);
  } finally {
    for (const reference of references) db.prepare('DELETE FROM orders WHERE reference=?').run(reference);
    db.prepare('DELETE FROM books WHERE id=?').run(id);
    await closeServer();
  }
});

test('catalog payload is cached, revalidated with an ETag, and invalidated by data changes', async () => {
  const base = await listen();
  const id = 'catalog-cache-test';
  const stamp = new Date().toISOString();
  try {
    const first = await fetch(`${base}/api/catalog`, { headers:{ 'accept-encoding':'identity' } });
    assert.equal(first.status, 200);
    const etag = first.headers.get('etag');
    assert.match(etag, /^W\/"[\w-]+"$/);
    assert.match(first.headers.get('cache-control'), /max-age=30/);
    assert.match(first.headers.get('cache-control'), /stale-while-revalidate=300/);
    assert.equal(first.headers.get('content-encoding'), null);
    assert.ok(!(await first.json()).books.some(book => book.id === id));

    // An unchanged payload costs no bytes on repeat loads.
    const revalidated = await fetch(`${base}/api/catalog`, { headers:{ 'if-none-match':etag, 'accept-encoding':'identity' } });
    assert.equal(revalidated.status, 304);
    assert.equal(await revalidated.text(), '');

    // Gzip clients get the pre-compressed copy and can still parse it.
    const buffered = await new Promise((resolve, reject) => {
      const request = http.get(`${base}/api/catalog`, { headers:{ 'accept-encoding':'gzip' } }, res => {
        const chunks = []; res.on('data', chunk => chunks.push(chunk)); res.on('end', () => resolve({ status:res.statusCode, encoding:res.headers['content-encoding'], body:Buffer.concat(chunks) }));
      });
      request.on('error', reject);
    });
    assert.equal(buffered.status, 200);
    assert.equal(buffered.encoding, 'gzip');
    assert.ok(JSON.parse(zlib.gunzipSync(buffered.body)).books.length > 0);

    // A direct database edit (as imports and order reservations do) invalidates it.
    db.prepare('INSERT INTO books (id,title,author,publisher,category,genre,price,stock,reserved,isbn,pages,image,thumb,display,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(id, 'كتاب التخزين المؤقت', 'كاتب', 'ناشر', 'literature', 'رواية', 1200, 3, 0, '', null, '', null, null, 'اختبار.', stamp, stamp);
    const fresh = await fetch(`${base}/api/catalog`, { headers:{ 'if-none-match':etag, 'accept-encoding':'identity' } });
    assert.equal(fresh.status, 200);
    assert.notEqual(fresh.headers.get('etag'), etag);
    assert.ok((await fresh.json()).books.some(book => book.id === id));
  } finally {
    db.prepare('DELETE FROM restocks WHERE book_id=?').run(id);
    db.prepare('DELETE FROM books WHERE id=?').run(id);
    await closeServer();
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
    db.prepare('DELETE FROM restocks WHERE book_id=?').run(id);
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

test('cover backfill attaches derivatives to existing books and refreshes the cached catalog', async () => {
  const base = await listen();
  const id = 'backfill-cover-test';
  const stamp = new Date().toISOString();
  try {
    const authorization = `Bearer ${await ownerToken(base)}`;
    const original = await (await fetch(`${base}/api/admin/covers`, { method:'POST', headers:{'content-type':'application/json', authorization}, body:JSON.stringify({ dataUrl: PNG_DATA_URL }) })).json();
    const variants = await (await fetch(`${base}/api/admin/covers`, { method:'POST', headers:{'content-type':'application/json', authorization}, body:JSON.stringify({ source: original.image, thumb: PNG_DATA_URL, display: PNG_DATA_URL }) })).json();
    db.prepare('INSERT INTO books (id,title,author,publisher,category,genre,price,stock,reserved,isbn,pages,image,thumb,display,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(id, 'كتاب النسخ المصغّرة', 'كاتب', 'ناشر', 'literature', 'رواية', 1500, 2, 0, '', null, original.image, null, null, '', stamp, stamp);

    // Prime the catalog cache before the backfill, so the update has to invalidate it.
    await fetch(`${base}/api/catalog`).then(response => response.json());

    const backfill = await fetch(`${base}/api/admin/covers/backfill`, { method:'POST', headers:{'content-type':'application/json', authorization}, body:JSON.stringify({ items:[{ id, thumb: variants.thumb, display: variants.display }, { id:'missing-book', thumb: variants.thumb, display: variants.display }, { id, thumb:'/covers/../../server.js', display: variants.display }] }) });
    assert.equal(backfill.status, 200);
    const result = await backfill.json();
    assert.equal(result.updated, 1);
    assert.deepEqual(result.skipped, ['missing-book', id]);

    const row = db.prepare('SELECT thumb,display FROM books WHERE id=?').get(id);
    assert.equal(row.thumb, variants.thumb);
    assert.equal(row.display, variants.display);

    const catalog = await (await fetch(`${base}/api/catalog`)).json();
    assert.equal(catalog.books.find(book => book.id === id).thumb, variants.thumb);
  } finally {
    db.prepare('DELETE FROM books WHERE id=?').run(id);
    await closeServer();
  }
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
    db.prepare('DELETE FROM restocks WHERE book_id=?').run(id);
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
    db.prepare('DELETE FROM restocks WHERE book_id=?').run('derived-test');
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

test('collection edits, book changes, and visibility toggles persist', async () => {
  const base = await listen();
  const authorization = `Bearer ${await ownerToken(base)}`;
  const headers = { 'content-type':'application/json', authorization };
  let id;
  try {
    const created = await fetch(`${base}/api/admin/collections`, { method:'POST', headers, body:JSON.stringify({ slug:`patch-test-${Date.now()}`, title:'مجموعة قابلة للتعديل', description:'وصف', bookIds:['stranger'], homepage:false, active:true }) });
    assert.equal(created.status, 201);
    id = (await created.json()).collection.id;
    const edited = await fetch(`${base}/api/admin/collections/${encodeURIComponent(id)}`, { method:'PATCH', headers, body:JSON.stringify({ title:'مجموعة معدّلة', description:'وصف جديد', bookIds:['stranger','meaning'], homepage:true, active:true }) });
    assert.equal(edited.status, 200);
    const editedCollection = (await edited.json()).collection;
    assert.equal(editedCollection.title, 'مجموعة معدّلة');
    assert.deepEqual(editedCollection.bookIds, ['stranger','meaning']);
    assert.equal(editedCollection.homepage, true);
    const hidden = await fetch(`${base}/api/admin/collections/${encodeURIComponent(id)}`, { method:'PATCH', headers, body:JSON.stringify({ active:false }) });
    assert.equal(hidden.status, 200);
    assert.equal((await hidden.json()).collection.active, false);
  } finally {
    if (id) db.prepare('DELETE FROM collections WHERE id=?').run(id);
    await closeServer();
  }
});

test('admin staff with edit_catalog can manage collections', async () => {
  const base = await listen();
  const sha256 = value => require('node:crypto').createHash('sha256').update(String(value)).digest('hex');
  const createStaffSession = permissions => {
    const stamp = new Date().toISOString();
    const inserted = db.prepare('INSERT INTO users (email,password_hash,role,permissions_json,created_at) VALUES (?,?,?,?,?)').run(`catalog-admin-${Date.now()}-${Math.random()}@example.com`, passwordHash('catalog-secret-12'), 'admin', JSON.stringify(permissions), stamp);
    const token = `test-token-${inserted.lastInsertRowid}-${Math.random().toString(16).slice(2)}`;
    db.prepare('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)').run(sha256(token), inserted.lastInsertRowid, new Date(Date.now() + 3600e3).toISOString());
    return { id: inserted.lastInsertRowid, token };
  };
  const staff = createStaffSession({ ...permissionsFor({ role:'owner' }) });
  const limited = createStaffSession({ view_catalog:true });
  let id;
  try {
    const headers = { 'content-type':'application/json', authorization:`Bearer ${staff.token}` };
    const created = await fetch(`${base}/api/admin/collections`, { method:'POST', headers, body:JSON.stringify({ slug:`staff-test-${Date.now()}`, title:'مجموعة يديرها موظف', description:'', bookIds:['stranger'], homepage:false, active:true }) });
    assert.equal(created.status, 201);
    id = (await created.json()).collection.id;
    const hidden = await fetch(`${base}/api/admin/collections/${encodeURIComponent(id)}`, { method:'PATCH', headers, body:JSON.stringify({ active:false }) });
    assert.equal(hidden.status, 200);
    assert.equal((await hidden.json()).collection.active, false);
    const removed = await fetch(`${base}/api/admin/collections/${encodeURIComponent(id)}`, { method:'DELETE', headers });
    assert.equal(removed.status, 200);
    assert.equal(db.prepare('SELECT 1 FROM collections WHERE id=?').get(id), undefined);
    id = null;
    const denied = await fetch(`${base}/api/admin/collections`, { method:'POST', headers:{ 'content-type':'application/json', authorization:`Bearer ${limited.token}` }, body:JSON.stringify({ slug:`staff-denied-${Date.now()}`, title:'مرفوضة', description:'', bookIds:[], homepage:false, active:true }) });
    assert.equal(denied.status, 403);
  } finally {
    if (id) db.prepare('DELETE FROM collections WHERE id=?').run(id);
    db.prepare('UPDATE audit_log SET user_id=NULL WHERE user_id IN (?,?)').run(staff.id, limited.id);
    db.prepare('DELETE FROM users WHERE id IN (?,?)').run(staff.id, limited.id);
    await closeServer();
  }
});

test('best sellers only include confirmed orders', () => {
  const bookId = 'brief-time';
  assert.ok(!catalogPayload().bestSellerBookIds.includes(bookId));
  const reference = createOrder({ customer:{customer:'اختبار الأكثر قراءة',phone:'0555000111'}, items:[{id:bookId,qty:1}], shipping:{type:'office',wilayaCode:16,commune:'Alger Centre',price:0} });
  assert.ok(!catalogPayload().bestSellerBookIds.includes(bookId));
  transitionOrder(reference, 'confirmed', 'اختبار الأكثر قراءة', { id:1 });
  assert.ok(catalogPayload().bestSellerBookIds.includes(bookId));
});

test('deleting a collection removes it and clears homepage references', async () => {
  const base = await listen();
  const authorization = `Bearer ${await ownerToken(base)}`;
  const headers = { 'content-type':'application/json', authorization };
  const original = db.prepare("SELECT value_json FROM store_content WHERE key='homeSections'").get();
  let id;
  try {
    const created = await fetch(`${base}/api/admin/collections`, { method:'POST', headers, body:JSON.stringify({ slug:`delete-test-${Date.now()}`, title:'مجموعة للحذف', description:'', bookIds:['stranger'], homepage:false, active:true }) });
    assert.equal(created.status, 201);
    id = (await created.json()).collection.id;
    const saved = await fetch(`${base}/api/admin/catalog`, { method:'PUT', headers, body:JSON.stringify({ homeSections:[{ id:'section-delete-test', title:'قسم مرتبط بالمجموعة', type:'collection', collectionId:id, placement:'after-shelves', active:true }] }) });
    assert.equal(saved.status, 200);
    const removed = await fetch(`${base}/api/admin/collections/${encodeURIComponent(id)}`, { method:'DELETE', headers });
    assert.equal(removed.status, 200);
    assert.equal(db.prepare('SELECT 1 FROM collections WHERE id=?').get(id), undefined);
    const stored = JSON.parse(db.prepare("SELECT value_json FROM store_content WHERE key='homeSections'").get().value_json);
    assert.equal(stored.find(section => section.id === 'section-delete-test').collectionId, '');
    const missing = await fetch(`${base}/api/admin/collections/${encodeURIComponent(id)}`, { method:'DELETE', headers });
    assert.equal(missing.status, 404);
  } finally {
    if (original) db.prepare("UPDATE store_content SET value_json=?,updated_at=? WHERE key='homeSections'").run(original.value_json, new Date().toISOString());
    if (id) db.prepare('DELETE FROM collections WHERE id=?').run(id);
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
