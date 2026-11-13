/* The browser talks to the same-origin API when served by server.js. Static-file
   preview remains available as a fallback for designers working offline. */
window.GhazalAPI = (() => {
  const request = async (path, options = {}) => {
    const { timeout: timeoutMs = 8000, ...init } = options;
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response; try { response = await fetch(path, { headers: { 'content-type': 'application/json', ...(init.headers || {}) }, signal:controller.signal, ...init }); } catch (error) { throw new Error(error.name === 'AbortError' ? `request_timeout:${path}` : `request_failed:${path}`); } finally { clearTimeout(timeout); }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `request_failed_${response.status}`);
    return body;
  };
  return {
    createOrder: (body) => request('/api/orders', { method: 'POST', body: JSON.stringify(body) }),
    subscribeNewsletter: (email) => request('/api/newsletter', { method: 'POST', body: JSON.stringify({ email, source: 'storefront' }) }),
    lookupOrder: (reference) => request(`/api/orders/lookup?reference=${encodeURIComponent(reference)}`),
    login: (email, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    authStatus: () => request('/api/auth/status'),
    authMe: (token) => request('/api/auth/me', { headers:{ authorization:`Bearer ${token}` } }),
    signup: (email, password) => request('/api/auth/signup', { method:'POST', body:JSON.stringify({ email, password }) }),
    createStaff: (token, email, password, role = 'admin', permissions = { view_orders:true, update_orders:true, view_catalog:true }) => request('/api/admin/users', { method:'POST', headers:{ authorization:`Bearer ${token}` }, body:JSON.stringify({ email, password, role, permissions }) }),
    adminUsers: (token) => request('/api/admin/users', { headers:{ authorization:`Bearer ${token}` } }),
    deleteStaff: (token, id) => request(`/api/admin/users/${encodeURIComponent(id)}`, { method:'DELETE', headers:{ authorization:`Bearer ${token}` } }),
    updateStaff: (token, id, changes) => request(`/api/admin/users/${encodeURIComponent(id)}`, { method:'PATCH', headers:{ authorization:`Bearer ${token}` }, body:JSON.stringify(changes) }),
    adminAudit: (token) => request('/api/admin/audit', { headers:{ authorization:`Bearer ${token}` } }),
    adminOrders: (token) => request('/api/admin/orders', { headers: { authorization: `Bearer ${token}` } }),
    catalog: () => request('/api/catalog'),
    adminCatalog: (token) => request('/api/admin/catalog', { headers: { authorization: `Bearer ${token}` } }),
    updateBookPrices: (token, updates) => request('/api/admin/books/prices', { method:'POST', headers:{ authorization:`Bearer ${token}` }, body:JSON.stringify({ updates }) }),
    adminInventoryReport: (token) => request('/api/admin/inventory-report', { headers: { authorization: `Bearer ${token}` } }),
    adminSalesReport: (token, { from = '', to = '', scope = 'all' } = {}) => { const query = new URLSearchParams({ from, to, scope }); return request(`/api/admin/sales-report?${query}`, { headers:{ authorization:`Bearer ${token}` } }); },
    restockBook: (token, bookId, quantity) => request('/api/admin/restock', { method:'POST', headers:{ authorization:`Bearer ${token}` }, body:JSON.stringify({ bookId, quantity, reason:'supplier_purchase' }) }),
    restockBooksBulk: (token, mode, updates) => request('/api/admin/restock-bulk', { method:'POST', headers:{ authorization:`Bearer ${token}` }, body:JSON.stringify({ mode, updates }) }),
    saveCatalog: (token, catalog) => request('/api/admin/catalog', { method:'PUT', headers:{ authorization:`Bearer ${token}` }, body:JSON.stringify(catalog) }),
    cacheImageUrl: (token, url) => request('/api/admin/cache-image', { method:'POST', headers:{ authorization:`Bearer ${token}` }, body:JSON.stringify({ url }) }),
    saveCover: (token, cover) => request('/api/admin/covers', { method:'POST', headers:{ authorization:`Bearer ${token}` }, body:JSON.stringify(cover), timeout:30000 }),
    cacheRemoteCovers: (token) => request('/api/admin/covers/cache-remote', { method:'POST', headers:{ authorization:`Bearer ${token}` } }),
    adminCollections: (token) => request('/api/admin/collections', { headers: { authorization: `Bearer ${token}` } }),
    createCollection: (token, collection) => request('/api/admin/collections', { method:'POST', headers:{ authorization:`Bearer ${token}` }, body:JSON.stringify(collection) }),
    updateCollection: (token, id, changes) => request(`/api/admin/collections/${encodeURIComponent(id)}`, { method:'PATCH', headers:{ authorization:`Bearer ${token}` }, body:JSON.stringify(changes) }),
    deleteCollection: (token, id) => request(`/api/admin/collections/${encodeURIComponent(id)}`, { method:'DELETE', headers:{ authorization:`Bearer ${token}` } }),
    deleteOrder: (token, reference) => request(`/api/admin/orders/${encodeURIComponent(reference)}`, { method:'DELETE', headers:{ authorization:`Bearer ${token}` } }),
    deleteOrders: (token, references) => request('/api/admin/orders', { method:'DELETE', headers:{ authorization:`Bearer ${token}` }, body:JSON.stringify({ references }) }),
    deleteBook: (token, bookId) => request(`/api/admin/books/${encodeURIComponent(bookId)}`, { method:'DELETE', headers:{ authorization:`Bearer ${token}` } }),
    recordExport: (token, fingerprint, references, filename) => request('/api/admin/exports', { method:'POST', headers:{ authorization:`Bearer ${token}` }, body:JSON.stringify({ fingerprint:`${fingerprint}-${Date.now()}-${Math.random().toString(16).slice(2)}`, references, filename }) }),
    adminConversions: (token) => request('/api/admin/conversions', { headers:{ authorization:`Bearer ${token}` } }),
    adminDiagnostics: (token) => request('/api/admin/diagnostics', { headers:{ authorization:`Bearer ${token}` } }),
    adminAnalytics: (token) => request('/api/admin/analytics', { headers:{ authorization:`Bearer ${token}` } }),
    adminNewsletter: (token) => request('/api/admin/newsletter', { headers:{ authorization:`Bearer ${token}` } }),
    updateOrder: (token, reference, status, notes = '') => request(`/api/admin/orders/${encodeURIComponent(reference)}`, { method:'PATCH', headers:{ authorization:`Bearer ${token}` }, body:JSON.stringify({ status, notes }) }),
    applyOrderCoupon: (token, reference, code) => request(`/api/admin/orders/${encodeURIComponent(reference)}/coupon`, { method:'POST', headers:{ authorization:`Bearer ${token}` }, body:JSON.stringify({ code }) }),
    saveOrder: (token, reference, changes) => request(`/api/admin/orders/${encodeURIComponent(reference)}`, { method:'PUT', headers:{ authorization:`Bearer ${token}` }, body:JSON.stringify(changes) })
  };
})();
