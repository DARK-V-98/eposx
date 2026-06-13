import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineTicket, HiOutlineX } from 'react-icons/hi';
import './FeaturePages.css';

const api = window.api || {
  coupons: { getAll: async () => [], create: async () => ({}), delete: async () => ({}) },
  settings: { getAll: async () => ({ currency: 'LKR' }) },
};

const blank = { code: '', type: 'percent', value: '', min_spend: '', expires_on: '', usage_limit: '', active: 1 };

export default function CouponsManagement({ showToast }) {
  const [coupons, setCoupons] = useState([]);
  const [settings, setSettings] = useState({ currency: 'LKR' });
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(blank);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [c, s] = await Promise.all([api.coupons.getAll(), api.settings.getAll()]);
      setCoupons(c || []);
      if (s) setSettings((p) => ({ ...p, ...s }));
    } catch (e) { console.error(e); }
  }

  const money = (v) => `${settings.currency} ${Number(v || 0).toLocaleString()}`;

  async function save(e) {
    e.preventDefault();
    if (!form.code || !form.value) { showToast?.('Code and value are required', 'error'); return; }
    try {
      await api.coupons.create({
        ...form,
        value: Number(form.value),
        min_spend: Number(form.min_spend) || 0,
        usage_limit: Number(form.usage_limit) || 0,
        active: 1,
      });
      showToast?.('Coupon created', 'success');
      setForm(blank); setShowModal(false); load();
    } catch (err) { showToast?.(err.message || 'Failed (code may already exist)', 'error'); }
  }

  async function remove(id) {
    if (!confirm('Delete this coupon?')) return;
    try { await api.coupons.delete(id); showToast?.('Deleted', 'info'); load(); }
    catch (e) { showToast?.(e.message, 'error'); }
  }

  return (
    <div className="feature-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Coupons & Discounts</h1>
          <p className="page-subtitle">Create discount codes to apply at checkout</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><HiOutlinePlus size={18} /> New Coupon</button>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th>Code</th><th>Discount</th><th>Min Spend</th><th>Expires</th><th>Used</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {coupons.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 28, color: '#9ca3af' }}>No coupons yet.</td></tr>}
              {coupons.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 700, letterSpacing: 1 }}><HiOutlineTicket style={{ verticalAlign: -2, marginRight: 6 }} />{c.code}</td>
                  <td>{c.type === 'percent' ? `${c.value}%` : money(c.value)}</td>
                  <td>{c.min_spend ? money(c.min_spend) : '—'}</td>
                  <td>{c.expires_on || '—'}</td>
                  <td>{c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ''}</td>
                  <td><span className={`badge badge-${c.active ? 'success' : 'neutral'}`}>{c.active ? 'active' : 'inactive'}</span></td>
                  <td><button className="btn btn-icon btn-ghost btn-danger" onClick={() => remove(c.id)}><HiOutlineTrash /></button></td>
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
                <h2 className="modal-title">New Coupon</h2>
                <button className="modal-close" onClick={() => setShowModal(false)}><HiOutlineX /></button>
              </div>
              <form onSubmit={save} className="modal-body">
                <div className="input-group">
                  <label className="input-label">Code</label>
                  <input className="input" style={{ width: '100%', textTransform: 'uppercase' }} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. SAVE10" autoFocus />
                </div>
                <div className="input-group">
                  <label className="input-label">Discount Type</label>
                  <select className="input" style={{ width: '100%' }} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed amount ({settings.currency})</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Value</label>
                  <input type="number" className="input" style={{ width: '100%' }} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder={form.type === 'percent' ? '10' : '500'} />
                </div>
                <div className="input-group">
                  <label className="input-label">Minimum Spend (optional)</label>
                  <input type="number" className="input" style={{ width: '100%' }} value={form.min_spend} onChange={(e) => setForm({ ...form, min_spend: e.target.value })} placeholder="0" />
                </div>
                <div className="input-group">
                  <label className="input-label">Expires On (optional)</label>
                  <input type="date" className="input" style={{ width: '100%' }} value={form.expires_on} onChange={(e) => setForm({ ...form, expires_on: e.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">Usage Limit (0 = unlimited)</label>
                  <input type="number" className="input" style={{ width: '100%' }} value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} placeholder="0" />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary"><HiOutlineTicket size={18} /> Create Coupon</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
