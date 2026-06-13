import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineCreditCard, HiOutlineCash, HiOutlineX, HiOutlineUser } from 'react-icons/hi';
import './FeaturePages.css';

const api = window.api || {
  dues: { getCustomersWithDue: async () => [], getCustomerDues: async () => [], settle: async () => ({}) },
  settings: { getAll: async () => ({ currency: 'LKR' }) },
};

export default function DuesManagement({ showToast }) {
  const [customers, setCustomers] = useState([]);
  const [settings, setSettings] = useState({ currency: 'LKR' });
  const [active, setActive] = useState(null);     // selected customer
  const [invoices, setInvoices] = useState([]);
  const [payAmounts, setPayAmounts] = useState({});

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [list, s] = await Promise.all([api.dues.getCustomersWithDue(), api.settings.getAll()]);
      setCustomers(list || []);
      if (s) setSettings((p) => ({ ...p, ...s }));
    } catch (e) { console.error(e); }
  }

  const money = (v) => `${settings.currency} ${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  async function openCustomer(c) {
    setActive(c);
    try { setInvoices(await api.dues.getCustomerDues(c.id) || []); }
    catch (e) { showToast?.(e.message, 'error'); }
  }

  async function settle(inv, method) {
    const amount = payAmounts[inv.id] != null ? Number(payAmounts[inv.id]) : inv.due_amount;
    if (!amount || amount <= 0) { showToast?.('Enter an amount', 'error'); return; }
    try {
      const res = await api.dues.settle({ sale_id: inv.id, amount, method });
      showToast?.(`Settled ${money(res.paid)} · remaining ${money(res.remaining_due)}`, 'success');
      const list = await api.dues.getCustomersWithDue();
      setCustomers(list || []);
      const refreshed = list.find((x) => x.id === active.id);
      if (refreshed) { setActive(refreshed); setInvoices(await api.dues.getCustomerDues(active.id) || []); }
      else { setActive(null); setInvoices([]); }
      setPayAmounts((m) => ({ ...m, [inv.id]: undefined }));
    } catch (e) { showToast?.(e.message, 'error'); }
  }

  const totalOutstanding = customers.reduce((s, c) => s + (c.total_due || 0), 0);

  return (
    <div className="feature-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer Credit & Dues</h1>
          <p className="page-subtitle">Outstanding balances (receivables) — settle full or partial payments</p>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card"><div className="kpi-label">Total Outstanding</div><div className="kpi-value neg">{money(totalOutstanding)}</div></div>
        <div className="kpi-card"><div className="kpi-label">Customers with Dues</div><div className="kpi-value">{customers.length}</div></div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th>Customer</th><th>Phone</th><th>Open Invoices</th><th>Total Due</th><th></th></tr></thead>
            <tbody>
              {customers.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 28, color: '#9ca3af' }}>No outstanding dues 🎉</td></tr>}
              {customers.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 500 }}><HiOutlineUser style={{ verticalAlign: -2, marginRight: 6 }} />{c.name}</td>
                  <td>{c.phone || '—'}</td>
                  <td>{c.open_invoices}</td>
                  <td className="amount-neg">{money(c.total_due)}</td>
                  <td><button className="btn btn-secondary" onClick={() => openCustomer(c)}>Settle</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {active && (
          <div className="modal-overlay">
            <motion.div className="modal" style={{ maxWidth: 640 }} initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
              <div className="modal-header">
                <h2 className="modal-title">{active.name} — {money(active.total_due)} due</h2>
                <button className="modal-close" onClick={() => { setActive(null); setInvoices([]); }}><HiOutlineX /></button>
              </div>
              <div className="modal-body">
                <table>
                  <thead><tr><th>Invoice</th><th>Total</th><th>Paid</th><th>Due</th><th>Pay Now</th><th></th></tr></thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td>{inv.invoice_no || `#${inv.id}`}</td>
                        <td>{money(inv.total)}</td>
                        <td>{money(inv.amount_paid)}</td>
                        <td className="amount-neg">{money(inv.due_amount)}</td>
                        <td>
                          <input type="number" className="input settle-input" placeholder={inv.due_amount}
                            value={payAmounts[inv.id] ?? ''} onChange={(e) => setPayAmounts((m) => ({ ...m, [inv.id]: e.target.value }))} />
                        </td>
                        <td>
                          <div className="flex gap-8">
                            <button className="btn btn-icon btn-ghost" title="Settle cash" onClick={() => settle(inv, 'cash')}><HiOutlineCash /></button>
                            <button className="btn btn-icon btn-ghost" title="Settle card" onClick={() => settle(inv, 'card')}><HiOutlineCreditCard /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="feature-muted" style={{ marginTop: 10 }}>Leave “Pay Now” blank to settle the full due. Cash settlements add to the open till.</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
