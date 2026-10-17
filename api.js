/* The browser talks to the same-origin API when served by server.js. Static-file
   preview remains available as a fallback for designers working offline. */
window.GhazalAPI = (() => {
  const request = async (path, options = {}) => {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 8000);
    let response; try { response = await fetch(path, { headers: { 'content-type': 'application/json', ...(options.headers || {}) }, signal:controller.signal, ...options }); } catch (error) { throw new Error(error.name === 'AbortError' ? `request_timeout:${path}` : `request_failed:${path}`); } finally { clearTimeout(timeout); }
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
    saveCatalog: (token, catalog) => request('/api/admin/catalog', { method:'PUT', headers:{ authorization:`Bearer ${token}` }, body:JSON.stringify(catalog) }),
    cacheImageUrl: (token, url) => request('/api/admin/cache-image', { method:'POST', headers:{ authorization:`Bearer ${token}` }, body:JSON.stringify({ url }) }),
    adminCollections: (token) => request('/api/admin/collections', { headers: { authorization: `Bearer ${token}` } }),
    createCollection: (token, collection) => request('/api/admin/collections', { method:'POST', headers:{ authorization:`Bearer ${token}` }, body:JSON.stringify(collection) }),
    updateCollection: (token, id, changes) => request(`/api/admin/collections/${encodeURIComponent(id)}`, { method:'PATCH', headers:{ authorization:`Bearer ${token}` }, body:JSON.stringify(changes) }),
    deleteOrder: (token, reference) => request(`/api/admin/orders/${encodeURIComponent(reference)}`, { method:'DELETE', headers:{ authorization:`Bearer ${token}` } }),
    deleteBook: (token, bookId) => request(`/api/admin/books/${encodeURIComponent(bookId)}`, { method:'DELETE', headers:{ authorization:`Bearer ${token}` } }),
    recordExport: (token, fingerprint, references, filename) => request('/api/admin/exports', { method:'POST', headers:{ authorization:`Bearer ${token}` }, body:JSON.stringify({ fingerprint:`${fingerprint}-${Date.now()}-${Math.random().toString(16).slice(2)}`, references, filename }) }),
    adminConversions: (token) => request('/api/admin/conversions', { headers:{ authorization:`Bearer ${token}` } }),
    adminDiagnostics: (token) => request('/api/admin/diagnostics', { headers:{ authorization:`Bearer ${token}` } }),
    adminAnalytics: (token) => request('/api/admin/analytics', { headers:{ authorization:`Bearer ${token}` } }),
    updateOrder: (token, reference, status, notes = '') => request(`/api/admin/orders/${encodeURIComponent(reference)}`, { method:'PATCH', headers:{ authorization:`Bearer ${token}` }, body:JSON.stringify({ status, notes }) })
  };
})();
