// ============================================================
// E POS X — Standalone API Server
// Reuses the exact same database.js used by the Electron app,
// so PC, web and mobile clients all share one source of truth.
// ============================================================
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

// Store the DB next to the server unless overridden.
if (!process.env.EPOSX_DB_PATH) {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  process.env.EPOSX_DB_PATH = path.join(dataDir, 'eposx.db');
}

const db = require('../database');

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' })); // images can be base64

const PORT = process.env.PORT || 4000;

// Small helper to wrap sync db calls and surface errors as JSON.
const ok = (res, fn) => {
  try {
    res.json(fn());
  } catch (err) {
    console.error('[API] error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ---------------- Products ----------------
app.get('/api/products', (req, res) => ok(res, () => db.products.getAll()));
app.get('/api/products/search', (req, res) => ok(res, () => db.products.search(req.query.q || '')));
app.get('/api/products/:id', (req, res) => ok(res, () => db.products.getById(Number(req.params.id))));
app.post('/api/products', (req, res) => ok(res, () => db.products.create(req.body)));
app.put('/api/products/:id', (req, res) => ok(res, () => db.products.update(Number(req.params.id), req.body)));
app.delete('/api/products/:id', (req, res) => ok(res, () => db.products.delete(Number(req.params.id))));

// ---------------- Sales ----------------
app.get('/api/sales', (req, res) => ok(res, () => db.sales.getAll()));
app.get('/api/sales/search', (req, res) => ok(res, () => db.sales.search(req.query.q || '')));
app.get('/api/sales/today', (req, res) => ok(res, () => db.sales.getToday()));
app.get('/api/sales/range', (req, res) => ok(res, () => db.sales.getByDateRange(req.query.start, req.query.end)));
app.get('/api/sales/daily-summary', (req, res) => ok(res, () => db.sales.getDailySummary(Number(req.query.days) || 30)));
app.get('/api/sales/monthly-summary', (req, res) => ok(res, () => db.sales.getMonthlySummary(Number(req.query.months) || 12)));
app.post('/api/sales', (req, res) => ok(res, () => db.sales.create(req.body)));

// ---------------- Categories ----------------
app.get('/api/categories', (req, res) => ok(res, () => db.categories.getAll(req.query.type)));
app.get('/api/categories/tree', (req, res) => ok(res, () => db.categories.getTree(req.query.type)));
app.post('/api/categories', (req, res) => ok(res, () => db.categories.create(req.body)));
app.put('/api/categories/:id', (req, res) => ok(res, () => db.categories.update(Number(req.params.id), req.body)));
app.delete('/api/categories/:id', (req, res) => ok(res, () => db.categories.delete(Number(req.params.id))));

// ---------------- Customers ----------------
app.get('/api/customers', (req, res) => ok(res, () => db.customers.getAll()));
app.get('/api/customers/search', (req, res) => ok(res, () => db.customers.search(req.query.q || '')));
app.get('/api/customers/:id', (req, res) => ok(res, () => db.customers.getById(Number(req.params.id))));
app.get('/api/customers/:id/history', (req, res) => ok(res, () => db.customers.getHistory(Number(req.params.id))));
app.post('/api/customers', (req, res) => ok(res, () => db.customers.create(req.body)));
app.put('/api/customers/:id', (req, res) => ok(res, () => db.customers.update(Number(req.params.id), req.body)));
app.delete('/api/customers/:id', (req, res) => ok(res, () => db.customers.delete(Number(req.params.id))));

// ---------------- Appointments ----------------
app.get('/api/appointments', (req, res) => ok(res, () => db.appointments.getAll()));
app.get('/api/appointments/by-date', (req, res) => ok(res, () => db.appointments.getByDate(req.query.date)));
app.post('/api/appointments', (req, res) => ok(res, () => db.appointments.create(req.body)));
app.put('/api/appointments/:id', (req, res) => ok(res, () => db.appointments.update(Number(req.params.id), req.body)));
app.put('/api/appointments/:id/status', (req, res) => ok(res, () => db.appointments.updateStatus(Number(req.params.id), req.body.status)));
app.delete('/api/appointments/:id', (req, res) => ok(res, () => db.appointments.delete(Number(req.params.id))));

// ---------------- Services ----------------
app.get('/api/services', (req, res) => ok(res, () => db.services.getAll()));
app.post('/api/services', (req, res) => ok(res, () => db.services.create(req.body)));
app.put('/api/services/:id', (req, res) => ok(res, () => db.services.update(Number(req.params.id), req.body)));
app.delete('/api/services/:id', (req, res) => ok(res, () => db.services.delete(Number(req.params.id))));

// ---------------- Dashboard ----------------
app.get('/api/dashboard/stats', (req, res) => ok(res, () => db.dashboard.getStats()));

// ---------------- Settings ----------------
app.get('/api/settings', (req, res) => ok(res, () => db.settings.getAll()));
app.put('/api/settings', (req, res) => ok(res, () => db.settings.updateAll(req.body)));

// ---------------- System ----------------
app.post('/api/system/reset', (req, res) => ok(res, () => db.system.reset()));

// ---------------- Health ----------------
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Optionally serve the built web app (dist) so one process serves everything.
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

db.initialize().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n[E POS X] API server running on http://localhost:${PORT}`);
    console.log(`[E POS X] DB: ${process.env.EPOSX_DB_PATH}`);
    console.log(`[E POS X] LAN access: http://<this-pc-ip>:${PORT}\n`);
  });
}).catch((err) => {
  console.error('[E POS X] Failed to start:', err);
  process.exit(1);
});
