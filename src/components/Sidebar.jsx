import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineShoppingCart,
  HiOutlineCube,
  HiOutlineUserGroup,
  HiOutlineCalendar,
  HiOutlineChartBar,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineExternalLink,
  HiOutlineUsers,
  HiOutlinePhotograph,
  HiOutlinePresentationChartBar,
  HiOutlineCog,
  HiOutlineClipboardList,
  HiOutlineLogout,
  HiOutlineTruck,
  HiOutlineBell,
  HiOutlineTrendingUp,
} from 'react-icons/hi';
import './Sidebar.css';

const navItems = [
  { id: 'pos',       label: 'Point of Sale',       icon: HiOutlineShoppingCart },
  { id: 'products',  label: 'Inventory & Stock',    icon: HiOutlineCube },
  { id: 'suppliers', label: 'Suppliers & GRN',      icon: HiOutlineTruck },
  { id: 'alerts',    label: 'Stock Alerts',         icon: HiOutlineBell },
  { id: 'customers', label: 'Customers',            icon: HiOutlineUsers },
  { id: 'staff',     label: 'Staff Performance',    icon: HiOutlineTrendingUp },
  { id: 'history',   label: 'Order History',        icon: HiOutlineClipboardList },
  { id: 'reports',   label: 'Reports',              icon: HiOutlinePresentationChartBar },
  { id: 'users',     label: 'User Management',      icon: HiOutlineUserGroup, adminOnly: true },
  { id: 'settings',  label: 'Settings',             icon: HiOutlineCog },
];

const api = window.api || { shell: { openExternal: () => {} } };

// Stagger container for nav items
const navListVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.055, delayChildren: 0.18 },
  },
};

const navItemVariants = {
  hidden: { opacity: 0, x: -18 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
};

export default function Sidebar({
  logo, activePage, onNavigate, collapsed, onToggleCollapse,
  parkedCount = 0, userRole = 'User', onLogout,
}) {
  function openDevSite(e) {
    e.preventDefault();
    try { api.shell.openExternal('https://www.esystemlk.com'); } catch (_) {}
  }

  const visibleItems = navItems.filter(item => !item.adminOnly || userRole === 'Admin');

  return (
    <motion.aside
      className={`sidebar ${collapsed ? 'collapsed' : ''}`}
      animate={{ width: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)' }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* ── Logo ── */}
      <motion.div
        className="sidebar-logo"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <motion.img
          src={logo}
          alt="EPOSX"
          className="logo-image"
          whileHover={{ scale: 1.08, rotate: 3 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
        />
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              className="logo-text"
              initial={{ opacity: 0, x: -12, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 'auto' }}
              exit={{ opacity: 0, x: -12, width: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <span className="logo-name">E POS X</span>
              <span className="logo-tag">Professional Edition</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Navigation ── */}
      <motion.nav
        className="sidebar-nav"
        variants={navListVariants}
        initial="hidden"
        animate="show"
      >
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          const isPOS = item.id === 'pos';

          return (
            <motion.button
              key={item.id}
              variants={navItemVariants}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : ''}
              whileHover={{ x: collapsed ? 0 : 4 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {/* Active sliding indicator */}
              {isActive && (
                <motion.div
                  className="nav-active-bar"
                  layoutId="activeBar"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}

              <div className="nav-icon-wrapper">
                <Icon className="nav-icon" />

                {/* Active dot */}
                {isActive && (
                  <motion.div
                    className="nav-active-dot"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  />
                )}

                {/* Parked bill badge */}
                {isPOS && parkedCount > 0 && (
                  <motion.span
                    className="nav-parked-badge"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  >
                    {parkedCount}
                  </motion.span>
                )}
              </div>

              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    className="nav-label"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </motion.nav>

      {/* ── Logout ── */}
      <div className="sidebar-actions">
        <motion.button
          className="nav-item logout-btn"
          onClick={() => {
            console.log('[Sidebar] Logout clicked');
            onLogout();
          }}
          title={collapsed ? 'Logout' : ''}
          whileHover={{ x: collapsed ? 0 : 4, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
          whileTap={{ scale: 0.94 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="nav-icon-wrapper">
            <HiOutlineLogout className="nav-icon" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                className="nav-label"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* ── Collapse Toggle ── */}
      <motion.button
        className="sidebar-toggle"
        onClick={onToggleCollapse}
        whileHover={{ backgroundColor: 'var(--bg-secondary)' }}
        whileTap={{ scale: 0.95 }}
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        <motion.span
          animate={{ rotate: collapsed ? 180 : 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: 'flex' }}
        >
          <HiOutlineChevronLeft />
        </motion.span>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
            >
              Collapse
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* ── Footer ── */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            className="sidebar-footer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="sidebar-footer-version">E POS X v2.0</div>
            <div className="sidebar-footer-dev">
              Developed by
              <button className="dev-link" onClick={openDevSite}>
                eSystemLK
                <HiOutlineExternalLink />
              </button>
            </div>
            <button className="dev-link-full" onClick={openDevSite}>
              www.esystemlk.com
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
