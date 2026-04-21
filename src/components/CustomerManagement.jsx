import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineSearch,
  HiOutlineX,
  HiOutlineUserGroup,
  HiOutlineUsers,
  HiOutlinePhone,
  HiOutlineMail,
  HiOutlineClock,
  HiOutlineCurrencyDollar,
  HiOutlineStar,
  HiOutlineCursorClick,
} from 'react-icons/hi';
import './CustomerManagement.css';

const api = (window.api && window.api.customers) ? window.api : {
  customers: {
    getAll: async () => [],
    create: async (c) => ({ id: Date.now(), ...c }),
    update: async (id, c) => ({ id, ...c }),
    delete: async () => ({ success: true }),
    getHistory: async () => [],
  },
  settings: {
    getAll: async () => ({ currency: 'LKR' }),
  }
};

const emptyCustomer = { name: '', phone: '', email: '', address: '', notes: '' };

export default function CustomerManagement({ showToast }) {
  const [customers, setCustomers] = useState([]);
  const [settings, setSettings] = useState({ currency: 'LKR' });
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [form, setForm] = useState({ ...emptyCustomer });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => { loadCustomers(); loadSettings(); }, []);

  async function loadSettings() {
    try {
      const data = await api.settings.getAll();
      if (data) setSettings(prev => ({ ...prev, ...data }));
    } catch (err) { console.error(err); }
  }

  async function loadCustomers() {
    try {
      const data = await api.customers.getAll();
      setCustomers(data);
    } catch (err) { console.error(err); }
  }

  const formatPrice = (val) => `${settings.currency} ${Number(val || 0).toLocaleString()}`;

  const filteredCustomers = customers.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.phone || '').includes(q) || (c.email || '').toLowerCase().includes(q);
  });

  function openAddModal() {
    setEditingCustomer(null);
    setForm({ ...emptyCustomer });
    setShowModal(true);
  }

  function openEditModal(customer) {
    setEditingCustomer(customer);
    setForm({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      notes: customer.notes || '',
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name) {
      showToast('Customer name is required', 'error');
      return;
    }
    try {
      if (editingCustomer) {
        await api.customers.update(editingCustomer.id, form);
        showToast('Customer updated');
      } else {
        await api.customers.create(form);
        showToast('Customer added');
      }
      setShowModal(false);
      loadCustomers();
    } catch (err) {
      showToast('Failed to save customer', 'error');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this customer?')) return;
    try {
      await api.customers.delete(id);
      showToast('Customer deleted');
      if (selectedCustomer?.id === id) setSelectedCustomer(null);
      loadCustomers();
    } catch (err) {
      showToast('Failed to delete', 'error');
    }
  }

  async function viewCustomer(customer) {
    setSelectedCustomer(customer);
    try {
      const h = await api.customers.getHistory(customer.id);
      setHistory(h);
    } catch (err) {
      setHistory([]);
    }
  }

  return (
    <div className="cm-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">Manage your customer database</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <HiOutlinePlus /> Add Customer
        </button>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon orange"><HiOutlineUserGroup /></div>
          <div className="stat-info">
            <div className="stat-value">{customers.length}</div>
            <div className="stat-label">Total Customers</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><HiOutlineCurrencyDollar /></div>
          <div className="stat-info">
            <div className="stat-value">
              {formatPrice(customers.reduce((sum, c) => sum + (c.total_spent || 0), 0))}
            </div>
            <div className="stat-label">Total Revenue</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><HiOutlineStar /></div>
          <div className="stat-info">
            <div className="stat-value">
              {customers.filter((c) => (c.visit_count || 0) >= 10).length}
            </div>
            <div className="stat-label">VIP Customers</div>
          </div>
        </div>
      </div>

      <div className="cm-layout">
        {/* Customer List */}
        <div className="cm-list-section">
          {/* Search */}
          <div className="pos-search-wrapper" style={{ marginBottom: 16 }}>
            <HiOutlineSearch className="pos-search-icon" />
            <input
              type="text"
              className="pos-search"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="cm-customer-list">
            {filteredCustomers.map((customer) => (
              <motion.div
                key={customer.id}
                className={`cm-customer-card ${selectedCustomer?.id === customer.id ? 'active' : ''}`}
                onClick={() => viewCustomer(customer)}
                whileTap={{ scale: 0.98 }}
              >
                <div className="cm-avatar">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div className="cm-customer-info">
                  <div className="cm-customer-name">{customer.name}</div>
                  <div className="cm-customer-detail">
                    {customer.phone && <span><HiOutlinePhone /> {customer.phone}</span>}
                  </div>
                </div>
                <div className="cm-customer-stats">
                  <span className="cm-spent">{formatPrice(customer.total_spent)}</span>
                  <span className="cm-visits">{customer.visit_count || 0} visits</span>
                </div>
                <div className="cm-card-actions">
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={(e) => { e.stopPropagation(); openEditModal(customer); }}>
                    <HiOutlinePencil />
                  </button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={(e) => { e.stopPropagation(); handleDelete(customer.id); }}>
                    <HiOutlineTrash />
                  </button>
                </div>
              </motion.div>
            ))}

            {filteredCustomers.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon"><HiOutlineUsers /></div>
                <div className="empty-state-title">No customers found</div>
                <div className="empty-state-text">Try adjusting your search or add a new customer</div>
              </div>
            )}
          </div>
        </div>

        {/* Customer Detail */}
        <div className="cm-detail-section">
          {selectedCustomer ? (
            <div className="cm-detail">
              <div className="cm-detail-header">
                <div className="cm-detail-avatar">
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="cm-detail-name">{selectedCustomer.name}</h2>
                  <div className="cm-detail-meta">
                    {selectedCustomer.phone && <span><HiOutlinePhone /> {selectedCustomer.phone}</span>}
                    {selectedCustomer.email && <span><HiOutlineMail /> {selectedCustomer.email}</span>}
                  </div>
                </div>
              </div>

              {selectedCustomer.notes && (
                <div className="cm-detail-notes">
                  <strong>Notes:</strong> {selectedCustomer.notes}
                </div>
              )}

              <div className="cm-detail-stats">
                <div className="cm-detail-stat">
                  <span className="cm-ds-value">{formatPrice(selectedCustomer.total_spent)}</span>
                  <span className="cm-ds-label">Total Spent</span>
                </div>
                <div className="cm-detail-stat">
                  <span className="cm-ds-value">{selectedCustomer.visit_count || 0}</span>
                  <span className="cm-ds-label">Total Visits</span>
                </div>
                <div className="cm-detail-stat">
                  <span className="cm-ds-value">
                    {formatPrice(selectedCustomer.visit_count > 0 ? ((selectedCustomer.total_spent || 0) / selectedCustomer.visit_count) : 0)}
                  </span>
                  <span className="cm-ds-label">Avg. Spend</span>
                </div>
              </div>

              {/* Purchase History */}
              <div className="cm-history">
                <h3 className="cm-history-title"><HiOutlineClock /> Purchase History</h3>
                {history.length > 0 ? (
                  <div className="cm-history-list">
                    {history.slice(0, 10).map((sale) => (
                      <div key={sale.id} className="cm-history-item">
                        <div className="cm-history-date">
                          {new Date(sale.created_at).toLocaleDateString()}
                        </div>
                        <div className="cm-history-amount">{formatPrice(sale.total)}</div>
                        <span className={`badge badge-${sale.payment_method === 'cash' ? 'success' : 'info'}`}>
                          {sale.payment_method}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="cm-no-history">No purchase history yet</p>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon"><HiOutlineCursorClick /></div>
              <div className="empty-state-title">Select a customer</div>
              <div className="empty-state-text">Click on a customer to view their details and history</div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              className="modal"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2 className="modal-title">
                  {editingCustomer ? 'Edit Customer' : 'Add Customer'}
                </h2>
                <button className="modal-close" onClick={() => setShowModal(false)}>
                  <HiOutlineX />
                </button>
              </div>

              <div className="modal-body">
                <div className="input-group">
                  <label className="input-label">Full Name *</label>
                  <input className="input" placeholder="Customer name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="input-group">
                    <label className="input-label">Phone</label>
                    <input className="input" placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Email</label>
                    <input className="input" placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">Address</label>
                  <input className="input" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">Notes</label>
                  <textarea className="input" placeholder="Customer notes..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave}>
                  {editingCustomer ? 'Save Changes' : 'Add Customer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
