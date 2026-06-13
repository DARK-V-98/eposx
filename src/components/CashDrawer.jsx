import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineCash, HiOutlineLockOpen, HiOutlineLockClosed, HiOutlinePrinter } from 'react-icons/hi';
import useLiveRefresh from '../hooks/useLiveRefresh';
import './FeaturePages.css';

const api = window.api || {
  cash: { getCurrent: async () => null, getAll: async () => [], open: async () => ({}), close: async () => ({}) },
  settings: { getAll: async () => ({ currency: 'LKR' }) },
};

export default function CashDrawer({ showToast }) {
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [settings, setSettings] = useState({ currency: 'LKR' });
  const [openFloat, setOpenFloat] = useState('');
  const [counted, setCounted] = useState('');
  const [closeNote, setCloseNote] = useState('');

  useEffect(() => { load(); }, []);
  useLiveRefresh(load);

  async function load() {
    try {
      const [cur, hist, s] = await Promise.all([api.cash.getCurrent(), api.cash.getAll(), api.settings.getAll()]);
      setCurrent(cur || null);
      setHistory(hist || []);
      if (s) setSettings((p) => ({ ...p, ...s }));
    } catch (e) { console.error(e); }
  }

  const money = (v) => `${settings.currency} ${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  const expected = current ? (current.opening_float || 0) + (current.cash_sales || 0) - (current.cash_expenses || 0) : 0;

  async function openSession() {
    try {
      await api.cash.open({ opening_float: Number(openFloat) || 0 });
      showToast?.('Cash drawer opened', 'success');
      setOpenFloat('');
      load();
    } catch (e) { showToast?.(e.message, 'error'); }
  }

  async function closeSession() {
    if (counted === '') { showToast?.('Enter the counted cash amount', 'error'); return; }
    try {
      const z = await api.cash.close({ counted_cash: Number(counted), notes: closeNote });
      const diff = z.difference;
      showToast?.(
        diff === 0 ? 'Drawer balanced perfectly 🎉' : `Closed. ${diff > 0 ? 'Over' : 'Short'} by ${money(Math.abs(diff))}`,
        diff === 0 ? 'success' : 'warning'
      );
      setCounted(''); setCloseNote('');
      load();
    } catch (e) { showToast?.(e.message, 'error'); }
  }

  function printZ(s) {
    const w = window.open('', '_blank', 'width=420,height=640');
    if (!w) return;
    w.document.write(`
      <html><head><title>Z-Report #${s.id}</title>
      <style>body{font-family:monospace;padding:24px}h2{text-align:center}.r{display:flex;justify-content:space-between;padding:3px 0}.t{border-top:1px dashed #000;margin-top:8px;padding-top:8px;font-weight:bold}</style>
      </head><body>
      <h2>Z-REPORT #${s.id}</h2>
      <div class="r"><span>Opened</span><span>${s.opened_at || ''}</span></div>
      <div class="r"><span>Closed</span><span>${s.closed_at || ''}</span></div>
      <hr/>
      <div class="r"><span>Opening Float</span><span>${money(s.opening_float)}</span></div>
      <div class="r"><span>Cash Sales</span><span>${money(s.cash_sales)}</span></div>
      <div class="r"><span>Card Sales</span><span>${money(s.card_sales)}</span></div>
      <div class="r"><span>Cash Expenses</span><span>- ${money(s.cash_expenses)}</span></div>
      <div class="r t"><span>Expected Cash</span><span>${money(s.expected_cash)}</span></div>
      <div class="r"><span>Counted Cash</span><span>${money(s.counted_cash)}</span></div>
      <div class="r t"><span>Difference</span><span>${money(s.difference)}</span></div>
      </body></html>`);
    w.document.close(); w.focus(); w.print();
  }

  return (
    <div className="feature-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cash Drawer & Day-End</h1>
          <p className="page-subtitle">Open the till with a float, then close it with a counted Z-report</p>
        </div>
      </div>

      {/* Current session */}
      <div className="card cash-status-card">
        <div>
          <div className="kpi-label">Drawer Status</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>
            <span className={`cash-open-dot ${current ? 'open' : 'closed'}`} />
            {current ? 'OPEN' : 'CLOSED'}
          </div>
        </div>
        {current ? (
          <>
            <div><div className="kpi-label">Opening Float</div><div className="kpi-value">{money(current.opening_float)}</div></div>
            <div><div className="kpi-label">Cash Sales</div><div className="kpi-value">{money(current.cash_sales)}</div></div>
            <div><div className="kpi-label">Cash Expenses</div><div className="kpi-value neg">{money(current.cash_expenses)}</div></div>
            <div><div className="kpi-label">Expected in Drawer</div><div className="kpi-value pos">{money(expected)}</div></div>
          </>
        ) : (
          <div className="feature-muted">No open session. Open the drawer to start a shift.</div>
        )}
      </div>

      {/* Open or close panel */}
      {!current ? (
        <div className="card" style={{ padding: 20, maxWidth: 420 }}>
          <h3 style={{ marginBottom: 12 }}><HiOutlineLockOpen /> Open Drawer</h3>
          <label className="input-label">Opening Float ({settings.currency})</label>
          <input type="number" className="input" style={{ width: '100%', marginBottom: 14 }} value={openFloat} onChange={(e) => setOpenFloat(e.target.value)} placeholder="e.g. 5000" />
          <button className="btn btn-primary btn-block" onClick={openSession}><HiOutlineCash /> Open Cash Drawer</button>
        </div>
      ) : (
        <div className="card" style={{ padding: 20, maxWidth: 420 }}>
          <h3 style={{ marginBottom: 12 }}><HiOutlineLockClosed /> Close Drawer (Day-End)</h3>
          <label className="input-label">Counted Cash ({settings.currency})</label>
          <input type="number" className="input" style={{ width: '100%', marginBottom: 12 }} value={counted} onChange={(e) => setCounted(e.target.value)} placeholder="Count the physical cash" />
          {counted !== '' && (
            <div className={`feature-muted`} style={{ marginBottom: 12 }}>
              Expected {money(expected)} · Difference{' '}
              <strong className={Number(counted) - expected >= 0 ? 'amount-pos' : 'amount-neg'}>
                {money(Number(counted) - expected)}
              </strong>
            </div>
          )}
          <input className="input" style={{ width: '100%', marginBottom: 12 }} value={closeNote} onChange={(e) => setCloseNote(e.target.value)} placeholder="Notes (optional)" />
          <button className="btn btn-primary btn-block" onClick={closeSession}><HiOutlineLockClosed /> Close & Generate Z-Report</button>
        </div>
      )}

      {/* History */}
      <div className="card" style={{ marginTop: 18 }}>
        <h3 style={{ marginBottom: 12 }}>Shift History</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr><th>#</th><th>Opened</th><th>Closed</th><th>Float</th><th>Cash Sales</th><th>Expected</th><th>Counted</th><th>Diff</th><th></th></tr>
            </thead>
            <tbody>
              {history.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}>No shifts yet.</td></tr>}
              {history.map((s) => (
                <tr key={s.id}>
                  <td>#{s.id}</td>
                  <td>{s.opened_at}</td>
                  <td>{s.closed_at || <span className="badge badge-success">open</span>}</td>
                  <td>{money(s.opening_float)}</td>
                  <td>{money(s.cash_sales)}</td>
                  <td>{s.expected_cash != null ? money(s.expected_cash) : '—'}</td>
                  <td>{s.counted_cash != null ? money(s.counted_cash) : '—'}</td>
                  <td>{s.difference != null ? <span className={s.difference >= 0 ? 'amount-pos' : 'amount-neg'}>{money(s.difference)}</span> : '—'}</td>
                  <td>{s.status === 'closed' && <button className="btn btn-icon btn-ghost" onClick={() => printZ(s)} title="Print Z-Report"><HiOutlinePrinter /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
