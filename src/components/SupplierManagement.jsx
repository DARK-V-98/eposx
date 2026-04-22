import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HiOutlineTruck, 
  HiOutlinePlus, 
  HiOutlineDocumentText, 
  HiOutlineClipboardCheck,
  HiOutlineDotsVertical,
  HiOutlineEye
} from 'react-icons/hi';

export default function SupplierManagement({ showToast, settings }) {
  const [suppliers, setSuppliers] = useState([
    { id: 1, name: 'Global Electronics Ltd', contact: 'John Doe', phone: '0771234567', email: 'sales@globalelec.com', category: 'Electronics' },
    { id: 2, name: 'Standard Stationery', contact: 'Jane Smith', phone: '0719876543', email: 'orders@standard.com', category: 'Stationery' },
  ]);

  const [grns, setGrns] = useState([
    { id: 'GRN-001', supplier: 'Global Electronics Ltd', date: '2026-04-20', total: 45000, status: 'Received' },
  ]);

  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showGrnModal, setShowGrnModal] = useState(false);

  return (
    <div className="supplier-management">
      <div className="page-header">
        <div>
          <h1 className="page-title">Supplier & GRN Management</h1>
          <p className="page-subtitle">Manage procurement, suppliers, and Goods Received Notes</p>
        </div>
        <div className="flex gap-12">
          <button className="btn btn-secondary" onClick={() => setShowAddSupplier(true)}>
            <HiOutlinePlus /> Add Supplier
          </button>
          <button className="btn btn-primary" onClick={() => setShowGrnModal(true)}>
            <HiOutlineDocumentText /> New GRN Entry
          </button>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon orange"><HiOutlineTruck /></div>
          <div className="stat-info">
            <div className="stat-value">{suppliers.length}</div>
            <div className="stat-label">Active Suppliers</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><HiOutlineClipboardCheck /></div>
          <div className="stat-info">
            <div className="stat-value">{grns.length}</div>
            <div className="stat-label">GRNs This Month</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">Recent Goods Received Notes (GRN)</h3>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>GRN ID</th>
                <th>Supplier</th>
                <th>Date</th>
                <th>Total Value</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {grns.map((grn) => (
                <tr key={grn.id}>
                  <td><strong>{grn.id}</strong></td>
                  <td>{grn.supplier}</td>
                  <td>{grn.date}</td>
                  <td>{settings.currency} {grn.total.toLocaleString()}</td>
                  <td><span className="badge badge-success">{grn.status}</span></td>
                  <td>
                    <button className="btn btn-icon btn-ghost"><HiOutlineEye /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* GRN Modal Simulation */}
      <AnimatePresence>
        {showGrnModal && (
          <div className="modal-overlay">
            <motion.div 
              className="modal" 
              style={{ maxWidth: '800px' }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="modal-header">
                <h2 className="modal-title">New Goods Received Note</h2>
                <button className="modal-close" onClick={() => setShowGrnModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="flex gap-24">
                  <div className="input-group flex-1">
                    <label className="input-label">Select Supplier</label>
                    <select className="input">
                      {suppliers.map(s => <option key={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="input-group flex-1">
                    <label className="input-label">Reference Number</label>
                    <input type="text" className="input" placeholder="Invoice / PO #" />
                  </div>
                </div>
                
                <div style={{ marginTop: '24px' }}>
                  <h4 style={{ marginBottom: '12px' }}>Items Received</h4>
                  <table className="mini-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Qty Received</th>
                        <th>Unit Cost</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><input type="text" className="input input-sm" placeholder="Search item..." /></td>
                        <td><input type="number" className="input input-sm" defaultValue="0" /></td>
                        <td><input type="number" className="input input-sm" defaultValue="0" /></td>
                        <td>0.00</td>
                      </tr>
                    </tbody>
                  </table>
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: '8px' }}>+ Add Row</button>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowGrnModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={() => {
                  showToast('GRN processed and inventory updated!', 'success');
                  setShowGrnModal(false);
                }}>Process GRN</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
