// ============================================================
// API Router — a stable window.api object whose calls delegate to
// the currently active backend (HTTP shim by default, Firestore for
// cloud stores). Components capture `window.api` once at import time;
// because this router object is stable and only its internal backend
// pointer changes, swapping backends at runtime "just works".
// ============================================================

// Groups + methods that make up the window.api surface. Kept in one
// place so the router can build matching delegating stubs.
const SHAPE = {
  products: ['getAll', 'getById', 'create', 'update', 'delete', 'search'],
  sales: ['create', 'getAll', 'search', 'getToday', 'getByDateRange', 'getDailySummary', 'getMonthlySummary'],
  returns: ['getAll', 'getInvoice', 'getBySale', 'create'],
  quotations: ['getAll', 'getById', 'create', 'update', 'delete', 'convertToInvoice'],
  customers: ['getAll', 'getById', 'create', 'update', 'delete', 'search', 'getHistory'],
  appointments: ['getAll', 'getByDate', 'create', 'update', 'delete', 'updateStatus'],
  services: ['getAll', 'create', 'update', 'delete'],
  categories: ['getAll', 'getTree', 'create', 'update', 'delete'],
  expenses: ['getAll', 'getSummary', 'create', 'update', 'delete'],
  cash: ['getCurrent', 'getAll', 'open', 'close'],
  dues: ['getCustomersWithDue', 'getCustomerDues', 'getPayments', 'settle'],
  coupons: ['getAll', 'create', 'update', 'delete', 'validate'],
  dashboard: ['getStats', 'getProfitLoss'],
  settings: ['getAll', 'updateAll'],
  system: ['backup', 'restore', 'reset'],
  dialog: ['openImage'],
  shell: ['openExternal'],
  window: ['minimize', 'maximize', 'close'],
};

export function createApiRouter(defaultBackend) {
  const router = { __backend: defaultBackend, __default: defaultBackend };

  router.__setBackend = (backend) => { router.__backend = backend || router.__default; };
  router.__resetBackend = () => { router.__backend = router.__default; };
  router.__getMode = () => router.__backend?.__mode || 'http';

  for (const [group, methods] of Object.entries(SHAPE)) {
    router[group] = {};
    for (const method of methods) {
      router[group][method] = (...args) => {
        const be = router.__backend;
        const fn = be?.[group]?.[method];
        if (typeof fn !== 'function') {
          return Promise.reject(new Error(`api.${group}.${method} not available on this backend`));
        }
        return fn(...args);
      };
    }
  }

  // Expose the active backend's mode (http | cloud | electron) as a live getter.
  Object.defineProperty(router, '__mode', {
    get() { return router.__backend?.__mode || 'http'; },
    enumerable: true,
  });

  return router;
}
