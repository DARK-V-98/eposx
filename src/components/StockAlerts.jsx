import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  HiOutlineBell, 
  HiOutlineExclamation, 
  HiOutlineMail, 
  HiOutlinePhone,
  HiOutlineRefresh
} from 'react-icons/hi';

export default function StockAlerts({ showToast }) {
  const [lowStockItems, setLowStockItems] = useState([
    { id: 1, name: 'Samsung Galaxy S24 Ultra', sku: 'SAM-S24U-256', current: 2, threshold: 5, priority: 'High' },
    { id: 2, name: 'Logitech MX Master 3S', sku: 'LOG-MX3S', current: 3, threshold: 10, priority: 'Medium' },
    { id: 3, name: 'USB-C Charging Cable 2m', sku: 'ACC-CABLE-2M', current: 8, threshold: 25, priority: 'Low' },
  ]);

  const [alertSettings, setAlertSettings] = useState({
    email: true,
    sms: false,
    whatsapp: true,
    threshold: 20 // percent
  });

  return (
    <div className="stock-alerts">
      <div className="page-header">
        <div>
          <h1 className="page-title">Automated Stock Alerts</h1>
          <p className="page-subtitle">Monitoring high-priority inventory levels and notifying management</p>
        </div>
        <button className="btn btn-secondary" onClick={() => showToast('System scan complete. No new alerts.', 'info')}>
          <HiOutlineRefresh /> Scan Inventory
        </button>
      </div>

      <div className="alert-banner" style={{ 
        background: '#fff7ed', 
        border: '1px solid #ffedd5', 
        padding: '16px', 
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '24px',
        color: '#9a3412'
      }}>
        <div style={{ background: '#ffedd5', padding: '10px', borderRadius: '50%' }}>
          <HiOutlineExclamation size={24} />
        </div>
        <div>
          <h4 style={{ margin: 0 }}>Critical Stock Warning</h4>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>{lowStockItems.length} items have fallen below their safety threshold. Immediate reordering is recommended.</p>
        </div>
      </div>

      <div className="flex gap-24">
        <div className="flex-1">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Low Stock Items</h3>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Product Details</th>
                    <th>Current</th>
                    <th>Threshold</th>
                    <th>Priority</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>SKU: {item.sku}</div>
                      </td>
                      <td style={{ color: '#ef4444', fontWeight: 700 }}>{item.current}</td>
                      <td>{item.threshold}</td>
                      <td>
                        <span className={`badge badge-${item.priority === 'High' ? 'danger' : item.priority === 'Medium' ? 'warning' : 'neutral'}`}>
                          {item.priority}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-sm btn-primary">Order Now</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div style={{ width: '350px' }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Alert Configuration</h3>
            </div>
            <div className="modal-body" style={{ padding: 0 }}>
              <div className="input-group">
                <label className="flex items-center gap-12 cursor-pointer">
                  <input type="checkbox" checked={alertSettings.email} onChange={() => setAlertSettings({...alertSettings, email: !alertSettings.email})} />
                  <span>Email Notifications (Managers)</span>
                </label>
              </div>
              <div className="input-group" style={{ marginTop: '12px' }}>
                <label className="flex items-center gap-12 cursor-pointer">
                  <input type="checkbox" checked={alertSettings.whatsapp} onChange={() => setAlertSettings({...alertSettings, whatsapp: !alertSettings.whatsapp})} />
                  <span>WhatsApp Integration</span>
                </label>
              </div>
              
              <div className="input-group" style={{ marginTop: '24px' }}>
                <label className="input-label">Global Warning Threshold</label>
                <input type="range" className="w-full" value={alertSettings.threshold} onChange={(e) => setAlertSettings({...alertSettings, threshold: e.target.value})} />
                <div className="flex justify-between text-muted" style={{ fontSize: '0.8rem' }}>
                  <span>Min Stock</span>
                  <span>{alertSettings.threshold}% of total capacity</span>
                </div>
              </div>

              <button className="btn btn-primary w-full" style={{ marginTop: '24px' }} onClick={() => showToast('Alert settings saved!', 'success')}>
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
