import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineShieldCheck, HiOutlineClock, HiOutlineCheckCircle,
  HiOutlineLockClosed, HiOutlineRefresh, HiOutlineX, HiOutlineBan,
} from 'react-icons/hi';
import {
  listAllStores, grantLifetime, grantTrial, setPaidTerm,
  lockStore, rejectStore, effectiveStatus, daysLeft,
} from '../services/licenseService';
import './FeaturePages.css';
import './AdminPanel.css';

const STATUS_BADGE = {
  pending: 'info', trial: 'warning', active: 'success',
  expired: 'danger', locked: 'danger', rejected: 'neutral',
};

export default function AdminPanel({ showToast, adminEmail }) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grantFor, setGrantFor] = useState(null); // store being approved
  const [trialDays, setTrialDays] = useState(14);
  const [filter, setFilter] = useState('all');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setStores(await listAllStores()); }
    catch (e) { showToast?.(e.message || 'Failed to load (check Firestore rules)', 'error'); }
    setLoading(false);
  }

  async function doAction(fn, okMsg) {
    try { await fn(); showToast?.(okMsg, 'success'); setGrantFor(null); load(); }
    catch (e) { showToast?.(e.message || 'Action failed', 'error'); }
  }

  const counts = stores.reduce((acc, s) => {
    const st = effectiveStatus(s); acc[st] = (acc[st] || 0) + 1; return acc;
  }, {});

  const filtered = filter === 'all' ? stores : stores.filter((s) => effectiveStatus(s) === filter);

  return (
    <div className="feature-page">
      <div className="page-header">
        <div>
          <h1 className="page-title"><HiOutlineShieldCheck style={{ verticalAlign: -4 }} /> Admin — Access Control</h1>
          <p className="page-subtitle">Approve access requests and manage store licenses ({adminEmail})</p>
        </div>
        <button className="btn btn-secondary" onClick={load}><HiOutlineRefresh /> Refresh</button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card"><div className="kpi-label">Pending</div><div className="kpi-value">{counts.pending || 0}</div></div>
        <div className="kpi-card"><div className="kpi-label">On Trial</div><div className="kpi-value">{counts.trial || 0}</div></div>
        <div className="kpi-card"><div className="kpi-label">Active</div><div className="kpi-value pos">{counts.active || 0}</div></div>
        <div className="kpi-card"><div className="kpi-label">Expired / Locked</div><div className="kpi-value neg">{(counts.expired || 0) + (counts.locked || 0)}</div></div>
      </div>

      <div className="feature-filters" style={{ marginBottom: 12 }}>
        {['all', 'pending', 'trial', 'active', 'expired', 'locked'].map((f) => (
          <button key={f} className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(f)}>
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Store</th><th>Owner</th><th>Package</th><th>Status</th><th>Expiry</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 28 }}>Loading…</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 28, color: '#9ca3af' }}>No stores.</td></tr>}
              {filtered.map((s) => {
                const st = effectiveStatus(s);
                const dl = daysLeft(s);
                return (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.storeName}</td>
                    <td>{s.ownerEmail}</td>
                    <td><span className="badge badge-neutral">{s.package === 'cloud' ? 'Cloud' : 'Offline'}</span></td>
                    <td><span className={`badge badge-${STATUS_BADGE[st] || 'neutral'}`}>{st}</span></td>
                    <td>{s.expiresAtMs ? `${new Date(s.expiresAtMs).toLocaleDateString()}${dl != null ? ` (${dl}d)` : ''}` : (st === 'active' ? 'Lifetime' : '—')}</td>
                    <td>
                      <div className="flex gap-8">
                        {(st === 'pending' || st === 'expired' || st === 'trial' || st === 'locked') && (
                          <button className="btn btn-sm btn-primary" onClick={() => { setGrantFor(s); setTrialDays(14); }}>Grant</button>
                        )}
                        {st !== 'locked' && st !== 'rejected' && (
                          <button className="btn btn-sm btn-ghost btn-danger" title="Lock" onClick={() => doAction(() => lockStore(s.id), 'Store locked')}><HiOutlineLockClosed /></button>
                        )}
                        {st === 'pending' && (
                          <button className="btn btn-sm btn-ghost" title="Reject" onClick={() => doAction(() => rejectStore(s.id), 'Request rejected')}><HiOutlineBan /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {grantFor && (
          <div className="modal-overlay">
            <motion.div className="modal" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
              <div className="modal-header">
                <h2 className="modal-title">Grant access — {grantFor.storeName}</h2>
                <button className="modal-close" onClick={() => setGrantFor(null)}><HiOutlineX /></button>
              </div>
              <div className="modal-body">
                <p className="feature-muted" style={{ marginBottom: 16 }}>
                  {grantFor.ownerEmail} · {grantFor.package === 'cloud' ? 'Cloud' : 'Offline'} package
                </p>

                <div className="grant-option">
                  <div>
                    <strong><HiOutlineCheckCircle style={{ verticalAlign: -2, color: '#16a34a' }} /> Lifetime access</strong>
                    <p className="feature-muted">Never expires. Full purchase.</p>
                  </div>
                  <button className="btn btn-primary" onClick={() => doAction(() => grantLifetime(grantFor.id, adminEmail), 'Lifetime access granted')}>Grant Lifetime</button>
                </div>

                <div className="grant-option">
                  <div>
                    <strong><HiOutlineClock style={{ verticalAlign: -2, color: '#b45309' }} /> Trial access</strong>
                    <p className="feature-muted">Auto-locks after the trial ends.</p>
                  </div>
                  <div className="flex gap-8" style={{ alignItems: 'center' }}>
                    <input type="number" min={1} className="input" style={{ width: 80 }} value={trialDays} onChange={(e) => setTrialDays(e.target.value)} />
                    <span className="feature-muted">days</span>
                    <button className="btn btn-secondary" onClick={() => doAction(() => grantTrial(grantFor.id, trialDays, adminEmail), `Trial of ${trialDays} days granted`)}>Start Trial</button>
                  </div>
                </div>

                <div className="grant-option">
                  <div>
                    <strong>Paid fixed term</strong>
                    <p className="feature-muted">Active for N days (e.g. annual = 365).</p>
                  </div>
                  <div className="flex gap-8" style={{ alignItems: 'center' }}>
                    <input type="number" min={1} className="input" style={{ width: 80 }} value={trialDays} onChange={(e) => setTrialDays(e.target.value)} />
                    <span className="feature-muted">days</span>
                    <button className="btn btn-ghost" onClick={() => doAction(() => setPaidTerm(grantFor.id, trialDays, adminEmail), `Activated for ${trialDays} days`)}>Activate</button>
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
