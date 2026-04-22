import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineBell, HiOutlineX, HiOutlineTrash, HiOutlineExclamationCircle } from 'react-icons/hi';

export default function NotificationCenter({ isOpen, onClose, notifications, onClear, onRemove }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            className="modal-overlay" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ zIndex: 1000 }}
          />
          <motion.div 
            className="notification-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <div className="notification-header">
              <div className="flex items-center gap-12">
                <HiOutlineBell size={24} />
                <h3>System Notifications</h3>
              </div>
              <button className="btn btn-icon btn-ghost" onClick={onClose}><HiOutlineX /></button>
            </div>

            <div className="notification-list">
              {notifications.length === 0 ? (
                <div className="empty-notifications">
                  <HiOutlineBell size={48} />
                  <p>No new notifications</p>
                  <span>Your system is running smoothly</span>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div key={notif.id} className={`notification-item type-${notif.type}`}>
                    <div className="notification-icon">
                      <HiOutlineExclamationCircle />
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">{notif.title}</div>
                      <div className="notification-message">{notif.message}</div>
                      <div className="notification-time">{notif.time}</div>
                    </div>
                    <button className="notification-remove" onClick={() => onRemove(notif.id)}>
                      <HiOutlineTrash />
                    </button>
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="notification-footer">
                <button className="btn btn-secondary w-full" onClick={onClear}>Clear All Notifications</button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
