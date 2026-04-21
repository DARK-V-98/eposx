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
  seedSampleData();
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

  seedSampleData();
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

function seedSampleData() {
  const count = queryOne('SELECT COUNT(*) as cnt FROM products');
  if (count && count.cnt > 0) return;

  // Sample Products
  const products = [
    ['Shampoo - Premium', 'Hair Care', 15.99, 8.50, 45, 'HC-001', 0],
    ['Conditioner - Silk', 'Hair Care', 18.99, 10.00, 38, 'HC-002', 0],
    ['Hair Serum', 'Hair Care', 24.99, 12.00, 25, 'HC-003', 0],
    ['Hair Gel - Strong Hold', 'Hair Care', 12.99, 6.00, 60, 'HC-004', 0],
    ['Face Cream - Anti Aging', 'Skin Care', 34.99, 18.00, 20, 'SC-001', 0],
    ['Sunscreen SPF 50', 'Skin Care', 22.99, 11.00, 35, 'SC-002', 0],
    ['Face Wash - Gentle', 'Skin Care', 14.99, 7.00, 50, 'SC-003', 0],
    ['Moisturizer - Daily', 'Skin Care', 19.99, 9.50, 40, 'SC-004', 0],
    ['Nail Polish Set', 'Nails', 29.99, 14.00, 15, 'NL-001', 0],
    ['Nail Art Kit', 'Nails', 39.99, 20.00, 10, 'NL-002', 0],
    ['Makeup Foundation', 'Makeup', 28.99, 14.00, 30, 'MK-001', 0],
    ['Lipstick Collection', 'Makeup', 19.99, 9.00, 25, 'MK-002', 0],
    ['Eye Shadow Palette', 'Makeup', 34.99, 17.00, 18, 'MK-003', 0],
    ['Mascara - Waterproof', 'Makeup', 16.99, 8.00, 42, 'MK-004', 0],
    ['Perfume - Classic', 'Fragrance', 49.99, 25.00, 12, 'FR-001', 0],
    ['Body Lotion - Vanilla', 'Body Care', 17.99, 8.50, 30, 'BC-001', 0],
    ['SD Card 128GB', 'Accessories', 35.00, 15.00, 20, 'PH-001', 0],
    ['Camera Lens Filter', 'Accessories', 45.00, 22.00, 10, 'PH-002', 0],
    ['Photo Frame 8x10', 'Decor', 12.00, 5.00, 50, 'PH-003', 0],
    ['Battery Pack pack LP-E6', 'Accessories', 55.00, 25.00, 8, 'PH-004', 0],
  ];

  for (const p of products) {
    execute(
      'INSERT INTO products (name, category, price, cost, stock, sku, is_service) VALUES (?, ?, ?, ?, ?, ?, ?)',
      p
    );
  }

  // Sample Services
  const services = [
    ['Haircut - Basic', 'Hair', 25.00, 30, 'Basic haircut with wash and style'],
    ['Haircut - Premium', 'Hair', 45.00, 60, 'Premium cut with consultation, wash, and premium styling'],
    ['Hair Coloring', 'Hair', 85.00, 120, 'Full hair coloring with premium dyes'],
    ['Highlights', 'Hair', 95.00, 150, 'Partial or full highlights'],
    ['Hair Treatment', 'Hair', 55.00, 45, 'Deep conditioning and treatment'],
    ['Facial - Basic', 'Skin', 40.00, 45, 'Basic cleansing facial'],
    ['Facial - Premium', 'Skin', 75.00, 90, 'Premium facial with advanced treatments'],
    ['Manicure', 'Nails', 30.00, 45, 'Full manicure with polish'],
    ['Pedicure', 'Nails', 35.00, 60, 'Full pedicure with polish'],
    ['Nail Art', 'Nails', 50.00, 75, 'Custom nail art design'],
    ['Makeup - Bridal', 'Makeup', 150.00, 120, 'Full bridal makeup with trial'],
    ['Makeup - Event', 'Makeup', 80.00, 60, 'Professional event makeup'],
    ['Eyebrow Threading', 'Beauty', 15.00, 15, 'Eyebrow threading and shaping'],
    ['Waxing - Full Body', 'Beauty', 120.00, 90, 'Full body waxing service'],
    ['Outdoor Photo Shoot', 'Photography', 150.00, 120, '2-hour outdoor photo session'],
    ['Product Photography', 'Photography', 200.00, 180, 'Professional product shots for catalog'],
    ['Wedding Highlights', 'Video', 450.00, 240, 'Cinematic wedding highlight video'],
    ['Passport Photos', 'Studio', 15.00, 10, 'Instant passport size photos'],
  ];

  for (const s of services) {
    execute(
      'INSERT INTO services (name, category, price, duration_minutes, description) VALUES (?, ?, ?, ?, ?)',
      s
    );
  }

  // Sample Customers
  const customers = [
    ['Sarah Johnson', '555-0101', 'sarah@email.com', 'Regular customer, prefers organic products', 450.00, 12],
    ['Emily Davis', '555-0102', 'emily@email.com', 'Allergic to certain dyes', 320.00, 8],
    ['Jessica Williams', '555-0103', 'jessica@email.com', 'VIP customer', 890.00, 24],
    ['Amanda Brown', '555-0104', 'amanda@email.com', 'Prefers afternoon appointments', 210.00, 6],
    ['Michelle Taylor', '555-0105', 'michelle@email.com', 'New customer', 75.00, 2],
  ];

  for (const c of customers) {
    execute(
      'INSERT INTO customers (name, phone, email, notes, total_spent, visit_count) VALUES (?, ?, ?, ?, ?, ?)',
      c
    );
  }

  // Sample Sales (last 30 days)
  const productPrices = [15.99, 18.99, 24.99, 12.99, 34.99, 22.99, 14.99, 19.99, 29.99, 39.99, 28.99, 19.99, 34.99, 16.99, 49.99, 17.99];

  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0] + ' ' +
      String(9 + Math.floor(Math.random() * 9)).padStart(2, '0') + ':' +
      String(Math.floor(Math.random() * 60)).padStart(2, '0') + ':00';

    const numSales = 1 + Math.floor(Math.random() * 4);
    for (let j = 0; j < numSales; j++) {
      const customerId = 1 + Math.floor(Math.random() * 5);
      const itemCount = 1 + Math.floor(Math.random() * 3);
      const items = [];
      let subtotal = 0;

      for (let k = 0; k < itemCount; k++) {
        const productId = 1 + Math.floor(Math.random() * 16);
        const qty = 1 + Math.floor(Math.random() * 3);
        const price = productPrices[productId - 1];
        items.push({ productId, name: `Product ${productId}`, qty, price });
        subtotal += price * qty;
      }

      const discount = Math.random() > 0.7 ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
      const tax = Math.round((subtotal - discount) * 0.05 * 100) / 100;
      const total = Math.round((subtotal - discount + tax) * 100) / 100;
      const method = ['cash', 'card', 'cash', 'card', 'cash'][Math.floor(Math.random() * 5)];

      db.run(
        'INSERT INTO sales (customer_id, items, subtotal, discount, tax, total, payment_method, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [customerId, JSON.stringify(items), subtotal, discount, tax, total, method, dateStr]
      );
    }
  }

  // Sample Appointments
  const today = new Date();
  const custNames = ['Sarah Johnson', 'Emily Davis', 'Jessica Williams', 'Amanda Brown', 'Michelle Taylor'];
  const svcNames = ['Haircut - Basic', 'Haircut - Premium', 'Hair Coloring', 'Highlights', 'Hair Treatment', 'Facial - Basic', 'Facial - Premium', 'Manicure', 'Pedicure', 'Nail Art', 'Makeup - Bridal', 'Makeup - Event', 'Eyebrow Threading', 'Waxing - Full Body'];
  const svcPrices = [25, 45, 85, 95, 55, 40, 75, 30, 35, 50, 150, 80, 15, 120];
  const svcDurations = [30, 60, 120, 150, 45, 45, 90, 45, 60, 75, 120, 60, 15, 90];

  for (let i = -2; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const numAppts = 1 + Math.floor(Math.random() * 3);
    for (let j = 0; j < numAppts; j++) {
      const custId = 1 + Math.floor(Math.random() * 5);
      const svcId = 1 + Math.floor(Math.random() * 14);
      const time = `${String(9 + j * 2).padStart(2, '0')}:00`;
      const status = i < 0 ? 'completed' : i === 0 ? 'confirmed' : 'scheduled';

      db.run(
        'INSERT INTO appointments (customer_id, customer_name, service_id, service_name, date, time, duration_minutes, price, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [custId, custNames[custId - 1], svcId, svcNames[svcId - 1], dateStr, time, svcDurations[svcId - 1], svcPrices[svcId - 1], status]
      );
    }
  }

  saveDatabase();
  console.log('[E POS X] Sample data seeded successfully');
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

module.exports = {
  initialize,
  products: productsApi,
  sales: salesApi,
  customers: customersApi,
  appointments: appointmentsApi,
  services: servicesApi,
  categories: categoriesApi,
  dashboard: dashboardApi,
  settings: settingsApi
};
