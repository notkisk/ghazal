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
  assert.match(html, /shelf-carousel/);
  assert.match(html, /shelf-card-add/);
  assert.doesNotMatch(html, /home-editorial-grid/);
  assert.doesNotMatch(html, /load-more/);
  assert.doesNotMatch(html, /home-new-grid/);
  assert.match(css, /@media\(max-width:600px\)/);
  assert.match(read('index.html'), /home-book-shelves|newsletter-form/);
});

test('saved cart and favorites survive refresh and carousel controls follow RTL', () => {
  const script = read('script.js');
  const css = read('enhancements.css');
  // Saved items must not be filtered while byId is still empty on first load.
  assert.doesNotMatch(script, /let cart = readStorage\('ghazal\.cart\.v2', \[\]\)\.filter\(item => byId\[item\.id\]/);
  assert.doesNotMatch(script, /let favorites = readStorage\('ghazal\.favorites\.v2', \[\]\)\.filter\(id => byId\[id\]\)/);
  assert.match(script, /function reconcileSavedItems\(\)/);
  assert.match(script, /byId = Object\.fromEntries[\s\S]{0,200}reconcileSavedItems\(\)/);
  // The featured-publisher card forces direction:ltr, so the controls need an
  // explicit RTL direction or prev/next swap places compared with other shelves.
  assert.match(script, /shelf-carousel-controls" dir="rtl"/);
  assert.match(css, /\.shelf-carousel-controls\{direction:rtl/);
});

test('background catalog refresh does not replay reveal animations', () => {
  const script = read('script.js');
  assert.match(script, /const signature = JSON\.stringify\(payload \?\? null\)/);
  assert.match(script, /if \(signature === lastCatalogSignature\) return;/);
  assert.match(script, /applyCatalogPayload\(payload, \{ silent: true \}\)/);
  assert.match(script, /if \(suppressRevealEntrance\) \{ element\.classList\.add\('is-visible'\); return; \}/);
});

test('dashboard manages custom homepage sections without a carousel item cap', () => {
  const script = read('script.js');
  const admin = read('admin.js');
  const server = read('server.js');
  const index = read('index.html');
  const adminHtml = read('admin.html');
  // Storefront: sections render from the catalog payload at named anchors.
  assert.match(script, /let homeSections = readStorage\('ghazal\.homeSections\.v1', \[\]\)/);
  assert.match(script, /homeSections = Array\.isArray\(payload\?\.homeSections\) \? payload\.homeSections : \[\]/);
  assert.match(script, /function renderHomeSections\(\)/);
  assert.match(script, /data-home-section/);
  assert.match(script, /Number\.MAX_SAFE_INTEGER/);
  assert.match(script, /customCollectionIds/);
  // Dashboard: tab, workspace, form controls, and save actions.
  assert.match(admin, /data-owner-tab="home-sections"/);
  assert.match(admin, /أقسام الرئيسية/);
  assert.match(admin, /function renderHomeSectionsWorkspace\(\)/);
  assert.match(admin, /function setupHomeSectionForm\(/);
  assert.match(admin, /name="placement"/);
  assert.match(admin, /data-delete-home-section/);
  assert.match(admin, /function persistHomeSections\(/);
  // Collection editing is search-first: results are clickable rows, not a wall
  // of checkboxes, and the added-books list supports removal.
  assert.match(admin, /if \(kind === 'collection'\) setupCollectionBookPicker/);
  assert.match(admin, /data-collection-book="\$\{esc\(id\)\}"/);
  assert.match(admin, /const next = selected\.includes\(id\) \? selected\.filter\(item => item !== id\) : \[\.\.\.selected, id\]/);
  assert.match(admin, /bookIds:collectionSelectedIds\(form\)/);
  assert.doesNotMatch(admin, /input\[name="bookIds"\]:checked/);
  assert.doesNotMatch(admin, /type="checkbox"[^>]*data-collection-book/);
  // Server: defaults, validation, and placement list.
  assert.match(server, /const HOME_SECTION_PLACEMENTS = \[/);
  assert.match(server, /function sanitizeHomeSections\(/);
  assert.match(server, /homeSections: contentValue\('homeSections', \[\]\)/);
  // Cache-busting versions cover the edited assets.
  assert.match(index, /script\.js\?v=20261105-3/);
  assert.match(adminHtml, /admin\.js\?v=20261105-7/);
});

test('backup script never mutates the database at require time', () => {
  const backup = read('scripts/backup-db.js');
  assert.doesNotMatch(backup, /require\(['"]\.\.\/server['"]\)/);
  assert.match(backup, /node:fs/);
});

test('production discovery files and import template are present', () => {
  assert.match(read('robots.txt'), /Sitemap:/);
  assert.match(read('sitemap.xml'), /<urlset/);
  assert.ok(fs.existsSync(path.join(root, 'assets/templates/ghazal-book-import-template.xlsx')));
  assert.match(read('index.html'), /canonical/);
});
