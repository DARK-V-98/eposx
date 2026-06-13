import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineSearch,
  HiOutlineReceiptRefund,
  HiOutlineExclamationCircle,
  HiOutlineCheckCircle,
} from 'react-icons/hi';
import './ReturnsManagement.css';

const api = window.api || {
  returns: {
    getInvoice: async () => null,
    create: async () => ({ success: false }),
    getBySale: async () => [],
  },
  settings: { getAll: async () => ({ currency: 'LKR' }) },
};

export default function ReturnsManagement({ showToast }) {
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [qtyMap, setQtyMap] = useState({});      // index -> qty to return
  const [settings, setSettings] = useState({ currency: 'LKR' });
  const [pastReturns, setPastReturns] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const s = await api.settings.getAll();
        if (s) setSettings((p) => ({ ...p, ...s }));
      } catch (_) {}
    })();
  }, []);

  const money = (v) =>
    `${settings.currency} ${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  async function loadInvoice(e) {
    e?.preventDefault();
    const id = parseInt(invoiceNo, 10);
    if (!id) { showToast?.('Enter a valid invoice number', 'error'); return; }
    setLoading(true);
    setInvoice(null);
    setQtyMap({});
    try {
      const inv = await api.returns.getInvoice(id);
      if (!inv) { showToast?.(`Invoice #${id} not found`, 'error'); setLoading(false); return; }
      setInvoice(inv);
      const past = await api.returns.getBySale(id);
      setPastReturns(past || []);
    } catch (err) {
      showToast?.(err.message || 'Failed to load invoice', 'error');
    }
    setLoading(false);
  }

  const setQty = (index, val, max) => {
    const q = Math.max(0, Math.min(parseInt(val, 10) || 0, max));
    setQtyMap((m) => ({ ...m, [index]: q }));
  };

  const selectAll = () => {
    if (!invoice) return;
    const m = {};
    invoice.items.forEach((it, i) => { if (it.remaining > 0) m[i] = it.remaining; });
    setQtyMap(m);
  };
  const clearAll = () => setQtyMap({});

  const returnLines = invoice
    ? invoice.items
        .map((it, i) => ({ it, i, qty: qtyMap[i] || 0 }))
        .filter((l) => l.qty > 0)
    : [];

  const origSubtotal = invoice
    ? invoice.items.reduce((s, it) => s + it.price * it.qty, 0)
    : 0;
  const returnedValue = returnLines.reduce((s, l) => s + l.it.price * l.qty, 0);
  const estRefund = origSubtotal > 0 ? (invoice.total * returnedValue) / origSubtotal : 0;

  const willCancel =
    invoice &&
    invoice.items.every((it, i) => (it.remaining - (qtyMap[i] || 0)) <= 0);

  async function submitReturn() {
    if (returnLines.length === 0) { showToast?.('Select at least one item to return', 'error'); return; }
    const payload = {
      sale_id: invoice.id,
      reason,
      items: returnLines.map((l) => ({ index: l.i, qty: l.qty })),
    };
    try {
      const res = await api.returns.create(payload);
      if (res?.success) {
        showToast?.(
          res.cancelled
            ? `Invoice #${invoice.id} fully returned & cancelled. Refund ${money(res.refund_amount)}`
            : `Returned. Refund ${money(res.refund_amount)} · new total ${money(res.new_total)}`,
          'success'
        );
        setReason('');
        await loadInvoice();
      } else {
        showToast?.(res?.error || 'Return failed', 'error');
      }
    } catch (err) {
      showToast?.(err.message || 'Return failed', 'error');
    }
  }

  const statusBadge = (status) => {
    const map = {
      completed: 'success', cancelled: 'danger', partially_returned: 'info',
    };
    return <span className={`badge badge-${map[status] || 'neutral'}`}>{(status || 'completed').replace('_', ' ')}</span>;
  };

  return (
    <div className="returns-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Returns & Refunds</h1>
          <p className="page-subtitle">Look up an invoice and return all or selected items back to stock</p>
        </div>
      </div>

      {/* Invoice lookup */}
      <form className="card returns-lookup" onSubmit={loadInvoice}>
        <div className="returns-lookup-field">
          <HiOutlineReceiptRefund size={22} />
          <input
            type="number"
            placeholder="Enter invoice number (e.g. 1024)"
            value={invoiceNo}
            onChange={(e) => setInvoiceNo(e.target.value)}
            autoFocus
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          <HiOutlineSearch size={18} /> {loading ? 'Loading…' : 'Load Invoice'}
        </button>
      </form>

      <AnimatePresence>
        {invoice && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {/* Invoice summary */}
            <div className="card returns-invoice-head">
              <div>
                <span className="ri-label">Invoice</span>
                <span className="ri-value">#{invoice.id}</span>
              </div>
              <div>
                <span className="ri-label">Customer</span>
                <span className="ri-value">{invoice.customer_name}</span>
              </div>
              <div>
                <span className="ri-label">Date</span>
                <span className="ri-value">{(invoice.created_at || '').split(' ')[0]}</span>
              </div>
              <div>
                <span className="ri-label">Current Total</span>
                <span className="ri-value">{money(invoice.total)}</span>
              </div>
              <div>
                <span className="ri-label">Status</span>
                {statusBadge(invoice.status)}
              </div>
            </div>

            {invoice.status === 'cancelled' ? (
              <div className="card returns-cancelled">
                <HiOutlineExclamationCircle size={22} />
                This invoice is fully returned and cancelled — nothing left to return.
              </div>
            ) : (
              <>
                <div className="card">
                  <div className="returns-toolbar">
                    <h3>Select items to return</h3>
                    <div className="flex gap-8">
                      <button className="btn btn-secondary" onClick={selectAll}>Return All</button>
                      <button className="btn btn-ghost" onClick={clearAll}>Clear</button>
                    </div>
                  </div>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Unit Price</th>
                          <th>Bought</th>
                          <th>Already Returned</th>
                          <th>Remaining</th>
                          <th>Return Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoice.items.map((it, i) => (
                          <tr key={i} className={it.remaining === 0 ? 'row-muted' : ''}>
                            <td style={{ fontWeight: 500 }}>
                              {it.name}{it.serviceId ? <span className="badge badge-neutral" style={{ marginLeft: 8 }}>Service</span> : null}
                            </td>
                            <td>{money(it.price)}</td>
                            <td>{it.qty}</td>
                            <td>{it.returnedQty || 0}</td>
                            <td>{it.remaining}</td>
                            <td>
                              <input
                                type="number"
                                className="input qty-input"
                                min={0}
                                max={it.remaining}
                                value={qtyMap[i] || 0}
                                disabled={it.remaining === 0}
                                onChange={(e) => setQty(i, e.target.value, it.remaining)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Action panel */}
                <div className="card returns-action">
                  <div className="returns-reason">
                    <label className="input-label">Reason (optional)</label>
                    <input
                      className="input"
                      placeholder="e.g. Damaged, wrong item, customer changed mind"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                  <div className="returns-summary">
                    <div className="rs-row"><span>Items selected</span><span>{returnLines.reduce((s, l) => s + l.qty, 0)}</span></div>
                    <div className="rs-row"><span>Estimated refund</span><strong>{money(estRefund)}</strong></div>
                    {willCancel && returnLines.length > 0 && (
                      <div className="rs-warning">
                        <HiOutlineExclamationCircle /> All items returned — invoice will be cancelled.
                      </div>
                    )}
                    <button className="btn btn-primary btn-block" onClick={submitReturn} disabled={returnLines.length === 0}>
                      <HiOutlineReceiptRefund size={18} /> Process Return
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Past returns for this invoice */}
            {pastReturns.length > 0 && (
              <div className="card">
                <h3 style={{ marginBottom: 12 }}>Return history for #{invoice.id}</h3>
                {pastReturns.map((r) => {
                  let items = [];
                  try { items = JSON.parse(r.items); } catch (_) {}
                  return (
                    <div key={r.id} className="return-history-row">
                      <HiOutlineCheckCircle className="rh-icon" />
                      <div className="rh-body">
                        <div className="rh-top">
                          <span>{items.map((it) => `${it.qty}× ${it.name}`).join(', ')}</span>
                          <strong>{money(r.refund_amount)}</strong>
                        </div>
                        <div className="rh-meta">{r.created_at}{r.reason ? ` · ${r.reason}` : ''}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
