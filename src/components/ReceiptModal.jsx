import React, { useState, useEffect } from 'react';
import { HiOutlinePrinter, HiOutlineX } from 'react-icons/hi';
import './ReceiptModal.css';

const api = window.api || {
  settings: {
    getAll: async () => ({}),
  },
};

export default function ReceiptModal({ isOpen, onClose, saleData }) {
  const [settings, setSettings] = useState({
    company_name: 'E POS X Studio',
    company_phone: '',
    company_address: '',
    company_email: '',
    currency: 'LKR',
    receipt_footer: 'Thank you for your business!',
  });

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  async function loadSettings() {
    try {
      const data = await api.settings.getAll();
      if (data) setSettings(prev => ({ ...prev, ...data }));
    } catch (err) { console.error(err); }
  }

  if (!isOpen || !saleData) return null;

  const {
    id = 'TRX-0000',
    customer_name = 'Walk-in Customer',
    items = [],
    subtotal = 0,
    discount = 0,
    tax = 0,
    total = 0,
    payment_method = 'cash',
    created_at = new Date().toLocaleString(),
    notes = ''
  } = saleData;

  const formatPrice = (val) => `${settings.currency} ${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="receipt-overlay">
      <div className="receipt-container no-print">
        <div className="receipt-actions">
          <button className="btn btn-primary" onClick={handlePrint}>
            <HiOutlinePrinter /> Print Receipt
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            <HiOutlineX /> Close
          </button>
        </div>

        <div className="receipt-paper" id="receipt-content">
          {/* Header */}
          <div className="receipt-header">
            <h1 className="receipt-brand">{settings.company_name}</h1>
            <p className="receipt-sub">Studio Management System</p>
            <div className="receipt-separator"></div>
            <p className="receipt-address" style={{ whiteSpace: 'pre-line' }}>{settings.company_address}</p>
            <p className="receipt-contact">
              {settings.company_phone} {settings.company_email && `| ${settings.company_email}`}
            </p>
          </div>

          {/* Info */}
          <div className="receipt-info">
            <div className="info-row">
              <span>Receipt No:</span>
              <strong>{id.toString().padStart(6, '0')}</strong>
            </div>
            <div className="info-row">
              <span>Date:</span>
              <span>{created_at}</span>
            </div>
            <div className="info-row">
              <span>Customer:</span>
              <span>{customer_name}</span>
            </div>
          </div>

          {/* Table */}
          <table className="receipt-table">
            <thead>
              <tr>
                <th align="left">Description</th>
                <th align="center">Qty</th>
                <th align="right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td>
                    <div className="item-name">{item.name}</div>
                    <div className="item-price">{settings.currency} {Number(item.price).toFixed(2)}</div>
                  </td>
                  <td align="center">x{item.qty}</td>
                  <td align="right">{formatPrice(item.price * item.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="receipt-totals">
            <div className="total-row">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="total-row">
                <span>Discount</span>
                <span>-{formatPrice(discount)}</span>
              </div>
            )}
            {tax > 0 && (
              <div className="total-row">
                <span>Tax</span>
                <span>{formatPrice(tax)}</span>
              </div>
            )}
            <div className="total-row grand">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="receipt-footer">
            <div className="payment-label">Paid via {payment_method.toUpperCase()}</div>
            {notes && <div className="receipt-notes">Note: {notes}</div>}
            <div className="receipt-separator"></div>
            <p className="thank-you">{settings.receipt_footer}</p>
            <div className="dev-credit">Developed by eSystemLK</div>
            <div className="qr-placeholder">
              <div className="qr-box"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
