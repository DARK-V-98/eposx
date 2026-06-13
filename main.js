const { app, BrowserWindow, ipcMain, dialog, shell, protocol, net } = require('electron');

// Register protocol privileges before app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'local-resource', privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

const path = require('path');
const fs = require('fs');
const url = require('url');
const db = require('./database');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'E POS X',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    frame: false,
    backgroundColor: '#FFFFFF',
    show: false,
  });

  mainWindow.setMenu(null);

  // Load the app
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // Register custom protocol for local images (Modern Electron 25+)
  protocol.handle('local-resource', async (request) => {
    try {
      let urlPath = request.url.slice('local-resource://'.length);
      urlPath = decodeURIComponent(urlPath);
      
      // Fix potential browser normalization (e.g. c/Users -> C:/Users)
      if (/^[a-zA-Z]\//.test(urlPath)) {
        urlPath = urlPath[0].toUpperCase() + ':/' + urlPath.slice(2);
      }
      
      const filePath = path.normalize(urlPath);
      if (!filePath || filePath === '.') throw new Error('Empty path');
      
      const buffer = await fs.promises.readFile(filePath);
      
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.png': 'image/png', '.jpg': 'image/png', '.jpeg': 'image/png',
        '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml'
      };
      
      return new Response(buffer, {
        headers: { 'content-type': mimeTypes[ext] || 'image/png' }
      });
    } catch (error) {
      console.error('Protocol handle error:', error);
      return new Response('File not found', { status: 404 });
    }
  });

  await db.initialize();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ============================================================
// IPC HANDLERS — Products
// ============================================================

ipcMain.handle('products:getAll', () => {
  return db.products.getAll();
});

ipcMain.handle('products:getById', (_, id) => {
  return db.products.getById(id);
});

ipcMain.handle('products:create', (_, product) => {
  return db.products.create(product);
});

ipcMain.handle('products:update', (_, id, product) => {
  return db.products.update(id, product);
});

ipcMain.handle('products:delete', (_, id) => {
  return db.products.delete(id);
});

ipcMain.handle('products:search', (_, query) => {
  return db.products.search(query);
});

// ============================================================
// IPC HANDLERS — Sales
// ============================================================

ipcMain.handle('sales:create', (_, sale) => {
  return db.sales.create(sale);
});

ipcMain.handle('sales:getAll', () => {
  return db.sales.getAll();
});

ipcMain.handle('sales:search', (_, query) => {
  return db.sales.search(query);
});

ipcMain.handle('sales:getToday', () => {
  return db.sales.getToday();
});

ipcMain.handle('sales:getByDateRange', (_, startDate, endDate) => {
  return db.sales.getByDateRange(startDate, endDate);
});

// ============================================================
// IPC HANDLERS — Returns
// ============================================================

ipcMain.handle('returns:getAll', () => db.returns.getAll());
ipcMain.handle('returns:getInvoice', (_, id) => db.returns.getInvoice(id));
ipcMain.handle('returns:getBySale', (_, id) => db.returns.getBySale(id));
ipcMain.handle('returns:create', (_, req) => db.returns.create(req));

// ============================================================
// IPC HANDLERS — Quotations
// ============================================================

ipcMain.handle('quotations:getAll', () => db.quotations.getAll());
ipcMain.handle('quotations:getById', (_, id) => db.quotations.getById(id));
ipcMain.handle('quotations:create', (_, q) => db.quotations.create(q));
ipcMain.handle('quotations:update', (_, id, q) => db.quotations.update(id, q));
ipcMain.handle('quotations:delete', (_, id) => db.quotations.delete(id));
ipcMain.handle('quotations:convert', (_, id, opts) => db.quotations.convertToInvoice(id, opts));

// ============================================================
// IPC HANDLERS — Categories
// ============================================================

ipcMain.handle('categories:getAll', (_, type) => {
  return db.categories.getAll(type);
});

ipcMain.handle('categories:getTree', (_, type) => {
  return db.categories.getTree(type);
});

ipcMain.handle('categories:create', (_, category) => {
  return db.categories.create(category);
});

ipcMain.handle('categories:update', (_, id, category) => {
  return db.categories.update(id, category);
});

ipcMain.handle('categories:delete', (_, id) => {
  return db.categories.delete(id);
});

ipcMain.handle('sales:getDailySummary', (_, days) => {
  return db.sales.getDailySummary(days);
});

ipcMain.handle('sales:getMonthlySummary', (_, months) => {
  return db.sales.getMonthlySummary(months);
});

// ============================================================
// IPC HANDLERS — Customers
// ============================================================

ipcMain.handle('customers:getAll', () => {
  return db.customers.getAll();
});

ipcMain.handle('customers:getById', (_, id) => {
  return db.customers.getById(id);
});

ipcMain.handle('customers:create', (_, customer) => {
  return db.customers.create(customer);
});

ipcMain.handle('customers:update', (_, id, customer) => {
  return db.customers.update(id, customer);
});

ipcMain.handle('customers:delete', (_, id) => {
  return db.customers.delete(id);
});

ipcMain.handle('customers:search', (_, query) => {
  return db.customers.search(query);
});

ipcMain.handle('customers:getHistory', (_, id) => {
  return db.customers.getHistory(id);
});

// ============================================================
// IPC HANDLERS — Appointments
// ============================================================

ipcMain.handle('appointments:getAll', () => {
  return db.appointments.getAll();
});

ipcMain.handle('appointments:getByDate', (_, date) => {
  return db.appointments.getByDate(date);
});

ipcMain.handle('appointments:create', (_, appointment) => {
  return db.appointments.create(appointment);
});

ipcMain.handle('appointments:update', (_, id, appointment) => {
  return db.appointments.update(id, appointment);
});

ipcMain.handle('appointments:delete', (_, id) => {
  return db.appointments.delete(id);
});

ipcMain.handle('appointments:updateStatus', (_, id, status) => {
  return db.appointments.updateStatus(id, status);
});

// ============================================================
// IPC HANDLERS — Services
// ============================================================

ipcMain.handle('services:getAll', () => {
  return db.services.getAll();
});

ipcMain.handle('services:create', (_, service) => {
  return db.services.create(service);
});

ipcMain.handle('services:update', (_, id, service) => {
  return db.services.update(id, service);
});

ipcMain.handle('services:delete', (_, id) => {
  return db.services.delete(id);
});

// ============================================================
// IPC HANDLERS — Expenses
// ============================================================
ipcMain.handle('expenses:getAll', () => db.expenses.getAll());
ipcMain.handle('expenses:getSummary', (_, start, end) => db.expenses.getSummary(start, end));
ipcMain.handle('expenses:create', (_, e) => db.expenses.create(e));
ipcMain.handle('expenses:update', (_, id, e) => db.expenses.update(id, e));
ipcMain.handle('expenses:delete', (_, id) => db.expenses.delete(id));

// ============================================================
// IPC HANDLERS — Cash Drawer
// ============================================================
ipcMain.handle('cash:getCurrent', () => db.cash.getCurrent());
ipcMain.handle('cash:getAll', () => db.cash.getAll());
ipcMain.handle('cash:open', (_, data) => db.cash.open(data));
ipcMain.handle('cash:close', (_, data) => db.cash.close(data));

// ============================================================
// IPC HANDLERS — Customer Dues
// ============================================================
ipcMain.handle('dues:getCustomersWithDue', () => db.dues.getCustomersWithDue());
ipcMain.handle('dues:getCustomerDues', (_, id) => db.dues.getCustomerDues(id));
ipcMain.handle('dues:getPayments', (_, id) => db.dues.getPayments(id));
ipcMain.handle('dues:settle', (_, data) => db.dues.settle(data));

// ============================================================
// IPC HANDLERS — Coupons
// ============================================================
ipcMain.handle('coupons:getAll', () => db.coupons.getAll());
ipcMain.handle('coupons:create', (_, c) => db.coupons.create(c));
ipcMain.handle('coupons:update', (_, id, c) => db.coupons.update(id, c));
ipcMain.handle('coupons:delete', (_, id) => db.coupons.delete(id));
ipcMain.handle('coupons:validate', (_, code, subtotal) => db.coupons.validate(code, subtotal));

// ============================================================
// IPC HANDLERS — Dashboard Stats
// ============================================================

ipcMain.handle('dashboard:getStats', () => {
  return db.dashboard.getStats();
});

ipcMain.handle('dashboard:getProfitLoss', (_, start, end) => db.dashboard.getProfitLoss(start, end));

// ============================================================
// IPC HANDLERS — Settings
// ============================================================

ipcMain.handle('settings:getAll', () => {
  return db.settings.getAll();
});

ipcMain.handle('settings:updateAll', (_, settings) => {
  return db.settings.updateAll(settings);
});

// ============================================================
// IPC HANDLERS — File Dialog
// ============================================================

ipcMain.handle('dialog:openImage', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Product Image',
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] }],
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('shell:openExternal', (_, url) => {
  shell.openExternal(url);
});

// ============================================================
// IPC HANDLERS — Backup & Restore
// ============================================================

ipcMain.handle('db:backup', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Backup POS Data',
    defaultPath: path.join(app.getPath('documents'), `eposx_backup_${new Date().toISOString().split('T')[0]}.db`),
    filters: [{ name: 'Database Files', extensions: ['db', 'bak'] }],
  });

  if (!result.canceled && result.filePath) {
    try {
      // Ensure current DB is saved to file first
      const dbModule = require('./database');
      // We don't have a direct export from database.js for the save function, 
      // but in database.js, saveDatabase is called on every write.
      // For safety, let's just copy the existing file if it exists.
      const userDataPath = app.getPath('userData');
      const dbPath = path.join(userDataPath, 'eposx.db');
      
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, result.filePath);
        return { success: true, path: result.filePath };
      }
      return { success: false, error: 'Database file not found' };
    } catch (err) {
      console.error('Backup failed:', err);
      return { success: false, error: err.message };
    }
  }
  return { canceled: true };
});

ipcMain.handle('db:restore', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Restore POS Data',
    properties: ['openFile'],
    filters: [{ name: 'Database Files', extensions: ['db', 'bak'] }],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    try {
      const userDataPath = app.getPath('userData');
      const dbPath = path.join(userDataPath, 'eposx.db');
      
      // Copy backup to app path
      fs.copyFileSync(result.filePaths[0], dbPath);
      
      // Relaunch the app to load new data
      app.relaunch();
      app.exit();
      return { success: true };
    } catch (err) {
      console.error('Restore failed:', err);
      return { success: false, error: err.message };
    }
  }
  return { canceled: true };
});

ipcMain.handle('system:reset', async () => {
  return db.system.reset();
});

// ============================================================
// IPC HANDLERS — Window Controls
// ============================================================

ipcMain.on('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window:close', () => {
  if (mainWindow) mainWindow.close();
});
