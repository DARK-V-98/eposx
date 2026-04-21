import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart,
} from 'recharts';
import {
  HiOutlineCurrencyDollar,
  HiOutlineShoppingCart,
  HiOutlineTrendingUp,
  HiOutlineUserGroup,
} from 'react-icons/hi';
import './ReportsDashboard.css';

const api = window.api || {
  sales: {
    getDailySummary: async () => [],
    getMonthlySummary: async () => [],
    getToday: async () => [],
  },
  dashboard: {
    getStats: async () => ({
      todaySales: { count: 0, total: 0 },
      monthSales: { count: 0, total: 0 },
      totalCustomers: { count: 0 },
      todayAppointments: { count: 0 },
      lowStockProducts: { count: 0 },
      topProducts: [],
    }),
  },
  system: {
    backup: async () => ({ success: false }),
    restore: async () => ({ success: false }),
  },
};

const CHART_COLORS = ['#FF6A00', '#FF8C33', '#FFB366', '#FFD699', '#3B82F6', '#10B981'];

export default function ReportsDashboard({ showToast }) {
  const [stats, setStats] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [todaySales, setTodaySales] = useState([]);
  const [period, setPeriod] = useState('7');

  useEffect(() => { loadAll(); }, []);

  useEffect(() => { loadDailySummary(); }, [period]);

  async function loadAll() {
    try {
      const [s, daily, monthly, today] = await Promise.all([
        api.dashboard.getStats(),
        api.sales.getDailySummary(7),
        api.sales.getMonthlySummary(12),
        api.sales.getToday(),
      ]);
      setStats(s);
      setDailyData(daily.map((d) => ({
        ...d,
        date: formatDate(d.date),
        revenue: Math.round((d.revenue || 0) * 100) / 100,
        avg_order: Math.round((d.avg_order || 0) * 100) / 100,
      })));
      setMonthlyData(monthly.map((m) => ({
        ...m,
        month: formatMonth(m.month),
        revenue: Math.round((m.revenue || 0) * 100) / 100,
      })));
      setTodaySales(today);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadDailySummary() {
    try {
      const daily = await api.sales.getDailySummary(Number(period));
      setDailyData(daily.map((d) => ({
        ...d,
        date: formatDate(d.date),
        revenue: Math.round((d.revenue || 0) * 100) / 100,
        avg_order: Math.round((d.avg_order || 0) * 100) / 100,
      })));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleBackup() {
    try {
      const res = await api.system.backup();
      if (res.success) {
        showToast('Backup created successfully!', 'success');
      } else if (res.error) {
        showToast(`Backup failed: ${res.error}`, 'error');
      }
    } catch (err) {
      showToast('System error during backup', 'error');
    }
  }

  async function handleRestore() {
    if (!confirm('WARNING: Restoring will REPLACE ALL CURRENT DATA and restart the app. Continue?')) return;
    try {
      const res = await api.system.restore();
      if (res.error) {
        showToast(`Restore failed: ${res.error}`, 'error');
      }
    } catch (err) {
      showToast('System error during restore', 'error');
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatMonth(monthStr) {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(month) - 1]} ${year.slice(2)}`;
  }

  // Payment method breakdown for pie chart
  const paymentBreakdown = todaySales.reduce((acc, sale) => {
    const method = sale.payment_method || 'cash';
    acc[method] = (acc[method] || 0) + sale.total;
    return acc;
  }, {});

  const pieData = Object.entries(paymentBreakdown).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: Math.round(value * 100) / 100,
  }));

  if (!stats) {
    return (
      <div className="rd-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Reports</h1>
            <p className="page-subtitle">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rd-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Track your business performance</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        <motion.div className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <div className="stat-icon orange"><HiOutlineCurrencyDollar /></div>
          <div className="stat-info">
            <div className="stat-value">${(stats.todaySales?.total || 0).toFixed(2)}</div>
            <div className="stat-label">Today's Revenue</div>
          </div>
        </motion.div>
        <motion.div className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="stat-icon green"><HiOutlineShoppingCart /></div>
          <div className="stat-info">
            <div className="stat-value">{stats.todaySales?.count || 0}</div>
            <div className="stat-label">Today's Orders</div>
          </div>
        </motion.div>
        <motion.div className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="stat-icon blue"><HiOutlineTrendingUp /></div>
          <div className="stat-info">
            <div className="stat-value">${(stats.monthSales?.total || 0).toFixed(0)}</div>
            <div className="stat-label">Monthly Revenue</div>
          </div>
        </motion.div>
        <motion.div className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="stat-icon red"><HiOutlineUserGroup /></div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalCustomers?.count || 0}</div>
            <div className="stat-label">Total Customers</div>
          </div>
        </motion.div>
      </div>

      {/* Charts Grid */}
      <div className="rd-charts-grid">
        {/* Daily Revenue Chart */}
        <motion.div
          className="card rd-chart-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="card-header">
            <h3 className="card-title">Daily Revenue</h3>
            <div className="rd-period-select">
              <select
                className="input"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                style={{ width: 120, padding: '6px 10px', fontSize: 13 }}
              >
                <option value="7">Last 7 days</option>
                <option value="14">Last 14 days</option>
                <option value="30">Last 30 days</option>
              </select>
            </div>
          </div>
          <div className="rd-chart-wrapper">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6A00" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#FF6A00" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #E5E7EB',
                    borderRadius: 10,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    fontSize: 13,
                  }}
                  formatter={(value) => [`$${value}`, 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#FF6A00"
                  strokeWidth={2.5}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Monthly Revenue Chart */}
        <motion.div
          className="card rd-chart-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="card-header">
            <h3 className="card-title">Monthly Revenue</h3>
          </div>
          <div className="rd-chart-wrapper">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #E5E7EB',
                    borderRadius: 10,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    fontSize: 13,
                  }}
                  formatter={(value) => [`$${value}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#FF6A00" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Orders Chart */}
        <motion.div
          className="card rd-chart-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="card-header">
            <h3 className="card-title">Daily Orders</h3>
          </div>
          <div className="rd-chart-wrapper">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #E5E7EB',
                    borderRadius: 10,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    fontSize: 13,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="total_orders"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  dot={{ fill: '#3B82F6', r: 4 }}
                  name="Orders"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Payment Methods Pie */}
        <motion.div
          className="card rd-chart-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="card-header">
            <h3 className="card-title">Payment Methods (Today)</h3>
          </div>
          <div className="rd-chart-wrapper rd-pie-wrapper">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #E5E7EB',
                      borderRadius: 10,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      fontSize: 13,
                    }}
                    formatter={(value) => [`$${value}`]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon"><HiOutlineTrendingUp /></div>
                <div className="empty-state-title">No sales today</div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Today's Sales List */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={{ marginTop: 20 }}
      >
        <div className="card-header">
          <h3 className="card-title">Today's Sales</h3>
          <span className="badge badge-primary">{todaySales.length} orders</span>
        </div>

        {todaySales.length > 0 ? (
          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {todaySales.slice(0, 15).map((sale) => {
                  let itemCount = 0;
                  try {
                    const items = JSON.parse(sale.items);
                    itemCount = items.reduce((sum, i) => sum + (i.qty || 1), 0);
                  } catch (e) { /* ignore */ }

                  return (
                    <tr key={sale.id}>
                      <td><span className="badge badge-neutral">#{sale.id}</span></td>
                      <td>{sale.customer_name || 'Walk-in'}</td>
                      <td>{itemCount} items</td>
                      <td className="pm-price">${sale.total.toFixed(2)}</td>
                      <td>
                        <span className={`badge ${sale.payment_method === 'cash' ? 'badge-success' : 'badge-info'}`}>
                          {sale.payment_method}
                        </span>
                      </td>
                      <td>{sale.created_at ? new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon"><HiOutlineShoppingCart /></div>
            <div className="empty-state-title">No sales today yet</div>
            <div className="empty-state-text">Sales will appear here once you make a transaction</div>
          </div>
        )}
      </motion.div>

      {/* System Actions */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        style={{ marginTop: 20, marginBottom: 40 }}
      >
        <div className="card-header">
          <h3 className="card-title">System Data</h3>
        </div>
        <div style={{ padding: '0 20px 20px', display: 'flex', gap: 20 }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: 14, marginBottom: 4 }}>Export POS Data</h4>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 16 }}>
              Create a backup copy of your entire database (products, sales, customers, etc.)
            </p>
            <button className="btn btn-secondary" onClick={handleBackup}>
              Download Backup (.db)
            </button>
          </div>
          <div style={{ flex: 1, borderLeft: '1px solid var(--border-light)', paddingLeft: 20 }}>
            <h4 style={{ fontSize: 14, marginBottom: 4 }}>Import POS Data</h4>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 16 }}>
              Restore from a previous backup file. <strong>Existing data will be replaced.</strong>
            </p>
            <button className="btn btn-danger" onClick={handleRestore}>
              Restore from File
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
