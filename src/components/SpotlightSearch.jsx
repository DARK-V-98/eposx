import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineSearch, HiOutlineX, HiOutlineShoppingCart,
  HiOutlineCube, HiOutlineUsers, HiOutlineClipboardList,
  HiOutlinePresentationChartBar, HiOutlineCog, HiOutlineTruck,
  HiOutlineBell, HiOutlineTrendingUp, HiOutlineUserGroup,
  HiOutlineArrowRight,
} from 'react-icons/hi';
import './SpotlightSearch.css';

const pageResults = [
  { id: 'pos',       label: 'Point of Sale',    icon: HiOutlineShoppingCart,       type: 'page' },
  { id: 'products',  label: 'Inventory & Stock', icon: HiOutlineCube,               type: 'page' },
  { id: 'suppliers', label: 'Suppliers & GRN',   icon: HiOutlineTruck,              type: 'page' },
  { id: 'alerts',    label: 'Stock Alerts',      icon: HiOutlineBell,               type: 'page' },
  { id: 'customers', label: 'Customers',         icon: HiOutlineUsers,              type: 'page' },
  { id: 'staff',     label: 'Staff Performance', icon: HiOutlineTrendingUp,         type: 'page' },
  { id: 'history',   label: 'Order History',     icon: HiOutlineClipboardList,      type: 'page' },
  { id: 'reports',   label: 'Reports',           icon: HiOutlinePresentationChartBar, type: 'page' },
  { id: 'users',     label: 'User Management',   icon: HiOutlineUserGroup,          type: 'page' },
  { id: 'settings',  label: 'Settings',          icon: HiOutlineCog,                type: 'page' },
];

export default function SpotlightSearch({ isOpen, onClose, onNavigate }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  const results = useMemo(() => {
    if (!query.trim()) return pageResults.slice(0, 6);
    const q = query.toLowerCase();
    return pageResults.filter(r => r.label.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => { setSelected(0); }, [results]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && results[selected]) {
      onNavigate(results[selected].id);
      onClose();
    }
    if (e.key === 'Escape') onClose();
  };

  const handleSelect = (result) => {
    onNavigate(result.id);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="spotlight-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            className="spotlight-modal"
            initial={{ opacity: 0, scale: 0.94, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -20 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="spotlight-input-row">
              <HiOutlineSearch className="spotlight-search-icon" />
              <input
                ref={inputRef}
                className="spotlight-input"
                placeholder="Search pages, products, customers..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              {query && (
                <button className="spotlight-clear" onClick={() => setQuery('')}>
                  <HiOutlineX />
                </button>
              )}
              <kbd className="spotlight-esc">ESC</kbd>
            </div>

            {/* Divider */}
            <div className="spotlight-divider" />

            {/* Results */}
            <div className="spotlight-results">
              {results.length === 0 && (
                <div className="spotlight-empty">No results for "{query}"</div>
              )}
              {results.map((r, i) => {
                const Icon = r.icon;
                return (
                  <motion.button
                    key={r.id}
                    className={`spotlight-item ${i === selected ? 'selected' : ''}`}
                    onClick={() => handleSelect(r)}
                    onMouseEnter={() => setSelected(i)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <div className="spotlight-item-icon">
                      <Icon />
                    </div>
                    <span className="spotlight-item-label">{r.label}</span>
                    <span className="spotlight-item-type">{r.type}</span>
                    {i === selected && <HiOutlineArrowRight className="spotlight-item-arrow" />}
                  </motion.button>
                );
              })}
            </div>

            {/* Footer hints */}
            <div className="spotlight-footer">
              <span><kbd>↑↓</kbd> Navigate</span>
              <span><kbd>↵</kbd> Open</span>
              <span><kbd>Esc</kbd> Close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
