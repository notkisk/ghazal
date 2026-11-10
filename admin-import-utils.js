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
    const title = String(values.title || '').trim().toLocaleLowerCase('ar');
    const author = String(values.author || '').trim().toLocaleLowerCase('ar');
    return books.find(book => (isbn && normalizeIsbn(book.isbn) === isbn) || (String(book.title || '').trim().toLocaleLowerCase('ar') === title && String(book.author || '').trim().toLocaleLowerCase('ar') === author));
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

  return { findBookMatch, mapWithConcurrency, upsertBooks };
});
