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
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
let catalogSyncTimer;
function catalogPayloadForSync() { return { books, publishers, genres, bookGenres, discounts, featured: featuredBookIds, authorProfiles, publisherFeatures }; }
function queueCatalogSync() { clearTimeout(catalogSyncTimer); catalogSyncTimer = setTimeout(async () => { const token = sessionStorage.getItem(ADMIN_SESSION_KEY); if (!token || !window.GhazalAPI?.saveCatalog) return; try { await window.GhazalAPI.saveCatalog(token, catalogPayloadForSync()); } catch (error) { console.error('catalog_sync_failed', error); } }, 150); }
async function flushCatalogSync() { clearTimeout(catalogSyncTimer); const token = sessionStorage.getItem(ADMIN_SESSION_KEY); if (!token || !window.GhazalAPI?.saveCatalog) return; try { await window.GhazalAPI.saveCatalog(token, catalogPayloadForSync()); } catch (error) { console.error('catalog_sync_failed', error); throw error; } }
const catalogStorageKeys = ['ghazal.customBooks.v1','ghazal.customPublishers.v1','ghazal.genres.v1','ghazal.bookGenres.v1','ghazal.discounts.v1','ghazal.featuredBooks.v1','ghazal.authorProfiles.v1'];
const save = (key, value) => { if (location.protocol === 'file:' || !catalogStorageKeys.includes(key)) localStorage.setItem(key, JSON.stringify(value)); if (catalogStorageKeys.includes(key)) queueCatalogSync(); };
const money = value => `${new Intl.NumberFormat('ar-DZ-u-nu-latn').format(value)} د.ج`;
const normalizeArabicSearch = value => String(value ?? '').normalize('NFKD').replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآ]/g, 'ا').toLocaleLowerCase('ar').trim();
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const baseBooks = [
  ['stranger','الغريب','ألبير كامو','منشورات الجمل',1900],['world-yesterday','عالم الأمس','شتيفان تسفايغ','دار المدى',2600],['meaning','الإنسان يبحث عن معنى','فيكتور فرانكل','آكيول',2200],['orientalism','الاستشراق','إدوارد سعيد','دار الآداب',3900],['meditations','التأملات','ماركوس أوريليوس','طبعة عربية',2100],['solitude','مئة عام من العزلة','غابرييل غارسيا ماركيز','دار التنوير',3200],['letters','رسائل إلى شاعر شاب','راينر ماريا ريلكه','دار الكرمة',1500],['sophies-world','عالم صوفي','جوستاين غاردر','دار المنى',3600],['plague','الطاعون','ألبير كامو','دار التنوير',2400],['name-of-rose','اسم الوردة','أمبرتو إيكو','دار الكتاب الجديد',3200],['art-of-loving','فن الحب','إريك فروم','طبعة عربية',1800],['brief-time','تاريخ موجز للزمان','ستيفن هوكينغ','دار التنوير',2900]
].map(([id,title,author,publisher,price]) => ({id,title,author,publisher,price}));
const customBooks = read('ghazal.customBooks.v1', []);
const bookOverrides = new Map(customBooks.map(book => [book.id, book]));
let books = baseBooks.map(book => ({ ...book, ...(bookOverrides.get(book.id) || {}) }));
customBooks.filter(book => !books.some(existing => existing.id === book.id)).forEach(book => books.push(book));
const defaultCovers = { stranger:'stranger.jpg', 'world-yesterday':'world-yesterday.jpg', meaning:'meaning.jpg', orientalism:'orientalism.jpg', meditations:'meditations.jpg', solitude:'solitude.jpg', letters:'letters.jpg', 'sophies-world':'sophies-world.jpg', plague:'plague.jpg', 'name-of-rose':'name-of-rose.jpg', 'art-of-loving':'art-of-loving.jpg', 'brief-time':'brief-time.jpg' };
books.forEach(book => { if (!book.image) book.image = defaultCovers[book.id] || 'meaning.jpg'; });
books.forEach(book => { if (!Number.isFinite(Number(book.stock))) book.stock = 10; });
const defaultFeaturedBooks = ['meaning', 'letters', 'orientalism', 'meditations'];
let featuredBookIds = read('ghazal.featuredBooks.v1', defaultFeaturedBooks);
let publisherFeatures = read('ghazal.publisherFeatures.v1', [
  { id:'mada', publisher:'دار المدى', active:true, layoutVersion:3, slogan:'بيت الثقافة والإبداع', kicker:'أدبٌ وفكرٌ وفنون', description:'رفّ من الكتب التي تصنع ذائقة، وتترك أثرًا أبعد من الصفحة الأخيرة.', accent:'#e51c2a', surface:'#f4d8c8', ink:'#251b19', mark:'م' },
  { id:'jamal', publisher:'منشورات الجمل', active:true, slogan:'أصواتٌ من العالم', kicker:'أصواتٌ لا تشبه سواها', description:'دار عريقة في الترجمة الأدبية والفلسفية، وكتب تمنح القارئ فرصة الإصغاء إلى أصوات مختلفة.', accent:'#bd1d2d', surface:'#e9d8b9', ink:'#271914', mark:'ج' },
  { id:'arab-network', publisher:'الشبكة العربية للأبحاث والنشر', active:true, slogan:'بوابتك نحو عالم المعرفة', kicker:'معرفةٌ عربيةٌ رصينة', description:'كتب الفكر والتاريخ والسياسة التي تمنح السؤال العربي مساحة أوسع.', accent:'#2e579a', surface:'#dbe8ef', ink:'#18243b', mark:'ش' },
  { id:'rafidain', publisher:'دار الرافدين', active:true, slogan:'من وادي الرافدين بدأت الكتابة والمدنية', kicker:'للكتاب العربي الجميل', description:'إصدارات تحمل حيوية المكتبة العربية، بين التراث والقراءة المعاصرة.', accent:'#20205e', surface:'#e5e1ee', ink:'#171735', mark:'ر' }
]);
const defaultPublishers = ['دار الآداب','دار التنوير','دار المدى','منشورات الجمل','الشبكة العربية للأبحاث والنشر','دار الرافدين','دار الكرمة'].map((name, index) => ({ id:`default-${index}`, name, city:'الجزائر', logo:name.slice(0,1) }));
let publishers = [...defaultPublishers, ...read('ghazal.customPublishers.v1', [])];
let authorProfiles = read('ghazal.authorProfiles.v1', {});
let genres = { literature:{title:'الأدب العالمي',description:'حكايات تعبر الحدود.'}, thought:{title:'الفكر والفلسفة',description:'أسئلة توسّع الأفق.'}, history:{title:'التاريخ والإنسانيات',description:'لفهم ما كان وما يكون.'}, ...read('ghazal.genres.v1', {}) };
const predefinedBookGenres = ['الأدب العربي','الأدب العالمي','الرواية','القصص القصيرة','الشعر','المسرح','الفلسفة','علم النفس','علم الاجتماع','السياسة','التاريخ','السيرة الذاتية','الاقتصاد','العلوم','الفنون','التربية','التنمية الذاتية','الدين والفكر الإسلامي','أدب الأطفال','الرحلات'];
const genreMatches = (book, selected) => selected === 'all' || normalizeArabicSearch(book.genre).includes(normalizeArabicSearch(selected));
let bookGenres = [...new Set([...predefinedBookGenres, ...read('ghazal.bookGenres.v1', []), ...books.map(book => book.genre).filter(Boolean)])].sort((a,b) => a.localeCompare(b, 'ar'));
let collections = read('ghazal.collections.v1', [
  { id:'collection-literature', slug:'rwayat-wa-adab', title:'روايات وأدب', description:'حكايات تبقى معك بعد الصفحة الأخيرة.', bookIds:books.filter(book => book.category === 'literature').map(book => book.id), active:true, homepage:true },
  { id:'collection-thought', slug:'falsafa-wa-fikr', title:'فلسفة وفكر', description:'أسئلة توسّع الأفق وتعيد ترتيب الداخل.', bookIds:books.filter(book => book.category === 'thought').map(book => book.id), active:true, homepage:true },
  { id:'collection-publishers', slug:'ikhtiyarat-al-nashirin', title:'اختيارات من دور النشر', description:'كتب مختارة من ناشرين نحب مشروعهم.', bookIds:books.slice(0, 8).map(book => book.id), active:true, homepage:true }
]);
let orders = read('ghazal.demoOrders.v1', []);
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
function applyAdminCatalog(payload) {
  if (!payload?.books?.length) return;
  books = payload.books.map(book => ({ ...book, image: book.image || 'meaning.jpg', stock: Number(book.stock ?? 0) }));
  publishers = payload.publishers?.length ? [...publishers.filter(local => !payload.publishers.some(remote => remote.name === local.name)), ...payload.publishers] : publishers;
  genres = payload.genres || genres;
  bookGenres = [...new Set([...(payload.bookGenres || []), ...books.map(book => book.genre).filter(Boolean)])].sort((a,b) => a.localeCompare(b, 'ar'));
  discounts = payload.discounts || [];
  featuredBookIds = payload.featuredBookIds || featuredBookIds;
  publisherFeatures = payload.publisherFeatures || publisherFeatures;
  authorProfiles = payload.authorProfiles || authorProfiles;
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
  if (tabs && !tabs.querySelector('[data-owner-tab="genres"]')) {
    const genreTab = document.createElement('button'); genreTab.type = 'button'; genreTab.dataset.ownerTab = 'genres'; genreTab.textContent = 'التصنيفات'; tabs.insertBefore(genreTab, tabs.querySelector('[data-owner-tab="orders"]'));
    genreTab.addEventListener('click', () => { ownerTab = 'genres'; $$('.admin-tabs button').forEach(item => item.classList.toggle('active', item === genreTab)); renderOwner(); });
  }
  if (tabs && !tabs.querySelector('[data-owner-tab="book-genres"]')) { const bookGenreTab = document.createElement('button'); bookGenreTab.type = 'button'; bookGenreTab.dataset.ownerTab = 'book-genres'; bookGenreTab.textContent = 'أنواع الكتب'; tabs.insertBefore(bookGenreTab, tabs.querySelector('[data-owner-tab="orders"]')); bookGenreTab.addEventListener('click', () => { ownerTab = 'book-genres'; $$('.admin-tabs button').forEach(item => item.classList.toggle('active', item === bookGenreTab)); renderOwner(); }); }
  if (tabs && !tabs.querySelector('[data-owner-tab="discounts"]')) { const discountTab = document.createElement('button'); discountTab.type = 'button'; discountTab.dataset.ownerTab = 'discounts'; discountTab.textContent = 'الخصومات'; tabs.insertBefore(discountTab, tabs.querySelector('[data-owner-tab="orders"]')); discountTab.addEventListener('click', () => { ownerTab = 'discounts'; $$('.admin-tabs button').forEach(item => item.classList.toggle('active', item === discountTab)); renderOwner(); }); }
  if (tabs && !tabs.querySelector('[data-owner-tab="featured"]')) { const featuredTab = document.createElement('button'); featuredTab.type = 'button'; featuredTab.dataset.ownerTab = 'featured'; featuredTab.textContent = 'المختارات'; tabs.insertBefore(featuredTab, tabs.querySelector('[data-owner-tab="orders"]')); featuredTab.addEventListener('click', () => { ownerTab = 'featured'; $$('.admin-tabs button').forEach(item => item.classList.toggle('active', item === featuredTab)); renderOwner(); }); }
  if (tabs && !tabs.querySelector('[data-owner-tab="publisher-features"]')) { const publisherTab = document.createElement('button'); publisherTab.type = 'button'; publisherTab.dataset.ownerTab = 'publisher-features'; publisherTab.textContent = 'واجهات دور النشر'; tabs.insertBefore(publisherTab, tabs.querySelector('[data-owner-tab="orders"]')); publisherTab.addEventListener('click', () => { ownerTab = 'publisher-features'; $$('.admin-tabs button').forEach(item => item.classList.toggle('active', item === publisherTab)); renderOwner(); }); }
  if (tabs && !tabs.querySelector('[data-owner-tab="unavailable"]')) { const unavailableTab = document.createElement('button'); unavailableTab.type = 'button'; unavailableTab.dataset.ownerTab = 'unavailable'; unavailableTab.textContent = 'غير متوفرة'; tabs.insertBefore(unavailableTab, tabs.querySelector('[data-owner-tab="orders"]')); unavailableTab.addEventListener('click', () => { ownerTab = 'unavailable'; $$('.admin-tabs button').forEach(item => item.classList.toggle('active', item === unavailableTab)); renderOwner(); }); }
  if (tabs && !tabs.querySelector('[data-owner-tab="collections"]')) { const collectionTab = document.createElement('button'); collectionTab.type = 'button'; collectionTab.dataset.ownerTab = 'collections'; collectionTab.textContent = 'المجموعات'; tabs.insertBefore(collectionTab, tabs.querySelector('[data-owner-tab="orders"]')); collectionTab.addEventListener('click', () => { ownerTab = 'collections'; $$('.admin-tabs button').forEach(item => item.classList.toggle('active', item === collectionTab)); renderOwner(); }); }
  if (tabs && document.body.dataset.role === 'owner' && !tabs.querySelector('[data-owner-tab="team"]')) { const teamTab = document.createElement('button'); teamTab.type = 'button'; teamTab.dataset.ownerTab = 'team'; teamTab.textContent = 'الفريق'; tabs.appendChild(teamTab); teamTab.addEventListener('click', () => { ownerTab = 'team'; $$('.admin-tabs button').forEach(item => item.classList.toggle('active', item === teamTab)); renderOwner(); }); }
  if (tabs && document.body.dataset.role === 'owner' && !tabs.querySelector('[data-owner-tab="history"]')) { const historyTab = document.createElement('button'); historyTab.type = 'button'; historyTab.dataset.ownerTab = 'history'; historyTab.textContent = 'سجل النشاط'; tabs.appendChild(historyTab); historyTab.addEventListener('click', () => { ownerTab = 'history'; $$('.admin-tabs button').forEach(item => item.classList.toggle('active', item === historyTab)); renderOwner(); }); }
  if (actions && !actions.querySelector('[data-owner-form="collection"]')) { const button = document.createElement('button'); button.className = 'button button-outline'; button.type = 'button'; button.dataset.ownerForm = 'collection'; button.textContent = 'إنشاء مجموعة'; actions.appendChild(button); button.addEventListener('click', () => openForm('collection')); }
  if (actions && !actions.querySelector('[data-owner-form="tracking"]')) { const button = document.createElement('button'); button.className = 'text-button'; button.type = 'button'; button.dataset.ownerForm = 'tracking'; button.textContent = 'إعدادات التتبع'; actions.appendChild(button); button.addEventListener('click', () => openForm('tracking')); }
  if (actions && !actions.querySelector('[data-owner-form="staff"]')) { const button = document.createElement('button'); button.className = 'text-button'; button.type = 'button'; button.dataset.ownerForm = 'staff'; button.textContent = 'إضافة موظف خدمة'; actions.appendChild(button); button.addEventListener('click', () => openForm('staff')); }
  $$('[data-owner-form="tracking"],[data-owner-form="staff"]').forEach(item => { item.hidden = document.body.dataset.role !== 'owner'; });
  if (!$('#owner-extra-panels')) {
    $('#owner-app').insertAdjacentHTML('beforeend', `<section class="owner-dashboard-lower" id="owner-extra-panels"><article class="dashboard-card"><div class="card-heading"><div><p class="eyebrow">آخر الحركة</p><h2>أحدث <em>الطلبات</em></h2></div><button class="text-button" id="owner-see-orders" type="button">كل الطلبات ↙</button></div><div id="owner-recent-orders" class="owner-recent-orders"></div></article><article class="dashboard-card"><div class="card-heading"><div><p class="eyebrow">إشارات المتجر</p><h2>ما يحتاج <em>انتباهك</em></h2></div></div><div id="owner-store-insights" class="owner-store-insights"></div></article></section>`);
    $('#owner-see-orders').addEventListener('click', () => { ownerTab = 'orders'; $$('.admin-tabs button').forEach(item => item.classList.toggle('active', item.dataset.ownerTab === 'orders')); renderOwner(); });
  }
}
function renderRecentOrders() {
  const target = $('#owner-recent-orders'); if (!target) return;
  target.innerHTML = orders.length ? orders.slice(0, 5).map(order => `<button class="owner-recent-order" type="button" data-owner-tab="orders"><span class="admin-avatar">↙</span><span><strong>${esc(order.reference)}</strong><small>${esc(order.customer?.customer || '')} · ${esc(order.customer?.wilaya || '')} · ${order.items?.length || 0} عناوين</small></span><b>${money(order.total || 0)}</b></button>`).join('') : '<p class="owner-note">ستظهر الطلبات المؤكدة هنا.</p>';
  $$('#owner-recent-orders [data-owner-tab]').forEach(button => button.addEventListener('click', () => { ownerTab = 'orders'; $$('.admin-tabs button').forEach(item => item.classList.toggle('active', item.dataset.ownerTab === 'orders')); renderOwner(); }));
}
function renderStoreInsights() {
  const target = $('#owner-store-insights'); if (!target) return;
  const lowStock = analytics.lowStock || []; const best = (statsScope === 'all' ? (analytics.allBooksSold || analytics.booksSold) : analytics.booksSold || []).slice(0, 3); const scopeLabel = statsScope === 'all' ? 'كل الطلبات غير الملغاة' : 'الطلبات المؤكدة فقط';
  target.innerHTML = `<div class="store-insight-block"><strong>${lowStock.length}</strong><span>${lowStock.length === 1 ? 'كتاب يحتاج إعادة تخزين' : 'كتب تحتاج إعادة تخزين'}</span>${lowStock.slice(0, 3).map(book => `<small>${esc(book.title)} · ${Number(book.available)} متاح</small>`).join('') || '<small>المخزون في وضع جيد.</small>'}</div><div class="store-insight-block"><strong>الأكثر طلبًا</strong><small>${scopeLabel}</small>${best.map((book, index) => `<small>${index + 1}. ${esc(book.title)} · ${Number(book.quantity)} نسخة</small>`).join('') || '<small>ستظهر البيانات بعد أولى الطلبات.</small>'}</div>`;
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
function orderBook(item) { return books.find(book => book.id === item.id) || { title: item.title || 'كتاب غير معروف', author: '', publisher: '', price: item.price || 0, image: 'meaning.jpg' }; }
function orderDetails(order) {
  const customer = order.customer || {};
  const shipment = order.shipping || {};
  const fields = [
    ['الاسم واللقب', customer.customer], ['الهاتف', customer.phone],
    ['الولاية', `${customer.wilaya || '—'} (${customer.wilayaCode ?? '—'})`], ['البلدية', customer.communeArabic || customer.commune || customer.city || '—'],
    ['نوع الشحن', customer.shipmentType === 'office' ? 'استلام من المكتب' : 'إيصال للمنزل'], ['سعر الشحن', money(shipment.price ?? order.delivery ?? 0)],
    ['تاريخ الطلب', order.placedAt ? new Date(order.placedAt).toLocaleString('ar-DZ') : '—']
  ];
  return `<div class="order-details"><label class="order-status-field">حالة الطلب<select data-order-status="${esc(order.reference)}"><option value="new" ${order.status === 'new' ? 'selected' : ''}>جديد</option><option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>مؤكد</option><option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>قيد التحضير</option><option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>تم الشحن</option><option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>تم التسليم</option><option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>ملغى</option><option value="returned" ${order.status === 'returned' ? 'selected' : ''}>مرتجع</option></select></label><div class="order-detail-grid">${fields.map(([label, value]) => `<div><span>${label}</span><strong>${typeof value === 'string' && value.includes('<a ') ? value : esc(value)}</strong></div>`).join('')}</div><div class="order-books"><h4>الكتب المطلوبة</h4>${(order.items || []).map(item => { const book = orderBook(item); return `<div class="order-book-line"><img src="${book.image?.startsWith('data:') ? book.image : `assets/covers/${book.image || 'meaning.jpg'}`}" alt="" /><span><strong>${esc(book.title)}</strong><small>${esc(book.author)} · ${esc(book.publisher)} · ${money(book.price)} × ${Number(item.qty || 1)}</small></span><b>${money(book.price * Number(item.qty || 1))}</b></div>`; }).join('') || '<p class="owner-note">لا توجد كتب مرتبطة بهذا الطلب.</p>'}</div><div class="order-total-lines"><span>المجموع قبل الشحن <b>${money(order.subtotal || 0)}</b></span><span>الإجمالي عند الاستلام <b>${money(order.total || 0)}</b></span></div></div>`;
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
  list.innerHTML = `<div class="order-toolbar"><div class="order-date-filters"><label>من <input id="order-start-date" type="date" value="${esc(orderStartDate)}" /></label><label>إلى <input id="order-end-date" type="date" value="${esc(orderEndDate)}" /></label><button class="text-button" type="button" data-order-clear-filter>مسح التاريخ</button></div><div class="order-toolbar-actions"><button class="button button-outline" type="button" data-order-select-visible>${allVisibleSelected ? 'إلغاء تحديد الظاهر' : 'تحديد الظاهر'}</button><button class="button button-dark" type="button" data-order-export>تصدير المحدد</button><button class="text-button" type="button" data-order-clear-selection>إلغاء التحديد</button></div><p class="order-selection-summary">${visible.length} طلب ظاهر · ${selectedOrderRefs.size} محدد<br><small>إن لم تحدد طلبات، سيُصدّر كل ما يطابق التاريخ.</small></p></div><div class="order-list">${visible.length ? visible.map(order => { const open = expandedOrderRefs.has(order.reference); const status = order.status || 'new'; const phone = String(order.customer?.phone || '').trim(); return `<article class="order-card ${open ? 'is-open' : ''}"><div class="order-card-head"><label class="order-check"><input type="checkbox" data-order-select="${esc(order.reference)}" ${selectedOrderRefs.has(order.reference) ? 'checked' : ''} /><span class="sr-only">تحديد ${esc(order.reference)}</span></label><button class="order-main-button" type="button" data-order-toggle="${esc(order.reference)}"><strong>${esc(order.reference)} <span class="order-status-badge status-${esc(status)}">${statusLabels[status] || esc(status)}</span></strong><small>${esc(order.customer?.customer || '')} · ${esc(order.customer?.wilaya || '')} · ${esc(order.customer?.communeArabic || order.customer?.commune || '')}</small></button><a class="order-phone" href="tel:${esc(phone)}" aria-label="اتصل بـ ${esc(phone)}">${esc(phone || 'لا يوجد هاتف')}</a><span class="order-card-total">${money(order.total || 0)}</span><div class="order-quick-actions">${status === 'new' ? `<button class="button button-dark" type="button" data-order-confirm="${esc(order.reference)}">تأكيد</button><button class="button button-outline" type="button" data-order-unconfirm="${esc(order.reference)}">غير مؤكد</button>` : status === 'confirmed' ? `<button class="button button-outline" type="button" data-order-unconfirm="${esc(order.reference)}">غير مؤكد</button>` : ''}</div><button class="order-delete" type="button" data-order-delete="${esc(order.reference)}" aria-label="حذف ${esc(order.reference)}">حذف</button></div>${open ? orderDetails(order) : ''}</article>`; }).join('') : '<p class="owner-note">لا توجد طلبات تطابق هذا النطاق.</p>'}</div>`;
}
let bookGenreFilter = 'all';
function bookMatches(book) {
  const query = normalizeArabicSearch(bookQuery);
  return (!query || normalizeArabicSearch(`${book.title} ${book.author} ${book.publisher}`).includes(query)) && (bookStockFilter === 'all' || (bookStockFilter === 'available' ? Number(book.stock) > 0 : Number(book.stock) <= 0)) && (bookCategoryFilter === 'all' || book.category === bookCategoryFilter) && genreMatches(book, bookGenreFilter);
}
function renderBooksWorkspace() {
  const list = $('#owner-list');
  const filtered = books.filter(bookMatches);
  const totalPages = Math.max(1, Math.ceil(filtered.length / bookPageSize)); bookPage = Math.min(bookPage, totalPages); const start = (bookPage - 1) * bookPageSize; const shown = filtered.slice(start, start + bookPageSize);
  list.innerHTML = `<div class="book-workspace-toolbar"><label class="admin-search"><span>⌕</span><input id="owner-book-search" type="search" value="${esc(bookQuery)}" placeholder="ابحث بالعنوان أو المؤلف أو الناشر" /></label><select id="owner-book-stock"><option value="all" ${bookStockFilter === 'all' ? 'selected' : ''}>كل حالات المخزون</option><option value="available" ${bookStockFilter === 'available' ? 'selected' : ''}>متوفر</option><option value="empty" ${bookStockFilter === 'empty' ? 'selected' : ''}>غير متوفر</option></select><select id="owner-book-category"><option value="all">كل التصنيفات</option>${Object.entries(genres).map(([id, genre]) => `<option value="${esc(id)}" ${bookCategoryFilter === id ? 'selected' : ''}>${esc(genre.title)}</option>`).join('')}</select><select id="owner-book-genre"><option value="all">كل أنواع الكتب</option>${bookGenres.map(genre => `<option value="${esc(genre)}" ${bookGenreFilter === genre ? 'selected' : ''}>${esc(genre)}</option>`).join('')}</select><label class="book-page-size">كتب في الصفحة<select id="owner-book-page-size">${[10,25,50,100].map(size => `<option value="${size}" ${bookPageSize === size ? 'selected' : ''}>${size}</option>`).join('')}</select></label><button class="button button-outline" type="button" data-open-bulk-books>استيراد جماعي</button>${read('ghazal.lastImport.v1', null) ? '<button class="text-button" type="button" data-undo-import>تراجع عن آخر استيراد</button>' : ''}</div><div class="book-workspace-summary"><strong>${filtered.length ? `${start + 1}–${Math.min(start + shown.length, filtered.length)}` : '0'} من ${filtered.length}</strong> كتاب · ${books.length} إجمالًا · ${books.filter(book => Number(book.stock) > 0).length} متوفر</div><div class="book-admin-list">${shown.length ? shown.slice().reverse().map(book => `<article class="book-admin-card"><img src="${book.image?.startsWith('data:') ? book.image : `assets/covers/${book.image || 'meaning.jpg'}`}" alt="غلاف ${esc(book.title)}" /><div class="book-admin-main"><strong>${esc(book.title)}</strong><small>${esc(book.author)} · ${esc(book.publisher)}</small><p>${esc(book.review || book.note || 'لا توجد مراجعة قصيرة بعد.')}</p></div><div class="book-admin-price"><b>${money(book.price)}</b><span class="${Number(book.stock) > 0 ? 'stock-ok' : 'stock-off'}">${Number(book.stock) > 0 ? `${Number(book.stock)} نسخة` : 'غير متوفر'}</span><button class="text-button" type="button" data-edit-book="${esc(book.id)}">تعديل</button><button class="text-button danger-action" type="button" data-delete-book="${esc(book.id)}">حذف</button></div></article>`).join('') : '<p class="owner-note">لا توجد كتب تطابق البحث الحالي.</p>'}</div>${totalPages > 1 ? `<nav class="book-pagination" aria-label="صفحات الكتب"><button class="button button-outline" type="button" data-books-page="${bookPage - 1}" ${bookPage === 1 ? 'disabled' : ''}>السابق</button><span>صفحة ${bookPage} من ${totalPages}</span><button class="button button-outline" type="button" data-books-page="${bookPage + 1}" ${bookPage === totalPages ? 'disabled' : ''}>التالي</button></nav>` : ''}`;
  list.querySelector('.book-workspace-toolbar .admin-search')?.remove();
  const persistentSearch = $('#owner-book-search'); if (persistentSearch) persistentSearch.value = bookQuery;
}
async function deleteBook(bookId) { const book = books.find(item => item.id === bookId); if (!book || !window.confirm(`حذف «${book.title}» نهائيًا؟`)) return; try { await window.GhazalAPI.deleteBook(sessionStorage.getItem(ADMIN_SESSION_KEY), bookId); const current = read('ghazal.customBooks.v1', []); save('ghazal.customBooks.v1', current.filter(item => item.id !== bookId)); alert('تم حذف الكتاب.'); location.reload(); } catch (error) { alert(error.message.includes('book_has_orders') ? 'لا يمكن حذف كتاب مرتبط بطلب. يمكنك جعله غير متوفر بدلًا من ذلك.' : 'تعذر حذف الكتاب.'); } }
async function deleteBook(bookId) { const book = books.find(item => String(item.id) === String(bookId)); if (!book || !window.confirm(`حذف «${book.title}» نهائيًا؟`)) return; try { await window.GhazalAPI.deleteBook(sessionStorage.getItem(ADMIN_SESSION_KEY), bookId); } catch (error) { const code = String(error?.message || ''); if (!code.includes('not_found')) { alert(code.includes('book_has_orders') ? 'لا يمكن حذف كتاب مرتبط بطلبات سابقة. يمكنك جعله غير متوفر بدلًا من حذفه.' : code.includes('permission_denied') || code.includes('owner_only') ? 'حذف الكتب متاح للمالك فقط.' : `تعذر حذف الكتاب: ${code || 'خطأ غير معروف'}`); return; } } const current = read('ghazal.customBooks.v1', []); save('ghazal.customBooks.v1', current.filter(item => String(item.id) !== String(bookId))); books = books.filter(item => String(item.id) !== String(bookId)); alert('تم حذف الكتاب.'); renderBooksWorkspace(); }
function undoLastImport() { const last = read('ghazal.lastImport.v1', null); if (!last) return; if (!window.confirm('التراجع عن آخر استيراد؟')) return; save('ghazal.customBooks.v1', last.before || []); localStorage.removeItem('ghazal.lastImport.v1'); location.reload(); }
function renderDiscountWorkspace() {
  const list = $('#owner-list'); discounts = read('ghazal.discounts.v1', []);
  list.innerHTML = `<div class="discount-workspace-head"><div><strong>${discounts.filter(item => item.active !== false).length} خصم نشط</strong><small>تُعرض الخصومات التلقائية على الكتب، وتحتاج الرموز إلى إدخال العميل.</small></div><button class="button button-dark" type="button" data-owner-form="discount">إضافة خصم</button></div><div class="discount-admin-list">${discounts.length ? discounts.map(discount => `<article class="discount-admin-card"><span class="discount-badge">${discount.type === 'percent' ? `${Number(discount.value)}٪` : money(discount.value)}</span><div><strong>${esc(discount.name || 'خصم')}</strong><small>${discount.code ? `رمز الخصم: ${esc(discount.code)}` : 'خصم تلقائي'} · ${discount.appliesToAll ? 'كل الكتب' : `${(discount.bookIds || []).length} كتب`}</small></div><span class="${discount.active === false ? 'stock-off' : 'stock-ok'}">${discount.active === false ? 'متوقف' : 'نشط'}<button class="text-button discount-toggle" type="button" data-toggle-discount="${esc(discount.id)}">${discount.active === false ? 'تفعيل' : 'إيقاف'}</button></span></article>`).join('') : '<p class="owner-note">لم تضف أي خصومات بعد.</p>'}</div>`;
  list.querySelector('[data-owner-form="discount"]')?.addEventListener('click', () => openForm('discount'));
}
function renderUnavailableWorkspace() {
  const list = $('#owner-list'); const unavailable = books.filter(book => Number(book.stock) <= 0);
  list.innerHTML = `<div class="unavailable-full-head"><p class="eyebrow">المخزون</p><h3>كتب <em>غير متوفرة</em></h3><p>${unavailable.length ? 'هذه الكتب مخفية عن الشراء حتى تعيد تخزينها.' : 'لا توجد كتب ناقصة المخزون حاليًا.'}</p></div><div class="unavailable-full-list">${unavailable.length ? unavailable.map(book => `<article class="unavailable-full-card"><img src="${book.image?.startsWith('data:') ? book.image : `assets/covers/${book.image || 'meaning.jpg'}`}" alt="" /><div><strong>${esc(book.title)}</strong><small>${esc(book.author)} · ${esc(book.publisher)}</small></div><button class="button button-outline" type="button" data-edit-book="${esc(book.id)}">إعادة التخزين / تعديل</button></article>`).join('') : '<div class="empty-stock-state">كل الكتب متوفرة حاليًا.</div>'}</div>`;
}
function renderFeaturedWorkspace() {
  const list = $('#owner-list'); const current = featuredBookIds.map(id => books.find(book => book.id === id)).filter(Boolean);
  list.innerHTML = `<div class="featured-admin-intro"><p class="eyebrow">واجهة المتجر</p><h3>مختارات الغزال</h3><p>هذه هي الكتب الظاهرة في القسم التحريري على الصفحة الرئيسية. رتّب أربعة كتب كما تريد من زر التعديل.</p><button class="button button-dark" type="button" data-owner-form="featured">تعديل المختارات</button></div><div class="featured-admin-list">${current.map((book, index) => `<div class="featured-admin-row"><b>0${index + 1}</b><img src="${book.image?.startsWith('data:') ? book.image : `assets/covers/${book.image || 'meaning.jpg'}`}" alt="" /><span><strong>${esc(book.title)}</strong><small>${esc(book.author)}</small></span><em>${Number(book.stock) > 0 ? 'متوفر' : 'غير متوفر'}</em></div>`).join('')}</div>`;
  list.querySelector('[data-owner-form="featured"]')?.addEventListener('click', () => openForm('featured'));
}
function renderPublisherFeaturesWorkspace() {
  const list = $('#owner-list');
  list.innerHTML = `<div class="featured-admin-intro"><p class="eyebrow">واجهة المتجر</p><h3>واجهات <em>دور النشر</em></h3><p>كل دار لها مساحة كبيرة وهوية لونية مستقلة على الصفحة الرئيسية. أوقف أي واجهة مؤقتًا من المفتاح.</p></div><div class="publisher-feature-admin-list">${publisherFeatures.map(item => { const count = books.filter(book => book.publisher === item.publisher).length; return `<article class="publisher-feature-admin" style="--publisher-accent:${esc(item.accent)}"><span class="publisher-feature-admin-mark">${esc(item.mark || item.publisher.slice(0,1))}</span><div><strong>${esc(item.publisher)}</strong><small>${esc(item.slogan || item.kicker || '')} · ${count} كتب في الفهرس</small></div><label class="toggle-control"><input type="checkbox" data-publisher-feature="${esc(item.id)}" ${item.active !== false ? 'checked' : ''} /><span>تظهر على الرئيسية</span></label></article>`; }).join('')}</div>`;
  list.querySelectorAll('[data-publisher-feature]').forEach(input => input.addEventListener('change', async () => { publisherFeatures = publisherFeatures.map(item => item.id === input.dataset.publisherFeature ? { ...item, active: input.checked } : item); save('ghazal.publisherFeatures.v1', publisherFeatures); try { await flushCatalogSync(); } catch {} }));
}
function featuredBookMatches(query, slot) {
  const chosenElsewhere = new Set([...document.querySelectorAll('#owner-form input[name="featuredOrder"]')].filter(input => input.dataset.slot !== String(slot)).map(input => input.value).filter(Boolean));
  const needle = normalizeArabicSearch(query);
  return books.filter(book => !chosenElsewhere.has(book.id) && (!needle || normalizeArabicSearch(`${book.title} ${book.author} ${book.publisher}`).includes(needle))).slice(0, 8);
}
function renderFeaturedPickerSuggestions(input) {
  const picker = input.closest('.featured-picker'); const menu = picker?.querySelector('.featured-picker-suggestions'); if (!menu) return;
  const matches = featuredBookMatches(input.value, input.dataset.slot);
  menu.innerHTML = matches.map(book => `<button type="button" data-featured-option="${esc(book.id)}"><img src="${book.image?.startsWith('data:') ? book.image : `assets/covers/${book.image || 'meaning.jpg'}`}" alt="" /><span><strong>${esc(book.title)}</strong><small>${esc(book.author)}</small></span></button>`).join('');
  menu.hidden = !matches.length;
}
function updateFeaturedPicker(input, bookId) {
  const picker = input.closest('.featured-picker'); const hidden = picker?.querySelector('input[name="featuredOrder"]'); const book = books.find(item => item.id === bookId); if (!picker || !hidden || !book) return;
  hidden.value = book.id; input.value = book.title;
  const selected = picker.querySelector('.featured-picker-selected'); selected.innerHTML = `<img src="${book.image?.startsWith('data:') ? book.image : `assets/covers/${book.image || 'meaning.jpg'}`}" alt="" /><span>${esc(book.author)} · ${esc(book.publisher)}</span><button type="button" data-clear-featured>تغيير</button>`; selected.hidden = false;
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

function renderWorkspaceImmediately() {
  const list = $('#owner-list'); if (!list) return;
  try {
    if (ownerTab === 'books') renderBooksWorkspace();
    if (ownerTab === 'publishers') list.innerHTML = publishers.map(publisher => `<div class="admin-row"><span class="admin-avatar">${esc(publisher.logo || publisher.name.slice(0,1))}</span><div><strong>${esc(publisher.name)}</strong><small>${esc(publisher.city || '')}</small></div><span>نشط</span></div>`).join('');
    if (ownerTab === 'authors') list.innerHTML = [...new Set(books.map(book => book.author))].map(author => `<div class="admin-row"><span class="admin-avatar">${esc(author.slice(0,1))}</span><div><strong>${esc(author)}</strong><small>${books.filter(book => book.author === author).length} كتب</small></div><span>كاتب</span></div>`).join('');
    if (ownerTab === 'genres') list.innerHTML = Object.entries(genres).map(([id, genre]) => `<div class="admin-row"><span class="admin-avatar">✦</span><div><strong>${esc(genre.title)}</strong><small>#genre/${esc(id)}</small></div><span>${books.filter(book => book.category === id).length} كتب</span></div>`).join('');
    if (ownerTab === 'book-genres') list.innerHTML = `<div class="workspace-section-head"><div><strong>أنواع الكتب المستخدمة في المتجر</strong><small>هذه هي نفس الخيارات التي تظهر في فلتر صفحة كل الكتب وصفحات دور النشر.</small></div><button class="button button-dark" type="button" data-owner-form="book-genre">إضافة نوع كتاب</button></div>${bookGenres.map(genre => `<div class="admin-row"><span class="admin-avatar">⌕</span><div><strong>${esc(genre)}</strong><small>${books.filter(book => genreMatches(book, genre)).length} كتب تستخدم هذا النوع</small></div><span>نوع كتاب</span></div>`).join('') || '<p class="owner-note">أضف أول نوع كتاب من الزر أعلاه.</p>'}`;
    if (ownerTab === 'discounts') renderDiscountWorkspace();
    if (ownerTab === 'featured') renderFeaturedWorkspace();
    if (ownerTab === 'publisher-features') renderPublisherFeaturesWorkspace();
    if (ownerTab === 'collections') renderCollectionsWorkspace();
    if (ownerTab === 'unavailable') renderUnavailableWorkspace();
    if (ownerTab === 'orders') renderOrderWorkspace();
    if (ownerTab === 'team' || ownerTab === 'history') list.innerHTML = '<p class="owner-note">جاري تحميل بيانات المالك…</p>';
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
  if (!collectionsLoaded) { try { const remoteCollections = await window.GhazalAPI.adminCollections(sessionStorage.getItem(ADMIN_SESSION_KEY)); if (remoteCollections.collections?.length) { collections = remoteCollections.collections; save('ghazal.collections.v1', collections); } collectionsLoaded = true; } catch { collectionsLoaded = true; } }
  document.body.dataset.role = sessionStorage.getItem('ghazal.adminRole') || 'admin'; if ($('#owner-role-badge')) $('#owner-role-badge').textContent = document.body.dataset.role === 'owner' ? 'المالك' : 'خدمة العملاء'; ensureDashboardPanels();
  updateOwnerStats();
  if ($('#owner-newsletter-count')) $('#owner-newsletter-count').textContent = Number(analytics.newsletterSubscribers || 0).toLocaleString('ar-DZ');
  if ($('#owner-book-count')) $('#owner-book-count').textContent = books.length;
  if ($('#owner-ecotrack-count')) $('#owner-ecotrack-count').textContent = orders.filter(order => order.ecotrackRow).length;
  const list = $('#owner-list');
  try {
  if (ownerTab === 'books') renderBooksWorkspace();
  if (ownerTab === 'publishers') list.innerHTML = publishers.map(publisher => `<div class="admin-row"><span class="admin-avatar">${publisher.logo?.startsWith('data:') ? `<img src="${publisher.logo}" alt="" />` : esc(publisher.logo || publisher.name.slice(0,1))}</span><div><strong>${esc(publisher.name)}</strong><small>${esc(publisher.city || '')}</small></div><span>نشط</span></div>`).join('');
  if (ownerTab === 'authors') list.innerHTML = [...new Set(books.map(book => book.author))].map(author => { const profile = authorProfiles[author]; return `<div class="admin-row"><span class="admin-avatar">${profile?.photo?.startsWith('data:') ? `<img src="${profile.photo}" alt="" />` : esc(author.slice(0,1))}</span><div><strong>${esc(author)}</strong><small>${books.filter(book => book.author === author).length} كتب ${profile ? '· ملف مضاف' : '· ملف اختياري'}</small></div><span>${profile?.featured ? 'مميز' : 'كاتب'}</span></div>`; }).join('');
  if (ownerTab === 'genres') list.innerHTML = Object.entries(genres).map(([id, genre]) => `<div class="admin-row"><span class="admin-avatar">✦</span><div><strong>${esc(genre.title)}</strong><small>#genre/${esc(id)} · ${esc(genre.description || '')}</small></div><span>${books.filter(book => book.category === id).length} كتب</span></div>`).join('');
  if (ownerTab === 'book-genres') list.innerHTML = `<div class="workspace-section-head"><div><strong>أنواع الكتب المستخدمة في المتجر</strong><small>هذه هي نفس الخيارات التي تظهر في فلتر صفحة كل الكتب وصفحات دور النشر.</small></div><button class="button button-dark" type="button" data-owner-form="book-genre">إضافة نوع كتاب</button></div>${bookGenres.map(genre => `<div class="admin-row"><span class="admin-avatar">⌕</span><div><strong>${esc(genre)}</strong><small>${books.filter(book => genreMatches(book, genre)).length} كتب تستخدم هذا النوع</small></div><span>نوع كتاب</span></div>`).join('') || '<p class="owner-note">أضف أول نوع كتاب من الزر أعلاه.</p>'}`;
  if (ownerTab === 'discounts') renderDiscountWorkspace();
  if (ownerTab === 'featured') renderFeaturedWorkspace();
  if (ownerTab === 'publisher-features') renderPublisherFeaturesWorkspace();
  if (ownerTab === 'collections') renderCollectionsWorkspace();
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
function renderCollectionsWorkspace() {
  const list = $('#owner-list');
  list.innerHTML = `<div class="workspace-intro"><div><p class="eyebrow">مسارات التسويق</p><h3>مجموعات <em>الكتب</em></h3><p>أنشئ صفحات جاهزة للمشاركة والإعلانات. كل مجموعة لها رابط ثابت ويمكن إبرازها على الصفحة الرئيسية.</p></div><button class="button button-dark" type="button" data-owner-form="collection">＋ مجموعة جديدة</button></div><div class="collection-admin-list">${collections.map(collection => { const count = collection.bookIds.filter(id => books.some(book => book.id === id)).length; return `<article class="collection-admin-card"><div class="collection-admin-main"><div class="collection-admin-status ${collection.active ? 'is-active' : ''}">${collection.active ? 'نشطة' : 'مخفية'}${collection.homepage ? ' · على الرئيسية' : ''}</div><h4>${esc(collection.title)}</h4><p>${esc(collection.description || '')}</p><small>/${esc(collection.slug)} · ${count} كتب</small></div><div class="collection-admin-actions"><a class="text-button" href="../index.html#collection/${encodeURIComponent(collection.slug)}" target="_blank" rel="noreferrer">معاينة ↗</a><button class="text-button" type="button" data-edit-collection="${esc(collection.id)}">تعديل</button><button class="text-button" type="button" data-toggle-collection="${esc(collection.id)}">${collection.active ? 'إخفاء' : 'تفعيل'}</button></div></article>`; }).join('')}</div>`;
  list.querySelector('[data-owner-form="collection"]')?.addEventListener('click', () => openForm('collection'));
  list.querySelectorAll('[data-edit-collection]').forEach(button => button.addEventListener('click', () => openForm('collection', button.dataset.editCollection)));
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
  const query = normalizeArabicSearch(form.querySelector('#collection-book-search')?.value || '');
  const selected = collectionSelectedIds(form);
  const selectedBooks = selected.map(id => books.find(book => String(book.id) === id)).filter(Boolean);
  const matches = books.filter(book => !query || normalizeArabicSearch(`${book.title} ${book.author} ${book.publisher}`).includes(query));
  const visible = matches.slice(0, 80);
  selectedList.innerHTML = `<div class="collection-picker-heading"><strong>الكتب المضافة (${selectedBooks.length})</strong><small>تظهر هنا بالترتيب الذي ستظهر به في المجموعة.</small></div>${selectedBooks.length ? `<div class="collection-selected-list">${selectedBooks.map((book, index) => `<div class="collection-selected-book"><span>${index + 1}</span><div><strong>${esc(book.title)}</strong><small>${esc(book.author)} · ${esc(book.publisher)}</small></div><button type="button" class="text-button" data-collection-remove="${esc(book.id)}">إزالة</button></div>`).join('')}</div>` : '<p class="owner-note">لم تضف كتبًا بعد. ابحث عن كتاب أدناه لإضافته.</p>'}`;
  results.innerHTML = `${matches.length > visible.length ? `<p class="collection-picker-count">عرض ${visible.length} من ${matches.length} نتيجة. تابع البحث لتضييق القائمة.</p>` : ''}${visible.length ? visible.map(book => `<label><input type="checkbox" name="bookIds" data-collection-book="${esc(book.id)}" ${selected.includes(String(book.id)) ? 'checked' : ''} /> <span>${esc(book.title)} <small>— ${esc(book.author)} · ${esc(book.publisher)}</small></span></label>`).join('') : '<p class="owner-note">لا توجد نتائج مطابقة.</p>'}`;
  form.dataset.collectionSelected = JSON.stringify(selected);
}
function setupCollectionBookPicker(form, initialIds = []) {
  form.dataset.collectionSelected = JSON.stringify(initialIds.map(String));
  renderCollectionBookPicker(form);
  form.querySelector('#collection-book-search')?.addEventListener('input', () => renderCollectionBookPicker(form));
  form.querySelector('#collection-book-results')?.addEventListener('change', event => {
    const input = event.target.closest('[data-collection-book]'); if (!input) return;
    const selected = collectionSelectedIds(form); const id = String(input.dataset.collectionBook);
    input.checked ? (!selected.includes(id) && selected.push(id)) : selected.splice(selected.indexOf(id), 1);
    form.dataset.collectionSelected = JSON.stringify(selected); renderCollectionBookPicker(form);
    form.querySelector('#collection-book-search')?.focus();
  });
  form.querySelector('#collection-selected-books')?.addEventListener('click', event => {
    const remove = event.target.closest('[data-collection-remove]'); if (!remove) return;
    const selected = collectionSelectedIds(form).filter(id => id !== String(remove.dataset.collectionRemove));
    form.dataset.collectionSelected = JSON.stringify(selected); renderCollectionBookPicker(form);
  });
}
$$('[data-owner-tab]').forEach(button => button.addEventListener('click', () => { ownerTab = button.dataset.ownerTab; $$('.admin-tabs button').forEach(item => item.classList.toggle('active', item === button)); renderWorkspaceImmediately(); renderOwner(); }));
function bookGenreOptions(selected = '') { return `<option value="">اختر نوع الكتاب</option>${bookGenres.map(genre => `<option value="${esc(genre)}" ${genre === selected ? 'selected' : ''}>${esc(genre)}</option>`).join('')}<option value="__new__">＋ إضافة نوع جديد</option>`; }
function setupBookGenreField(form, selected = '') { const select = form.elements.genre; const custom = form.elements.genreCustom; if (!select || !custom) return; const sync = () => { const isNew = select.value === '__new__'; custom.closest('label').hidden = !isNew; custom.required = isNew; if (!isNew) custom.value = ''; }; select.value = selected || ''; select.addEventListener('change', sync); sync(); }
function openForm(kind, editId = '') {
  if ((kind === 'staff' || kind === 'tracking') && sessionStorage.getItem('ghazal.adminRole') !== 'owner') return alert('هذه العملية متاحة للمالك فقط.');
  const editingCollection = kind === 'collection' ? collections.find(item => item.id === editId) : null;
  $('#owner-form-title').textContent = kind === 'tracking' ? 'إعدادات التتبع' : kind === 'book' ? 'إضافة كتاب جديد' : kind === 'publisher' ? 'إضافة دار نشر' : kind === 'author' ? 'إضافة ملف مؤلف اختياري' : kind === 'collection' ? 'إنشاء مجموعة كتب' : kind === 'book-genre' ? 'إضافة نوع كتاب' : 'إضافة تصنيف جديد';
  const collectionForm = `<div class="form-grid"><label>اسم المجموعة<input name="title" required placeholder="روايات قصيرة" value="${esc(editingCollection?.title || '')}" /></label><label>الرابط المختصر<input name="slug" required pattern="[a-z0-9-]+" placeholder="short-novels" value="${esc(editingCollection?.slug || '')}" /></label></div><label>وصف المجموعة<textarea name="description" rows="3" required placeholder="وصف يظهر للزائر ولإعلانات Meta">${esc(editingCollection?.description || '')}</textarea></label><div class="collection-book-picker"><div class="collection-picker-heading"><strong>كتب المجموعة</strong><small>ابحث وأضف الكتب واحدًا تلو الآخر، ثم أعد ترتيبها بإزالتها وإضافتها من جديد.</small></div><div class="discount-book-search"><span>⌕</span><input id="collection-book-search" type="search" placeholder="ابحث بعنوان الكتاب أو المؤلف أو الناشر" autocomplete="off" /></div><div id="collection-selected-books"></div><div id="collection-book-results" class="discount-book-picker discount-book-picker-searchable"></div></div><label class="discount-all-toggle"><input name="homepage" type="checkbox" ${editingCollection?.homepage !== false ? 'checked' : ''} /> أظهر المجموعة على الصفحة الرئيسية</label><label class="discount-all-toggle"><input name="active" type="checkbox" ${editingCollection?.active !== false ? 'checked' : ''} /> المجموعة نشطة</label><button class="button button-dark" type="submit">${editingCollection ? 'حفظ تعديلات المجموعة' : 'حفظ المجموعة'}</button>`;
  $('#owner-form').innerHTML = kind === 'tracking' ? `<label>Meta Pixel ID<input name="pixelId" inputmode="numeric" placeholder="مثال: 123456789012345" value="${esc(read('ghazal.metaPixelId', ''))}" /></label><p class="form-help">اتركه فارغًا أثناء التطوير. عند وضع المعرّف، يسجل المتجر مشاهدة الكتاب، الإضافة إلى السلة، بدء الدفع، والمبيعات. لا تضع Access Token هنا؛ Conversions API يجب أن يبقى على الخادم.</p><button class="button button-dark" type="submit">حفظ إعدادات التتبع</button>` : kind === 'book' ? `<div class="form-grid"><label>عنوان الكتاب<input name="title" required /></label><label>المؤلف<input name="author" required /></label></div><div class="form-grid"><label>دار النشر<input name="publisher" required /></label><label>السعر بالدينار<input name="price" type="number" min="0" required /></label></div><div class="form-grid"><label>التصنيف<select name="category">${Object.entries(genres).map(([id, genre]) => `<option value="${id}">${esc(genre.title)}</option>`).join('')}</select></label><label>نوع الكتاب<select name="genre">${bookGenreOptions()}</select></label></div><label name="new-genre-label" hidden>اسم النوع الجديد<input name="genreCustom" placeholder="مثال: رواية مترجمة" /></label><label>نبذة<textarea name="note" rows="3" required></textarea></label><label class="bulk-drop">غلاف الكتاب<input name="cover" type="file" accept="image/*" /></label><button class="button button-dark" type="submit">حفظ الكتاب</button>` : kind === 'publisher' ? `<div class="form-grid"><label>اسم دار النشر<input name="name" required /></label><label>المدينة<input name="city" required /></label></div><label>الوصف<textarea name="description" rows="3" required></textarea></label><label class="bulk-drop">شعار دار النشر<input name="logo" type="file" accept="image/*" required /></label><button class="button button-dark" type="submit">حفظ دار النشر</button>` : kind === 'author' ? `<label>اسم المؤلف<input name="name" required placeholder="يجب أن يطابق اسم المؤلف في الكتب" /></label><label>نبذة المؤلف<textarea name="bio" rows="4" placeholder="نبذة قصيرة تظهر في الصفحة العامة"></textarea></label><label class="bulk-drop">صورة المؤلف<input name="photo" type="file" accept="image/*" /></label><label><input name="featured" type="checkbox" /> أظهره كاختيار مميز</label><button class="button button-dark" type="submit">حفظ ملف المؤلف</button>` : kind === 'collection' ? collectionForm : kind === 'book-genre' ? `<label>اسم نوع الكتاب<input name="bookGenre" required placeholder="رواية مترجمة" /></label><p class="form-help">سيظهر هذا النوع في فلتر الكتب وفي قائمة اختيار نوع الكتاب عند إضافة أو تعديل كتاب.</p><button class="button button-dark" type="submit">حفظ نوع الكتاب</button>` : `<div class="form-grid"><label>معرّف التصنيف<input name="id" required placeholder="مثال: poetry" pattern="[a-z0-9-]+" /></label><label>اسم التصنيف<input name="title" required placeholder="الشعر" /></label></div><label>وصف مختصر<textarea name="description" rows="3" required></textarea></label><button class="button button-dark" type="submit">حفظ التصنيف</button>`;
  $('#owner-form').dataset.kind = kind; $('#owner-form').dataset.editId = editId;
  if (kind === 'staff') { $('#owner-form-title').textContent = 'إضافة موظف خدمة العملاء'; $('#owner-form').innerHTML = '<p class="form-help">يمكن لهذا الحساب متابعة الطلبات وتحديث حالتها، لكنه لا يرى المبيعات ولا يحرر محتوى المتجر.</p><label>البريد الإلكتروني<input name="email" type="email" required autocomplete="email" /></label><label>كلمة المرور<input name="password" type="password" minlength="12" required autocomplete="new-password" /></label><button class="button button-dark" type="submit">إنشاء حساب الموظف</button>'; }
  if (kind === 'book' && editId) $('#owner-form-title').textContent = 'تعديل بيانات الكتاب';
  if (kind === 'collection' && editId) $('#owner-form-title').textContent = 'تعديل مجموعة الكتب';
  if (kind === 'book') {
    const book = books.find(item => item.id === editId);
    $('#owner-form').querySelector('textarea[name="note"]')?.closest('label')?.insertAdjacentHTML('afterend', '<label>مراجعة قصيرة للكتاب<textarea name="review" rows="5" maxlength="1200" placeholder="اكتب 5 إلى 10 أسطر عن تجربة قراءة هذا الكتاب"></textarea><small class="field-hint">حد أقصى 1200 حرفًا.</small></label>');
    $('#owner-form').insertAdjacentHTML('beforeend', `<label>الكمية المتوفرة<input name="stock" type="number" min="0" step="1" value="${esc(book?.stock ?? 10)}" /></label><label class="bulk-drop">إضافة عدة كتب عبر CSV<input name="bulk" type="file" accept=".csv,text/csv" /></label><small class="form-help">الأعمدة: العنوان، المؤلف، الناشر، السعر، التصنيف، التصنيف الفرعي، النبذة، الكمية.</small>`);
    ['author','publisher'].forEach(name => { const input = $('#owner-form').elements[name]; input.classList.add('entity-autocomplete'); input.setAttribute('autocomplete', 'off'); input.insertAdjacentHTML('afterend', `<div class="entity-suggestions" data-suggestions-for="${name}" hidden></div>`); input.addEventListener('input', () => renderEntitySuggestions(input)); input.addEventListener('focus', () => renderEntitySuggestions(input)); });
    if (book) ['title','author','publisher','price','category','genre','note','review','stock'].forEach(name => { if (book[name] !== undefined && $('#owner-form').elements[name]) $('#owner-form').elements[name].value = book[name]; });
    setupBookGenreField($('#owner-form'), book?.genre || '');
    $('#owner-form').elements.bulk.addEventListener('change', event => { ['title','author','publisher','price','category','genre','note'].forEach(name => { if ($('#owner-form').elements[name]) $('#owner-form').elements[name].required = !event.target.files.length; }); });
  }
  if (kind === 'discount') {
    $('#owner-form-title').textContent = 'إضافة خصم';
    $('#owner-form').innerHTML = `<label>اسم الخصم<input name="name" required placeholder="خصم الصيف" /></label><div class="form-grid"><label>نوع الخصم<select name="type"><option value="percent">نسبة مئوية</option><option value="fixed">مبلغ ثابت بالدينار</option></select></label><label>قيمة الخصم<input name="value" type="number" min="0" step="0.01" required /></label></div><label>رمز الخصم (اختياري)<input name="code" maxlength="40" placeholder="مثال: GHazal10" /></label><label class="discount-all-toggle"><input name="appliesToAll" type="checkbox" /> طبّق الخصم على كل الكتب</label><div class="discount-book-search"><span>⌕</span><input id="discount-book-search" type="search" placeholder="ابحث بالعنوان أو المؤلف أو الناشر" autocomplete="off" /></div><div class="discount-picker-toolbar"><span id="discount-book-count">0 كتاب محدد</span><button class="text-button" type="button" data-discount-select-visible>تحديد النتائج الظاهرة</button></div><div id="discount-book-picker-list" class="discount-book-picker discount-book-picker-searchable"></div><label class="discount-all-toggle"><input name="active" type="checkbox" checked /> الخصم نشط الآن</label><button class="button button-dark" type="submit">حفظ الخصم</button>`;
    setupDiscountBookPicker();
  }
  if (kind === 'featured') {
    $('#owner-form-title').textContent = 'تعديل مختارات الغزال';
    $('#owner-form').innerHTML = `<p class="form-help">ابحث داخل كل خانة بعنوان الكتاب أو المؤلف أو دار النشر. يمكنك ترك الخانة فارغة، ولا يمكن تكرار الكتاب في أكثر من موضع.</p>${[0,1,2,3].map(index => { const selected = books.find(book => book.id === featuredBookIds[index]); return `<div class="featured-picker" data-slot="${index}"><label for="featured-search-${index}">الخانة ${index + 1}<input id="featured-search-${index}" class="featured-picker-search" type="search" autocomplete="off" placeholder="ابحث عن كتاب…" value="${esc(selected?.title || '')}" data-slot="${index}" /></label><input type="hidden" name="featuredOrder" value="${esc(selected?.id || '')}" data-slot="${index}" /><div class="featured-picker-suggestions" role="listbox" hidden></div><div class="featured-picker-selected" ${selected ? '' : 'hidden'}><img src="${selected ? (selected.image?.startsWith('data:') ? selected.image : `assets/covers/${selected.image || 'meaning.jpg'}`) : ''}" alt="" /><span>${selected ? `${esc(selected.author)} · ${esc(selected.publisher)}` : ''}</span><button type="button" data-clear-featured>تغيير</button></div></div>`; }).join('')}<button class="button button-dark" type="submit">حفظ المختارات</button>`;
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
function fileData(input) { return new Promise(resolve => { const file = input?.files?.[0]; if (!file) return resolve(''); const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(file); }); }
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
function isGhazalImportTemplate(headers, mapping) { const normalized = headers.map(normalizeColumn); const required = BULK_BOOK_FIELDS.filter(field => field.required); const allFieldsPresent = BULK_BOOK_FIELDS.every(field => mapping[field.id] !== ''); const requiredPresent = required.every(field => mapping[field.id] !== ''); return normalized.length >= BULK_BOOK_FIELDS.length && allFieldsPresent && requiredPresent; }
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
async function cacheImageUrl(value) {
  const url = String(value || '').trim();
  if (!/^https?:\/\//i.test(url)) return url;
  try { const response = await fetch(url, { mode:'cors' }); if (!response.ok) throw new Error('image_fetch_failed'); const blob = await response.blob(); return await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('image_read_failed')); reader.readAsDataURL(blob); }); } catch { try { const result = await window.GhazalAPI?.cacheImageUrl(sessionStorage.getItem(ADMIN_SESSION_KEY), url); if (result?.data) return result.data; } catch { /* The caller shows a clear import error. */ } throw new Error('image_cache_failed'); }
}
async function importMappedBooks() {
  const missing = []; const imported = [];
  for (let rowIndex = 0; rowIndex < bulkBookRows.length; rowIndex += 1) { const row = bulkBookRows[rowIndex]; if (!row.some(value => String(value ?? '').trim() !== '')) continue; const values = Object.fromEntries(BULK_BOOK_FIELDS.map(field => [field.id, bulkValue(row, field)])); const requiredMissing = BULK_BOOK_FIELDS.filter(field => field.required && !values[field.id]); if (requiredMissing.length) { missing.push(rowIndex + 2); continue; } const price = importNumber(values.price); const stock = importNumber(values.stock, true); const match = books.find(book => (values.isbn && book.isbn === values.isbn) || (book.title.trim().toLocaleLowerCase('ar') === values.title.trim().toLocaleLowerCase('ar') && book.author.trim().toLocaleLowerCase('ar') === values.author.trim().toLocaleLowerCase('ar'))); let image; try { image = await cacheImageUrl(values.image || match?.image || 'meaning.jpg'); } catch { alert(`تعذر تخزين صورة الغلاف في الصف ${rowIndex + 2}. صحح الرابط أو اتركه فارغًا ثم أعد المحاولة.`); return; } imported.push({ ...(match || {}), id:match?.id || `book-${Date.now()}-${rowIndex}`, title:values.title, author:values.author, publisher:values.publisher, price, category:values.category || match?.category || 'literature', genre:values.genre || match?.genre || 'كتاب', review:values.review.slice(0, 1200), note:values.note || match?.note || '', stock, isbn:values.isbn || match?.isbn || '', image }); }
  if (missing.length) { alert(`هناك صفوف ناقصة في الحقول الإلزامية: ${missing.slice(0, 8).join('، ')}${missing.length > 8 ? '…' : ''}`); return; }
  if (!imported.length) { alert('لم يتم العثور على صفوف كتب صالحة للاستيراد.'); return; }
  const current = read('ghazal.customBooks.v1', []); const before = [...current]; const next = [...current]; imported.forEach(book => { const index = next.findIndex(item => item.id === book.id); index >= 0 ? next.splice(index, 1, book) : next.push(book); });
  // Keep the in-memory catalog in sync before sending it to the server. Without
  // this, the server received the old catalog and the reload hid new imports.
  const importedById = new Map(imported.map(book => [book.id, book]));
  books = [...books.filter(book => !importedById.has(book.id)), ...imported];
  save('ghazal.lastImport.v1', { before, after:next, createdAt:new Date().toISOString() }); save('ghazal.customBooks.v1', next);
  let synced = true;
  try { await flushCatalogSync(); } catch (error) { synced = false; const reason = String(error?.message || ''); const message = reason.includes('permission_denied') ? 'حسابك لا يملك صلاحية تعديل الفهرس. اطلب من المالك تفعيل صلاحية تعديل الكتب.' : reason.includes('request_too_large') ? 'ملف الاستيراد كبير جدًا بسبب الصور. قلّل حجم الصور أو استورد الكتب على دفعات أصغر.' : reason.includes('request_failed') || reason.includes('timeout') ? 'تعذر الاتصال بالخادم. تأكد أن server.js يعمل ثم أعد المحاولة.' : `تعذرت مزامنة الكتب مع الخادم (${reason || 'خطأ غير معروف'}). ستبقى محفوظة محليًا ويمكن إعادة المحاولة.`; alert(`تم حفظ الكتب محليًا، لكن ${message}`); }
  $('#bulk-book-overlay').hidden = true;
  if (synced) location.reload(); else { bookQuery = ''; bookPage = 1; renderBooksWorkspace(); if ($('#owner-book-count')) $('#owner-book-count').textContent = books.length; }
}
function readFileText(input) { return new Promise(resolve => { const file = input?.files?.[0]; if (!file) return resolve(''); const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsText(file); }); }
function csvBookRows(text) { return String(text).split(/\r?\n/).filter(Boolean).slice(1).map(row => row.split(',').map(value => value.trim())).filter(values => values.length >= 4); }
$('#owner-form').addEventListener('submit', async event => {
  event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
  if ((form.dataset.kind === 'staff' || form.dataset.kind === 'tracking') && sessionStorage.getItem('ghazal.adminRole') !== 'owner') { alert('هذه العملية متاحة للمالك فقط.'); return; }
  if (form.dataset.kind === 'staff') { try { await window.GhazalAPI.createStaff(sessionStorage.getItem(ADMIN_SESSION_KEY), String(data.get('email') || '').trim(), String(data.get('password') || '')); alert('تم إنشاء حساب موظف خدمة العملاء.'); } catch (error) { alert(String(error.message).includes('duplicate') ? 'هذا البريد مستخدم من قبل.' : 'تعذر إنشاء الحساب. استخدم بريدًا صحيحًا وكلمة مرور من 12 حرفًا.'); return; } }
  else if (form.dataset.kind === 'tracking') { save('ghazal.metaPixelId', String(data.get('pixelId') || '').trim()); alert('حُفظت إعدادات التتبع. افتح المتجر من جديد لتفعيلها.'); }
  else if (form.dataset.kind === 'publisher') { const name = data.get('name'); const publisher = { id:`publisher-${Date.now()}`, name, city:data.get('city'), since:'إضافة جديدة', description:data.get('description'), logo:await fileData(form.elements.logo) }; publishers = [...publishers, publisher]; const current = read('ghazal.customPublishers.v1', []); save('ghazal.customPublishers.v1', [...current, publisher]); }
  else if (form.dataset.kind === 'author') { const name = data.get('name').trim(); const profiles = { ...authorProfiles }; profiles[name] = { bio:data.get('bio'), photo:await fileData(form.elements.photo), featured:data.get('featured') === 'on' }; authorProfiles = profiles; save('ghazal.authorProfiles.v1', profiles); }
  else if (form.dataset.kind === 'genre') { const id = data.get('id').trim(); const custom = { ...genres }; custom[id] = { title:data.get('title').trim(), description:data.get('description').trim() }; genres = custom; save('ghazal.genres.v1', custom); }
  else if (form.dataset.kind === 'book-genre') { const value = String(data.get('bookGenre') || '').trim(); if (!value) return; if (!bookGenres.includes(value)) { bookGenres = [...bookGenres, value].sort((a,b) => a.localeCompare(b, 'ar')); save('ghazal.bookGenres.v1', bookGenres); } }
  else if (form.dataset.kind === 'discount') { const appliesToAll = data.get('appliesToAll') === 'on'; const bookIds = [...discountSelectedIds(form)]; if (!appliesToAll && !bookIds.length) { alert('اختر كتابًا واحدًا على الأقل أو فعّل تطبيق الخصم على كل الكتب.'); return; } const value = Math.max(0, Number(data.get('value')) || 0); if (data.get('type') === 'percent' && value > 100) { alert('النسبة لا يمكن أن تتجاوز 100٪.'); return; } discounts = [...read('ghazal.discounts.v1', []), { id:`discount-${Date.now()}`, name:data.get('name').trim(), type:data.get('type'), value, code:String(data.get('code') || '').trim().toUpperCase(), appliesToAll, bookIds, active:data.get('active') === 'on' }]; save('ghazal.discounts.v1', discounts); }
  else if (form.dataset.kind === 'collection') { const editId = form.dataset.editId; const title = String(data.get('title') || '').trim(); const slug = String(data.get('slug') || '').trim().toLowerCase(); if (collections.some(item => item.slug === slug && item.id !== editId)) { alert('هذا الرابط مستخدم من قبل. اختر رابطًا مختلفًا.'); return; } const collection = { id:editId || `collection-${Date.now()}`, slug, title, description:String(data.get('description') || '').trim(), bookIds:[...form.querySelectorAll('input[name="bookIds"]:checked')].map(input => input.value), homepage:data.get('homepage') === 'on', active:data.get('active') === 'on' }; try { const result = editId ? await window.GhazalAPI.updateCollection(sessionStorage.getItem(ADMIN_SESSION_KEY), editId, collection) : await window.GhazalAPI.createCollection(sessionStorage.getItem(ADMIN_SESSION_KEY), collection); const saved = result.collection || collection; collections = editId ? collections.map(item => item.id === editId ? saved : item) : [...collections, saved]; save('ghazal.collections.v1', collections); } catch (error) { const message = String(error.message || ''); if (message.includes('duplicate')) alert('هذا الرابط مستخدم من قبل. اختر رابطًا مختلفًا.'); else alert('تعذر حفظ المجموعة.'); return; } }
  else if (form.dataset.kind === 'featured') { const selected = [...form.querySelectorAll('input[name="featuredOrder"]')].map(input => input.value).filter(Boolean); if (new Set(selected).size !== selected.length) { alert('اختر كتابًا مختلفًا في كل خانة.'); return; } featuredBookIds = selected; save('ghazal.featuredBooks.v1', featuredBookIds); }
  else {
    const bulkRows = await readFileText(form.elements.bulk); const current = read('ghazal.customBooks.v1', []);
    if (bulkRows) {
      const added = csvBookRows(bulkRows).map((values, index) => ({ id:`book-${Date.now()}-${index}`, title:values[0], author:values[1], publisher:values[2], price:Number(values[3]) || 0, category:values[4] || 'literature', genre:values[5] || 'كتاب', review:values[6] || '', note:values[6] || 'كتاب جديد على رفوف الغزال.', stock:Math.max(0, Number(values[7]) || 0), image:'meaning.jpg' }));
      books = [...books, ...added]; bookGenres = [...new Set([...bookGenres, ...added.map(book => book.genre).filter(Boolean)])].sort((a,b) => a.localeCompare(b, 'ar')); save('ghazal.customBooks.v1', [...current, ...added]); save('ghazal.bookGenres.v1', bookGenres);
    } else {
      const id = form.dataset.editId || `book-${Date.now()}`; const existing = books.find(book => book.id === id) || {}; const selectedGenre = String(data.get('genre') || '').trim(); const genre = selectedGenre === '__new__' ? String(data.get('genreCustom') || '').trim() : selectedGenre; if (!genre) { alert('اختر نوع الكتاب أو أضف نوعًا جديدًا.'); return; } const book = { ...existing, id, title:data.get('title'), author:data.get('author'), publisher:data.get('publisher'), price:Number(data.get('price')) || 0, category:data.get('category'), genre, note:data.get('note'), review:String(data.get('review') || existing.review || '').slice(0, 1200), stock:Math.max(0, Number(data.get('stock')) || 0), image:await fileData(form.elements.cover) || existing.image || 'meaning.jpg' }; books = [...books.filter(item => item.id !== id), book]; bookGenres = [...new Set([...bookGenres, genre])].sort((a,b) => a.localeCompare(b, 'ar')); const next = current.filter(item => item.id !== id); save('ghazal.customBooks.v1', [...next, book]); save('ghazal.bookGenres.v1', bookGenres);
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
  if (event.target.closest('[data-retry-workspace]')) { renderOwner(); return; }
  const saveUser = event.target.closest('[data-save-user]');
  if (saveUser) { const card = saveUser.closest('[data-user-id]'); const permissions = Object.fromEntries([...card.querySelectorAll('[data-user-permission]')].map(input => [input.dataset.userPermission, input.checked])); const role = card.querySelector('[data-user-role]')?.value || 'admin'; window.GhazalAPI.updateStaff(sessionStorage.getItem(ADMIN_SESSION_KEY), card.dataset.userId, { role, permissions }).then(() => { alert('تم حفظ صلاحيات المستخدم.'); renderTeamWorkspace(); }).catch(error => alert(`تعذر حفظ الصلاحيات: ${error.message || 'خطأ غير معروف'}`)); return; }
  const removeStaff = event.target.closest('[data-remove-staff]');
  if (removeStaff) { if (!window.confirm('إزالة وصول هذا الموظف؟ ستُلغى جلساته فورًا.')) return; window.GhazalAPI.deleteStaff(sessionStorage.getItem(ADMIN_SESSION_KEY), removeStaff.dataset.removeStaff).then(() => renderOwner()).catch(() => alert('تعذر إزالة الموظف.')); return; }
  const confirmOrder = event.target.closest('[data-order-confirm]');
  if (confirmOrder) { const reference = confirmOrder.dataset.orderConfirm; confirmOrder.disabled = true; window.GhazalAPI.updateOrder(sessionStorage.getItem(ADMIN_SESSION_KEY), reference, 'confirmed').then(() => { const order = orders.find(item => item.reference === reference); if (order) order.status = 'confirmed'; renderOwner(); }).catch(error => { confirmOrder.disabled = false; alert(orderUpdateErrorMessage(error)); }); return; }
  const unconfirmOrder = event.target.closest('[data-order-unconfirm]');
  if (unconfirmOrder) { const reference = unconfirmOrder.dataset.orderUnconfirm; unconfirmOrder.disabled = true; window.GhazalAPI.updateOrder(sessionStorage.getItem(ADMIN_SESSION_KEY), reference, 'cancelled').then(() => { const order = orders.find(item => item.reference === reference); if (order) order.status = 'cancelled'; renderOwner(); }).catch(error => { unconfirmOrder.disabled = false; alert(orderUpdateErrorMessage(error)); }); return; }
  const collectionToggle = event.target.closest('[data-toggle-collection]');
  if (collectionToggle) { const id = collectionToggle.dataset.toggleCollection; const collection = collections.find(item => item.id === id); if (!collection) return; const active = !collection.active; window.GhazalAPI.updateCollection(sessionStorage.getItem(ADMIN_SESSION_KEY), id, { active }).then(result => { collections = collections.map(item => item.id === id ? (result.collection || { ...item, active }) : item); renderOwner(); }).catch(() => alert('تعذر تحديث المجموعة.')); return; }
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
  if (event.target.closest('[data-order-clear-filter]')) { orderStartDate = ''; orderEndDate = ''; renderOwner(); return; }
  if (event.target.closest('[data-order-select-visible]')) { const visible = filteredOrders(); const allSelected = visible.length > 0 && visible.every(order => selectedOrderRefs.has(order.reference)); visible.forEach(order => allSelected ? selectedOrderRefs.delete(order.reference) : selectedOrderRefs.add(order.reference)); renderOwner(); return; }
  if (event.target.closest('[data-order-clear-selection]')) { selectedOrderRefs.clear(); renderOwner(); }
  if (event.target.closest('[data-order-export]')) { exportOrders(); }
});
$('#owner-list').addEventListener('change', event => {
  if (event.target.id === 'history-filter-employee') { historyEmployeeFilter = event.target.value; renderHistoryWorkspace(); return; }
  if (event.target.id === 'owner-book-search') { bookQuery = event.target.value; bookPage = 1; renderBooksWorkspace(); return; }
  if (event.target.id === 'owner-book-stock') { bookStockFilter = event.target.value; bookPage = 1; renderBooksWorkspace(); return; }
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
