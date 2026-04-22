import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HiOutlineUserAdd, 
  HiOutlineMail, 
  HiOutlineLockClosed, 
  HiOutlineBadgeCheck,
  HiOutlineTrash,
  HiOutlinePencil
} from 'react-icons/hi';

export default function UserManagement({ showToast }) {
  const [users, setUsers] = useState([
    { id: 1, email: 'tikfese@gmail.com', role: 'Admin', status: 'Active' },
    { id: 2, email: 'manager@eposx.com', role: 'Manager', status: 'Active' },
    { id: 3, email: 'cashier1@eposx.com', role: 'Cashier', status: 'Active' },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    role: 'User'
  });

  const handleAddUser = (e) => {
    e.preventDefault();
    if (!newUser.email || !newUser.password) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    const userToAdd = {
      id: Date.now(),
      email: newUser.email,
      role: newUser.role,
      status: 'Active'
    };

    setUsers([...users, userToAdd]);
    setNewUser({ email: '', password: '', role: 'User' });
    setShowAddModal(false);
    showToast(`User ${newUser.email} added successfully!`, 'success');
  };

  const deleteUser = (id) => {
    setUsers(users.filter(u => u.id !== id));
    showToast('User removed successfully', 'info');
  };

  return (
    <div className="user-management-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage system access roles and credentials</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <HiOutlineUserAdd size={20} />
          Add New User
        </button>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Email Address</th>
                <th>Access Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td style={{ fontWeight: 500 }}>{user.email}</td>
                  <td>
                    <span className={`badge badge-${user.role.toLowerCase() === 'admin' ? 'primary' : user.role.toLowerCase() === 'manager' ? 'info' : 'neutral'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-success">
                      {user.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-8">
                      <button className="btn btn-icon btn-ghost" title="Edit">
                        <HiOutlinePencil />
                      </button>
                      <button 
                        className="btn btn-icon btn-ghost btn-danger" 
                        title="Delete"
                        onClick={() => deleteUser(user.id)}
                        disabled={user.email === 'tikfese@gmail.com'}
                      >
                        <HiOutlineTrash />
                      </button>
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
            <motion.div 
              className="modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
            >
              <div className="modal-header">
                <h2 className="modal-title">Create New User</h2>
                <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
              </div>

              <form onSubmit={handleAddUser} className="modal-body">
                <div className="input-group">
                  <label className="input-label">Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <HiOutlineMail style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                    <input 
                      type="email" 
                      className="input" 
                      style={{ paddingLeft: '40px', width: '100%' }}
                      placeholder="user@example.com"
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <HiOutlineLockClosed style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                    <input 
                      type="password" 
                      className="input" 
                      style={{ paddingLeft: '40px', width: '100%' }}
                      placeholder="••••••••"
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">System Role</label>
                  <div style={{ position: 'relative' }}>
                    <HiOutlineBadgeCheck style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                    <select 
                      className="input" 
                      style={{ paddingLeft: '40px', width: '100%' }}
                      value={newUser.role}
                      onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                    >
                      <option value="User">User</option>
                      <option value="Cashier">Cashier</option>
                      <option value="Manager">Manager</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Create User Account</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
