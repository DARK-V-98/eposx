import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HiOutlineSearch, 
  HiOutlineCalendar, 
  HiOutlineUser, 
  HiOutlineReceiptTax,
  HiOutlineEye,
  HiOutlineRefresh,
  HiOutlineX
} from 'react-icons/hi';
import ReceiptModal from './ReceiptModal';
import './OrderHistory.css';

const api = window.api || {
  sales: {
    getAll: async () => [],
    search: async () => [],
  },
  settings: {
    getAll: async () => ({ currency: 'LKR' }),
  }
};

export default function OrderHistory({ showToast }) {
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({ currency: 'LKR' });
  
  // Viewing details
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    loadOrders();
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const data = await api.settings.getAll();
      if (data) setSettings(prev => ({ ...prev, ...data }));
    } catch (err) { console.error(err); }
  }

  async function loadOrders() {
    setLoading(true);
    try {
      const data = await api.sales.getAll();
      setOrders(data);
    } catch (err) {
      showToast('Failed to load order history', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = searchQuery 
        ? await api.sales.search(searchQuery)
        : await api.sales.getAll();
      setOrders(data);
    } catch (err) {
      showToast('Search failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  function viewOrder(order) {
    // Parse items if string
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    setSelectedOrder({ ...order, items });
    setShowReceipt(true);
  }

  const formatPrice = (val) => `${settings.currency} ${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  return (
    <div className="history-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Order History</h1>
          <p className="page-subtitle">Track and view all past transactions</p>
        </div>
        <button className="btn btn-ghost" onClick={loadOrders} title="Refresh">
          <HiOutlineRefresh />
        </button>
      </div>

      {/* Search Bar */}
      <form className="history-search-bar" onSubmit={handleSearch}>
        <div className="pos-search-wrapper">
          <HiOutlineSearch className="pos-search-icon" />
          <input 
            type="text" 
            className="pos-search" 
            placeholder="Search by Order No, Customer Name, or Notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button type="button" className="pos-search-clear" onClick={() => { setSearchQuery(''); loadOrders(); }}>
              <HiOutlineX />
            </button>
          )}
        </div>
        <button type="submit" className="btn btn-primary">Search Orders</button>
      </form>

      {/* Orders Table */}
      <div className="table-container card">
        <table>
          <thead>
            <tr>
              <th>Order No</th>
              <th>Date & Time</th>
              <th>Customer</th>
              <th>Payment</th>
              <th>Total Amount</th>
              <th align="right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <motion.tr 
                key={order.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <td>
                  <span className="order-no-badge">
                    #{order.id.toString().padStart(6, '0')}
                  </span>
                </td>
                <td>
                  <div className="history-date">
                    <HiOutlineCalendar /> {order.created_at}
                  </div>
                </td>
                <td>
                  <div className="history-user">
                    <HiOutlineUser /> {order.customer_name || 'Walk-in Customer'}
                  </div>
                </td>
                <td>
                  <span className={`badge badge-neutral`}>
                    {order.payment_method.toUpperCase()}
                  </span>
                </td>
                <td>
                  <strong className="history-price">
                    {formatPrice(order.total)}
                  </strong>
                </td>
                <td align="right">
                  <button className="btn btn-ghost btn-sm" onClick={() => viewOrder(order)}>
                    <HiOutlineEye /> View Details
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>

        {orders.length === 0 && !loading && (
          <div className="empty-state">
            <div className="empty-state-icon">🧾</div>
            <div className="empty-state-title">No orders found</div>
            <div className="empty-state-text">Check your search query or complete some sales first.</div>
          </div>
        )}
        
        {loading && <div className="loading-overlay">Loading...</div>}
      </div>

      <ReceiptModal 
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        saleData={selectedOrder}
      />
    </div>
  );
}
