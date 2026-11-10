const test = require('node:test');
const assert = require('node:assert/strict');
const { inventoryRows, createWorkbook } = require('../admin-inventory-export');

function readStoredZip(bytes) {
  const files = new Map();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  let offset = 0;
  while (offset + 4 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const method = view.getUint16(offset + 8, true);
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const name = decoder.decode(bytes.subarray(offset + 30, offset + 30 + nameLength));
    const start = offset + 30 + nameLength + extraLength;
    assert.equal(method, 0, 'workbook uses standard ZIP stored entries');
    files.set(name, decoder.decode(bytes.subarray(start, start + size)));
    offset = start + size;
  }
  return files;
}

test('inventory report uses current stock, reservations, sale prices, and correct totals', () => {
  const { records, total } = inventoryRows([
    { title:'كتاب ب', author:'كاتب ب', publisher:'دار ب', purchased:4, sold:2, stock:2, reserved:0, price:700 },
    { title:'كتاب أ', author:'كاتب أ', publisher:'دار أ', purchased:12, sold:5, stock:10, reserved:3, price:1500 }
  ]);

  assert.equal(records[0].title, 'كتاب أ');
  assert.deepEqual([records[0].purchased, records[0].sold, records[0].stock, records[0].reserved, records[0].available, records[0].price, records[0].stockValue, records[0].availableValue], [12,5,10,3,7,1500,15000,10500]);
  assert.deepEqual(total, { purchased:16, sold:7, stock:12, reserved:3, available:9, stockValue:16400, availableValue:11900 });

  const files = readStoredZip(createWorkbook([
    { title:'كتاب أ', author:'كاتب أ', publisher:'دار أ', purchased:12, sold:5, stock:10, reserved:3, price:1500 },
    { title:'كتاب ب', author:'كاتب ب', publisher:'دار ب', purchased:4, sold:2, stock:2, reserved:0, price:700 }
  ]));
  assert.ok(files.has('xl/workbook.xml'));
  const sheet = files.get('xl/worksheets/sheet1.xml');
  assert.match(sheet, /سعر البيع \(دج\)/);
  assert.match(sheet, /النسخ المشتراة/);
  assert.match(sheet, /النسخ المباعة/);
  assert.match(sheet, /قيمة المخزون بسعر البيع \(دج\)/);
  assert.match(sheet, /<v>15000<\/v>/);
  assert.match(sheet, /<v>10500<\/v>/);
  assert.match(sheet, /<v>16400<\/v>/);
  assert.match(sheet, /<v>11900<\/v>/);
  assert.match(sheet, /<v>16<\/v>/);
  assert.match(sheet, /<v>7<\/v>/);
  assert.match(sheet, /rightToLeft="1"/);
});

test('inventory report does not hide reservations or show negative available stock', () => {
  const { records } = inventoryRows([{ title:'كتاب محجوز', stock:2, reserved:3, price:800 }]);
  assert.equal(records[0].reserved, 3);
  assert.equal(records[0].available, 0);
});

test('inventory workbook includes clickable cover links only when requested', () => {
  const book={title:'كتاب الأغلفة',image:'/covers/original.webp',display:'/covers/display.webp',thumb:'/covers/thumb.webp'};
  const files=readStoredZip(createWorkbook([book],{includeCoverLinks:true,baseUrl:'http://localhost:3000'}));
  const sheet=files.get('xl/worksheets/sheet1.xml');
  assert.match(sheet,/رابط الغلاف الأصلي/);
  assert.match(sheet,/رابط صورة العرض/);
  assert.match(sheet,/رابط الصورة المصغرة/);
  assert.match(sheet,/dimension ref="A1:N3"/);
  assert.match(sheet,/<hyperlinks>/);
  const relationships=files.get('xl/worksheets/_rels/sheet1.xml.rels');
  assert.match(relationships,/Target="http:\/\/localhost:3000\/covers\/original\.webp"/);
  assert.match(relationships,/Target="http:\/\/localhost:3000\/covers\/display\.webp"/);
  assert.match(relationships,/Target="http:\/\/localhost:3000\/covers\/thumb\.webp"/);

  const withoutLinks=readStoredZip(createWorkbook([book])).get('xl/worksheets/sheet1.xml');
  assert.doesNotMatch(withoutLinks,/رابط الغلاف/);
});
