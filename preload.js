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

  // Dashboard
  dashboard: {
    getStats: () => ipcRenderer.invoke('dashboard:getStats'),
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
  },
});
