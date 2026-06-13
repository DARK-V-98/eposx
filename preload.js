const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Products
  products: {
    getAll: () => ipcRenderer.invoke('products:getAll'),
    getById: (id) => ipcRenderer.invoke('products:getById', id),
    create: (product) => ipcRenderer.invoke('products:create', product),
    update: (id, product) => ipcRenderer.invoke('products:update', id, product),
    delete: (id) => ipcRenderer.invoke('products:delete', id),
    search: (query) => ipcRenderer.invoke('products:search', query),
  },

  // Sales
  sales: {
    create: (sale) => ipcRenderer.invoke('sales:create', sale),
    getAll: () => ipcRenderer.invoke('sales:getAll'),
    search: (query) => ipcRenderer.invoke('sales:search', query),
    getToday: () => ipcRenderer.invoke('sales:getToday'),
    getByDateRange: (start, end) => ipcRenderer.invoke('sales:getByDateRange', start, end),
    getDailySummary: (days) => ipcRenderer.invoke('sales:getDailySummary', days),
    getMonthlySummary: (months) => ipcRenderer.invoke('sales:getMonthlySummary', months),
  },

  // Returns
  returns: {
    getAll: () => ipcRenderer.invoke('returns:getAll'),
    getInvoice: (id) => ipcRenderer.invoke('returns:getInvoice', id),
    getBySale: (id) => ipcRenderer.invoke('returns:getBySale', id),
    create: (req) => ipcRenderer.invoke('returns:create', req),
  },

  // Quotations
  quotations: {
    getAll: () => ipcRenderer.invoke('quotations:getAll'),
    getById: (id) => ipcRenderer.invoke('quotations:getById', id),
    create: (q) => ipcRenderer.invoke('quotations:create', q),
    update: (id, q) => ipcRenderer.invoke('quotations:update', id, q),
    delete: (id) => ipcRenderer.invoke('quotations:delete', id),
    convertToInvoice: (id, opts) => ipcRenderer.invoke('quotations:convert', id, opts),
  },

  // Customers
  customers: {
    getAll: () => ipcRenderer.invoke('customers:getAll'),
    getById: (id) => ipcRenderer.invoke('customers:getById', id),
    create: (customer) => ipcRenderer.invoke('customers:create', customer),
    update: (id, customer) => ipcRenderer.invoke('customers:update', id, customer),
    delete: (id) => ipcRenderer.invoke('customers:delete', id),
    search: (query) => ipcRenderer.invoke('customers:search', query),
    getHistory: (id) => ipcRenderer.invoke('customers:getHistory', id),
  },

  // Appointments
  appointments: {
    getAll: () => ipcRenderer.invoke('appointments:getAll'),
    getByDate: (date) => ipcRenderer.invoke('appointments:getByDate', date),
    create: (appointment) => ipcRenderer.invoke('appointments:create', appointment),
    update: (id, appointment) => ipcRenderer.invoke('appointments:update', id, appointment),
    delete: (id) => ipcRenderer.invoke('appointments:delete', id),
    updateStatus: (id, status) => ipcRenderer.invoke('appointments:updateStatus', id, status),
  },

  // Services
  services: {
    getAll: () => ipcRenderer.invoke('services:getAll'),
    create: (service) => ipcRenderer.invoke('services:create', service),
    update: (id, service) => ipcRenderer.invoke('services:update', id, service),
    delete: (id) => ipcRenderer.invoke('services:delete', id),
  },

  // Expenses
  expenses: {
    getAll: () => ipcRenderer.invoke('expenses:getAll'),
    getSummary: (start, end) => ipcRenderer.invoke('expenses:getSummary', start, end),
    create: (e) => ipcRenderer.invoke('expenses:create', e),
    update: (id, e) => ipcRenderer.invoke('expenses:update', id, e),
    delete: (id) => ipcRenderer.invoke('expenses:delete', id),
  },

  // Cash Drawer
  cash: {
    getCurrent: () => ipcRenderer.invoke('cash:getCurrent'),
    getAll: () => ipcRenderer.invoke('cash:getAll'),
    open: (data) => ipcRenderer.invoke('cash:open', data),
    close: (data) => ipcRenderer.invoke('cash:close', data),
  },

  // Customer Dues
  dues: {
    getCustomersWithDue: () => ipcRenderer.invoke('dues:getCustomersWithDue'),
    getCustomerDues: (id) => ipcRenderer.invoke('dues:getCustomerDues', id),
    getPayments: (id) => ipcRenderer.invoke('dues:getPayments', id),
    settle: (data) => ipcRenderer.invoke('dues:settle', data),
  },

  // Coupons
  coupons: {
    getAll: () => ipcRenderer.invoke('coupons:getAll'),
    create: (c) => ipcRenderer.invoke('coupons:create', c),
    update: (id, c) => ipcRenderer.invoke('coupons:update', id, c),
    delete: (id) => ipcRenderer.invoke('coupons:delete', id),
    validate: (code, subtotal) => ipcRenderer.invoke('coupons:validate', code, subtotal),
  },

  // Dashboard
  dashboard: {
    getStats: () => ipcRenderer.invoke('dashboard:getStats'),
    getProfitLoss: (start, end) => ipcRenderer.invoke('dashboard:getProfitLoss', start, end),
  },

  // Settings
  settings: {
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    updateAll: (settings) => ipcRenderer.invoke('settings:updateAll', settings),
  },

  // File dialog
  categories: {
    getAll: (type) => ipcRenderer.invoke('categories:getAll', type),
    getTree: (type) => ipcRenderer.invoke('categories:getTree', type),
    create: (cat) => ipcRenderer.invoke('categories:create', cat),
    update: (id, cat) => ipcRenderer.invoke('categories:update', id, cat),
    delete: (id) => ipcRenderer.invoke('categories:delete', id),
  },
  dialog: {
    openImage: () => ipcRenderer.invoke('dialog:openImage'),
  },

  // Shell
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  },

  // Database System
  system: {
    backup: () => ipcRenderer.invoke('db:backup'),
    restore: () => ipcRenderer.invoke('db:restore'),
    reset: () => ipcRenderer.invoke('system:reset'),
  },

  // Window Controls
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
  },
});
