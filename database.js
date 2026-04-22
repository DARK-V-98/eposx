const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let db;
let dbPath;

function getDbPath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'eposx.db');
}

function saveDatabase() {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (err) {
    console.error('[E POS X] Failed to save database:', err);
  }
}

// Auto-save every 30 seconds
let saveInterval;

async function initialize() {
  dbPath = getDbPath();

  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
    console.log(`[E POS X] Database loaded from: ${dbPath}`);
  } else {
    db = new SQL.Database();
    console.log(`[E POS X] New database created at: ${dbPath}`);
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  createTables();
  saveDatabase();

  // Auto-save interval
  saveInterval = setInterval(saveDatabase, 30000);

  // Save on app quit
  app.on('before-quit', () => {
    clearInterval(saveInterval);
    saveDatabase();
  });
}

function createTables() {
    // Categories table (Hierarchical)
    execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        parent_id INTEGER DEFAULT NULL,
        type TEXT NOT NULL, -- 'product' or 'service'
        sort_order INTEGER DEFAULT 0,
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE
      )
    `);

    // Products table
    execute(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT, -- Kept for legacy/simple use
        category_id INTEGER DEFAULT NULL, 
        price REAL DEFAULT 0,
        cost REAL DEFAULT 0,
        stock INTEGER DEFAULT 0,
        sku TEXT,
        is_service INTEGER DEFAULT 0,
        duration_minutes INTEGER DEFAULT 0,
        image TEXT,
        created_at DATETIME DEFAULT (datetime('now','localtime')),
        updated_at DATETIME DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
      )
    `);

  db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      notes TEXT,
      total_spent REAL DEFAULT 0,
      visit_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      items TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      discount REAL DEFAULT 0,
      tax REAL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      payment_method TEXT DEFAULT 'cash',
      status TEXT DEFAULT 'completed',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      customer_name TEXT,
      service_id INTEGER,
      service_name TEXT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      duration_minutes INTEGER DEFAULT 60,
      price REAL DEFAULT 0,
      status TEXT DEFAULT 'scheduled',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'General',
      price REAL NOT NULL DEFAULT 0,
      duration_minutes INTEGER DEFAULT 60,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // Settings Table
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  // Seed default settings if empty
  const hasSettings = queryOne('SELECT COUNT(*) as cnt FROM settings');
  if (hasSettings && hasSettings.cnt === 0) {
    const defaults = [
      ['company_name', 'E POS X STUDIO'],
      ['company_phone', '+94 77 123 4567'],
      ['company_address', '123 Studio Street, Creative City'],
      ['company_email', 'info@esystemlk.com'],
      ['website', 'www.esystemlk.com'],
      ['currency', 'LKR'],
      ['tax_percentage', '0'],
      ['receipt_footer', 'Thank you for your business!'],
    ];
    for (const [k, v] of defaults) {
      db.run('INSERT INTO settings (key, value) VALUES (?, ?)', [k, v]);
    }
  }
}

// ============================================================
// API Object — Settings
// ============================================================
const settingsApi = {
  getAll() {
    const rows = queryAll('SELECT * FROM settings');
    const settings = {};
    rows.forEach(r => settings[r.key] = r.value);
    return settings;
  },
  update(key, value) {
    execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
    return { success: true };
  },
  updateAll(settings) {
    Object.entries(settings).forEach(([key, value]) => {
      db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(value)]);
    });
    saveDatabase();
    return { success: true };
  }
};

// Helper: run a SELECT and return all rows as array of objects
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Helper: run a SELECT and return first row as object
function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// Helper: run INSERT/UPDATE/DELETE
function execute(sql, params = []) {
  db.run(sql, params);
  saveDatabase();
}

// Helper: get last inserted row id
function lastInsertId() {
  const row = queryOne('SELECT last_insert_rowid() as id');
  return row ? row.id : 0;
}

// ============================================================
// PRODUCTS CRUD
// ============================================================
const productsApi = {
  getAll() {
    return queryAll('SELECT * FROM products ORDER BY name ASC');
  },

  getById(id) {
    return queryOne('SELECT * FROM products WHERE id = ?', [id]);
  },

  create(product) {
    execute(
      'INSERT INTO products (name, category, category_id, price, cost, stock, sku, is_service, duration_minutes, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        product.name,
        product.category || 'General',
        product.category_id || null,
        product.price || 0,
        product.cost || 0,
        product.stock || 0,
        product.sku || '',
        product.is_service || 0,
        product.duration_minutes || 0,
        product.image || null,
      ]
    );
    const id = lastInsertId();
    return { id, ...product };
  },

  update(id, product) {
    execute(
      'UPDATE products SET name=?, category=?, category_id=?, price=?, cost=?, stock=?, sku=?, is_service=?, duration_minutes=?, image=?, updated_at=datetime(\'now\',\'localtime\') WHERE id=?',
      [
        product.name,
        product.category || 'General',
        product.category_id || null,
        product.price || 0,
        product.cost || 0,
        product.stock || 0,
        product.sku || '',
        product.is_service || 0,
        product.duration_minutes || 0,
        product.image || null,
        id,
      ]
    );
    return { id, ...product };
  },

  delete(id) {
    execute('DELETE FROM products WHERE id = ?', [id]);
    return { success: true };
  },

  search(query) {
    const q = `%${query}%`;
    return queryAll(
      'SELECT * FROM products WHERE name LIKE ? OR category LIKE ? OR sku LIKE ? ORDER BY name ASC',
      [q, q, q]
    );
  },
};

// ============================================================
// SALES CRUD
// ============================================================
const salesApi = {
  create(sale) {
    const itemsStr = typeof sale.items === 'string' ? sale.items : JSON.stringify(sale.items);
    execute(
      'INSERT INTO sales (customer_id, items, subtotal, discount, tax, total, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        sale.customer_id || null,
        itemsStr,
        sale.subtotal || 0,
        sale.discount || 0,
        sale.tax || 0,
        sale.total || 0,
        sale.payment_method || 'cash',
        sale.notes || '',
      ]
    );
    const id = lastInsertId();

    // Update product stock
    const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
    if (items) {
      for (const item of items) {
        if (item.productId) {
          execute('UPDATE products SET stock = stock - ? WHERE id = ?', [item.qty, item.productId]);
        }
      }
    }

    // Update customer stats
    if (sale.customer_id) {
      execute(
        'UPDATE customers SET total_spent = total_spent + ?, visit_count = visit_count + 1, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?',
        [sale.total, sale.customer_id]
      );
    }

    return { id };
  },

  getAll() {
    return queryAll(
      'SELECT s.*, c.name as customer_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id ORDER BY s.created_at DESC'
    );
  },

  search(query) {
    const qToken = `%${query}%`;
    return queryAll(`
      SELECT s.*, COALESCE(c.name, 'Walk-in Customer') as customer_name 
      FROM sales s 
      LEFT JOIN customers c ON s.customer_id = c.id 
      WHERE (CAST(s.id AS TEXT) LIKE ?) 
         OR (COALESCE(c.name, '') LIKE ?) 
         OR (COALESCE(s.notes, '') LIKE ?)
      ORDER BY s.created_at DESC
    `, [qToken, qToken, qToken]);
  },

  getToday() {
    return queryAll(
      "SELECT s.*, c.name as customer_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id WHERE date(s.created_at) = date('now','localtime') ORDER BY s.created_at DESC"
    );
  },

  getByDateRange(startDate, endDate) {
    return queryAll(
      'SELECT s.*, c.name as customer_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id WHERE date(s.created_at) BETWEEN ? AND ? ORDER BY s.created_at DESC',
      [startDate, endDate]
    );
  },

  getDailySummary(days = 7) {
    return queryAll(
      `SELECT date(created_at) as date, COUNT(*) as total_orders, COALESCE(SUM(total), 0) as revenue, COALESCE(AVG(total), 0) as avg_order FROM sales WHERE created_at >= datetime('now', '-' || ? || ' days', 'localtime') GROUP BY date(created_at) ORDER BY date ASC`,
      [days]
    );
  },

  getMonthlySummary(months = 12) {
    return queryAll(
      `SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as total_orders, COALESCE(SUM(total), 0) as revenue, COALESCE(AVG(total), 0) as avg_order FROM sales WHERE created_at >= datetime('now', '-' || ? || ' months', 'localtime') GROUP BY strftime('%Y-%m', created_at) ORDER BY month ASC`,
      [months]
    );
  },
};

// ============================================================
// CUSTOMERS CRUD
// ============================================================
const customersApi = {
  getAll() {
    return queryAll('SELECT * FROM customers ORDER BY name ASC');
  },

  getById(id) {
    return queryOne('SELECT * FROM customers WHERE id = ?', [id]);
  },

  create(customer) {
    execute(
      'INSERT INTO customers (name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?)',
      [customer.name, customer.phone || '', customer.email || '', customer.address || '', customer.notes || '']
    );
    const id = lastInsertId();
    return { id, ...customer };
  },

  update(id, customer) {
    execute(
      'UPDATE customers SET name=?, phone=?, email=?, address=?, notes=?, updated_at=datetime(\'now\',\'localtime\') WHERE id=?',
      [customer.name, customer.phone || '', customer.email || '', customer.address || '', customer.notes || '', id]
    );
    return { id, ...customer };
  },

  delete(id) {
    execute('DELETE FROM customers WHERE id = ?', [id]);
    return { success: true };
  },

  search(query) {
    const q = `%${query}%`;
    return queryAll(
      'SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? OR email LIKE ? ORDER BY name ASC',
      [q, q, q]
    );
  },

  getHistory(id) {
    return queryAll(
      'SELECT * FROM sales WHERE customer_id = ? ORDER BY created_at DESC LIMIT 50',
      [id]
    );
  },
};

// ============================================================
// CATEGORIES CRUD
// ============================================================
const categoriesApi = {
  getAll(type = null) {
    if (type) {
      return queryAll('SELECT * FROM categories WHERE type = ? ORDER BY sort_order ASC, name ASC', [type]);
    }
    return queryAll('SELECT * FROM categories ORDER BY sort_order ASC, name ASC');
  },

  getTree(type) {
    const all = this.getAll(type);
    const roots = all.filter(c => !c.parent_id);
    const build = (parent) => {
      parent.children = all.filter(c => c.parent_id === parent.id).map(build);
      return parent;
    };
    return roots.map(build);
  },

  create(category) {
    execute(
      'INSERT INTO categories (name, parent_id, type, sort_order) VALUES (?, ?, ?, ?)',
      [category.name || 'New Category', category.parent_id || null, category.type || 'product', category.sort_order || 0]
    );
    return { id: lastInsertId(), ...category };
  },

  update(id, category) {
    execute(
      'UPDATE categories SET name = ?, parent_id = ?, sort_order = ? WHERE id = ?',
      [category.name, category.parent_id || null, category.sort_order || 0, id]
    );
    return { id, ...category };
  },

  delete(id) {
    // Also need to decide what to do with products in this category? 
    // They will have category_id set to NULL due to schema constraint.
    execute('DELETE FROM categories WHERE id = ?', [id]);
    return { success: true };
  }
};
const appointmentsApi = {
  getAll() {
    return queryAll('SELECT * FROM appointments ORDER BY date ASC, time ASC');
  },

  getByDate(date) {
    return queryAll('SELECT * FROM appointments WHERE date = ? ORDER BY time ASC', [date]);
  },

  create(appointment) {
    execute(
      'INSERT INTO appointments (customer_id, customer_name, service_id, service_name, date, time, duration_minutes, price, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        appointment.customer_id || null,
        appointment.customer_name || '',
        appointment.service_id || null,
        appointment.service_name || '',
        appointment.date,
        appointment.time,
        appointment.duration_minutes || 60,
        appointment.price || 0,
        appointment.status || 'scheduled',
        appointment.notes || '',
      ]
    );
    const id = lastInsertId();
    return { id };
  },

  update(id, appointment) {
    execute(
      'UPDATE appointments SET customer_id=?, customer_name=?, service_id=?, service_name=?, date=?, time=?, duration_minutes=?, price=?, status=?, notes=? WHERE id=?',
      [
        appointment.customer_id || null,
        appointment.customer_name || '',
        appointment.service_id || null,
        appointment.service_name || '',
        appointment.date,
        appointment.time,
        appointment.duration_minutes || 60,
        appointment.price || 0,
        appointment.status || 'scheduled',
        appointment.notes || '',
        id,
      ]
    );
    return { id, ...appointment };
  },

  delete(id) {
    execute('DELETE FROM appointments WHERE id = ?', [id]);
    return { success: true };
  },

  updateStatus(id, status) {
    execute('UPDATE appointments SET status = ? WHERE id = ?', [status, id]);
    return { success: true };
  },
};

// ============================================================
// SERVICES CRUD
// ============================================================
const servicesApi = {
  getAll() {
    return queryAll('SELECT * FROM services WHERE is_active = 1 ORDER BY category, name');
  },

  create(service) {
    execute(
      'INSERT INTO services (name, category, category_id, price, duration_minutes, description) VALUES (?, ?, ?, ?, ?, ?)',
      [service.name, service.category || 'General', service.category_id || null, service.price || 0, service.duration_minutes || 60, service.description || '']
    );
    const id = lastInsertId();
    return { id, ...service };
  },

  update(id, service) {
    execute(
      'UPDATE services SET name=?, category=?, category_id=?, price=?, duration_minutes=?, description=? WHERE id=?',
      [service.name, service.category || 'General', service.category_id || null, service.price || 0, service.duration_minutes || 60, service.description || '', id]
    );
    return { id, ...service };
  },

  delete(id) {
    execute('UPDATE services SET is_active = 0 WHERE id = ?', [id]);
    return { success: true };
  },
};

// ============================================================
// DASHBOARD STATS
// ============================================================
const dashboardApi = {
  getStats() {
    const todaySales = queryOne(
      "SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM sales WHERE date(created_at) = date('now','localtime')"
    );

    const monthSales = queryOne(
      "SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM sales WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', 'localtime')"
    );

    const totalCustomers = queryOne('SELECT COUNT(*) as count FROM customers');

    const todayAppointments = queryOne(
      "SELECT COUNT(*) as count FROM appointments WHERE date = date('now','localtime')"
    );

    const lowStockProducts = queryOne(
      'SELECT COUNT(*) as count FROM products WHERE stock <= 5 AND is_service = 0'
    );

    return {
      todaySales: todaySales || { count: 0, total: 0 },
      monthSales: monthSales || { count: 0, total: 0 },
      totalCustomers: totalCustomers || { count: 0 },
      todayAppointments: todayAppointments || { count: 0 },
      lowStockProducts: lowStockProducts || { count: 0 },
    };
  },
};

const systemApi = {
  reset() {
    execute('DELETE FROM sales');
    execute('DELETE FROM appointments');
    execute('DELETE FROM products');
    execute('DELETE FROM services');
    execute('DELETE FROM customers');
    execute('DELETE FROM categories');
    // We keep settings
    saveDatabase();
    return { success: true };
  }
};

module.exports = {
  initialize,
  products: productsApi,
  sales: salesApi,
  customers: customersApi,
  appointments: appointmentsApi,
  services: servicesApi,
  categories: categoriesApi,
  dashboard: dashboardApi,
  settings: settingsApi,
  system: systemApi
};
