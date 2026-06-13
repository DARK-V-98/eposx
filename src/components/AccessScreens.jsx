import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  HiOutlineDesktopComputer, HiOutlineCloud, HiOutlineCheckCircle,
  HiOutlineClock, HiOutlineLockClosed, HiOutlineLogout, HiOutlineExclamation,
} from 'react-icons/hi';
import './AccessScreens.css';

const PACKAGES = [
  {
    id: 'offline',
    name: 'Offline Package',
    icon: HiOutlineDesktopComputer,
    tagline: 'Runs fully on this PC',
    points: ['Local SQLite database', 'No internet required', 'Fast desktop performance', 'Single-location billing'],
  },
  {
    id: 'cloud',
    name: 'Cloud Package',
    icon: HiOutlineCloud,
    tagline: 'Sync across devices',
    points: ['Firestore cloud database', 'Access from PC, web & mobile', 'Automatic backups', 'Multi-device & multi-store'],
  },
];

export function PackageSelection({ user, onSubmit, onLogout }) {
  const [pkg, setPkg] = useState('cloud');
  const [storeName, setStoreName] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!storeName.trim()) return;
    setBusy(true);
    try { await onSubmit({ storeName: storeName.trim(), pkg }); }
    finally { setBusy(false); }
  }

  return (
    <div className="access-screen">
      <div className="access-card access-wide">
        <div className="access-head">
          <h1>Choose your package</h1>
          <p>Welcome {user?.name || user?.email}. Select a package and request access — our team will activate your account.</p>
        </div>

        <div className="pkg-grid">
          {PACKAGES.map((p) => {
            const Icon = p.icon;
            return (
              <button key={p.id} className={`pkg-card ${pkg === p.id ? 'selected' : ''}`} onClick={() => setPkg(p.id)}>
                <div className="pkg-icon"><Icon size={34} /></div>
                <h3>{p.name}</h3>
                <span className="pkg-tagline">{p.tagline}</span>
                <ul>{p.points.map((pt) => <li key={pt}><HiOutlineCheckCircle /> {pt}</li>)}</ul>
                {pkg === p.id && <span className="pkg-selected-badge">Selected</span>}
              </button>
            );
          })}
        </div>

        <div className="access-form">
          <input
            className="access-input"
            placeholder="Store / business name"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
          />
          <button className="access-btn primary" disabled={busy || !storeName.trim()} onClick={submit}>
            {busy ? 'Sending request…' : 'Request Access'}
          </button>
        </div>

        <button className="access-logout" onClick={onLogout}><HiOutlineLogout /> Sign out</button>
      </div>
    </div>
  );
}

const STATUS_UI = {
  pending: {
    icon: HiOutlineClock, color: '#2563eb', title: 'Request pending approval',
    body: 'Your access request has been sent to the eposx team. You’ll be able to enter once it’s approved.',
  },
  rejected: {
    icon: HiOutlineExclamation, color: '#dc2626', title: 'Request not approved',
    body: 'Your access request was declined. Please contact eposx support for more information.',
  },
  expired: {
    icon: HiOutlineLockClosed, color: '#b45309', title: 'Trial expired',
    body: 'Your trial period has ended. Purchase E POS X to continue using your store and data.',
  },
  locked: {
    icon: HiOutlineLockClosed, color: '#dc2626', title: 'Account locked',
    body: 'This store has been locked. Please contact eposx support or purchase to continue.',
  },
};

export function StatusScreen({ status, store, onLogout, onRefresh }) {
  const ui = STATUS_UI[status] || STATUS_UI.pending;
  const Icon = ui.icon;
  const showPurchase = status === 'expired' || status === 'locked';
  return (
    <div className="access-screen">
      <motion.div className="access-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="status-icon" style={{ color: ui.color }}><Icon size={56} /></div>
        <h1>{ui.title}</h1>
        <p>{ui.body}</p>
        {store && (
          <div className="status-meta">
            <span>{store.storeName}</span>
            <span className="status-pill">{store.package === 'cloud' ? 'Cloud' : 'Offline'} package</span>
          </div>
        )}
        <div className="access-actions">
          {showPurchase && (
            <a className="access-btn primary" href="https://www.esystemlk.com" target="_blank" rel="noreferrer">
              Purchase E POS X
            </a>
          )}
          <button className="access-btn ghost" onClick={onRefresh}>Refresh status</button>
        </div>
        <button className="access-logout" onClick={onLogout}><HiOutlineLogout /> Sign out</button>
      </motion.div>
    </div>
  );
}
