// ============================================================
// Firestore backend — implements the window.api surface for Cloud
// stores. Data lives under stores/{storeId}/<collection>. Mirrors the
// business logic in database.js (stock, loyalty, dues, refunds, cash,
// P&L) so the same React components work unchanged.
//
// `items` arrays are stored as JSON strings to match the SQLite shape
// that components JSON.parse().
// ============================================================
import { firestore } from '../firebase';
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, setDoc,
  query, where, runTransaction, increment,
} from 'firebase/firestore';
import { getCache } from './realtime';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function pad2(n) { return String(n).padStart(2, '0'); }
function nowStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
function todayStr() { return nowStr().split(' ')[0]; }

const DEFAULT_SETTINGS = {
  company_name: 'E POS X STUDIO',
  currency: 'LKR',
  tax_percentage: '0',
  receipt_footer: 'Thank you for your business!',
  invoice_prefix: 'INV',
  loyalty_earn_per: '100',
  loyalty_redeem_value: '1',
};

export function createFirestoreApi(storeId) {
  const base = ['stores', storeId];
  const col = (name) => collection(firestore, ...base, name);
  const ref = (name, id) => doc(firestore, ...base, name, String(id));

  const listAll = async (name) => {
    // Serve from the realtime cache when available (no extra reads).
    const cached = getCache(name);
    if (cached) return cached;
    const snap = await getDocs(col(name));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  };
  const getOne = async (name, id) => {
    const d = await getDoc(ref(name, id));
    return d.exists() ? { id: d.id, ...d.data() } : null;
  };
  const add = async (name, data) => {
    const r = await addDoc(col(name), data);
    return r.id;
  };
  const set = (name, id, data) => updateDoc(ref(name, id), data);
  const del = (name, id) => deleteDoc(ref(name, id));

  // ---- settings (single doc) ----
  const settingsDoc = () => doc(firestore, ...base, 'meta', 'settings');
  async function getSettings() {
    const d = await getDoc(settingsDoc());
    return { ...DEFAULT_SETTINGS, ...(d.exists() ? d.data() : {}) };
  }
  async function getSetting(key) { return (await getSettings())[key]; }

  // ---- sequential counter (invoice numbers) ----
  async function nextSeq(key) {
    const cref = doc(firestore, ...base, 'meta', 'counters');
    return await runTransaction(firestore, async (tx) => {
      const snap = await tx.get(cref);
      const cur = snap.exists() ? (snap.data()[key] || 0) : 0;
      const next = cur + 1;
      tx.set(cref, { [key]: next }, { merge: true });
      return next;
    });
  }

  const parseItems = (v) => {
    if (Array.isArray(v)) return v;
    try { return JSON.parse(v || '[]'); } catch (_) { return []; }
  };

  // ============================================================
  const products = {
    getAll: () => listAll('products'),
    getById: (id) => getOne('products', id),
    create: async (p) => {
      const data = { name: p.name, category: p.category || 'General', category_id: p.category_id || null,
        price: p.price || 0, cost: p.cost || 0, stock: p.stock || 0, sku: p.sku || '',
        is_service: p.is_service || 0, duration_minutes: p.duration_minutes || 0, image: p.image || null,
        created_at: nowStr(), updated_at: nowStr() };
      const id = await add('products', data);
      return { id, ...data };
    },
    update: async (id, p) => { await set('products', id, { ...p, updated_at: nowStr() }); return { id, ...p }; },
    delete: async (id) => { await del('products', id); return { success: true }; },
    search: async (qy) => {
      const all = await listAll('products');
      const s = (qy || '').toLowerCase();
      return all.filter((p) => [p.name, p.category, p.sku].some((f) => (f || '').toLowerCase().includes(s)));
    },
  };

  const services = {
    getAll: () => listAll('services'),
    create: async (s) => {
      const data = { name: s.name, category: s.category || 'General', price: s.price || 0,
        duration_minutes: s.duration_minutes || 60, description: s.description || '', is_active: 1, created_at: nowStr() };
      const id = await add('services', data);
      return { id, ...data };
    },
    update: async (id, s) => { await set('services', id, s); return { id, ...s }; },
    delete: async (id) => { await set('services', id, { is_active: 0 }); return { success: true }; },
  };

  const categories = {
    getAll: async (type) => {
      const all = await listAll('categories');
      const filtered = type ? all.filter((c) => c.type === type) : all;
      return filtered.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || (a.name || '').localeCompare(b.name || ''));
    },
    getTree: async (type) => {
      const all = await categories.getAll(type);
      const build = (parent) => { parent.children = all.filter((c) => c.parent_id === parent.id).map(build); return parent; };
      return all.filter((c) => !c.parent_id).map(build);
    },
    create: async (c) => {
      const data = { name: c.name || 'New Category', parent_id: c.parent_id || null, type: c.type || 'product', sort_order: c.sort_order || 0 };
      const id = await add('categories', data);
      return { id, ...data };
    },
    update: async (id, c) => { await set('categories', id, { name: c.name, parent_id: c.parent_id || null, sort_order: c.sort_order || 0 }); return { id, ...c }; },
    delete: async (id) => { await del('categories', id); return { success: true }; },
  };

  const customers = {
    getAll: () => listAll('customers'),
    getById: (id) => getOne('customers', id),
    create: async (c) => {
      const data = { name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '',
        notes: c.notes || '', total_spent: 0, visit_count: 0, loyalty_points: 0, created_at: nowStr(), updated_at: nowStr() };
      const id = await add('customers', data);
      return { id, ...data };
    },
    update: async (id, c) => { await set('customers', id, { ...c, updated_at: nowStr() }); return { id, ...c }; },
    delete: async (id) => { await del('customers', id); return { success: true }; },
    search: async (qy) => {
      const all = await listAll('customers');
      const s = (qy || '').toLowerCase();
      return all.filter((c) => [c.name, c.phone, c.email].some((f) => (f || '').toLowerCase().includes(s)));
    },
    getHistory: async (id) => {
      const snap = await getDocs(query(col('sales'), where('customer_id', '==', String(id))));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    },
  };

  // ---- cash drawer helpers ----
  async function currentCashSession() {
    const snap = await getDocs(query(col('cash_sessions'), where('status', '==', 'open')));
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return rows.sort((a, b) => (b.opened_at || '').localeCompare(a.opened_at || ''))[0] || null;
  }
  async function recordCashSale(paid, method) {
    const s = await currentCashSession();
    if (!s) return;
    const field = method === 'card' ? 'card_sales' : 'cash_sales';
    await set('cash_sessions', s.id, { [field]: round2((s[field] || 0) + (Number(paid) || 0)) });
  }
  async function recordCashExpense(amount) {
    const s = await currentCashSession();
    if (!s) return;
    await set('cash_sessions', s.id, { cash_expenses: round2((s.cash_expenses || 0) + (Number(amount) || 0)) });
  }

  const sales = {
    getAll: async () => {
      const [salesRows, custRows] = await Promise.all([listAll('sales'), listAll('customers')]);
      const cmap = Object.fromEntries(custRows.map((c) => [c.id, c.name]));
      return salesRows.map((s) => ({ ...s, customer_name: cmap[s.customer_id] || 'Walk-in Customer' }))
        .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    },
    search: async (qy) => {
      const all = await sales.getAll();
      const s = (qy || '').toLowerCase();
      return all.filter((r) => [String(r.orderNo || r.id), r.invoice_no, r.customer_name, r.notes].some((f) => (f || '').toLowerCase().includes(s)));
    },
    getToday: async () => {
      const all = await sales.getAll();
      const t = todayStr();
      return all.filter((s) => (s.created_at || '').startsWith(t));
    },
    getByDateRange: async (start, end) => {
      const all = await sales.getAll();
      return all.filter((s) => { const d = (s.created_at || '').split(' ')[0]; return d >= start && d <= end; });
    },
    getDailySummary: async (days = 7) => {
      const all = await sales.getAll();
      const map = {};
      all.forEach((s) => { const d = (s.created_at || '').split(' ')[0]; if (!d) return; (map[d] ||= { date: d, total_orders: 0, revenue: 0 }); map[d].total_orders++; map[d].revenue += s.total || 0; });
      return Object.values(map).sort((a, b) => a.date.localeCompare(b.date)).slice(-days);
    },
    getMonthlySummary: async (months = 12) => {
      const all = await sales.getAll();
      const map = {};
      all.forEach((s) => { const m = (s.created_at || '').slice(0, 7); if (!m) return; (map[m] ||= { month: m, total_orders: 0, revenue: 0 }); map[m].total_orders++; map[m].revenue += s.total || 0; });
      return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).slice(-months);
    },
    create: async (sale) => {
      const total = sale.total || 0;
      const amountPaid = sale.amount_paid != null ? Number(sale.amount_paid) : total;
      const due = round2(Math.max(0, total - amountPaid));
      const paymentMethod = due > 0 ? (amountPaid > 0 ? 'credit-partial' : 'credit') : (sale.payment_method || 'cash');
      const items = parseItems(sale.items);

      const orderNo = await nextSeq('orderNo');
      const prefix = (await getSetting('invoice_prefix')) || 'INV';
      const invoiceNo = `${prefix}-${new Date().getFullYear()}-${String(orderNo).padStart(4, '0')}`;

      const data = {
        customer_id: sale.customer_id || null,
        items: JSON.stringify(items),
        subtotal: sale.subtotal || 0, discount: sale.discount || 0, tax: sale.tax || 0, total,
        payment_method: paymentMethod, notes: sale.notes || '',
        amount_paid: round2(amountPaid), due_amount: due,
        status: 'completed', orderNo, invoice_no: invoiceNo,
        original_total: total, refunded_total: 0, created_at: nowStr(),
      };
      const id = await add('sales', data);

      // stock
      for (const it of items) {
        if (it.productId) {
          const p = await getOne('products', it.productId);
          if (p) await set('products', it.productId, { stock: (p.stock || 0) - (it.qty || 0) });
        }
      }

      // customer stats + loyalty + payment ledger
      if (sale.customer_id) {
        const c = await getOne('customers', sale.customer_id);
        if (c) {
          const earnPer = Number(await getSetting('loyalty_earn_per')) || 0;
          const earned = earnPer > 0 ? Math.floor(total / earnPer) : 0;
          const redeemed = sale.points_redeemed > 0 ? sale.points_redeemed : 0;
          await set('customers', sale.customer_id, {
            total_spent: round2((c.total_spent || 0) + total),
            visit_count: (c.visit_count || 0) + 1,
            loyalty_points: Math.max(0, (c.loyalty_points || 0) + earned - redeemed),
            updated_at: nowStr(),
          });
        }
        if (amountPaid > 0) {
          await add('payments', { customer_id: sale.customer_id, sale_id: id, amount: round2(amountPaid), method: sale.payment_method || 'cash', notes: 'Sale payment', created_at: nowStr() });
        }
      }

      // coupon usage
      if (sale.coupon_code) {
        const snap = await getDocs(query(col('coupons'), where('code', '==', String(sale.coupon_code).toUpperCase().trim())));
        for (const d of snap.docs) await set('coupons', d.id, { used_count: (d.data().used_count || 0) + 1 });
      }

      await recordCashSale(amountPaid, sale.payment_method || 'cash');
      return { id, invoice_no: invoiceNo, due_amount: due, orderNo };
    },
  };

  const returns = {
    getAll: () => listAll('returns'),
    getBySale: async (saleId) => {
      const snap = await getDocs(query(col('returns'), where('sale_id', '==', String(saleId))));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    getInvoice: async (orderNoOrId) => {
      // Look up by sequential order number, then formatted invoice_no, then doc id.
      let sale = null;
      const asNum = Number(orderNoOrId);
      if (!Number.isNaN(asNum)) {
        const snap = await getDocs(query(col('sales'), where('orderNo', '==', asNum)));
        if (!snap.empty) sale = { id: snap.docs[0].id, ...snap.docs[0].data() };
      }
      if (!sale) {
        const byNo = await getDocs(query(col('sales'), where('invoice_no', '==', String(orderNoOrId).toUpperCase())));
        if (!byNo.empty) sale = { id: byNo.docs[0].id, ...byNo.docs[0].data() };
      }
      if (!sale) sale = await getOne('sales', orderNoOrId);
      if (!sale) return null;
      const cust = sale.customer_id ? await getOne('customers', sale.customer_id) : null;
      const items = parseItems(sale.items).map((it) => {
        const returnedQty = it.returnedQty || 0;
        return { ...it, returnedQty, remaining: Math.max(0, (it.qty || 0) - returnedQty) };
      });
      return { ...sale, customer_name: cust?.name || 'Walk-in Customer', items };
    },
    create: async (reqBody) => {
      const sale = await getOne('sales', reqBody.sale_id);
      if (!sale) throw new Error(`Invoice not found`);
      if (sale.status === 'cancelled') throw new Error('Invoice already cancelled');
      const items = parseItems(sale.items);
      const origSubtotal = items.reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0);
      const returnedLines = [];

      for (const r of (reqBody.items || [])) {
        const it = items[r.index];
        if (!it) continue;
        const already = it.returnedQty || 0;
        const remaining = (it.qty || 0) - already;
        const qty = Math.min(Math.max(0, Math.floor(r.qty)), remaining);
        if (qty <= 0) continue;
        it.returnedQty = already + qty;
        returnedLines.push({ productId: it.productId || null, serviceId: it.serviceId || null, name: it.name, qty, price: it.price || 0 });
        if (it.productId) {
          const p = await getOne('products', it.productId);
          if (p) await set('products', it.productId, { stock: (p.stock || 0) + qty });
        }
      }
      if (returnedLines.length === 0) throw new Error('No valid items selected to return');

      const remainingSubtotal = items.reduce((s, it) => s + (it.price || 0) * ((it.qty || 0) - (it.returnedQty || 0)), 0);
      const allReturned = items.every((it) => ((it.qty || 0) - (it.returnedQty || 0)) <= 0);
      const remainingRatio = origSubtotal > 0 ? remainingSubtotal / origSubtotal : 0;
      const newTotal = round2((sale.total || 0) * remainingRatio);
      const refundAmount = round2((sale.original_total != null ? sale.original_total : sale.total) * (origSubtotal > 0 ? (returnedLines.reduce((s, l) => s + l.price * l.qty, 0)) / origSubtotal : 1));

      await set('sales', sale.id, {
        items: JSON.stringify(items),
        subtotal: round2(remainingSubtotal),
        discount: round2((sale.discount || 0) * remainingRatio),
        tax: round2((sale.tax || 0) * remainingRatio),
        total: newTotal,
        refunded_total: round2((sale.refunded_total || 0) + refundAmount),
        status: allReturned ? 'cancelled' : 'partially_returned',
      });

      if (sale.customer_id) {
        const c = await getOne('customers', sale.customer_id);
        if (c) await set('customers', sale.customer_id, { total_spent: Math.max(0, round2((c.total_spent || 0) - refundAmount)), updated_at: nowStr() });
      }

      await add('returns', { sale_id: sale.id, items: JSON.stringify(returnedLines), refund_amount: refundAmount, reason: reqBody.reason || '', created_at: nowStr() });
      return { success: true, sale_id: sale.id, refund_amount: refundAmount, status: allReturned ? 'cancelled' : 'partially_returned', cancelled: allReturned, new_total: newTotal };
    },
  };

  const quotations = {
    getAll: () => listAll('quotations'),
    getById: (id) => getOne('quotations', id),
    create: async (q) => {
      const data = { customer_id: q.customer_id || null, customer_name: q.customer_name || 'Walk-in Customer',
        items: typeof q.items === 'string' ? q.items : JSON.stringify(q.items || []),
        subtotal: q.subtotal || 0, discount: q.discount || 0, tax: q.tax || 0, total: q.total || 0,
        status: 'pending', valid_until: q.valid_until || null, notes: q.notes || '', converted_sale_id: null, created_at: nowStr() };
      const id = await add('quotations', data);
      return { id };
    },
    update: async (id, q) => { await set('quotations', id, { ...q, items: typeof q.items === 'string' ? q.items : JSON.stringify(q.items || []) }); return { id, ...q }; },
    delete: async (id) => { await del('quotations', id); return { success: true }; },
    convertToInvoice: async (id, opts = {}) => {
      const q = await getOne('quotations', id);
      if (!q) throw new Error('Quotation not found');
      if (q.status === 'converted') throw new Error('Quotation already converted');
      const saleRes = await sales.create({
        customer_id: q.customer_id, items: parseItems(q.items),
        subtotal: q.subtotal, discount: q.discount, tax: q.tax, total: q.total,
        payment_method: opts.payment_method || 'cash', notes: `From Quotation #${id}` + (q.notes ? ` — ${q.notes}` : ''),
      });
      await set('quotations', id, { status: 'converted', converted_sale_id: saleRes.id });
      return { success: true, sale_id: saleRes.id, quotation_id: id };
    },
  };

  const appointments = {
    getAll: () => listAll('appointments'),
    getByDate: async (date) => {
      const snap = await getDocs(query(col('appointments'), where('date', '==', date)));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    create: async (a) => { const data = { ...a, status: a.status || 'scheduled', created_at: nowStr() }; const id = await add('appointments', data); return { id, ...data }; },
    update: async (id, a) => { await set('appointments', id, a); return { id, ...a }; },
    delete: async (id) => { await del('appointments', id); return { success: true }; },
    updateStatus: async (id, status) => { await set('appointments', id, { status }); return { success: true }; },
  };

  const expenses = {
    getAll: async () => (await listAll('expenses')).sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    getSummary: async (start, end) => {
      let all = await listAll('expenses');
      if (start && end) all = all.filter((e) => e.date >= start && e.date <= end);
      const total = round2(all.reduce((s, e) => s + (e.amount || 0), 0));
      const byCat = {};
      all.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + (e.amount || 0); });
      return { total, count: all.length, byCategory: Object.entries(byCat).map(([category, t]) => ({ category, total: round2(t) })) };
    },
    create: async (e) => {
      const data = { category: e.category || 'General', description: e.description || '', amount: e.amount || 0,
        payment_method: e.payment_method || 'cash', date: e.date || todayStr(), created_at: nowStr() };
      const id = await add('expenses', data);
      if (data.payment_method === 'cash') await recordCashExpense(data.amount);
      return { id };
    },
    update: async (id, e) => { await set('expenses', id, e); return { id, ...e }; },
    delete: async (id) => { await del('expenses', id); return { success: true }; },
  };

  const cash = {
    getCurrent: () => currentCashSession(),
    getAll: async () => (await listAll('cash_sessions')).sort((a, b) => (b.opened_at || '').localeCompare(a.opened_at || '')),
    open: async (d) => {
      if (await currentCashSession()) throw new Error('A cash session is already open. Close it first.');
      const data = { opened_at: nowStr(), opening_float: Number(d.opening_float) || 0, opened_by: d.opened_by || '',
        notes: d.notes || '', cash_sales: 0, card_sales: 0, cash_expenses: 0, status: 'open',
        closed_at: null, counted_cash: null, expected_cash: null, difference: null };
      const id = await add('cash_sessions', data);
      return { id, ...data };
    },
    close: async (d) => {
      const s = await currentCashSession();
      if (!s) throw new Error('No open cash session to close.');
      const expected = round2((s.opening_float || 0) + (s.cash_sales || 0) - (s.cash_expenses || 0));
      const counted = Number(d.counted_cash) || 0;
      const difference = round2(counted - expected);
      await set('cash_sessions', s.id, { closed_at: nowStr(), counted_cash: counted, expected_cash: expected, difference, closed_by: d.closed_by || '', notes: d.notes || s.notes || '', status: 'closed' });
      return { ...s, closed_at: nowStr(), counted_cash: counted, expected_cash: expected, difference, status: 'closed' };
    },
  };

  const dues = {
    getCustomersWithDue: async () => {
      const [salesRows, custRows] = await Promise.all([listAll('sales'), listAll('customers')]);
      const cmap = Object.fromEntries(custRows.map((c) => [c.id, c]));
      const agg = {};
      salesRows.filter((s) => (s.due_amount || 0) > 0 && s.status !== 'cancelled').forEach((s) => {
        const c = cmap[s.customer_id]; if (!c) return;
        (agg[c.id] ||= { id: c.id, name: c.name, phone: c.phone, loyalty_points: c.loyalty_points || 0, total_due: 0, open_invoices: 0 });
        agg[c.id].total_due = round2(agg[c.id].total_due + s.due_amount);
        agg[c.id].open_invoices++;
      });
      return Object.values(agg).sort((a, b) => b.total_due - a.total_due);
    },
    getCustomerDues: async (customerId) => {
      const snap = await getDocs(query(col('sales'), where('customer_id', '==', String(customerId))));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .filter((s) => (s.due_amount || 0) > 0 && s.status !== 'cancelled')
        .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
    },
    getPayments: async (customerId) => {
      const snap = await getDocs(query(col('payments'), where('customer_id', '==', String(customerId))));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    },
    settle: async ({ sale_id, amount, method, notes }) => {
      const sale = await getOne('sales', sale_id);
      if (!sale) throw new Error('Invoice not found');
      const pay = Math.min(Number(amount) || 0, sale.due_amount || 0);
      if (pay <= 0) throw new Error('Invalid settlement amount');
      const newDue = round2((sale.due_amount || 0) - pay);
      await set('sales', sale_id, { amount_paid: round2((sale.amount_paid || 0) + pay), due_amount: newDue, payment_method: newDue <= 0 ? 'paid' : 'credit-partial' });
      if (sale.customer_id) await add('payments', { customer_id: sale.customer_id, sale_id, amount: pay, method: method || 'cash', notes: notes || 'Due settlement', created_at: nowStr() });
      if ((method || 'cash') === 'cash') await recordCashSale(pay, 'cash');
      return { success: true, sale_id, paid: pay, remaining_due: newDue };
    },
  };

  const coupons = {
    getAll: () => listAll('coupons'),
    create: async (c) => {
      const data = { code: String(c.code).toUpperCase().trim(), type: c.type || 'percent', value: c.value || 0,
        min_spend: c.min_spend || 0, expires_on: c.expires_on || null, usage_limit: c.usage_limit || 0,
        used_count: 0, active: c.active != null ? c.active : 1, created_at: nowStr() };
      const id = await add('coupons', data);
      return { id };
    },
    update: async (id, c) => { await set('coupons', id, { ...c, code: String(c.code).toUpperCase().trim() }); return { id, ...c }; },
    delete: async (id) => { await del('coupons', id); return { success: true }; },
    validate: async (code, subtotal) => {
      const snap = await getDocs(query(col('coupons'), where('code', '==', String(code).toUpperCase().trim())));
      if (snap.empty) throw new Error('Invalid coupon code');
      const c = { id: snap.docs[0].id, ...snap.docs[0].data() };
      if (!c.active) throw new Error('This coupon is no longer active');
      if (c.expires_on && c.expires_on < todayStr()) throw new Error('This coupon has expired');
      if (c.usage_limit > 0 && c.used_count >= c.usage_limit) throw new Error('This coupon has reached its usage limit');
      if (subtotal < (c.min_spend || 0)) throw new Error(`Minimum spend of ${c.min_spend} required`);
      const discount = c.type === 'fixed' ? Math.min(c.value, subtotal) : round2((subtotal * c.value) / 100);
      return { valid: true, code: c.code, type: c.type, value: c.value, discount };
    },
  };

  const dashboard = {
    getStats: async () => {
      const [salesRows, custRows, apptRows, prodRows] = await Promise.all([
        listAll('sales'), listAll('customers'), listAll('appointments'), listAll('products'),
      ]);
      const t = todayStr(); const m = t.slice(0, 7);
      const today = salesRows.filter((s) => (s.created_at || '').startsWith(t) && s.status !== 'cancelled');
      const month = salesRows.filter((s) => (s.created_at || '').startsWith(m) && s.status !== 'cancelled');
      const sum = (arr) => round2(arr.reduce((s, x) => s + (x.total || 0), 0));
      return {
        todaySales: { count: today.length, total: sum(today) },
        monthSales: { count: month.length, total: sum(month) },
        totalCustomers: { count: custRows.length },
        todayAppointments: { count: apptRows.filter((a) => a.date === t).length },
        lowStockProducts: { count: prodRows.filter((p) => (p.stock || 0) <= 5 && !p.is_service).length },
      };
    },
    getProfitLoss: async (start, end) => {
      const [salesRows, expRows, prodRows] = await Promise.all([listAll('sales'), listAll('expenses'), listAll('products')]);
      const inRange = (dateStr) => {
        const d = (dateStr || '').split(' ')[0];
        if (start && end) return d >= start && d <= end;
        return d.slice(0, 7) === todayStr().slice(0, 7);
      };
      const activeSales = salesRows.filter((s) => s.status !== 'cancelled' && inRange(s.created_at));
      const income = round2(activeSales.reduce((s, x) => s + (x.total || 0), 0));
      const refunds = round2(salesRows.filter((s) => inRange(s.created_at)).reduce((s, x) => s + (x.refunded_total || 0), 0));
      const expSel = expRows.filter((e) => inRange(e.date));
      const expenseTotal = round2(expSel.reduce((s, e) => s + (e.amount || 0), 0));
      const costMap = Object.fromEntries(prodRows.map((p) => [p.id, p.cost || 0]));
      let cogs = 0;
      activeSales.forEach((s) => parseItems(s.items).forEach((it) => {
        if (!it.productId) return;
        const remaining = (it.qty || 0) - (it.returnedQty || 0);
        if (remaining > 0) cogs += (costMap[it.productId] || 0) * remaining;
      }));
      cogs = round2(cogs);
      const byCat = {};
      expSel.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + (e.amount || 0); });
      return {
        income, orders: activeSales.length, refunds, cogs,
        grossProfit: round2(income - cogs), expenses: expenseTotal,
        expensesByCategory: Object.entries(byCat).map(([category, t]) => ({ category, total: round2(t) })),
        netProfit: round2(income - cogs - expenseTotal),
      };
    },
  };

  const settings = {
    getAll: () => getSettings(),
    updateAll: async (s) => { await setDoc(settingsDoc(), s, { merge: true }); return { success: true }; },
  };

  const system = {
    backup: async () => ({ success: false, error: 'Backup is managed by Firebase for cloud stores.' }),
    restore: async () => ({ success: false, error: 'Restore is managed by Firebase for cloud stores.' }),
    reset: async () => ({ success: false, error: 'Reset is disabled for cloud stores.' }),
  };

  return {
    __mode: 'cloud',
    __storeId: storeId,
    products, services, categories, customers, sales, returns, quotations,
    appointments, expenses, cash, dues, coupons, dashboard, settings, system,
    // image picker handled via Firebase Storage in components
    dialog: { openImage: async () => null },
    shell: { openExternal: (url) => window.open(url, '_blank', 'noopener') },
    window: { minimize: () => {}, maximize: () => {}, close: () => {} },
  };
}
