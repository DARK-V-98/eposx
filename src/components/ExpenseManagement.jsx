import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineCash, HiOutlineX } from 'react-icons/hi';
import './FeaturePages.css';

const api = window.api || {
  expenses: { getAll: async () => [], create: async () => ({}), delete: async () => ({}) },
  dashboard: { getProfitLoss: async () => ({}) },
  settings: { getAll: async () => ({ currency: 'LKR' }) },
};

const CATEGORIES = ['Stock Purchase', 'Rent', 'Salaries', 'Utilities', 'Marketing', 'Maintenance', 'Transport', 'General'];

export default function ExpenseManagement({ showToast }) {
  const [expenses, setExpenses] = useState([]);
  const [pl, setPl] = useState(null);
  const [settings, setSettings] = useState({ currency: 'LKR' });
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ category: 'General', description: '', amount: '', payment_method: 'cash', date: new Date().toISOString().split('T')[0] });

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [ex, plData, s] = await Promise.all([
        api.expenses.getAll(), api.dashboard.getProfitLoss(), api.settings.getAll(),
      ]);
      setExpenses(ex || []);
      setPl(plData || null);
      if (s) setSettings((p) => ({ ...p, ...s }));
    } catch (e) { console.error(e); }
  }

  const money = (v) => `${settings.currency} ${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  async function save(e) {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) { showToast?.('Enter a valid amount', 'error'); return; }
    try {
      await api.expenses.create({ ...form, amount: Number(form.amount) });
      showToast?.('Expense recorded', 'success');
      setShowModal(false);
      setForm({ category: 'General', description: '', amount: '', payment_method: 'cash', date: new Date().toISOString().split('T')[0] });
      load();
    } catch (err) { showToast?.(err.message || 'Failed', 'error'); }
  }

  async function remove(id) {
    if (!confirm('Delete this expense?')) return;
    try { await api.expenses.delete(id); showToast?.('Deleted', 'info'); load(); }
    catch (err) { showToast?.(err.message, 'error'); }
  }

  return (
    <div className="feature-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Expenses & Profit / Loss</h1>
          <p className="page-subtitle">Track business costs — see real net profit (this month)</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <HiOutlinePlus size={18} /> Add Expense
        </button>
      </div>

      {/* P&L cards */}
      {pl && (
        <div className="kpi-grid">
          <div className="kpi-card"><div className="kpi-label">Income</div><div className="kpi-value">{money(pl.income)}</div></div>
          <div className="kpi-card"><div className="kpi-label">Cost of Goods</div><div className="kpi-value">{money(pl.cogs)}</div></div>
          <div className="kpi-card"><div className="kpi-label">Gross Profit</div><div className="kpi-value pos">{money(pl.grossProfit)}</div></div>
          <div className="kpi-card"><div className="kpi-label">Expenses</div><div className="kpi-value neg">{money(pl.expenses)}</div></div>
          <div className="kpi-card">
            <div className="kpi-label">Net Profit</div>
            <div className={`kpi-value ${pl.netProfit >= 0 ? 'pos' : 'neg'}`}>{money(pl.netProfit)}</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Date</th><th>Category</th><th>Description</th><th>Method</th><th>Amount</th><th></th></tr>
            </thead>
            <tbody>
              {expenses.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 28, color: '#9ca3af' }}>No expenses recorded yet.</td></tr>
              )}
              {expenses.map((ex) => (
                <tr key={ex.id}>
                  <td>{ex.date}</td>
                  <td><span className="badge badge-neutral">{ex.category}</span></td>
                  <td>{ex.description || '—'}</td>
                  <td>{ex.payment_method}</td>
                  <td className="amount-neg">- {money(ex.amount)}</td>
                  <td><button className="btn btn-icon btn-ghost btn-danger" onClick={() => remove(ex.id)}><HiOutlineTrash /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="modal-overlay">
            <motion.div className="modal" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
              <div className="modal-header">
                <h2 className="modal-title">Add Expense</h2>
                <button className="modal-close" onClick={() => setShowModal(false)}><HiOutlineX /></button>
              </div>
              <form onSubmit={save} className="modal-body">
                <div className="input-group">
                  <label className="input-label">Category</label>
                  <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ width: '100%' }}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Description</label>
                  <input className="input" style={{ width: '100%' }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional note" />
                </div>
                <div className="input-group">
                  <label className="input-label">Amount ({settings.currency})</label>
                  <input type="number" className="input" style={{ width: '100%' }} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" autoFocus />
                </div>
                <div className="input-group">
                  <label className="input-label">Payment Method</label>
                  <select className="input" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} style={{ width: '100%' }}>
                    <option value="cash">Cash (reduces till)</option>
                    <option value="card">Card / Bank</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Date</label>
                  <input type="date" className="input" style={{ width: '100%' }} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary"><HiOutlineCash size={18} /> Record Expense</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
