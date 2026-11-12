(function initAdminImportUtils(root, factory) {
  const utilities = factory();
  if (typeof module === 'object' && module.exports) module.exports = utilities;
  else root.GhazalAdminImport = utilities;
})(globalThis, () => {
  function normalizeIsbn(value) {
    return String(value ?? '').replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) >= 0x06f0 ? digit.charCodeAt(0) - 0x06f0 : digit.charCodeAt(0) - 0x0660)).replace(/^\s*ISBN(?:-1[03])?\s*/i, '').toUpperCase().replace(/[^0-9X]/g, '');
  }

  function findBookMatch(books, values) {
    const isbn = normalizeIsbn(values.isbn);
    const title = normalizeImportText(values.title);
    const author = normalizeImportText(values.author);
    const publisher = normalizeImportText(values.publisher);
    const titleMatches = title
      ? books.filter(book => normalizeImportText(book.title) === title)
      : [];
    const titleAuthorMatches = title && author
      ? books.filter(book => normalizeImportText(book.title) === title && normalizeImportText(book.author) === author)
      : [];
    if (publisher) {
      const publisherMatches = titleMatches.filter(book => normalizeImportText(book.publisher) === publisher);
      if (publisherMatches.length === 1) return publisherMatches[0];
      if (author) {
        const publisherAuthorMatches = publisherMatches.filter(book => normalizeImportText(book.author) === author);
        if (publisherAuthorMatches.length === 1) return publisherAuthorMatches[0];
      }
    }
    if (isbn) {
      const isbnMatches = books.filter(book => normalizeIsbn(book.isbn) === isbn);
      if (isbnMatches.length === 1) {
        const candidate = isbnMatches[0];
        const agrees = (!title || normalizeImportText(candidate.title) === title)
          && (!author || normalizeImportText(candidate.author) === author)
          && (!publisher || normalizeImportText(candidate.publisher) === publisher);
        if (agrees) return candidate;
      }
    }
    if (!publisher && titleAuthorMatches.length === 1) return titleAuthorMatches[0];
    return null;
  }

  function normalizeImportText(value) {
    return String(value ?? '').normalize('NFKD').replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآ]/g, 'ا').toLocaleLowerCase('ar').trim().replace(/\s+/g, ' ');
  }

  function priceUpdateColumnMapping(headers) {
    const aliases = {
      title:['عنوان الكتاب','العنوان','اسم الكتاب','title','titre'],
      author:['المؤلف','الكاتب','author','auteur'],
      publisher:['دار النشر','الناشر','publisher','éditeur','editeur'],
      price:['سعر البيع (دج)','سعر البيع','السعر','price','prix']
    };
    const normalize = value => String(value || '').replace(/[*☆★]/g, '').trim().toLocaleLowerCase('ar').replace(/[._-]+/g, ' ');
    return Object.fromEntries(Object.entries(aliases).map(([field, options]) => {
      const index = headers.findIndex(header => options.some(alias => normalize(alias) === normalize(header)));
      return [field, index >= 0 ? String(index) : ''];
    }));
  }

  function findPriceBookMatches(books, values) {
    const title = normalizeImportText(values.title);
    if (!title) return [];
    const author = normalizeImportText(values.author);
    const publisher = normalizeImportText(values.publisher);
    const titleMatches = books.filter(book => normalizeImportText(book.title) === title);
    if (publisher) {
      const publisherMatches = titleMatches.filter(book => normalizeImportText(book.publisher) === publisher);
      if (publisherMatches.length <= 1 || !author) return publisherMatches;
      const authorMatches = publisherMatches.filter(book => normalizeImportText(book.author) === author);
      return authorMatches.length ? authorMatches : publisherMatches;
    }
    return titleMatches.filter(book => !author || normalizeImportText(book.author) === author);
  }

  function parseDzdPrice(value) {
    let text = String(value ?? '').replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) >= 0x06f0 ? digit.charCodeAt(0) - 0x06f0 : digit.charCodeAt(0) - 0x0660));
    text = text.replace(/[^\d.,٬\s]/g, '').replace(/[\s٬]/g, '');
    let normalized = '';
    if (/^\d+$/.test(text)) normalized = text;
    else if (/^\d{1,3}(?:[.,]\d{3})+$/.test(text)) normalized = text.replace(/[.,]/g, '');
    else if (/^\d{1,3}(?:\.\d{3})+,\d{2}$/.test(text) && text.endsWith(',00')) normalized = text.replace(/\.\d{3}/g, '').replace(/,00$/, '');
    else if (/^\d+[.,]0{1,2}$/.test(text)) normalized = text.replace(/[.,]0{1,2}$/, '');
    const price = Number(normalized);
    return /^\d+$/.test(normalized) && Number.isSafeInteger(price) && price <= 100000000 ? price : null;
  }

  async function mapWithConcurrency(items, limit, mapper) {
    const results = new Array(items.length);
    let nextIndex = 0;
    const worker = async () => {
      while (nextIndex < items.length) {
        const index = nextIndex++;
        results[index] = await mapper(items[index], index);
      }
    };
    await Promise.all(Array.from({ length: Math.min(items.length, Math.max(1, Math.trunc(limit) || 1)) }, worker));
    return results;
  }

  function upsertBooks(current, imported) {
    const next = [...current];
    imported.forEach(book => {
      const index = next.findIndex(item => item.id === book.id);
      if (index >= 0) next.splice(index, 1, book);
      else next.push(book);
    });
    return next;
  }

  return { findBookMatch, findPriceBookMatches, mapWithConcurrency, normalizeImportText, parseDzdPrice, priceUpdateColumnMapping, upsertBooks };
});
