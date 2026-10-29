const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

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

let books = [
  { id: 'stranger', title: 'الغريب', author: 'ألبير كامو', publisher: 'منشورات الجمل', category: 'literature', genre: 'رواية مترجمة', price: 1900, image: 'stranger.jpg', note: 'رواية قصيرة ومكثّفة عن الغربة والعبث والإنسان في مواجهة العالم.' },
  { id: 'world-yesterday', title: 'عالم الأمس', author: 'شتيفان تسفايغ', publisher: 'دار المدى', category: 'history', genre: 'سيرة · تاريخ', price: 2600, image: 'world-yesterday.jpg', note: 'شهادة أدبية حميمة على أوروبا التي غيّرتها الحرب إلى الأبد.' },
  { id: 'meaning', title: 'الإنسان يبحث عن معنى', author: 'فيكتور فرانكل', publisher: 'آكيول', category: 'thought', genre: 'فكر · علم نفس', price: 2200, image: 'meaning.jpg', note: 'تأمل مؤثر في قدرة الإنسان على العثور على معنى وسط أقسى الظروف.' },
  { id: 'orientalism', title: 'الاستشراق', author: 'إدوارد سعيد', publisher: 'دار الآداب', category: 'history', genre: 'فكر · نقد ثقافي', price: 3900, image: 'orientalism.jpg', note: 'كتاب غيّر طريقة قراءة العلاقة بين المعرفة والسلطة وصورة الشرق.' },
  { id: 'meditations', title: 'التأملات', author: 'ماركوس أوريليوس', publisher: 'طبعة عربية', category: 'thought', genre: 'فلسفة · كلاسيكيات', price: 2100, image: 'meditations.jpg', note: 'ملاحظات شخصية عن الاتزان والفضيلة ومواجهة تقلّبات الحياة.' },
  { id: 'solitude', title: 'مئة عام من العزلة', author: 'غابرييل غارسيا ماركيز', publisher: 'دار التنوير', category: 'literature', genre: 'رواية مترجمة', price: 3200, image: 'solitude.jpg', note: 'ملحمة ماكوندو الساحرة، حيث تختلط الذاكرة بالأسطورة والحياة.' },
  { id: 'letters', title: 'رسائل إلى شاعر شاب', author: 'راينر ماريا ريلكه', publisher: 'دار الكرمة', category: 'literature', genre: 'أدب · رسائل', price: 1500, image: 'letters.jpg', note: 'رسائل صادقة عن الكتابة والوحدة والشجاعة على أن يعيش المرء حياته.' },
  { id: 'sophies-world', title: 'عالم صوفي', author: 'جوستاين غاردر', publisher: 'دار المنى', category: 'thought', genre: 'رواية · فلسفة', price: 3600, image: 'sophies-world.jpg', note: 'رحلة روائية تقود أسئلة الفلسفة الكبرى إلى باب فتاة فضولية.' },
  { id: 'plague', title: 'الطاعون', author: 'ألبير كامو', publisher: 'دار التنوير', category: 'literature', genre: 'رواية مترجمة', price: 2400, image: 'plague.jpg', note: 'حكاية مدينة محاصرة، واختبار إنساني للتضامن والاختيار.' },
  { id: 'name-of-rose', title: 'اسم الوردة', author: 'أمبرتو إيكو', publisher: 'دار الكتاب الجديد', category: 'literature', genre: 'رواية · تاريخ', price: 3200, image: 'name-of-rose.jpg', note: 'لغز في دير من العصور الوسطى يفتح أبواب الكتب والمعرفة والسلطة.' },
  { id: 'art-of-loving', title: 'فن الحب', author: 'إريك فروم', publisher: 'طبعة عربية', category: 'thought', genre: 'فكر · إنسانيات', price: 1800, image: 'art-of-loving.jpg', note: 'قراءة في الحب بوصفه فنًا يحتاج إلى معرفة وممارسة وعناية.' },
  { id: 'brief-time', title: 'تاريخ موجز للزمان', author: 'ستيفن هوكينغ', publisher: 'دار التنوير', category: 'history', genre: 'علم · إنسانيات', price: 2900, image: 'brief-time.jpg', note: 'أسئلة الكون والزمن والثقوب السوداء في كتاب علمي صار من كلاسيكيات العصر.' },
];
let publishers = [
  { id: 'adab', name: 'دار الآداب', city: 'بيروت', since: 'منذ ١٩٥٦', description: 'دار عربية عريقة احتضنت أصواتًا أدبية وفكرية لا تزال حاضرة في الذاكرة.', logo: 'ا' },
  { id: 'tanweer', name: 'دار التنوير', city: 'بيروت · القاهرة', since: 'كتب تضيء الطريق', description: 'إصدارات تنحاز إلى المعرفة الحرة، والترجمات التي توسّع أفق القارئ.', logo: 'ت' },
  { id: 'mada', name: 'دار المدى', city: 'دمشق · بيروت', since: 'الأدب والفكر والفنون', description: 'مشروع ثقافي عربي يعتني بالأدب والفكر والفنون والكتب المرجعية.', logo: 'م' },
  { id: 'jamal', name: 'منشورات الجمل', city: 'بيروت · بغداد', since: 'أصوات من العالم', description: 'ترجمات ونصوص عربية تمنح القارئ فرصة الإصغاء إلى أصوات مختلفة.', logo: 'ج' },
  { id: 'arab-network', name: 'الشبكة العربية للأبحاث والنشر', city: 'الدوحة', since: 'معرفة عربية رصينة', description: 'كتب الفكر والتاريخ والسياسة التي تمنح السؤال العربي مساحة أوسع.', logo: 'ش' },
  { id: 'rafidain', name: 'دار الرافدين', city: 'بيروت · بغداد', since: 'للكتاب العربي الجميل', description: 'إصدارات تحمل حيوية المكتبة العربية، بين التراث والقراءة المعاصرة.', logo: 'ر' },
  { id: 'karma', name: 'دار الكرمة', city: 'القاهرة', since: 'منذ ٢٠١٥', description: 'كتب مختارة في الأدب والفكر والعلوم الإنسانية بلغة قريبة وحسّ أدبي.', logo: 'ك' },
];
publishers.push(...readStorage('ghazal.customPublishers.v1', []));
const customBooks = readStorage('ghazal.customBooks.v1', []);
const bookOverrides = new Map(customBooks.map(book => [book.id, book]));
books = books.map(book => ({ ...book, ...(bookOverrides.get(book.id) || {}) }));
customBooks.filter(book => !books.some(existing => existing.id === book.id)).forEach(book => books.push(book));
books.forEach(book => { if (!Number.isFinite(Number(book.stock))) book.stock = 10; });
let authorProfiles = readStorage('ghazal.authorProfiles.v1', {});
let genres = {
  literature: { title: 'الأدب العالمي', description: 'حكايات تعبر الحدود، وأصوات تترك أثرًا بعد الصفحة الأخيرة.' },
  thought: { title: 'الفكر والفلسفة', description: 'أسئلة توسّع الأفق، وكتب تساعدنا على النظر من زاوية أخرى.' },
  history: { title: 'التاريخ والإنسانيات', description: 'لفهم ما كان، وما يكون، والإنسان في قلب الحكاية.' }
};
Object.assign(genres, readStorage('ghazal.genres.v1', {}));
let byId = Object.fromEntries(books.map(book => [book.id, book]));
const defaultCollections = [
  { id: 'collection-literature', slug: 'rwayat-wa-adab', title: 'روايات وأدب', description: 'حكايات تبقى معك بعد الصفحة الأخيرة.', bookIds: books.filter(book => book.category === 'literature').map(book => book.id), active: true, homepage: true },
  { id: 'collection-thought', slug: 'falsafa-wa-fikr', title: 'فلسفة وفكر', description: 'أسئلة توسّع الأفق وتعيد ترتيب الداخل.', bookIds: books.filter(book => book.category === 'thought').map(book => book.id), active: true, homepage: true },
  { id: 'collection-publishers', slug: 'ikhtiyarat-al-nashirin', title: 'اختيارات من دور النشر', description: 'كتب مختارة من ناشرين نحب مشروعهم.', bookIds: books.slice(0, 8).map(book => book.id), active: true, homepage: true }
];
let collections = readStorage('ghazal.collections.v1', defaultCollections);
collections = collections.map(collection => ({ ...collection, bookIds: (collection.bookIds || []).filter(id => byId[id]) }));
let featuredBookIds = readStorage('ghazal.featuredBooks.v1', ['meaning','letters','orientalism','meditations']);
let publisherFeatures = readStorage('ghazal.publisherFeatures.v1', [
  { id:'mada', publisher:'دار المدى', active:true, layoutVersion:3, slogan:'بيت الثقافة والإبداع', kicker:'أدبٌ وفكرٌ وفنون', description:'رفّ من الكتب التي تصنع ذائقة، وتترك أثرًا أبعد من الصفحة الأخيرة.', accent:'#e51c2a', surface:'#f4d8c8', ink:'#251b19', mark:'م' },
  { id:'jamal', publisher:'منشورات الجمل', active:true, slogan:'أصواتٌ من العالم', kicker:'أصواتٌ لا تشبه سواها', description:'دار عريقة في الترجمة الأدبية والفلسفية، وكتب تمنح القارئ فرصة الإصغاء إلى أصوات مختلفة.', accent:'#bd1d2d', surface:'#e9d8b9', ink:'#271914', mark:'ج' },
  { id:'arab-network', publisher:'الشبكة العربية للأبحاث والنشر', active:true, slogan:'بوابتك نحو عالم المعرفة', kicker:'معرفةٌ عربيةٌ رصينة', description:'كتب الفكر والتاريخ والسياسة التي تمنح السؤال العربي مساحة أوسع.', accent:'#2e579a', surface:'#dbe8ef', ink:'#18243b', mark:'ش' },
  { id:'rafidain', publisher:'دار الرافدين', active:true, slogan:'من وادي الرافدين بدأت الكتابة والمدنية', kicker:'للكتاب العربي الجميل', description:'إصدارات تحمل حيوية المكتبة العربية، بين التراث والقراءة المعاصرة.', accent:'#20205e', surface:'#e5e1ee', ink:'#171735', mark:'ر' }
]);
let bestSellerBookIds = [];
let catalogBookGenres = [];
let authorSpotlight = null;
if (window.location.protocol !== 'file:') fetch('/api/collections').then(response => response.ok ? response.json() : null).then(payload => { if (payload?.collections?.length) { collections = payload.collections; if (document.readyState !== 'loading') { renderHomeShelves(); if (location.hash.startsWith('#collection/')) showRoute(); } } }).catch(() => {});
window.addEventListener('storage', event => { if (event.key === 'ghazal.customBooks.v1' || event.key === 'ghazal.customPublishers.v1' || event.key === 'ghazal.genres.v1' || event.key === 'ghazal.discounts.v1' || event.key === 'ghazal.collections.v1') location.reload(); });
let discounts = readStorage('ghazal.discounts.v1', []);
let activeDiscountCode = '';
function applyCatalogPayload(payload) {
  if (!payload?.books?.length) return;
  books = payload.books.map(book => ({ ...book, stock: Number(book.stock ?? book.available ?? 0) }));
  byId = Object.fromEntries(books.map(book => [book.id, book]));
  publishers = payload.publishers?.length ? [...publishers.filter(local => !payload.publishers.some(remote => remote.name === local.name)), ...payload.publishers] : publishers;
  genres = payload.genres || genres;
  catalogBookGenres = payload.bookGenres || catalogBookGenres;
  discounts = payload.discounts || [];
  authorProfiles = payload.authorProfiles || authorProfiles;
  collections = payload.collections?.length ? payload.collections : collections;
  const storedFeatured = payload.featuredBookIds || [];
  if (storedFeatured.length) featuredBookIds = storedFeatured;
  bestSellerBookIds = payload.bestSellerBookIds || [];
  authorSpotlight = payload.authorSpotlight || null;
  publisherFeatures = payload.publisherFeatures || publisherFeatures;
  renderFeaturedSelections(); renderHomeShelves(); renderFeaturedPublishers();
  if (location.hash === '#catalog') renderCatalogPage();
  if (location.hash.startsWith('#collection/')) showRoute();
}
if (window.location.protocol !== 'file:' && window.GhazalAPI?.catalog) window.GhazalAPI.catalog().then(applyCatalogPayload).catch(() => {});
if (window.location.protocol !== 'file:' && window.GhazalAPI?.catalog) {
  const refreshLiveCatalog = () => window.GhazalAPI.catalog().then(applyCatalogPayload).catch(() => {});
  setInterval(refreshLiveCatalog, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshLiveCatalog(); });
}
function discountFor(book, code = '') { return discounts.filter(discount => discount.active !== false && (code ? String(discount.code || '').trim().toUpperCase() === code.trim().toUpperCase() : !String(discount.code || '').trim()) && (discount.appliesToAll || (discount.bookIds || []).includes(book.id))).sort((a, b) => { const amount = item => item.type === 'fixed' ? Number(item.value || 0) : book.price * Number(item.value || 0) / 100; return amount(b) - amount(a); })[0] || null; }
function discountedPrice(book, code = activeDiscountCode) { const discount = discountFor(book, code); if (!discount) return Number(book.price); const saving = discount.type === 'fixed' ? Number(discount.value || 0) : Number(book.price) * Number(discount.value || 0) / 100; return Math.max(0, Number(book.price) - saving); }
function priceHtml(book) { const price = discountedPrice(book); return price < Number(book.price) ? `<s class="old-price">${money(book.price)}</s><strong class="sale-price">${money(price)}</strong>` : money(book.price); }
const coverUrl = book => book.image?.startsWith('data:') ? book.image : `assets/covers/${book.image}`;
const money = value => `${new Intl.NumberFormat('ar-DZ-u-nu-latn').format(value)} د.ج`;
const wilayas = `1|Adrar|1100|500,2|Chlef|800|400,3|Laghouat|800|400,4|Oum El Bouaghi|700|400,5|Batna|650|400,6|Béjaïa|700|400,7|Biskra|650|400,8|Béchar|1050|400,9|Blida|750|400,10|Bouira|750|400,11|Tamanrasset|1050|400,12|Tébessa|650|400,13|Tlemcen|800|400,14|Tiaret|800|400,15|Tizi Ouzou|750|400,16|Alger|600|400,17|Djelfa|800|400,18|Jijel|700|400,19|Sétif|700|400,20|Saïda|800|400,21|Skikda|700|400,22|Sidi Bel Abbès|800|400,23|Annaba|700|400,24|Guelma|700|400,25|Constantine|700|400,26|Médéa|750|400,27|Mostaganem|800|400,28|M'Sila|750|400,29|Mascara|800|400,30|Ouargla|750|400,31|Oran|850|400,32|El Bayadh|1000|500,33|Illizi|1400|700,34|Bordj Bou Arreridj|700|400,35|Boumerdès|750|400,36|El Tarf|700|400,37|Tindouf|1400|700,38|Tissemsilt|850|450,39|El Oued|450|350,40|Khenchela|700|400,41|Souk Ahras|700|400,42|Tipaza|750|400,43|Mila|700|400,44|Aïn Defla|850|450,45|Naâma|950|500,46|Aïn Témouchent|850|450,47|Ghardaïa|850|400,48|Relizane|850|450,49|Timimoun|1050|550,50|Bordj Badji Mokhtar|1800|800,51|Ouled Djellal|650|550,52|Beni Abbes|1050|550,53|In Salah|1350|750,54|In Guezzam|1350|750,55|Touggourt|650|400,56|Djanet|1800|800,57|El M'Ghair|650|500,58|El Meniaa|950|550`.split(',').map(row => {
  const [code, name, home, office] = row.split('|').map((value, index) => index < 2 ? value : Number(value));
  const service = { home, office };
  return { code: Number(code), name, rates: { delivery: service, pickup: service, exchange: service, refund: { home: 0, office: 0 }, returned: { home: 0, office: 0 } } };
});
const wilayaByCode = Object.fromEntries(wilayas.map(wilaya => [wilaya.code, wilaya]));
let communes = Array.isArray(window.GHAZAL_COMMUNES) ? window.GHAZAL_COMMUNES : [];
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

let cart = readStorage('ghazal.cart.v2', []).filter(item => byId[item.id] && Number.isInteger(item.qty) && item.qty > 0);
let favorites = readStorage('ghazal.favorites.v2', []).filter(id => byId[id]);
let activeFilter = 'all';
let showAllBooks = false;
let checkoutStep = 1;
let checkoutData = null;
let revealObserver;

// Replace the concept covers in the editorial compositions with published editions.
const editionMap = { 'cover-stranger': 'stranger', 'cover-world': 'world-yesterday', 'cover-solitude': 'solitude', 'cover-meaning': 'meaning', 'cover-letters': 'letters', 'cover-orientalism': 'orientalism', 'cover-meditations': 'meditations' };
$$('.cover').forEach(placeholder => {
  const coverClass = Object.keys(editionMap).find(name => placeholder.classList.contains(name));
  if (!coverClass || placeholder.closest('#book-grid')) return;
  const book = byId[editionMap[coverClass]];
  const image = document.createElement('img');
  image.src = coverUrl(book);
  image.alt = `غلاف الطبعة العربية من كتاب ${book.title}`;
  image.className = `${placeholder.className} edition-image`;
  image.loading = placeholder.closest('.hero-art') ? 'eager' : 'lazy';
  image.decoding = 'async';
  placeholder.replaceWith(image);
});
$$('[data-add]').forEach(button => {
  const book = books.find(item => item.title === button.dataset.add || (button.dataset.add === 'تأملات' && item.id === 'meditations'));
  if (book) button.dataset.add = book.id;
});
$$('.favorite:not([data-favorite])').forEach(button => {
  const title = button.closest('.book-card')?.querySelector('h3')?.textContent.trim();
  const book = books.find(item => item.title === title || (title === 'تأملات' && item.id === 'meditations'));
  if (book) button.dataset.favorite = book.id;
});
$$('.favorite[data-favorite]').forEach(button => {
  const saved = favorites.includes(button.dataset.favorite);
  button.setAttribute('aria-pressed', String(saved));
  button.setAttribute('aria-label', `${saved ? 'أزل من المحفوظات' : 'احفظ'} ${byId[button.dataset.favorite].title}`);
  button.textContent = saved ? '♥' : '♡';
});
$$('.feature-description h3,.selection-info h3,.selection-info p').forEach(element => {
  if (element.textContent.trim() === 'تأملات') element.textContent = 'التأملات';
});

function cardTemplate(book, index) {
  const saved = favorites.includes(book.id);
  const available = Number(book.stock) > 0;
  return `<article class="book-card ${available ? '' : 'is-unavailable'}" data-id="${book.id}" data-category="${book.category}" style="--stagger:${(index % 4) * 65}ms">
    <a class="book-card-art" data-view="${book.id}" href="#book/${encodeURIComponent(book.id)}" aria-label="اعرض تفاصيل ${book.title}"><img class="edition-image catalog-cover" src="${coverUrl(book)}" alt="غلاف ${book.title}" loading="lazy" decoding="async" /><span class="quick-view">نظرة أقرب <span aria-hidden="true">↖</span></span></a>
    <div class="book-meta"><span>${available ? book.genre : 'غير متوفر حاليًا'}</span><button class="favorite" data-favorite="${book.id}" aria-label="${saved ? 'أزل من المحفوظات' : 'احفظ'} ${book.title}" aria-pressed="${saved}">${saved ? '♥' : '♡'}</button></div>
    <h3><button data-view="${book.id}">${book.title}</button></h3><p>${book.author}</p><div class="card-bottom"><span class="price">${priceHtml(book)}</span>${available ? `<button class="card-add" data-add="${book.id}" aria-label="أضف ${book.title} إلى السلة">أضف إلى السلة <span aria-hidden="true">↖</span></button>` : '<span class="stock-empty">نفد المخزون</span>'}</div>
  </article>`;
}
function shelfCardTemplate(book) {
  const saved = favorites.includes(book.id);
  const available = Number(book.stock) > 0;
  return `<article class="shelf-card${available ? '' : ' is-unavailable'}" data-id="${book.id}" data-category="${book.category}">
    <div class="shelf-card-media"><a class="shelf-card-cover" data-view="${book.id}" href="#book/${encodeURIComponent(book.id)}" aria-label="اعرض تفاصيل ${book.title}"><img class="catalog-cover" src="${coverUrl(book)}" alt="غلاف ${book.title}" loading="lazy" decoding="async" /></a><button class="favorite shelf-card-fav" data-favorite="${book.id}" aria-label="${saved ? 'أزل من المحفوظات' : 'احفظ'} ${book.title}" aria-pressed="${saved}">${saved ? '♥' : '♡'}</button></div>
    <div class="shelf-card-body"><h3><button data-view="${book.id}">${book.title}</button></h3><p>${book.author}</p><span class="price">${priceHtml(book)}</span></div>
    ${available ? `<button class="shelf-card-add" data-add="${book.id}" aria-label="أضف ${book.title} إلى السلة">أضف إلى السلة <span aria-hidden="true">＋</span></button>` : '<span class="shelf-card-add shelf-card-empty">نفد المخزون</span>'}
  </article>`;
}
function renderShelfGrid(targetId, list) {
  const target = document.getElementById(targetId); if (!target) return;
  const items = list.filter(Boolean);
  target.innerHTML = items.length ? `<div class="shelf-grid">${items.map(shelfCardTemplate).join('')}</div>` : '';
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
}
function renderCarousel(targetId, carouselId, list) {
  const target = document.getElementById(targetId); if (!target) return;
  const items = list.filter(Boolean);
  if (!items.length) { target.innerHTML = ''; return; }
  target.innerHTML = `<div class="shelf-carousel" data-carousel="${carouselId}"><div class="shelf-carousel-viewport" tabindex="0" role="group" aria-label="رف كتب قابل للتمرير"><div class="shelf-carousel-track">${items.map(shelfCardTemplate).join('')}</div></div><div class="shelf-carousel-controls"><button class="shelf-carousel-arrow" type="button" data-shelf-prev="${carouselId}" aria-label="الكتب السابقة">→</button><span class="shelf-carousel-count" aria-live="polite">1 / ${items.length}</span><button class="shelf-carousel-arrow" type="button" data-shelf-next="${carouselId}" aria-label="الكتب التالية">←</button></div></div>`;
  const carousel = target.querySelector('.shelf-carousel');
  const viewport = carousel.querySelector('.shelf-carousel-viewport');
  viewport.addEventListener('scroll', () => syncShelfCount(carousel), { passive: true });
  syncShelfCount(carousel);
}
window.addEventListener('resize', () => $$('.shelf-carousel').forEach(syncShelfCount));
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
  shelfDrag.viewport.scrollLeft = shelfDrag.startScroll + dx;
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
  const filtered = activeFilter === 'all' ? books : books.filter(book => book.category === activeFilter);
  renderCarousel('book-grid', 'new-arrivals', filtered.slice(0, 12));
}
function applyFilter(filter) {
  activeFilter = filter;
  showAllBooks = false;
  $$('.filter').forEach(button => button.classList.toggle('active', button.dataset.filter === filter));
  renderBooks();
}
$$('.filter').forEach(button => button.addEventListener('click', () => applyFilter(button.dataset.filter)));
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
document.addEventListener('keydown', event => { if (event.key === 'Escape') $$('.overlay:not([hidden])').forEach(overlay => hideOverlay(overlay.id)); });

document.body.insertAdjacentHTML('beforeend', '<div id="site-toast" class="site-toast" role="status" aria-live="polite"></div>');
function toast(message) {
  const element = $('#site-toast');
  element.textContent = message;
  element.classList.add('visible');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove('visible'), 2800);
}
const cartCount = () => cart.reduce((sum, item) => sum + item.qty, 0);
const subtotal = () => cart.reduce((sum, item) => sum + discountedPrice(byId[item.id]) * item.qty, 0);
const originalSubtotal = () => cart.reduce((sum, item) => sum + byId[item.id].price * item.qty, 0);
const discountTotal = () => originalSubtotal() - subtotal();
function syncCart() { saveStorage('ghazal.cart.v2', cart); renderCart(); }
function changeQuantity(id, delta) {
  const book = byId[id];
  if (!book) return;
  const item = cart.find(entry => entry.id === id);
  if (!item && delta > 0) { if (Number(book.stock) <= 0) { toast('هذا الكتاب غير متوفر حاليًا'); return; } cart.push({ id, qty: 1 }); }
  else if (item) { item.qty += delta; if (item.qty > Number(book.stock)) { item.qty = Number(book.stock); toast('وصلت إلى الكمية المتوفرة'); } if (item.qty <= 0) cart = cart.filter(entry => entry.id !== id); }
  syncCart();
}
$('.cart-footer').innerHTML = `<div class="cart-totals"><span>المجموع الفرعي</span><strong id="cart-subtotal">٠ د.ج</strong></div><p>تُحسب رسوم التوصيل في الخطوة التالية. الدفع نقدًا عند الاستلام.</p><button id="cart-order" class="button button-dark" type="button">متابعة إلى إتمام الطلب <span aria-hidden="true">↖</span></button>`;
function renderCart() {
  const count = cartCount();
  $('#cart-count').textContent = count;
  $('#cart-open').setAttribute('aria-label', `سلة الكتب، ${count} كتاب`);
  $('#cart-items').innerHTML = count ? cart.map(({ id, qty }) => {
    const book = byId[id];
    return `<div class="cart-item"><button class="cart-book-link" data-view="${id}" aria-label="اعرض تفاصيل ${book.title}"><img src="${coverUrl(book)}" alt="" /><span><strong>${book.title}</strong><small>${book.author}</small></span></button><div class="cart-item-copy"><span>${priceHtml(book)}</span><div class="quantity-control"><button data-qty="-1" data-id="${id}" aria-label="أنقص ${book.title}">−</button><output>${qty}</output><button data-qty="1" data-id="${id}" aria-label="زد ${book.title}">+</button></div></div><button class="remove-item" data-remove="${id}" aria-label="احذف ${book.title}">×</button></div>`;
  }).join('') : '<div class="empty-cart"><span>✳</span><p>سلتك تنتظر كتابًا جيدًا.</p><a href="#new" data-close="cart-overlay">تصفّح الكتب <span>↖</span></a></div>';
  $('#cart-subtotal').textContent = money(subtotal());
  $('#cart-order').disabled = count === 0;
  $$('[data-close]', $('#cart-items')).forEach(link => link.addEventListener('click', () => hideOverlay('cart-overlay')));
}
renderCart();
$('#cart-items').addEventListener('click', event => {
  const quantity = event.target.closest('[data-qty]');
  const remove = event.target.closest('[data-remove]');
  if (quantity) changeQuantity(quantity.dataset.id, Number(quantity.dataset.qty));
  if (remove) { cart = cart.filter(entry => entry.id !== remove.dataset.remove); syncCart(); }
});

document.body.insertAdjacentHTML('beforeend', `
  <div class="overlay" id="product-overlay" hidden><div class="product-panel" role="dialog" aria-modal="true" aria-label="تفاصيل الكتاب"><button class="close-button" data-close="product-overlay" aria-label="إغلاق">×</button><div id="product-detail"></div></div></div>
  <div class="overlay checkout-overlay" id="checkout-overlay" hidden><div class="checkout-panel" role="dialog" aria-modal="true" aria-label="إتمام طلب الكتب">
    <button class="close-button" data-close="checkout-overlay" aria-label="إغلاق">×</button>
    <p class="eyebrow">الغزال للكتب / إتمام الطلب</p><h2>من رفوفنا <em>إلى بابك.</em></h2>
    <div class="demo-notice"><span>✳</span> معاينة تجريبية: تُحفظ الطلبات على هذا الجهاز فقط، ولا تُرسل إلى متجر.</div>
    <div class="checkout-steps"><span data-step-label="1">١ · بيانات التوصيل</span><span data-step-label="2">٢ · مراجعة الطلب</span><span data-step-label="3">٣ · التأكيد</span></div>
    <div class="checkout-body">
      <section class="checkout-step" data-step="1"><form id="checkout-form"><div class="field-pair"><label>الاسم واللقب <input name="customer" autocomplete="name" required minlength="3" placeholder="الاسم كما يظهر على الطرد" /></label><label>رقم الهاتف <input name="phone" type="tel" autocomplete="tel" required minlength="10" maxlength="10" placeholder="05xxxxxxxx" /></label></div><div class="field-pair"><label>الولاية <select name="wilayaCode" required>${wilayas.map(wilaya => `<option value="${wilaya.code}" ${wilaya.code === 16 ? 'selected' : ''}>${String(wilaya.code).padStart(2, '0')} — ${wilaya.name}</option>`).join('')}</select></label><label>البلدية <select name="commune" id="commune-select" autocomplete="address-level3" required disabled><option value="">جار تحميل البلديات…</option></select></label></div><fieldset class="delivery-field"><legend>نوع الشحن</legend><label><input type="radio" name="shipmentType" value="home" checked /><span><strong>إيصال للمنزل</strong><small id="home-shipping-price"></small></span></label><label><input type="radio" name="shipmentType" value="office" /><span><strong>استلام من المكتب (Stop Desk)</strong><small id="office-shipping-price"></small></span></label></fieldset><button class="button button-dark checkout-primary" type="submit">مراجعة الطلب <span>↖</span></button></form></section>
      <section class="checkout-step" data-step="2" hidden><div id="checkout-review"></div><div class="checkout-actions"><button id="checkout-back" class="button button-outline" type="button">تعديل البيانات <span>→</span></button><button id="checkout-confirm" class="button button-dark" type="button">تأكيد الطلب <span>↖</span></button></div></section>
      <section class="checkout-step" data-step="3" hidden><div class="confirmation"><span class="confirmation-star">✳</span><h3>وصل طلبك إلى دفتر الغزال.</h3><p>احتفظ برقم الطلب لمتابعة حالته من أي جهاز.</p><div id="order-receipt"></div><label class="order-lookup">متابعة طلب سابق<input id="order-lookup-reference" placeholder="GZ-..." autocomplete="off" /><button id="order-lookup-button" class="button button-outline" type="button">بحث عن الطلب</button></label><p id="order-lookup-result" class="owner-note" aria-live="polite"></p><button id="checkout-done" class="button button-dark" type="button">العودة إلى الكتب <span>↖</span></button></div></section>
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
  let view = event.target.closest('[data-view]');
  if (!view) {
    const staticBook = event.target.closest('.hero-book,.feature-description h3,.selection-info h3,.selection-item .cover');
    const staticCover = staticBook?.closest('.selection-item')?.querySelector('.cover') || staticBook;
    const staticIds = staticBook && (staticBook.classList.contains('hero-book-back') ? 'world-yesterday' : staticBook.classList.contains('hero-book-left') ? 'stranger' : staticBook.classList.contains('hero-book-front') ? 'solitude' : staticCover?.classList.contains('cover-letters') ? 'letters' : staticCover?.classList.contains('cover-orientalism') ? 'orientalism' : staticCover?.classList.contains('cover-meditations') ? 'meditations' : staticBook.matches('.feature-description h3') ? 'meaning' : '');
    if (staticIds) view = { dataset: { view: staticIds } };
  }
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
      button.textContent = saved ? '♥' : '♡';
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
function populateCommunes() { const form = $('#checkout-form'); const select = $('#commune-select'); if (!form || !select) return; const code = String(form.elements.wilayaCode.value).padStart(2, '0'); const matches = communes.filter(commune => commune.wilaya_code === code); select.innerHTML = matches.length ? `<option value="">اختر البلدية</option>${matches.map(commune => `<option value="${commune.id}">${commune.commune_name_ascii} — ${commune.commune_name} · ${commune.daira_name_ascii || commune.daira_name || ''}</option>`).join('')}` : '<option value="">تعذر تحميل البلديات</option>'; select.disabled = matches.length === 0; }
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
  form.elements.commune.setCustomValidity('');
  const shippingCost = shippingRate(wilaya.code, data.shipmentType);
  checkoutData = { ...data, communeId: commune.id, city: commune.commune_name_ascii, commune: commune.commune_name_ascii, communeArabic: commune.commune_name, daira: commune.daira_name_ascii || commune.daira_name || '', weight: 0, wilayaCode: wilaya.code, wilaya: wilaya.name, shippingCost, shipmentType: data.shipmentType, discountCode: activeDiscountCode, discountAmount: discountTotal() };
  const lines = cart.map(({ id, qty }) => `<div class="review-line"><span>${byId[id].title} <small>× ${qty}</small></span><strong>${money(discountedPrice(byId[id]) * qty)}</strong></div>`).join('');
  const discountLine = discountTotal() > 0 ? `<div class="review-line discount-line"><span>الخصم${activeDiscountCode ? ` (${activeDiscountCode})` : ''}</span><strong>− ${money(discountTotal())}</strong></div>` : '';
  $('#checkout-review').innerHTML = `<div class="review-block"><h3>كتبك المختارة</h3>${lines}${discountLine}<div class="review-line"><span>توصيل ${checkoutData.shipmentType === 'office' ? 'إلى المكتب' : 'إلى المنزل'}</span><strong>${money(shippingCost)}</strong></div><div class="review-line review-total"><span>الإجمالي عند الاستلام</span><strong>${money(subtotal() + shippingCost)}</strong></div></div><div class="review-block"><h3>التوصيل والدفع</h3><p id="review-address"></p><p>الولاية رقم ${wilaya.code} · ${checkoutData.shipmentType === 'office' ? 'استلام من المكتب (Stop Desk)' : 'إيصال إلى المنزل'}</p><p>الدفع نقدًا عند الاستلام</p></div>`;
  $('#review-address').textContent = `${data.customer} · ${data.phone} · ${checkoutData.communeArabic}، ${wilaya.name}`;
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
  const deliveryAddress = `${checkoutData.communeArabic}، ${checkoutData.wilaya}`;
  let serverResult = null;
  try {
    serverResult = await window.GhazalAPI?.createOrder({
      customer: { customer: checkoutData.customer, phone: checkoutData.phone },
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
  const results = books.filter(book => normalizeArabicSearch(`${book.title} ${book.author} ${book.publisher}`).includes(query));
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
    if (!element.classList.contains('reveal')) { element.classList.add('reveal'); revealObserver.observe(element); }
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
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const predefinedBookGenres = ['الأدب العربي','الأدب العالمي','الرواية','القصص القصيرة','الشعر','المسرح','الفلسفة','علم النفس','علم الاجتماع','السياسة','التاريخ','السيرة الذاتية','الاقتصاد','العلوم','الفنون','التربية','التنمية الذاتية','الدين والفكر الإسلامي','أدب الأطفال','الرحلات'];
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
  const min = catalogPriceMin === '' ? null : Number(catalogPriceMin);
  const max = catalogPriceMax === '' ? null : Number(catalogPriceMax);
  let result = books.filter(book => {
    const price = Number(book.price) || 0;
    return (catalogFilter === 'all' || book.category === catalogFilter) &&
      (catalogPublisher === 'all' || book.publisher === catalogPublisher) &&
      genreMatches(book, catalogGenre) &&
      (min === null || price >= min) && (max === null || price <= max) &&
      (!query || normalize(`${book.title} ${book.author} ${book.publisher} ${book.genre} ${book.isbn || ''}`).includes(query));
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
  const genresList = [...new Set([...predefinedBookGenres, ...catalogBookGenres, ...books.map(book => String(book.genre || '').trim())].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar'));
  publisherSelect.innerHTML = `<option value="all">كل دور النشر</option>${publishersList.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('')}`;
  genreSelect.innerHTML = `<option value="all">كل الأنواع</option>${genresList.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('')}`;
  publisherSelect.value = publishersList.includes(catalogPublisher) ? catalogPublisher : 'all';
  genreSelect.value = genresList.includes(catalogGenre) ? catalogGenre : 'all';
  catalogPublisher = publisherSelect.value; catalogGenre = genreSelect.value;
  $('#catalog-price-min').value = catalogPriceMin; $('#catalog-price-max').value = catalogPriceMax;
}
function authorBooks(author) { return books.filter(book => book.author === author); }
const publisherDemoBooks = { 'دار المدى':['world-yesterday','letters','name-of-rose'], 'منشورات الجمل':['stranger','plague','sophies-world'], 'الشبكة العربية للأبحاث والنشر':['orientalism','brief-time','art-of-loving'], 'دار الرافدين':['solitude','meditations','meaning'] };
function publisherBooks(publisher) { const own = books.filter(book => book.publisher === publisher); if (own.length) return own; return (publisherDemoBooks[publisher] || []).map(id => byId[id]).filter(Boolean).map(book => ({ ...book, publisher })); }
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
  if (!book) { location.hash = '#catalog'; return; }
  const suggestions = relatedBooks(book);
  const publisherShelf = publisherBooks(book.publisher).filter(item => item.id !== book.id);
  const authorShelf = authorBooks(book.author).filter(item => item.id !== book.id);
  const publisherSection = publisherShelf.length ? `<section class="related-books book-detail-shelf"><div class="section-heading compact"><div><p class="eyebrow">من رفوف ${escapeHtml(book.publisher)}</p><h2>إصدارات <em>الدار</em></h2></div><a class="underlined-link" href="#publisher/${encodeURIComponent(book.publisher)}">كل إصدارات الدار <span>↖</span></a></div><div id="publisher-books-carousel"></div></section>` : '';
  const authorSection = authorShelf.length >= 3 ? `<section class="related-books book-detail-shelf"><div class="section-heading compact"><div><p class="eyebrow">قراءة أخرى من المؤلف</p><h2>كتب أخرى لـ <em>${escapeHtml(book.author)}</em></h2></div><a class="underlined-link" href="#author/${encodeURIComponent(book.author)}">ملف المؤلف <span>↖</span></a></div><div id="author-books-carousel"></div></section>` : '';
  const available = Number(book.stock) > 0;
  $('#book-page-content').innerHTML = `<a class="detail-back" href="#catalog">← العودة إلى كل الكتب</a><div class="book-detail"><div class="book-detail-cover"><img src="${coverUrl(book)}" alt="غلاف ${escapeHtml(book.title)}" /></div><div class="book-detail-copy"><p class="eyebrow">${escapeHtml(book.genre)} / صفحة الكتاب</p><h1 id="book-page-title">${escapeHtml(book.title)}</h1><p class="detail-author">بقلم <a href="#author/${encodeURIComponent(book.author)}">${escapeHtml(book.author)}</a> · <a href="#publisher/${encodeURIComponent(book.publisher)}">${escapeHtml(book.publisher)}</a></p><p class="detail-note">${escapeHtml(book.note)}</p><div class="detail-meta"><div><span>التصنيف الفرعي</span><strong>${escapeHtml(book.genre)}</strong></div><div><span>المؤلف</span><strong>${escapeHtml(book.author)}</strong></div><div><span>السعر</span><strong>${money(book.price)}</strong></div><div><span>التوفر</span><strong>${available ? 'متوفر' : 'غير متوفر حاليًا'}</strong></div></div>${available ? `<button class="button button-dark" data-add="${book.id}">أضف إلى السلة <span>↖</span></button>` : '<p class="stock-empty detail-stock-empty">هذا الكتاب غير متوفر حاليًا.</p>'}</div></div><section class="related-books"><div class="section-heading compact"><div><p class="eyebrow">اقتراحات ذكية من رفوف الغزال</p><h2>قد يعجبك <em>أيضًا</em></h2></div><a class="underlined-link" href="#catalog">استكشف كل الكتب <span>↖</span></a></div><div id="related-books-carousel"></div></section>${publisherSection}${authorSection}`;
  const detailPrice = $('#book-page-content .detail-meta div:nth-child(3) strong'); if (detailPrice) detailPrice.innerHTML = priceHtml(book);
  if (book.review) $('#book-page-content .detail-note').textContent = book.review;
  if (publisherShelf.length) renderCarousel('publisher-books-carousel', `publisher-${book.id}`, publisherShelf);
  if (authorShelf.length >= 3) renderCarousel('author-books-carousel', `author-${book.id}`, authorShelf);
  renderCarousel('related-books-carousel', `related-${book.id}`, suggestions);
  observeReveals();
}
function renderPublisherPage(name) {
  const publisher = publisherByName(name) || publishers[0];
  publisherQuery = ''; publisherFilter = 'all'; publisherGenre = 'all';
  const logo = publisher.logo?.startsWith('data:') ? `<img src="${publisher.logo}" alt="شعار ${escapeHtml(publisher.name)}" />` : escapeHtml(publisher.logo || publisher.name.slice(0, 1));
  const publisherFilters = [{ value:'category:literature', label:'الأدب العالمي' }, { value:'category:thought', label:'الفكر والفلسفة' }, { value:'category:history', label:'التاريخ والإنسانيات' }, ...[...new Set([...predefinedBookGenres, ...catalogBookGenres, ...publisherBooks(publisher.name).map(book => book.genre).filter(Boolean)])].sort((a,b) => a.localeCompare(b, 'ar')).map(genre => ({ value:`genre:${genre}`, label:genre }))];
  $('#publisher-page-content').innerHTML = `<a class="detail-back" href="#catalog">← العودة إلى الفهرس</a><div class="profile-header"><div class="profile-logo" aria-hidden="true">${logo}</div><div><p class="eyebrow">دار نشر / ملف الناشر</p><h1 class="profile-title" id="publisher-page-title">${escapeHtml(publisher.name)}</h1><p>${escapeHtml(publisher.description)}</p><small>${escapeHtml(publisher.city)} · ${escapeHtml(publisher.since)}</small></div></div><div class="profile-books"><div class="card-heading"><h2>كتب <em>الدار</em></h2><span id="publisher-count" class="catalog-summary"></span></div><div class="catalog-toolbar"><label class="catalog-search"><span>⌕</span><input id="publisher-search" type="search" placeholder="ابحث داخل إصدارات الدار" /></label><select id="publisher-sort" aria-label="ترتيب إصدارات الدار"><option value="featured">الأحدث</option><option value="title">العنوان: أ ـ ي</option><option value="price-low">السعر: الأقل أولًا</option></select></div><label class="publisher-genre-filter">التصنيف أو النوع<select id="publisher-genre-filter"><option value="all">كل الإصدارات</option>${publisherFilters.map(filter => `<option value="${escapeHtml(filter.value)}">${escapeHtml(filter.label)}</option>`).join('')}</select></label><div class="catalog-grid" id="publisher-books"></div></div>`;
  const update = () => { const [filterType, filterValue] = publisherGenre.split(':'); let list = publisherBooks(publisher.name).filter(book => (publisherGenre === 'all' || (filterType === 'category' ? book.category === filterValue : genreMatches(book, filterValue))) && (!publisherQuery || normalize(`${book.title} ${book.author} ${book.genre}`).includes(normalize(publisherQuery)))); const sort = $('#publisher-sort').value; if (sort === 'title') list.sort((a,b) => a.title.localeCompare(b.title, 'ar')); if (sort === 'price-low') list.sort((a,b) => a.price - b.price); $('#publisher-count').textContent = `${list.length} إصدارات`; renderProfileBooks(list, $('#publisher-books')); $('#publisher-genre-filter').value = publisherGenre; };
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
  const genre = genres[category] || genres.literature;
  let query = '';
  $('#genre-page-content').innerHTML = `<a class="detail-back" href="#catalog">← العودة إلى كل الكتب</a><div class="page-hero genre-hero"><div><p class="eyebrow">الغزال / تصفّح حسب التصنيف</p><h1 id="genre-page-title">${escapeHtml(genre.title)}</h1><p>${escapeHtml(genre.description)}</p></div></div><div class="genre-switcher">${Object.entries(genres).map(([id, item]) => `<a class="${id === category ? 'active' : ''}" href="#genre/${id}">${escapeHtml(item.title)}</a>`).join('')}</div><div class="catalog-toolbar"><label class="catalog-search"><span>⌕</span><input id="genre-search" type="search" placeholder="ابحث داخل ${escapeHtml(genre.title)}" /></label></div><div class="catalog-summary"><strong id="genre-count"></strong><span>كتب مختارة من هذا التصنيف</span></div><div class="catalog-grid" id="genre-books"></div>`;
  const update = () => { const result = books.filter(book => book.category === category && (!query || normalize(`${book.title} ${book.author} ${book.publisher}`).includes(normalize(query)))); $('#genre-count').textContent = `${result.length} كتاب`; $('#genre-books').innerHTML = result.map(cardTemplate).join(''); observeReveals(); };
  $('#genre-search').addEventListener('input', event => { query = event.target.value; update(); }); update();
}
function renderBestsellersPage() {
  const ranked = bestSellerBookIds.map(id => byId[id]).filter(Boolean);
  const selected = ranked.length ? ranked : books.filter(book => book.category === 'literature').slice(0, 8);
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
  const selected = [...new Set([...(featuredBookIds || []), 'meaning', 'letters', 'orientalism', 'meditations'])].map(id => byId[id]).filter(Boolean).slice(0, 8);
  const spotlight = authorSpotlight ? `<article class="author-spotlight"><div class="author-spotlight-art">${authorSpotlight.photo ? `<img src="${authorSpotlight.photo.startsWith('data:') ? authorSpotlight.photo : escapeHtml(authorSpotlight.photo)}" alt="صورة ${escapeHtml(authorSpotlight.name)}" loading="lazy" />` : `<span>${escapeHtml(authorSpotlight.name).slice(0,1)}</span>`}</div><div class="author-spotlight-copy"><p class="eyebrow">إضاءة على مؤلف</p><h2>صوت <em>${escapeHtml(authorSpotlight.name)}</em></h2><p>${escapeHtml(authorSpotlight.bio || '')}</p><a class="underlined-link" href="#author/${encodeURIComponent(authorSpotlight.name)}">اكتشف ملف المؤلف ↖</a></div></article>` : '';
  $('#selections-page-content').innerHTML = `<div class="page-hero"><div><p class="eyebrow">الغزال / اختيارات المحرر</p><h1 id="selections-page-title">مختارات <em>الغزال</em></h1><p>اختيارات قابلة للتصفح والشراء، تتجدد من الفهرس الحقيقي للمكتبة.</p></div></div>${spotlight}<div class="catalog-grid">${selected.map(cardTemplate).join('')}</div>`;
  observeReveals();
}
function renderNewPage() {
  $('#new-page-content').innerHTML = `<div class="page-hero"><div><p class="eyebrow">الغزال / الرفوف الجديدة</p><h1 id="new-page-title">وصل <em>حديثًا</em></h1><p>كل الكتب المتاحة في الفهرس، مع إمكانية فتح التفاصيل أو الإضافة إلى السلة.</p></div></div><div class="catalog-grid">${books.map(cardTemplate).join('')}</div>`;
  observeReveals();
}
function renderDepartmentsPage() {
  const bestsellerIds = bestSellerBookIds.length ? bestSellerBookIds : ['solitude', 'letters', 'meditations'];
  $('#departments-page-content').innerHTML = `<div class="page-hero"><div><p class="eyebrow">الغزال / تصفّح هادئ</p><h1 id="departments-page-title">الأقسام <em>والأبواب</em></h1><p>اختر مسارًا واضحًا إلى الكتب التي تناسب فضولك.</p></div></div><div class="department-links page-department-links">${Object.entries(genres).map(([id, genre], index) => `<a href="#genre/${encodeURIComponent(id)}"><span class="dep-num">${String(index + 1).padStart(2, '0')}</span><span>${escapeHtml(genre.title)}<small>${escapeHtml(genre.description)}</small></span><b>↖</b></a>`).join('')}</div><div class="section-heading compact page-subheading"><div><p class="eyebrow">من رفوف القراء</p><h2>الأكثر <em>قراءةً</em></h2></div></div><div class="catalog-grid">${bestsellerIds.map(id => byId[id]).filter(Boolean).slice(0, 8).map(cardTemplate).join('')}</div>`;
  observeReveals();
}
function renderPublishersPage() {
  $('#publishers-page-content').innerHTML = `<div class="page-hero"><div><p class="eyebrow">الغزال / شركاء الكتاب</p><h1 id="publishers-page-title">دور <em>النشر</em></h1><p>اكتشف مشاريع الناشرين والكتب المتاحة من كل دار.</p></div></div><div class="publisher-grid page-publisher-grid">${publishers.map(publisher => `<a class="publisher" href="#publisher/${encodeURIComponent(publisher.name)}"><span class="publisher-monogram">${escapeHtml(publisher.logo || publisher.name.slice(0,1))}</span><strong>${escapeHtml(publisher.name)}</strong><small>${escapeHtml(publisher.since || publisher.city || '')}</small></a>`).join('')}</div>`;
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
  const isPage = ['catalog', 'selections', 'new', 'departments', 'publishers', 'book', 'publisher', 'author', 'genre', 'bestsellers', 'collection', 'favorites'].includes(route);
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
  $('#admin-form').innerHTML = kind === 'book' ? `<div class="form-grid"><label>عنوان الكتاب<input name="title" required /></label><label>المؤلف<input name="author" required /></label></div><div class="form-grid"><label>دار النشر<input name="publisher" required /></label><label>السعر بالدينار<input name="price" type="number" min="0" required /></label></div><div class="form-grid"><label>التصنيف<select name="category"><option value="literature">الأدب العالمي</option><option value="thought">الفكر والفلسفة</option><option value="history">التاريخ والإنسانيات</option></select></label><label>النوع<input name="genre" placeholder="رواية مترجمة" required /></label></div><label>نبذة<textarea name="note" rows="3" required></textarea></label><label class="bulk-drop">غلاف الكتاب (اختياري)<input name="cover" type="file" accept="image/*" /></label><div class="form-help">لإضافة مجموعة كتب دفعة واحدة، اختر ملف CSV من زر الاستيراد في الأسفل. الأعمدة: العنوان، المؤلف، الناشر، السعر، التصنيف، النوع، النبذة.</div><button class="button button-dark" type="submit">حفظ الكتاب <span>↖</span></button><button class="text-button" type="button" id="bulk-import">＋ استيراد ملف CSV</button><input id="bulk-file" type="file" accept=".csv,text/csv" hidden />` : `<div class="form-grid"><label>اسم دار النشر<input name="name" required /></label><label>المدينة<input name="city" required /></label></div><label>وصف مختصر<textarea name="description" rows="3" required></textarea></label><button class="button button-dark" type="submit">حفظ دار النشر <span>↖</span></button>`;
  showOverlay('admin-overlay');
  $('#admin-form').dataset.kind = kind;
  $('#admin-form').onsubmit = event => { event.preventDefault(); saveAdminForm(kind, new FormData(event.currentTarget)); };
  const bulk = $('#bulk-import'); if (bulk) { bulk.onclick = () => $('#bulk-file').click(); $('#bulk-file').onchange = event => importCsv(event.target.files[0]); }
}
async function saveAdminForm(kind, data) {
  if (kind === 'publisher') { const name = data.get('name'); const publisher = { id: `publisher-${Date.now()}`, name, city: data.get('city'), since: 'إضافة جديدة', description: data.get('description'), logo: name.slice(0, 1) }; publishers.push(publisher); saveStorage('ghazal.customPublishers.v1', [...readStorage('ghazal.customPublishers.v1', []), publisher]); toast(`أضيفت «${name}» إلى دور النشر`); }
  else { const title = data.get('title'); const id = `book-${Date.now()}`; const book = { id, title, author: data.get('author'), publisher: data.get('publisher'), category: data.get('category'), genre: data.get('genre'), price: Number(data.get('price')), note: data.get('note'), image: 'meaning.jpg' }; books.push(book); byId[id] = book; const custom = readStorage('ghazal.customBooks.v1', []); saveStorage('ghazal.customBooks.v1', [...custom, book]); toast(`أضيف «${title}» إلى الفهرس`); }
  hideOverlay('admin-overlay'); renderDashboard(); if (location.hash === '#catalog') renderCatalogPage();
}
function importCsv(file) {
  if (!file) return;
  const reader = new FileReader(); reader.onload = event => { const rows = String(event.target.result).split(/\r?\n/).filter(Boolean).slice(1); const added = []; rows.forEach((row, index) => { const values = row.split(',').map(value => value.trim()); if (values.length < 4) return; const book = { id: `book-${Date.now()}-${index}`, title: values[0], author: values[1], publisher: values[2], price: Number(values[3]) || 0, category: values[4] || 'literature', genre: values[5] || 'كتاب', note: values[6] || 'كتاب جديد على رفوف الغزال.', image: 'meaning.jpg' }; books.push(book); byId[book.id] = book; added.push(book); }); const current = readStorage('ghazal.customBooks.v1', []); saveStorage('ghazal.customBooks.v1', [...current, ...added]); hideOverlay('admin-overlay'); renderDashboard(); if (location.hash === '#catalog') renderCatalogPage(); toast(added.length ? `أضيفت ${added.length} كتب إلى الفهرس` : 'تعذّر العثور على صفوف صالحة في الملف'); }; reader.readAsText(file); }
function renderHomeShelves() {
  const anchor = document.getElementById('new') || document.getElementById('publisher-featured');
  if (!$('#home-book-shelves')) {
    if (!anchor?.parentNode) return;
    anchor.insertAdjacentHTML('beforebegin', `<section class="home-book-shelves section-pad wrap" id="home-book-shelves"><div class="home-shelf-block home-bestseller-shelf"><div class="home-shelf-heading"><div><h3>الأكثر قراءة الآن</h3><p>عناوين تعود إليها الأيدي مرة بعد مرة.</p></div><a class="underlined-link" href="#catalog">كل الكتب ↖</a></div><div id="home-bestseller-grid"></div></div><div id="home-author-spotlight"></div><div id="home-collection-shelves"></div><div class="home-shelf-block"><div class="home-shelf-heading"><div><h3>قراءة جميلة بسعر هادئ</h3><p>أفضل ما تجده بـ ٢٠٠٠ د.ج أو أقل.</p></div><a class="underlined-link" href="#catalog">تصفح حسب السعر ↖</a></div><div id="home-value-grid"></div></div></section>`);
  }
  const featuredIds = new Set(featuredBookIds || ['meaning', 'letters', 'orientalism', 'meditations']);
  const homepageCollections = collections.filter(collection => collection.active && collection.homepage).slice(0, 4);
  const fallback = { id: 'collection-recommended', slug: 'recommended', title: 'اختيارات أخرى', description: 'عناوين تستحق أن تجد طريقها إلى رفّك.', bookIds: books.filter(book => !featuredIds.has(book.id)).map(book => book.id) };
  const recommended = books.filter(book => !featuredIds.has(book.id)).slice(0, 8);
  const shelves = homepageCollections.length ? homepageCollections : [fallback];
  const spotlightBooks = authorSpotlight ? authorSpotlight.bookIds.map(id => byId[id]).filter(Boolean) : [];
  $('#home-author-spotlight').innerHTML = authorSpotlight ? `<article class="author-spotlight"><div class="author-spotlight-art">${authorSpotlight.photo ? `<img src="${authorSpotlight.photo.startsWith('data:') ? authorSpotlight.photo : escapeHtml(authorSpotlight.photo)}" alt="${escapeHtml(authorSpotlight.name)}" loading="lazy" />` : `<span>${escapeHtml(authorSpotlight.name).slice(0,1)}</span>`}</div><div class="author-spotlight-copy"><p class="eyebrow">من رفوف الغزال</p><h2>صوت <em>${escapeHtml(authorSpotlight.name)}</em></h2><p>${escapeHtml(authorSpotlight.bio)}</p><a class="underlined-link" href="#author/${encodeURIComponent(authorSpotlight.name)}">اكتشف كتبه (${spotlightBooks.length}) ↖</a></div><div class="author-spotlight-books">${spotlightBooks.slice(0,3).map(cardTemplate).join('')}</div></article>` : '';
  $('#home-collection-shelves').innerHTML = shelves.map((collection, index) => `<div class="home-shelf-block"><div class="home-shelf-heading"><div><h3>${escapeHtml(collection.title)}</h3><p>${escapeHtml(collection.description || '')}</p></div><a class="underlined-link" href="#collection/${encodeURIComponent(collection.slug)}">عرض المجموعة ↖</a></div><div id="home-collection-grid-${index}"></div></div>`).join('');
  shelves.forEach((collection, index) => renderCarousel(`home-collection-grid-${index}`, `collection-${index}`, collection.bookIds.map(id => byId[id]).filter(Boolean).slice(0, 8)));
  const bestsellers = bestSellerBookIds.map(id => byId[id]).filter(Boolean);
  renderShelfGrid('home-bestseller-grid', bestsellers.length ? bestsellers : recommended);
  const bestsellerRank = new Map(bestSellerBookIds.map((id, index) => [String(id), index]));
  const valueBooks = books.filter(book => Number(book.price) <= 2000).sort((a, b) => {
    const aRank = bestsellerRank.get(String(a.id)) ?? Number.MAX_SAFE_INTEGER;
    const bRank = bestsellerRank.get(String(b.id)) ?? Number.MAX_SAFE_INTEGER;
    return aRank - bRank || Number(a.price) - Number(b.price) || a.title.localeCompare(b.title, 'ar');
  });
  renderCarousel('home-value-grid', 'value', valueBooks);
  const valueShelfBlock = document.getElementById('home-value-grid')?.closest('.home-shelf-block');
  if (valueShelfBlock) valueShelfBlock.hidden = valueBooks.length === 0;
  observeReveals();
}
function renderFeaturedPublishers() {
  const target = document.getElementById('publisher-featured'); if (!target) return;
  const active = (publisherFeatures || []).filter(item => item.active !== false).map(item => ({ ...item, books: books.filter(book => book.publisher === item.publisher) }));
  target.hidden = !active.length;
  const publisherLogos = {'دار المدى':'assets/publishers/al-mada.png','منشورات الجمل':'assets/publishers/al-jamal.png','الشبكة العربية للأبحاث والنشر':'assets/publishers/arab-network.png','دار الرافدين':'assets/publishers/al-rafidain.png'};
  target.innerHTML = active.map(item => `<article class="publisher-feature publisher-feature--${escapeHtml(item.id)}" style="--publisher-accent:${escapeHtml(item.accent || '#8f5e3b')};--publisher-surface:${escapeHtml(item.surface || '#eee2ce')};--publisher-ink:${escapeHtml(item.ink || '#1b1915')}"><div class="publisher-feature-visual" id="publisher-shelf-${escapeHtml(item.id)}"></div><div class="publisher-feature-copy"><div class="publisher-feature-logo"><img src="${item.logo || publisherLogos[item.publisher] || ''}" alt="شعار ${escapeHtml(item.publisher)}" /></div><p class="publisher-feature-kicker">${escapeHtml(item.slogan || item.kicker || 'دار نشر مميزة')}</p><h2>${escapeHtml(item.publisher)}</h2><p class="publisher-feature-description">${escapeHtml(item.description || '')}</p><a class="publisher-feature-link" href="#publisher/${encodeURIComponent(item.publisher)}">كل إصدارات الدار <span>←</span></a></div></article>`).join('');
  active.forEach(item => {
    const demo = (publisherDemoBooks[item.publisher] || []).map(id => byId[id]).filter(Boolean).map(book => ({ ...book, publisher: item.publisher }));
    const seed = [...item.books, ...demo.filter(book => !item.books.some(existing => existing.id === book.id))];
    const extras = books.filter(book => !seed.some(existing => existing.id === book.id)).slice(0, 9).map(book => ({ ...book, publisher: item.publisher }));
    renderCarousel(`publisher-shelf-${item.id}`, `publisher-${item.id}`, [...seed, ...extras]);
  });
}
document.addEventListener('click', event => { const trigger = event.target.closest('[data-open-admin]'); if (trigger) openAdminForm(trigger.dataset.openAdmin); });
showRoute();
renderFeaturedSelections();
renderHomeShelves();
renderFeaturedPublishers();
