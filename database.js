const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

// Electron is optional — when running inside the server there is no electron.
let app = null;
try {
  app = require('electron').app || null;
} catch (_) {
  app = null;
}

let db;
let dbPath;

function getDbPath() {
  // 1) Explicit override (used by the standalone server)
  if (process.env.EPOSX_DB_PATH) return process.env.EPOSX_DB_PATH;
  // 2) Electron app userData dir
  if (app && typeof app.getPath === 'function') {
    return path.join(app.getPath('userData'), 'eposx.db');
  }
  // 3) Fallback: alongside the process cwd
  return path.join(process.cwd(), 'eposx.db');
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

  // Save on app quit (Electron only)
  if (app && typeof app.on === 'function') {
    app.on('before-quit', () => {
      clearInterval(saveInterval);
      saveDatabase();
    });
  } else {
    // Standalone server: flush on process exit signals
    const flush = () => { try { clearInterval(saveInterval); saveDatabase(); } catch (_) {} };
    process.on('SIGINT', () => { flush(); process.exit(0); });
    process.on('SIGTERM', () => { flush(); process.exit(0); });
    process.on('exit', flush);
  }
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

  // Returns / Refunds log
  db.run(`
    CREATE TABLE IF NOT EXISTS returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      items TEXT NOT NULL,          -- JSON of returned items [{productId, serviceId, name, qty, price}]
      refund_amount REAL NOT NULL DEFAULT 0,
      reason TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
    )
  `);

  // Quotations
  db.run(`
    CREATE TABLE IF NOT EXISTS quotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      customer_name TEXT,
      items TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      discount REAL DEFAULT 0,
      tax REAL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'pending',     -- pending | converted | expired
      valid_until TEXT,
      notes TEXT,
      converted_sale_id INTEGER,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    )
  `);

  // Expenses (for income vs expenses / profit & loss)
  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT DEFAULT 'General',   -- Rent, Salaries, Stock Purchase, Utilities, ...
      description TEXT,
      amount REAL NOT NULL DEFAULT 0,
      payment_method TEXT DEFAULT 'cash',
      date TEXT DEFAULT (date('now','localtime')),
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // Cash drawer sessions (open / close till, Z-report)
  db.run(`
    CREATE TABLE IF NOT EXISTS cash_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opened_at TEXT DEFAULT (datetime('now','localtime')),
      opening_float REAL NOT NULL DEFAULT 0,
      closed_at TEXT,
      counted_cash REAL,
      expected_cash REAL,
      difference REAL,
      cash_sales REAL DEFAULT 0,
      card_sales REAL DEFAULT 0,
      cash_expenses REAL DEFAULT 0,
      opened_by TEXT,
      closed_by TEXT,
      notes TEXT,
      status TEXT DEFAULT 'open'          -- open | closed
    )
  `);

  // Payments / settlements (customer credit dues)
  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      sale_id INTEGER,
      amount REAL NOT NULL DEFAULT 0,
      method TEXT DEFAULT 'cash',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL
    )
  `);

  // Coupons / discount codes
  db.run(`
    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      type TEXT DEFAULT 'percent',        -- percent | fixed
      value REAL NOT NULL DEFAULT 0,
      min_spend REAL DEFAULT 0,
      expires_on TEXT,
      usage_limit INTEGER DEFAULT 0,      -- 0 = unlimited
      used_count INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // Migrations on existing tables (ignore if already added)
  try { db.run('ALTER TABLE sales ADD COLUMN original_total REAL'); } catch (_) {}
  try { db.run('ALTER TABLE sales ADD COLUMN refunded_total REAL DEFAULT 0'); } catch (_) {}
  try { db.run('ALTER TABLE sales ADD COLUMN invoice_no TEXT'); } catch (_) {}
  try { db.run('ALTER TABLE sales ADD COLUMN amount_paid REAL'); } catch (_) {}
  try { db.run('ALTER TABLE sales ADD COLUMN due_amount REAL DEFAULT 0'); } catch (_) {}
  try { db.run('ALTER TABLE customers ADD COLUMN loyalty_points REAL DEFAULT 0'); } catch (_) {}

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
      ['invoice_prefix', 'INV'],
      ['loyalty_earn_per', '100'],     // 1 point per 100 LKR spent
      ['loyalty_redeem_value', '1'],   // 1 point = 1 LKR on redemption
    ];
    for (const [k, v] of defaults) {
      db.run('INSERT INTO settings (key, value) VALUES (?, ?)', [k, v]);
    }
  }

  // Backfill newer settings keys for databases created before they existed.
  const ensureSettings = [
    ['currency', 'LKR'],
    ['invoice_prefix', 'INV'],
    ['loyalty_earn_per', '100'],
    ['loyalty_redeem_value', '1'],
  ];
  for (const [k, v] of ensureSettings) {
    db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [k, v]);
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
  get(key) {
    const row = queryOne('SELECT value FROM settings WHERE key = ?', [key]);
    return row ? row.value : null;
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

// Helper: run INSERT/UPDATE/DELETE.
// We read last_insert_rowid() BEFORE saveDatabase(), because db.export()
// resets the rowid to 0 — otherwise create() would return id 0.
let _lastInsertId = 0;
function execute(sql, params = []) {
  db.run(sql, params);
  try {
    const r = queryOne('SELECT last_insert_rowid() as id');
    if (r && r.id) _lastInsertId = r.id;
  } catch (_) {}
  saveDatabase();
}

// Helper: get last inserted row id
function lastInsertId() {
  return _lastInsertId;
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
    const total = sale.total || 0;
    // Credit / partial payment: amount actually paid now, remainder is a due.
    const amountPaid = sale.amount_paid != null ? Number(sale.amount_paid) : total;
    const due = round2(Math.max(0, total - amountPaid));
    const paymentMethod = due > 0 ? (amountPaid > 0 ? 'credit-partial' : 'credit') : (sale.payment_method || 'cash');

    execute(
      'INSERT INTO sales (customer_id, items, subtotal, discount, tax, total, payment_method, notes, amount_paid, due_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        sale.customer_id || null,
        itemsStr,
        sale.subtotal || 0,
        sale.discount || 0,
        sale.tax || 0,
        total,
        paymentMethod,
        sale.notes || '',
        round2(amountPaid),
        due,
      ]
    );
    const id = lastInsertId();

    // Formatted invoice number: <PREFIX>-<YEAR>-<zero-padded id>
    const prefix = (settingsApi.get('invoice_prefix') || 'INV');
    const year = new Date().getFullYear();
    const invoiceNo = `${prefix}-${year}-${String(id).padStart(4, '0')}`;
    execute('UPDATE sales SET invoice_no = ? WHERE id = ?', [invoiceNo, id]);

    // Update product stock
    const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
    if (items) {
      for (const item of items) {
        if (item.productId) {
          execute('UPDATE products SET stock = stock - ? WHERE id = ?', [item.qty, item.productId]);
        }
      }
    }

    // Update customer stats + loyalty points + record any credit settlement
    if (sale.customer_id) {
      execute(
        'UPDATE customers SET total_spent = total_spent + ?, visit_count = visit_count + 1, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?',
        [total, sale.customer_id]
      );

      // Loyalty: award points on the purchase value (so credit buyers
      // earn the same as upfront payers).
      const earnPer = Number(settingsApi.get('loyalty_earn_per') || 0);
      if (earnPer > 0) {
        const earned = Math.floor(total / earnPer);
        if (earned > 0) {
          execute('UPDATE customers SET loyalty_points = COALESCE(loyalty_points,0) + ? WHERE id = ?', [earned, sale.customer_id]);
        }
      }
      // Redeem points used at checkout (passed as sale.points_redeemed)
      if (sale.points_redeemed > 0) {
        execute('UPDATE customers SET loyalty_points = MAX(0, COALESCE(loyalty_points,0) - ?) WHERE id = ?', [sale.points_redeemed, sale.customer_id]);
      }

      // Log the up-front payment against this sale (for receivables ledger)
      if (amountPaid > 0) {
        execute('INSERT INTO payments (customer_id, sale_id, amount, method, notes) VALUES (?, ?, ?, ?, ?)',
          [sale.customer_id, id, round2(amountPaid), sale.payment_method || 'cash', 'Sale payment']);
      }
    }

    // Increment coupon usage if one was applied
    if (sale.coupon_code) {
      execute("UPDATE coupons SET used_count = used_count + 1 WHERE code = ?", [sale.coupon_code]);
    }

    // Feed the open cash session (for Z-report)
    cashApi._recordSale({ total, amountPaid, method: sale.payment_method || 'cash' });

    return { id, invoice_no: invoiceNo, due_amount: due };
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

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// ============================================================
// RETURNS / REFUNDS
// ============================================================
const returnsApi = {
  // Load a sale by invoice number with parsed items + remaining quantities.
  getInvoice(saleId) {
    const sale = queryOne(
      `SELECT s.*, COALESCE(c.name, 'Walk-in Customer') as customer_name
       FROM sales s LEFT JOIN customers c ON s.customer_id = c.id
       WHERE s.id = ?`, [saleId]
    );
    if (!sale) return null;
    let items = [];
    try { items = JSON.parse(sale.items || '[]'); } catch (_) {}
    // Ensure each line carries returnedQty + remaining for the UI.
    items = items.map((it) => {
      const returnedQty = it.returnedQty || 0;
      return { ...it, returnedQty, remaining: Math.max(0, (it.qty || 0) - returnedQty) };
    });
    return { ...sale, items };
  },

  getAll() {
    return queryAll('SELECT * FROM returns ORDER BY created_at DESC');
  },

  getBySale(saleId) {
    return queryAll('SELECT * FROM returns WHERE sale_id = ? ORDER BY created_at DESC', [saleId]);
  },

  // returnRequest: { sale_id, reason, items: [{ index, qty }] }
  // `index` is the position in the sale's items array; qty is how many to return.
  create(returnRequest) {
    const sale = queryOne('SELECT * FROM sales WHERE id = ?', [returnRequest.sale_id]);
    if (!sale) throw new Error(`Invoice #${returnRequest.sale_id} not found`);
    if (sale.status === 'cancelled') throw new Error(`Invoice #${returnRequest.sale_id} is already cancelled`);

    let items = [];
    try { items = JSON.parse(sale.items || '[]'); } catch (_) {}

    const origSubtotal = items.reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0);
    const returnedLines = [];
    let returnedValue = 0;

    for (const req of (returnRequest.items || [])) {
      const it = items[req.index];
      if (!it) continue;
      const already = it.returnedQty || 0;
      const remaining = (it.qty || 0) - already;
      const qty = Math.min(Math.max(0, Math.floor(req.qty)), remaining);
      if (qty <= 0) continue;

      it.returnedQty = already + qty;
      returnedValue += (it.price || 0) * qty;
      returnedLines.push({ productId: it.productId || null, serviceId: it.serviceId || null, name: it.name, qty, price: it.price || 0 });

      // Restore stock for physical products only
      if (it.productId) {
        execute('UPDATE products SET stock = stock + ? WHERE id = ?', [qty, it.productId]);
      }
    }

    if (returnedLines.length === 0) throw new Error('No valid items selected to return');

    // Proportional refund (keeps discount + tax ratio intact)
    const ratio = origSubtotal > 0 ? returnedValue / origSubtotal : 1;
    const refundAmount = round2((sale.total || 0) * ratio);

    // Recompute remaining invoice figures
    const remainingSubtotal = items.reduce((s, it) => s + (it.price || 0) * ((it.qty || 0) - (it.returnedQty || 0)), 0);
    const allReturned = items.every((it) => ((it.qty || 0) - (it.returnedQty || 0)) <= 0);
    const remainingRatio = origSubtotal > 0 ? remainingSubtotal / origSubtotal : 0;

    const newSubtotal = round2(remainingSubtotal);
    const newDiscount = round2((sale.discount || 0) * remainingRatio);
    const newTax = round2((sale.tax || 0) * remainingRatio);
    const newTotal = round2((sale.total || 0) * remainingRatio);
    const originalTotal = sale.original_total != null ? sale.original_total : sale.total;
    const newRefunded = round2((sale.refunded_total || 0) + refundAmount);
    const status = allReturned ? 'cancelled' : 'partially_returned';

    execute(
      `UPDATE sales SET items = ?, subtotal = ?, discount = ?, tax = ?, total = ?,
         original_total = ?, refunded_total = ?, status = ? WHERE id = ?`,
      [JSON.stringify(items), newSubtotal, newDiscount, newTax, newTotal,
       originalTotal, newRefunded, status, sale.id]
    );

    // Reduce customer lifetime spend
    if (sale.customer_id) {
      execute(
        "UPDATE customers SET total_spent = MAX(0, total_spent - ?), updated_at = datetime('now','localtime') WHERE id = ?",
        [refundAmount, sale.customer_id]
      );
    }

    execute(
      'INSERT INTO returns (sale_id, items, refund_amount, reason) VALUES (?, ?, ?, ?)',
      [sale.id, JSON.stringify(returnedLines), refundAmount, returnRequest.reason || '']
    );

    return {
      success: true,
      sale_id: sale.id,
      refund_amount: refundAmount,
      status,
      cancelled: allReturned,
      new_total: newTotal,
    };
  },
};

// ============================================================
// QUOTATIONS
// ============================================================
const quotationsApi = {
  getAll() {
    return queryAll('SELECT * FROM quotations ORDER BY created_at DESC');
  },

  getById(id) {
    return queryOne('SELECT * FROM quotations WHERE id = ?', [id]);
  },

  create(q) {
    const itemsStr = typeof q.items === 'string' ? q.items : JSON.stringify(q.items || []);
    execute(
      `INSERT INTO quotations (customer_id, customer_name, items, subtotal, discount, tax, total, status, valid_until, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        q.customer_id || null,
        q.customer_name || 'Walk-in Customer',
        itemsStr,
        q.subtotal || 0,
        q.discount || 0,
        q.tax || 0,
        q.total || 0,
        q.status || 'pending',
        q.valid_until || null,
        q.notes || '',
      ]
    );
    return { id: lastInsertId() };
  },

  update(id, q) {
    const itemsStr = typeof q.items === 'string' ? q.items : JSON.stringify(q.items || []);
    execute(
      `UPDATE quotations SET customer_id=?, customer_name=?, items=?, subtotal=?, discount=?, tax=?, total=?, valid_until=?, notes=? WHERE id=?`,
      [q.customer_id || null, q.customer_name || 'Walk-in Customer', itemsStr,
       q.subtotal || 0, q.discount || 0, q.tax || 0, q.total || 0,
       q.valid_until || null, q.notes || '', id]
    );
    return { id, ...q };
  },

  delete(id) {
    execute('DELETE FROM quotations WHERE id = ?', [id]);
    return { success: true };
  },

  // Turn an accepted quotation into a real invoice (sale).
  convertToInvoice(id, opts = {}) {
    const q = queryOne('SELECT * FROM quotations WHERE id = ?', [id]);
    if (!q) throw new Error(`Quotation #${id} not found`);
    if (q.status === 'converted') throw new Error(`Quotation #${id} was already converted to invoice #${q.converted_sale_id}`);

    let items = [];
    try { items = JSON.parse(q.items || '[]'); } catch (_) {}

    const sale = salesApi.create({
      customer_id: q.customer_id,
      items,
      subtotal: q.subtotal,
      discount: q.discount,
      tax: q.tax,
      total: q.total,
      payment_method: opts.payment_method || 'cash',
      notes: `From Quotation #${id}` + (q.notes ? ` — ${q.notes}` : ''),
    });

    execute('UPDATE quotations SET status = ?, converted_sale_id = ? WHERE id = ?', ['converted', sale.id, id]);
    return { success: true, sale_id: sale.id, quotation_id: id };
  },
};

// ============================================================
// EXPENSES
// ============================================================
const expensesApi = {
  getAll() {
    return queryAll('SELECT * FROM expenses ORDER BY date DESC, id DESC');
  },
  getByDateRange(start, end) {
    return queryAll('SELECT * FROM expenses WHERE date BETWEEN ? AND ? ORDER BY date DESC', [start, end]);
  },
  create(e) {
    execute(
      'INSERT INTO expenses (category, description, amount, payment_method, date) VALUES (?, ?, ?, ?, ?)',
      [e.category || 'General', e.description || '', e.amount || 0, e.payment_method || 'cash', e.date || new Date().toISOString().split('T')[0]]
    );
    // Cash-paid expenses reduce the till
    if ((e.payment_method || 'cash') === 'cash') {
      cashApi._recordCashExpense(Number(e.amount) || 0);
    }
    return { id: lastInsertId() };
  },
  update(id, e) {
    execute(
      'UPDATE expenses SET category=?, description=?, amount=?, payment_method=?, date=? WHERE id=?',
      [e.category || 'General', e.description || '', e.amount || 0, e.payment_method || 'cash', e.date, id]
    );
    return { id, ...e };
  },
  delete(id) {
    execute('DELETE FROM expenses WHERE id = ?', [id]);
    return { success: true };
  },
  // Total expenses for a period (defaults to current month)
  getSummary(start, end) {
    const where = start && end ? 'WHERE date BETWEEN ? AND ?' : '';
    const params = start && end ? [start, end] : [];
    const row = queryOne(`SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count FROM expenses ${where}`, params);
    const byCat = queryAll(`SELECT category, COALESCE(SUM(amount),0) as total FROM expenses ${where} GROUP BY category ORDER BY total DESC`, params);
    return { total: row.total, count: row.count, byCategory: byCat };
  },
};

// ============================================================
// CASH DRAWER / SHIFT (Z-report)
// ============================================================
const cashApi = {
  getCurrent() {
    return queryOne("SELECT * FROM cash_sessions WHERE status = 'open' ORDER BY id DESC LIMIT 1");
  },
  open(data) {
    const existing = this.getCurrent();
    if (existing) throw new Error('A cash session is already open. Close it first.');
    execute('INSERT INTO cash_sessions (opening_float, opened_by, notes) VALUES (?, ?, ?)',
      [Number(data.opening_float) || 0, data.opened_by || '', data.notes || '']);
    return this.getCurrent();
  },
  close(data) {
    const s = this.getCurrent();
    if (!s) throw new Error('No open cash session to close.');
    const expected = round2((s.opening_float || 0) + (s.cash_sales || 0) - (s.cash_expenses || 0));
    const counted = Number(data.counted_cash) || 0;
    const difference = round2(counted - expected);
    execute(
      `UPDATE cash_sessions SET closed_at = datetime('now','localtime'), counted_cash = ?, expected_cash = ?, difference = ?, closed_by = ?, notes = ?, status = 'closed' WHERE id = ?`,
      [counted, expected, difference, data.closed_by || '', data.notes || s.notes || '', s.id]
    );
    return queryOne('SELECT * FROM cash_sessions WHERE id = ?', [s.id]);
  },
  getAll() {
    return queryAll('SELECT * FROM cash_sessions ORDER BY id DESC LIMIT 100');
  },
  // Internal: called from sales.create — split paid amount into cash/card buckets.
  _recordSale({ total, amountPaid, method }) {
    const s = this.getCurrent();
    if (!s) return;
    const paid = Number(amountPaid) || 0;
    if (method === 'card') {
      execute('UPDATE cash_sessions SET card_sales = card_sales + ? WHERE id = ?', [round2(paid), s.id]);
    } else if (method === 'split') {
      // best-effort: treat half/half unknown -> count full as cash unless caller splits
      execute('UPDATE cash_sessions SET cash_sales = cash_sales + ? WHERE id = ?', [round2(paid), s.id]);
    } else {
      execute('UPDATE cash_sessions SET cash_sales = cash_sales + ? WHERE id = ?', [round2(paid), s.id]);
    }
  },
  _recordCashExpense(amount) {
    const s = this.getCurrent();
    if (!s) return;
    execute('UPDATE cash_sessions SET cash_expenses = cash_expenses + ? WHERE id = ?', [round2(amount), s.id]);
  },
};

// ============================================================
// CUSTOMER CREDIT / DUES (receivables)
// ============================================================
const duesApi = {
  // Customers with an outstanding balance
  getCustomersWithDue() {
    return queryAll(`
      SELECT c.id, c.name, c.phone, c.loyalty_points,
             COALESCE(SUM(s.due_amount), 0) as total_due,
             COUNT(s.id) as open_invoices
      FROM customers c
      JOIN sales s ON s.customer_id = c.id
      WHERE s.due_amount > 0 AND s.status != 'cancelled'
      GROUP BY c.id
      ORDER BY total_due DESC
    `);
  },
  // Open (unpaid) invoices for a customer
  getCustomerDues(customerId) {
    return queryAll(
      "SELECT id, invoice_no, total, amount_paid, due_amount, created_at FROM sales WHERE customer_id = ? AND due_amount > 0 AND status != 'cancelled' ORDER BY created_at ASC",
      [customerId]
    );
  },
  // Settle (fully or partially) a specific invoice
  settle({ sale_id, amount, method, notes }) {
    const sale = queryOne('SELECT * FROM sales WHERE id = ?', [sale_id]);
    if (!sale) throw new Error(`Invoice #${sale_id} not found`);
    const pay = Math.min(Number(amount) || 0, sale.due_amount || 0);
    if (pay <= 0) throw new Error('Invalid settlement amount');

    const newPaid = round2((sale.amount_paid || 0) + pay);
    const newDue = round2((sale.due_amount || 0) - pay);
    const newMethod = newDue <= 0 ? 'paid' : 'credit-partial';
    execute('UPDATE sales SET amount_paid = ?, due_amount = ?, payment_method = ? WHERE id = ?',
      [newPaid, newDue, newMethod, sale_id]);

    if (sale.customer_id) {
      execute('INSERT INTO payments (customer_id, sale_id, amount, method, notes) VALUES (?, ?, ?, ?, ?)',
        [sale.customer_id, sale_id, pay, method || 'cash', notes || 'Due settlement']);
    }
    if ((method || 'cash') === 'cash') cashApi._recordSale({ total: pay, amountPaid: pay, method: 'cash' });

    return { success: true, sale_id, paid: pay, remaining_due: newDue };
  },
  getPayments(customerId) {
    return queryAll('SELECT * FROM payments WHERE customer_id = ? ORDER BY created_at DESC', [customerId]);
  },
};

// ============================================================
// COUPONS / DISCOUNT CODES
// ============================================================
const couponsApi = {
  getAll() { return queryAll('SELECT * FROM coupons ORDER BY id DESC'); },
  create(c) {
    execute(
      'INSERT INTO coupons (code, type, value, min_spend, expires_on, usage_limit, active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [String(c.code).toUpperCase().trim(), c.type || 'percent', c.value || 0, c.min_spend || 0, c.expires_on || null, c.usage_limit || 0, c.active != null ? c.active : 1]
    );
    return { id: lastInsertId() };
  },
  update(id, c) {
    execute('UPDATE coupons SET code=?, type=?, value=?, min_spend=?, expires_on=?, usage_limit=?, active=? WHERE id=?',
      [String(c.code).toUpperCase().trim(), c.type, c.value, c.min_spend || 0, c.expires_on || null, c.usage_limit || 0, c.active != null ? c.active : 1, id]);
    return { id, ...c };
  },
  delete(id) { execute('DELETE FROM coupons WHERE id = ?', [id]); return { success: true }; },
  // Validate a code against a cart subtotal; returns discount amount + meta.
  validate(code, subtotal) {
    const c = queryOne('SELECT * FROM coupons WHERE code = ?', [String(code).toUpperCase().trim()]);
    if (!c) throw new Error('Invalid coupon code');
    if (!c.active) throw new Error('This coupon is no longer active');
    if (c.expires_on && c.expires_on < new Date().toISOString().split('T')[0]) throw new Error('This coupon has expired');
    if (c.usage_limit > 0 && c.used_count >= c.usage_limit) throw new Error('This coupon has reached its usage limit');
    if (subtotal < (c.min_spend || 0)) throw new Error(`Minimum spend of ${c.min_spend} required`);
    const discount = c.type === 'fixed' ? Math.min(c.value, subtotal) : round2((subtotal * c.value) / 100);
    return { valid: true, code: c.code, type: c.type, value: c.value, discount };
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

  // Profit & Loss for a date range (defaults to current month).
  getProfitLoss(start, end) {
    const useRange = start && end;
    const salesWhere = useRange ? "date(created_at) BETWEEN ? AND ?" : "strftime('%Y-%m', created_at) = strftime('%Y-%m','now','localtime')";
    const expWhere = useRange ? "date BETWEEN ? AND ?" : "strftime('%Y-%m', date) = strftime('%Y-%m','now','localtime')";
    const p = useRange ? [start, end] : [];

    const income = queryOne(`SELECT COALESCE(SUM(total),0) as total, COUNT(*) as orders FROM sales WHERE status != 'cancelled' AND ${salesWhere}`, p);
    const refunds = queryOne(`SELECT COALESCE(SUM(refunded_total),0) as total FROM sales WHERE ${salesWhere}`, p);
    const expenses = queryOne(`SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE ${expWhere}`, p);
    const expByCat = queryAll(`SELECT category, COALESCE(SUM(amount),0) as total FROM expenses WHERE ${expWhere} GROUP BY category ORDER BY total DESC`, p);

    // Estimated cost of goods sold from product cost vs sold qty
    const soldRows = queryAll(`SELECT items FROM sales WHERE status != 'cancelled' AND ${salesWhere}`, p);
    let cogs = 0;
    const costMap = {};
    for (const r of soldRows) {
      let items = [];
      try { items = JSON.parse(r.items || '[]'); } catch (_) {}
      for (const it of items) {
        if (!it.productId) continue;
        const remaining = (it.qty || 0) - (it.returnedQty || 0);
        if (remaining <= 0) continue;
        if (costMap[it.productId] === undefined) {
          const prod = queryOne('SELECT cost FROM products WHERE id = ?', [it.productId]);
          costMap[it.productId] = prod ? (prod.cost || 0) : 0;
        }
        cogs += costMap[it.productId] * remaining;
      }
    }

    const incomeTotal = round2(income.total);
    const expenseTotal = round2(expenses.total);
    const cogsTotal = round2(cogs);
    const grossProfit = round2(incomeTotal - cogsTotal);
    const netProfit = round2(incomeTotal - cogsTotal - expenseTotal);

    return {
      income: incomeTotal,
      orders: income.orders,
      refunds: round2(refunds.total),
      cogs: cogsTotal,
      grossProfit,
      expenses: expenseTotal,
      expensesByCategory: expByCat,
      netProfit,
    };
  },
};

const systemApi = {
  reset() {
    execute('DELETE FROM returns');
    execute('DELETE FROM quotations');
    execute('DELETE FROM expenses');
    execute('DELETE FROM payments');
    execute('DELETE FROM cash_sessions');
    execute('DELETE FROM coupons');
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
  returns: returnsApi,
  quotations: quotationsApi,
  expenses: expensesApi,
  cash: cashApi,
  dues: duesApi,
  coupons: couponsApi,
  customers: customersApi,
  appointments: appointmentsApi,
  services: servicesApi,
  categories: categoriesApi,
  dashboard: dashboardApi,
  settings: settingsApi,
  system: systemApi
};
