import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineDocumentText, HiOutlinePlus, HiOutlineTrash, HiOutlineSearch,
  HiOutlineSwitchHorizontal, HiOutlinePrinter, HiOutlineX,
} from 'react-icons/hi';
import './QuotationManagement.css';

const api = window.api || {
  quotations: {
    getAll: async () => [], create: async () => ({ id: 0 }),
    delete: async () => ({}), convertToInvoice: async () => ({}),
  },
  products: { getAll: async () => [] },
  services: { getAll: async () => [] },
  customers: { getAll: async () => [] },
  settings: { getAll: async () => ({ currency: 'LKR' }) },
};

export default function QuotationManagement({ showToast }) {
  const [quotes, setQuotes] = useState([]);
  const [settings, setSettings] = useState({ currency: 'LKR', tax_percentage: '0' });
  const [showModal, setShowModal] = useState(false);
  const [viewQuote, setViewQuote] = useState(null);

  // builder state
  const [catalog, setCatalog] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [discountPct, setDiscountPct] = useState(0);
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [q, s] = await Promise.all([api.quotations.getAll(), api.settings.getAll()]);
      setQuotes(q || []);
      if (s) setSettings((p) => ({ ...p, ...s }));
    } catch (e) { console.error(e); }
  }

  const money = (v) =>
    `${settings.currency} ${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  async function openBuilder() {
    setCart([]); setCustomerId(''); setDiscountPct(0); setValidUntil(''); setNotes(''); setSearch('');
    try {
      const [products, services, custs] = await Promise.all([
        api.products.getAll(), api.services.getAll(), api.customers.getAll(),
      ]);
      const prodItems = (products || []).map((p) => ({ id: p.id, name: p.name, price: p.price, kind: 'product' }));
      const svcItems = (services || []).map((s) => ({ id: s.id, name: s.name, price: s.price, kind: 'service' }));
      setCatalog([...prodItems, ...svcItems]);
      setCustomers(custs || []);
    } catch (e) { console.error(e); }
    setShowModal(true);
  }

  const filteredCatalog = useMemo(() => {
    const q = search.toLowerCase();
    return catalog.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 40);
  }, [catalog, search]);

  function addItem(item) {
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.id === item.id && c.kind === item.kind);
      if (idx >= 0) {
        const u = [...prev]; u[idx] = { ...u[idx], qty: u[idx].qty + 1 }; return u;
      }
      return [...prev, { ...item, qty: 1 }];
    });
  }
  const setQty = (i, q) => setCart((prev) => {
    const u = [...prev]; u[i] = { ...u[i], qty: Math.max(1, parseInt(q, 10) || 1) }; return u;
  });
  const removeItem = (i) => setCart((prev) => prev.filter((_, idx) => idx !== i));

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const discountAmount = Math.min((subtotal * Number(discountPct || 0)) / 100, subtotal);
  const taxable = subtotal - discountAmount;
  const tax = (taxable * Number(settings.tax_percentage || 0)) / 100;
  const total = taxable + tax;

  async function saveQuote() {
    if (cart.length === 0) { showToast?.('Add at least one item', 'error'); return; }
    const cust = customers.find((c) => String(c.id) === String(customerId));
    const payload = {
      customer_id: customerId ? Number(customerId) : null,
      customer_name: cust?.name || 'Walk-in Customer',
      items: cart.map((c) => ({
        productId: c.kind === 'product' ? c.id : null,
        serviceId: c.kind === 'service' ? c.id : null,
        name: c.name, qty: c.qty, price: c.price,
      })),
      subtotal: Math.round(subtotal * 100) / 100,
      discount: Math.round(discountAmount * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100,
      valid_until: validUntil || null,
      notes,
    };
    try {
      await api.quotations.create(payload);
      showToast?.('Quotation created', 'success');
      setShowModal(false);
      loadAll();
    } catch (e) { showToast?.(e.message || 'Failed to save', 'error'); }
  }

  async function convert(q) {
    if (!confirm(`Convert quotation #${q.id} into an invoice? This deducts stock.`)) return;
    try {
      const res = await api.quotations.convertToInvoice(q.id, { payment_method: 'cash' });
      if (res?.success) showToast?.(`Created invoice #${res.sale_id} from quotation #${q.id}`, 'success');
      loadAll();
    } catch (e) { showToast?.(e.message || 'Convert failed', 'error'); }
  }

  async function remove(q) {
    if (!confirm(`Delete quotation #${q.id}?`)) return;
    try { await api.quotations.delete(q.id); showToast?.('Quotation deleted', 'info'); loadAll(); }
    catch (e) { showToast?.(e.message, 'error'); }
  }

  function printQuote(q) {
    let items = [];
    try { items = JSON.parse(q.items); } catch (_) {}
    const rows = items.map((it) =>
      `<tr><td>${it.name}</td><td style="text-align:center">${it.qty}</td><td style="text-align:right">${money(it.price)}</td><td style="text-align:right">${money(it.price * it.qty)}</td></tr>`
    ).join('');
    const w = window.open('', '_blank', 'width=720,height=900');
    if (!w) return;
    w.document.write(`
      <html><head><title>Quotation #${q.id}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:32px;color:#111}
        h1{margin:0 0 4px} .muted{color:#666;font-size:13px}
        table{width:100%;border-collapse:collapse;margin-top:20px}
        th,td{padding:8px;border-bottom:1px solid #ddd;font-size:14px}
        th{text-align:left;background:#f7f7f7}
        .totals{margin-top:16px;float:right;width:260px}
        .totals div{display:flex;justify-content:space-between;padding:4px 0}
        .grand{font-weight:bold;font-size:16px;border-top:2px solid #111;margin-top:6px;padding-top:8px}
      </style></head><body>
      <h1>${settings.company_name || 'E POS X'}</h1>
      <div class="muted">${settings.company_address || ''} ${settings.company_phone ? '· ' + settings.company_phone : ''}</div>
      <h2 style="margin-top:24px">QUOTATION #${q.id}</h2>
      <div class="muted">Date: ${(q.created_at || '').split(' ')[0]}${q.valid_until ? ` · Valid until: ${q.valid_until}` : ''}</div>
      <div class="muted">Customer: ${q.customer_name || 'Walk-in Customer'}</div>
      <table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="totals">
        <div><span>Subtotal</span><span>${money(q.subtotal)}</span></div>
        <div><span>Discount</span><span>- ${money(q.discount)}</span></div>
        <div><span>Tax</span><span>${money(q.tax)}</span></div>
        <div class="grand"><span>Total</span><span>${money(q.total)}</span></div>
      </div>
      <div style="clear:both"></div>
      ${q.notes ? `<p class="muted" style="margin-top:30px">Note: ${q.notes}</p>` : ''}
      <p class="muted" style="margin-top:40px">This is a quotation, not a tax invoice.</p>
      </body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }

  const statusBadge = (s) => {
    const map = { pending: 'info', converted: 'success', expired: 'neutral' };
    return <span className={`badge badge-${map[s] || 'neutral'}`}>{s}</span>;
  };

  return (
    <div className="quote-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quotations</h1>
          <p className="page-subtitle">Create quotes for customers and convert accepted ones into invoices</p>
        </div>
        <button className="btn btn-primary" onClick={openBuilder}>
          <HiOutlinePlus size={18} /> New Quotation
        </button>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Quote #</th><th>Customer</th><th>Date</th><th>Valid Until</th>
                <th>Total</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>
                  No quotations yet. Click “New Quotation” to create one.
                </td></tr>
              )}
              {quotes.map((q) => (
                <tr key={q.id}>
                  <td style={{ fontWeight: 600 }}>#{q.id}</td>
                  <td>{q.customer_name}</td>
                  <td>{(q.created_at || '').split(' ')[0]}</td>
                  <td>{q.valid_until || '—'}</td>
                  <td>{money(q.total)}</td>
                  <td>{statusBadge(q.status)}{q.converted_sale_id ? <span className="muted-inline"> → inv #{q.converted_sale_id}</span> : null}</td>
                  <td>
                    <div className="flex gap-8">
                      <button className="btn btn-icon btn-ghost" title="Print" onClick={() => printQuote(q)}><HiOutlinePrinter /></button>
                      {q.status !== 'converted' && (
                        <button className="btn btn-icon btn-ghost" title="Convert to Invoice" onClick={() => convert(q)}><HiOutlineSwitchHorizontal /></button>
                      )}
                      <button className="btn btn-icon btn-ghost btn-danger" title="Delete" onClick={() => remove(q)}><HiOutlineTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Builder modal */}
      <AnimatePresence>
        {showModal && (
          <div className="modal-overlay">
            <motion.div
              className="modal quote-modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
            >
              <div className="modal-header">
                <h2 className="modal-title">New Quotation</h2>
                <button className="modal-close" onClick={() => setShowModal(false)}><HiOutlineX /></button>
              </div>

              <div className="quote-builder">
                {/* left: catalog */}
                <div className="qb-catalog">
                  <div className="qb-search">
                    <HiOutlineSearch />
                    <input placeholder="Search products & services" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  <div className="qb-catalog-list">
                    {filteredCatalog.map((c) => (
                      <button key={`${c.kind}-${c.id}`} className="qb-cat-item" onClick={() => addItem(c)}>
                        <span>{c.name} {c.kind === 'service' && <em className="qb-svc">service</em>}</span>
                        <span>{money(c.price)}</span>
                      </button>
                    ))}
                    {filteredCatalog.length === 0 && <p className="muted-inline" style={{ padding: 12 }}>No matches</p>}
                  </div>
                </div>

                {/* right: cart + meta */}
                <div className="qb-cart">
                  <div className="qb-meta">
                    <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                      <option value="">Walk-in Customer</option>
                      {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <input type="date" className="input" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} title="Valid until" />
                  </div>

                  <div className="qb-cart-list">
                    {cart.length === 0 && <p className="muted-inline" style={{ padding: 12 }}>Add items from the left.</p>}
                    {cart.map((c, i) => (
                      <div key={i} className="qb-cart-row">
                        <span className="qb-cart-name">{c.name}</span>
                        <input type="number" min={1} className="input qb-qty" value={c.qty} onChange={(e) => setQty(i, e.target.value)} />
                        <span className="qb-line">{money(c.price * c.qty)}</span>
                        <button className="btn btn-icon btn-ghost btn-danger" onClick={() => removeItem(i)}><HiOutlineTrash /></button>
                      </div>
                    ))}
                  </div>

                  <div className="qb-totals">
                    <div className="qb-trow"><span>Subtotal</span><span>{money(subtotal)}</span></div>
                    <div className="qb-trow">
                      <span>Discount %</span>
                      <input type="number" min={0} max={100} className="input qb-disc" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} />
                    </div>
                    <div className="qb-trow"><span>Tax ({settings.tax_percentage || 0}%)</span><span>{money(tax)}</span></div>
                    <div className="qb-trow qb-grand"><span>Total</span><span>{money(total)}</span></div>
                  </div>

                  <input className="input" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ marginTop: 10 }} />

                  <div className="modal-footer" style={{ marginTop: 14 }}>
                    <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                    <button className="btn btn-primary" onClick={saveQuote}><HiOutlineDocumentText size={18} /> Save Quotation</button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
