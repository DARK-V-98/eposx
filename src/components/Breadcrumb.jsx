import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HiOutlineChevronRight, HiOutlineHome } from 'react-icons/hi';
import './Breadcrumb.css';

const pageLabels = {
  pos:       { label: 'Point of Sale',    emoji: '🛒' },
  products:  { label: 'Inventory & Stock',emoji: '📦' },
  suppliers: { label: 'Suppliers & GRN',  emoji: '🚚' },
  alerts:    { label: 'Stock Alerts',     emoji: '🔔' },
  customers: { label: 'Customers',        emoji: '👥' },
  staff:     { label: 'Staff Performance',emoji: '📈' },
  history:   { label: 'Order History',    emoji: '🗂️' },
  quotations:{ label: 'Quotations',        emoji: '📝' },
  returns:   { label: 'Returns & Refunds', emoji: '↩️' },
  dues:      { label: 'Credit & Dues',     emoji: '💳' },
  expenses:  { label: 'Expenses & P/L',    emoji: '🧾' },
  cash:      { label: 'Cash Drawer',       emoji: '💵' },
  coupons:   { label: 'Coupons',           emoji: '🎟️' },
  reports:   { label: 'Reports',          emoji: '📊' },
  users:     { label: 'User Management',  emoji: '👤' },
  admin:     { label: 'Admin — Access',   emoji: '🛡️' },
  settings:  { label: 'Settings',         emoji: '⚙️' },
};

export default function Breadcrumb({ activePage, onNavigate }) {
  const current = pageLabels[activePage] || { label: activePage, emoji: '📄' };

  return (
    <div className="breadcrumb-bar">
      <button className="breadcrumb-home" onClick={() => onNavigate('pos')} title="Go to POS">
        <HiOutlineHome />
        <span>Dashboard</span>
      </button>

      {activePage !== 'pos' && (
        <>
          <HiOutlineChevronRight className="breadcrumb-sep" />
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              className="breadcrumb-current"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2 }}
            >
              <span className="breadcrumb-emoji">{current.emoji}</span>
              <span>{current.label}</span>
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
