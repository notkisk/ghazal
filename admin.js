const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function enhanceOwnerSelect(select) {
  if (!select || select.dataset.customized) return;
  select.dataset.customized = 'true';
  const wrapper = document.createElement('div'); wrapper.className = 'custom-select'; select.parentNode.insertBefore(wrapper, select); wrapper.appendChild(select); select.classList.add('custom-select-native');
  const trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'custom-select-trigger'; trigger.setAttribute('aria-haspopup', 'listbox'); trigger.setAttribute('aria-expanded', 'false');
  const menu = document.createElement('div'); menu.className = 'custom-select-menu'; menu.setAttribute('role', 'listbox'); wrapper.append(trigger, menu);
  const sync = () => { const selected = select.options[select.selectedIndex]; trigger.innerHTML = `<span>${selected?.textContent || 'اختر'}</span><i aria-hidden="true">⌄</i>`; menu.innerHTML = [...select.options].map((option, index) => `<button type="button" role="option" data-index="${index}" aria-selected="${option.selected}">${option.textContent}</button>`).join(''); };
  trigger.addEventListener('click', () => wrapper.classList.toggle('open'));
  menu.addEventListener('click', event => { const option = event.target.closest('[data-index]'); if (!option) return; select.selectedIndex = Number(option.dataset.index); select.dispatchEvent(new Event('change', { bubbles: true })); sync(); wrapper.classList.remove('open'); });
  select.addEventListener('change', sync); new MutationObserver(sync).observe(select, { childList: true, attributes: true, subtree: true }); sync();
}
new MutationObserver(() => $$('select').forEach(enhanceOwnerSelect)).observe(document.body, { childList: true, subtree: true });
const ADMIN_SESSION_KEY = 'ghazal.adminToken';
const CATALOG_CACHE_VERSION = '2026-11-clean-slate';
// Drop catalog caches written by earlier demo/import versions. This runs once
// per browser and never touches cart/favorites or the Meta pixel setting.
try {
  const keep = new Set(['ghazal.cacheVersion','ghazal.metaPixelId','ghazal.cart.v2','ghazal.favorites.v2']);
  if (localStorage.getItem('ghazal.cacheVersion') !== CATALOG_CACHE_VERSION) {
    Object.keys(localStorage).filter(key => key.startsWith('ghazal.') && !keep.has(key)).forEach(key => localStorage.removeItem(key));
    localStorage.setItem('ghazal.cacheVersion', CATALOG_CACHE_VERSION);
  }
} catch { /* Storage is optional. */ }
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
let catalogSyncTimer;
function catalogPayloadForSync() { return { books, publishers, genres, bookGenres, discounts, featured: featuredBookIds, authorProfiles, publisherFeatures, homeSections }; }
function queueCatalogSync() { clearTimeout(catalogSyncTimer); catalogSyncTimer = setTimeout(async () => { const token = sessionStorage.getItem(ADMIN_SESSION_KEY); if (!token || !window.GhazalAPI?.saveCatalog) return; try { await window.GhazalAPI.saveCatalog(token, catalogPayloadForSync()); } catch (error) { console.error('catalog_sync_failed', error); } }, 150); }
async function flushCatalogSync() { clearTimeout(catalogSyncTimer); const token = sessionStorage.getItem(ADMIN_SESSION_KEY); if (!token || !window.GhazalAPI?.saveCatalog) return; try { await window.GhazalAPI.saveCatalog(token, catalogPayloadForSync()); } catch (error) { console.error('catalog_sync_failed', error); throw error; } }
const catalogStorageKeys = ['ghazal.customBooks.v1','ghazal.customPublishers.v1','ghazal.genres.v1','ghazal.bookGenres.v1','ghazal.discounts.v1','ghazal.featuredBooks.v1','ghazal.authorProfiles.v1','ghazal.homeSections.v1'];
const save = (key, value) => { if (location.protocol === 'file:' || !catalogStorageKeys.includes(key)) localStorage.setItem(key, JSON.stringify(value)); if (catalogStorageKeys.includes(key)) queueCatalogSync(); };
const money = value => `${new Intl.NumberFormat('ar-DZ-u-nu-latn').format(value)} د.ج`;
const normalizeArabicSearch = value => String(value ?? '').normalize('NFKD').replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآ]/g, 'ا').toLocaleLowerCase('ar').trim();
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
// Cover paths are stored as short URLs (/covers/<hash>.jpg); legacy rows keep
// bare filenames under assets/covers and old data URLs still render.
const coverPath = value => { const source = String(value || '').trim(); if (!source) return ''; return source.startsWith('data:') || source.startsWith('/') || /^https?:\/\//i.test(source) ? source : `assets/covers/${source}`; };
const DEFAULT_COVER = 'assets/placeholder-cover.svg?v=20261103-2';
const isDefaultCover = book => { const source = String(book?.thumb || book?.display || book?.image || '').trim(); return !source || source.includes('placeholder-cover.svg'); };
const defaultCoverBooks = () => books.filter(isDefaultCover);
const bookCover = (book, size = 'thumb') => coverPath(size === 'thumb' ? (book?.thumb || book?.display || book?.image) : (book?.display || book?.image)) || DEFAULT_COVER;
let books = [];
let featuredBookIds = read('ghazal.featuredBooks.v1', []);
let publisherFeatures = read('ghazal.publisherFeatures.v1', []);
let publishers = read('ghazal.customPublishers.v1', []);
let authorProfiles = read('ghazal.authorProfiles.v1', {});
let genres = read('ghazal.genres.v1', {});
const genreMatches = (book, selected) => selected === 'all' || normalizeArabicSearch(book.genre).includes(normalizeArabicSearch(selected));
let bookGenres = [...new Set([...read('ghazal.bookGenres.v1', []), ...books.map(book => book.genre).filter(Boolean)])].sort((a,b) => a.localeCompare(b, 'ar'));
let collections = read('ghazal.collections.v1', []);
let homeSections = read('ghazal.homeSections.v1', []);
// Placement keys are shared with script.js and server.js. Keep this order.
const HOME_SECTION_PLACEMENTS = [
  { value:'top', label:'أعلى الصفحة، قبل المختارات' },
  { value:'after-selections', label:'بعد مختارات الغزال' },
  { value:'after-story', label:'بعد اقتباس الحكاية' },
  { value:'after-shelves', label:'بعد رفوف القراء' },
  { value:'after-new', label:'بعد وصل حديثًا' },
  { value:'after-publishers-features', label:'بعد واجهات دور النشر' },
  { value:'after-departments', label:'بعد الأقسام' },
  { value:'after-publishers', label:'بعد دور النشر' },
  { value:'end', label:'أسفل الصفحة، بعد الرسالة' }
];
// Old demo-mode orders are not used when a server is running; clear any
// leftover data so the admin never sees stale localStorage orders.
localStorage.removeItem('ghazal.demoOrders.v1');
let orders = [];
let orderCommunes = window.GHAZAL_COMMUNES || [];
let orderWilayas = [];
if (!orderCommunes.length) fetch('data/algeria-communes-58-wilayas.json').then(r=>r.json()).then(data=>{orderCommunes=data;}).catch(()=>{});
let staffUsers = [];
let auditEvents = [];
let analytics = { booksSold:[], lowStock:[], newsletterSubscribers:0 };
let historyEmployeeFilter = '';
let currentPermissions = {};
let discounts = read('ghazal.discounts.v1', []);
let orderStartDate = '';
let orderEndDate = '';
let statsPeriod = 'week';
let statsScope = 'confirmed';
let statsStartDate = '';
let statsEndDate = '';
let selectedOrderRefs = new Set();
let expandedOrderRefs = new Set();
let bookQuery = '';
let bookStockFilter = 'all';
let bookCoverFilter = 'all';
let bookCategoryFilter = 'all';
let bookShowAll = false;
let bookPageSize = 10;
let bookPage = 1;
let bulkBookRows = [];
let bulkBookHeaders = [];
let bulkBookMapping = {};
let bulkTemplateDetected = false;
const ECOTRACK_COLUMNS = ['reference commande','nom et prenom du destinataire*','telephone*','telephone 2','code wilaya*','wilaya de livraison','commune de livraison*','adresse de livraison*','produit*','poids (kg)','montant du colis*','remarque','FRAGILE\n( si oui mettez OUI sinon laissez vide )','ECHANGE\n( si oui mettez OUI sinon laissez vide )','PICK UP\n( si oui mettez OUI sinon laissez vide )','RECOUVREMENT\n( si oui mettez OUI sinon laissez vide )','STOP DESK\n( si oui mettez OUI sinon laissez vide )','Lien map'];
let ownerTab = 'books';
let collectionsLoaded = false;
function refreshGenresFromBooks() {
  const next = {};
  for (const book of books) { const id = String(book.category || '').trim(); if (!id) continue; next[id] = { title: genres[id]?.title || id, description: genres[id]?.description || '' }; }
  genres = next;
  bookGenres = [...new Set(books.map(book => String(book.genre || '').trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'ar'));
}
function applyAdminCatalog(payload) {
  books = Array.isArray(payload?.books) ? payload.books.map(book => ({ ...book, image: book.image || '', stock: Number(book.stock ?? 0) })) : [];
  publishers = payload?.publishers || [];
  genres = payload?.genres || {};
  bookGenres = [...new Set([...(payload?.bookGenres || []), ...books.map(book => book.genre).filter(Boolean)])].sort((a,b) => a.localeCompare(b, 'ar'));
  discounts = payload?.discounts || [];
  featuredBookIds = payload?.featuredBookIds || [];
  publisherFeatures = payload?.publisherFeatures || [];
  homeSections = Array.isArray(payload?.homeSections) ? payload.homeSections : [];
  authorProfiles = payload?.authorProfiles || {};
}

function ensureDashboardPanels() {
  const actions = $('.owner-grid .owner-actions');
  const canEditCatalog = document.body.dataset.role === 'owner' || currentPermissions.edit_catalog;
  const canViewFinance = document.body.dataset.role === 'owner' || currentPermissions.view_finance;
  const canExport = document.body.dataset.role === 'owner' || currentPermissions.export_orders;
  $$('[data-owner-finance]').forEach(item => { item.hidden = !canViewFinance; });
  if ($('#owner-export')) $('#owner-export').hidden = !canExport;
  actions?.querySelectorAll('[data-owner-form="book"],[data-owner-form="publisher"],[data-owner-form="author"]').forEach(item => { item.hidden = !canEditCatalog; });
  actions?.querySelectorAll('[data-owner-form="tracking"],[data-owner-form="staff"]').forEach(item => { item.hidden = document.body.dataset.role !== 'owner'; });
  const bookAction = actions?.querySelector('[data-owner-form="book"]'); if (bookAction) bookAction.textContent = 'إضافة كتاب';
  if (actions && !actions.querySelector('[data-owner-form="genre"]')) { const button = document.createElement('button'); button.className = 'button button-outline'; button.type = 'button'; button.dataset.ownerForm = 'genre'; button.textContent = 'إضافة تصنيف'; actions.appendChild(button); button.addEventListener('click', () => openForm('genre')); }
  if (actions && !actions.querySelector('[data-owner-form="book-genre"]')) { const button = document.createElement('button'); button.className = 'button button-outline'; button.type = 'button'; button.dataset.ownerForm = 'book-genre'; button.textContent = 'إضافة نوع كتاب'; actions.appendChild(button); button.addEventListener('click', () => openForm('book-genre')); }
  if (actions && !actions.querySelector('[data-owner-form="discount"]')) { const button = document.createElement('button'); button.className = 'button button-outline'; button.type = 'button'; button.dataset.ownerForm = 'discount'; button.textContent = 'إضافة خصم'; actions.appendChild(button); button.addEventListener('click', () => openForm('discount')); }
  if (actions && !actions.querySelector('[data-owner-form="featured"]')) { const button = document.createElement('button'); button.className = 'button button-outline'; button.type = 'button'; button.dataset.ownerForm = 'featured'; button.textContent = 'تعديل المختارات'; actions.appendChild(button); button.addEventListener('click', () => openForm('featured')); }
  const tabs = $('.admin-tabs');
  if (tabs && !tabs.querySelector('[data-owner-tab="missing-covers"]')) {
    const coverTab = document.createElement('button'); coverTab.type = 'button'; coverTab.dataset.ownerTab = 'missing-covers'; coverTab.textContent = 'أغلفة ناقصة';
    const booksTab = tabs.querySelector('[data-owner-tab="books"]'); booksTab ? booksTab.after(coverTab) : tabs.prepend(coverTab);
    coverTab.addEventListener('click', () => openMissingCoversTab());
  }
  if (tabs && !tabs.querySelector('[data-owner-tab="genres"]')) {
    const genreTab = document.createElement('button'); genreTab.type = 'button'; genreTab.dataset.ownerTab = 'genres'; genreTab.textContent = 'التصنيفات'; tabs.insertBefore(genreTab, tabs.querySelector('[data-owner-tab="orders"]'));
    genreTab.addEventListener('click', () => { ownerTab = 'genres'; $$('.admin-tabs button').forEach(item => item.classList.toggle('active', item === genreTab)); renderOwner(); });
  }
  if (tabs && !tabs.querySelector('[data-owner-tab="book-genres"]')) { const bookGenreTab = document.createElement('button'); bookGenreTab.type = 'button'; bookGenreTab.dataset.ownerTab = 'book-genres'; bookGenreTab.textContent = 'أنواع الكتب'; tabs.insertBefore(bookGenreTab, tabs.querySelector('[data-owner-tab="orders"]')); bookGenreTab.addEventListener('click', () => { ownerTab = 'book-genres'; $$('.admin-tabs button').forEach(item => item.classList.toggle('active', item === bookGenreTab)); renderOwner(); }); }
  if (tabs && !tabs.querySelector('[data-owner-tab="discounts"]')) { const discountTab = document.createElement('button'); discountTab.type = 'button'; discountTab.dataset.ownerTab = 'discounts'; discountTab.textContent = 'الخصومات'; tabs.insertBefore(discountTab, tabs.querySelector('[data-owner-tab="orders"]')); discountTab.addEventListener('click', () => { ownerTab = 'discounts'; $$('.admin-tabs button').forEach(item => item.classList.toggle('active', item === discountTab)); renderOwner(); }); }
  if (tabs && !tabs.querySelector('[data-owner-tab="featured"]')) { const featuredTab = document.createElement('button'); featuredTab.type = 'button'; featuredTab.dataset.ownerTab = 'featured'; featuredTab.textContent = 'المختارات'; tabs.insertBefore(featuredTab, tabs.querySelector('[data-owner-tab="orders"]')); featuredTab.addEventListener('click', () => { ownerTab = 'featured'; $$('.admin-tabs button').forEach(item => item.classList.toggle('active', item === featuredTab)); renderOwner(); }); }
  if (tabs && !tabs.querySelector('[data-owner-tab="publisher-features"]')) { const publisherTab = document.createElement('button'); publisherTab.type = 'button'; publisherTab.dataset.ownerTab = 'publisher-features'; publisherTab.textContent = 'واجهات دور النشر'; tabs.insertBefore(publisherTab, tabs.querySelector('[data-owner-tab="orders"]')); publisherTab.addEventListener('click', () => { ownerTab = 'publisher-features'; $$('.admin-tabs button').forEach(item => item.classList.toggle('active', item === publisherTab)); renderOwner(); }); }
  if (tabs && !tabs.querySelector('[data-owner-tab="unavailable"]')) { const unavailableTab = document.createElement('button'); unavailableTab.type = 'button'; unavailableTab.dataset.ownerTab = 'unavailable'; unavailableTab.textContent = 'المخزون'; tabs.insertBefore(unavailableTab, tabs.querySelector('[data-owner-tab="orders"]')); unavailableTab.addEventListener('click', () => { ownerTab = 'unavailable'; $$('.admin-tabs button').forEach(item => item.classList.toggle('active', item === unavailableTab)); renderOwner(); }); }
  const inventoryTab = tabs?.querySelector('[data-owner-tab="unavailable"]'); if (inventoryTab) inventoryTab.textContent = 'المخزون';
  if (tabs && (document.body.dataset.role === 'owner' || currentPermissions.edit_catalog) && !tabs.querySelector('[data-owner-tab="collections"]')) { const collectionTab = document.createElement('button'); collectionTab.type = 'button'; collectionTab.dataset.ownerTab = 'collections'; collectionTab.textContent = 'المجموعات'; tabs.insertBefore(collectionTab, tabs.querySelector('[data-owner-tab="orders"]')); collectionTab.addEventListener('click', () => { ownerTab = 'collections'; $$('.admin-tabs button').forEach(item => item.classList.toggle('active', item === collectionTab)); renderOwner(); }); }
  if (tabs && !tabs.querySelector('[data-owner-tab="home-sections"]')) { const homeTab = document.createElement('button'); homeTab.type = 'button'; homeTab.dataset.ownerTab = 'home-sections'; homeTab.textContent = 'أقسام الرئيسية'; tabs.insertBefore(homeTab, tabs.querySelector('[data-owner-tab="orders"]')); homeTab.addEventListener('click', () => { ownerTab = 'home-sections'; $$('.admin-tabs button').forEach(item => item.classList.toggle('active', item === homeTab)); renderOwner(); }); }
  if (tabs && document.body.dataset.role === 'owner' && !tabs.querySelector('[data-owner-tab="team"]')) { const teamTab = document.createElement('button'); teamTab.type = 'button'; teamTab.dataset.ownerTab = 'team'; teamTab.textContent = 'الفريق'; tabs.appendChild(teamTab); teamTab.addEventListener('click', () => { ownerTab = 'team'; $$('.admin-tabs button').forEach(item => item.classList.toggle('active', item === teamTab)); renderOwner(); }); }
  if (tabs && document.body.dataset.role === 'owner' && !tabs.querySelector('[data-owner-tab="history"]')) { const historyTab = document.createElement('button'); historyTab.type = 'button'; historyTab.dataset.ownerTab = 'history'; historyTab.textContent = 'سجل النشاط'; tabs.appendChild(historyTab); historyTab.addEventListener('click', () => { ownerTab = 'history'; $$('.admin-tabs button').forEach(item => item.classList.toggle('active', item === historyTab)); renderOwner(); }); }
  if (tabs && document.body.dataset.role === 'owner' && !tabs.querySelector('[data-owner-tab="newsletter"]')) { const newsletterTab = document.createElement('button'); newsletterTab.type = 'button'; newsletterTab.dataset.ownerTab = 'newsletter'; newsletterTab.textContent = 'مشتركو الرسالة'; tabs.appendChild(newsletterTab); newsletterTab.addEventListener('click', () => { ownerTab = 'newsletter'; $$('.admin-tabs button').forEach(item => item.classList.toggle('active', item === newsletterTab)); renderOwner(); }); }
  if (actions && !actions.querySelector('[data-owner-form="collection"]')) { const button = document.createElement('button'); button.className = 'button button-outline'; button.type = 'button'; button.dataset.ownerForm = 'collection'; button.textContent = 'إنشاء مجموعة'; actions.appendChild(button); button.addEventListener('click', () => openForm('collection')); }
  $$('[data-owner-form="collection"]').forEach(item => { item.hidden = !canEditCatalog; });
  if (actions && !actions.querySelector('[data-owner-form="tracking"]')) { const button = document.createElement('button'); button.className = 'text-button'; button.type = 'button'; button.dataset.ownerForm = 'tracking'; button.textContent = 'إعدادات التتبع'; actions.appendChild(button); button.addEventListener('click', () => openForm('tracking')); }
  if (actions && !actions.querySelector('[data-owner-form="staff"]')) { const button = document.createElement('button'); button.className = 'text-button'; button.type = 'button'; button.dataset.ownerForm = 'staff'; button.textContent = 'إضافة موظف خدمة'; actions.appendChild(button); button.addEventListener('click', () => openForm('staff')); }
  $$('[data-owner-form="tracking"],[data-owner-form="staff"]').forEach(item => { item.hidden = document.body.dataset.role !== 'owner'; });
  if (!$('#owner-extra-panels')) {
    $('#owner-app').insertAdjacentHTML('beforeend', `<section class="owner-dashboard-lower" id="owner-extra-panels"><article class="dashboard-card"><div class="card-heading"><div><p class="eyebrow">آخر الحركة</p><h2>أحدث <em>الطلبات</em></h2></div><button class="text-button" id="owner-see-orders" type="button">كل الطلبات ↙</button></div><div id="owner-recent-orders" class="owner-recent-orders"></div></article><article class="dashboard-card"><div class="card-heading"><div><p class="eyebrow">إشارات المتجر</p><h2>ما يحتاج <em>انتباهك</em></h2></div></div><div id="owner-store-insights" class="owner-store-insights"></div></article></section>`);
    $('#owner-see-orders').addEventListener('click', () => { ownerTab = 'orders'; $$('.admin-tabs button').forEach(item => item.classList.toggle('active', item.dataset.ownerTab === 'orders')); renderOwner(); });
    $('#owner-store-insights').addEventListener('click', event => { if (event.target.closest('[data-cover-insight]')) openMissingCoversTab(); if (event.target.closest('[data-stock-insight]')) openInventoryTab(); });
  }
}
function renderRecentOrders() {
  const target = $('#owner-recent-orders'); if (!target) return;
  target.innerHTML = orders.length ? orders.slice(0, 5).map(order => `<button class="owner-recent-order" type="button" data-owner-tab="orders"><span class="admin-avatar">↙</span><span><strong>${esc(order.reference)}</strong><small>${esc(order.customer?.customer || '')} · ${esc(order.customer?.wilaya || '')} · ${order.items?.length || 0} عناوين</small></span><b>${money(order.total || 0)}</b></button>`).join('') : '<p class="owner-note">ستظهر الطلبات المؤكدة هنا.</p>';
  $$('#owner-recent-orders [data-owner-tab]').forEach(button => button.addEventListener('click', () => { ownerTab = 'orders'; $$('.admin-tabs button').forEach(item => item.classList.toggle('active', item.dataset.ownerTab === 'orders')); renderOwner(); }));
}
function renderStoreInsights() {
  const target = $('#owner-store-insights'); if (!target) return;
  const lowStock = analytics.lowStock || []; const best = (analytics.booksSold || []).slice(0, 3);
  const missingCovers = defaultCoverBooks();
  target.innerHTML = `<button class="store-insight-block store-insight-stock" type="button" data-stock-insight><strong>${lowStock.length}</strong><span>${lowStock.length === 1 ? 'كتاب يحتاج إعادة تخزين' : 'كتب تحتاج إعادة تخزين'}</span>${lowStock.slice(0, 3).map(book => `<small>${esc(book.title)} · ${Number(book.available)} متاح</small>`).join('') || '<small>المخزون في وضع جيد.</small>'}<b>فتح صفحة المخزون ↖</b></button><div class="store-insight-block"><strong>الأكثر طلبًا</strong><small>الطلبات المؤكدة فقط</small>${best.map((book, index) => `<small>${index + 1}. ${esc(book.title)} · ${Number(book.quantity)} نسخة</small>`).join('') || '<small>ستظهر البيانات بعد أولى الطلبات المؤكدة.</small>'}</div><div class="store-insight-block store-insight-cover"><strong>${missingCovers.length}</strong><span>${missingCovers.length === 1 ? 'كتاب بغلاف افتراضي' : 'كتب بغلاف افتراضي'}</span>${missingCovers.slice(0, 3).map(book => `<small>${esc(book.title)} · ${esc(book.author)}</small>`).join('') || '<small>كل الكتب لديها أغلفة مخصصة.</small>'}${missingCovers.length ? '<button class="text-button" type="button" data-cover-insight>مراجعة الكتب بلا غلاف</button>' : ''}</div>`;
}

function filteredOrders() {
  return orders.filter(order => {
    const day = String(order.placedAt || '').slice(0, 10);
    return (!orderStartDate || day >= orderStartDate) && (!orderEndDate || day <= orderEndDate);
  });
}
function dateOnly(value) { return String(value || '').slice(0, 10); }
function statsRange() {
  if (statsPeriod === 'all') return { start:'', end:'' };
  if (statsPeriod === 'custom') return { start:statsStartDate, end:statsEndDate };
  const today = new Date(); const iso = date => date.toISOString().slice(0, 10); const end = iso(today); const start = new Date(today); start.setHours(0, 0, 0, 0);
  if (statsPeriod === 'yesterday') { start.setDate(start.getDate() - 1); return { start:iso(start), end:iso(start) }; }
  if (statsPeriod === 'week') { const day = start.getDay() || 7; start.setDate(start.getDate() - day + 1); }
  if (statsPeriod === 'month') start.setDate(1);
  return { start:iso(start), end };
}
function updateOwnerStats() {
  const range = statsRange(); const scoped = orders.filter(order => { const day = dateOnly(order.placedAt || order.created_at); return (!range.start || day >= range.start) && (!range.end || day <= range.end); });
  const confirmed = ['confirmed','preparing','shipped','delivered']; const salesOrders = scoped.filter(order => statsScope === 'confirmed' ? confirmed.includes(order.status) : !['cancelled','returned'].includes(order.status)); const revenue = salesOrders.reduce((sum, order) => sum + Number(order.total || 0), 0); const units = salesOrders.reduce((sum, order) => sum + (order.items || []).reduce((itemSum, item) => itemSum + Number(item.qty || 0), 0), 0);
  [['#owner-order-count', salesOrders.length], ['#owner-revenue', money(revenue)], ['#owner-average-order', money(salesOrders.length ? Math.round(revenue / salesOrders.length) : 0)], ['#owner-units-sold', units], ['#owner-confirmed-count', scoped.filter(order => confirmed.includes(order.status)).length], ['#owner-pending-count', scoped.filter(order => order.status === 'new').length]].forEach(([selector, value]) => { const element = $(selector); if (element) element.textContent = value; });
  const scopeNote = $('#owner-order-count')?.closest('article')?.querySelector('small'); if (scopeNote) scopeNote.textContent = statsScope === 'confirmed' ? 'المؤكدة والمُعالجة ضمن الفترة' : 'كل الطلبات غير الملغاة ضمن الفترة';
  const start = $('#owner-stats-start'); const end = $('#owner-stats-end'); if (start) start.value = statsStartDate || range.start; if (end) end.value = statsEndDate || range.end;
}
function orderBook(item) { return books.find(book => book.id === item.id) || { title: item.title || 'كتاب غير معروف', author: '', publisher: '', price: item.price || 0, image: '' }; }
function orderDetails(order) {
  const customer = order.customer || {};
  const shipment = order.shipping || {};
  const fields = [
    ['الاسم واللقب', customer.customer], ['الهاتف', customer.phone],
    ['الولاية', `${customer.wilaya || '—'} (${customer.wilayaCode ?? '—'})`], ['البلدية', customer.communeArabic || customer.commune || customer.city || '—'],
    ['نوع الشحن', customer.shipmentType === 'office' ? 'استلام من المكتب' : 'إيصال للمنزل'], ['سعر الشحن', money(shipment.price ?? order.delivery ?? 0)],
    ['تاريخ الطلب', order.placedAt ? new Date(order.placedAt).toLocaleString('ar-DZ') : '—']
  ];
  const wilayaOptions=[...new Map(orderCommunes.map(c=>[c.wilaya_code,c])).values()].map(c=>`<option value="${esc(c.wilaya_code)}" ${String(customer.wilayaCode).padStart(2,'0')===c.wilaya_code?'selected':''}>${esc(c.wilaya_name)} — ${esc(c.wilaya_name_ascii)}</option>`).join('');
  const selectedCode=String(customer.wilayaCode||'16').padStart(2,'0');
  const communeOptions=orderCommunes.filter(c=>c.wilaya_code===selectedCode).map(c=>`<option value="${c.id}" ${Number(customer.communeId)===Number(c.id)?'selected':''}>${esc(c.commune_name)} — ${esc(c.commune_name_ascii)}</option>`).join('');
  return `<div class="order-details"><div class="order-detail-actions"><button class="button button-outline" type="button" data-order-receipt="${esc(order.reference)}">طباعة / حفظ الوصل PDF</button><button class="button button-dark" type="button" data-order-save="${esc(order.reference)}">حفظ تعديلات الطلب</button></div><label class="order-status-field">حالة الطلب<select data-order-status="${esc(order.reference)}"><option value="new" ${order.status==='new'?'selected':''}>جديد</option><option value="confirmed" ${order.status==='confirmed'?'selected':''}>مؤكد</option><option value="preparing" ${order.status==='preparing'?'selected':''}>قيد التحضير</option><option value="shipped" ${order.status==='shipped'?'selected':''}>تم الشحن</option><option value="delivered" ${order.status==='delivered'?'selected':''}>تم التسليم</option><option value="cancelled" ${order.status==='cancelled'?'selected':''}>ملغى</option><option value="returned" ${order.status==='returned'?'selected':''}>مرتجع</option></select></label><div class="order-edit-fields"><label>الاسم<input data-order-field="customer" value="${esc(customer.customer||'')}"></label><label>الهاتف<input data-order-field="phone" value="${esc(customer.phone||'')}" dir="ltr"></label><label>العنوان<input data-order-field="address" value="${esc(customer.address||'')}"></label><label>الولاية<select data-order-wilaya>${wilayaOptions}</select></label><label>البلدية<select data-order-commune>${communeOptions}</select></label></div><div class="order-books"><h4>الكتب والكميات</h4>${(order.items||[]).map(item=>{const b=orderBook(item);return `<div class="order-book-line"><img class="order-line-cover" src="${bookCover(b)}" alt=""><span><strong>${esc(item.title)}</strong><small>${money(item.unit_price)} للوحدة</small></span><input type="number" min="0" max="100" value="${Number(item.qty)}" data-order-qty="${esc(item.id)}" aria-label="كمية ${esc(item.title)}؛ صفر لحذف الكتاب"></div>`;}).join('')}</div><div class="order-total-lines"><span>المجموع قبل الشحن <b>${money(order.subtotal||0)}</b></span><span>الشحن <b>${money(order.delivery||0)}</b></span><span>الإجمالي عند الاستلام <b>${money(order.total||0)}</b></span></div></div>`;
}
function downloadOrderReceipt(order) {
  const customer = order.customer || {};
  const rows = (order.items || []).map(item => `<tr><td>${esc(item.title)}</td><td>${Number(item.qty)}</td><td>${money(Number(item.unit_price) * Number(item.qty))}</td></tr>`).join('');
  const popup = window.open('', '_blank'); if (!popup) return alert('اسمح بفتح النافذة لطباعة الوصل ثم اختر «حفظ كملف PDF».');
  popup.document.write(`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>وصل ${esc(order.reference)}</title><style>body{font-family:Arial,sans-serif;max-width:760px;margin:36px auto;padding:20px;color:#171510}table{width:100%;border-collapse:collapse;margin:22px 0}td,th{border-bottom:1px solid #ddd;padding:10px;text-align:right}.total{font-size:20px;font-weight:bold}@media print{button{display:none}}</style><h1>الغزال للكتب</h1><p>وصل الطلب: <b dir="ltr">${esc(order.reference)}</b></p><p>العميل: ${esc(customer.customer || '')}<br>الهاتف: ${esc(customer.phone || '')}<br>العنوان: ${esc(customer.address || '')}، ${esc(customer.communeArabic || customer.commune || '')}، ${esc(customer.wilaya || '')}</p><table><thead><tr><th>الكتاب</th><th>الكمية</th><th>المجموع</th></tr></thead><tbody>${rows}</tbody></table><p>الشحن: ${money(order.delivery || 0)}</p><p class="total">الإجمالي: ${money(order.total || 0)}</p><button onclick="print()">طباعة / حفظ PDF</button></html>`); popup.document.close(); popup.focus(); setTimeout(() => popup.print(), 300);
}
function enhanceOrderActions() {
  $$('.order-details').forEach(details => {
    const select = details.querySelector('[data-order-status]');
    if (select) { const labels = { new:'بانتظار الاتصال', cancelled:'غير مؤكد' }; Object.entries(labels).forEach(([value,label]) => { const option = select.querySelector(`option[value="${value}"]`); if (option) option.textContent = label; }); }
    if (details.querySelector('.order-confirm-actions')) return;
    const reference = select?.dataset.orderStatus; if (!reference) return;
    const current = select.value; const actions = document.createElement('div'); actions.className = 'order-confirm-actions'; actions.innerHTML = `<strong>${current === 'confirmed' ? 'تم تأكيد الطلب' : current === 'cancelled' ? 'غير مؤكد / أُلغي' : 'بانتظار الاتصال بالعميل'}</strong><button class="button button-dark" type="button" data-order-confirm="${esc(reference)}">تأكيد الطلب</button><button class="button button-outline" type="button" data-order-unconfirm="${esc(reference)}">غير مؤكد</button>`; details.prepend(actions);
  });
}
function orderUpdateErrorMessage(error) { const code = String(error?.message || ''); if (code.includes('permission_denied')) return 'ليس لديك صلاحية تحديث حالة الطلب. اطلب من المالك تفعيل صلاحية تحديث الطلبات.'; if (code.includes('stock_settlement_failed')) return 'تعذر التأكيد لأن مخزون أحد الكتب تغير. حدّث الطلبات وحاول مرة أخرى.'; if (code.includes('not_found')) return 'هذا الطلب لم يعد موجودًا. حدّث قائمة الطلبات.'; return `تعذر تحديث الطلب: ${code || 'خطأ غير معروف'}`; }
function renderOrderWorkspace() {
  const list = $('#owner-list');
  const visible = filteredOrders();
  selectedOrderRefs = new Set([...selectedOrderRefs].filter(reference => orders.some(order => order.reference === reference)));
  const allVisibleSelected = visible.length > 0 && visible.every(order => selectedOrderRefs.has(order.reference));
  const statusLabels = { new:'بانتظار الاتصال', confirmed:'مؤكد', preparing:'قيد التحضير', shipped:'تم الشحن', delivered:'تم التسليم', cancelled:'غير مؤكد', returned:'مرتجع' };
  list.innerHTML = `<div class="order-toolbar"><div class="order-date-filters"><label>من <input id="order-start-date" type="date" value="${esc(orderStartDate)}" /></label><label>إلى <input id="order-end-date" type="date" value="${esc(orderEndDate)}" /></label><button class="text-button" type="button" data-order-clear-filter>مسح التاريخ</button></div><div class="order-toolbar-actions"><button class="button button-outline" type="button" data-order-select-visible>${allVisibleSelected ? 'إلغاء تحديد الظاهر' : 'تحديد الظاهر'}</button><button class="button button-dark" type="button" data-order-export>تصدير المحدد</button><button class="button button-outline" type="button" data-order-delete-selected ${selectedOrderRefs.size ? '' : 'disabled'}>حذف المحدد</button><button class="text-button" type="button" data-order-clear-selection>إلغاء التحديد</button></div><p class="order-selection-summary">${visible.length} طلب ظاهر · ${selectedOrderRefs.size} محدد<br><small>إن لم تحدد طلبات، سيُصدّر كل ما يطابق التاريخ.</small></p></div><div class="order-list">${visible.length ? visible.map(order => { const open = expandedOrderRefs.has(order.reference); const status = order.status || 'new'; const phone = String(order.customer?.phone || '').trim(); return `<article class="order-card ${open ? 'is-open' : ''}"><div class="order-card-head"><label class="order-check"><input type="checkbox" data-order-select="${esc(order.reference)}" ${selectedOrderRefs.has(order.reference) ? 'checked' : ''} /><span class="sr-only">تحديد ${esc(order.reference)}</span></label><button class="order-main-button" type="button" data-order-toggle="${esc(order.reference)}"><strong>${esc(order.reference)} <span class="order-status-badge status-${esc(status)}">${statusLabels[status] || esc(status)}</span></strong><small>${esc(order.customer?.customer || '')} · ${esc(order.customer?.wilaya || '')} · ${esc(order.customer?.communeArabic || order.customer?.commune || '')}</small></button><a class="order-phone" href="tel:${esc(phone)}" aria-label="اتصل بـ ${esc(phone)}">${esc(phone || 'لا يوجد هاتف')}</a><span class="order-card-total">${money(order.total || 0)}</span><div class="order-quick-actions">${status === 'new' ? `<button class="button button-dark" type="button" data-order-confirm="${esc(order.reference)}">تأكيد</button><button class="button button-outline" type="button" data-order-unconfirm="${esc(order.reference)}">غير مؤكد</button>` : status === 'confirmed' ? `<button class="button button-outline" type="button" data-order-unconfirm="${esc(order.reference)}">غير مؤكد</button>` : ''}</div><button class="order-delete" type="button" data-order-delete="${esc(order.reference)}" aria-label="حذف ${esc(order.reference)}">حذف</button></div>${open ? orderDetails(order) : ''}</article>`; }).join('') : '<p class="owner-note">لا توجد طلبات تطابق هذا النطاق.</p>'}</div>`;
}
let bookGenreFilter = 'all';
function normalizeBookIsbn(value) {
  return String(value ?? '').replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) >= 0x06f0 ? digit.charCodeAt(0) - 0x06f0 : digit.charCodeAt(0) - 0x0660)).replace(/^\s*ISBN(?:-1[03])?\s*/i, '').toUpperCase().replace(/[^0-9X]/g, '');
}
function bookMatches(book) {
  const query = normalizeArabicSearch(bookQuery);
  const isbnQuery = normalizeBookIsbn(bookQuery);
  return (!query || normalizeArabicSearch(`${book.title} ${book.author} ${book.publisher}`).includes(query) || (isbnQuery.length >= 3 && normalizeBookIsbn(book.isbn).includes(isbnQuery))) && (bookStockFilter === 'all' || (bookStockFilter === 'available' ? Number(book.stock) > 0 : Number(book.stock) <= 0)) && (bookCoverFilter === 'all' || (bookCoverFilter === 'default' ? isDefaultCover(book) : !isDefaultCover(book))) && (bookCategoryFilter === 'all' || book.category === bookCategoryFilter) && genreMatches(book, bookGenreFilter);
}
function syncCoverTabLabel() {
  const tab = $('[data-owner-tab="missing-covers"]'); if (!tab) return;
  const count = defaultCoverBooks().length;
  tab.textContent = count ? `أغلفة ناقصة (${count})` : 'أغلفة ناقصة';
  tab.classList.toggle('has-missing-covers', count > 0);
}
function openMissingCoversTab() {
  ownerTab = 'missing-covers';
  $$('.admin-tabs button').forEach(item => item.classList.toggle('active', item.dataset.ownerTab === 'missing-covers'));
  renderWorkspaceImmediately(); renderOwner();
}
function openInventoryTab() {
  ownerTab = 'unavailable';
  $$('.admin-tabs button').forEach(item => item.classList.toggle('active', item.dataset.ownerTab === 'unavailable'));
  renderWorkspaceImmediately(); renderOwner();
}
function renderBooksWorkspace() {
  const list = $('#owner-list');
  const filtered = books.filter(bookMatches);
  const totalPages = Math.max(1, Math.ceil(filtered.length / bookPageSize)); bookPage = Math.min(bookPage, totalPages); const start = (bookPage - 1) * bookPageSize; const shown = filtered.slice(start, start + bookPageSize);
  list.innerHTML = `<div class="book-workspace-toolbar"><label class="admin-search"><span>⌕</span><input id="owner-book-search" type="search" value="${esc(bookQuery)}" placeholder="ابحث بالعنوان أو المؤلف أو الناشر أو ISBN" /></label><select id="owner-book-stock"><option value="all" ${bookStockFilter === 'all' ? 'selected' : ''}>كل حالات المخزون</option><option value="available" ${bookStockFilter === 'available' ? 'selected' : ''}>متوفر</option><option value="empty" ${bookStockFilter === 'empty' ? 'selected' : ''}>غير متوفر</option></select><select id="owner-book-cover"><option value="all" ${bookCoverFilter === 'all' ? 'selected' : ''}>كل الأغلفة</option><option value="default" ${bookCoverFilter === 'default' ? 'selected' : ''}>غلاف افتراضي فقط</option><option value="set" ${bookCoverFilter === 'set' ? 'selected' : ''}>غلاف مخصص فقط</option></select><select id="owner-book-category"><option value="all">كل التصنيفات</option>${Object.entries(genres).map(([id, genre]) => `<option value="${esc(id)}" ${bookCategoryFilter === id ? 'selected' : ''}>${esc(genre.title)}</option>`).join('')}</select><select id="owner-book-genre"><option value="all">كل أنواع الكتب</option>${bookGenres.map(genre => `<option value="${esc(genre)}" ${bookGenreFilter === genre ? 'selected' : ''}>${esc(genre)}</option>`).join('')}</select><label class="book-page-size">كتب في الصفحة<select id="owner-book-page-size">${[10,25,50,100].map(size => `<option value="${size}" ${bookPageSize === size ? 'selected' : ''}>${size}</option>`).join('')}</select></label><button class="button button-outline" type="button" data-open-bulk-books>استيراد جماعي</button>${read('ghazal.lastImport.v1', null) ? '<button class="text-button" type="button" data-undo-import>تراجع عن آخر استيراد</button>' : ''}</div><div class="book-workspace-summary"><strong>${filtered.length ? `${start + 1}–${Math.min(start + shown.length, filtered.length)}` : '0'} من ${filtered.length}</strong> كتاب · ${books.length} إجمالًا · ${books.filter(book => Number(book.stock) > 0).length} متوفر${defaultCoverBooks().length ? ` · <button class="text-button cover-missing-link" type="button" data-book-cover-filter="default">${defaultCoverBooks().length} بغلاف افتراضي</button>` : ''}</div><div class="book-admin-list">${shown.length ? shown.slice().reverse().map(book => `<article class="book-admin-card"><img src="${bookCover(book)}" alt="غلاف ${esc(book.title)}" /><div class="book-admin-main"><strong>${esc(book.title)}</strong><small>${esc(book.author)} · ${esc(book.publisher)}</small>${isDefaultCover(book) ? '<span class="cover-missing-badge">غلاف افتراضي</span>' : ''}<p>${esc(book.review || book.note || 'لا توجد مراجعة قصيرة بعد.')}</p></div><div class="book-admin-price"><b>${money(book.price)}</b><span class="${Number(book.stock) > 0 ? 'stock-ok' : 'stock-off'}">${Number(book.stock) > 0 ? `${Number(book.stock)} نسخة` : 'غير متوفر'}</span><button class="text-button" type="button" data-edit-book="${esc(book.id)}">تعديل</button><button class="text-button danger-action" type="button" data-delete-book="${esc(book.id)}">حذف</button></div></article>`).join('') : '<p class="owner-note">لا توجد كتب تطابق البحث الحالي.</p>'}</div>${totalPages > 1 ? `<nav class="book-pagination" aria-label="صفحات الكتب"><button class="button button-outline" type="button" data-books-page="${bookPage - 1}" ${bookPage === 1 ? 'disabled' : ''}>السابق</button><span>صفحة ${bookPage} من ${totalPages}</span><button class="button button-outline" type="button" data-books-page="${bookPage + 1}" ${bookPage === totalPages ? 'disabled' : ''}>التالي</button></nav>` : ''}`;
  list.querySelector('.book-workspace-toolbar .admin-search')?.remove();
  const persistentSearch = $('#owner-book-search'); if (persistentSearch) persistentSearch.value = bookQuery;
}
function renderMissingCoversWorkspace() {
  const list = $('#owner-list');
  const missing = defaultCoverBooks();
  list.innerHTML = `<div class="missing-cover-head"><p class="eyebrow">الغلاف الافتراضي</p><h3>كتب <em>بلا غلاف</em></h3><p>${missing.length ? `${missing.length} كتاب يستخدم الغلاف الافتراضي. قد يكون تنزيل الغلاف فشل أو لم يُضف بعد. عدّل الكتاب لإضافة غلافه.` : 'كل الكتب لديها أغلفة مخصصة.'}</p>${missing.length ? `<div class="missing-cover-actions"><button class="button button-outline" type="button" data-cover-filter-books>عرضها في قائمة الكتب</button><button class="button button-dark" type="button" data-open-bulk-books>إعادة استيراد الأغلفة</button></div>` : ''}</div><div class="missing-cover-list">${missing.length ? missing.map(book => `<article class="missing-cover-card"><img src="${bookCover(book)}" alt="غلاف افتراضي لـ ${esc(book.title)}" /><div class="missing-cover-main"><strong>${esc(book.title)}</strong><small>${esc(book.author)} · ${esc(book.publisher)}</small><span>${esc(book.category || '')}${book.genre ? ` / ${esc(book.genre)}` : ''}</span><em>${Number(book.stock) > 0 ? `${Number(book.stock)} نسخة متوفرة` : 'غير متوفر'}</em></div><div class="missing-cover-actions"><button class="text-button" type="button" data-edit-book="${esc(book.id)}">إضافة غلاف / تعديل</button><button class="text-button danger-action" type="button" data-delete-book="${esc(book.id)}">حذف</button></div></article>`).join('') : '<div class="empty-cover-state">كل الكتب لديها أغلفة مخصصة.</div>'}</div>`;
}
async function deleteBook(bookId) { const book = books.find(item => String(item.id) === String(bookId)); if (!book || !window.confirm(`حذف «${book.title}» نهائيًا؟`)) return; try { await window.GhazalAPI.deleteBook(sessionStorage.getItem(ADMIN_SESSION_KEY), bookId); } catch (error) { const code = String(error?.message || ''); if (!code.includes('not_found')) { alert(code.includes('book_has_orders') ? 'لا يمكن حذف كتاب مرتبط بطلبات سابقة. يمكنك جعله غير متوفر بدلًا من حذفه.' : code.includes('permission_denied') || code.includes('owner_only') ? 'حذف الكتب متاح للمالك فقط.' : `تعذر حذف الكتاب: ${code || 'خطأ غير معروف'}`); return; } } const current = read('ghazal.customBooks.v1', []); save('ghazal.customBooks.v1', current.filter(item => String(item.id) !== String(bookId))); books = books.filter(item => String(item.id) !== String(bookId)); refreshGenresFromBooks(); save('ghazal.genres.v1', genres); save('ghazal.bookGenres.v1', bookGenres); alert('تم حذف الكتاب.'); renderBooksWorkspace(); }
function undoLastImport() { const last = read('ghazal.lastImport.v1', null); if (!last) return; if (!window.confirm('التراجع عن آخر استيراد؟')) return; save('ghazal.customBooks.v1', last.before || []); localStorage.removeItem('ghazal.lastImport.v1'); location.reload(); }
function renderDiscountWorkspace() {
  const list = $('#owner-list'); discounts = read('ghazal.discounts.v1', []);
  list.innerHTML = `<div class="discount-workspace-head"><div><strong>${discounts.filter(item => item.active !== false).length} خصم نشط</strong><small>تُعرض الخصومات التلقائية على الكتب، وتحتاج الرموز إلى إدخال العميل.</small></div><button class="button button-dark" type="button" data-owner-form="discount">إضافة خصم</button></div><div class="discount-admin-list">${discounts.length ? discounts.map(discount => `<article class="discount-admin-card"><span class="discount-badge">${discount.type === 'percent' ? `${Number(discount.value)}٪` : money(discount.value)}</span><div><strong>${esc(discount.name || 'خصم')}</strong><small>${discount.code ? `رمز الخصم: ${esc(discount.code)}` : 'خصم تلقائي'} · ${discount.appliesToAll ? 'كل الكتب' : `${(discount.bookIds || []).length} كتب`}</small></div><span class="${discount.active === false ? 'stock-off' : 'stock-ok'}">${discount.active === false ? 'متوقف' : 'نشط'}<button class="text-button discount-toggle" type="button" data-toggle-discount="${esc(discount.id)}">${discount.active === false ? 'تفعيل' : 'إيقاف'}</button></span></article>`).join('') : '<p class="owner-note">لم تضف أي خصومات بعد.</p>'}</div>`;
  list.querySelector('[data-owner-form="discount"]')?.addEventListener('click', () => openForm('discount'));
}
function renderUnavailableWorkspace() {
  const list = $('#owner-list'); const atRisk = books.filter(book => Number(book.available ?? book.stock ?? 0) <= 3).sort((a,b) => Number(a.available ?? a.stock ?? 0) - Number(b.available ?? b.stock ?? 0)); const out = atRisk.filter(book => Number(book.available ?? book.stock ?? 0) <= 0); const low = atRisk.filter(book => Number(book.available ?? book.stock ?? 0) > 0);
  const rows = items => items.map(book => `<article class="unavailable-full-card"><img src="${bookCover(book)}" alt="غلاف ${esc(book.title)}" /><div><strong>${esc(book.title)}</strong><small>${esc(book.author)} · ${esc(book.publisher)}</small><em>${Number(book.available ?? book.stock ?? 0)} متاح · ${Number(book.stock || 0)} إجمالي${Number(book.reserved || 0) ? ` · ${Number(book.reserved)} محجوز` : ''}</em></div><button class="button button-outline" type="button" data-edit-book="${esc(book.id)}">تعديل المخزون</button></article>`).join('');
  list.innerHTML = `<div class="unavailable-full-head"><p class="eyebrow">إشارات المتجر / المخزون</p><h3>كتب تحتاج <em>إعادة تخزين</em></h3><p>تظهر هنا الكتب التي لديها ٣ نسخ متاحة أو أقل، مع فصل الكتب النافدة عن الكتب القريبة من النفاد.</p><div class="inventory-summary"><strong>${atRisk.length}</strong> كتب تحتاج متابعة <span>·</span> <strong>${out.length}</strong> نافدة <span>·</span> <strong>${low.length}</strong> منخفضة المخزون</div></div><section class="inventory-section"><h4>نفد المخزون <span>${out.length}</span></h4><div class="unavailable-full-list">${rows(out) || '<p class="owner-note">لا توجد كتب نافدة.</p>'}</div></section><section class="inventory-section"><h4>مخزون منخفض <span>${low.length}</span></h4><div class="unavailable-full-list">${rows(low) || '<p class="owner-note">لا توجد كتب منخفضة المخزون.</p>'}</div></section>`;
}
function renderFeaturedWorkspace() {
  const list = $('#owner-list'); const current = featuredBookIds.map(id => books.find(book => book.id === id)).filter(Boolean);
  list.innerHTML = `<div class="featured-admin-intro"><p class="eyebrow">واجهة المتجر</p><h3>مختارات الغزال</h3><p>هذه هي الكتب الظاهرة في القسم التحريري على الصفحة الرئيسية. رتّب أربعة كتب كما تريد من زر التعديل.</p><button class="button button-dark" type="button" data-owner-form="featured">تعديل المختارات</button></div><div class="featured-admin-list">${current.map((book, index) => `<div class="featured-admin-row"><b>0${index + 1}</b><img src="${bookCover(book)}" alt="" /><span><strong>${esc(book.title)}</strong><small>${esc(book.author)}</small></span><em>${Number(book.stock) > 0 ? 'متوفر' : 'غير متوفر'}</em></div>`).join('')}</div>`;
  list.querySelector('[data-owner-form="featured"]')?.addEventListener('click', () => openForm('featured'));
}
function renderPublisherFeaturesWorkspace() {
  const list = $('#owner-list');
  const available = publishers.filter(publisher => !publisherFeatures.some(item => item.publisher === publisher.name));
  const presets = {
    'صفحة 7':{id:'page7',logo:'assets/publishers/safha.png',mark:'٧',accent:'#6c345f',surface:'#f3e8f0',ink:'#281d29',slogan:'حكاياتٌ تفتح نوافذ جديدة',kicker:'مساحةٌ للخيال والمعرفة',description:'اكتشف عوالم صفحة 7 المختارة بعناية، من الرواية إلى الفكر.'},
    'الدار المصرية اللبنانية':{id:'dar-masria-lubnania',logo:'assets/publishers/aldar-almisriya-allubnaniya.png',mark:'م',accent:'#17624f',surface:'#e7f0e9',ink:'#172d27',slogan:'كتابٌ عربيّ برؤيةٍ عصرية',kicker:'من القاهرة إلى كل قارئ',description:'إصدارات تجمع الأدب والفكر والمعرفة في اختيارات عربية راسخة.'},
    'المحروسة':{id:'mahrousa',logo:'assets/publishers/al-mahrousa.png',mark:'م',accent:'#a44832',surface:'#f5e9df',ink:'#35221e',slogan:'مساحةٌ للأفكار والناس',kicker:'كتبٌ من قلب المجتمع',description:'عناوين تقترب من الإنسان وتفتح حوارًا مع تفاصيل الحياة.'},
    'دار الكتاب الجديد المتحدة':{id:'jadid-muttahida',logo:'assets/publishers/alkitab-aljadeed.png',mark:'ج',accent:'#315c85',surface:'#e8eef4',ink:'#1d2a38',slogan:'أفقٌ جديد للكتاب العربي',kicker:'فكرٌ وأدبٌ بلا حدود',description:'إصدارات فكرية وأدبية تعبر الحدود وتوسّع أفق القراءة.'},
    'الدار العربية للعلوم ناشرون':{id:'arab-scientific',logo:'assets/publishers/arab-scientific.png',mark:'ع',accent:'#16548a',surface:'#e7f0f7',ink:'#16283a',slogan:'المعرفة تبدأ من كتاب',kicker:'فكرٌ وأدبٌ وعلوم',description:'مكتبة عربية واسعة من الكتب الفكرية والأدبية والعلمية.'},
    'دار سطور':{id:'sutoor',logo:'assets/publishers/dar-sutoor.webp',mark:'س',accent:'#b52b55',surface:'#17151b',ink:'#f7f1f2',slogan:'سطورٌ تبقى في الذاكرة',kicker:'حكايةٌ تبدأ من هنا',description:'إصدارات عربية معاصرة تجمع متعة الحكاية وعمق الفكرة.'}
  };
  list.innerHTML = `<div class="featured-admin-intro"><p class="eyebrow">واجهة المتجر</p><h3>واجهات <em>دور النشر</em></h3><p>أضف دار نشر من القائمة، ثم اسحب الواجهات لترتيب ظهورها على المتجر.</p>${available.length ? `<div class="publisher-feature-create"><select id="publisher-feature-new"><option value="">اختر دار نشر لإضافة واجهتها</option>${available.map(item => `<option value="${esc(item.name)}">${esc(item.name)}</option>`).join('')}</select><button class="button button-dark" type="button" data-create-publisher-feature>＋ إضافة واجهة</button></div>` : '<p class="owner-note">كل دور النشر لديها واجهة أو لا توجد دور نشر إضافية.</p>'}</div><div class="publisher-feature-admin-list">${publisherFeatures.map((item,index) => { const count = books.filter(book => book.publisher === item.publisher).length; const publisher = publishers.find(entry => entry.name === item.publisher); const logo = item.logo || publisher?.logo; return `<article class="publisher-feature-editor" draggable="true" data-feature-drag="${esc(item.id)}"><div class="publisher-feature-admin"><button type="button" class="feature-drag-handle" aria-label="اسحب لإعادة الترتيب">⠿ ${index+1}</button><span class="publisher-feature-admin-mark">${logo && /^(data:|\/|https?:|assets\/)/i.test(logo) ? `<img src="${esc(logo)}" alt="" />` : esc(item.mark || publisher?.logo || item.publisher.slice(0,1))}</span><div><strong>${esc(item.publisher)}</strong><small>${esc(item.slogan || item.kicker || '')} · ${count} كتب</small></div><label class="toggle-control"><input type="checkbox" data-publisher-feature="${esc(item.id)}" ${item.active !== false ? 'checked' : ''} /><span>تظهر على الرئيسية</span></label></div><div class="publisher-feature-settings"><label>دار النشر<select data-feature-field="publisher" data-feature-id="${esc(item.id)}">${!publishers.some(entry => entry.name === item.publisher) ? `<option value="${esc(item.publisher)}" selected>${esc(item.publisher)}</option>` : ''}${publishers.map(entry => `<option value="${esc(entry.name)}" ${entry.name === item.publisher ? 'selected' : ''}>${esc(entry.name)}</option>`).join('')}</select></label><label>العبارة الرئيسية<input data-feature-field="slogan" data-feature-id="${esc(item.id)}" value="${esc(item.slogan || '')}" /></label><label>النص الصغير<input data-feature-field="kicker" data-feature-id="${esc(item.id)}" value="${esc(item.kicker || '')}" /></label><label class="feature-description-field">الوصف<textarea data-feature-field="description" data-feature-id="${esc(item.id)}" rows="2">${esc(item.description || '')}</textarea></label>${[['surface','لون الواجهة','#eee2ce'],['ink','لون النص','#1b1915'],['accent','لون الزر','#8f5e3b']].map(([key,label,fallback]) => { const value = /^#[\da-f]{6}$/i.test(item[key] || '') ? item[key] : fallback; return `<label class="feature-color-field">${label}<span class="feature-color-controls"><input type="color" data-feature-field="${key}" data-feature-id="${esc(item.id)}" value="${value}" /><input type="text" inputmode="text" aria-label="رمز ${label}" data-feature-color-text="${key}" data-feature-id="${esc(item.id)}" value="${value}" placeholder="#408EB7" maxlength="7" /></span></label>`; }).join('')}<label class="feature-asset-upload">شعار خاص لهذه الواجهة<input type="file" accept="image/*" data-feature-asset="logo" data-feature-id="${esc(item.id)}" /></label><label class="feature-asset-upload">صورة خلفية أو نقش<input type="file" accept="image/*" data-feature-asset="backgroundImage" data-feature-id="${esc(item.id)}" /></label><button class="button button-outline" type="button" data-save-publisher-feature="${esc(item.id)}">حفظ النصوص والألوان</button><button class="text-button danger-action" type="button" data-delete-publisher-feature="${esc(item.id)}">إزالة الواجهة</button></div></article>`; }).join('') || '<p class="owner-note">لا توجد واجهات بعد.</p>'}</div>`;
  list.querySelector('[data-create-publisher-feature]')?.addEventListener('click', async () => { const name=$('#publisher-feature-new').value; if(!name)return alert('اختر دار النشر أولًا.'); const preset=presets[name]||{id:`publisher-${Date.now()}`,mark:name.slice(0,1),slogan:'',kicker:'إصدارات مختارة',description:'اكتشف كتب هذه الدار من رفوف الغزال.',accent:'#8f5e3b',surface:'#eee2ce',ink:'#1b1915'}; publisherFeatures=[...publisherFeatures,{...preset,publisher:name,active:false}]; save('ghazal.publisherFeatures.v1',publisherFeatures); try{await flushCatalogSync();renderOwner();}catch{alert('تعذر حفظ الواجهة على الخادم.');} });
  const featureList=list.querySelector('.publisher-feature-admin-list'); let dragged=null;
  featureList?.querySelectorAll('[data-feature-drag]').forEach(card=>{card.addEventListener('dragstart',event=>{dragged=card;card.classList.add('is-dragging');event.dataTransfer.effectAllowed='move';});card.addEventListener('dragend',()=>{card.classList.remove('is-dragging');dragged=null;});card.addEventListener('dragover',event=>{event.preventDefault();if(dragged&&dragged!==card){const box=card.getBoundingClientRect();featureList.insertBefore(dragged,event.clientY<box.top+box.height/2?card:card.nextSibling);}});card.addEventListener('drop',event=>event.preventDefault());});
  featureList?.addEventListener('dragend',async()=>{const ids=[...featureList.querySelectorAll('[data-feature-drag]')].map(card=>card.dataset.featureDrag);publisherFeatures=ids.map(id=>publisherFeatures.find(item=>item.id===id)).filter(Boolean);save('ghazal.publisherFeatures.v1',publisherFeatures);try{await flushCatalogSync();renderOwner();}catch{alert('تعذر حفظ ترتيب الواجهات.');}});
  list.querySelectorAll('[data-publisher-feature]').forEach(input => input.addEventListener('change', async () => { publisherFeatures = publisherFeatures.map(item => item.id === input.dataset.publisherFeature ? { ...item, active: input.checked } : item); save('ghazal.publisherFeatures.v1', publisherFeatures); try { await flushCatalogSync(); } catch {} }));
  list.querySelectorAll('[data-feature-color-text]').forEach(input => input.addEventListener('input', () => { const value = input.value.trim(); if (!/^#[\da-f]{6}$/i.test(value)) { input.setCustomValidity('أدخل لونًا بصيغة #408EB7'); return; } input.setCustomValidity(''); const picker = list.querySelector(`[data-feature-id="${CSS.escape(input.dataset.featureId)}"][data-feature-field="${input.dataset.featureColorText}"]`); if (picker) picker.value = value; }));
  list.querySelectorAll('.feature-color-field input[type="color"]').forEach(input => input.addEventListener('input', () => { const text = list.querySelector(`[data-feature-id="${CSS.escape(input.dataset.featureId)}"][data-feature-color-text="${input.dataset.featureField}"]`); if (text) { text.value = input.value.toUpperCase(); text.setCustomValidity(''); } }));
  list.querySelectorAll('[data-save-publisher-feature]').forEach(button => button.addEventListener('click', async () => { const id = button.dataset.savePublisherFeature; const colorInputs = [...list.querySelectorAll(`[data-feature-id="${CSS.escape(id)}"][data-feature-color-text]`)]; const invalidColor = colorInputs.find(input => !/^#[\da-f]{6}$/i.test(input.value.trim())); if (invalidColor) { invalidColor.setCustomValidity('أدخل لونًا بصيغة #408EB7'); invalidColor.reportValidity(); invalidColor.focus(); return; } const fields = [...list.querySelectorAll(`[data-feature-id="${CSS.escape(id)}"][data-feature-field]`)]; publisherFeatures = publisherFeatures.map(item => item.id === id ? { ...item, ...Object.fromEntries(fields.map(field => [field.dataset.featureField, field.value.trim()])) } : item); save('ghazal.publisherFeatures.v1', publisherFeatures); try { await flushCatalogSync(); alert('تم حفظ تصميم الواجهة.'); renderOwner(); } catch { alert('تعذر حفظ التصميم على الخادم.'); } }));
  list.querySelectorAll('[data-feature-asset]').forEach(input => input.addEventListener('change', async () => { const file = input.files?.[0]; if (!file) return; input.disabled = true; try { const dataUrl = await imageField(input, input.dataset.featureAsset === 'backgroundImage' ? 1800 : 700, 0.88); const saved = await window.GhazalAPI.saveCover(sessionStorage.getItem(ADMIN_SESSION_KEY), { dataUrl }); publisherFeatures = publisherFeatures.map(item => item.id === input.dataset.featureId ? { ...item, [input.dataset.featureAsset]: saved.image } : item); save('ghazal.publisherFeatures.v1', publisherFeatures); await flushCatalogSync(); alert(input.dataset.featureAsset === 'logo' ? 'تم حفظ شعار الواجهة.' : 'تم حفظ خلفية الواجهة.'); renderOwner(); } catch (error) { alert(`تعذر رفع الصورة: ${error.message || 'خطأ غير معروف'}`); input.disabled = false; } }));
  list.querySelectorAll('[data-delete-publisher-feature]').forEach(button => button.addEventListener('click', async () => { if (!confirm('إزالة واجهة دار النشر من المتجر؟')) return; publisherFeatures = publisherFeatures.filter(item => item.id !== button.dataset.deletePublisherFeature); save('ghazal.publisherFeatures.v1', publisherFeatures); try { await flushCatalogSync(); renderOwner(); } catch { alert('تعذر إزالة الواجهة من الخادم.'); } }));
}
function renderNewsletterWorkspace(subscribers) {
  const list = $('#owner-list');
  const csvCell = value => { const cell = String(value ?? ''); const safe = /^[\s=+\-@]/.test(cell) ? `'${cell}` : cell; return `"${safe.replace(/"/g, '""')}"`; };
  list.innerHTML = `<div class="workspace-intro"><div><p class="eyebrow">رسالة من رفوف الغزال</p><h3>مشتركو <em>الرسالة</em></h3><p>العناوين التي أُرسلت من نموذج الاشتراك في أسفل المتجر، محفوظة في قاعدة البيانات.</p></div><button class="button button-dark" type="button" data-export-newsletter ${subscribers.length ? '' : 'disabled'}>تصدير CSV ↓</button></div><p class="newsletter-admin-count">إجمالي المشتركين: <strong>${Number(subscribers.length).toLocaleString('ar-DZ')}</strong></p>${subscribers.length ? `<div class="newsletter-admin-list"><div class="newsletter-admin-row newsletter-admin-head"><strong>البريد الإلكتروني</strong><strong>تاريخ الاشتراك</strong></div>${subscribers.map(item => `<div class="newsletter-admin-row"><a href="mailto:${esc(item.email)}">${esc(item.email)}</a><time>${esc(new Date(item.created_at).toLocaleString('ar-DZ'))}</time></div>`).join('')}</div>` : '<p class="owner-note">لا توجد اشتراكات بعد.</p>'}`;
  list.querySelector('[data-export-newsletter]')?.addEventListener('click', () => {
    const rows = [['البريد الإلكتروني', 'تاريخ الاشتراك', 'المصدر'], ...subscribers.map(item => [item.email, item.created_at, item.source])];
    const csv = rows.map(row => row.map(csvCell).join(',')).join('\r\n');
    const blobUrl = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type:'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = blobUrl; link.download = `ghazal-newsletter-${new Date().toISOString().slice(0,10)}.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  });
}
function featuredBookMatches(query, slot) {
  const chosenElsewhere = new Set([...document.querySelectorAll('#owner-form input[name="featuredOrder"]')].filter(input => input.dataset.slot !== String(slot)).map(input => input.value).filter(Boolean));
  const needle = normalizeArabicSearch(query);
  return books.filter(book => !chosenElsewhere.has(book.id) && (!needle || normalizeArabicSearch(`${book.title} ${book.author} ${book.publisher}`).includes(needle))).slice(0, 8);
}
function renderFeaturedPickerSuggestions(input) {
  const picker = input.closest('.featured-picker'); const menu = picker?.querySelector('.featured-picker-suggestions'); if (!menu) return;
  const matches = featuredBookMatches(input.value, input.dataset.slot);
  menu.innerHTML = matches.map(book => `<button type="button" data-featured-option="${esc(book.id)}"><img src="${bookCover(book)}" alt="" /><span><strong>${esc(book.title)}</strong><small>${esc(book.author)}</small></span></button>`).join('');
  menu.hidden = !matches.length;
}
function updateFeaturedPicker(input, bookId) {
  const picker = input.closest('.featured-picker'); const hidden = picker?.querySelector('input[name="featuredOrder"]'); const book = books.find(item => item.id === bookId); if (!picker || !hidden || !book) return;
  hidden.value = book.id; input.value = book.title;
  const selected = picker.querySelector('.featured-picker-selected'); selected.innerHTML = `<img src="${bookCover(book)}" alt="" /><span>${esc(book.author)} · ${esc(book.publisher)}</span><button type="button" data-clear-featured>تغيير</button>`; selected.hidden = false;
  picker.querySelector('.featured-picker-suggestions').hidden = true;
}
function setupFeaturedPickers() {
  const form = $('#owner-form'); if (!form) return;
  $$('.featured-picker-search', form).forEach(input => { input.addEventListener('input', () => renderFeaturedPickerSuggestions(input)); input.addEventListener('focus', () => renderFeaturedPickerSuggestions(input)); });
  form.addEventListener('click', event => {
    const option = event.target.closest('[data-featured-option]');
    if (option) { const input = option.closest('.featured-picker').querySelector('.featured-picker-search'); updateFeaturedPicker(input, option.dataset.featuredOption); return; }
    const clear = event.target.closest('[data-clear-featured]');
    if (clear) { const picker = clear.closest('.featured-picker'); const input = picker.querySelector('.featured-picker-search'); picker.querySelector('input[name="featuredOrder"]').value = ''; input.value = ''; picker.querySelector('.featured-picker-selected').hidden = true; renderFeaturedPickerSuggestions(input); input.focus(); }
  });
}
function renderEntitySuggestions(input) {
  const name = input.name; const target = input.parentElement.querySelector(`[data-suggestions-for="${name}"]`); if (!target) return;
  const values = name === 'author' ? [...new Set(books.map(book => book.author).filter(Boolean))] : [...new Set(publishers.map(publisher => publisher.name).filter(Boolean))];
  const query = normalizeArabicSearch(input.value); const matches = values.filter(value => !query || normalizeArabicSearch(value).includes(query)).slice(0, 8);
  target.innerHTML = matches.map(value => `<button type="button" data-suggestion-value="${esc(value)}">${esc(value)}</button>`).join(''); target.hidden = !matches.length;
  target.querySelectorAll('[data-suggestion-value]').forEach(button => button.addEventListener('click', () => { input.value = button.dataset.suggestionValue; target.hidden = true; input.focus(); }));
}
async function deleteOrder(reference) {
  const order = orders.find(item => item.reference === reference); if (!order) return;
  if (!window.confirm(`حذف الطلب ${reference} نهائيًا؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
  try { await window.GhazalAPI.deleteOrder(sessionStorage.getItem(ADMIN_SESSION_KEY), reference); orders = orders.filter(item => item.reference !== reference); selectedOrderRefs.delete(reference); expandedOrderRefs.delete(reference); renderOwner(); } catch (error) { alert('تعذر حذف الطلب.'); console.error(error); }
}
async function deleteSelectedOrders() {
  const references = [...selectedOrderRefs];
  if (!references.length) return;
  if (!confirm(`هل تريد حذف ${references.length} طلبًا محددًا؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
  try {
    await window.GhazalAPI.deleteOrders(sessionStorage.getItem(ADMIN_SESSION_KEY), references);
    const removed = new Set(references);
    orders = orders.filter(order => !removed.has(order.reference));
    references.forEach(reference => { selectedOrderRefs.delete(reference); expandedOrderRefs.delete(reference); });
    renderOwner();
  } catch (error) { alert(error.message === 'orders_not_found' ? 'تغيرت قائمة الطلبات. حدّث الصفحة وحاول مجددًا.' : 'تعذر حذف الطلبات المحددة.'); console.error(error); }
}

function renderWorkspaceImmediately() {
  const list = $('#owner-list'); if (!list) return;
  try {
    if (ownerTab === 'books') renderBooksWorkspace();
  if (ownerTab === 'missing-covers') renderMissingCoversWorkspace();
    if (ownerTab === 'publishers') list.innerHTML = publishers.map(publisher => `<div class="admin-row"><span class="admin-avatar">${esc(publisher.logo || publisher.name.slice(0,1))}</span><div><strong>${esc(publisher.name)}</strong><small>${esc(publisher.city || '')}</small></div><span>نشط</span></div>`).join('');
    if (ownerTab === 'authors') list.innerHTML = [...new Set(books.map(book => book.author))].map(author => `<div class="admin-row"><span class="admin-avatar">${esc(author.slice(0,1))}</span><div><strong>${esc(author)}</strong><small>${books.filter(book => book.author === author).length} كتب</small></div><span>كاتب</span></div>`).join('');
    if (ownerTab === 'genres') list.innerHTML = Object.entries(genres).map(([id, genre]) => `<div class="admin-row"><span class="admin-avatar">✦</span><div><strong>${esc(genre.title)}</strong><small>#genre/${esc(id)}</small></div><span class="admin-row-end"><span>${books.filter(book => book.category === id).length} كتب</span><button class="text-button admin-remove" type="button" data-remove-genre="${esc(id)}">حذف</button></span></div>`).join('');
    if (ownerTab === 'book-genres') list.innerHTML = `<div class="workspace-section-head"><div><strong>أنواع الكتب المستخدمة في المتجر</strong><small>هذه هي نفس الخيارات التي تظهر في فلتر صفحة كل الكتب وصفحات دور النشر.</small></div><button class="button button-dark" type="button" data-owner-form="book-genre">إضافة نوع كتاب</button></div>${bookGenres.map(genre => `<div class="admin-row"><span class="admin-avatar">⌕</span><div><strong>${esc(genre)}</strong><small>${books.filter(book => genreMatches(book, genre)).length} كتب تستخدم هذا النوع</small></div><span class="admin-row-end"><span>نوع كتاب</span><button class="text-button admin-remove" type="button" data-remove-book-genre="${esc(genre)}">حذف</button></span></div>`).join('') || '<p class="owner-note">أضف أول نوع كتاب من الزر أعلاه.</p>'}`;
    if (ownerTab === 'discounts') renderDiscountWorkspace();
    if (ownerTab === 'featured') renderFeaturedWorkspace();
    if (ownerTab === 'publisher-features') renderPublisherFeaturesWorkspace();
    if (ownerTab === 'collections') renderCollectionsWorkspace();
    if (ownerTab === 'home-sections') renderHomeSectionsWorkspace();
    if (ownerTab === 'unavailable') renderUnavailableWorkspace();
    if (ownerTab === 'orders') renderOrderWorkspace();
    if (ownerTab === 'team' || ownerTab === 'history' || ownerTab === 'newsletter') list.innerHTML = '<p class="owner-note">جاري تحميل بيانات المالك…</p>';
  } catch (error) { console.error('immediate_workspace_render_failed', error); }
}
function showOwnerApp() { $('#owner-login').hidden = true; $('#owner-app').hidden = false; renderWorkspaceImmediately(); renderOwner(); }
if (sessionStorage.getItem(ADMIN_SESSION_KEY)) showOwnerApp();
async function setupSignup() { try { const status = await window.GhazalAPI.authStatus(); $('#owner-signup-toggle').hidden = !status.setupAvailable; } catch { $('#owner-signup-toggle').hidden = true; } }
setupSignup();
$('#owner-signup-toggle').addEventListener('click', () => { $('#owner-login-form').hidden = true; $('#owner-signup-toggle').hidden = true; $('#owner-signup-form').hidden = false; });
$('#owner-signup-cancel').addEventListener('click', () => { $('#owner-signup-form').hidden = true; $('#owner-login-form').hidden = false; setupSignup(); });
$('#owner-signup-form').addEventListener('submit', async event => { event.preventDefault(); $('#owner-signup-error').hidden = true; const password = $('#owner-signup-password').value; if (password !== $('#owner-signup-confirm').value) { $('#owner-signup-error').textContent = 'كلمتا المرور غير متطابقتين.'; $('#owner-signup-error').hidden = false; return; } try { const result = await window.GhazalAPI.signup($('#owner-signup-email').value.trim(), password); sessionStorage.setItem(ADMIN_SESSION_KEY, result.token); sessionStorage.setItem('ghazal.adminRole', result.user.role); showOwnerApp(); } catch (error) { $('#owner-signup-error').textContent = String(error.message).includes('signup_closed') ? 'تم إنشاء حساب المالك مسبقًا. استخدم تسجيل الدخول.' : 'استخدم بريدًا صحيحًا وكلمة مرور من 12 حرفًا على الأقل.'; $('#owner-signup-error').hidden = false; setupSignup(); } });
$('#owner-login-form').addEventListener('submit', async event => { event.preventDefault(); $('#owner-login-error').hidden = true; try { const result = await window.GhazalAPI.login($('#owner-email').value.trim(), $('#owner-code').value); sessionStorage.setItem(ADMIN_SESSION_KEY, result.token); sessionStorage.setItem('ghazal.adminRole', result.user.role); showOwnerApp(); } catch (error) { $('#owner-login-error').hidden = false; console.error(error); } });
$('#owner-logout').addEventListener('click', () => { sessionStorage.removeItem(ADMIN_SESSION_KEY); sessionStorage.removeItem('ghazal.adminRole'); location.reload(); });
async function renderOwner() {
  try { const session = await window.GhazalAPI.authMe(sessionStorage.getItem(ADMIN_SESSION_KEY)); sessionStorage.setItem('ghazal.adminRole', session.user.role); currentPermissions = session.user.permissions || {}; } catch (error) { console.error('auth_refresh_failed', error); }
  renderWorkspaceImmediately();
  const currentRole = sessionStorage.getItem('ghazal.adminRole');
  if (currentRole === 'owner' && ownerTab === 'team') { await renderTeamWorkspace(); renderRecentOrders(); return; }
  if (currentRole === 'owner' && ownerTab === 'history') { await renderHistoryWorkspace(); renderRecentOrders(); return; }
  try { const remote = await window.GhazalAPI.adminOrders(sessionStorage.getItem(ADMIN_SESSION_KEY)); orders = remote.orders || []; } catch (error) { console.error('admin_orders_load_failed', error); if (String(error.message).includes('unauthorized') || String(error.message).includes('request_failed_401')) { sessionStorage.removeItem(ADMIN_SESSION_KEY); $('#owner-login').hidden = false; $('#owner-app').hidden = true; return; } }
  try { analytics = await window.GhazalAPI.adminAnalytics(sessionStorage.getItem(ADMIN_SESSION_KEY)); } catch (error) { console.error('admin_analytics_load_failed', error); }
  if (!window.__ghazalAdminCatalogLoaded) { try { applyAdminCatalog(await window.GhazalAPI.adminCatalog(sessionStorage.getItem(ADMIN_SESSION_KEY))); window.__ghazalAdminCatalogLoaded = true; } catch (error) { console.error('admin_catalog_load_failed', error); } }
  syncCoverTabLabel();
  if (!collectionsLoaded) { try { const remoteCollections = await window.GhazalAPI.adminCollections(sessionStorage.getItem(ADMIN_SESSION_KEY)); if (remoteCollections.collections?.length) { collections = remoteCollections.collections; save('ghazal.collections.v1', collections); } collectionsLoaded = true; } catch { collectionsLoaded = true; } }
  document.body.dataset.role = sessionStorage.getItem('ghazal.adminRole') || 'admin'; if ($('#owner-role-badge')) $('#owner-role-badge').textContent = document.body.dataset.role === 'owner' ? 'المالك' : 'خدمة العملاء'; ensureDashboardPanels();
  updateOwnerStats();
  if ($('#owner-newsletter-count')) $('#owner-newsletter-count').textContent = Number(analytics.newsletterSubscribers || 0).toLocaleString('ar-DZ');
  if ($('#owner-book-count')) $('#owner-book-count').textContent = books.length;
  if ($('#owner-ecotrack-count')) $('#owner-ecotrack-count').textContent = orders.filter(order => order.ecotrackRow).length;
  const list = $('#owner-list');
  try {
  if (ownerTab === 'newsletter' && currentRole === 'owner') { const newsletter = await window.GhazalAPI.adminNewsletter(sessionStorage.getItem(ADMIN_SESSION_KEY)); renderNewsletterWorkspace(newsletter.subscribers || []); }
  if (ownerTab === 'books') renderBooksWorkspace();
  if (ownerTab === 'missing-covers') renderMissingCoversWorkspace();
  if (ownerTab === 'publishers') list.innerHTML = publishers.map(publisher => { const count = books.filter(book => book.publisher === publisher.name).length; const alternatives = publishers.filter(item => item.name !== publisher.name); return `<div class="admin-row"><span class="admin-avatar">${publisher.logo?.startsWith('data:') ? `<img src="${publisher.logo}" alt="" />` : esc(publisher.logo || publisher.name.slice(0,1))}</span><div><strong>${esc(publisher.name)}</strong><small>${esc(publisher.city || '')} · ${count} كتب</small></div><span class="admin-row-end">${count && alternatives.length ? `<select data-publisher-target="${esc(publisher.name)}" aria-label="نقل كتب ${esc(publisher.name)} إلى"><option value="">اختر دارًا بديلة</option>${alternatives.map(item => `<option value="${esc(item.name)}">${esc(item.name)}</option>`).join('')}</select><button class="text-button" type="button" data-move-publisher="${esc(publisher.name)}">نقل الكتب</button>` : ''}<button class="text-button" type="button" data-edit-publisher="${esc(publisher.name)}">تعديل / الشعار</button><button class="text-button danger-action" type="button" data-delete-publisher="${esc(publisher.name)}">حذف</button></span></div>`; }).join('') || '<p class="owner-note">لا توجد دور نشر.</p>';
  if (ownerTab === 'authors') list.innerHTML = [...new Set(books.map(book => book.author))].map(author => { const profile = authorProfiles[author]; return `<div class="admin-row"><span class="admin-avatar">${profile?.photo?.startsWith('data:') ? `<img src="${profile.photo}" alt="" />` : esc(author.slice(0,1))}</span><div><strong>${esc(author)}</strong><small>${books.filter(book => book.author === author).length} كتب ${profile ? '· ملف مضاف' : '· ملف اختياري'}</small></div><span>${profile?.featured ? 'مميز' : 'كاتب'}</span></div>`; }).join('');
  if (ownerTab === 'genres') list.innerHTML = Object.entries(genres).map(([id, genre]) => { const count = books.filter(book => book.category === id).length; const alternatives = Object.entries(genres).filter(([other]) => other !== id); return `<div class="admin-row"><span class="admin-avatar">✦</span><div><strong>${esc(genre.title)}</strong><small>#genre/${esc(id)} · ${esc(genre.description || '')} · ${count} كتب</small></div><span class="admin-row-end">${count && alternatives.length ? `<select data-category-target="${esc(id)}" aria-label="نقل كتب ${esc(genre.title)} إلى"><option value="">اختر تصنيفًا</option>${alternatives.map(([other, item]) => `<option value="${esc(other)}">${esc(item.title)}</option>`).join('')}</select>` : ''}<button class="text-button danger-action" type="button" data-remove-genre="${esc(id)}">حذف</button></span></div>`; }).join('');
  if (ownerTab === 'book-genres') list.innerHTML = `<div class="workspace-section-head"><div><strong>أنواع الكتب المستخدمة في المتجر</strong><small>هذه هي نفس الخيارات التي تظهر في فلتر صفحة كل الكتب وصفحات دور النشر.</small></div><button class="button button-dark" type="button" data-owner-form="book-genre">إضافة نوع كتاب</button></div>${bookGenres.map(genre => { const count = books.filter(book => genreMatches(book, genre)).length; const alternatives = bookGenres.filter(item => item !== genre); return `<div class="admin-row"><span class="admin-avatar">⌕</span><div><strong>${esc(genre)}</strong><small>${count} كتب تستخدم هذا النوع</small></div><span class="admin-row-end">${count && alternatives.length ? `<select data-book-genre-target="${esc(genre)}" aria-label="نقل كتب ${esc(genre)} إلى"><option value="">اختر نوعًا بديلًا</option>${alternatives.map(item => `<option value="${esc(item)}">${esc(item)}</option>`).join('')}</select>` : ''}<button class="text-button danger-action" type="button" data-remove-book-genre="${esc(genre)}">حذف</button></span></div>`; }).join('') || '<p class="owner-note">أضف أول نوع كتاب من الزر أعلاه.</p>'}`;
  if (ownerTab === 'discounts') renderDiscountWorkspace();
  if (ownerTab === 'featured') renderFeaturedWorkspace();
  if (ownerTab === 'publisher-features') renderPublisherFeaturesWorkspace();
  if (ownerTab === 'collections') renderCollectionsWorkspace();
  if (ownerTab === 'home-sections') renderHomeSectionsWorkspace();
  if (ownerTab === 'unavailable') renderUnavailableWorkspace();
  if (ownerTab === 'orders') { renderOrderWorkspace(); enhanceOrderActions(); }
  if (ownerTab === 'team' && document.body.dataset.role === 'owner') await renderTeamWorkspace();
  if (ownerTab === 'history' && document.body.dataset.role === 'owner') await renderHistoryWorkspace();
  } catch (error) { console.error('dashboard_workspace_render_failed', error); list.innerHTML = `<div class="workspace-error"><strong>تعذر تحميل هذه المساحة.</strong><small>${esc(error.message || 'خطأ غير معروف')}</small><button class="button button-outline" type="button" data-retry-workspace>إعادة المحاولة</button></div>`; }
  renderRecentOrders();
  renderStoreInsights();
}
async function loadOwnerTeamData() {
  const [usersResult, auditResult] = await Promise.allSettled([window.GhazalAPI.adminUsers(sessionStorage.getItem(ADMIN_SESSION_KEY)), window.GhazalAPI.adminAudit(sessionStorage.getItem(ADMIN_SESSION_KEY))]);
  if (usersResult.status === 'rejected') throw usersResult.reason;
  staffUsers = usersResult.value.users || []; auditEvents = auditResult.status === 'fulfilled' ? (auditResult.value.events || []) : [];
  return { auditError:auditResult.status === 'rejected' ? auditResult.reason : null };
}
async function renderTeamWorkspace() {
  const list = $('#owner-list'); list.innerHTML = '<p class="owner-note">جاري تحميل أعضاء الفريق…</p>';
  let result; try { result = await loadOwnerTeamData(); } catch (error) { list.innerHTML = `<div class="workspace-error"><strong>تعذر تحميل أعضاء الفريق.</strong><small>${esc(error.message || 'تحقق من إعادة تشغيل الخادم')}</small></div>`; return; }
  const employeeRows = staffUsers.filter(item => item.role === 'admin').map(employee => `<article class="team-member"><div><strong>${esc(employee.email)}</strong><small>موظف خدمة العملاء · أُنشئ ${new Date(employee.created_at).toLocaleDateString('ar-DZ')}</small></div><button class="text-button danger-action" type="button" data-remove-staff="${employee.id}">إزالة الوصول</button></article>`).join('');
  list.innerHTML = `<div class="team-workspace"><div class="workspace-intro"><div><p class="eyebrow">الوصول</p><h3>فريق <em>العمل</em></h3><p>إضافة موظفي خدمة العملاء وإلغاء وصولهم. هذه المساحة للمالك فقط.</p></div><button class="button button-dark" type="button" data-owner-form="staff">إضافة موظف</button></div>${result.auditError ? `<p class="workspace-error"><small>تم تحميل الموظفين، لكن سجل النشاط غير متاح: ${esc(result.auditError.message || 'خطأ في السجل')}</small></p>` : ''}<h4 class="team-section-title">الموظفون (${staffUsers.filter(item => item.role === 'admin').length})</h4><div class="team-members">${employeeRows || '<p class="owner-note">لا يوجد موظفون مضافون بعد.</p>'}</div></div>`;
  const permissionLabels = { view_orders:'رؤية الطلبات', update_orders:'تحديث حالات الطلبات', view_catalog:'رؤية الفهرس', edit_catalog:'تعديل الكتب والفهرس', view_finance:'رؤية المبيعات', export_orders:'تصدير الشحنات', edit_inventory:'تعديل المخزون', edit_store:'تعديل واجهة المتجر', view_history:'رؤية سجل النشاط' };
  const owners = staffUsers.filter(item => item.role === 'owner' && item.id !== Number(sessionStorage.getItem('ghazal.adminUserId'))); const members = list.querySelector('.team-members'); owners.forEach(owner => members?.insertAdjacentHTML('beforeend', `<article class="team-member" data-user-id="${owner.id}"><div><strong>${esc(owner.email)}</strong><small>مالك · أُنشئ ${new Date(owner.created_at).toLocaleDateString('ar-DZ')}</small></div><button class="text-button danger-action" type="button" data-remove-staff="${owner.id}">إزالة الوصول</button></article>`));
  const employeeCards = [...list.querySelectorAll('.team-member')]; const managed = staffUsers.filter(item => item.role === 'admin');
  employeeCards.forEach(card => { const employee = staffUsers.find(item => item.email === card.querySelector('strong')?.textContent); if (!employee || !managed.some(item => item.id === employee.id)) return; card.dataset.userId = employee.id; card.insertAdjacentHTML('beforeend', `<div class="permission-editor"><label>الدور<select data-user-role><option value="admin">موظف</option><option value="owner">مالك</option></select></label><div class="permission-grid">${Object.entries(permissionLabels).map(([key,label]) => `<label><input type="checkbox" data-user-permission="${key}" ${employee.permissions?.[key] ? 'checked' : ''} />${label}</label>`).join('')}</div><button class="text-button" type="button" data-save-user>حفظ الصلاحيات</button></div>`); });
  list.querySelectorAll('[data-user-role]').forEach(select => { const card = select.closest('.team-member'); const employee = staffUsers.find(item => String(item.id) === card.dataset.userId); if (employee) select.value = employee.role; });
  list.querySelector('[data-owner-form="staff"]')?.addEventListener('click', () => openForm('staff'));
}
async function renderHistoryWorkspace() {
  const list = $('#owner-list'); list.innerHTML = '<p class="owner-note">جاري تحميل سجل النشاط…</p>';
  let result; try { result = await loadOwnerTeamData(); } catch (error) { list.innerHTML = `<div class="workspace-error"><strong>تعذر تحميل سجل النشاط.</strong><small>${esc(error.message || 'تحقق من إعادة تشغيل الخادم')}</small></div>`; return; }
  if (result.auditError) { list.innerHTML = `<div class="workspace-error"><strong>تعذر تحميل سجل النشاط.</strong><small>${esc(result.auditError.message || 'خطأ في السجل')}</small></div>`; return; }
  const employees = [...new Set(auditEvents.map(event => event.email).filter(Boolean))].sort(); const scopedEvents = auditEvents.filter(event => !historyEmployeeFilter || event.email === historyEmployeeFilter); const rows = scopedEvents.slice(0, 100).map(event => `<article class="audit-row"><div><strong>${esc(event.email || 'النظام')}</strong><small>${esc(event.action)} · ${esc(event.entity)}${event.entity_id ? ` · ${esc(event.entity_id)}` : ''}</small></div><time>${new Date(event.created_at).toLocaleString('ar-DZ')}</time></article>`).join('');
  list.innerHTML = `<div class="workspace-intro"><div><p class="eyebrow">المساءلة</p><h3>سجل <em>النشاط</em></h3><p>كل تغييرات الطلبات والفهرس وتصدير الشحنات مع الموظف الذي نفذها.</p></div><label class="history-filter">الموظف<select id="history-filter-employee"><option value="">كل الموظفين</option>${employees.map(email => `<option value="${esc(email)}" ${historyEmployeeFilter === email ? 'selected' : ''}>${esc(email)}</option>`).join('')}</select></label></div><div class="audit-list">${rows || '<p class="owner-note">لا توجد إجراءات لهذا الموظف.</p>'}</div>`;
}
function collectionErrorMessage(error) {
  const message = String(error?.message || '');
  if (message.includes('owner_only') || message.includes('permission_denied')) return 'ليست لديك صلاحية تعديل المجموعات. اطلب من المالك منحك صلاحية «تعديل الكتب والفهرس».';
  if (message.includes('invalid_collection_book')) return 'بعض الكتب المختارة لم تعد متاحة. افتح المجموعة وأعد اختيار كتبها.';
  if (message.includes('duplicate')) return 'هذا الرابط المختصر مستخدم من قبل. اختر رابطًا مختلفًا.';
  if (message.includes('not_found')) return 'لم تعد هذه المجموعة موجودة. أعد تحديث الصفحة.';
  if (message.includes('request_timeout') || message.includes('request_failed')) return 'تعذر الاتصال بالخادم. تحقق من تشغيله وحاول مرة أخرى.';
  return `تعذر حفظ المجموعة: ${message || 'خطأ غير معروف'}`;
}
function renderCollectionsWorkspace() {
  const list = $('#owner-list');
  list.innerHTML = `<div class="workspace-intro"><div><p class="eyebrow">مسارات التسويق</p><h3>مجموعات <em>الكتب</em></h3><p>أنشئ صفحات جاهزة للمشاركة والإعلانات. كل مجموعة لها رابط ثابت ويمكن إبرازها على الصفحة الرئيسية.</p></div><button class="button button-dark" type="button" data-owner-form="collection">＋ مجموعة جديدة</button></div><div class="collection-admin-list">${collections.map(collection => { const count = collection.bookIds.filter(id => books.some(book => book.id === id)).length; return `<article class="collection-admin-card"><div class="collection-admin-main"><div class="collection-admin-status ${collection.active ? 'is-active' : ''}">${collection.active ? 'نشطة' : 'مخفية'}${collection.homepage ? ' · على الرئيسية' : ''}</div><h4>${esc(collection.title)}</h4><p>${esc(collection.description || '')}</p><small>/${esc(collection.slug)} · ${count} كتب</small></div><div class="collection-admin-actions"><a class="text-button" href="../index.html#collection/${encodeURIComponent(collection.slug)}" target="_blank" rel="noreferrer">معاينة ↗</a><button class="text-button" type="button" data-edit-collection="${esc(collection.id)}">تعديل</button><button class="text-button" type="button" data-toggle-collection="${esc(collection.id)}">${collection.active ? 'إخفاء' : 'تفعيل'}</button><button class="text-button danger-action" type="button" data-delete-collection="${esc(collection.id)}">حذف</button></div></article>`; }).join('')}</div>`;
  list.querySelector('[data-owner-form="collection"]')?.addEventListener('click', () => openForm('collection'));
  list.querySelectorAll('[data-edit-collection]').forEach(button => button.addEventListener('click', () => openForm('collection', button.dataset.editCollection)));
}
function homeSectionPlacementLabel(value) {
  return (HOME_SECTION_PLACEMENTS.find(item => item.value === value) || HOME_SECTION_PLACEMENTS[3]).label;
}
function homeSectionSummary(section) {
  if (section.type === 'collection') {
    const collection = collections.find(item => item.id === section.collectionId);
    return collection ? `مجموعة «${collection.title}» · ${(collection.bookIds || []).length} كتب` : 'المجموعة غير متاحة';
  }
  return `${(section.bookIds || []).length} كتب مختارة يدويًا`;
}
function persistHomeSections() {
  save('ghazal.homeSections.v1', homeSections);
  return flushCatalogSync().then(() => renderOwner()).catch(() => alert('تعذر حفظ أقسام الرئيسية على الخادم.'));
}
function renderHomeSectionsWorkspace() {
  const list = $('#owner-list');
  list.innerHTML = `<div class="workspace-intro"><div><p class="eyebrow">واجهة المتجر</p><h3>أقسام <em>الرئيسية</em></h3><p>أنشئ كاروسيلات إضافية تظهر على الصفحة الرئيسية. اختر كتبًا يدويًا بلا حد أقصى أو استخدم مجموعة جاهزة، ثم حدد موضع القسم بين أقسام الصفحة. يمكنك إعادة الترتيب بالأسهم، وإخفاء أي قسم دون حذفه.</p></div><button class="button button-dark" type="button" data-owner-form="home-section">＋ قسم رئيسية جديد</button></div><div class="collection-admin-list home-section-admin-list">${homeSections.length ? homeSections.map((section, index) => `<article class="collection-admin-card"><div class="collection-admin-main"><div class="collection-admin-status ${section.active !== false ? 'is-active' : ''}">${section.active !== false ? 'ظاهر على الرئيسية' : 'مخفي'}</div><h4>${esc(section.title)}</h4><p>${esc(section.description || homeSectionSummary(section))}</p><small>${esc(homeSectionPlacementLabel(section.placement))} · ${esc(homeSectionSummary(section))}</small></div><div class="collection-admin-actions"><div class="home-section-order"><button class="text-button" type="button" data-home-section-up="${esc(section.id)}" ${index === 0 ? 'disabled' : ''} aria-label="تحريك ${esc(section.title)} لأعلى">↑</button><button class="text-button" type="button" data-home-section-down="${esc(section.id)}" ${index === homeSections.length - 1 ? 'disabled' : ''} aria-label="تحريك ${esc(section.title)} لأسفل">↓</button></div><button class="text-button" type="button" data-edit-home-section="${esc(section.id)}">تعديل</button><button class="text-button" type="button" data-toggle-home-section="${esc(section.id)}">${section.active !== false ? 'إخفاء' : 'إظهار'}</button><button class="text-button danger-action" type="button" data-delete-home-section="${esc(section.id)}">حذف</button></div></article>`).join('') : '<p class="owner-note">لم تضف أقسامًا بعد. ابدأ بقسم جديد واختر كتبه أو مجموعته.</p>'}</div>`;
}
function discountSelectedIds(form) {
  try { return new Set(JSON.parse(form.dataset.discountSelected || '[]')); } catch { return new Set(); }
}
function renderDiscountBookPicker(form) {
  const list = form.querySelector('#discount-book-picker-list');
  if (!list) return;
  const query = normalizeArabicSearch(form.querySelector('#discount-book-search')?.value || '');
  const selected = discountSelectedIds(form);
  const matches = books.filter(book => !query || normalizeArabicSearch(`${book.title} ${book.author} ${book.publisher}`).includes(query));
  const visible = matches.slice(0, 100);
  list.innerHTML = visible.length ? visible.map(book => `<label><input type="checkbox" data-discount-book="${esc(book.id)}" ${selected.has(String(book.id)) ? 'checked' : ''} /> <span>${esc(book.title)} <small>— ${esc(book.author)}</small></span></label>`).join('') : '<p class="owner-note">لا توجد نتائج مطابقة.</p>';
  const count = form.querySelector('#discount-book-count');
  if (count) count.textContent = `${selected.size} كتاب محدد · ${matches.length}${matches.length > 100 ? '+' : ''} نتيجة`;
  form.dataset.discountVisibleIds = JSON.stringify(visible.map(book => String(book.id)));
  form.dataset.discountSelected = JSON.stringify([...selected]);
}
function setupDiscountBookPicker() {
  const form = $('#owner-form');
  form.dataset.discountSelected = '[]';
  renderDiscountBookPicker(form);
}
function collectionSelectedIds(form) {
  try { return JSON.parse(form.dataset.collectionSelected || '[]').map(String); } catch { return []; }
}
function renderCollectionBookPicker(form) {
  const results = form.querySelector('#collection-book-results');
  const selectedList = form.querySelector('#collection-selected-books');
  if (!results || !selectedList) return;
  const query = normalizeArabicSearch(form.querySelector('#collection-book-search')?.value || '').trim();
  const selected = collectionSelectedIds(form);
  const selectedSet = new Set(selected);
  const selectedBooks = selected.map(id => books.find(book => String(book.id) === id)).filter(Boolean);
  const matches = query ? books.filter(book => normalizeArabicSearch(`${book.title} ${book.author} ${book.publisher}`).includes(query)) : [];
  const visible = matches.slice(0, 40);
  const stockLabel = book => { const available = Number(book?.available ?? book?.stock ?? 0); return available > 0 ? `المتوفر: ${available}` : 'نفد المخزون'; };
  selectedList.innerHTML = `<div class="collection-picker-heading"><strong>الكتب المضافة (${selectedBooks.length})</strong><small>تظهر هنا بالترتيب الذي ستظهر به في المجموعة. اضغط «إزالة» لإخراج أي كتاب.</small></div>${selectedBooks.length ? `<div class="collection-selected-list">${selectedBooks.map((book, index) => `<div class="collection-selected-book"><span>${index + 1}</span><img class="collection-book-cover" src="${esc(bookCover(book))}" alt="" loading="lazy" decoding="async" /><div class="collection-book-info"><strong>${esc(book.title)}</strong><small>${esc(book.author)} · ${esc(book.publisher)}</small><small class="collection-book-stock">${esc(stockLabel(book))}</small></div><button type="button" class="text-button danger-action" data-collection-remove="${esc(book.id)}">إزالة</button></div>`).join('')}</div>` : '<p class="owner-note">لم تضف كتبًا بعد. ابحث عن كتاب أعلاه ثم اضغط «إضافة».</p>'}`;
  results.innerHTML = query
    ? `${matches.length > visible.length ? `<p class="collection-picker-count">عرض ${visible.length} من ${matches.length} نتيجة. تابع الكتابة لتضييق القائمة.</p>` : `<p class="collection-picker-count">${matches.length} نتيجة.</p>`}${visible.length ? `<div class="collection-picker-results">${visible.map(book => { const id = String(book.id); const added = selectedSet.has(id); return `<button type="button" class="collection-book-result${added ? ' is-added' : ''}" data-collection-book="${esc(id)}" aria-pressed="${added}"><img class="collection-book-cover" src="${esc(bookCover(book))}" alt="" loading="lazy" decoding="async" /><span class="collection-book-info"><strong>${esc(book.title)}</strong><small>${esc(book.author)} · ${esc(book.publisher)}</small><small class="collection-book-stock${Number(book.available ?? book.stock ?? 0) > 0 ? '' : ' is-out'}">${esc(stockLabel(book))}</small></span><span class="collection-book-result-action">${added ? 'إزالة' : 'إضافة'}</span></button>`; }).join('')}</div>` : '<p class="owner-note">لا توجد نتائج مطابقة.</p>'}`
    : '<p class="collection-picker-hint">اكتب عنوان كتاب أو اسم مؤلف أو ناشر للبحث، ثم أضف ما تريد من النتائج.</p>';
  form.dataset.collectionSelected = JSON.stringify(selected);
}
function setupCollectionBookPicker(form, initialIds = []) {
  form.dataset.collectionSelected = JSON.stringify(initialIds.map(String));
  renderCollectionBookPicker(form);
  form.querySelector('#collection-book-search')?.addEventListener('input', () => renderCollectionBookPicker(form));
  form.querySelector('#collection-book-results')?.addEventListener('click', event => {
    const button = event.target.closest('[data-collection-book]'); if (!button) return;
    const id = String(button.dataset.collectionBook);
    const selected = collectionSelectedIds(form);
    const next = selected.includes(id) ? selected.filter(item => item !== id) : [...selected, id];
    form.dataset.collectionSelected = JSON.stringify(next); renderCollectionBookPicker(form);
    form.querySelector('#collection-book-search')?.focus();
  });
  form.querySelector('#collection-selected-books')?.addEventListener('click', event => {
    const remove = event.target.closest('[data-collection-remove]'); if (!remove) return;
    const selected = collectionSelectedIds(form).filter(id => id !== String(remove.dataset.collectionRemove));
    form.dataset.collectionSelected = JSON.stringify(selected); renderCollectionBookPicker(form);
  });
}
function setupHomeSectionForm(form, initialIds = []) {
  setupCollectionBookPicker(form, initialIds);
  const typeSelect = form.elements.sectionType;
  const booksField = form.querySelector('[data-section-books-field]');
  const booksHint = form.querySelector('[data-section-books-hint]');
  const collectionField = form.querySelector('[data-section-collection-field]');
  const sync = () => {
    const useCollection = typeSelect.value === 'collection';
    if (booksField) booksField.hidden = useCollection;
    if (booksHint) booksHint.hidden = useCollection;
    if (collectionField) collectionField.hidden = !useCollection;
  };
  typeSelect.addEventListener('change', sync);
  sync();
}
$$('[data-owner-tab]').forEach(button => button.addEventListener('click', () => { ownerTab = button.dataset.ownerTab; $$('.admin-tabs button').forEach(item => item.classList.toggle('active', item === button)); renderWorkspaceImmediately(); renderOwner(); }));
function bookGenreOptions(selected = '') { return `<option value="">اختر نوع الكتاب</option>${bookGenres.map(genre => `<option value="${esc(genre)}" ${genre === selected ? 'selected' : ''}>${esc(genre)}</option>`).join('')}<option value="__new__">＋ إضافة نوع جديد</option>`; }
function setupBookGenreField(form, selected = '') { const select = form.elements.genre; const custom = form.elements.genreCustom; if (!select || !custom) return; const sync = () => { const isNew = select.value === '__new__'; custom.closest('label').hidden = !isNew; custom.required = isNew; if (!isNew) custom.value = ''; }; select.value = selected || ''; select.addEventListener('change', sync); sync(); }
function openForm(kind, editId = '') {
  if ((kind === 'staff' || kind === 'tracking') && sessionStorage.getItem('ghazal.adminRole') !== 'owner') return alert('هذه العملية متاحة للمالك فقط.');
  const editingCollection = kind === 'collection' ? collections.find(item => item.id === editId) : null;
  const editingHomeSection = kind === 'home-section' ? homeSections.find(item => item.id === editId) : null;
  const editingPublisher = kind === 'publisher' ? publishers.find(item => item.name === editId) : null;
  $('#owner-form-title').textContent = kind === 'tracking' ? 'إعدادات التتبع' : kind === 'book' ? 'إضافة كتاب جديد' : kind === 'publisher' ? (editingPublisher ? 'تعديل ملف دار النشر' : 'إضافة دار نشر') : kind === 'author' ? 'إضافة ملف مؤلف اختياري' : kind === 'collection' ? 'إنشاء مجموعة كتب' : kind === 'home-section' ? (editingHomeSection ? 'تعديل قسم الرئيسية' : 'إنشاء قسم رئيسية') : kind === 'book-genre' ? 'إضافة نوع كتاب' : 'إضافة تصنيف جديد';
  const collectionForm = `<div class="form-grid"><label>اسم المجموعة<input name="title" required placeholder="روايات قصيرة" value="${esc(editingCollection?.title || '')}" /></label><label>الرابط المختصر<input name="slug" required pattern="[a-z0-9-]+" placeholder="short-novels" value="${esc(editingCollection?.slug || '')}" /></label></div><label>وصف المجموعة<textarea name="description" rows="3" required placeholder="وصف يظهر للزائر ولإعلانات Meta">${esc(editingCollection?.description || '')}</textarea></label><div class="collection-book-picker"><div class="collection-picker-heading"><strong>كتب المجموعة</strong><small>ابحث بالعنوان أو المؤلف أو الناشر، ثم أضف الكتب من النتائج. تظهر الكتب المضافة في القائمة أدناه.</small></div><div class="discount-book-search"><span>⌕</span><input id="collection-book-search" type="search" placeholder="ابحث بعنوان الكتاب أو المؤلف أو الناشر" autocomplete="off" /></div><div id="collection-selected-books"></div><div id="collection-book-results" class="collection-book-results"></div></div><label class="discount-all-toggle"><input name="homepage" type="checkbox" ${editingCollection?.homepage !== false ? 'checked' : ''} /> أظهر المجموعة على الصفحة الرئيسية</label><label class="discount-all-toggle"><input name="active" type="checkbox" ${editingCollection?.active !== false ? 'checked' : ''} /> المجموعة نشطة</label><button class="button button-dark" type="submit">${editingCollection ? 'حفظ تعديلات المجموعة' : 'حفظ المجموعة'}</button>`;
  const homeSectionForm = `<div class="form-grid"><label>عنوان القسم<input name="title" required maxlength="120" placeholder="رفّ القراءة الهادئة" value="${esc(editingHomeSection?.title || '')}" /></label><label>الموضع على الرئيسية<select name="placement">${HOME_SECTION_PLACEMENTS.map(placement => `<option value="${placement.value}" ${(editingHomeSection?.placement || 'after-shelves') === placement.value ? 'selected' : ''}>${placement.label}</option>`).join('')}</select></label></div><label>وصف مختصر (اختياري)<input name="description" maxlength="300" placeholder="سطر صغير يظهر بجانب عنوان القسم" value="${esc(editingHomeSection?.description || '')}" /></label><div class="form-grid"><label>مصدر الكتب<select name="sectionType"><option value="books" ${editingHomeSection?.type !== 'collection' ? 'selected' : ''}>كتب مختارة يدويًا</option><option value="collection" ${editingHomeSection?.type === 'collection' ? 'selected' : ''}>مجموعة جاهزة</option></select></label><label data-section-collection-field>المجموعة<select name="collectionId"><option value="">اختر مجموعة</option>${collections.map(collection => `<option value="${esc(collection.id)}" ${editingHomeSection?.collectionId === collection.id ? 'selected' : ''}>${esc(collection.title)}${collection.active ? '' : ' (مخفية)'}</option>`).join('')}</select></label></div><div class="form-help" data-section-books-hint>اختر أي عدد من الكتب. تظهر في الكاروسيل بالترتيب الذي تضيفها به، ويمكنك البحث بالعنوان أو المؤلف أو الناشر.</div><div class="collection-book-picker" data-section-books-field><div class="collection-picker-heading"><strong>كتب القسم</strong><small>أضف كتبًا بلا حد أقصى، ثم راجع ترتيبها هنا.</small></div><div class="discount-book-search"><span>⌕</span><input id="collection-book-search" type="search" placeholder="ابحث بعنوان الكتاب أو المؤلف أو الناشر" autocomplete="off" /></div><div id="collection-selected-books"></div><div id="collection-book-results" class="collection-book-results"></div></div><label class="discount-all-toggle"><input name="active" type="checkbox" ${editingHomeSection?.active === false ? '' : 'checked'} /> يظهر القسم على الصفحة الرئيسية</label><button class="button button-dark" type="submit">${editingHomeSection ? 'حفظ تعديلات القسم' : 'حفظ القسم'}</button>`;
  $('#owner-form').innerHTML = kind === 'tracking' ? `<label>Meta Pixel ID<input name="pixelId" inputmode="numeric" placeholder="مثال: 123456789012345" value="${esc(read('ghazal.metaPixelId', ''))}" /></label><p class="form-help">اتركه فارغًا أثناء التطوير. عند وضع المعرّف، يسجل المتجر مشاهدة الكتاب، الإضافة إلى السلة، بدء الدفع، والمبيعات. لا تضع Access Token هنا؛ Conversions API يجب أن يبقى على الخادم.</p><button class="button button-dark" type="submit">حفظ إعدادات التتبع</button>` : kind === 'book' ? `<div class="form-grid"><label>عنوان الكتاب<input name="title" required /></label><label>المؤلف<input name="author" required /></label></div><div class="form-grid"><label>دار النشر<input name="publisher" required /></label><label>السعر بالدينار<input name="price" type="number" min="0" required /></label></div><div class="form-grid"><label>التصنيف<select name="category">${Object.entries(genres).map(([id, genre]) => `<option value="${id}">${esc(genre.title)}</option>`).join('')}</select></label><label>نوع الكتاب<select name="genre">${bookGenreOptions()}</select></label></div><label name="new-genre-label" hidden>اسم النوع الجديد<input name="genreCustom" placeholder="مثال: رواية مترجمة" /></label><label>نبذة<textarea name="note" rows="3" required></textarea></label><label class="bulk-drop">غلاف الكتاب<input name="cover" type="file" accept="image/*" /></label><button class="button button-dark" type="submit">حفظ الكتاب</button>` : kind === 'publisher' ? `<div class="form-grid"><label>اسم دار النشر<input name="name" required value="${esc(editingPublisher?.name || '')}" ${editingPublisher ? 'readonly' : ''} /></label><label>المدينة<input name="city" required value="${esc(editingPublisher?.city || '')}" /></label></div><label>الوصف<textarea name="description" rows="3" required>${esc(editingPublisher?.description || '')}</textarea></label>${editingPublisher?.logo ? `<div class="publisher-logo-preview">الشعار الحالي <img src="${esc(editingPublisher.logo)}" alt="" /></div>` : ''}<label class="bulk-drop">${editingPublisher ? 'تغيير شعار دار النشر (اختياري)' : 'شعار دار النشر'}<input name="logo" type="file" accept="image/*" /></label><button class="button button-dark" type="submit">${editingPublisher ? 'حفظ تعديلات الدار' : 'حفظ دار النشر'}</button>` : kind === 'author' ? `<label>اسم المؤلف<input name="name" required placeholder="يجب أن يطابق اسم المؤلف في الكتب" /></label><label>نبذة المؤلف<textarea name="bio" rows="4" placeholder="نبذة قصيرة تظهر في الصفحة العامة"></textarea></label><label class="bulk-drop">صورة المؤلف<input name="photo" type="file" accept="image/*" /></label><label><input name="featured" type="checkbox" /> أظهره كاختيار مميز</label><button class="button button-dark" type="submit">حفظ ملف المؤلف</button>` : kind === 'collection' ? collectionForm : kind === 'home-section' ? homeSectionForm : kind === 'book-genre' ? `<label>اسم نوع الكتاب<input name="bookGenre" required placeholder="رواية مترجمة" /></label><p class="form-help">سيظهر هذا النوع في فلتر الكتب وفي قائمة اختيار نوع الكتاب عند إضافة أو تعديل كتاب.</p><button class="button button-dark" type="submit">حفظ نوع الكتاب</button>` : `<div class="form-grid"><label>معرّف التصنيف<input name="id" required placeholder="مثال: poetry" pattern="[a-z0-9-]+" /></label><label>اسم التصنيف<input name="title" required placeholder="الشعر" /></label></div><label>وصف مختصر<textarea name="description" rows="3" required></textarea></label><button class="button button-dark" type="submit">حفظ التصنيف</button>`;
  $('#owner-form').dataset.kind = kind; $('#owner-form').dataset.editId = editId;
  if (kind === 'staff') { $('#owner-form-title').textContent = 'إضافة موظف خدمة العملاء'; $('#owner-form').innerHTML = '<p class="form-help">يمكن لهذا الحساب متابعة الطلبات وتحديث حالتها، لكنه لا يرى المبيعات ولا يحرر محتوى المتجر.</p><label>البريد الإلكتروني<input name="email" type="email" required autocomplete="email" /></label><label>كلمة المرور<input name="password" type="password" minlength="12" required autocomplete="new-password" /></label><button class="button button-dark" type="submit">إنشاء حساب الموظف</button>'; }
  if (kind === 'book' && editId) $('#owner-form-title').textContent = 'تعديل بيانات الكتاب';
  if (kind === 'collection' && editId) $('#owner-form-title').textContent = 'تعديل مجموعة الكتب';
  if (kind === 'collection') setupCollectionBookPicker($('#owner-form'), editingCollection?.bookIds || []);
  if (kind === 'home-section') setupHomeSectionForm($('#owner-form'), editingHomeSection?.bookIds || []);
  if (kind === 'book') {
    const book = books.find(item => item.id === editId);
    $('#owner-form').querySelector('textarea[name="note"]')?.closest('label')?.insertAdjacentHTML('afterend', '<label>مراجعة قصيرة للكتاب<textarea name="review" rows="5" maxlength="1200" placeholder="اكتب 5 إلى 10 أسطر عن تجربة قراءة هذا الكتاب"></textarea><small class="field-hint">حد أقصى 1200 حرفًا.</small></label>');
    $('#owner-form').insertAdjacentHTML('beforeend', `<label>ISBN<input name="isbn" inputmode="text" value="${esc(book?.isbn || '')}" placeholder="978-… أو 978…" /></label><label>الكمية المتوفرة<input name="stock" type="number" min="0" step="1" value="${esc(book?.stock ?? 10)}" /></label><label class="bulk-drop">إضافة عدة كتب عبر CSV<input name="bulk" type="file" accept=".csv,text/csv" /></label><small class="form-help">أعمدة CSV: العنوان، المؤلف، الناشر، السعر، التصنيف، التصنيف الفرعي، النبذة، الكمية، ISBN.</small>`);
    ['author','publisher'].forEach(name => { const input = $('#owner-form').elements[name]; input.classList.add('entity-autocomplete'); input.setAttribute('autocomplete', 'off'); input.insertAdjacentHTML('afterend', `<div class="entity-suggestions" data-suggestions-for="${name}" hidden></div>`); input.addEventListener('input', () => renderEntitySuggestions(input)); input.addEventListener('focus', () => renderEntitySuggestions(input)); });
    if (book) ['title','author','publisher','price','category','genre','note','review','stock','isbn'].forEach(name => { if (book[name] !== undefined && $('#owner-form').elements[name]) $('#owner-form').elements[name].value = book[name]; });
    setupBookGenreField($('#owner-form'), book?.genre || '');
    $('#owner-form').elements.bulk.addEventListener('change', event => { ['title','author','publisher','price','category','genre','note'].forEach(name => { if ($('#owner-form').elements[name]) $('#owner-form').elements[name].required = !event.target.files.length; }); });
  }
  if (kind === 'discount') {
    $('#owner-form-title').textContent = 'إضافة خصم';
    $('#owner-form').innerHTML = `<label>اسم الخصم<input name="name" required placeholder="خصم الصيف" /></label><div class="form-grid"><label>نوع الخصم<select name="type"><option value="percent">نسبة مئوية</option><option value="fixed">مبلغ ثابت بالدينار</option></select></label><label>قيمة الخصم<input name="value" type="number" min="0" step="0.01" required /></label></div><label>رمز الخصم (اختياري)<input name="code" maxlength="40" placeholder="مثال: GHazal10" /></label><label class="discount-all-toggle"><input name="appliesToAll" type="checkbox" /> طبّق الخصم على كل الكتب</label><div class="discount-book-search"><span>⌕</span><input id="discount-book-search" type="search" placeholder="ابحث بالعنوان أو المؤلف أو الناشر أو ISBN" autocomplete="off" /></div><div class="discount-picker-toolbar"><span id="discount-book-count">0 كتاب محدد</span><button class="text-button" type="button" data-discount-select-visible>تحديد النتائج الظاهرة</button></div><div id="discount-book-picker-list" class="discount-book-picker discount-book-picker-searchable"></div><label class="discount-all-toggle"><input name="active" type="checkbox" checked /> الخصم نشط الآن</label><button class="button button-dark" type="submit">حفظ الخصم</button>`;
    setupDiscountBookPicker();
  }
  if (kind === 'featured') {
    $('#owner-form-title').textContent = 'تعديل مختارات الغزال';
    $('#owner-form').innerHTML = `<p class="form-help">ابحث داخل كل خانة بعنوان الكتاب أو المؤلف أو دار النشر. يمكنك ترك الخانة فارغة، ولا يمكن تكرار الكتاب في أكثر من موضع.</p>${[0,1,2,3].map(index => { const selected = books.find(book => book.id === featuredBookIds[index]); return `<div class="featured-picker" data-slot="${index}"><label for="featured-search-${index}">الخانة ${index + 1}<input id="featured-search-${index}" class="featured-picker-search" type="search" autocomplete="off" placeholder="ابحث عن كتاب…" value="${esc(selected?.title || '')}" data-slot="${index}" /></label><input type="hidden" name="featuredOrder" value="${esc(selected?.id || '')}" data-slot="${index}" /><div class="featured-picker-suggestions" role="listbox" hidden></div><div class="featured-picker-selected" ${selected ? '' : 'hidden'}><img src="${selected ? bookCover(selected) : ''}" alt="" /><span>${selected ? `${esc(selected.author)} · ${esc(selected.publisher)}` : ''}</span><button type="button" data-clear-featured>تغيير</button></div></div>`; }).join('')}<button class="button button-dark" type="submit">حفظ المختارات</button>`;
    setupFeaturedPickers();
  }
  $('#owner-form-overlay').hidden = false; $('#owner-form').querySelector('input')?.focus();
}
$$('[data-owner-form]').forEach(button => button.addEventListener('click', () => openForm(button.dataset.ownerForm)));
$('#owner-form-close').addEventListener('click', () => { $('#owner-form-overlay').hidden = true; });
$('#owner-form-overlay').addEventListener('click', event => { if (event.target === event.currentTarget) event.currentTarget.hidden = true; });
$('#owner-form').addEventListener('input', event => {
  if (event.target.id !== 'discount-book-search') return;
  renderDiscountBookPicker(event.currentTarget);
  event.target.focus();
  event.target.setSelectionRange(event.target.value.length, event.target.value.length);
});
$('#owner-form').addEventListener('change', event => {
  if (!event.target.matches('[data-discount-book]')) return;
  const form = event.currentTarget;
  const selected = discountSelectedIds(form);
  event.target.checked ? selected.add(event.target.dataset.discountBook) : selected.delete(event.target.dataset.discountBook);
  form.dataset.discountSelected = JSON.stringify([...selected]);
  renderDiscountBookPicker(form);
});
$('#owner-form').addEventListener('click', event => {
  const button = event.target.closest('[data-discount-select-visible]');
  if (!button) return;
  const form = event.currentTarget;
  const selected = discountSelectedIds(form);
  JSON.parse(form.dataset.discountVisibleIds || '[]').forEach(id => selected.add(id));
  form.dataset.discountSelected = JSON.stringify([...selected]);
  renderDiscountBookPicker(form);
});
const BULK_BOOK_FIELDS = [
  { id:'title', label:'العنوان', required:true, aliases:['title','العنوان','اسم الكتاب','book title'] },
  { id:'author', label:'المؤلف', required:true, aliases:['author','المؤلف','الكاتب'] },
  { id:'publisher', label:'الناشر', required:true, aliases:['publisher','الناشر','دار النشر'] },
  { id:'price', label:'السعر', required:true, aliases:['price','السعر','الثمن','prix'] },
  { id:'category', label:'التصنيف العام', aliases:['category','التصنيف العام','التصنيف','القسم'] },
  { id:'genre', label:'التصنيف الفرعي', aliases:['genre','التصنيف الفرعي','النوع'] },
  { id:'review', label:'المراجعة القصيرة', aliases:['review','المراجعة القصيرة','المراجعة','مراجعة','نبذة'] },
  { id:'stock', label:'الكمية / المخزون', aliases:['stock','quantity','qty','الكمية / المخزون','الكمية','المخزون','الكمية المتوفرة'] },
  { id:'note', label:'ملاحظات داخلية', aliases:['note','notes','ملاحظات داخلية','ملاحظات'] },
  { id:'image', label:'رابط صورة الغلاف', aliases:['image','cover','image url','cover url','رابط صورة الغلاف','الغلاف','رابط الغلاف','رابط الصورة'] }
  ,{ id:'isbn', label:'ISBN', aliases:['isbn','isbn13','الترقيم الدولي'] }
  ,{ id:'pages', label:'عدد الصفحات', aliases:['pages','page count','number of pages','عدد الصفحات','الصفحات','عدد الصفحات الكلي','nombre de pages'] }
];
function normalizeColumn(value) { return String(value || '').replace(/[*☆★]/g, '').trim().toLocaleLowerCase('ar').replace(/[._-]+/g, ' '); }
function parseDelimitedText(text) {
  const rows = []; let row = []; let cell = ''; let quoted = false;
  for (let index = 0; index < String(text).length; index += 1) { const char = text[index]; const next = text[index + 1]; if (char === '"' && quoted && next === '"') { cell += '"'; index += 1; } else if (char === '"') quoted = !quoted; else if (!quoted && (char === ',' || char === '\t')) { row.push(cell.trim()); cell = ''; } else if (!quoted && (char === '\n' || char === '\r')) { if (char === '\r' && next === '\n') index += 1; row.push(cell.trim()); if (row.some(value => value !== '')) rows.push(row); row = []; cell = ''; } else cell += char; }
  if (cell || row.length) { row.push(cell.trim()); if (row.some(value => value !== '')) rows.push(row); } return rows;
}
function columnIndex(reference) { const letters = String(reference || '').replace(/\d/g, ''); return [...letters].reduce((sum, letter) => sum * 26 + letter.toUpperCase().charCodeAt(0) - 64, 0) - 1; }
async function parseXlsxRows(file) {
  const entries = parseZip(await file.arrayBuffer()); const sheet = entries.find(entry => entry.name === 'xl/worksheets/sheet1.xml'); if (!sheet) throw new Error('sheet');
  const xml = new DOMParser().parseFromString(new TextDecoder().decode(await inflateZip(sheet.data, sheet.method)), 'application/xml');
  const sharedEntry = entries.find(entry => entry.name === 'xl/sharedStrings.xml'); const shared = sharedEntry ? [...new DOMParser().parseFromString(new TextDecoder().decode(await inflateZip(sharedEntry.data, sharedEntry.method)), 'application/xml').querySelectorAll('si')].map(item => item.textContent || '') : [];
  return [...xml.querySelectorAll('sheetData > row')].map(row => { const values = []; [...row.children].filter(cell => cell.localName === 'c').forEach(cell => { const index = columnIndex(cell.getAttribute('r')); const type = cell.getAttribute('t'); const raw = type === 'inlineStr' ? cell.querySelector('is')?.textContent || '' : cell.querySelector('v')?.textContent || ''; values[index] = type === 's' ? (shared[Number(raw)] || '') : raw; }); return values.map(value => value ?? ''); }).filter(row => row.some(value => String(value).trim() !== ''));
}
async function parseBookSpreadsheet(file) { const name = String(file?.name || '').toLowerCase(); return name.endsWith('.xlsx') ? parseXlsxRows(file) : parseDelimitedText(await readFileText({ files:[file] })); }
function autoBulkMapping(headers) { const normalized = headers.map(normalizeColumn); return Object.fromEntries(BULK_BOOK_FIELDS.map(field => [field.id, normalized.findIndex(header => field.aliases.some(alias => normalizeColumn(alias) === header))]).map(([id, index]) => [id, index >= 0 ? String(index) : ''])); }
function isGhazalImportTemplate(headers, mapping) { const normalized = headers.map(normalizeColumn); const required = BULK_BOOK_FIELDS.filter(field => field.required); const known = BULK_BOOK_FIELDS.filter(field => field.id !== 'pages'); const allFieldsPresent = known.every(field => mapping[field.id] !== ''); const requiredPresent = required.every(field => mapping[field.id] !== ''); return normalized.length >= known.length && allFieldsPresent && requiredPresent; }
function ensureBulkBookOverlay() {
  if ($('#bulk-book-overlay')) return;
  document.body.insertAdjacentHTML('beforeend', `<div class="overlay admin-overlay" id="bulk-book-overlay" hidden><div class="form-panel bulk-import-panel" role="dialog" aria-modal="true"><button class="close-button" type="button" data-close-bulk>×</button><p class="eyebrow">الغزال / استيراد الكتب</p><h2>أضف رفًا <em>كاملًا.</em></h2><p class="owner-copy">ارفع CSV أو TSV أو XLSX، ثم اربط كل عمود بالحقل المناسب قبل الحفظ. الحقول الإلزامية مميزة بوضوح، ويمكن مراجعة أول الصفوف قبل الاستيراد.</p><label class="bulk-upload-zone">اختر ملف spreadsheet<input id="bulk-book-file" type="file" accept=".csv,.tsv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" /><small id="bulk-book-file-name">لم يتم اختيار ملف</small></label><div id="bulk-book-mapping"></div><div class="bulk-import-actions"><button class="button button-dark" id="bulk-book-import" type="button" disabled>استيراد الكتب</button><button class="text-button" type="button" data-close-bulk>إلغاء</button></div></div></div>`);
  $('#bulk-book-file').addEventListener('change', async event => { const file = event.target.files?.[0]; if (!file) return; $('#bulk-book-file-name').textContent = file.name; $('#bulk-book-mapping').innerHTML = '<p class="owner-note">جارٍ قراءة الملف…</p>'; try { const rows = await parseBookSpreadsheet(file); if (!rows.length) throw new Error('empty'); bulkBookHeaders = rows[0].map((value, index) => String(value || `العمود ${index + 1}`)); bulkBookRows = rows.slice(1); bulkBookMapping = autoBulkMapping(bulkBookHeaders); bulkTemplateDetected = isGhazalImportTemplate(bulkBookHeaders, bulkBookMapping); renderBulkBookMapping(); } catch (error) { bulkTemplateDetected = false; $('#bulk-book-mapping').innerHTML = '<p class="bulk-error">تعذر قراءة الملف. استخدم CSV أو TSV أو XLSX سليمًا، ويجب أن يكون الصف الأول عناوين الأعمدة.</p>'; $('#bulk-book-import').disabled = true; console.error(error); } });
  $('#bulk-book-mapping').addEventListener('change', event => { if (event.target.matches('[data-bulk-map]')) { bulkBookMapping[event.target.dataset.bulkMap] = event.target.value; renderBulkBookMapping(); } });
  $('#bulk-book-import').addEventListener('click', importMappedBooks);
  $$('[data-close-bulk]').forEach(button => button.addEventListener('click', () => { $('#bulk-book-overlay').hidden = true; }));
}
function renderBulkBookMapping() {
  const options = `<option value="">— لا يوجد عمود —</option>${bulkBookHeaders.map((header, index) => `<option value="${index}">${esc(header)}</option>`).join('')}`;
  const mapping = BULK_BOOK_FIELDS.map(field => `<label class="bulk-map-row"><span>${field.label}${field.required ? ' <b>*</b>' : ''}</span><select data-bulk-map="${field.id}">${options}</select></label>`).join('');
  const preview = bulkBookRows.slice(0, 4).map(row => `<tr>${bulkBookHeaders.map((_, index) => `<td>${esc(row[index] || '')}</td>`).join('')}</tr>`).join('');
  $('#bulk-book-mapping').innerHTML = `${bulkTemplateDetected ? '<p class="bulk-template-confirmed">✓ تم التعرف على قالب الغزال ومطابقة كل الأعمدة تلقائيًا.</p>' : '<p class="owner-note">ملف مخصص: راجع مطابقة الأعمدة قبل الاستيراد.</p>'}<div class="bulk-map-grid"><h3>طابق الأعمدة مع بيانات الكتاب</h3>${mapping}</div><div class="bulk-preview"><h3>معاينة ${bulkBookRows.length} صف</h3><div class="bulk-preview-scroll"><table><thead><tr>${bulkBookHeaders.map(header => `<th>${esc(header)}</th>`).join('')}</tr></thead><tbody>${preview}</tbody></table></div></div>`;
  BULK_BOOK_FIELDS.forEach(field => { const select = $(`[data-bulk-map="${field.id}"]`); select.value = bulkBookMapping[field.id] || ''; });
  $('#bulk-book-import').disabled = !bulkBookRows.length || !BULK_BOOK_FIELDS.filter(field => field.required).every(field => bulkBookMapping[field.id] !== '');
}
function openBulkBooks() { ensureBulkBookOverlay(); if (!$('#bulk-book-template-link')) $('#bulk-book-overlay .bulk-upload-zone').insertAdjacentHTML('afterend', '<a id="bulk-book-template-link" class="text-button" href="assets/templates/ghazal-book-import-template.xlsx" download>تحميل قالب Excel الجاهز ↙</a>'); $('#bulk-book-overlay').hidden = false; $('#bulk-book-file').value = ''; $('#bulk-book-file-name').textContent = 'لم يتم اختيار ملف'; $('#bulk-book-mapping').innerHTML = '<p class="owner-note">ابدأ باختيار ملف spreadsheet.</p>'; $('#bulk-book-import').disabled = true; }
function bulkValue(row, field) { const key = typeof field === 'string' ? field : field.id; const index = bulkBookMapping[key]; return index === '' || index === undefined ? '' : String(row[Number(index)] ?? '').trim(); }
function importNumber(value, integer = false) {
  const normalized = String(value ?? '').trim().replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).replace(/،/g, ',');
  const decimal = normalized.includes('.') ? normalized : normalized.replace(',', '.');
  const number = Number(decimal.replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(number)) return 0;
  return integer ? Math.max(0, Math.trunc(number)) : Math.max(0, number);
}
function blobDataUrl(blob) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('image_read_failed')); reader.readAsDataURL(blob); }); }
async function resizedCover(blob, maxSide, quality) {
  try {
    const image = typeof createImageBitmap === 'function' ? await createImageBitmap(blob) : await new Promise((resolve, reject) => { const source = URL.createObjectURL(blob); const element = new Image(); element.onload = () => { URL.revokeObjectURL(source); resolve(element); }; element.onerror = () => { URL.revokeObjectURL(source); reject(new Error('image_decode_failed')); }; element.src = source; });
    const width = Number(image.width); const height = Number(image.height); const scale = Math.min(1, maxSide / Math.max(width, height));
    if (!(scale < 1) || !width || !height) { if (typeof image.close === 'function') image.close(); return ''; }
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d'); if (!context) { if (typeof image.close === 'function') image.close(); return ''; }
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, canvas.width, canvas.height); if (typeof image.close === 'function') image.close();
    for (const type of ['image/webp', 'image/jpeg']) { const output = await new Promise(resolve => canvas.toBlob(resolve, type, quality)); if (output?.size) return blobDataUrl(output); }
    return '';
  } catch { return ''; }
}
// Uploads a cover once and returns the stored paths. The original is kept
// byte-for-byte; thumb/display are generated here and stored next to it, so the
// catalog payload stays tiny and the storefront never downloads full covers.
async function storeBookCover(value) {
  const source = String(value || '').trim(); if (!source) return null;
  if (!source.startsWith('data:') && !/^https?:\/\//i.test(source)) return { image: source };
  const token = sessionStorage.getItem(ADMIN_SESSION_KEY);
  let blob = null;
  if (source.startsWith('data:')) { try { blob = await (await fetch(source)).blob(); } catch { blob = null; } }
  else { try { const response = await fetch(source, { mode:'cors' }); if (response.ok) blob = await response.blob(); } catch { blob = null; } }
  if (blob && blob.size) {
    try { const original = await blobDataUrl(blob); const display = await resizedCover(blob, 1000, 0.86); const thumb = await resizedCover(blob, 400, 0.82); return await window.GhazalAPI.saveCover(token, { original, ...(thumb ? { thumb } : {}), ...(display ? { display } : {}) }); } catch { /* Fall through to the server-side fetch. */ }
  }
  if (/^https?:\/\//i.test(source)) {
    let saved;
    try { saved = await window.GhazalAPI.saveCover(token, { url: source }); } catch {
      // Server could not fetch the URL (blocked, rate-limited, etc.).
      // Preserve the raw URL so the catalog still points somewhere valid
      // and the background cacher can retry later.
      return { image: source };
    }
    if (!saved?.image) return { image: source };
    // Some publishers block cross-origin reads, so the browser cannot build
    // derivatives before the upload. Read the stored copy back (same origin)
    // and upload the smaller sizes so shelves stay fast anyway.
    try {
      const stored = await fetch(saved.image);
      if (stored.ok) {
        const blob = await stored.blob();
        const display = await resizedCover(blob, 1000, 0.86);
        const thumb = await resizedCover(blob, 400, 0.82);
        if (thumb || display) {
          const extra = await window.GhazalAPI.saveCover(token, { source: saved.image, ...(thumb ? { thumb } : {}), ...(display ? { display } : {}) });
          return { image: saved.image, ...(extra.thumb ? { thumb: extra.thumb } : {}), ...(extra.display ? { display: extra.display } : {}) };
        }
      }
    } catch { /* The original still renders without derivatives. */ }
    return saved;
  }
  // Unreachable for http sources (handled above); only hit for data: blobs
  // that failed both the direct and server-side paths.
  throw new Error('image_cache_failed');
}
// Publisher logos and author photos are only shown at small sizes, so shrink
// them before they reach localStorage. That keeps the settings snapshot tiny
// and avoids the quota crash that used to kill the whole dashboard.
async function imageField(input, maxSide = 512, quality = 0.85) {
  const file = input?.files?.[0]; if (!file) return '';
  const resized = await resizedCover(file, maxSide, quality);
  return resized || blobDataUrl(file);
}
async function importMappedBooks() {
  const importButton = $('#bulk-book-import'); const importLabel = importButton.textContent;
  importButton.disabled = true; importButton.textContent = 'جارٍ الاستيراد…';
  try {
  const missing = []; const imported = []; const coverFailures = [];
  for (let rowIndex = 0; rowIndex < bulkBookRows.length; rowIndex += 1) { const row = bulkBookRows[rowIndex]; if (!row.some(value => String(value ?? '').trim() !== '')) continue; importButton.textContent = `جارٍ الاستيراد… ${rowIndex + 1}/${bulkBookRows.length}`; const values = Object.fromEntries(BULK_BOOK_FIELDS.map(field => [field.id, bulkValue(row, field)])); const requiredMissing = BULK_BOOK_FIELDS.filter(field => field.required && !values[field.id]); if (requiredMissing.length) { missing.push(rowIndex + 2); continue; } const price = importNumber(values.price); const stock = importNumber(values.stock, true); const pages = values.pages ? importNumber(values.pages, true) : null; const isbn = values.isbn.trim(); const isbnKey = normalizeBookIsbn(isbn); const match = books.find(book => (isbnKey && normalizeBookIsbn(book.isbn) === isbnKey) || (book.title.trim().toLocaleLowerCase('ar') === values.title.trim().toLocaleLowerCase('ar') && book.author.trim().toLocaleLowerCase('ar') === values.author.trim().toLocaleLowerCase('ar'))); let cover = { image: match?.image || '', thumb: match?.thumb || '', display: match?.display || '' }; const coverSource = values.image || (String(match?.image || '').startsWith('data:') ? match.image : ''); if (coverSource) { try { const stored = await storeBookCover(coverSource); if (stored) cover = { image: stored.image || cover.image, thumb: stored.thumb || cover.thumb, display: stored.display || cover.display }; } catch { coverFailures.push(rowIndex + 2); if (/^https?:\/\//i.test(coverSource)) cover.image = coverSource; } } imported.push({ ...(match || {}), id:match?.id || `book-${Date.now()}-${rowIndex}`, title:values.title, author:values.author, publisher:values.publisher, price, category:values.category || match?.category || 'غير مصنف', genre:values.genre || match?.genre || 'عام', review:values.review.slice(0, 1200), note:values.note || match?.note || '', stock, isbn:isbn || match?.isbn || '', ...(pages ? { pages } : {}), image:cover.image, ...(cover.thumb ? { thumb: cover.thumb } : {}), ...(cover.display ? { display: cover.display } : {}) }); }
  if (missing.length) { alert(`هناك صفوف ناقصة في الحقول الإلزامية: ${missing.slice(0, 8).join('، ')}${missing.length > 8 ? '…' : ''}`); return; }
  if (coverFailures.length) alert(`تم استيراد الكتب، لكن تعذّر تنزيل أغلفة ${coverFailures.length} صفًا (${coverFailures.slice(0, 8).join('، ')}${coverFailures.length > 8 ? '…' : ''}). سيبقى الغلاف السابق أو الافتراضي، ويمكنك إضافته لاحقًا من تعديل الكتاب.`);
  if (!imported.length) { alert('لم يتم العثور على صفوف كتب صالحة للاستيراد.'); return; }
  const current = read('ghazal.customBooks.v1', []); const before = [...current]; const next = [...current]; imported.forEach(book => { const index = next.findIndex(item => item.id === book.id); index >= 0 ? next.splice(index, 1, book) : next.push(book); });
  // Keep the in-memory catalog in sync before sending it to the server. Without
  // this, the server received the old catalog and the reload hid new imports.
  const importedById = new Map(imported.map(book => [book.id, book]));
  books = [...books.filter(book => !importedById.has(book.id)), ...imported];
  refreshGenresFromBooks();
  save('ghazal.genres.v1', genres); save('ghazal.bookGenres.v1', bookGenres);
  // The undo snapshot only needs the previous catalog; embedding the imported
  // covers twice overflows the browser's localStorage quota and aborted the
  // import before the server sync. Keep ids only, and degrade gracefully.
  const snapshot = { before, afterIds: next.map(book => book.id), createdAt: new Date().toISOString() };
  try { save('ghazal.lastImport.v1', snapshot); }
  catch (error) { if (error?.name !== 'QuotaExceededError') throw error; console.warn('last_import_snapshot_too_large', error); try { save('ghazal.lastImport.v1', { ...snapshot, before: before.map(book => String(book?.image || '').startsWith('data:') ? { ...book, image: '' } : book) }); } catch (inner) { if (inner?.name !== 'QuotaExceededError') throw inner; console.warn('last_import_snapshot_skipped', inner); } }
  try { save('ghazal.customBooks.v1', next); }
  catch (error) { if (error?.name !== 'QuotaExceededError') throw error; alert('تم استيراد الكتب، لكن مساحة التخزين المحلية في المتصفح لا تكفي لحفظ نسخة كاملة من الأغلفة. النسخة الكاملة ستُحفظ على الخادم.'); }
  let synced = true;
  try { await flushCatalogSync(); } catch (error) { synced = false; const reason = String(error?.message || ''); const message = reason.includes('permission_denied') ? 'حسابك لا يملك صلاحية تعديل الفهرس. اطلب من المالك تفعيل صلاحية تعديل الكتب.' : reason.includes('request_too_large') ? 'ملف الاستيراد كبير جدًا بسبب الصور. قلّل حجم الصور أو استورد الكتب على دفعات أصغر.' : reason.includes('request_failed') || reason.includes('timeout') ? 'تعذر الاتصال بالخادم. تأكد أن server.js يعمل ثم أعد المحاولة.' : `تعذرت مزامنة الكتب مع الخادم (${reason || 'خطأ غير معروف'}). ستبقى محفوظة محليًا ويمكن إعادة المحاولة.`; alert(`تم حفظ الكتب محليًا، لكن ${message}`); }
  $('#bulk-book-overlay').hidden = true;
  if (synced) location.reload(); else { bookQuery = ''; bookPage = 1; renderBooksWorkspace(); if ($('#owner-book-count')) $('#owner-book-count').textContent = books.length; }
  } finally { importButton.textContent = importLabel; importButton.disabled = false; }
}
function readFileText(input) { return new Promise(resolve => { const file = input?.files?.[0]; if (!file) return resolve(''); const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsText(file); }); }
function csvBookRows(text) { return String(text).split(/\r?\n/).filter(Boolean).slice(1).map(row => row.split(',').map(value => value.trim())).filter(values => values.length >= 4); }
$('#owner-form').addEventListener('submit', async event => {
  event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
  if ((form.dataset.kind === 'staff' || form.dataset.kind === 'tracking') && sessionStorage.getItem('ghazal.adminRole') !== 'owner') { alert('هذه العملية متاحة للمالك فقط.'); return; }
  if (form.dataset.kind === 'staff') { try { await window.GhazalAPI.createStaff(sessionStorage.getItem(ADMIN_SESSION_KEY), String(data.get('email') || '').trim(), String(data.get('password') || '')); alert('تم إنشاء حساب موظف خدمة العملاء.'); } catch (error) { alert(String(error.message).includes('duplicate') ? 'هذا البريد مستخدم من قبل.' : 'تعذر إنشاء الحساب. استخدم بريدًا صحيحًا وكلمة مرور من 12 حرفًا.'); return; } }
  else if (form.dataset.kind === 'tracking') { save('ghazal.metaPixelId', String(data.get('pixelId') || '').trim()); alert('حُفظت إعدادات التتبع. افتح المتجر من جديد لتفعيلها.'); }
  else if (form.dataset.kind === 'publisher') { const name = String(data.get('name') || '').trim(); const existing = publishers.find(item => item.name === form.dataset.editId); const newLogo = await imageField(form.elements.logo, 360, 0.88); const publisher = { ...(existing || {}), id:existing?.id || `publisher-${Date.now()}`, name, city:String(data.get('city') || '').trim(), since:existing?.since || 'إضافة جديدة', description:String(data.get('description') || '').trim(), logo:newLogo || existing?.logo || name.slice(0,1) }; publishers = existing ? publishers.map(item => item.name === existing.name ? publisher : item) : [...publishers, publisher]; save('ghazal.customPublishers.v1', publishers); }
  else if (form.dataset.kind === 'author') { const name = data.get('name').trim(); const profiles = { ...authorProfiles }; profiles[name] = { bio:data.get('bio'), photo:await imageField(form.elements.photo, 480, 0.85), featured:data.get('featured') === 'on' }; authorProfiles = profiles; save('ghazal.authorProfiles.v1', profiles); }
  else if (form.dataset.kind === 'genre') { const id = data.get('id').trim(); const custom = { ...genres }; custom[id] = { title:data.get('title').trim(), description:data.get('description').trim() }; genres = custom; save('ghazal.genres.v1', custom); }
  else if (form.dataset.kind === 'book-genre') { const value = String(data.get('bookGenre') || '').trim(); if (!value) return; if (!bookGenres.includes(value)) { bookGenres = [...bookGenres, value].sort((a,b) => a.localeCompare(b, 'ar')); save('ghazal.bookGenres.v1', bookGenres); } }
  else if (form.dataset.kind === 'discount') { const appliesToAll = data.get('appliesToAll') === 'on'; const bookIds = [...discountSelectedIds(form)]; if (!appliesToAll && !bookIds.length) { alert('اختر كتابًا واحدًا على الأقل أو فعّل تطبيق الخصم على كل الكتب.'); return; } const value = Math.max(0, Number(data.get('value')) || 0); if (data.get('type') === 'percent' && value > 100) { alert('النسبة لا يمكن أن تتجاوز 100٪.'); return; } discounts = [...read('ghazal.discounts.v1', []), { id:`discount-${Date.now()}`, name:data.get('name').trim(), type:data.get('type'), value, code:String(data.get('code') || '').trim().toUpperCase(), appliesToAll, bookIds, active:data.get('active') === 'on' }]; save('ghazal.discounts.v1', discounts); }
  else if (form.dataset.kind === 'collection') { const editId = form.dataset.editId; const title = String(data.get('title') || '').trim(); const slug = String(data.get('slug') || '').trim().toLowerCase(); if (collections.some(item => item.slug === slug && item.id !== editId)) { alert('هذا الرابط مستخدم من قبل. اختر رابطًا مختلفًا.'); return; } const collection = { id:editId || `collection-${Date.now()}`, slug, title, description:String(data.get('description') || '').trim(), bookIds:collectionSelectedIds(form), homepage:data.get('homepage') === 'on', active:data.get('active') === 'on' }; try { const result = editId ? await window.GhazalAPI.updateCollection(sessionStorage.getItem(ADMIN_SESSION_KEY), editId, collection) : await window.GhazalAPI.createCollection(sessionStorage.getItem(ADMIN_SESSION_KEY), collection); const saved = result.collection || collection; collections = editId ? collections.map(item => item.id === editId ? saved : item) : [...collections, saved]; save('ghazal.collections.v1', collections); } catch (error) { alert(collectionErrorMessage(error)); return; } }
  else if (form.dataset.kind === 'home-section') {
    const editId = form.dataset.editId;
    const title = String(data.get('title') || '').trim();
    const type = String(data.get('sectionType') || 'books') === 'collection' ? 'collection' : 'books';
    const collectionId = type === 'collection' ? String(data.get('collectionId') || '').trim() : '';
    const bookIds = type === 'books' ? collectionSelectedIds(form) : [];
    if (!title) { alert('اكتب عنوانًا للقسم.'); return; }
    if (type === 'collection' && !collectionId) { alert('اختر مجموعة جاهزة لهذا القسم.'); return; }
    if (type === 'books' && !bookIds.length) { alert('أضف كتابًا واحدًا على الأقل إلى القسم.'); return; }
    const placement = HOME_SECTION_PLACEMENTS.some(item => item.value === data.get('placement')) ? String(data.get('placement')) : 'after-shelves';
    const section = { id:editId || `home-section-${Date.now()}`, title, description:String(data.get('description') || '').trim(), type, collectionId, bookIds, placement, active:data.get('active') === 'on' };
    homeSections = editId ? homeSections.map(item => item.id === editId ? section : item) : [...homeSections, section];
    save('ghazal.homeSections.v1', homeSections);
  }
  else if (form.dataset.kind === 'featured') { const selected = [...form.querySelectorAll('input[name="featuredOrder"]')].map(input => input.value).filter(Boolean); if (new Set(selected).size !== selected.length) { alert('اختر كتابًا مختلفًا في كل خانة.'); return; } featuredBookIds = selected; save('ghazal.featuredBooks.v1', featuredBookIds); }
  else {
    const bulkRows = await readFileText(form.elements.bulk); const current = read('ghazal.customBooks.v1', []);
    if (bulkRows) {
      const added = csvBookRows(bulkRows).map((values, index) => ({ id:`book-${Date.now()}-${index}`, title:values[0], author:values[1], publisher:values[2], price:Number(values[3]) || 0, category:values[4] || 'غير مصنف', genre:values[5] || 'عام', review:values[6] || '', note:values[6] || 'كتاب جديد على رفوف الغزال.', stock:Math.max(0, Number(values[7]) || 0), isbn:String(values[8] || '').trim(), image:'' }));
      books = [...books, ...added]; refreshGenresFromBooks(); save('ghazal.customBooks.v1', [...current, ...added]); save('ghazal.genres.v1', genres); save('ghazal.bookGenres.v1', bookGenres);
    } else {
      const id = form.dataset.editId || `book-${Date.now()}`; const existing = books.find(book => book.id === id) || {}; const selectedGenre = String(data.get('genre') || '').trim(); const genre = selectedGenre === '__new__' ? String(data.get('genreCustom') || '').trim() : selectedGenre; if (!genre) { alert('اختر نوع الكتاب أو أضف نوعًا جديدًا.'); return; } let cover = { image: existing.image || '', thumb: existing.thumb || '', display: existing.display || '' }; const coverFile = form.elements.cover?.files?.[0]; if (coverFile) { try { const stored = await storeBookCover(await blobDataUrl(coverFile)); if (stored?.image) cover = { image: stored.image, thumb: stored.thumb || '', display: stored.display || '' }; } catch { alert('تعذر تخزين صورة الغلاف. جرّب صورة أخرى أصغر.'); return; } } const book = { ...existing, id, title:data.get('title'), author:data.get('author'), publisher:data.get('publisher'), price:Number(data.get('price')) || 0, category:data.get('category'), genre, note:data.get('note'), review:String(data.get('review') || existing.review || '').slice(0, 1200), stock:Math.max(0, Number(data.get('stock')) || 0), isbn:String(data.get('isbn') || '').trim(), image:cover.image, ...(cover.thumb ? { thumb: cover.thumb } : {}), ...(cover.display ? { display: cover.display } : {}) }; books = [...books.filter(item => item.id !== id), book]; refreshGenresFromBooks(); const next = current.filter(item => item.id !== id); save('ghazal.customBooks.v1', [...next, book]); save('ghazal.genres.v1', genres); save('ghazal.bookGenres.v1', bookGenres);
    }
  }
  try { await flushCatalogSync(); } catch { alert('تم الحفظ محليًا، لكن تعذرت مزامنته مع الخادم.'); } $('#owner-form-overlay').hidden = true; location.reload();
});
const TEMPLATE_URL = 'assets/templates/upload_ecotrack_v31.xlsx';
const zipU16 = (bytes, offset) => bytes[offset] | (bytes[offset + 1] << 8);
const zipU32 = (bytes, offset) => (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
const putU16 = (view, offset, value) => view.setUint16(offset, value, true);
const putU32 = (view, offset, value) => view.setUint32(offset, value >>> 0, true);
function crc32(bytes) { let crc = 0xffffffff; for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); } return (crc ^ 0xffffffff) >>> 0; }
async function streamBytes(stream, bytes) { const output = new Response(stream.readable).arrayBuffer(); const writer = stream.writable.getWriter(); await writer.write(bytes); await writer.close(); return new Uint8Array(await output); }
async function inflateZip(bytes, method) { return method === 0 ? bytes : new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()); }
async function deflateZip(bytes) { return streamBytes(new CompressionStream('deflate-raw'), bytes); }
function parseZip(buffer) {
  const bytes = new Uint8Array(buffer); let eocd = bytes.length - 22;
  while (eocd >= 0 && zipU32(bytes, eocd) !== 0x06054b50) eocd -= 1;
  if (eocd < 0) throw new Error('لم نتمكن من قراءة ملف Ecotrack.');
  const count = zipU16(bytes, eocd + 10); const centralOffset = zipU32(bytes, eocd + 16); const entries = []; let cursor = centralOffset;
  for (let index = 0; index < count; index += 1) {
    if (zipU32(bytes, cursor) !== 0x02014b50) throw new Error('بنية ملف Ecotrack غير متوقعة.');
    const nameLength = zipU16(bytes, cursor + 28); const extraLength = zipU16(bytes, cursor + 30); const commentLength = zipU16(bytes, cursor + 32); const name = new TextDecoder().decode(bytes.slice(cursor + 46, cursor + 46 + nameLength)); const localOffset = zipU32(bytes, cursor + 42); const localNameLength = zipU16(bytes, localOffset + 26); const localExtraLength = zipU16(bytes, localOffset + 28); const dataStart = localOffset + 30 + localNameLength + localExtraLength; const compressedSize = zipU32(bytes, cursor + 20);
    entries.push({ name, method: zipU16(bytes, cursor + 10), time: zipU16(bytes, cursor + 12), date: zipU16(bytes, cursor + 14), crc: zipU32(bytes, cursor + 16), uncompressedSize: zipU32(bytes, cursor + 24), data: bytes.slice(dataStart, dataStart + compressedSize) }); cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}
function zipBytes(entries) {
  const chunks = []; const central = []; let offset = 0; const encoder = new TextEncoder();
  entries.forEach(entry => { const name = encoder.encode(entry.name); const local = new Uint8Array(30 + name.length + entry.data.length); const view = new DataView(local.buffer); putU32(view, 0, 0x04034b50); putU16(view, 4, 20); putU16(view, 6, 0); putU16(view, 8, entry.method); putU16(view, 10, entry.time); putU16(view, 12, entry.date); putU32(view, 14, entry.crc); putU32(view, 18, entry.data.length); putU32(view, 22, entry.uncompressedSize ?? entry.data.length); putU16(view, 26, name.length); putU16(view, 28, 0); local.set(name, 30); local.set(entry.data, 30 + name.length); chunks.push(local); const record = new Uint8Array(46 + name.length); const recordView = new DataView(record.buffer); putU32(recordView, 0, 0x02014b50); putU16(recordView, 4, 20); putU16(recordView, 6, 20); putU16(recordView, 8, 0); putU16(recordView, 10, entry.method); putU16(recordView, 12, entry.time); putU16(recordView, 14, entry.date); putU32(recordView, 16, entry.crc); putU32(recordView, 20, entry.data.length); putU32(recordView, 24, entry.uncompressedSize ?? entry.data.length); putU16(recordView, 28, name.length); putU16(recordView, 30, 0); putU16(recordView, 32, 0); putU16(recordView, 34, 0); putU16(recordView, 36, 0); putU32(recordView, 38, 0); putU32(recordView, 42, offset); record.set(name, 46); central.push(record); offset += local.length; });
  const centralSize = central.reduce((sum, item) => sum + item.length, 0); const end = new Uint8Array(22); const endView = new DataView(end.buffer); putU32(endView, 0, 0x06054b50); putU16(endView, 8, entries.length); putU16(endView, 10, entries.length); putU32(endView, 12, centralSize); putU32(endView, 16, offset); return new Blob([...chunks, ...central, end], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
const xmlEscape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;' }[character]));
function workbookRows(exportable) { return exportable.map(order => { const row = order.ecotrackRow; return ECOTRACK_COLUMNS.map(column => row[column] ?? ''); }); }
function downloadEcotrackCsv(exportable) { const csvCell = value => `"${String(value ?? '').replace(/"/g, '""')}"`; const csv = [ECOTRACK_COLUMNS, ...workbookRows(exportable)].map(row => row.map(csvCell).join(',')).join('\r\n'); const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type:'text/csv;charset=utf-8' })); link.download = `upload_ecotrack_v31-${new Date().toISOString().slice(0,10)}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000); }
function makeSheetRows(rows, start = 2) { return rows.map((values, rowIndex) => { const number = start + rowIndex; return `<row r="${number}" spans="1:18" ht="15.75" customHeight="1" x14ac:dyDescent="0.2">${values.map((value, index) => { const reference = String.fromCharCode(65 + index) + number; const numeric = index === 4 || index === 9 || index === 10; return numeric ? `<c r="${reference}" s="4" t="n"><v>${Number(value) || 0}</v></c>` : `<c r="${reference}" s="4" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`; }).join('')}</row>`; }).join(''); }
async function exportOrders() {
  const visible = filteredOrders().filter(order => order.status === 'confirmed' && order.ecotrackRow);
  const exportable = selectedOrderRefs.size ? visible.filter(order => selectedOrderRefs.has(order.reference)) : visible;
  if (!exportable.length) return alert(selectedOrderRefs.size ? 'لا توجد طلبات محددة جاهزة للتصدير ضمن نطاق التاريخ.' : 'لا توجد طلبات Ecotrack جاهزة للتصدير ضمن نطاق التاريخ.');
  try {
    let templateBuffer;
    if (window.GHAZAL_ECOTRACK_TEMPLATE_BASE64) {
      const binary = atob(window.GHAZAL_ECOTRACK_TEMPLATE_BASE64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      templateBuffer = bytes.buffer;
    } else {
      const response = await fetch(TEMPLATE_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error('template');
      templateBuffer = await response.arrayBuffer();
    }
    const entries = parseZip(templateBuffer); const sheetEntry = entries.find(entry => entry.name === 'xl/worksheets/sheet1.xml'); if (!sheetEntry) throw new Error('sheet');
    const sheetXml = new TextDecoder().decode(await inflateZip(sheetEntry.data, sheetEntry.method)); const rowXml = makeSheetRows(workbookRows(exportable)); const sheetDataStart = sheetXml.indexOf('<sheetData'); const firstRowEnd = sheetXml.indexOf('</row>', sheetDataStart); const sheetDataEnd = sheetXml.indexOf('</sheetData>'); if (sheetDataStart < 0 || firstRowEnd < 0 || sheetDataEnd < 0) throw new Error('sheetData');
    const endOfHeader = firstRowEnd + '</row>'.length; const updatedXml = sheetXml.slice(0, endOfHeader) + rowXml + sheetXml.slice(sheetDataEnd); const updatedSheet = new TextEncoder().encode(updatedXml); const compressed = await deflateZip(updatedSheet); sheetEntry.method = 8; sheetEntry.data = compressed; sheetEntry.crc = crc32(updatedSheet); sheetEntry.uncompressedSize = updatedSheet.length;
    const workbook = zipBytes(entries); const filename = `upload_ecotrack_v31-${new Date().toISOString().slice(0,10)}.xlsx`; if (window.GhazalAPI && sessionStorage.getItem(ADMIN_SESSION_KEY)) { const fingerprint = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(exportable.map(order => order.reference).sort().join('|'))).then(bytes => [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('')); try { await window.GhazalAPI.recordExport(sessionStorage.getItem(ADMIN_SESSION_KEY), fingerprint, exportable.map(order => order.reference), filename); } catch (error) { if (!String(error.message).includes('duplicate_export')) throw error; return alert('هذه الطلبات سبق تصديرها بهذا النطاق.'); } } const link = document.createElement('a'); link.href = URL.createObjectURL(workbook); link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  } catch (error) { console.error('ecotrack_xlsx_export_failed', error); downloadEcotrackCsv(exportable); alert('تم تجهيز ملف Ecotrack بصيغة CSV البديلة. يمكنك رفعه إلى شركة الشحن.'); }
}
$('#owner-export').addEventListener('click', exportOrders);
$('#owner-list').addEventListener('click', event => {
  const ownerForm = event.target.closest('[data-owner-form]');
  if (ownerForm) { openForm(ownerForm.dataset.ownerForm); return; }
  const editPublisher = event.target.closest('[data-edit-publisher]');
  if (editPublisher) { openForm('publisher', editPublisher.dataset.editPublisher); return; }
  if (event.target.closest('[data-book-cover-filter],[data-cover-filter-books]')) { bookCoverFilter = 'default'; ownerTab = 'books'; bookPage = 1; $$('.admin-tabs button').forEach(item => item.classList.toggle('active', item.dataset.ownerTab === 'books')); renderWorkspaceImmediately(); renderOwner(); return; }
  if (event.target.closest('[data-retry-workspace]')) { renderOwner(); return; }
  const saveUser = event.target.closest('[data-save-user]');
  if (saveUser) { const card = saveUser.closest('[data-user-id]'); const permissions = Object.fromEntries([...card.querySelectorAll('[data-user-permission]')].map(input => [input.dataset.userPermission, input.checked])); const role = card.querySelector('[data-user-role]')?.value || 'admin'; window.GhazalAPI.updateStaff(sessionStorage.getItem(ADMIN_SESSION_KEY), card.dataset.userId, { role, permissions }).then(() => { alert('تم حفظ صلاحيات المستخدم.'); renderTeamWorkspace(); }).catch(error => alert(`تعذر حفظ الصلاحيات: ${error.message || 'خطأ غير معروف'}`)); return; }
  const removeStaff = event.target.closest('[data-remove-staff]');
  if (removeStaff) { if (!window.confirm('إزالة وصول هذا الموظف؟ ستُلغى جلساته فورًا.')) return; window.GhazalAPI.deleteStaff(sessionStorage.getItem(ADMIN_SESSION_KEY), removeStaff.dataset.removeStaff).then(() => renderOwner()).catch(() => alert('تعذر إزالة الموظف.')); return; }
  const movePublisher = event.target.closest('[data-move-publisher]');
  if (movePublisher) { const source = movePublisher.dataset.movePublisher; const target = $('#owner-list').querySelector(`[data-publisher-target="${CSS.escape(source)}"]`)?.value; if (!target) return alert('اختر دار النشر البديلة أولًا.'); const count = books.filter(book => book.publisher === source).length; if (!count) return alert('لا توجد كتب لنقلها.'); if (!window.confirm(`نقل ${count} كتب من «${source}» إلى «${target}»؟`)) return; books = books.map(book => book.publisher === source ? { ...book, publisher: target } : book); save('ghazal.customBooks.v1', books); flushCatalogSync().then(() => renderOwner()).catch(() => alert('تعذر مزامنة النقل مع الخادم.')); return; }
  const deletePublisher = event.target.closest('[data-delete-publisher]');
  if (deletePublisher) { const name = deletePublisher.dataset.deletePublisher; const used = books.filter(book => book.publisher === name).length; if (used) return alert(`لا يمكن حذف «${name}»؛ انقل كتبه إلى دار أخرى أولًا.`); if (!window.confirm(`حذف دار النشر «${name}»؟`)) return; publishers = publishers.filter(item => item.name !== name); publisherFeatures = publisherFeatures.filter(item => item.publisher !== name); save('ghazal.customPublishers.v1', publishers); save('ghazal.publisherFeatures.v1', publisherFeatures); flushCatalogSync().then(() => renderOwner()).catch(() => alert('تعذر مزامنة الحذف مع الخادم.')); return; }
  const removeGenre = event.target.closest('[data-remove-genre]');
  if (removeGenre) {
    const id = removeGenre.dataset.removeGenre; const genre = genres[id];
    if (!genre) return;
    const used = books.filter(book => book.category === id).length;
    if (Object.keys(genres).length <= 1) { alert('يجب الإبقاء على تصنيف واحد على الأقل في المتجر.'); return; }
    let target = ''; if (used) { target = list.querySelector(`[data-category-target="${CSS.escape(id)}"]`)?.value || ''; if (!target) return alert('اختر تصنيفًا بديلًا لنقل الكتب إليه قبل الحذف.'); }
    if (!window.confirm(`حذف التصنيف «${esc(genre.title)}»${used ? ` ونقل ${used} كتب إلى «${esc(genres[target].title)}»` : ''}؟`)) return;
    if (used) { books = books.map(book => book.category === id ? { ...book, category: target } : book); save('ghazal.customBooks.v1', books); }
    const remaining = { ...genres }; delete remaining[id];
    genres = remaining; save('ghazal.genres.v1', genres);
    flushCatalogSync().then(() => renderOwner()).catch(() => alert('تعذر مزامنة الحذف مع الخادم.')); return;
  }
  const removeBookGenre = event.target.closest('[data-remove-book-genre]');
  if (removeBookGenre) {
    const value = removeBookGenre.dataset.removeBookGenre;
    const used = books.filter(book => book.genre === value).length;
    let target = ''; if (used) { target = list.querySelector(`[data-book-genre-target="${CSS.escape(value)}"]`)?.value || ''; if (!target) return alert('اختر نوعًا بديلًا لنقل الكتب إليه قبل الحذف.'); }
    if (!window.confirm(`حذف نوع الكتاب «${esc(value)}»${used ? ` ونقل ${used} كتب إلى «${esc(target)}»` : ''}؟`)) return;
    if (used) { books = books.map(book => book.genre === value ? { ...book, genre: target } : book); save('ghazal.customBooks.v1', books); }
    bookGenres = bookGenres.filter(genre => genre !== value); save('ghazal.bookGenres.v1', bookGenres);
    flushCatalogSync().then(() => renderOwner()).catch(() => alert('تعذر مزامنة الحذف مع الخادم.')); return;
  }
  const confirmOrder = event.target.closest('[data-order-confirm]');
  if (confirmOrder) { const reference = confirmOrder.dataset.orderConfirm; confirmOrder.disabled = true; window.GhazalAPI.updateOrder(sessionStorage.getItem(ADMIN_SESSION_KEY), reference, 'confirmed').then(() => { const order = orders.find(item => item.reference === reference); if (order) order.status = 'confirmed'; renderOwner(); }).catch(error => { confirmOrder.disabled = false; alert(orderUpdateErrorMessage(error)); }); return; }
  const unconfirmOrder = event.target.closest('[data-order-unconfirm]');
  if (unconfirmOrder) { const reference = unconfirmOrder.dataset.orderUnconfirm; unconfirmOrder.disabled = true; window.GhazalAPI.updateOrder(sessionStorage.getItem(ADMIN_SESSION_KEY), reference, 'cancelled').then(() => { const order = orders.find(item => item.reference === reference); if (order) order.status = 'cancelled'; renderOwner(); }).catch(error => { unconfirmOrder.disabled = false; alert(orderUpdateErrorMessage(error)); }); return; }
  const receipt = event.target.closest('[data-order-receipt]');
  if (receipt) { const order = orders.find(item => item.reference === receipt.dataset.orderReceipt); if (order) downloadOrderReceipt(order); return; }
  const collectionToggle = event.target.closest('[data-toggle-collection]');
  if (collectionToggle) { const id = collectionToggle.dataset.toggleCollection; const collection = collections.find(item => item.id === id); if (!collection) return; const active = !collection.active; window.GhazalAPI.updateCollection(sessionStorage.getItem(ADMIN_SESSION_KEY), id, { active }).then(result => { collections = collections.map(item => item.id === id ? (result.collection || { ...item, active }) : item); save('ghazal.collections.v1', collections); renderOwner(); }).catch(error => alert(collectionErrorMessage(error))); return; }
  const deleteCollection = event.target.closest('[data-delete-collection]');
  if (deleteCollection) { const id = deleteCollection.dataset.deleteCollection; const collection = collections.find(item => item.id === id); if (!collection || !window.confirm(`حذف مجموعة «${collection.title}» نهائيًا؟ لن يمكن التراجع عن ذلك.`)) return; deleteCollection.disabled = true; window.GhazalAPI.deleteCollection(sessionStorage.getItem(ADMIN_SESSION_KEY), id).then(() => { collections = collections.filter(item => item.id !== id); save('ghazal.collections.v1', collections); renderOwner(); }).catch(error => { deleteCollection.disabled = false; alert(collectionErrorMessage(error)); }); return; }
  const editHomeSection = event.target.closest('[data-edit-home-section]');
  if (editHomeSection) { openForm('home-section', editHomeSection.dataset.editHomeSection); return; }
  const toggleHomeSection = event.target.closest('[data-toggle-home-section]');
  if (toggleHomeSection) { const id = toggleHomeSection.dataset.toggleHomeSection; homeSections = homeSections.map(section => section.id === id ? { ...section, active: section.active === false } : section); persistHomeSections(); return; }
  const deleteHomeSection = event.target.closest('[data-delete-home-section]');
  if (deleteHomeSection) { const id = deleteHomeSection.dataset.deleteHomeSection; const section = homeSections.find(item => item.id === id); if (!section || !window.confirm(`حذف قسم «${section.title}» نهائيًا؟`)) return; homeSections = homeSections.filter(item => item.id !== id); persistHomeSections(); return; }
  const moveHomeSection = event.target.closest('[data-home-section-up],[data-home-section-down]');
  if (moveHomeSection) { const id = moveHomeSection.dataset.homeSectionUp || moveHomeSection.dataset.homeSectionDown; const index = homeSections.findIndex(section => section.id === id); const target = index + (moveHomeSection.dataset.homeSectionUp ? -1 : 1); if (index < 0 || target < 0 || target >= homeSections.length) return; const next = [...homeSections]; [next[index], next[target]] = [next[target], next[index]]; homeSections = next; persistHomeSections(); return; }
  const toggleDiscount = event.target.closest('[data-toggle-discount]');
  if (toggleDiscount) { const id = toggleDiscount.dataset.toggleDiscount; discounts = discounts.map(discount => discount.id === id ? { ...discount, active: discount.active === false } : discount); save('ghazal.discounts.v1', discounts); renderOwner(); return; }
  const editBook = event.target.closest('[data-edit-book]');
  if (editBook) { openForm('book', editBook.dataset.editBook); return; }
  if (event.target.closest('[data-open-bulk-books]')) { openBulkBooks(); return; }
  if (event.target.closest('[data-undo-import]')) { undoLastImport(); return; }
  if (event.target.closest('[data-delete-book]')) { deleteBook(event.target.closest('[data-delete-book]').dataset.deleteBook); return; }
  if (event.target.closest('[data-books-page]')) { const page = Number(event.target.closest('[data-books-page]').dataset.booksPage); if (Number.isInteger(page) && page > 0) { bookPage = page; renderBooksWorkspace(); } return; }
  const toggle = event.target.closest('[data-order-toggle]');
  if (toggle) { const reference = toggle.dataset.orderToggle; expandedOrderRefs.has(reference) ? expandedOrderRefs.delete(reference) : expandedOrderRefs.add(reference); renderOwner(); return; }
  const remove = event.target.closest('[data-order-delete]');
  if (remove) { deleteOrder(remove.dataset.orderDelete); return; }
  if (event.target.closest('[data-order-delete-selected]')) { deleteSelectedOrders(); return; }
  if (event.target.closest('[data-order-clear-filter]')) { orderStartDate = ''; orderEndDate = ''; renderOwner(); return; }
  if (event.target.closest('[data-order-select-visible]')) { const visible = filteredOrders(); const allSelected = visible.length > 0 && visible.every(order => selectedOrderRefs.has(order.reference)); visible.forEach(order => allSelected ? selectedOrderRefs.delete(order.reference) : selectedOrderRefs.add(order.reference)); renderOwner(); return; }
  if (event.target.closest('[data-order-clear-selection]')) { selectedOrderRefs.clear(); renderOwner(); }
  if (event.target.closest('[data-order-export]')) { exportOrders(); }
});
$('#owner-list').addEventListener('change', event => {
  if (event.target.matches('[data-order-wilaya]')) { const code=event.target.value; const select=event.target.closest('.order-details').querySelector('[data-order-commune]'); select.innerHTML=orderCommunes.filter(c=>c.wilaya_code===code).map(c=>`<option value="${c.id}">${esc(c.commune_name)} — ${esc(c.commune_name_ascii)}</option>`).join(''); enhanceOwnerSelect(select); return; }
  if (event.target.id === 'history-filter-employee') { historyEmployeeFilter = event.target.value; renderHistoryWorkspace(); return; }
  if (event.target.id === 'owner-book-search') { bookQuery = event.target.value; bookPage = 1; renderBooksWorkspace(); return; }
  if (event.target.id === 'owner-book-stock') { bookStockFilter = event.target.value; bookPage = 1; renderBooksWorkspace(); return; }
  if (event.target.id === 'owner-book-cover') { bookCoverFilter = event.target.value; bookPage = 1; renderBooksWorkspace(); return; }
  if (event.target.id === 'owner-book-category') { bookCategoryFilter = event.target.value; bookPage = 1; renderBooksWorkspace(); return; }
  if (event.target.id === 'owner-book-genre') { bookGenreFilter = event.target.value; bookPage = 1; renderBooksWorkspace(); return; }
  if (event.target.id === 'owner-book-page-size') { bookPageSize = Number(event.target.value) || 10; bookPage = 1; renderBooksWorkspace(); return; }
  if (event.target.matches('[data-order-select]')) { const reference = event.target.dataset.orderSelect; event.target.checked ? selectedOrderRefs.add(reference) : selectedOrderRefs.delete(reference); renderOrderWorkspace(); }
  if (event.target.matches('[data-order-status]')) { const reference = event.target.dataset.orderStatus; const status = event.target.value; event.target.disabled = true; window.GhazalAPI.updateOrder(sessionStorage.getItem(ADMIN_SESSION_KEY), reference, status).then(() => renderOwner()).catch(error => { event.target.disabled = false; alert(orderUpdateErrorMessage(error)); }); }
  if (event.target.id === 'order-start-date') { orderStartDate = event.target.value; renderOrderWorkspace(); }
  if (event.target.id === 'order-end-date') { orderEndDate = event.target.value; renderOrderWorkspace(); }
});
$('#owner-app').addEventListener('input', event => {
  if (event.target.id === 'owner-book-search') { bookQuery = event.target.value; bookPage = 1; renderBooksWorkspace(); const search = $('#owner-book-search'); if (search) { search.focus(); search.setSelectionRange(search.value.length, search.value.length); } }
});
$('#owner-stats-scope').addEventListener('change', event => { statsScope = event.target.value; updateOwnerStats(); renderStoreInsights(); });
$('#owner-stats-period').addEventListener('change', event => { statsPeriod = event.target.value; if (statsPeriod !== 'custom') { statsStartDate = ''; statsEndDate = ''; } updateOwnerStats(); });
$('#owner-stats-start').addEventListener('change', event => { statsPeriod = 'custom'; statsStartDate = event.target.value; updateOwnerStats(); });
$('#owner-stats-end').addEventListener('change', event => { statsPeriod = 'custom'; statsEndDate = event.target.value; updateOwnerStats(); });
window.addEventListener('storage', event => { if (event.key === 'ghazal.demoOrders.v1' || event.key === 'ghazal.customBooks.v1' || event.key === 'ghazal.customPublishers.v1' || event.key === 'ghazal.featuredBooks.v1') renderOwner(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) renderOwner(); });
