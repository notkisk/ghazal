(function initSalesExport(root, factory) {
  const exporter = factory();
  if (typeof module === 'object' && module.exports) module.exports = exporter;
  else root.GhazalSalesExport = exporter;
})(globalThis, () => {
  const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const PKG = 'http://schemas.openxmlformats.org/package/2006/relationships';
  const escapeXml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
  const u16 = (view, at, value) => view.setUint16(at, value, true);
  const u32 = (view, at, value) => view.setUint32(at, value >>> 0, true);
  function crc32(bytes) { let crc=0xffffffff; for (const byte of bytes) { crc^=byte; for(let bit=0;bit<8;bit++) crc=(crc>>>1)^(crc&1?0xedb88320:0); } return (crc^0xffffffff)>>>0; }
  function zip(files) {
    const encoder=new TextEncoder(), chunks=[], central=[]; let offset=0;
    for(const [path,content] of Object.entries(files)) {
      const name=encoder.encode(path), data=encoder.encode(content), crc=crc32(data);
      const local=new Uint8Array(30+name.length+data.length), lv=new DataView(local.buffer);
      u32(lv,0,0x04034b50); u16(lv,4,20); u16(lv,8,0); u32(lv,14,crc); u32(lv,18,data.length); u32(lv,22,data.length); u16(lv,26,name.length); local.set(name,30); local.set(data,30+name.length); chunks.push(local);
      const record=new Uint8Array(46+name.length), cv=new DataView(record.buffer);
      u32(cv,0,0x02014b50); u16(cv,4,20); u16(cv,6,20); u16(cv,8,0); u32(cv,16,crc); u32(cv,20,data.length); u32(cv,24,data.length); u16(cv,28,name.length); u32(cv,42,offset); record.set(name,46); central.push(record); offset+=local.length;
    }
    const centralSize=central.reduce((sum,item)=>sum+item.length,0), end=new Uint8Array(22), ev=new DataView(end.buffer);
    u32(ev,0,0x06054b50); u16(ev,8,central.length); u16(ev,10,central.length); u32(ev,12,centralSize); u32(ev,16,offset);
    return new Blob([...chunks,...central,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }
  const colName=index=>{let name=''; for(let value=index+1;value;value=Math.floor((value-1)/26)) name=String.fromCharCode(65+(value-1)%26)+name; return name;};
  const statusNames={new:'جديد',confirmed:'مؤكد',preparing:'قيد التحضير',shipped:'تم الشحن',delivered:'تم التسليم',cancelled:'ملغى',returned:'مرتجع'};
  function sheetXml(headers, rows, widths, moneyColumns, unitColumns) {
    const allRows=[headers,...rows]; const dataEnd=allRows.length;
    const xmlRows=allRows.map((row,rowIndex)=>{
      const number=rowIndex+1, header=rowIndex===0, total=rowIndex===allRows.length-1 && rowIndex>0;
      const cells=row.map((value,index)=>{
        const ref=`${colName(index)}${number}`, numeric=!header&&typeof value==='number';
        let style=header?1:(total?(moneyColumns.has(index)?5:(unitColumns.has(index)?6:2)):(moneyColumns.has(index)?3:(unitColumns.has(index)?4:0)));
        return numeric?`<c r="${ref}" s="${style}" t="n"><v>${value}</v></c>`:`<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
      }).join('');
      return `<row r="${number}"${header?' ht="30" customHeight="1"':''}>${cells}</row>`;
    }).join('');
    const last=colName(headers.length-1);
    const cols=widths.map((width,index)=>`<col min="${index+1}" max="${index+1}" width="${width}" customWidth="1"/>`).join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${NS}" xmlns:r="${REL}"><dimension ref="A1:${last}${allRows.length}"/><sheetViews><sheetView workbookViewId="0" rightToLeft="1"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="20"/><cols>${cols}</cols><sheetData>${xmlRows}</sheetData><autoFilter ref="A1:${last}${dataEnd-1}"/></worksheet>`;
  }
  function createWorkbook(report) {
    const orders=Array.isArray(report?.orders)?report.orders:[];
    const orderHeaders=['رقم الطلب','تاريخ الطلب','حالة الطلب','عدد الطلبات','اسم العميل','عدد النسخ','قيمة الكتب بعد الخصم (دج)','الخصم (دج)','الشحن (دج)','إجمالي الطلب (دج)'];
    const orderRows=orders.map(order=>[String(order.reference||''),String(order.created_at||''),statusNames[order.status]||String(order.status||''),1,String(order.customer_name||''),Number(order.book_count)||0,Number(order.books_total)||0,Number(order.discount)||0,Number(order.delivery)||0,Number(order.total)||0]);
    const totals=report?.totals||{};
    orderRows.push(['الإجمالي','','',Number(totals.orders)||0,'',Number(totals.book_count)||0,Number(totals.books_total)||0,Number(totals.discount)||0,Number(totals.delivery)||0,Number(totals.total)||0]);
    const itemHeaders=['رقم الطلب','تاريخ الطلب','حالة الطلب','عنوان الكتاب','الكمية','سعر النسخة قبل الخصم (دج)','إجمالي السطر قبل الخصم (دج)'];
    const itemRows=[];
    for(const order of orders) for(const item of Array.isArray(order.items)?order.items:[]) itemRows.push([String(order.reference||''),String(order.created_at||''),statusNames[order.status]||String(order.status||''),String(item.title||''),Number(item.qty)||0,Number(item.unit_price)||0,Number(item.line_total ?? (Number(item.qty||0)*Number(item.unit_price||0)))||0]);
    const itemTotals=itemRows.reduce((totals,row)=>({units:totals.units+row[4],value:totals.value+row[6]}),{units:0,value:0});
    itemRows.push(['الإجمالي','','','',itemTotals.units,'',itemTotals.value]);
    const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="${NS}"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0 &quot;دج&quot;"/></numFmts><fonts count="3"><font><sz val="11"/><name val="Arial"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><name val="Arial"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF173D45"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEAF1EF"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FF9CB2AD"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="164" fontId="2" fillId="3" borderId="1" xfId="0"/><xf numFmtId="3" fontId="2" fillId="3" borderId="1" xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
    const contentTypes=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
    const workbook=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${NS}" xmlns:r="${REL}"><sheets><sheet name="ملخص الطلبات" sheetId="1" r:id="rId1"/><sheet name="تفاصيل الكتب" sheetId="2" r:id="rId2"/></sheets></workbook>`;
    const rootRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
    const wbRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${REL}/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="${REL}/styles" Target="styles.xml"/></Relationships>`;
    const orderXml=sheetXml(orderHeaders,orderRows,[28,22,18,14,26,14,28,18,18,23],new Set([6,7,8,9]),new Set([3,5]));
    const itemXml=sheetXml(itemHeaders,itemRows,[28,22,18,42,14,22,24],new Set([5,6]),new Set([4]));
    return zip({'[Content_Types].xml':contentTypes,'_rels/.rels':rootRels,'xl/workbook.xml':workbook,'xl/_rels/workbook.xml.rels':wbRels,'xl/worksheets/sheet1.xml':orderXml,'xl/worksheets/sheet2.xml':itemXml,'xl/styles.xml':styles});
  }
  return { createWorkbook };
});
