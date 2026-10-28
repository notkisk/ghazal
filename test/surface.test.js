const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('storefront keeps mobile checkout and responsive shelf behavior', () => {
  const html = read('script.js');
  const css = read('enhancements.css') + read('styles.css');
  assert.match(html, /name="customer"/);
  assert.match(html, /name="phone"/);
  assert.match(html, /name="wilayaCode"/);
  assert.match(html, /name="commune"/);
  assert.match(html, /name="shipmentType"/);
  assert.doesNotMatch(html, /name="phone2"/);
  assert.doesNotMatch(html, /name="address"/);
  assert.doesNotMatch(html, /name="mapLink"/);
  assert.doesNotMatch(html, /name="notes"/);
  assert.match(html, /catalog-publisher-filter/);
  assert.match(html, /catalog-genre-filter/);
  assert.match(html, /catalog-price-min/);
  assert.match(html, /catalog-clear-filters/);
  assert.match(html, /home-carousel/);
  assert.match(html, /home-editorial-grid/);
  assert.doesNotMatch(html, /home-new-grid/);
  assert.match(css, /@media\(max-width:600px\)/);
  assert.match(read('index.html'), /home-book-shelves|newsletter-form/);
});

test('production discovery files and import template are present', () => {
  assert.match(read('robots.txt'), /Sitemap:/);
  assert.match(read('sitemap.xml'), /<urlset/);
  assert.ok(fs.existsSync(path.join(root, 'assets/templates/ghazal-book-import-template.xlsx')));
  assert.match(read('index.html'), /canonical/);
});
