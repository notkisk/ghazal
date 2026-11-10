const test = require('node:test');
const assert = require('node:assert/strict');
const { findBookMatch, mapWithConcurrency, upsertBooks } = require('../admin-import-utils');

test('bulk import updates an existing book by title and author and replaces its stock quantity', () => {
  const existing = { id:'existing-book', title:'كتاب جديد', author:'مؤلف معروف', stock:3, price:1200 };
  const match = findBookMatch([existing], { title:' كتاب جديد ', author:'مؤلف معروف', isbn:'' });
  assert.equal(match.id, existing.id);

  const imported = { ...match, stock:11, price:1400 };
  const next = upsertBooks([existing], [imported]);
  assert.equal(next.length, 1);
  assert.equal(next[0].id, existing.id);
  assert.equal(next[0].stock, 11);
  assert.equal(next[0].price, 1400);
});

test('bulk import cover work respects its concurrency limit and preserves row order', async () => {
  let active = 0;
  let peak = 0;
  const items = Array.from({ length:12 }, (_, index) => index);
  const results = await mapWithConcurrency(items, 4, async item => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 2));
    active -= 1;
    return item * 2;
  });

  assert.equal(peak, 4);
  assert.deepEqual(results, items.map(item => item * 2));
});
