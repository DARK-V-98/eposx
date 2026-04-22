import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './components/Sidebar';
import POSScreen from './components/POSScreen';
import ProductManagement from './components/ProductManagement';
import CustomerManagement from './components/CustomerManagement';
import OrderHistory from './components/OrderHistory';
import StudioBooking from './components/StudioBooking';
import ReportsDashboard from './components/ReportsDashboard';
import SettingsManagement from './components/SettingsManagement';
import UserManagement from './components/UserManagement';
import SupplierManagement from './components/SupplierManagement';
import StockAlerts from './components/StockAlerts';
import StaffManagement from './components/StaffManagement';
import NotificationCenter from './components/NotificationCenter';
import Toast from './components/Toast';
import TitleBar from './components/TitleBar';
import Login from './components/Login';
import SpotlightSearch from './components/SpotlightSearch';
import Breadcrumb from './components/Breadcrumb';
import loginBg from './assets/login-bg.png';
import logo from './assets/logo.png';
import hardwareHub from './services/hardwareService';

const pages = {
  pos:       POSScreen,
  products:  ProductManagement,
  suppliers: SupplierManagement,
  alerts:    StockAlerts,
  customers: CustomerManagement,
  staff:     StaffManagement,
  history:   OrderHistory,
  studio:    StudioBooking,
  reports:   ReportsDashboard,
  users:     UserManagement,
  settings:  SettingsManagement,
};

const pageTransition = {
  initial:    { opacity: 0, y: 10 },
  animate:    { opacity: 1, y: 0 },
  exit:       { opacity: 0, y: -10 },
  transition: { duration: 0.18, ease: 'easeOut' },
};

// ── keyboard shortcut map ─────────────────────────────────
const KEY_NAV = {
  F1: 'pos', F2: 'products', F3: 'suppliers',
  F4: 'alerts', F5: 'customers', F6: 'staff',
  F7: 'history', F8: 'reports', F9: 'settings',
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn]           = useState(false);
  const [userRole, setUserRole]               = useState('User');
  const [activePage, setActivePage]           = useState('pos');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toasts, setToasts]                   = useState([]);

  // ── #1 Dark Mode ──────────────────────────────────────────
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('eposx-dark') === 'true';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('eposx-dark', darkMode);
  }, [darkMode]);

  // ── #3 Spotlight Search ───────────────────────────────────
  const [spotlightOpen, setSpotlightOpen] = useState(false);

  // ── #2 Keyboard Shortcuts ─────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      // Ctrl+K → Spotlight
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isLoggedIn) setSpotlightOpen(v => !v);
        return;
      }
      // Ctrl+L → Logout
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        if (isLoggedIn) handleLogout();
        return;
      }
      // Ctrl+D → Dark mode toggle
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        setDarkMode(v => !v);
        return;
      }
      // F1–F9 → Page navigation (only when logged in, no modifier)
      if (!e.ctrlKey && !e.metaKey && !e.altKey && KEY_NAV[e.key]) {
        if (isLoggedIn) {
          e.preventDefault();
          setActivePage(KEY_NAV[e.key]);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isLoggedIn]);

  // ── Global Settings ───────────────────────────────────────
  const [settings, setSettings] = useState({
    currency:        'LKR',
    company_name:    'EPOSX Professional',
    company_address: 'Colombo, Sri Lanka',
    company_phone:   '+94 11 234 5678',
    company_email:   'info@eposx.com',
  });

  // ── Notifications ─────────────────────────────────────────
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'System Online', message: 'EPOSX Professional Edition initialized successfully.', time: 'Just now', type: 'info' },
  ]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const addNotification = useCallback((notif) => {
    setNotifications(prev => [{
      id: Date.now(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ...notif,
    }, ...prev]);
  }, []);

  const removeNotification = (id) => setNotifications(prev => prev.filter(n => n.id !== id));
  const clearNotifications  = ()  => setNotifications([]);

  // ── Parked Bills ──────────────────────────────────────────
  const [parkedBills, setParkedBills] = useState([]);
  const holdBill         = useCallback((bill) => setParkedBills(prev => [...prev, { ...bill, id: Date.now() }]), []);
  const deleteParkedBill = useCallback((id)   => setParkedBills(prev => prev.filter(b => b.id !== id)), []);

  // ── Toast ─────────────────────────────────────────────────
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  // ── Auth ──────────────────────────────────────────────────
  const handleLogin = (credentials) => {
    setIsLoggedIn(true);
    setUserRole(credentials?.username === 'tikfese@gmail.com' ? 'Admin' : 'Cashier');
    showToast('Login successful! Welcome to EPOSX.', 'success');
  };

  const handleLogout = useCallback(() => {
    console.log('[E POS X] Logging out...');
    setIsLoggedIn(false);
    setUserRole('User');
    setActivePage('pos');
    showToast('Logged out successfully.', 'info');
  }, [showToast]);

  const ActiveComponent = pages[activePage];

  return (
    <div className="app-root">
      {/* ── #1 Dark Mode class on root ── */}

      {/* ── TitleBar ─────────────────────────────────────── */}
      <TitleBar
        logo={logo}
        onOpenNotifications={() => setIsNotifOpen(true)}
        notificationCount={notifications.length}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(v => !v)}
        onOpenSpotlight={() => isLoggedIn && setSpotlightOpen(true)}
        isLoggedIn={isLoggedIn}
      />

      <AnimatePresence mode="wait">
        {!isLoggedIn ? (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Login onLogin={handleLogin} bgImage={loginBg} logo={logo} />
          </motion.div>
        ) : (
          <motion.div
            key="app-body"
            className="app-layout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="app-body">
              {/* ── #2/#3 Sidebar with keyboard hint tooltip ── */}
              <Sidebar
                logo={logo}
                activePage={activePage}
                onNavigate={setActivePage}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(v => !v)}
                parkedCount={parkedBills.length}
                userRole={userRole}
                onLogout={handleLogout}
              />

              <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                {/* ── #4 Breadcrumb ── */}
                <Breadcrumb activePage={activePage} onNavigate={setActivePage} />

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activePage}
                    className="page-container"
                    {...pageTransition}
                  >
                    <ActiveComponent
                      showToast={showToast}
                      userRole={userRole}
                      settings={settings}
                      onUpdateSettings={setSettings}
                      addNotification={addNotification}
                      parkedBills={activePage === 'pos' ? parkedBills : undefined}
                      onHoldBill={activePage === 'pos' ? holdBill : undefined}
                      onDeleteParkedBill={activePage === 'pos' ? deleteParkedBill : undefined}
                    />
                  </motion.div>
                </AnimatePresence>
              </main>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── #3 Spotlight Search ── */}
      <SpotlightSearch
        isOpen={spotlightOpen}
        onClose={() => setSpotlightOpen(false)}
        onNavigate={(page) => { setActivePage(page); setSpotlightOpen(false); }}
      />

      {/* ── Notification Center ── */}
      <NotificationCenter
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        notifications={notifications}
        onRemove={removeNotification}
        onClear={clearNotifications}
      />

      {/* ── Toasts ── */}
      <div className="toast-container">
        <AnimatePresence>
          {toasts.map((toast) => (
            <Toast key={toast.id} message={toast.message} type={toast.type} />
          ))}
        </AnimatePresence>
      </div>

      {/* ── #1 Dark mode toggle hint (bottom-right) ── */}
      {isLoggedIn && (
        <motion.button
          className="dark-toggle-fab"
          onClick={() => setDarkMode(v => !v)}
          title={darkMode ? 'Switch to Light Mode (Ctrl+D)' : 'Switch to Dark Mode (Ctrl+D)'}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.92 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          {darkMode ? '☀️' : '🌙'}
        </motion.button>
      )}
    </div>
  );
}
