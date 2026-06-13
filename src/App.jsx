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
import ReturnsManagement from './components/ReturnsManagement';
import QuotationManagement from './components/QuotationManagement';
import ExpenseManagement from './components/ExpenseManagement';
import CashDrawer from './components/CashDrawer';
import DuesManagement from './components/DuesManagement';
import CouponsManagement from './components/CouponsManagement';
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
import { onAuthStateChanged, signOut as fbSignOut, initAnalyticsIfSupported } from './firebase';
import { resolveRole, isPlatformAdmin } from './auth/roles';
import { getActiveStore, requestAccess, effectiveStatus, daysLeft } from './services/licenseService';
import { PackageSelection, StatusScreen } from './components/AccessScreens';
import AdminPanel from './components/AdminPanel';
import { createFirestoreApi } from './api/firestoreApi';
import { startRealtime, stopRealtime } from './api/realtime';

// Point window.api at Firestore for a cloud store, or back to the default
// (SQLite via HTTP/Electron) for offline stores.
function applyBackendForStore(store) {
  const router = window.__apiRouter;
  if (store && store.package === 'cloud') {
    startRealtime(store.id);                       // live cache + change events
    router?.__setBackend?.(createFirestoreApi(store.id));
  } else {
    stopRealtime();
    router?.__resetBackend?.();
  }
}

const pages = {
  pos:       POSScreen,
  products:  ProductManagement,
  suppliers: SupplierManagement,
  alerts:    StockAlerts,
  customers: CustomerManagement,
  staff:     StaffManagement,
  history:   OrderHistory,
  quotations: QuotationManagement,
  returns:   ReturnsManagement,
  expenses:  ExpenseManagement,
  cash:      CashDrawer,
  dues:      DuesManagement,
  coupons:   CouponsManagement,
  studio:    StudioBooking,
  reports:   ReportsDashboard,
  users:     UserManagement,
  admin:     AdminPanel,
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
  const [currentUser, setCurrentUser]         = useState(null);
  // Access / licensing gate
  const [accessState, setAccessState]         = useState('loading'); // loading|need-store|pending|rejected|trial|active|expired|locked
  const [currentStore, setCurrentStore]       = useState(null);
  const [isAdmin, setIsAdmin]                 = useState(false);
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
  // Restore the Firebase session on load and react to sign in/out.
  useEffect(() => {
    initAnalyticsIfSupported();
    const unsub = onAuthStateChanged((user) => {
      if (user) {
        const role = resolveRole(user.email);
        const u = { uid: user.uid, email: user.email, name: user.displayName, photo: user.photoURL };
        setCurrentUser(u);
        setUserRole(role);
        setIsLoggedIn(true);
        checkAccess(u);
      } else {
        setCurrentUser(null);
        setUserRole('User');
        setIsLoggedIn(false);
        setAccessState('loading');
        setCurrentStore(null);
        setIsAdmin(false);
      }
    });
    return () => unsub();
  }, []);

  // Resolve the user's licensing state from Firestore.
  const checkAccess = useCallback(async (user) => {
    if (isPlatformAdmin(user.email)) {
      // Platform admin always has access and sees the Admin panel.
      setIsAdmin(true);
      setAccessState('active');
      return;
    }
    setIsAdmin(false);
    setAccessState('loading');
    try {
      const store = await getActiveStore(user.uid);
      if (!store) { setCurrentStore(null); setAccessState('need-store'); return; }
      setCurrentStore(store);
      const status = effectiveStatus(store);
      // Swap to the Firestore backend before the app renders for cloud stores.
      if (status === 'active' || status === 'trial') applyBackendForStore(store);
      setAccessState(status); // pending|trial|active|expired|locked|rejected
    } catch (err) {
      console.error('[E POS X] Access check failed:', err);
      // Fail safe: let them see the request screen rather than a blank app.
      setAccessState('need-store');
    }
  }, []);

  const handleRequestAccess = useCallback(async ({ storeName, pkg }) => {
    try {
      const store = await requestAccess({ uid: currentUser.uid, email: currentUser.email, storeName, pkg });
      setCurrentStore(store);
      setAccessState('pending');
      showToast('Access request sent! Awaiting approval.', 'success');
    } catch (err) {
      showToast(err.message || 'Could not send request (check Firestore rules)', 'error');
    }
  }, [currentUser, showToast]);

  // Real Google sign-in flips state via the onAuthStateChanged listener above.
  // This handler covers the email/password dev bypass form.
  const handleLogin = (credentials) => {
    const email = credentials?.username;
    setCurrentUser({ email, name: email, photo: null });
    setUserRole(resolveRole(email));
    setIsLoggedIn(true);
    // Dev bypass skips the Firestore licensing gate.
    setIsAdmin(isPlatformAdmin(email));
    setAccessState('active');
    showToast('Login successful! Welcome to EPOSX.', 'success');
  };

  // Called by <Login> right after Google auth resolves (toast only).
  const handleGoogleSignedIn = (user) => {
    showToast(`Welcome ${user?.displayName || user?.email}`, 'success');
  };

  const handleLogout = useCallback(async () => {
    console.log('[E POS X] Logging out...');
    try { stopRealtime(); window.__apiRouter?.__resetBackend?.(); } catch (_) {}
    try { await fbSignOut(); } catch (_) {}
    setIsLoggedIn(false);
    setUserRole('User');
    setCurrentUser(null);
    setActivePage('pos');
    showToast('Logged out successfully.', 'info');
  }, [showToast]);

  const showApp = isLoggedIn && (isAdmin || accessState === 'active' || accessState === 'trial');
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
            <Login onLogin={handleLogin} onGoogleSignedIn={handleGoogleSignedIn} bgImage={loginBg} logo={logo} />
          </motion.div>
        ) : !showApp ? (
          <motion.div key="gate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            {accessState === 'loading' ? (
              <div className="access-screen"><div className="access-card"><h1>Checking access…</h1><p>Verifying your E POS X license.</p></div></div>
            ) : accessState === 'need-store' ? (
              <PackageSelection user={currentUser} onSubmit={handleRequestAccess} onLogout={handleLogout} />
            ) : (
              <StatusScreen status={accessState} store={currentStore} onLogout={handleLogout} onRefresh={() => checkAccess(currentUser)} />
            )}
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
                isPlatformAdmin={isAdmin}
                onLogout={handleLogout}
              />

              <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                {/* Trial countdown banner */}
                {accessState === 'trial' && currentStore && (
                  <div className="trial-banner">
                    ⏳ Trial — {daysLeft(currentStore)} day{daysLeft(currentStore) === 1 ? '' : 's'} left for <strong>{currentStore.storeName}</strong>.
                    <a href="https://www.esystemlk.com" target="_blank" rel="noreferrer"> Purchase to keep your data →</a>
                  </div>
                )}

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
                      adminEmail={currentUser?.email}
                      currentStore={currentStore}
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
