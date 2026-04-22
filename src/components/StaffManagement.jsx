import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HiOutlineTrendingUp, 
  HiOutlineCurrencyDollar, 
  HiOutlineUser,
  HiOutlineChartPie,
  HiOutlineStar,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlinePencil
} from 'react-icons/hi';

export default function StaffManagement({ showToast, userRole = 'User', settings }) {
  const [staffData, setStaffData] = useState([
    { id: 1, name: 'Amali Perera', role: 'Cashier', sales: 125000, transactions: 48, rating: 4.8, commission: 2.5 },
    { id: 2, name: 'Kasun Silva', role: 'Senior Cashier', sales: 210000, transactions: 62, rating: 4.9, commission: 3.0 },
    { id: 3, name: 'Nuwan Fernando', role: 'Sales Associate', sales: 95000, transactions: 35, rating: 4.5, commission: 2.0 },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', role: 'Cashier', commission: 2 });

  const calculateATV = (sales, trans) => trans > 0 ? (sales / trans).toFixed(2) : 0;
  const calculateComm = (sales, rate) => (sales * (rate / 100)).toFixed(2);

  const isAdmin = userRole === 'Admin';

  const handleAddStaff = (e) => {
    e.preventDefault();
    const staff = {
      id: Date.now(),
      name: newStaff.name,
      role: newStaff.role,
      sales: 0,
      transactions: 0,
      rating: 5.0,
      commission: parseFloat(newStaff.commission)
    };
    setStaffData([...staffData, staff]);
    setShowAddModal(false);
    setNewStaff({ name: '', role: 'Cashier', commission: 2 });
    showToast(`${newStaff.name} added to staff list`, 'success');
  };

  const deleteStaff = (id) => {
    if (!isAdmin) return;
    setStaffData(staffData.filter(s => s.id !== id));
    showToast('Staff record removed', 'info');
  };

  return (
    <div className="staff-performance">
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff Performance & Management</h1>
          <p className="page-subtitle">Monitor sales metrics and manage employee commission tiers</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <HiOutlinePlus style={{ marginRight: '8px' }} /> Add Staff Member
          </button>
        )}
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><HiOutlineUser /></div>
          <div className="stat-info">
            <div className="stat-value">{staffData.length}</div>
            <div className="stat-label">Total Staff</div>
          </div>
        </div>
        {/* ... other stats ... */}
      </div>

      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">Employee Performance & Payroll Matrix</h3>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Role</th>
                <th>Total Sales</th>
                <th>Trans.</th>
                <th>ATV</th>
                <th>Rating</th>
                <th>Comm. %</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staffData.map((staff) => (
                <tr key={staff.id}>
                  <td><div style={{ fontWeight: 600 }}>{staff.name}</div></td>
                  <td>{staff.role}</td>
                  <td>{settings.currency} {staff.sales.toLocaleString()}</td>
                  <td>{staff.transactions}</td>
                  <td>{settings.currency} {calculateATV(staff.sales, staff.transactions)}</td>
                  <td>
                    <div className="flex items-center gap-4">
                      <HiOutlineStar style={{ color: '#fbbf24' }} /> {staff.rating}
                    </div>
                  </td>
                  <td>{staff.commission}%</td>
                  <td>
                    <div className="flex gap-8">
                      <button 
                        className={`btn btn-icon btn-ghost ${!isAdmin ? 'disabled' : ''}`} 
                        title={isAdmin ? "Edit" : "Admin Only"}
                        onClick={() => isAdmin ? showToast('Edit module opening...', 'info') : null}
                        style={{ cursor: isAdmin ? 'pointer' : 'not-allowed', opacity: isAdmin ? 1 : 0.4 }}
                      >
                        <HiOutlinePencil />
                      </button>
                      {isAdmin && (
                        <button className="btn btn-icon btn-ghost btn-danger" onClick={() => deleteStaff(staff.id)}>
                          <HiOutlineTrash />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="modal-overlay">
            <motion.div className="modal" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="modal-header">
                <h2 className="modal-title">Add New Staff</h2>
                <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
              </div>
              <form onSubmit={handleAddStaff} className="modal-body">
                <div className="input-group">
                  <label className="input-label">Full Name</label>
                  <input type="text" className="input" value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} required />
                </div>
                <div className="input-group" style={{ marginTop: '12px' }}>
                  <label className="input-label">Role</label>
                  <select className="input" value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})}>
                    <option>Cashier</option>
                    <option>Sales Associate</option>
                    <option>Manager</option>
                  </select>
                </div>
                <div className="input-group" style={{ marginTop: '12px' }}>
                  <label className="input-label">Commission Rate (%)</label>
                  <input type="number" className="input" value={newStaff.commission} onChange={e => setNewStaff({...newStaff, commission: e.target.value})} step="0.1" required />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Add Member</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex gap-24" style={{ marginTop: '24px' }}>
        <div className="card flex-1">
          <div className="card-header">
            <h3 className="card-title">Commission Settings</h3>
          </div>
          <div className="modal-body" style={{ padding: 0 }}>
            <p className="text-muted" style={{ marginBottom: '16px' }}>Configure automated commission tiers based on sales volume.</p>
            <div className="flex gap-16">
              <div className="input-group flex-1">
                <label className="input-label">Base Rate (%)</label>
                <input type="number" className="input" defaultValue="2" />
              </div>
              <div className="input-group flex-1">
                <label className="input-label">Threshold ({settings.currency})</label>
                <input type="number" className="input" defaultValue="100000" />
              </div>
              <div className="input-group flex-1">
                <label className="input-label">Bonus Multiplier</label>
                <input type="number" className="input" defaultValue="1.5" />
              </div>
            </div>
            <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => showToast('Commission rules updated!', 'success')}>
              Update Rules
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
