(function initInventoryExport(root, factory) {
  const exporter = factory();
  if (typeof module === 'object' && module.exports) module.exports = exporter;
  else root.GhazalInventoryExport = exporter;
})(globalThis, () => {
  const MAIN_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const PKG_REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
  const baseHeaders = ['عنوان الكتاب','المؤلف','دار النشر','النسخ المشتراة','النسخ المباعة','المتبقي بالمخزون','الكمية المحجوزة','المتاح للبيع','سعر البيع (دج)','قيمة المخزون بسعر البيع (دج)','قيمة المتاح للبيع (دج)','معرّف الكتاب','كمية واردة للإضافة','الكمية النهائية بعد الجرد'];
  const coverHeaders = ['رابط الغلاف الأصلي','رابط صورة العرض','رابط الصورة المصغرة'];

  const xmlEscape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;' }[character]));
  const safeNumber = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  const columnName = index => {
    let name = '';
    for (let value = index + 1; value; value = Math.floor((value - 1) / 26)) name = String.fromCharCode(65 + ((value - 1) % 26)) + name;
    return name;
  };

  function coverLink(value, baseUrl = '') {
    const path = String(value || '').trim();
    if (!path || /^data:/i.test(path)) return '';
    if (/^https?:\/\//i.test(path)) return path;
    if (!baseUrl || !(/^(\/|assets\/)/i.test(path))) return path.startsWith('/') || path.startsWith('assets/') ? path : '';
    try { const url = new URL(path, baseUrl); return ['http:','https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
  }

  function inventoryRows(books, { includeCoverLinks = false, baseUrl = '' } = {}) {
    const records = (Array.isArray(books) ? books : []).map(book => {
      const stock = Math.trunc(safeNumber(book.stock));
      const reserved = Math.trunc(safeNumber(book.reserved));
      const available = Math.max(0, stock - reserved);
      const purchased = Math.trunc(safeNumber(book.purchased));
      const sold = Math.trunc(safeNumber(book.sold));
      const price = Math.trunc(safeNumber(book.price));
      const record = { id:String(book.id || ''), title:String(book.title || ''), author:String(book.author || ''), publisher:String(book.publisher || ''), purchased, sold, stock, reserved, available, price, stockValue:stock * price, availableValue:available * price };
      if (includeCoverLinks) Object.assign(record, { coverImage:coverLink(book.image,baseUrl), coverDisplay:coverLink(book.display,baseUrl), coverThumb:coverLink(book.thumb,baseUrl) });
      return record;
    }).sort((a, b) => a.title.localeCompare(b.title, 'ar'));
    const total = records.reduce((sum, book) => {
      sum.purchased += book.purchased; sum.sold += book.sold; sum.stock += book.stock; sum.reserved += book.reserved; sum.available += book.available;
      sum.stockValue += book.stockValue; sum.availableValue += book.availableValue;
      return sum;
    }, { purchased:0, sold:0, stock:0, reserved:0, available:0, stockValue:0, availableValue:0 });
    return { records, total };
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function zipStore(files) {
    const encoder = new TextEncoder(); const chunks = []; const central = []; let offset = 0;
    const set16 = (view, at, value) => view.setUint16(at, value, true);
    const set32 = (view, at, value) => view.setUint32(at, value >>> 0, true);
    for (const [fileName, content] of Object.entries(files)) {
      const name = encoder.encode(fileName); const data = typeof content === 'string' ? encoder.encode(content) : content; const crc = crc32(data);
      const local = new Uint8Array(30 + name.length + data.length); const localView = new DataView(local.buffer);
      set32(localView, 0, 0x04034b50); set16(localView, 4, 20); set16(localView, 6, 0); set16(localView, 8, 0); set32(localView, 14, crc); set32(localView, 18, data.length); set32(localView, 22, data.length); set16(localView, 26, name.length); local.set(name, 30); local.set(data, 30 + name.length); chunks.push(local);
      const record = new Uint8Array(46 + name.length); const recordView = new DataView(record.buffer);
      set32(recordView, 0, 0x02014b50); set16(recordView, 4, 20); set16(recordView, 6, 20); set16(recordView, 8, 0); set16(recordView, 10, 0); set32(recordView, 16, crc); set32(recordView, 20, data.length); set32(recordView, 24, data.length); set16(recordView, 28, name.length); set32(recordView, 42, offset); record.set(name, 46); central.push(record); offset += local.length;
    }
    const centralSize = central.reduce((sum, record) => sum + record.length, 0); const end = new Uint8Array(22); const endView = new DataView(end.buffer);
    set32(endView, 0, 0x06054b50); set16(endView, 8, central.length); set16(endView, 10, central.length); set32(endView, 12, centralSize); set32(endView, 16, offset);
    const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0) + centralSize + end.length; const output = new Uint8Array(length); let cursor = 0;
    for (const chunk of [...chunks, ...central, end]) { output.set(chunk, cursor); cursor += chunk.length; }
    return output;
  }

  function createWorkbook(books, options = {}) {
    const includeCoverLinks = Boolean(options.includeCoverLinks);
    const headers = includeCoverLinks ? [...baseHeaders,...coverHeaders] : baseHeaders;
    const { records, total } = inventoryRows(books, options);
    const rows = [headers, ...records.map(book => [book.title,book.author,book.publisher,book.purchased,book.sold,book.stock,book.reserved,book.available,book.price,book.stockValue,book.availableValue,book.id,'','',...(includeCoverLinks?[book.coverImage,book.coverDisplay,book.coverThumb]:[])]), ['الإجمالي','','',total.purchased,total.sold,total.stock,total.reserved,total.available,'',total.stockValue,total.availableValue,'','','',...(includeCoverLinks?['','','']:[])]];
    const lastRow = rows.length; const lastDataRow = Math.max(1, lastRow - 1);
    const hyperlinks = [];
    const sheetRows = rows.map((row, rowIndex) => {
      const rowNumber = rowIndex + 1; const isHeader = rowIndex === 0; const isTotal = rowIndex === rows.length - 1;
      const cells = row.map((value, colIndex) => {
        const reference = `${columnName(colIndex)}${rowNumber}`; const numeric = !isHeader && typeof value === 'number';
        const style = isHeader ? ' s="1"' : (isTotal ? (colIndex >= 9 && colIndex <= 10 ? ' s="5"' : ' s="2"') : (numeric && colIndex >= 8 && colIndex <= 10 ? ' s="3"' : (numeric ? ' s="4"' : '')));
        if (includeCoverLinks && !isHeader && !isTotal && colIndex >= 14 && colIndex <= 16 && /^https?:\/\//i.test(String(value || ''))) hyperlinks.push({ ref:reference, id:`rId${hyperlinks.length+1}`, target:String(value) });
        return numeric ? `<c r="${reference}"${style} t="n"><v>${value}</v></c>` : `<c r="${reference}"${style} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
      }).join('');
      return `<row r="${rowNumber}"${isHeader ? ' ht="30" customHeight="1"' : ''}>${cells}</row>`;
    }).join('');
    const lastColumn = columnName(headers.length - 1);
    const coverWidths = includeCoverLinks ? '<col min="15" max="17" width="46" customWidth="1"/>' : '';
    const hyperlinkXml = hyperlinks.length ? `<hyperlinks>${hyperlinks.map(link=>`<hyperlink ref="${link.ref}" r:id="${link.id}"/>`).join('')}</hyperlinks>` : '';
    const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${MAIN_NS}" xmlns:r="${REL_NS}"><dimension ref="A1:${lastColumn}${lastRow}"/><sheetViews><sheetView workbookViewId="0" rightToLeft="1"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="20"/><cols><col min="1" max="1" width="34" customWidth="1"/><col min="2" max="3" width="24" customWidth="1"/><col min="4" max="8" width="17" customWidth="1"/><col min="9" max="11" width="27" customWidth="1"/>${coverWidths}</cols><sheetData>${sheetRows}</sheetData><autoFilter ref="A1:${lastColumn}${lastDataRow}"/>${hyperlinkXml}</worksheet>`;
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="${MAIN_NS}"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0 &quot;دج&quot;"/></numFmts><fonts count="3"><font><sz val="11"/><name val="Arial"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><name val="Arial"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF173D45"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEAF1EF"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FF9CB2AD"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="164" fontId="2" fillId="3" borderId="1" xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
    const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${MAIN_NS}" xmlns:r="${REL_NS}"><sheets><sheet name="مخزون الكتب" sheetId="1" r:id="rId1"/></sheets></workbook>`;
    const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${PKG_REL_NS}"><Relationship Id="rId1" Type="${REL_NS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
    const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${PKG_REL_NS}"><Relationship Id="rId1" Type="${REL_NS}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${REL_NS}/styles" Target="styles.xml"/></Relationships>`;
    const sheetLinks = hyperlinks.length ? `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${PKG_REL_NS}">${hyperlinks.map(link=>`<Relationship Id="${link.id}" Type="${REL_NS}/hyperlink" Target="${xmlEscape(link.target)}" TargetMode="External"/>`).join('')}</Relationships>` : '';
    return zipStore({ '[Content_Types].xml':contentTypes, '_rels/.rels':rootRels, 'xl/workbook.xml':workbook, 'xl/_rels/workbook.xml.rels':workbookRels, 'xl/worksheets/sheet1.xml':sheet, 'xl/styles.xml':styles, ...(sheetLinks ? { 'xl/worksheets/_rels/sheet1.xml.rels':sheetLinks } : {}) });
  }

  return { inventoryRows, createWorkbook };
});
