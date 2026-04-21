import React from 'react';
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
} from 'react-icons/hi';
import './Sidebar.css';

const navItems = [
  { id: 'pos', label: 'Point of Sale', icon: HiOutlineShoppingCart },
  { id: 'products', label: 'Products & Services', icon: HiOutlineCube },
  { id: 'customers', label: 'Customers', icon: HiOutlineUsers },
  { id: 'history', label: 'Order History', icon: HiOutlineClipboardList },
  { id: 'studio', label: 'Studio', icon: HiOutlinePhotograph },
  { id: 'reports', label: 'Reports', icon: HiOutlinePresentationChartBar },
  { id: 'settings', label: 'Settings', icon: HiOutlineCog },
];

const api = window.api || { shell: { openExternal: () => {} } };

export default function Sidebar({ activePage, onNavigate, collapsed, onToggleCollapse, parkedCount = 0 }) {
  function openDevSite(e) {
    e.preventDefault();
    try { api.shell.openExternal('https://www.esystemlk.com'); } catch (err) { /* fallback */ }
  }

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon"><span>E</span></div>
        {!collapsed && (
          <div className="logo-text">
            <span className="logo-name">E POS X</span>
            <span className="logo-tag">Professional Edition</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          const isPOS = item.id === 'pos';
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : ''}
            >
              <div className="nav-icon-wrapper">
                <Icon className="nav-icon" />
                {isActive && <div className="nav-active-dot" />}
                {/* Parked bill badge on POS item */}
                {isPOS && parkedCount > 0 && (
                  <span className="nav-parked-badge">{parkedCount}</span>
                )}
              </div>
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button className="sidebar-toggle" onClick={onToggleCollapse}>
        {collapsed ? <HiOutlineChevronRight /> : <HiOutlineChevronLeft />}
        {!collapsed && <span>Collapse</span>}
      </button>

      {/* Footer — eSystemLK branding */}
      {!collapsed && (
        <div className="sidebar-footer">
          <div className="sidebar-footer-version">E POS X v1.0</div>
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
        </div>
      )}
    </aside>
  );
}
