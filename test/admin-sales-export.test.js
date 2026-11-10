const test = require('node:test');
const assert = require('node:assert/strict');
const { createWorkbook } = require('../admin-sales-export');

function unpackStoredZip(buffer) {
  const bytes=new Uint8Array(buffer), view=new DataView(buffer), decoder=new TextDecoder(), files=new Map(); let offset=0;
  while(offset+4<=bytes.length&&view.getUint32(offset,true)===0x04034b50) {
    const method=view.getUint16(offset+8,true), size=view.getUint32(offset+18,true), nameLength=view.getUint16(offset+26,true), extraLength=view.getUint16(offset+28,true);
    const name=decoder.decode(bytes.subarray(offset+30,offset+30+nameLength)), start=offset+30+nameLength+extraLength;
    assert.equal(method,0); files.set(name,decoder.decode(bytes.subarray(start,start+size))); offset=start+size;
  }
  return files;
}

test('sales workbook has order summary and one row per purchased title with matching totals', async () => {
  const report={orders:[{reference:'GZ-20261110-ABC123',created_at:'2026-11-10T10:30:00.000Z',status:'confirmed',customer_name:'قارئ',book_count:3,books_total:3300,discount:300,delivery:500,total:3800,items:[{title:'كتاب أول',qty:2,unit_price:1200,line_total:2400},{title:'كتاب ثان',qty:1,unit_price:1200,line_total:1200}]}],totals:{orders:1,book_count:3,books_total:3300,discount:300,delivery:500,total:3800}};
  const files=unpackStoredZip(await createWorkbook(report).arrayBuffer());
  const workbook=files.get('xl/workbook.xml');
  assert.match(workbook,/ملخص الطلبات/);
  assert.match(workbook,/تفاصيل الكتب/);
  const orders=files.get('xl/worksheets/sheet1.xml');
  const items=files.get('xl/worksheets/sheet2.xml');
  assert.match(orders,/رقم الطلب/);
  assert.ok(orders.includes('عدد الطلبات'));
  assert.ok(orders.includes('الشحن (دج)'));
  assert.ok(orders.includes('إجمالي الطلب (دج)'));
  assert.match(orders,/<v>3800<\/v>/);
  assert.match(orders,/<v>1<\/v>/);
  assert.match(items,/كتاب أول/);
  assert.match(items,/كتاب ثان/);
  assert.match(items,/rightToLeft="1"/);
  assert.match(items,/autoFilter/);
  assert.match(items,/<v>3600<\/v>/);
});
