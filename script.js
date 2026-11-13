const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const CATALOG_CACHE_VERSION = '2026-11-clean-slate';
const PUBLISHER_LOGO_ASSETS = { 'دار المدى':'assets/publishers/al-mada.png', 'منشورات الجمل':'assets/publishers/al-jamal.png', 'الشبكة العربية للأبحاث والنشر':'assets/publishers/arab-network.png', 'دار الرافدين':'assets/publishers/al-rafidain.png', 'صفحة 7':'assets/publishers/safha.png', 'الدار المصرية اللبنانية':'assets/publishers/aldar-almisriya-allubnaniya.png', 'المحروسة':'assets/publishers/al-mahrousa.png', 'دار الكتاب الجديد المتحدة':'assets/publishers/alkitab-aljadeed-2026.png', 'الدار العربية للعلوم ناشرون':'assets/publishers/arab-scientific.png', 'دار سطور':'assets/publishers/dar-sutoor-2026.png', 'آفاق للنشر والتوزيع':'assets/publishers/afaq-books.png', 'افاق للنشر والتوزيع':'assets/publishers/afaq-books.png', 'آفاق للنشر و التوزيع':'assets/publishers/afaq-books.png', 'افاق للنشر و التوزيع':'assets/publishers/afaq-books.png', 'جسور للترجمة و النشر':'assets/publishers/jisoor.png', 'دار المدار الإسلامي':'assets/publishers/al-madar-al-islami.png', 'دار المشرق':'assets/publishers/dar-al-mashriq-2026.png', 'تمكين للأبحاث و النشر':'assets/publishers/tamkeen-research.png', 'ديوان للنشر':'assets/publishers/diwan.png', 'مركز نهوض للدراسات والبحوث':'assets/publishers/nahda-center.png', 'الدار الأهلية':'assets/publishers/dar-al-ahliyya.png', 'دار الأهلية':'assets/publishers/dar-al-ahliyya.png', 'الدار الأهلية للنشر والتوزيع':'assets/publishers/dar-al-ahliyya.png', 'منشورات تكوين':'assets/publishers/takween-2026.png', 'دار الكرمة':'assets/publishers/dar-al-karma-2026.png', 'الكرمة للنشر والتوزيع':'assets/publishers/dar-al-karma-2026.png', 'دار الآداب':'assets/publishers/dar-al-adab.png', 'دار الاداب':'assets/publishers/dar-al-adab.png', 'دار الآداب للنشر والتوزيع':'assets/publishers/dar-al-adab.png', 'دار التنوير':'assets/publishers/dar-al-tanweer.png', 'دار التنوير للطباعة والنشر والتوزيع':'assets/publishers/dar-al-tanweer.png', 'دار النفائس':'assets/publishers/dar-al-nafais.png', 'دار النفائس للنشر والتوزيع':'assets/publishers/dar-al-nafais.png', 'دار العين':'assets/publishers/dar-al-ain.png', 'دار العين للنشر':'assets/publishers/dar-al-ain.png', 'دار العين للنشر والتوزيع':'assets/publishers/dar-al-ain.png' };
PUBLISHER_LOGO_ASSETS['دار الفارابي'] = 'assets/publishers/al-farabi-2026.png';
PUBLISHER_LOGO_ASSETS['دار الفارابي للنشر والتوزيع'] = PUBLISHER_LOGO_ASSETS['دار الفارابي'];
const PUBLISHER_DESCRIPTIONS = {
  'آفاق للنشر والتوزيع':'دار نشر مصرية تهتم بالفكر والفلسفة والعلوم، وتنشر الأدب العربي والأعمال المترجمة.',
  'الدار العربية للعلوم ناشرون':'دار بيروتية تنشر كتباً عربية ومترجمة في الأدب والمعرفة والعلوم ومجالات الحياة.',
  'الدار المصرية اللبنانية':'دار نشر مصرية تقدم الرواية والأدب العربي والعالمي إلى جانب الكتب الفكرية والمعرفية.',
  'الشبكة العربية للأبحاث والنشر':'دار نشر تُعنى بالفكر والفلسفة والتاريخ والأدب والعلوم الإنسانية، وبالكتب البحثية والترجمات.',
  'المحروسة':'دار نشر ومركز أبحاث مصري، يصدر كتباً في الأدب والفكر والعلوم الاجتماعية والسياسة والترجمة.',
  'تمكين للأبحاث و النشر':'مركز بحثي يعنى بالدراسات والبحوث الأكاديمية والفكرية وإتاحتها للقارئ العربي.',
  'تمكين للطباعة و النشر':'دار تقدم خدمات الطباعة والنشر وإنتاج الكتب.',
  'جسور للترجمة و النشر':'دار نشر مصرية مستقلة تهتم بترجمة الأدب العالمي، إلى جانب الرواية والفلسفة والتاريخ والفنون.',
  'دار الآداب':'دار نشر لبنانية عريقة تقدم الأدب العربي والعالمي، والرواية والشعر والفكر.',
  'دار الأهلية':'دار نشر أردنية تقدم كتباً أدبية وفكرية ومراجع أكاديمية.',
  'دار التنوير':'دار نشر عربية مستقلة تنشر الأدب والفلسفة والفكر، وتعرّف القارئ العربي بأعمال مترجمة.',
  'دار العين للنشر':'دار نشر مصرية تأسست عام 2000، تهتم بالأدب والعلوم الثقافية وتدعم الأصوات الجديدة.',
  'دار الكتاب الجديد المتحدة':'دار نشر لبنانية تقدم عناوين عربية في الأدب والفكر والعلوم الإنسانية.',
  'دار الكرمة':'دار نشر عربية تأسست في القاهرة عام 2013، تصدر كتباً عربية ومترجمة في الأدب والفكر والمعرفة.',
  'دار المدار الإسلامي':'دار نشر تهتم بالتراث والفكر الإسلامي والكتب الثقافية.',
  'دار المدى':'تنشر المدى كتباً عراقية وعربية ومترجمة، من الأعمال الأدبية والكلاسيكية إلى الفكر والتاريخ والمعرفة.',
  'دار المشرق':'دار نشر لبنانية عريقة تصدر كتباً في الأدب والإنسانيات والفلسفة والروحانيات والتعليم.',
  'دار النفائس':'دار نشر لبنانية تأسست عام 1970، وتصدر كتباً في التراث والتاريخ والأدب والمعرفة.',
  'دار سطور':'دار نشر عراقية تهتم بالأدب والفكر والثقافة وتعتني بإنتاج الكتاب وإخراجه.',
  'ديوان للنشر':'دار نشر مصرية تحتفي بالحكايات والكتب العربية، وتعيد تقديم أعمال لكتّاب مثل طه حسين ونجيب محفوظ.',
  'صفحة 7':'دار نشر سعودية متخصصة في ترجمة عناوين الفلسفة والفكر والأدب.',
  'مركز نهوض للدراسات والبحوث':'مركز بحثي يعالج قضايا الفكر والواقع، ويقدم دراسات تاريخية وسياسية واجتماعية ودينية.',
  'منشورات الجمل':'دار نشر عراقية ألمانية معروفة بترجمة ونشر الأدب والفلسفة والفكر.',
  'منشورات تكوين':'دار نشر عربية تقدم عناوين في الأدب والفكر والثقافة.'
};
const newestFirst = (a, b) => String(b.created_at || b.createdAt || '').localeCompare(String(a.created_at || a.createdAt || '')) || String(b.id).localeCompare(String(a.id));
// Clear catalog caches from earlier demo/import versions once per browser. The
// cart and favorites are left intact; they already drop ids missing from the new
// catalog.
try {
  const keep = new Set(['ghazal.cacheVersion','ghazal.metaPixelId','ghazal.cart.v2','ghazal.favorites.v2']);
  if (localStorage.getItem('ghazal.cacheVersion') !== CATALOG_CACHE_VERSION) {
    Object.keys(localStorage).filter(key => key.startsWith('ghazal.') && !keep.has(key)).forEach(key => localStorage.removeItem(key));
    localStorage.setItem('ghazal.cacheVersion', CATALOG_CACHE_VERSION);
  }
} catch { /* Storage is optional. */ }

function enhanceSelect(select) {
  if (!select || select.dataset.customized) return;
  select.dataset.customized = 'true';
  const wrapper = document.createElement('div');
  wrapper.className = 'custom-select';
  select.parentNode.insertBefore(wrapper, select);
  wrapper.appendChild(select);
  select.classList.add('custom-select-native');
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'custom-select-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  const menu = document.createElement('div');
  menu.className = 'custom-select-menu';
  menu.setAttribute('role', 'listbox');
  wrapper.append(trigger, menu);
  const close = () => { wrapper.classList.remove('open'); trigger.setAttribute('aria-expanded', 'false'); };
  const sync = () => {
    const selected = select.options[select.selectedIndex];
    trigger.innerHTML = `<span>${selected?.textContent || 'اختر'}</span><i aria-hidden="true">⌄</i>`;
    trigger.disabled = select.disabled;
    menu.innerHTML = [...select.options].map((option, index) => `<button type="button" role="option" data-index="${index}" aria-selected="${option.selected}">${option.textContent}</button>`).join('');
  };
  trigger.addEventListener('click', () => { if (!select.disabled) { wrapper.classList.toggle('open'); trigger.setAttribute('aria-expanded', String(wrapper.classList.contains('open'))); } });
  trigger.addEventListener('keydown', event => { if (['Enter', ' ', 'ArrowDown'].includes(event.key)) { event.preventDefault(); trigger.click(); menu.querySelector('button')?.focus(); } });
  menu.addEventListener('click', event => { const option = event.target.closest('[data-index]'); if (!option) return; select.selectedIndex = Number(option.dataset.index); select.dispatchEvent(new Event('change', { bubbles: true })); sync(); close(); trigger.focus(); });
  new MutationObserver(sync).observe(select, { childList: true, attributes: true, subtree: true });
  select.addEventListener('change', sync);
  sync();
}
const selectObserver = new MutationObserver(() => $$('select').forEach(enhanceSelect));
selectObserver.observe(document.body, { childList: true, subtree: true });
$$('select').forEach(enhanceSelect);
document.addEventListener('click', event => { $$('.custom-select.open').forEach(wrapper => { if (!wrapper.contains(event.target)) { wrapper.classList.remove('open'); wrapper.querySelector('.custom-select-trigger')?.setAttribute('aria-expanded', 'false'); } }); });

let books = [];
let publishers = [];
let authorProfiles = {};
let genres = {};
let byId = {};
let collections = readStorage('ghazal.collections.v1', []);
collections = collections.map(collection => ({ ...collection, bookIds: (collection.bookIds || []).filter(id => byId[id]) }));
let featuredBookIds = readStorage('ghazal.featuredBooks.v1', []);
let publisherFeatures = readStorage('ghazal.publisherFeatures.v1', []);
let homeSections = readStorage('ghazal.homeSections.v1', []);
let bestSellerBookIds = [];
// Until the store has confirmed orders, the homepage best-seller carousel shows
// a random in-stock selection. The key keeps the picks stable across catalog
// refreshes while still reshuffling when the shelf itself changes.
let bestsellerFallbackIds = [];
let bestsellerFallbackKey = '';
let catalogBookGenres = [];
let authorSpotlight = null;
let catalogLoaded = false;
window.addEventListener('storage', event => { if (event.key === 'ghazal.customBooks.v1' || event.key === 'ghazal.customPublishers.v1' || event.key === 'ghazal.genres.v1' || event.key === 'ghazal.discounts.v1' || event.key === 'ghazal.collections.v1') location.reload(); });
let discounts = readStorage('ghazal.discounts.v1', []);
let activeDiscountCode = '';
let lastCatalogSignature = '';
// Auto-refresh (returning to the tab or the periodic sync) must not replay the
// entrance animations for cards that are already on screen.
let suppressRevealEntrance = false;
// Saved ids are reconciled only after the catalog arrives. Remove entries whose
// books no longer exist and persist the cleaned lists so a refresh stays stable.
function reconcileSavedItems() {
  const nextCart = cart.filter(item => byId[item.id]);
  const nextFavorites = favorites.filter(id => byId[id]);
  const changed = nextCart.length !== cart.length || nextFavorites.length !== favorites.length;
  cart = nextCart;
  favorites = nextFavorites;
  if (changed) {
    saveStorage('ghazal.cart.v2', cart);
    saveStorage('ghazal.favorites.v2', favorites);
  }
  return changed;
}
function applyCatalogPayload(payload, options = {}) {
  const signature = JSON.stringify(payload ?? null);
  // Background refreshes return the same catalog most of the time. Skipping the
  // identical payload keeps the page (and its entry animations) untouched.
  if (signature === lastCatalogSignature) return;
  suppressRevealEntrance = options.silent === true;
  try {
    books = Array.isArray(payload?.books) ? payload.books.map(book => ({ ...book, stock: Number(book.stock ?? book.available ?? 0) })) : [];
    byId = Object.fromEntries(books.map(book => [book.id, book]));
    reconcileSavedItems();
    renderCart();
    if (location.hash === '#favorites') renderFavoritesPage();
    publishers = payload?.publishers || [];
    genres = payload?.genres || {};
    catalogBookGenres = payload?.bookGenres || [];
    discounts = payload?.discounts || [];
    authorProfiles = payload?.authorProfiles || {};
    collections = payload?.collections || [];
    featuredBookIds = payload?.featuredBookIds || [];
    bestSellerBookIds = payload?.bestSellerBookIds || [];
    authorSpotlight = payload?.authorSpotlight || null;
    publisherFeatures = payload?.publisherFeatures || [];
    homeSections = Array.isArray(payload?.homeSections) ? payload.homeSections : [];
    catalogLoaded = true;
    renderCategoryUI(); renderDepartmentLinks(); renderPublisherGrid(); renderHeroArt(); renderBooks();
    renderFeaturedSelections(); renderHomeShelves(); renderHomeSections(); renderFeaturedPublishers();
    // Routes rendered before the asynchronous catalog response have no data.
    // Re-render the active catalog-backed page once the server payload arrives.
    if (location.hash === '#catalog') renderCatalogPage();
    if (location.hash === '#selections') renderSelectionsPage();
    if (location.hash === '#new') renderNewPage();
    if (location.hash === '#departments') renderDepartmentsPage();
    if (location.hash === '#publishers') renderPublishersPage();
    if (location.hash === '#bestsellers') renderBestsellersPage();
    if (location.hash === '#favorites') renderFavoritesPage();
    if (/^#(genre|collection|publisher|book|author)\//.test(location.hash)) showRoute();
    lastCatalogSignature = signature;
  } finally {
    suppressRevealEntrance = false;
  }
}
function renderHeroArt() {
  const art = document.getElementById('hero-art'); if (!art) return;
  const picks = [...new Set([...featuredBookIds, ...books.map(book => book.id)])].map(id => byId[id]).filter(book => book && (book.thumb || book.display || book.image)).slice(0, 3);
  const slots = [...art.querySelectorAll('.hero-book')];
  slots.forEach((slot, index) => {
    const book = picks[index];
    slot.hidden = !book;
    slot.innerHTML = book ? `<img class="edition-image hero-cover-image" data-view="${escapeHtml(book.id)}" src="${coverUrl(book, 'display')}" alt="غلاف ${escapeHtml(book.title)}"${index === 2 ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async" onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='assets/placeholder-cover.svg';}" />` : '';
  });
  const note = art.querySelector('.hero-art-note');
  if (note) { note.hidden = !picks.length; const counter = note.querySelector('span'); if (counter) counter.textContent = `0${Math.min(picks.length, 3)} / 0${Math.max(picks.length, 3)}`; }
}
function renderCategoryUI() {
  const entries = Object.entries(genres).filter(([, genre]) => genre && genre.title).slice(0, 6);
  const home = document.getElementById('home-filters');
  if (home) home.innerHTML = `<button class="filter${activeFilter === 'all' ? ' active' : ''}" data-filter="all">كل الكتب</button>${entries.map(([id, genre]) => `<button class="filter${activeFilter === id ? ' active' : ''}" data-filter="${escapeHtml(id)}">${escapeHtml(genre.title)}</button>`).join('')}`;
  const catalog = document.getElementById('catalog-filters');
  if (catalog) catalog.innerHTML = `<button class="${catalogFilter === 'all' ? 'active' : ''}" data-catalog-filter="all">كل الكتب</button>${entries.map(([id, genre]) => `<button class="${catalogFilter === id ? 'active' : ''}" data-catalog-filter="${escapeHtml(id)}">${escapeHtml(genre.title)}</button>`).join('')}`;
}
function renderDepartmentLinks() {
  const target = document.getElementById('department-links'); if (!target) return;
  const entries = Object.entries(genres).filter(([, genre]) => genre && genre.title);
  const links = entries.map(([id, genre], index) => `<a href="#genre/${encodeURIComponent(id)}"><span class="dep-num">${String(index + 1).padStart(2, '0')}</span><span>${escapeHtml(genre.title)}<small>${escapeHtml(genre.description || '')}</small></span><b>↖</b></a>`);
  links.push(`<a href="#bestsellers"><span class="dep-num">${String(entries.length + 1).padStart(2, '0')}</span><span>الأكثر قراءة<small>كتب أحبّها القراء</small></span><b>↖</b></a>`);
  target.innerHTML = links.join('');
}
function publisherLogoPath(publisher) {
  const name = String(publisher?.name || '').trim();
  if (name === 'دار المشرق' || name === 'صفحة 7' || name === 'دار سطور' || name === 'منشورات تكوين' || name === 'دار الكرمة' || name === 'الكرمة للنشر والتوزيع' || name === 'دار الفارابي' || name === 'دار الفارابي للنشر والتوزيع') return PUBLISHER_LOGO_ASSETS[name] || '';
  return (publisher?.logo && /^(data:|\/|https?:|assets\/)/i.test(publisher.logo) ? publisher.logo : '') || PUBLISHER_LOGO_ASSETS[name] || '';
}
function publisherDescription(publisher) {
  const description = String(publisher?.description || '').trim();
  return description && description !== 'إصدارات من هذا الناشر.' ? description : (PUBLISHER_DESCRIPTIONS[publisher?.name] || 'دار نشر تقدم عناوين عربية في الأدب والثقافة والمعرفة.');
}
function publisherMark(publisher) {
  const path = publisherLogoPath(publisher);
  if (path) return `<span class="publisher-monogram publisher-monogram--image${path.includes('al-madar-al-islami') ? ' publisher-monogram--circle publisher-monogram--small' : ''}${path.includes('tamkeen-research') || path.includes('dar-al-ahliyya') || path.includes('dar-al-tanweer') || path.includes('dar-sutoor') ? ' publisher-monogram--color' : ''}${path.includes('dar-al-mashriq') ? ' publisher-monogram--mashriq' : ''}${path.includes('arab-scientific') || path.includes('dar-sutoor') || path.includes('diwan') ? ' publisher-monogram--wide' : ''}${path.includes('dar-al-ain') || path.includes('nahda-center') || path.includes('takween') ? ' publisher-monogram--slightly-large' : ''}${path.includes('arab-network') ? ' publisher-monogram--small' : ''}${path.includes('safha') || path.includes('alkitab-aljadeed') || path.includes('afaq-books') || path.includes('dar-al-adab') || path.includes('al-mada.png') || path.includes('jisoor') || path.includes('dar-al-karma') || path.includes('al-jamal') ? ' publisher-monogram--slightly-small' : ''}${path.includes('dar-al-nafais') ? ' publisher-monogram--nafais' : ''}"><img src="${escapeHtml(path)}" alt="" loading="lazy" decoding="async" /></span>`;
  const mark = publisher?.logo && !/^(data:|\/|https?:|assets\/)/i.test(publisher.logo) ? publisher.logo : publisher?.name?.slice(0, 1) || '';
  return `<span class="publisher-monogram">${escapeHtml(mark)}</span>`;
}
function publisherCardClass(publisher) {
  const name = String(publisher?.name || '').trim();
  if (name === 'صفحة 7') return ' publisher--compact-logo publisher--safha';
  return ['آفاق للنشر والتوزيع','افاق للنشر والتوزيع','آفاق للنشر و التوزيع','افاق للنشر و التوزيع','دار الكتاب الجديد المتحدة'].includes(name) ? ' publisher--compact-logo' : '';
}
function renderPublisherGrid() {
  const section = document.getElementById('publishers'); const target = document.getElementById('home-publisher-grid');
  if (!section || !target) return;
  const list = publishers.filter(publisher => publisher && publisher.name).slice(0, 8);
  section.hidden = !list.length;
  target.innerHTML = list.map(publisher => `<a class="publisher${publisherCardClass(publisher)}" href="#publisher/${encodeURIComponent(publisher.name)}">${publisherMark(publisher)}<strong>${escapeHtml(publisher.name)}</strong><small>${escapeHtml(publisher.since || publisher.city || '')}</small></a>`).join('');
}
if (window.location.protocol !== 'file:' && window.GhazalAPI?.catalog) window.GhazalAPI.catalog().then(applyCatalogPayload).catch(() => {});
if (window.location.protocol !== 'file:' && window.GhazalAPI?.catalog) {
  const refreshLiveCatalog = () => window.GhazalAPI.catalog().then(payload => applyCatalogPayload(payload, { silent: true })).catch(() => {});
  setInterval(refreshLiveCatalog, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshLiveCatalog(); });
}
function discountFor(book, code = '') { return discounts.filter(discount => discount.active !== false && (code ? String(discount.code || '').trim().toUpperCase() === code.trim().toUpperCase() : !String(discount.code || '').trim()) && (discount.appliesToAll || (discount.bookIds || []).includes(book.id))).sort((a, b) => { const amount = item => item.type === 'fixed' ? Number(item.value || 0) : book.price * Number(item.value || 0) / 100; return amount(b) - amount(a); })[0] || null; }
function discountedPrice(book, code = activeDiscountCode) { const discount = discountFor(book, code); if (!discount) return Number(book.price); const saving = discount.type === 'fixed' ? Number(discount.value || 0) : Number(book.price) * Number(discount.value || 0) / 100; return Math.max(0, Number(book.price) - saving); }
function priceHtml(book) { const price = discountedPrice(book); return price < Number(book.price) ? `<s class="old-price">${money(book.price)}</s><strong class="sale-price">${money(price)}</strong>` : money(book.price); }
const coverPath = value => { const source = String(value || '').trim(); if (!source) return ''; return source.startsWith('data:') || source.startsWith('/') || /^https?:\/\//i.test(source) ? source : `assets/covers/${source}`; };
// Cards request `thumb`, the book page requests `display`; both fall back to the
// stored original. Covers are immutable files, so browsers cache them forever.
const DEFAULT_COVER = 'assets/placeholder-cover.svg?v=20261103-2';
const isDefaultCover = book => { const source = String(book?.thumb || book?.display || book?.image || '').trim(); return !source || source.includes('placeholder-cover.svg'); };
const coverUrl = (book, size = 'thumb') => coverPath(size === 'display' ? (book?.display || book?.image) : (book?.thumb || book?.display || book?.image)) || DEFAULT_COVER;
const money = value => `${new Intl.NumberFormat('ar-DZ-u-nu-latn').format(value)} د.ج`;
const wilayas = `1|Adrar|1100|500,2|Chlef|800|400,3|Laghouat|800|400,4|Oum El Bouaghi|700|400,5|Batna|650|400,6|Béjaïa|700|400,7|Biskra|650|400,8|Béchar|1050|400,9|Blida|750|400,10|Bouira|750|400,11|Tamanrasset|1050|400,12|Tébessa|650|400,13|Tlemcen|800|400,14|Tiaret|800|400,15|Tizi Ouzou|750|400,16|Alger|600|400,17|Djelfa|800|400,18|Jijel|700|400,19|Sétif|700|400,20|Saïda|800|400,21|Skikda|700|400,22|Sidi Bel Abbès|800|400,23|Annaba|700|400,24|Guelma|700|400,25|Constantine|700|400,26|Médéa|750|400,27|Mostaganem|800|400,28|M'Sila|750|400,29|Mascara|800|400,30|Ouargla|750|400,31|Oran|850|400,32|El Bayadh|1000|500,33|Illizi|1400|700,34|Bordj Bou Arreridj|700|400,35|Boumerdès|750|400,36|El Tarf|700|400,37|Tindouf|1400|700,38|Tissemsilt|850|450,39|El Oued|450|350,40|Khenchela|700|400,41|Souk Ahras|700|400,42|Tipaza|750|400,43|Mila|700|400,44|Aïn Defla|850|450,45|Naâma|950|500,46|Aïn Témouchent|850|450,47|Ghardaïa|850|400,48|Relizane|850|450,49|Timimoun|1050|550,50|Bordj Badji Mokhtar|1800|800,51|Ouled Djellal|650|550,52|Beni Abbes|1050|550,53|In Salah|1350|750,54|In Guezzam|1350|750,55|Touggourt|650|400,56|Djanet|1800|800,57|El M'Ghair|650|500,58|El Meniaa|950|550`.split(',').map(row => {
  const [code, name, home, office] = row.split('|').map((value, index) => index < 2 ? value : Number(value));
  const service = { home, office };
  return { code: Number(code), name, rates: { delivery: service, pickup: service, exchange: service, refund: { home: 0, office: 0 }, returned: { home: 0, office: 0 } } };
});
const wilayaByCode = Object.fromEntries(wilayas.map(wilaya => [wilaya.code, wilaya]));
let communes = Array.isArray(window.GHAZAL_COMMUNES) ? window.GHAZAL_COMMUNES : [];
let stopDeskCommuneIds = new Set();
fetch('/api/shipping-options').then(response=>response.ok?response.json():{}).then(data=>{stopDeskCommuneIds=new Set(data.stopDeskCommuneIds||[]);updateStopDeskAvailability();}).catch(()=>{});
const communesReady = communes.length ? Promise.resolve(communes) : fetch('data/algeria-communes-58-wilayas.json').then(response => response.ok ? response.json() : []).then(data => { communes = data; populateCommunes(); return communes; }).catch(() => { communes = []; return communes; });
const ECOTRACK_COLUMNS = [
  'reference commande', 'nom et prenom du destinataire*', 'telephone*', 'telephone 2', 'code wilaya*', 'wilaya de livraison', 'commune de livraison*', 'adresse de livraison*', 'produit*', 'poids (kg)', 'montant du colis*', 'remarque',
  'FRAGILE\n( si oui mettez OUI sinon laissez vide )', 'ECHANGE\n( si oui mettez OUI sinon laissez vide )', 'PICK UP\n( si oui mettez OUI sinon laissez vide )', 'RECOUVREMENT\n( si oui mettez OUI sinon laissez vide )', 'STOP DESK\n( si oui mettez OUI sinon laissez vide )', 'Lien map'
];
function readStorage(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function saveStorage(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage is optional in the demo. */ } }
function trackMeta(eventName, params = {}) {
  if (typeof window.fbq === 'function') window.fbq('track', eventName, params, params.event_id ? { eventID: params.event_id } : undefined);
  window.dispatchEvent(new CustomEvent('ghazal:analytics', { detail: { eventName, params } }));
}
function installMetaPixel() {
  const pixelId = String(document.documentElement.dataset.metaPixelId || readStorage('ghazal.metaPixelId', '')).trim();
  if (!pixelId || typeof window.fbq === 'function') return;
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  window.fbq('init', pixelId); window.fbq('track', 'PageView');
}
installMetaPixel();

// Do not drop saved items against byId here: the catalog is fetched
// asynchronously, so byId is still empty on first load and every saved item
// would be discarded. Keep the stored ids until applyCatalogPayload knows which
// books still exist, then reconcile once.
let cart = readStorage('ghazal.cart.v2', []).filter(item => item && item.id != null && Number.isInteger(item.qty) && item.qty > 0);
let favorites = [...new Set(readStorage('ghazal.favorites.v2', []).filter(id => id != null))];
let activeFilter = 'all';
let showAllBooks = false;
let checkoutStep = 1;
let checkoutData = null;
let revealObserver;

function cardTemplate(book, index) {
  const saved = favorites.includes(book.id);
  const available = Number(book.stock) > 0;
  return `<article class="book-card ${available ? '' : 'is-unavailable'}" data-id="${book.id}" data-category="${book.category}" style="--stagger:${(index % 4) * 65}ms">
    <a class="book-card-art" data-view="${book.id}" href="#book/${encodeURIComponent(book.id)}" aria-label="اعرض تفاصيل ${book.title}"><img class="edition-image catalog-cover" src="${coverUrl(book)}" alt="غلاف ${book.title}" loading="lazy" decoding="async" onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='assets/placeholder-cover.svg';}" /><span class="quick-view">نظرة أقرب <span aria-hidden="true">↖</span></span></a>
    <div class="book-meta"><span>${available ? book.genre : 'غير متوفر حاليًا'}</span><button class="favorite" data-favorite="${book.id}" aria-label="${saved ? 'أزل من المحفوظات' : 'احفظ'} ${book.title}" aria-pressed="${saved}">${saved ? '♥' : '♡'}</button></div>
    <h3><button data-view="${book.id}">${book.title}</button></h3><p>${book.author}</p><div class="card-bottom"><span class="price">${priceHtml(book)}</span>${available ? `<button class="card-add" data-add="${book.id}" aria-label="أضف ${book.title} إلى السلة">أضف إلى السلة <span aria-hidden="true">↖</span></button>` : '<span class="stock-empty">نفد المخزون</span>'}</div>
  </article>`;
}
function shelfCardTemplate(book) {
  const saved = favorites.includes(book.id);
  const available = Number(book.stock) > 0;
  return `<article class="shelf-card${available ? '' : ' is-unavailable'}" data-id="${book.id}" data-category="${book.category}">
    <div class="shelf-card-media"><a class="shelf-card-cover" data-view="${book.id}" href="#book/${encodeURIComponent(book.id)}" aria-label="اعرض تفاصيل ${book.title}"><img class="catalog-cover" src="${coverUrl(book)}" alt="غلاف ${book.title}" loading="lazy" decoding="async" onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='assets/placeholder-cover.svg';}" /></a><button class="favorite shelf-card-fav" data-favorite="${book.id}" aria-label="${saved ? 'أزل من المحفوظات' : 'احفظ'} ${book.title}" aria-pressed="${saved}">${saved ? '♥' : '♡'}</button></div>
    <div class="shelf-card-body"><h3><button data-view="${book.id}">${book.title}</button></h3><p>${book.author}</p><span class="price">${priceHtml(book)}</span></div>
    ${available ? `<button class="shelf-card-add" data-add="${book.id}" aria-label="أضف ${book.title} إلى السلة">أضف إلى السلة <span aria-hidden="true">＋</span></button>` : '<span class="shelf-card-add shelf-card-empty">نفد المخزون</span>'}
  </article>`;
}
function renderShelfGrid(targetId, list) {
  const target = document.getElementById(targetId); if (!target) return;
  const items = list.filter(Boolean).slice(0, 12);
  target.innerHTML = items.length ? `<div class="shelf-grid">${items.map(shelfCardTemplate).join('')}</div>` : '';
}
function bestsellerFallbackBooks() {
  const key = books.map(book => String(book.id)).join('|');
  if (key !== bestsellerFallbackKey) {
    bestsellerFallbackKey = key;
    const inStock = books.filter(book => Number(book.stock) > 0);
    bestsellerFallbackIds = shuffleBooks(inStock.length ? inStock : books).slice(0, 8).map(book => book.id);
  }
  return bestsellerFallbackIds.map(id => byId[id]).filter(Boolean);
}
function shuffleBooks(list) {
  const pool = [...list];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [pool[index], pool[swap]] = [pool[swap], pool[index]];
  }
  return pool;
}
// The "قراءة جميلة بسعر هادئ" shelf reshuffles on every visit so the same
// inexpensive titles do not sit there forever. The page-load cache keeps the
// order stable while the catalog refreshes in the background.
let valueShelfIds = [];
let valueShelfKey = '';
function valueShelfBooks(candidates) {
  const key = candidates.map(book => String(book.id)).join('|');
  if (key !== valueShelfKey) {
    valueShelfKey = key;
    valueShelfIds = shuffleBooks(candidates).map(book => book.id);
  }
  return valueShelfIds.map(id => byId[id]).filter(Boolean);
}
function shelfStep(viewport) {
  const card = viewport.querySelector('.shelf-card');
  const track = viewport.querySelector('.shelf-carousel-track');
  const gap = parseFloat(track ? getComputedStyle(track).columnGap : '0') || 12;
  return card ? card.getBoundingClientRect().width + gap : 0;
}
function syncShelfCount(carousel) {
  const viewport = carousel?.querySelector('.shelf-carousel-viewport');
  const count = carousel?.querySelector('.shelf-carousel-count');
  if (!viewport || !count) return;
  const step = shelfStep(viewport);
  if (!step) return;
  const total = viewport.querySelectorAll('.shelf-card').length;
  const maxScroll = viewport.scrollWidth - viewport.clientWidth;
  const progress = maxScroll > 4 ? Math.min(1, Math.abs(viewport.scrollLeft) / maxScroll) : 0;
  const index = Math.min(total, Math.round(progress * (total - 1)) + 1);
  count.textContent = `${index} / ${total}`;
  carousel.classList.toggle('is-scrollable', maxScroll > 4);
  carousel.querySelectorAll('.shelf-carousel-arrow').forEach(arrow => { arrow.disabled = maxScroll <= 4; });
}
// Carousel controls used to stay invisible until the first scroll because the
// shelf was measured before cards had finished laying out. Observe the track and
// re-check after paint, fonts, images, and container resizes.
const shelfSizeWatcher = typeof ResizeObserver === 'function' ? new ResizeObserver(entries => {
  for (const entry of entries) {
    const carousel = entry.target.closest('.shelf-carousel');
    if (carousel) syncShelfCount(carousel);
  }
}) : null;
function watchShelfCarousel(carousel) {
  const viewport = carousel.querySelector('.shelf-carousel-viewport');
  const track = carousel.querySelector('.shelf-carousel-track');
  const refresh = () => syncShelfCount(carousel);
  requestAnimationFrame(refresh);
  setTimeout(refresh, 120);
  if (shelfSizeWatcher && viewport) { shelfSizeWatcher.observe(viewport); if (track) shelfSizeWatcher.observe(track); }
  viewport?.querySelectorAll('img').forEach(image => { if (!image.complete) image.addEventListener('load', refresh, { once: true }); });
}
function renderCarousel(targetId, carouselId, list, limit = 12) {
  const target = document.getElementById(targetId); if (!target) return;
  target.querySelectorAll('.shelf-carousel-viewport,.shelf-carousel-track').forEach(element => shelfSizeWatcher?.unobserve(element));
  const items = list.filter(Boolean).slice(0, limit);
  if (!items.length) { target.innerHTML = ''; return; }
  target.innerHTML = `<div class="shelf-carousel" data-carousel="${carouselId}"><div class="shelf-carousel-viewport" tabindex="0" role="group" aria-label="رف كتب قابل للتمرير"><div class="shelf-carousel-track">${items.map(shelfCardTemplate).join('')}</div></div><div class="shelf-carousel-controls" dir="rtl"><button class="shelf-carousel-arrow" type="button" data-shelf-prev="${carouselId}" aria-label="الكتب السابقة">→</button><span class="shelf-carousel-count" aria-live="polite">1 / ${items.length}</span><button class="shelf-carousel-arrow" type="button" data-shelf-next="${carouselId}" aria-label="الكتب التالية">←</button></div></div>`;
  const carousel = target.querySelector('.shelf-carousel');
  const viewport = carousel.querySelector('.shelf-carousel-viewport');
  viewport.addEventListener('scroll', () => syncShelfCount(carousel), { passive: true });
  syncShelfCount(carousel);
  watchShelfCarousel(carousel);
}
window.addEventListener('resize', () => $$('.shelf-carousel').forEach(syncShelfCount));
window.addEventListener('load', () => $$('.shelf-carousel').forEach(syncShelfCount));
if (document.fonts?.ready) document.fonts.ready.then(() => $$('.shelf-carousel').forEach(syncShelfCount));
document.addEventListener('click', event => {
  const button = event.target.closest('[data-shelf-prev], [data-shelf-next]'); if (!button) return;
  const carousel = button.closest('.shelf-carousel');
  const viewport = carousel?.querySelector('.shelf-carousel-viewport');
  if (!viewport) return;
  const step = shelfStep(viewport); if (!step) return;
  viewport.scrollBy({ left: button.dataset.shelfNext ? -step : step, behavior: 'smooth' });
});
let shelfDrag = null;
let shelfDragBlocked = false;
document.addEventListener('pointerdown', event => {
  const viewport = event.target.closest('.shelf-carousel-viewport');
  if (!viewport || event.pointerType !== 'mouse' || event.button !== 0) return;
  shelfDrag = { viewport, startX: event.clientX, startScroll: viewport.scrollLeft, moved: false };
});
document.addEventListener('pointermove', event => {
  if (!shelfDrag) return;
  const dx = event.clientX - shelfDrag.startX;
  if (!shelfDrag.moved) {
    if (Math.abs(dx) < 6) return;
    shelfDrag.moved = true;
    shelfDrag.viewport.classList.add('is-dragging');
  }
  shelfDrag.viewport.scrollLeft = shelfDrag.startScroll - dx;
  document.getSelection()?.removeAllRanges();
  event.preventDefault();
});
function endShelfDrag() {
  if (!shelfDrag) return;
  const { viewport, moved } = shelfDrag;
  shelfDrag = null;
  if (!moved) return;
  viewport.classList.remove('is-dragging');
  const step = shelfStep(viewport);
  if (step) viewport.scrollTo({ left: Math.round(viewport.scrollLeft / step) * step, behavior: 'smooth' });
  shelfDragBlocked = true;
  setTimeout(() => { shelfDragBlocked = false; }, 0);
}
document.addEventListener('pointerup', endShelfDrag);
document.addEventListener('pointercancel', endShelfDrag);
document.addEventListener('dragstart', event => { if (event.target.closest('.shelf-carousel-viewport')) event.preventDefault(); });
document.addEventListener('click', event => {
  if (!shelfDragBlocked || !event.target.closest('.shelf-carousel-viewport')) return;
  event.preventDefault();
  event.stopPropagation();
}, true);
function renderBooks() {
  if (activeFilter !== 'all' && !genres[activeFilter]) activeFilter = 'all';
  const filtered = (activeFilter === 'all' ? books : books.filter(book => book.category === activeFilter)).slice().sort(newestFirst);
  renderCarousel('book-grid', 'new-arrivals', filtered.slice(0, 8));
}
function applyFilter(filter) {
  activeFilter = filter;
  showAllBooks = false;
  $$('.filter').forEach(button => button.classList.toggle('active', button.dataset.filter === filter));
  renderBooks();
}
document.addEventListener('click', event => { const button = event.target.closest('.filter[data-filter]'); if (button) applyFilter(button.dataset.filter); });
$$('[data-select]').forEach(link => link.addEventListener('click', () => applyFilter(link.dataset.select)));
renderBooks();

function showOverlay(id) {
  const overlay = document.getElementById(id);
  overlay.hidden = false;
  document.body.classList.add('modal-open');
  setTimeout(() => (id === 'search-overlay' ? $('#search-input') : overlay.querySelector('input:not([type="hidden"]),button'))?.focus(), 40);
}
function hideOverlay(id) {
  document.getElementById(id).hidden = true;
  if (!$$('.overlay:not([hidden])').length) document.body.classList.remove('modal-open');
}
function switchOverlay(from, to) { hideOverlay(from); showOverlay(to); }
$('#search-open').addEventListener('click', () => showOverlay('search-overlay'));
$('#cart-open').addEventListener('click', () => showOverlay('cart-overlay'));
$$('[data-close]').forEach(button => button.addEventListener('click', () => hideOverlay(button.dataset.close)));
$$('.overlay').forEach(overlay => overlay.addEventListener('click', event => { if (event.target === overlay) hideOverlay(overlay.id); }));
document.addEventListener('keydown', event => { if (event.key === 'Escape') { $$('.overlay:not([hidden])').forEach(overlay => hideOverlay(overlay.id)); if (document.getElementById('cover-zoom-overlay')) { document.getElementById('cover-zoom-overlay').remove(); document.body.classList.remove('cover-zoom-open'); } } });

document.body.insertAdjacentHTML('beforeend', '<div id="site-toast" class="site-toast" role="status" aria-live="polite"></div>');
function toast(message) {
  const element = $('#site-toast');
  element.textContent = message;
  element.classList.add('visible');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove('visible'), 2800);
}
const cartCount = () => cart.reduce((sum, item) => sum + item.qty, 0);
const subtotal = () => cart.reduce((sum, item) => { const book = byId[item.id]; return book ? sum + discountedPrice(book) * item.qty : sum; }, 0);
const originalSubtotal = () => cart.reduce((sum, item) => { const book = byId[item.id]; return book ? sum + book.price * item.qty : sum; }, 0);
const discountTotal = () => originalSubtotal() - subtotal();
function syncCart() { saveStorage('ghazal.cart.v2', cart); renderCart(); }
function changeQuantity(id, delta) {
  const book = byId[id];
  if (!book) return;
  const item = cart.find(entry => entry.id === id);
  if (!item && delta > 0) { if (Number(book.stock) <= 0) { toast('هذا الكتاب غير متوفر حاليًا'); return; } cart.push({ id, qty: 1 }); }
  else if (item) { item.qty += delta; if (item.qty <= 0) cart = cart.filter(entry => entry.id !== id); }
  syncCart();
}
$('.cart-footer').innerHTML = `<div class="cart-totals"><span>المجموع الفرعي</span><strong id="cart-subtotal">٠ د.ج</strong></div><p>تُحسب رسوم التوصيل في الخطوة التالية. الدفع نقدًا عند الاستلام.</p><div class="cart-footer-actions"><button id="cart-clear" class="button button-outline" type="button">إفراغ السلة</button><button id="cart-order" class="button button-dark" type="button">متابعة إلى إتمام الطلب <span aria-hidden="true">↖</span></button></div>`;
function renderCart() {
  const count = cartCount();
  const items = cart.map(({ id, qty }) => ({ id, qty, book: byId[id] })).filter(item => item.book);
  $('#cart-count').textContent = count;
  $('#cart-open').setAttribute('aria-label', `سلة الكتب، ${count} كتاب`);
  $('#cart-items').innerHTML = items.length ? items.map(({ id, qty, book }) => {
    return `<div class="cart-item"><button class="cart-book-link" data-view="${id}" aria-label="اعرض تفاصيل ${book.title}"><img src="${coverUrl(book)}" alt="" /><span><strong>${book.title}</strong><small>${book.author}</small></span></button><div class="cart-item-copy"><span>${priceHtml(book)}</span><div class="quantity-control"><button data-qty="-1" data-id="${id}" aria-label="أنقص ${book.title}">−</button><output>${qty}</output><button data-qty="1" data-id="${id}" aria-label="زد ${book.title}">+</button></div></div><button class="remove-item" data-remove="${id}" aria-label="احذف ${book.title}">×</button></div>`;
  }).join('') : '<div class="empty-cart"><span>✦</span><p>سلتك تنتظر كتابًا جيدًا.</p><a href="#new" data-close="cart-overlay">تصفّح الكتب <span>↖</span></a></div>';
  $('#cart-subtotal').textContent = money(items.length ? subtotal() : 0);
  $('#cart-order').disabled = items.length === 0;
  $$('[data-close]', $('#cart-items')).forEach(link => link.addEventListener('click', () => hideOverlay('cart-overlay')));
}
renderCart();
$('#cart-items').addEventListener('click', event => {
  const quantity = event.target.closest('[data-qty]');
  const remove = event.target.closest('[data-remove]');
  if (quantity) changeQuantity(quantity.dataset.id, Number(quantity.dataset.qty));
  if (remove) { cart = cart.filter(entry => entry.id !== remove.dataset.remove); syncCart(); }
});
$('#cart-clear').addEventListener('click', () => { if (!cart.length) return; cart = []; syncCart(); toast('أُفرغت السلة'); });

document.body.insertAdjacentHTML('beforeend', `
  <div class="overlay" id="product-overlay" hidden><div class="product-panel" role="dialog" aria-modal="true" aria-label="تفاصيل الكتاب"><button class="close-button" data-close="product-overlay" aria-label="إغلاق">×</button><div id="product-detail"></div></div></div>
  <div class="overlay checkout-overlay" id="checkout-overlay" hidden><div class="checkout-panel" role="dialog" aria-modal="true" aria-label="إتمام طلب الكتب">
    <button class="close-button" data-close="checkout-overlay" aria-label="إغلاق">×</button>
    <p class="eyebrow">الغزال للكتب / إتمام الطلب</p><h2>من رفوفنا <em>إلى بابك.</em></h2>
    <div class="demo-notice"><span>✦</span> معاينة تجريبية: تُحفظ الطلبات على هذا الجهاز فقط، ولا تُرسل إلى متجر.</div>
    <div class="checkout-steps"><span data-step-label="1">١ · بيانات التوصيل</span><span data-step-label="2">٢ · مراجعة الطلب</span><span data-step-label="3">٣ · التأكيد</span></div>
    <div class="checkout-body">
      <section class="checkout-step" data-step="1"><form id="checkout-form"><div class="field-pair"><label>الاسم واللقب <input name="customer" autocomplete="name" required minlength="3" placeholder="الاسم كما يظهر على الطرد" /></label><label>رقم الهاتف <input name="phone" type="tel" autocomplete="tel" required minlength="10" maxlength="10" placeholder="05xxxxxxxx" /></label></div><div class="field-pair"><label>الولاية <select name="wilayaCode" required>${wilayas.map(wilaya => `<option value="${wilaya.code}" ${wilaya.code === 16 ? 'selected' : ''}>${String(wilaya.code).padStart(2, '0')} — ${wilaya.name}</option>`).join('')}</select></label><label>البلدية <select name="commune" id="commune-select" autocomplete="address-level3" required disabled><option value="">جار تحميل البلديات…</option></select></label></div><label>العنوان التفصيلي (اختياري)<input name="address" type="text" autocomplete="street-address" placeholder="الحي، الشارع، رقم المنزل أو أي تفاصيل إضافية" /></label><fieldset class="delivery-field"><legend>طريقة التوصيل</legend><label><input type="radio" name="shipmentType" value="home" checked /><span><strong>التوصيل للمنزل</strong><small id="home-shipping-price"></small></span></label><label><input type="radio" name="shipmentType" value="office" /><span><strong>التوصيل للمكتب</strong><small id="office-shipping-price"></small></span></label></fieldset><small id="office-shipping-note" class="delivery-note" role="status">اختر البلدية لمعرفة توفر مكتب التوصيل.</small><button class="button button-dark checkout-primary" type="submit">مراجعة الطلب <span>↖</span></button></form></section>
      <section class="checkout-step" data-step="2" hidden><div id="checkout-review"></div><div class="checkout-actions"><button id="checkout-back" class="button button-outline" type="button">تعديل البيانات <span>→</span></button><button id="checkout-confirm" class="button button-dark" type="button">تأكيد الطلب <span>↖</span></button></div></section>
      <section class="checkout-step" data-step="3" hidden><div class="confirmation"><span class="confirmation-star">✦</span><h3>وصل طلبك إلى دفتر الغزال.</h3><p>احتفظ برقم الطلب لمتابعة حالته من أي جهاز.</p><div id="order-receipt"></div><label class="order-lookup">متابعة طلب سابق<input id="order-lookup-reference" placeholder="GZ-..." autocomplete="off" /><button id="order-lookup-button" class="button button-outline" type="button">بحث عن الطلب</button></label><p id="order-lookup-result" class="owner-note" aria-live="polite"></p><button id="checkout-done" class="button button-dark" type="button">العودة إلى الكتب <span>↖</span></button></div></section>
    </div>
  </div></div>`);
$$('#checkout-form input[name="delivery"]').forEach(input => { input.checked = false; input.required = true; });
$('#checkout-form .checkout-primary').insertAdjacentHTML('beforebegin', '<div class="coupon-box"><label for="discount-code">رمز الخصم (اختياري)<div class="coupon-entry"><input id="discount-code" name="discountCode" type="text" maxlength="40" placeholder="أدخل الرمز إن كان لديك" autocomplete="off" /><button id="apply-discount" type="button">تطبيق</button></div></label><small id="discount-message">يمكنك متابعة الطلب بدون رمز خصم.</small></div>');
$('#checkout-form [name="wilayaCode"]').addEventListener('change', () => { updateShippingQuote(); populateCommunes(); });
$$('#checkout-form [name="shipmentType"]').forEach(input => input.addEventListener('change', updateShippingQuote));
$('#apply-discount').addEventListener('click', () => { const code = $('#discount-code').value.trim().toUpperCase(); if (!code) { activeDiscountCode = ''; $('#discount-message').textContent = 'يمكنك متابعة الطلب بدون رمز خصم.'; syncCart(); return; } const valid = cart.some(item => discountFor(byId[item.id], code)); if (!valid) { activeDiscountCode = ''; $('#discount-message').textContent = 'رمز الخصم غير صالح أو لا ينطبق على كتبك.'; syncCart(); return; } activeDiscountCode = code; $('#discount-message').textContent = `تم تطبيق رمز الخصم ${code}.`; syncCart(); });
['product-overlay', 'checkout-overlay'].forEach(id => {
  const overlay = document.getElementById(id);
  overlay.addEventListener('click', event => { if (event.target === overlay) hideOverlay(id); });
  $('[data-close]', overlay).addEventListener('click', () => hideOverlay(id));
});

function openProduct(id) {
  if (byId[id]) { location.hash = `#book/${encodeURIComponent(id)}`; trackMeta('ViewContent', { content_type: 'product', content_ids: [id], content_name: byId[id].title, value: Number(byId[id].price), currency: 'DZD' }); }
}
function flyBookToCart(button) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const source = button.closest('.book-card, .shelf-card')?.querySelector('.catalog-cover') || button.closest('.book-detail')?.querySelector('.book-detail-cover img') || button.closest('.selection-item')?.querySelector('.selection-cover-image, .edition-image, .cover') || button.closest('.feature-story')?.querySelector('.feature-selection-cover img');
  const target = $('#cart-open');
  if (!source || !target) return;
  const sourceRect = source.getBoundingClientRect();
  if (!sourceRect.width || !sourceRect.height) return;
  const rawTargetRect = target.getBoundingClientRect();
  const targetVisible = rawTargetRect.bottom > 0 && rawTargetRect.top < window.innerHeight && rawTargetRect.right > 0 && rawTargetRect.left < window.innerWidth;
  const targetRect = targetVisible ? rawTargetRect : { left: window.innerWidth - 58, top: 12, width: 34, height: 34 };
  const clone = source.cloneNode(true);
  const size = Math.min(sourceRect.width, 150);
  clone.classList.add('fly-book');
  clone.setAttribute('aria-hidden', 'true');
  clone.style.left = `${sourceRect.left}px`;
  clone.style.top = `${sourceRect.top}px`;
  clone.style.width = `${size}px`;
  clone.style.height = `${Math.max(72, size * (sourceRect.height / Math.max(sourceRect.width, 1)))}px`;
  const flyX = targetRect.left + targetRect.width / 2 - (sourceRect.left + sourceRect.width / 2);
  const flyY = targetRect.top + targetRect.height / 2 - (sourceRect.top + sourceRect.height / 2);
  const distance = Math.hypot(flyX, flyY);
  const duration = Math.min(1.75, Math.max(1.05, 0.92 + distance / 900));
  clone.style.setProperty('--fly-x', `${flyX}px`);
  clone.style.setProperty('--fly-y', `${flyY}px`);
  clone.style.setProperty('--fly-duration', `${duration}s`);
  document.body.appendChild(clone);
  requestAnimationFrame(() => clone.classList.add('is-flying'));
  setTimeout(() => clone.remove(), (duration + .12) * 1000);
}
document.addEventListener('click', event => {
  const zoom = event.target.closest('[data-zoom-cover]'); if (zoom) { openCoverZoom(zoom); return; }
  const view = event.target.closest('[data-view]');
  const add = event.target.closest('[data-add]');
  const favorite = event.target.closest('[data-favorite]');
  if (view) {
    if (!$('#cart-overlay').hidden) hideOverlay('cart-overlay');
    openProduct(view.dataset.view);
  }
  if (add) {
    const id = add.dataset.add;
    if (!byId[id]) return;
    flyBookToCart(add);
    changeQuantity(id, 1);
    trackMeta('AddToCart', { content_type: 'product', content_ids: [id], content_name: byId[id].title, value: Number(byId[id].price), currency: 'DZD' });
    if (!$('#product-overlay').hidden) hideOverlay('product-overlay');
    toast(`أضفنا «${byId[id].title}» إلى سلتك`);
    $('#cart-open').classList.remove('cart-bump');
    void $('#cart-open').offsetWidth;
    $('#cart-open').classList.add('cart-bump');
    $('#cart-count').classList.remove('cart-count-pop');
    void $('#cart-count').offsetWidth;
    $('#cart-count').classList.add('cart-count-pop');
  }
  if (favorite) {
    const id = favorite.dataset.favorite;
    favorites = favorites.includes(id) ? favorites.filter(value => value !== id) : [...favorites, id];
    saveStorage('ghazal.favorites.v2', favorites);
    const saved = favorites.includes(id);
    $$('[data-favorite]').filter(button => button.dataset.favorite === id).forEach(button => {
      button.setAttribute('aria-pressed', String(saved));
      button.setAttribute('aria-label', `${saved ? 'أزل من المحفوظات' : 'احفظ'} ${byId[id].title}`);
      // The book page shows a labelled toggle, shelf cards show only the heart.
      const icon = button.querySelector('[data-favorite-icon]');
      if (icon) icon.textContent = saved ? '♥' : '♡'; else button.textContent = saved ? '♥' : '♡';
      const label = button.querySelector('[data-favorite-label]');
      if (label) label.textContent = saved ? 'في محفوظاتك' : 'أحفظ في محفوظاتي';
    });
    if (location.hash === '#favorites') renderFavoritesPage();
    toast(saved ? 'أُضيف إلى محفوظاتك' : 'أُزيل من محفوظاتك');
  }
});
document.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { const target = event.target.closest('[data-view]'); if (target && !event.target.closest('button[data-add]')) { event.preventDefault(); openProduct(target.dataset.view); } } });

$('#cart-order').addEventListener('click', () => {
  if (!cart.length) return;
  checkoutStep = 1;
  trackMeta('InitiateCheckout', { content_type: 'product', content_ids: cart.map(item => item.id), value: subtotal(), currency: 'DZD' });
  renderCheckoutStep();
  switchOverlay('cart-overlay', 'checkout-overlay');
});
const shippingRate = (wilayaCode, shipmentType) => { const wilaya = wilayaByCode[Number(wilayaCode)] || wilayaByCode[16]; return wilaya.rates.delivery[shipmentType] ?? wilaya.rates.delivery.home; };
const selectedWilaya = code => wilayaByCode[Number(code)] || wilayaByCode[16];
function updateShippingQuote() { const form = $('#checkout-form'); if (!form) return; const code = form.elements.wilayaCode.value; $('#home-shipping-price').textContent = `${money(shippingRate(code, 'home'))} — يصل إلى عنوانك`; $('#office-shipping-price').textContent = `${money(shippingRate(code, 'office'))} — استلام من المكتب`; }
function updateStopDeskAvailability() { const form=$('#checkout-form'); if(!form)return; form.elements.commune.setCustomValidity(''); const commune=communes.find(item=>String(item.id)===String(form.elements.commune.value)); const available=Boolean(commune&&stopDeskCommuneIds.has(Number(commune.id))); const radio=form.querySelector('[name="shipmentType"][value="office"]'); const note=$('#office-shipping-note'); if(radio){radio.disabled=!available;if(!available&&radio.checked){form.querySelector('[name="shipmentType"][value="home"]').checked=true;}} if(note)note.textContent=commune&&!available?'لا يتوفر مكتب توصيل في هذه البلدية؛ اختر التوصيل للمنزل.':commune?'يتوفر مكتب توصيل في هذه البلدية.':'اختر البلدية لمعرفة توفر مكتب التوصيل.'; }
function populateCommunes() { const form = $('#checkout-form'); const select = $('#commune-select'); if (!form || !select) return; const code = String(form.elements.wilayaCode.value).padStart(2, '0'); const matches = communes.filter(commune => commune.wilaya_code === code); select.innerHTML = matches.length ? `<option value="">اختر البلدية</option>${matches.map(commune => `<option value="${commune.id}">${commune.commune_name_ascii} — ${commune.commune_name} · ${commune.daira_name_ascii || commune.daira_name || ''}</option>`).join('')}` : '<option value="">تعذر تحميل البلديات</option>'; select.disabled = matches.length === 0; updateStopDeskAvailability(); }
$('#checkout-form [name="commune"]').addEventListener('change',updateStopDeskAvailability);
updateShippingQuote();
populateCommunes();
function renderCheckoutStep() {
  $$('[data-step]', $('#checkout-overlay')).forEach(section => {
    const active = Number(section.dataset.step) === checkoutStep;
    section.hidden = !active;
    if (active) {
      section.classList.remove('checkout-step-enter');
      void section.offsetWidth;
      section.classList.add('checkout-step-enter');
    }
  });
  $$('[data-step-label]', $('#checkout-overlay')).forEach(label => label.classList.toggle('current', Number(label.dataset.stepLabel) === checkoutStep));
}
$('#checkout-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  await communesReady;
  const data = Object.fromEntries(new FormData(form));
  const normalizePhone = value => String(value || '').replace(/[^\d]/g, '');
  data.phone = normalizePhone(data.phone);
  if (!/^0[5-7]\d{8}$/.test(data.phone)) { form.elements.phone.setCustomValidity('أدخل رقمًا جزائريًا صحيحًا من 10 أرقام يبدأ بـ 05 أو 06 أو 07.'); form.elements.phone.reportValidity(); return; }
  form.elements.phone.setCustomValidity('');
  const wilaya = selectedWilaya(data.wilayaCode);
  const commune = communes.find(item => item.wilaya_code === String(wilaya.code).padStart(2, '0') && String(item.id) === String(data.commune)) || communes.find(item => item.wilaya_code === String(wilaya.code).padStart(2, '0') && (item.commune_name_ascii.toLocaleLowerCase() === data.commune.trim().toLocaleLowerCase() || item.commune_name === data.commune.trim()));
  if (!commune) { form.elements.commune.setCustomValidity('اختر بلدية صحيحة من الولاية المحددة.'); form.elements.commune.reportValidity(); return; }
  if(data.shipmentType==='office'&&!stopDeskCommuneIds.has(Number(commune.id))){form.elements.commune.setCustomValidity('لا يتوفر مكتب توصيل في هذه البلدية. اختر التوصيل للمنزل.');form.elements.commune.reportValidity();return;}
  form.elements.commune.setCustomValidity('');
  const shippingCost = shippingRate(wilaya.code, data.shipmentType);
  checkoutData = { ...data, communeId: commune.id, city: commune.commune_name_ascii, commune: commune.commune_name_ascii, communeArabic: commune.commune_name, daira: commune.daira_name_ascii || commune.daira_name || '', weight: 0, wilayaCode: wilaya.code, wilaya: wilaya.name, shippingCost, shipmentType: data.shipmentType, discountCode: activeDiscountCode, discountAmount: discountTotal() };
  const lines = cart.map(({ id, qty }) => `<div class="review-line"><span>${byId[id].title} <small>× ${qty}</small></span><strong>${money(discountedPrice(byId[id]) * qty)}</strong></div>`).join('');
  const discountLine = discountTotal() > 0 ? `<div class="review-line discount-line"><span>الخصم${activeDiscountCode ? ` (${activeDiscountCode})` : ''}</span><strong>− ${money(discountTotal())}</strong></div>` : '';
  $('#checkout-review').innerHTML = `<div class="review-block"><h3>كتبك المختارة</h3>${lines}${discountLine}<div class="review-line"><span>توصيل ${checkoutData.shipmentType === 'office' ? 'إلى المكتب' : 'إلى المنزل'}</span><strong>${money(shippingCost)}</strong></div><div class="review-line review-total"><span>الإجمالي عند الاستلام</span><strong>${money(subtotal() + shippingCost)}</strong></div></div><div class="review-block"><h3>التوصيل والدفع</h3><p id="review-address"></p><p>الولاية رقم ${wilaya.code} · ${checkoutData.shipmentType === 'office' ? 'التوصيل للمكتب' : 'التوصيل للمنزل'}</p><p>الدفع نقدًا عند الاستلام</p></div>`;
  $('#review-address').textContent = `${data.customer} · ${data.phone} · ${[data.address, checkoutData.communeArabic, wilaya.name].filter(Boolean).join('، ')}`;
  checkoutStep = 2;
  renderCheckoutStep();
  $('.checkout-panel').scrollTo({ top: 0, behavior: 'smooth' });
});
$('#checkout-form [name="phone"]').addEventListener('input', event => event.target.setCustomValidity(''));
$('#checkout-back').addEventListener('click', () => { checkoutStep = 1; renderCheckoutStep(); });
function checkoutErrorMessage(error) {
  const code = String(error?.message || '');
  if (code.includes('insufficient_stock')) return 'يبدو أن أحد الكتب لم يعد متوفرًا بالكمية المطلوبة. عدّل السلة وحاول مرة أخرى.';
  if (code.includes('invalid_commune')) return 'تعذر مطابقة البلدية مع الولاية المختارة. اختر البلدية من القائمة نفسها ثم حاول مرة أخرى.';
  if (code.includes('invalid_shipping')) return 'تعذر تحديد الولاية أو نوع الشحن. أعد اختيارهما ثم حاول مرة أخرى.';
  if (code.includes('invalid_phone')) return 'تحقق من رقم الهاتف وأعد المحاولة.';
  if (code.includes('request_timeout') || code.includes('request_failed')) return 'تعذر الاتصال بالمكتبة الآن. تحقق من اتصالك وحاول بعد لحظات.';
  return 'تعذر حفظ الطلب الآن. لم يتم تأكيده، حاول مرة أخرى.';
}
$('#checkout-confirm').addEventListener('click', async () => {
  if (!checkoutData || !cart.length) return;
  let reference = `GZ-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const metaEventId = window.crypto?.randomUUID?.() || `gz-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const deliveryAddress = [checkoutData.address, checkoutData.communeArabic, checkoutData.wilaya].filter(Boolean).join('، ');
  let serverResult = null;
  try {
    serverResult = await window.GhazalAPI?.createOrder({
      customer: { customer: checkoutData.customer, phone: checkoutData.phone, address: String(checkoutData.address || '').trim() },
      items: cart.map(item => ({ id: item.id, qty: item.qty })),
      shipping: { type: checkoutData.shipmentType, wilayaCode: Number(checkoutData.wilayaCode), wilaya: checkoutData.wilaya, communeId: Number(checkoutData.communeId), commune: checkoutData.city, price: checkoutData.shippingCost },
      discountCode: checkoutData.discountCode || '', metaEventId
    });
    if (serverResult?.reference) reference = serverResult.reference;
  } catch (error) {
    if (window.location.protocol !== 'file:') { toast(checkoutErrorMessage(error)); console.error('checkout_failed', error); return; }
  }
  const serverTotal = serverResult?.total ?? subtotal() + checkoutData.shippingCost;
  const serverSubtotal = serverResult?.subtotal ?? subtotal();
  const serverDiscount = serverResult?.discount ?? discountTotal();
  const serverDelivery = serverResult?.delivery ?? checkoutData.shippingCost;
  const ecotrackRow = {
    'reference commande': reference,
    'nom et prenom du destinataire*': checkoutData.customer,
    'telephone*': checkoutData.phone,
    'telephone 2': '',
    'code wilaya*': checkoutData.wilayaCode,
    'wilaya de livraison': checkoutData.wilaya,
    'commune de livraison*': checkoutData.city,
    'adresse de livraison*': deliveryAddress,
    'produit*': cart.map(({ id, qty }) => `${byId[id].title} x${qty}`).join(' + '),
    'poids (kg)': 0,
    'montant du colis*': serverTotal,
    'remarque': '',
    'FRAGILE\n( si oui mettez OUI sinon laissez vide )': '',
    'ECHANGE\n( si oui mettez OUI sinon laissez vide )': '',
    'PICK UP\n( si oui mettez OUI sinon laissez vide )': '',
    'RECOUVREMENT\n( si oui mettez OUI sinon laissez vide )': 'OUI',
    'STOP DESK\n( si oui mettez OUI sinon laissez vide )': checkoutData.shipmentType === 'office' ? 'OUI' : '',
    'Lien map': ''
  };
  const order = {
    reference,
    placedAt: new Date().toISOString(),
    customer: checkoutData,
    items: cart.map(item => ({ ...item })),
    subtotal: serverSubtotal, discount: serverDiscount, delivery: serverDelivery,
    total: serverTotal,
    payment: 'cash_on_delivery', shipmentType: checkoutData.shipmentType, discountCode: checkoutData.discountCode || '', discountAmount: checkoutData.discountAmount || 0, demo: window.location.protocol === 'file:',
    shipping: { service: 'delivery', type: checkoutData.shipmentType, stopDesk: checkoutData.shipmentType === 'office', wilayaCode: checkoutData.wilayaCode, wilaya: checkoutData.wilaya, price: checkoutData.shippingCost },
    ecotrackRow,
    ecotrack: { columns: ECOTRACK_COLUMNS, values: ECOTRACK_COLUMNS.map(column => ecotrackRow[column]) }
  };
  trackMeta('Purchase', { content_type: 'product', content_ids: order.items.map(item => item.id), value: order.total, currency: 'DZD', order_id: order.reference, event_id: metaEventId });
  if (window.location.protocol === 'file:') saveStorage('ghazal.demoOrders.v1', [order, ...readStorage('ghazal.demoOrders.v1', [])].slice(0, 20));
  cart = [];
  syncCart();
  $('#order-receipt').innerHTML = `<span>رقم الطلب</span><strong dir="ltr">${order.reference}</strong><span>الإجمالي نقدًا عند الاستلام</span><strong>${money(order.total)}</strong>`;
  checkoutStep = 3;
  renderCheckoutStep();
  $('.checkout-panel').scrollTo({ top: 0, behavior: 'smooth' });
});
$('#checkout-done').addEventListener('click', () => { hideOverlay('checkout-overlay'); document.getElementById('new').scrollIntoView({ behavior: 'smooth' }); });
$('#order-lookup-button').addEventListener('click', async () => { const reference = $('#order-lookup-reference').value.trim(); if (!reference) return; try { const order = await window.GhazalAPI.lookupOrder(reference); $('#order-lookup-result').textContent = `الطلب ${order.reference}: ${order.status} · ${money(order.total)}`; } catch { $('#order-lookup-result').textContent = 'لم نعثر على طلب بهذا الرقم.'; } });

$('#search-input').addEventListener('input', event => {
  const query = normalizeArabicSearch(event.target.value);
  const isbnQuery = normalizeIsbn(event.target.value);
  const results = books.filter(book => normalizeArabicSearch(`${book.title} ${book.author} ${book.publisher}`).includes(query) || (isbnQuery.length >= 3 && normalizeIsbn(book.isbn).includes(isbnQuery)));
  $('#search-results').innerHTML = query ? (results.length ? results.map(book => `<button class="search-result" data-search-id="${book.id}"><img src="${coverUrl(book)}" alt="" /><span><strong>${book.title}</strong><small>${book.author} · ${money(book.price)}</small></span><span>↖</span></button>`).join('') : '<p class="search-empty">لم نجد هذا العنوان. جرّب كلمة أخرى.</p>') : '<p class="search-empty">جرّب البحث عن كتاب أو اسم مؤلف.</p>';
});
$('#search-results').addEventListener('click', event => {
  const result = event.target.closest('[data-search-id]');
  if (result) { hideOverlay('search-overlay'); openProduct(result.dataset.searchId); }
});
$('#menu-toggle').addEventListener('click', () => {
  const open = $('.main-nav').classList.toggle('open');
  $('#menu-toggle').setAttribute('aria-expanded', String(open));
});
$$('.main-nav a').forEach(link => link.addEventListener('click', () => {
  $('.main-nav').classList.remove('open');
  $('#menu-toggle').setAttribute('aria-expanded', 'false');
}));
$('#newsletter-form').addEventListener('submit', event => {
  event.preventDefault();
  const email = $('#email').value.trim();
  if (window.location.protocol === 'file:' || !window.GhazalAPI?.subscribeNewsletter) {
    saveStorage('ghazal.demoNewsletter', email);
    $('#newsletter-message').textContent = 'حُفظ بريدك في هذه المعاينة فقط.';
    $('#email').value = '';
    return;
  }
  const button = $('#newsletter-form button'); button.disabled = true;
  window.GhazalAPI.subscribeNewsletter(email).then(() => {
    $('#newsletter-message').textContent = 'تم تسجيل بريدك. سنرسل لك مختارات الغزال بهدوء.';
    $('#newsletter-form').reset();
  }).catch(error => {
    $('#newsletter-message').textContent = String(error.message).includes('invalid_email') ? 'اكتب بريدًا إلكترونيًا صحيحًا.' : 'تعذر تسجيل البريد الآن. حاول مرة أخرى.';
  }).finally(() => { button.disabled = false; });
});

function observeReveals() {
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!revealObserver) revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); }
  }), { threshold: .09, rootMargin: '0px 0px -24px 0px' });
  $$('.section-heading,.feature-story,.selection-item,.book-card,.department-intro,.department-links a,.publisher,.journal-copy,.newsletter').forEach(element => {
    if (!element.classList.contains('reveal')) {
      element.classList.add('reveal');
      if (suppressRevealEntrance) { element.classList.add('is-visible'); return; }
      revealObserver.observe(element);
    }
  });
}
observeReveals();
if (window.matchMedia('(hover:hover) and (prefers-reduced-motion:no-preference)').matches) {
  $('.hero-art').addEventListener('pointermove', event => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - .5;
    const y = (event.clientY - rect.top) / rect.height - .5;
    $$('.hero-book').forEach((element, index) => { element.style.translate = `${x * (index + 1) * 5}px ${y * (index + 1) * 5}px`; });
  });
  $('.hero-art').addEventListener('pointerleave', () => $$('.hero-book').forEach(element => { element.style.translate = '0 0'; }));
}

// The storefront pages use hash routes so the static demo remains deployable anywhere.
const homeMain = document.querySelector('body > main:not(#app-pages)');
const pagesRoot = $('#app-pages');
const normalizeArabicSearch = value => String(value ?? '').normalize('NFKD').replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآ]/g, 'ا').toLocaleLowerCase('ar').trim();
const normalize = normalizeArabicSearch;
function normalizeIsbn(value) {
  return String(value ?? '').replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) >= 0x06f0 ? digit.charCodeAt(0) - 0x06f0 : digit.charCodeAt(0) - 0x0660)).replace(/^\s*ISBN(?:-1[03])?\s*/i, '').toUpperCase().replace(/[^0-9X]/g, '');
}
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const genreMatches = (book, selected) => selected === 'all' || normalizeArabicSearch(book.genre).includes(normalizeArabicSearch(selected));
let catalogFilter = 'all';
let catalogQuery = '';
let catalogSort = 'featured';
let catalogPublisher = 'all';
let catalogGenre = 'all';
let catalogPriceMin = '';
let catalogPriceMax = '';
let publisherQuery = '';
let publisherFilter = 'all';
let publisherGenre = 'all';
let adminTab = 'books';

function catalogResults() {
  const query = normalize(catalogQuery);
  const isbnQuery = normalizeIsbn(catalogQuery);
  const min = catalogPriceMin === '' ? null : Number(catalogPriceMin);
  const max = catalogPriceMax === '' ? null : Number(catalogPriceMax);
  let result = books.filter(book => {
    const price = Number(book.price) || 0;
    return (catalogFilter === 'all' || book.category === catalogFilter) &&
      (catalogPublisher === 'all' || book.publisher === catalogPublisher) &&
      genreMatches(book, catalogGenre) &&
      (min === null || price >= min) && (max === null || price <= max) &&
      (!query || normalize(`${book.title} ${book.author} ${book.publisher} ${book.genre}`).includes(query) || (isbnQuery.length >= 3 && normalizeIsbn(book.isbn).includes(isbnQuery)));
  });
  if (catalogSort === 'featured') { const ranks = new Map((featuredBookIds || []).map((id, index) => [id, index])); result = [...result].sort((a, b) => (ranks.get(a.id) ?? 999) - (ranks.get(b.id) ?? 999)); }
  if (catalogSort === 'title') result = [...result].sort((a, b) => a.title.localeCompare(b.title, 'ar'));
  if (catalogSort === 'price-low') result = [...result].sort((a, b) => a.price - b.price);
  if (catalogSort === 'price-high') result = [...result].sort((a, b) => b.price - a.price);
  return result;
}
function renderCatalogPage() {
  syncCatalogFilterOptions();
  const result = catalogResults();
  $('#catalog-grid').innerHTML = result.map(cardTemplate).join('');
  $('#catalog-count').textContent = `${new Intl.NumberFormat('ar-DZ').format(result.length)} كتاب`;
  $('#catalog-empty').hidden = result.length > 0;
  $$('#catalog-filters button').forEach(button => button.classList.toggle('active', button.dataset.catalogFilter === catalogFilter));
  const active = [catalogPublisher !== 'all' ? catalogPublisher : '', catalogGenre !== 'all' ? catalogGenre : '', catalogPriceMin !== '' ? `من ${catalogPriceMin} دج` : '', catalogPriceMax !== '' ? `إلى ${catalogPriceMax} دج` : ''].filter(Boolean);
  $('#catalog-filter-summary').textContent = active.length ? `الفلاتر النشطة: ${active.join(' · ')}` : 'يمكنك فتح التفاصيل، حفظ الكتاب، أو إضافته إلى السلة.';
  observeReveals();
}
function syncCatalogFilterOptions() {
  const publisherSelect = $('#catalog-publisher-filter'); const genreSelect = $('#catalog-genre-filter');
  if (!publisherSelect || !genreSelect) return;
  const publishersList = [...new Set(books.map(book => String(book.publisher || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar'));
  const genresList = [...new Set([...catalogBookGenres, ...books.map(book => String(book.genre || '').trim())].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar'));
  publisherSelect.innerHTML = `<option value="all">كل دور النشر</option>${publishersList.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('')}`;
  genreSelect.innerHTML = `<option value="all">كل الأنواع</option>${genresList.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('')}`;
  publisherSelect.value = publishersList.includes(catalogPublisher) ? catalogPublisher : 'all';
  genreSelect.value = genresList.includes(catalogGenre) ? catalogGenre : 'all';
  catalogPublisher = publisherSelect.value; catalogGenre = genreSelect.value;
  $('#catalog-price-min').value = catalogPriceMin; $('#catalog-price-max').value = catalogPriceMax;
}
function authorBooks(author) { return books.filter(book => book.author === author); }
function publisherBooks(publisher) { return books.filter(book => book.publisher === publisher); }
function publisherByName(name) { return publishers.find(publisher => publisher.name === name); }
function renderProfileBooks(list, target) { target.innerHTML = list.length ? list.map(cardTemplate).join('') : '<p class="empty-state">لا توجد كتب مضافة بعد إلى هذا الملف.</p>'; }
function relatedBooks(book) {
  const genreTerms = new Set(normalizeArabicSearch(book.genre).split(/[·،,|/\s]+/).filter(term => term.length > 2));
  const bestsellerRank = new Map((bestSellerBookIds || []).map((id, index) => [id, index]));
  return books.filter(candidate => candidate.id !== book.id).map(candidate => {
    let score = 0;
    if (candidate.author === book.author) score += 5;
    if (candidate.publisher === book.publisher) score += 3;
    if (candidate.category === book.category) score += 2;
    if (candidate.genre === book.genre) score += 4;
    const candidateTerms = normalizeArabicSearch(candidate.genre).split(/[·،,|/\s]+/).filter(term => term.length > 2);
    score += candidateTerms.filter(term => genreTerms.has(term)).length * 2;
    if (bestsellerRank.has(candidate.id)) score += Math.max(1, 4 - bestsellerRank.get(candidate.id));
    if (Number(candidate.stock) > 0) score += 0.5;
    return { book: candidate, score };
  }).sort((a, b) => b.score - a.score || (bestsellerRank.get(a.book.id) ?? 999) - (bestsellerRank.get(b.book.id) ?? 999) || a.book.title.localeCompare(b.book.title, 'ar')).slice(0, 12).map(item => item.book);
}
function renderBookPage(id) {
  const book = byId[id];
  if (!book) { if (catalogLoaded) location.hash = '#catalog'; return; }
  const suggestions = relatedBooks(book);
  const publisherShelf = publisherBooks(book.publisher).filter(item => item.id !== book.id);
  const authorShelf = authorBooks(book.author).filter(item => item.id !== book.id);
  const publisherSection = publisherShelf.length ? `<section class="related-books book-detail-shelf"><div class="section-heading compact"><div><p class="eyebrow">من رفوف ${escapeHtml(book.publisher)}</p><h2>إصدارات <em>الدار</em></h2></div><a class="underlined-link" href="#publisher/${encodeURIComponent(book.publisher)}">كل إصدارات الدار <span>↖</span></a></div><div id="publisher-books-carousel"></div></section>` : '';
  const authorSection = authorShelf.length >= 3 ? `<section class="related-books book-detail-shelf"><div class="section-heading compact"><div><p class="eyebrow">قراءة أخرى من المؤلف</p><h2>كتب أخرى لـ <em>${escapeHtml(book.author)}</em></h2></div><a class="underlined-link" href="#author/${encodeURIComponent(book.author)}">ملف المؤلف <span>↖</span></a></div><div id="author-books-carousel"></div></section>` : '';
  const suggestionsSection = `<section class="related-books"><div class="section-heading compact"><div><p class="eyebrow">اقتراحات ذكية من رفوف الغزال</p><h2>قد يعجبك <em>أيضًا</em></h2></div><a class="underlined-link" href="#catalog">استكشف كل الكتب <span>↖</span></a></div><div id="related-books-carousel"></div></section>`;
  const available = Number(book.stock) > 0;
  const saved = favorites.includes(book.id);
  $('#book-page-content').innerHTML = `<a class="detail-back" href="#catalog">← العودة إلى كل الكتب</a><div class="book-detail"><div class="book-detail-cover"><button class="book-cover-zoom" type="button" data-zoom-cover="${escapeHtml(coverPath(book.image || book.display) || coverUrl(book, 'display'))}" aria-label="تكبير غلاف ${escapeHtml(book.title)}"><img src="${coverUrl(book, 'display')}" alt="غلاف ${escapeHtml(book.title)}" onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='assets/placeholder-cover.svg';}" /><span>تكبير الغلاف <b aria-hidden="true">⌕</b></span></button></div><div class="book-detail-copy"><p class="eyebrow">${escapeHtml(book.genre)} / صفحة الكتاب</p><h1 id="book-page-title">${escapeHtml(book.title)}</h1><p class="detail-author">بقلم <a href="#author/${encodeURIComponent(book.author)}">${escapeHtml(book.author)}</a> · <a href="#publisher/${encodeURIComponent(book.publisher)}">${escapeHtml(book.publisher)}</a></p><p class="detail-note">${escapeHtml(book.note)}</p><div class="detail-meta"><div><span>التصنيف الفرعي</span><strong>${book.genre ? `<a class="detail-genre-link" href="#subgenre/${encodeURIComponent(book.genre)}">${escapeHtml(book.genre)}</a>` : '—'}</strong></div><div><span>المؤلف</span><strong>${escapeHtml(book.author)}</strong></div><div><span>السعر</span><strong>${money(book.price)}</strong></div><div><span>التوفر</span><strong>${available ? 'متوفر' : 'غير متوفر حاليًا'}</strong></div></div><div class="detail-actions">${available ? `<button class="button button-dark" data-add="${book.id}">أضف إلى السلة <span>↖</span></button>` : '<p class="stock-empty detail-stock-empty">هذا الكتاب غير متوفر حاليًا.</p>'}<button class="favorite detail-favorite" type="button" data-favorite="${book.id}" aria-label="${saved ? 'أزل من المحفوظات' : 'احفظ'} ${escapeHtml(book.title)}" aria-pressed="${saved}"><span class="detail-favorite-icon" data-favorite-icon aria-hidden="true">${saved ? '♥' : '♡'}</span><span data-favorite-label>${saved ? 'في محفوظاتك' : 'أحفظ في محفوظاتي'}</span></button></div></div></div>${suggestionsSection}${publisherSection}${authorSection}`;
  const detailPrice = $('#book-page-content .detail-meta div:nth-child(3) strong'); if (detailPrice) detailPrice.innerHTML = priceHtml(book);
  if (book.review) $('#book-page-content .detail-note').textContent = book.review;
  if (publisherShelf.length) renderCarousel('publisher-books-carousel', `publisher-${book.id}`, publisherShelf);
  if (authorShelf.length >= 3) renderCarousel('author-books-carousel', `author-${book.id}`, authorShelf);
  renderCarousel('related-books-carousel', `related-${book.id}`, suggestions);
  observeReveals();
}
function openCoverZoom(button) {
  const src = button.dataset.zoomCover; if (!src) return;
  document.getElementById('cover-zoom-overlay')?.remove();
  const title = $('#book-page-title')?.textContent || 'غلاف الكتاب';
  document.body.insertAdjacentHTML('beforeend', `<div class="cover-zoom-overlay" id="cover-zoom-overlay" role="dialog" aria-modal="true" aria-label="غلاف ${escapeHtml(title)}"><button class="cover-zoom-close" type="button" aria-label="إغلاق التكبير">×</button><figure><img src="${escapeHtml(src)}" alt="غلاف ${escapeHtml(title)}" /><figcaption>${escapeHtml(title)}<small>انقر على الغلاف أو خارجه، أو اضغط Escape للإغلاق</small></figcaption></figure></div>`);
  const overlay = $('#cover-zoom-overlay'); document.body.classList.add('cover-zoom-open'); overlay.addEventListener('click', event => { if (event.target === overlay || event.target.closest?.('.cover-zoom-close, figure img')) { overlay.remove(); document.body.classList.remove('cover-zoom-open'); } }); overlay.querySelector('.cover-zoom-close').focus();
}
function renderPublisherPage(name) {
  const publisher = publisherByName(name);
  if (!publisher) { if (catalogLoaded) location.hash = '#publishers'; return; }
  publisherQuery = ''; publisherFilter = 'all'; publisherGenre = 'all';
  const logoPath = publisherLogoPath(publisher);
  const logoSize = logoPath.includes('al-mada.png') || logoPath.includes('jisoor') || logoPath.includes('dar-al-karma') || logoPath.includes('arab-network') || logoPath.includes('al-jamal') ? 'publisher-profile-logo__image--small' : logoPath.includes('dar-al-adab') || logoPath.includes('dar-al-ain') || logoPath.includes('nahda-center') || logoPath.includes('takween') ? 'publisher-profile-logo__image--large' : logoPath.includes('arab-scientific') || logoPath.includes('dar-sutoor') || logoPath.includes('diwan') ? 'publisher-profile-logo__image--wide' : '';
  const logo = escapeHtml(publisher.logo && !/^(data:|\/|https?:|assets\/)/i.test(publisher.logo) ? publisher.logo : publisher.name.slice(0, 1));
  const publisherFilters = [...catalogBookGenres, ...publisherBooks(publisher.name).map(book => book.genre).filter(Boolean)].filter((genre, index, list) => list.indexOf(genre) === index).sort((a,b) => a.localeCompare(b, 'ar')).map(genre => ({ value:`genre:${genre}`, label:genre }));
  $('#publisher-page-content').innerHTML = `<a class="detail-back" href="#catalog">← العودة إلى الفهرس</a><div class="profile-header publisher-profile-header"><div class="profile-logo publisher-profile-logo${logoPath ? ' publisher-profile-logo--image' : ''}" aria-hidden="true">${logoPath ? `<img class="${logoSize}" src="${escapeHtml(logoPath)}" alt="" loading="lazy" decoding="async" />` : logo}</div><div class="publisher-profile-copy"><p class="eyebrow">دار نشر / ملف الناشر</p><h1 class="profile-title" id="publisher-page-title">${escapeHtml(publisher.name)}</h1><p>${escapeHtml(publisherDescription(publisher))}</p></div></div><div class="profile-books"><div class="card-heading"><h2>كتب <em>الدار</em></h2><span id="publisher-count" class="catalog-summary"></span></div><div class="catalog-toolbar"><label class="catalog-search"><span>⌕</span><input id="publisher-search" type="search" placeholder="ابحث داخل إصدارات الدار" /></label><select id="publisher-sort" aria-label="ترتيب إصدارات الدار"><option value="featured">الأحدث</option><option value="title">العنوان: أ ـ ي</option><option value="price-low">السعر: الأقل أولًا</option></select></div><label class="publisher-genre-filter">التصنيف أو النوع<select id="publisher-genre-filter"><option value="all">كل الإصدارات</option>${publisherFilters.map(filter => `<option value="${escapeHtml(filter.value)}">${escapeHtml(filter.label)}</option>`).join('')}</select></label><div class="catalog-grid" id="publisher-books"></div></div>`;
  const update = () => { const [filterType, filterValue] = publisherGenre.split(':'); let list = publisherBooks(publisher.name).filter(book => (publisherGenre === 'all' || (filterType === 'category' ? book.category === filterValue : genreMatches(book, filterValue))) && (!publisherQuery || normalize(`${book.title} ${book.author} ${book.genre}`).includes(normalize(publisherQuery)))); const sort = $('#publisher-sort').value; if (sort === 'title') list.sort((a,b) => a.title.localeCompare(b.title, 'ar')); if (sort === 'price-low') list.sort((a,b) => a.price - b.price); $('#publisher-count').textContent = `${list.length} إصدار`; renderProfileBooks(list, $('#publisher-books')); $('#publisher-genre-filter').value = publisherGenre; };
  $('#publisher-search').addEventListener('input', event => { publisherQuery = event.target.value; update(); }); $('#publisher-sort').addEventListener('change', update); $('#publisher-genre-filter').addEventListener('change', event => { publisherGenre = event.target.value; update(); }); update();
}
function renderAuthorPage(name) {
  const list = authorBooks(name);
  const profile = authorProfiles[name] || {};
  const portrait = profile.photo?.startsWith('data:') ? `<img src="${profile.photo}" alt="صورة ${escapeHtml(name)}" />` : escapeHtml(name).slice(0, 1);
  $('#author-page-content').innerHTML = `<a class="detail-back" href="#catalog">← العودة إلى الفهرس</a><div class="profile-header"><div class="author-medallion" aria-hidden="true">${portrait}</div><div><p class="eyebrow">مؤلف / ملف الكاتب${profile.featured ? ' · اختيار الغزال' : ''}</p><h1 class="profile-title" id="author-page-title">${escapeHtml(name)}</h1><p>${escapeHtml(profile.bio || 'تعرّف إلى كتب هذا المؤلف المتاحة على رفوف الغزال، واقرأ مزيدًا عن كل عنوان.')}</p></div></div><div class="profile-books"><h2>كتب <em>${escapeHtml(name)}</em> <small>(${list.length})</small></h2><div class="catalog-grid" id="author-books"></div></div>`;
  renderProfileBooks(list, $('#author-books'));
}
function renderGenrePage(category) {
  const genre = genres[category] || { title: category || 'التصنيف', description: '' };
  const shelf = subgenreNames().filter(name => books.some(book => book.category === category && normalizeArabicSearch(book.genre) === normalizeArabicSearch(name)));
  let query = '';
  $('#genre-page-content').innerHTML = `<a class="detail-back" href="#catalog">← العودة إلى كل الكتب</a><div class="page-hero genre-hero"><div><p class="eyebrow">الغزال / تصفّح حسب التصنيف</p><h1 id="genre-page-title">${escapeHtml(genre.title)}</h1><p>${escapeHtml(genre.description)}</p></div></div><div class="genre-switcher">${Object.entries(genres).map(([id, item]) => `<a class="${id === category ? 'active' : ''}" href="#genre/${id}">${escapeHtml(item.title)}</a>`).join('')}</div>${shelf.length ? `<div class="subgenre-row"><span class="subgenre-row-label">الأنواع داخل هذا التصنيف</span>${shelf.map(name => `<a href="#subgenre/${encodeURIComponent(name)}">${escapeHtml(name)}</a>`).join('')}</div>` : ''}<div class="catalog-toolbar"><label class="catalog-search"><span>⌕</span><input id="genre-search" type="search" placeholder="ابحث داخل ${escapeHtml(genre.title)}" /></label></div><div class="catalog-summary"><strong id="genre-count"></strong><span>كتب مختارة من هذا التصنيف</span></div><div class="catalog-grid" id="genre-books"></div>`;
  const update = () => { const result = books.filter(book => book.category === category && (!query || normalize(`${book.title} ${book.author} ${book.publisher}`).includes(normalize(query)))); $('#genre-count').textContent = `${result.length} كتاب`; $('#genre-books').innerHTML = result.map(cardTemplate).join(''); observeReveals(); };
  $('#genre-search').addEventListener('input', event => { query = event.target.value; update(); }); update();
}
function subgenreNames() { return [...new Set(books.map(book => String(book.genre || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar')); }
function renderSubgenrePage(name) {
  const label = String(name || '').trim();
  const key = normalizeArabicSearch(label);
  const inGenre = book => normalizeArabicSearch(book.genre) === key;
  // The subgenre only exists as free text on the books, so the page and its
  // title are derived from the catalog itself rather than a stored table.
  const parent = label ? books.find(inGenre)?.category : '';
  const parentTitle = genres[parent]?.title || parent;
  let query = '';
  $('#subgenre-page-content').innerHTML = `<a class="detail-back" href="#catalog">← العودة إلى كل الكتب</a><div class="page-hero genre-hero"><div><p class="eyebrow">الغزال / تصفّح حسب النوع</p><h1 id="subgenre-page-title">${escapeHtml(label || 'نوع غير محدد')}</h1><p>${parentTitle ? `كل كتب هذا النوع داخل تصنيف <a class="detail-parent-link" href="#genre/${encodeURIComponent(parent)}">${escapeHtml(parentTitle)}</a>.` : 'كل الكتب التي تندرج تحت هذا النوع على رفوف الغزال.'}</p></div></div><div class="genre-switcher">${subgenreNames().map(item => `<a class="${normalizeArabicSearch(item) === key ? 'active' : ''}" href="#subgenre/${encodeURIComponent(item)}">${escapeHtml(item)}</a>`).join('')}</div><div class="catalog-toolbar"><label class="catalog-search"><span>⌕</span><input id="subgenre-search" type="search" placeholder="ابحث داخل ${escapeHtml(label || 'هذا النوع')}" /></label></div><div class="catalog-summary"><strong id="subgenre-count"></strong><span>كتب من هذا النوع</span></div><div class="catalog-grid" id="subgenre-books"></div><p class="empty-state" id="subgenre-empty" hidden></p>`;
  const update = () => {
    const result = books.filter(book => inGenre(book) && (!query || normalize(`${book.title} ${book.author} ${book.publisher}`).includes(normalize(query))));
    $('#subgenre-count').textContent = `${result.length} كتاب`;
    $('#subgenre-books').innerHTML = result.map(cardTemplate).join('');
    const empty = $('#subgenre-empty');
    empty.hidden = result.length > 0;
    empty.textContent = query ? `لا نتائج لـ «${query}» في هذا النوع.` : 'لا كتب في هذا النوع بعد.';
    observeReveals();
  };
  $('#subgenre-search').addEventListener('input', event => { query = event.target.value; update(); }); update();
}
function renderBestsellersPage() {
  const ranked = bestSellerBookIds.map(id => byId[id]).filter(Boolean);
  const selected = ranked.length ? ranked : bestsellerFallbackBooks();
  $('#bestsellers-page-content').innerHTML = `<a class="detail-back" href="#catalog">← العودة إلى كل الكتب</a><div class="page-hero genre-hero"><div><p class="eyebrow">الغزال / من رفوف القراء</p><h1 id="bestsellers-page-title">الأكثر <em>قراءةً</em></h1><p>العناوين التي يعود إليها القراء مرة بعد مرة، وتبقى في الحديث بعد الصفحة الأخيرة.</p></div><span class="collection-count">${selected.length} كتب</span></div><div class="catalog-grid">${selected.map(cardTemplate).join('')}</div>`;
  observeReveals();
  trackMeta('ViewContent', { content_type: 'product_group', content_name: 'الأكثر قراءة', content_ids: selected.map(book => book.id) });
}
function renderCollectionPage(slug) {
  const collection = collections.find(item => item.slug === slug && item.active);
  if (!collection) { location.hash = '#catalog'; return; }
  const list = collection.bookIds.map(id => byId[id]).filter(Boolean);
  $('#collection-page-content').innerHTML = `<a class="detail-back" href="#catalog">← العودة إلى الفهرس</a><div class="page-hero genre-hero collection-hero"><div><p class="eyebrow">الغزال / مجموعة مختارة</p><h1>${escapeHtml(collection.title)}</h1><p>${escapeHtml(collection.description || 'مجموعة كتب اختيرت لتجد طريقها إلى رفّك.')}</p></div><span class="collection-count">${list.length} كتب</span></div><div class="catalog-grid" id="collection-books"></div>`;
  $('#collection-books').innerHTML = list.length ? list.map(cardTemplate).join('') : '<p class="empty-state">لا توجد كتب في هذه المجموعة بعد.</p>';
  trackMeta('ViewContent', { content_type: 'product_group', content_name: collection.title, content_ids: list.map(book => book.id) });
  observeReveals();
}
function renderFavoritesPage() {
  const savedBooks = favorites.map(id => byId[id]).filter(Boolean);
  $('#favorites-page-content').innerHTML = `<div class="page-hero favorites-hero"><div><p class="eyebrow">الغزال / رفّك الخاص</p><h1 id="favorites-title">محفوظاتي <em>المحبوبة</em></h1><p>كل كتاب لامس فضولك، محفوظ هنا على هذا الجهاز لتعود إليه متى شئت.</p></div><span class="favorites-count">${savedBooks.length} كتب</span></div><div class="catalog-grid" id="favorites-grid"></div><div class="empty-state" id="favorites-empty" hidden><p>لم تحفظ أي كتاب بعد.</p><a class="underlined-link" href="#catalog">استكشف الكتب <span>↖</span></a></div>`;
  $('#favorites-grid').innerHTML = savedBooks.map(cardTemplate).join('');
  $('#favorites-empty').hidden = savedBooks.length > 0;
  observeReveals();
}
function renderSelectionsPage() {
  const selected = [...new Set([...(featuredBookIds || []), ...books.map(book => book.id)])].map(id => byId[id]).filter(Boolean).slice(0, 12);
  const spotlight = authorSpotlight ? `<article class="author-spotlight"><div class="author-spotlight-art">${authorSpotlight.photo ? `<img src="${authorSpotlight.photo.startsWith('data:') ? authorSpotlight.photo : escapeHtml(authorSpotlight.photo)}" alt="صورة ${escapeHtml(authorSpotlight.name)}" loading="lazy" />` : `<span>${escapeHtml(authorSpotlight.name).slice(0,1)}</span>`}</div><div class="author-spotlight-copy"><p class="eyebrow">إضاءة على مؤلف</p><h2>صوت <em>${escapeHtml(authorSpotlight.name)}</em></h2><p>${escapeHtml(authorSpotlight.bio || '')}</p><a class="underlined-link" href="#author/${encodeURIComponent(authorSpotlight.name)}">اكتشف ملف المؤلف ↖</a></div></article>` : '';
  $('#selections-page-content').innerHTML = `<div class="page-hero"><div><p class="eyebrow">الغزال / اختيارات المحرر</p><h1 id="selections-page-title">مختارات <em>الغزال</em></h1><p>اختيارات قابلة للتصفح والشراء، تتجدد من الفهرس الحقيقي للمكتبة.</p></div></div>${spotlight}<div class="catalog-grid">${selected.map(cardTemplate).join('')}</div>`;
  observeReveals();
}
function renderNewPage() {
  $('#new-page-content').innerHTML = `<div class="page-hero"><div><p class="eyebrow">الغزال / الرفوف الجديدة</p><h1 id="new-page-title">وصل <em>حديثًا</em></h1><p>أحدث الكتب التي أضيفت إلى الفهرس.</p></div></div><div class="catalog-grid">${books.slice().sort(newestFirst).slice(0, 24).map(cardTemplate).join('')}</div>`;
  observeReveals();
}
function renderDepartmentsPage() {
  const bestsellerIds = bestSellerBookIds.length ? bestSellerBookIds : books.map(book => book.id).slice(0, 8);
  $('#departments-page-content').innerHTML = `<div class="page-hero"><div><p class="eyebrow">الغزال / تصفّح هادئ</p><h1 id="departments-page-title">الأقسام <em>والأبواب</em></h1><p>اختر مسارًا واضحًا إلى الكتب التي تناسب فضولك.</p></div></div><div class="department-links page-department-links">${Object.entries(genres).map(([id, genre], index) => `<a href="#genre/${encodeURIComponent(id)}"><span class="dep-num">${String(index + 1).padStart(2, '0')}</span><span>${escapeHtml(genre.title)}<small>${escapeHtml(genre.description)}</small></span><b>↖</b></a>`).join('')}</div><div class="section-heading compact page-subheading"><div><p class="eyebrow">من رفوف القراء</p><h2>الأكثر <em>قراءةً</em></h2></div></div><div class="catalog-grid">${bestsellerIds.map(id => byId[id]).filter(Boolean).slice(0, 8).map(cardTemplate).join('')}</div>`;
  observeReveals();
}
function renderPublishersPage() {
  $('#publishers-page-content').innerHTML = `<div class="page-hero"><div><p class="eyebrow">الغزال / شركاء الكتاب</p><h1 id="publishers-page-title">دور <em>النشر</em></h1><p>اكتشف مشاريع الناشرين والكتب المتاحة من كل دار.</p></div></div><div class="publisher-grid page-publisher-grid">${publishers.map(publisher => `<a class="publisher${publisherCardClass(publisher)}" href="#publisher/${encodeURIComponent(publisher.name)}">${publisherMark(publisher)}<strong>${escapeHtml(publisher.name)}</strong><small>${escapeHtml(publisher.since || publisher.city || '')}</small></a>`).join('')}</div>`;
  observeReveals();
}
function renderJournalPage() {
  $('#journal-page-content').innerHTML = `<div class="page-hero"><div><p class="eyebrow">الغزال / قراءة أبعد</p><h1 id="journal-page-title">من دفتر <em>الغزال</em></h1><p>مساحة مستقلة للقصص والقراءات والهوامش التي ترافق الكتب.</p></div></div><article class="journal-page-story"><div class="journal-image"><div class="journal-paper"><span>دفتر<br />الغزال</span><i>01</i></div></div><div><p class="eyebrow">عن الكتب التي تجدنا في وقتها</p><h2>بعض الكتب نبحث عنها، وبعضها يصل إلينا حين نكون جاهزين لها.</h2><p>نكتب هنا عن القراءات التي تركت أثرًا، وعن متعة أن نصغي إلى عالم آخر. ستتوسع هذه المساحة بمقالات ومراجعات جديدة من فريق الغزال.</p><a class="button button-outline" href="mailto:hello@alghazal.books?subject=من%20دفتر%20الغزال">راسلنا واقترح موضوعًا <span>↖</span></a></div></article>`;
  observeReveals();
}
function renderAdminList() {
  const target = $('#admin-list');
  if (adminTab === 'books') target.innerHTML = books.slice(0, 8).map(book => `<div class="admin-row"><img src="${coverUrl(book)}" alt="" /><div><strong>${escapeHtml(book.title)}</strong><small>${escapeHtml(book.author)} · ${escapeHtml(book.publisher)}</small></div><span>${money(book.price)}</span></div>`).join('');
  if (adminTab === 'publishers') target.innerHTML = publishers.map(publisher => `<div class="admin-row"><span class="admin-avatar">${publisher.logo}</span><div><strong>${escapeHtml(publisher.name)}</strong><small>${publisherBooks(publisher.name).length} كتب · ${escapeHtml(publisher.city)}</small></div><span>نشط</span></div>`).join('');
  if (adminTab === 'authors') { const authors = [...new Set(books.map(book => book.author))]; target.innerHTML = authors.map(author => `<div class="admin-row"><span class="admin-avatar">${escapeHtml(author).slice(0,1)}</span><div><strong>${escapeHtml(author)}</strong><small>${authorBooks(author).length} كتب في الفهرس</small></div><span>مؤلف</span></div>`).join(''); }
  $('#book-total').textContent = books.length; $('#publisher-total').textContent = publishers.length; $('#author-total').textContent = new Set(books.map(book => book.author)).size;
}
function renderDashboard() {
  const top = [...books].slice(0, 4);
  $('#top-books').innerHTML = top.map((book, index) => `<div class="top-book"><span>0${index + 1}</span><img src="${coverUrl(book)}" alt="" /><div><strong>${escapeHtml(book.title)}</strong><small>${escapeHtml(book.author)}</small></div><b>${money(book.price)}</b></div>`).join('');
  renderAdminList();
}
function showRoute() {
  const hash = decodeURIComponent(location.hash.slice(1) || 'home');
  const [route, ...parts] = hash.split('/');
  const isPage = ['catalog', 'selections', 'new', 'departments', 'publishers', 'book', 'publisher', 'author', 'genre', 'subgenre', 'bestsellers', 'collection', 'favorites'].includes(route);
  homeMain.hidden = isPage; pagesRoot.hidden = !isPage;
  $$('.app-page', pagesRoot).forEach(page => { page.hidden = page.id !== `${route}-page`; });
  if (route === 'catalog') renderCatalogPage();
  if (route === 'selections') renderSelectionsPage();
  if (route === 'new') renderNewPage();
  if (route === 'departments') renderDepartmentsPage();
  if (route === 'publishers') renderPublishersPage();
  if (route === 'book') renderBookPage(parts.join('/'));
  if (route === 'publisher') renderPublisherPage(parts.join('/'));
  if (route === 'author') renderAuthorPage(parts.join('/'));
  if (route === 'genre') renderGenrePage(parts[0]);
  if (route === 'subgenre') renderSubgenrePage(parts.join('/'));
  if (route === 'collection') renderCollectionPage(parts.join('/'));
  if (route === 'bestsellers') renderBestsellersPage();
  if (route === 'favorites') renderFavoritesPage();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
$('#catalog-search').addEventListener('input', event => { catalogQuery = event.target.value; renderCatalogPage(); });
$('#catalog-sort').addEventListener('change', event => { catalogSort = event.target.value; renderCatalogPage(); });
$('#catalog-filters').addEventListener('click', event => { const button = event.target.closest('[data-catalog-filter]'); if (button) { catalogFilter = button.dataset.catalogFilter; renderCatalogPage(); } });
$('#catalog-publisher-filter').addEventListener('change', event => { catalogPublisher = event.target.value; renderCatalogPage(); });
$('#catalog-genre-filter').addEventListener('change', event => { catalogGenre = event.target.value; renderCatalogPage(); });
$('#catalog-price-min').addEventListener('input', event => { catalogPriceMin = event.target.value; renderCatalogPage(); });
$('#catalog-price-max').addEventListener('input', event => { catalogPriceMax = event.target.value; renderCatalogPage(); });
$('#catalog-clear-filters').addEventListener('click', () => { catalogFilter = 'all'; catalogPublisher = 'all'; catalogGenre = 'all'; catalogPriceMin = ''; catalogPriceMax = ''; catalogQuery = ''; $('#catalog-search').value = ''; renderCatalogPage(); });
$$('[data-admin-tab]').forEach(button => button.addEventListener('click', () => { adminTab = button.dataset.adminTab; $$('.admin-tabs button').forEach(item => item.classList.toggle('active', item === button)); renderAdminList(); }));
window.addEventListener('hashchange', showRoute);

function openAdminForm(kind) {
  if (!$('#admin-overlay')) { document.body.insertAdjacentHTML('beforeend', `<div class="overlay admin-overlay" id="admin-overlay" hidden><div class="form-panel" role="dialog" aria-modal="true"><button class="close-button" data-close="admin-overlay" aria-label="إغلاق">×</button><p class="eyebrow">الغزال / إضافة إلى الفهرس</p><h2 id="admin-form-title"></h2><form class="admin-form" id="admin-form"></form></div></div>`); $('#admin-overlay').addEventListener('click', event => { if (event.target === event.currentTarget) hideOverlay('admin-overlay'); }); $('#admin-overlay [data-close]').addEventListener('click', () => hideOverlay('admin-overlay')); }
  const title = kind === 'book' ? 'إضافة كتاب جديد' : 'إضافة دار نشر';
  $('#admin-form-title').textContent = title;
  const categoryOptions = Object.keys(genres).length ? Object.keys(genres).map(id => `<option value="${escapeHtml(id)}">${escapeHtml(genres[id].title || id)}</option>`).join('') : '<option value="غير مصنف">غير مصنف</option>';
  $('#admin-form').innerHTML = kind === 'book' ? `<div class="form-grid"><label>عنوان الكتاب<input name="title" required /></label><label>المؤلف<input name="author" required /></label></div><div class="form-grid"><label>دار النشر<input name="publisher" required /></label><label>السعر بالدينار<input name="price" type="number" min="0" required /></label></div><div class="form-grid"><label>التصنيف<select name="category">${categoryOptions}</select></label><label>النوع<input name="genre" placeholder="رواية مترجمة" required /></label></div><label>نبذة<textarea name="note" rows="3" required></textarea></label><label class="bulk-drop">غلاف الكتاب (اختياري)<input name="cover" type="file" accept="image/*" /></label><div class="form-help">لإضافة مجموعة كتب دفعة واحدة، اختر ملف CSV من زر الاستيراد في الأسفل. الأعمدة: العنوان، المؤلف، الناشر، السعر، التصنيف، النوع، النبذة.</div><button class="button button-dark" type="submit">حفظ الكتاب <span>↖</span></button><button class="text-button" type="button" id="bulk-import">＋ استيراد ملف CSV</button><input id="bulk-file" type="file" accept=".csv,text/csv" hidden />` : `<div class="form-grid"><label>اسم دار النشر<input name="name" required /></label><label>المدينة<input name="city" required /></label></div><label>وصف مختصر<textarea name="description" rows="3" required></textarea></label><button class="button button-dark" type="submit">حفظ دار النشر <span>↖</span></button>`;
  showOverlay('admin-overlay');
  $('#admin-form').dataset.kind = kind;
  $('#admin-form').onsubmit = event => { event.preventDefault(); saveAdminForm(kind, new FormData(event.currentTarget)); };
  const bulk = $('#bulk-import'); if (bulk) { bulk.onclick = () => $('#bulk-file').click(); $('#bulk-file').onchange = event => importCsv(event.target.files[0]); }
}
async function saveAdminForm(kind, data) {
  if (kind === 'publisher') { const name = data.get('name'); const publisher = { id: `publisher-${Date.now()}`, name, city: data.get('city'), since: 'إضافة جديدة', description: data.get('description'), logo: name.slice(0, 1) }; publishers.push(publisher); saveStorage('ghazal.customPublishers.v1', [...readStorage('ghazal.customPublishers.v1', []), publisher]); toast(`أضيفت «${name}» إلى دور النشر`); }
  else { const title = data.get('title'); const id = `book-${Date.now()}`; const book = { id, title, author: data.get('author'), publisher: data.get('publisher'), category: data.get('category'), genre: data.get('genre'), price: Number(data.get('price')), note: data.get('note'), image: '' }; books.push(book); byId[id] = book; const custom = readStorage('ghazal.customBooks.v1', []); saveStorage('ghazal.customBooks.v1', [...custom, book]); toast(`أضيف «${title}» إلى الفهرس`); }
  hideOverlay('admin-overlay'); renderDashboard(); if (location.hash === '#catalog') renderCatalogPage();
}
function importCsv(file) {
  if (!file) return;
  const reader = new FileReader(); reader.onload = event => { const rows = String(event.target.result).split(/\r?\n/).filter(Boolean).slice(1); const added = []; rows.forEach((row, index) => { const values = row.split(',').map(value => value.trim()); if (values.length < 4) return; const book = { id: `book-${Date.now()}-${index}`, title: values[0], author: values[1], publisher: values[2], price: Number(values[3]) || 0, category: values[4] || 'غير مصنف', genre: values[5] || 'عام', note: values[6] || 'كتاب جديد على رفوف الغزال.', image: '' }; books.push(book); byId[book.id] = book; added.push(book); }); const current = readStorage('ghazal.customBooks.v1', []); saveStorage('ghazal.customBooks.v1', [...current, ...added]); hideOverlay('admin-overlay'); renderDashboard(); if (location.hash === '#catalog') renderCatalogPage(); toast(added.length ? `أضيفت ${added.length} كتب إلى الفهرس` : 'تعذّر العثور على صفوف صالحة في الملف'); }; reader.readAsText(file); }
function renderFeaturedSelections() {
  const target = $('.featured-layout'); if (!target) return;
  const selected = [...new Set([...(featuredBookIds || []), ...books.map(book => book.id)])].map(id => byId[id]).filter(Boolean).slice(0, 4);
  if (!selected.length) { target.innerHTML = ''; return; }
  const numerals = ['٠١', '٠٢', '٠٣']; const lead = selected[0]; const rest = selected.slice(1);
  target.innerHTML = `<article class="feature-story"><div class="feature-book-stage"><button class="feature-selection-cover" data-view="${escapeHtml(lead.id)}" aria-label="افتح تفاصيل ${escapeHtml(lead.title)}"><img class="selection-cover-image" src="${coverUrl(lead, 'display')}" alt="غلاف ${escapeHtml(lead.title)}" loading="lazy" decoding="async" onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='assets/placeholder-cover.svg';}" /></button><span class="stage-index">G / 01</span></div><div class="feature-description"><div><span class="category-label">${escapeHtml(lead.genre || 'مختارات الغزال')}</span><h3 data-view="${escapeHtml(lead.id)}" tabindex="0">${escapeHtml(lead.title)}</h3><p>${escapeHtml(lead.review || lead.note || 'كتاب مختار من رفوف الغزال.')}</p></div>${Number(lead.stock) > 0 ? `<button class="round-add" data-add="${escapeHtml(lead.id)}" aria-label="أضف ${escapeHtml(lead.title)} إلى السلة">↖</button>` : ''}</div></article><div class="selection-list">${rest.map((book, index) => `<article class="selection-item"><span class="item-number">${numerals[index] || index + 1}</span><button class="selection-cover-button" data-view="${escapeHtml(book.id)}" aria-label="افتح تفاصيل ${escapeHtml(book.title)}"><img class="selection-cover-image" src="${coverUrl(book)}" alt="غلاف ${escapeHtml(book.title)}" loading="lazy" decoding="async" onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='assets/placeholder-cover.svg';}" /></button><div class="selection-info"><span class="category-label">${escapeHtml(book.genre || '')}</span><h3 data-view="${escapeHtml(book.id)}" tabindex="0">${escapeHtml(book.title)}</h3><p>${escapeHtml(book.review || book.note || 'كتاب مختار من رفوف الغزال.')}</p>${Number(book.stock) > 0 ? `<button class="item-link" type="button" data-add="${escapeHtml(book.id)}" aria-label="أضف ${escapeHtml(book.title)} إلى السلة">أضف إلى السلة <span aria-hidden="true">＋</span></button>` : '<span class="stock-empty">نفد المخزون</span>'}</div></article>`).join('')}</div>`;
  observeReveals();
}
function renderHomeShelves() {
  const anchor = document.getElementById('new') || document.getElementById('publisher-featured');
  if (!$('#home-book-shelves')) {
    if (!anchor?.parentNode) return;
    anchor.insertAdjacentHTML('beforebegin', `<section class="home-book-shelves section-pad wrap" id="home-book-shelves"><div class="home-shelf-block home-bestseller-shelf"><div class="home-shelf-heading"><div><h3>الأكثر قراءة الآن</h3><p>عناوين تعود إليها الأيدي مرة بعد مرة.</p></div><a class="underlined-link" href="#bestsellers">كل الأكثر قراءة ↖</a></div><div id="home-bestseller-grid"></div></div><div id="home-author-spotlight"></div><div id="home-collection-shelves"></div><div class="home-shelf-block"><div class="home-shelf-heading"><div><h3>قراءة جميلة بسعر هادئ</h3><p>أفضل ما تجده بـ ١٥٠٠ د.ج أو أقل.</p></div><a class="underlined-link" href="#catalog">تصفح حسب السعر ↖</a></div><div id="home-value-grid"></div></div></section>`);
  }
  const featuredIds = new Set((featuredBookIds || []).map(String));
  const bestSellerIds = new Set((bestSellerBookIds || []).map(String));
  const customCollectionIds = new Set(homeSections.filter(section => section.active !== false && section.type === 'collection').map(section => String(section.collectionId || '')));
  const homepageCollections = collections.filter(collection => collection.active && collection.homepage && !customCollectionIds.has(String(collection.id))).slice(0, 4);
  const fallback = { id: 'collection-recommended', slug: 'recommended', title: 'اختيارات أخرى', description: 'عناوين تستحق أن تجد طريقها إلى رفّك.', bookIds: books.filter(book => !featuredIds.has(String(book.id)) && !bestSellerIds.has(String(book.id))).map(book => book.id) };
  const recommended = books.filter(book => !featuredIds.has(String(book.id)) && !bestSellerIds.has(String(book.id))).slice(0, 8);
  const shelves = homepageCollections.length ? homepageCollections : [fallback];
  const spotlightBooks = authorSpotlight ? authorSpotlight.bookIds.map(id => byId[id]).filter(Boolean) : [];
  $('#home-author-spotlight').innerHTML = authorSpotlight ? `<article class="author-spotlight"><div class="author-spotlight-art">${authorSpotlight.photo ? `<img src="${authorSpotlight.photo.startsWith('data:') ? authorSpotlight.photo : escapeHtml(authorSpotlight.photo)}" alt="${escapeHtml(authorSpotlight.name)}" loading="lazy" />` : `<span>${escapeHtml(authorSpotlight.name).slice(0,1)}</span>`}</div><div class="author-spotlight-copy"><p class="eyebrow">من رفوف الغزال</p><h2>صوت <em>${escapeHtml(authorSpotlight.name)}</em></h2><p>${escapeHtml(authorSpotlight.bio)}</p><a class="underlined-link" href="#author/${encodeURIComponent(authorSpotlight.name)}">اكتشف كتبه (${spotlightBooks.length}) ↖</a></div><div class="author-spotlight-books">${spotlightBooks.slice(0,3).map(cardTemplate).join('')}</div></article>` : '';
  $('#home-collection-shelves').innerHTML = shelves.map((collection, index) => { const href = collection.id === 'collection-recommended' ? '#catalog' : `#collection/${encodeURIComponent(collection.slug)}`; return `<div class="home-shelf-block"><div class="home-shelf-heading"><div><h3>${escapeHtml(collection.title)}</h3><p>${escapeHtml(collection.description || '')}</p></div><a class="underlined-link" href="${href}">عرض الكل ↖</a></div><div id="home-collection-grid-${index}"></div></div>`; }).join('');
  shelves.forEach((collection, index) => renderCarousel(`home-collection-grid-${index}`, `collection-${index}`, collection.bookIds.map(id => byId[id]).filter(book => book && !bestSellerIds.has(String(book.id))).slice(0, 8)));
  const bestsellers = bestSellerBookIds.length
    ? bestSellerBookIds.map(id => byId[id]).filter(Boolean)
    : bestsellerFallbackBooks();
  renderCarousel('home-bestseller-grid', 'bestseller', bestsellers);
  document.querySelector('.home-bestseller-shelf')?.toggleAttribute('hidden', !bestsellers.length);
  $('#home-collection-shelves').hidden = !shelves.length;
  const valueBooks = valueShelfBooks(books.filter(book => Number(book.price) <= 1500));
  renderCarousel('home-value-grid', 'value', valueBooks);
  const valueShelfBlock = document.getElementById('home-value-grid')?.closest('.home-shelf-block');
  if (valueShelfBlock) valueShelfBlock.hidden = valueBooks.length === 0;
  observeReveals();
}
// Dashboard-managed carousel sections. The placement keys are stored with the
// section and must match the list accepted by server.js and admin.js.
const HOME_SECTION_PLACEMENTS = [
  { value:'top', anchor:'#selections', position:'before' },
  { value:'after-selections', anchor:'#story', position:'before' },
  { value:'after-story', anchor:'#home-book-shelves', position:'before' },
  { value:'after-shelves', anchor:'#new', position:'before' },
  { value:'after-new', anchor:'#publisher-featured', position:'before' },
  { value:'after-publishers-features', anchor:'#departments', position:'before' },
  { value:'after-departments', anchor:'#publishers', position:'before' },
  { value:'after-publishers', anchor:'.newsletter', position:'before' },
  { value:'end', anchor:'.newsletter', position:'after' }
];
function homeSectionEntries(section) {
  if (!section || section.active === false || !section.id) return null;
  if (section.type === 'collection') {
    const collection = collections.find(item => item.id === section.collectionId && item.active);
    if (!collection) return null;
    return { section, collection, items: collection.bookIds.map(id => byId[id]).filter(Boolean) };
  }
  return { section, collection: null, items: (section.bookIds || []).map(id => byId[id]).filter(Boolean) };
}
function renderHomeSections() {
  $$('[data-home-section]').forEach(node => node.remove());
  const prepared = (Array.isArray(homeSections) ? homeSections : []).map(homeSectionEntries).filter(entry => entry && entry.items.length);
  if (!prepared.length) return;
  const groups = new Map();
  for (const entry of prepared) {
    const placement = HOME_SECTION_PLACEMENTS.some(item => item.value === entry.section.placement) ? entry.section.placement : 'after-shelves';
    if (!groups.has(placement)) groups.set(placement, []);
    groups.get(placement).push(entry);
  }
  for (const [placement, entries] of groups) {
    const config = HOME_SECTION_PLACEMENTS.find(item => item.value === placement) || HOME_SECTION_PLACEMENTS[3];
    let anchor = document.querySelector(config.anchor);
    if (!anchor?.parentNode) anchor = document.querySelector('.newsletter') || homeMain;
    if (!anchor?.parentNode) continue;
    const fragment = document.createDocumentFragment();
    for (const { section, collection } of entries) {
      const element = document.createElement('section');
      element.className = 'home-custom-section section-pad wrap';
      element.dataset.homeSection = section.id;
      const href = collection ? `#collection/${encodeURIComponent(collection.slug)}` : '#catalog';
      element.innerHTML = `<div class="section-heading compact"><div><p class="eyebrow">رفّ من اختيار الغزال</p><h2>${escapeHtml(section.title)}</h2>${section.description ? `<p class="home-custom-description">${escapeHtml(section.description)}</p>` : ''}</div><a class="underlined-link" href="${href}">عرض الكل <span aria-hidden="true">↖</span></a></div>`;
      const carousel = document.createElement('div');
      carousel.className = 'home-custom-carousel';
      carousel.id = `home-custom-${section.id}`;
      element.appendChild(carousel);
      fragment.appendChild(element);
    }
    if (config.position === 'after') anchor.parentNode.insertBefore(fragment, anchor.nextSibling);
    else anchor.parentNode.insertBefore(fragment, anchor);
  }
  prepared.forEach(({ section, items }) => renderCarousel(`home-custom-${section.id}`, `home-section-${section.id}`, items, Number.MAX_SAFE_INTEGER));
  observeReveals();
}
function renderFeaturedPublishers() {
  const target = document.getElementById('publisher-featured'); if (!target) return;
  const active = (publisherFeatures || []).filter(item => item.active !== false).map(item => ({ ...item, books: books.filter(book => book.publisher === item.publisher) }));
  target.hidden = !active.length;
  target.innerHTML = active.map(item => { const publisher = publishers.find(entry => entry.name === item.publisher); const logo = item.id === 'mahrousa' ? 'assets/publishers/al-mahrousa.png' : item.logo || (publisher?.logo && /^(data:|\/|https?:|assets\/)/i.test(publisher.logo) ? publisher.logo : '') || PUBLISHER_LOGO_ASSETS[String(item.publisher || '').trim()] || ''; const accent = /^#[\da-f]{6}$/i.test(item.accent || '') ? item.accent : '#8f5e3b'; const surface = /^#[\da-f]{6}$/i.test(item.surface || '') ? item.surface : '#eee2ce'; const ink = /^#[\da-f]{6}$/i.test(item.ink || '') ? item.ink : '#1b1915'; const background = /^\/covers\/[a-f\d]{64}\.[a-z0-9]+$/i.test(item.backgroundImage || '') ? item.backgroundImage : ''; return `<article class="publisher-feature publisher-feature--${escapeHtml(item.id)}" data-feature-background="${escapeHtml(background)}" style="--publisher-accent:${accent};--publisher-surface:${surface};--publisher-ink:${ink};--publisher-bg-image:none;background:${surface};color:${ink}"><div class="publisher-feature-visual" id="publisher-shelf-${escapeHtml(item.id)}"></div><div class="publisher-feature-copy">${logo ? `<div class="publisher-feature-logo"><img src="${escapeHtml(logo)}" alt="شعار ${escapeHtml(item.publisher)}" loading="lazy" decoding="async" /></div>` : `<div class="publisher-feature-mark" aria-hidden="true">${escapeHtml(publisher?.logo || item.mark || item.publisher.slice(0,1))}</div>`}<p class="publisher-feature-kicker">${escapeHtml(item.kicker || 'دار نشر مميزة')}</p><h2>${escapeHtml(item.publisher)}</h2><p class="publisher-feature-description">${escapeHtml(item.description || '')}</p><a class="publisher-feature-link" href="#publisher/${encodeURIComponent(item.publisher)}">كل إصدارات الدار <span>←</span></a></div></article>`; }).join('');
  const deferredBackgrounds = [...target.querySelectorAll('[data-feature-background]')].filter(feature => feature.dataset.featureBackground);
  const loadBackground = feature => feature.style.setProperty('--publisher-bg-image', `url("${feature.dataset.featureBackground}")`);
  if ('IntersectionObserver' in window) { const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { loadBackground(entry.target); observer.unobserve(entry.target); } }), { rootMargin:'250px' }); deferredBackgrounds.forEach(feature => observer.observe(feature)); }
  else deferredBackgrounds.forEach(loadBackground);
  active.forEach(item => {
    renderCarousel(`publisher-shelf-${item.id}`, `publisher-${item.id}`, item.books);
  });
}
document.addEventListener('click', event => { const trigger = event.target.closest('[data-open-admin]'); if (trigger) openAdminForm(trigger.dataset.openAdmin); });
showRoute();
renderFeaturedSelections();
renderHomeShelves();
renderHomeSections();
renderFeaturedPublishers();
