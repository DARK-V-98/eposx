// ============================================================
// HTTP shim — provides a window.api shaped object backed by the
// REST server, so the SAME React components that call window.api.*
// in Electron also work in the browser and in the Capacitor app.
//
// Resolution order for the server base URL:
//   1. ?api=<url> query param (handy for testing)
//   2. localStorage 'eposx_api_url'
//   3. VITE_API_URL build-time env
//   4. same origin (when the server also serves the web build)
// ============================================================

function resolveBaseUrl() {
  try {
    const qs = new URLSearchParams(window.location.search);
    const fromQuery = qs.get('api');
    if (fromQuery) localStorage.setItem('eposx_api_url', fromQuery);
  } catch (_) {}

  const stored = (() => { try { return localStorage.getItem('eposx_api_url'); } catch (_) { return null; } })();
  const env = import.meta.env?.VITE_API_URL;
  const base = stored || env || window.location.origin;
  return base.replace(/\/$/, '');
}

const BASE = resolveBaseUrl();

async function req(method, pathname, body) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${pathname}`, opts);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { msg = (await res.json()).error || msg; } catch (_) {}
    throw new Error(msg);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const get = (p) => req('GET', p);
const post = (p, b) => req('POST', p, b);
const put = (p, b) => req('PUT', p, b);
const del = (p) => req('DELETE', p);
const qs = (obj) => {
  const s = new URLSearchParams(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)
  ).toString();
  return s ? `?${s}` : '';
};

export function createHttpApi() {
  return {
    __mode: 'http',
    __baseUrl: BASE,
    setApiUrl: (url) => {
      try { localStorage.setItem('eposx_api_url', url.replace(/\/$/, '')); } catch (_) {}
    },

    products: {
      getAll: () => get('/api/products'),
      getById: (id) => get(`/api/products/${id}`),
      create: (p) => post('/api/products', p),
      update: (id, p) => put(`/api/products/${id}`, p),
      delete: (id) => del(`/api/products/${id}`),
      search: (q) => get(`/api/products/search${qs({ q })}`),
    },

    sales: {
      create: (s) => post('/api/sales', s),
      getAll: () => get('/api/sales'),
      search: (q) => get(`/api/sales/search${qs({ q })}`),
      getToday: () => get('/api/sales/today'),
      getByDateRange: (start, end) => get(`/api/sales/range${qs({ start, end })}`),
      getDailySummary: (days) => get(`/api/sales/daily-summary${qs({ days })}`),
      getMonthlySummary: (months) => get(`/api/sales/monthly-summary${qs({ months })}`),
    },

    returns: {
      getAll: () => get('/api/returns'),
      getInvoice: (id) => get(`/api/returns/invoice/${id}`),
      getBySale: (id) => get(`/api/returns/sale/${id}`),
      create: (req) => post('/api/returns', req),
    },

    quotations: {
      getAll: () => get('/api/quotations'),
      getById: (id) => get(`/api/quotations/${id}`),
      create: (q) => post('/api/quotations', q),
      update: (id, q) => put(`/api/quotations/${id}`, q),
      delete: (id) => del(`/api/quotations/${id}`),
      convertToInvoice: (id, opts) => post(`/api/quotations/${id}/convert`, opts || {}),
    },

    customers: {
      getAll: () => get('/api/customers'),
      getById: (id) => get(`/api/customers/${id}`),
      create: (c) => post('/api/customers', c),
      update: (id, c) => put(`/api/customers/${id}`, c),
      delete: (id) => del(`/api/customers/${id}`),
      search: (q) => get(`/api/customers/search${qs({ q })}`),
      getHistory: (id) => get(`/api/customers/${id}/history`),
    },

    appointments: {
      getAll: () => get('/api/appointments'),
      getByDate: (date) => get(`/api/appointments/by-date${qs({ date })}`),
      create: (a) => post('/api/appointments', a),
      update: (id, a) => put(`/api/appointments/${id}`, a),
      delete: (id) => del(`/api/appointments/${id}`),
      updateStatus: (id, status) => put(`/api/appointments/${id}/status`, { status }),
    },

    services: {
      getAll: () => get('/api/services'),
      create: (s) => post('/api/services', s),
      update: (id, s) => put(`/api/services/${id}`, s),
      delete: (id) => del(`/api/services/${id}`),
    },

    categories: {
      getAll: (type) => get(`/api/categories${qs({ type })}`),
      getTree: (type) => get(`/api/categories/tree${qs({ type })}`),
      create: (c) => post('/api/categories', c),
      update: (id, c) => put(`/api/categories/${id}`, c),
      delete: (id) => del(`/api/categories/${id}`),
    },

    expenses: {
      getAll: () => get('/api/expenses'),
      getSummary: (start, end) => get(`/api/expenses/summary${qs({ start, end })}`),
      create: (e) => post('/api/expenses', e),
      update: (id, e) => put(`/api/expenses/${id}`, e),
      delete: (id) => del(`/api/expenses/${id}`),
    },

    cash: {
      getCurrent: () => get('/api/cash/current'),
      getAll: () => get('/api/cash/history'),
      open: (data) => post('/api/cash/open', data),
      close: (data) => post('/api/cash/close', data),
    },

    dues: {
      getCustomersWithDue: () => get('/api/dues'),
      getCustomerDues: (id) => get(`/api/dues/customer/${id}`),
      getPayments: (id) => get(`/api/dues/payments/${id}`),
      settle: (data) => post('/api/dues/settle', data),
    },

    coupons: {
      getAll: () => get('/api/coupons'),
      create: (c) => post('/api/coupons', c),
      update: (id, c) => put(`/api/coupons/${id}`, c),
      delete: (id) => del(`/api/coupons/${id}`),
      validate: (code, subtotal) => get(`/api/coupons/validate${qs({ code, subtotal })}`),
    },

    dashboard: {
      getStats: () => get('/api/dashboard/stats'),
      getProfitLoss: (start, end) => get(`/api/dashboard/profit-loss${qs({ start, end })}`),
    },

    settings: {
      getAll: () => get('/api/settings'),
      updateAll: (s) => put('/api/settings', s),
    },

    system: {
      // Backup/restore use native file dialogs — unavailable in the browser.
      backup: async () => ({ success: false, error: 'Backup is only available in the desktop app.' }),
      restore: async () => ({ success: false, error: 'Restore is only available in the desktop app.' }),
      reset: () => post('/api/system/reset'),
    },

    // Browser/mobile have no native image picker via this bridge; components
    // should fall back to an <input type="file"> when window.api.dialog is absent.
    dialog: {
      openImage: async () => null,
    },

    shell: {
      openExternal: (url) => { window.open(url, '_blank', 'noopener'); },
    },

    // No frameless window to control in the browser.
    window: {
      minimize: () => {},
      maximize: () => {},
      close: () => {},
    },
  };
}
