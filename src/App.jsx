import React, { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './components/Sidebar';
import POSScreen from './components/POSScreen';
import ProductManagement from './components/ProductManagement';
import CustomerManagement from './components/CustomerManagement';
import OrderHistory from './components/OrderHistory';
import StudioBooking from './components/StudioBooking';
import ReportsDashboard from './components/ReportsDashboard';
import SettingsManagement from './components/SettingsManagement';
import Toast from './components/Toast';

const pages = {
  pos: POSScreen,
  products: ProductManagement,
  customers: CustomerManagement,
  history: OrderHistory,
  studio: StudioBooking,
  reports: ReportsDashboard,
  settings: SettingsManagement,
};

const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.2, ease: 'easeOut' },
};

export default function App() {
  const [activePage, setActivePage] = useState('pos');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toasts, setToasts] = useState([]);

  // ── Parked Bills ──────────────────────────────────────────
  const [parkedBills, setParkedBills] = useState([]);

  const holdBill = useCallback((bill) => {
    setParkedBills((prev) => [...prev, { ...bill, id: Date.now() }]);
  }, []);

  const deleteParkedBill = useCallback((id) => {
    setParkedBills((prev) => prev.filter((b) => b.id !== id));
  }, []);

  // ── Toast ─────────────────────────────────────────────────
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const ActiveComponent = pages[activePage];

  return (
    <div className="app-layout">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        parkedCount={parkedBills.length}
      />

      <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            className="page-container"
            {...pageTransition}
          >
            <ActiveComponent
              showToast={showToast}
              /* POS-specific parked bill props */
              parkedBills={activePage === 'pos' ? parkedBills : undefined}
              onHoldBill={activePage === 'pos' ? holdBill : undefined}
              onDeleteParkedBill={activePage === 'pos' ? deleteParkedBill : undefined}
            />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Toasts */}
      <div className="toast-container">
        <AnimatePresence>
          {toasts.map((toast) => (
            <Toast key={toast.id} message={toast.message} type={toast.type} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
