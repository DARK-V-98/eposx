import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './TitleBar.css';
import { VscChromeMinimize, VscChromeMaximize, VscChromeClose } from 'react-icons/vsc';
import { HiOutlineBell } from 'react-icons/hi';

const TitleBar = ({ onOpenNotifications, notificationCount = 0, logo }) => {
  const handleMinimize = () => window.api.window.minimize();
  const handleMaximize = () => window.api.window.maximize();
  const handleClose    = () => window.api.window.close();

  return (
    <motion.div
      className="title-bar"
      initial={{ opacity: 0, y: -32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Animated accent line at very bottom of bar */}
      <div className="title-bar-accent-line" />

      <div className="title-bar-drag-region">
        <div className="title-bar-content">
          {/* Logo with subtle spin on mount */}
          <motion.div
            className="title-bar-icon"
            initial={{ rotate: -20, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4, type: 'spring', stiffness: 300 }}
          >
            <img src={logo} alt="EPOSX" className="title-logo-icon" />
          </motion.div>

          {/* Animated brand text — letters stagger in */}
          <motion.span
            className="title-bar-text"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.28, duration: 0.4 }}
          >
            EPOSX — Professional Edition
          </motion.span>

          {/* Live status dot */}
          <motion.div
            className="title-live-dot"
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(16,185,129,0.6)',
                '0 0 0 5px rgba(16,185,129,0)',
              ],
            }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
          />
          <span className="title-live-text">LIVE</span>
        </div>
      </div>

      <div className="title-bar-controls">
        {/* Notification bell */}
        <motion.button
          className={`control-button notification-trigger ${notificationCount > 0 ? 'has-new' : ''}`}
          onClick={onOpenNotifications}
          title="System Notifications"
          whileHover={{ backgroundColor: '#2a2a2a' }}
          whileTap={{ scale: 0.9 }}
        >
          <motion.div
            animate={notificationCount > 0 ? { rotate: [0, -12, 12, -8, 8, 0] } : {}}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
          >
            <HiOutlineBell />
          </motion.div>
          <AnimatePresence>
            {notificationCount > 0 && (
              <motion.span
                className="notification-badge"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              >
                {notificationCount}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Window controls */}
        <motion.button
          className="control-button minimize"
          onClick={handleMinimize}
          title="Minimize"
          whileHover={{ backgroundColor: '#333' }}
          whileTap={{ scale: 0.88 }}
        >
          <VscChromeMinimize />
        </motion.button>

        <motion.button
          className="control-button maximize"
          onClick={handleMaximize}
          title="Maximize"
          whileHover={{ backgroundColor: '#333' }}
          whileTap={{ scale: 0.88 }}
        >
          <VscChromeMaximize />
        </motion.button>

        <motion.button
          className="control-button close"
          onClick={handleClose}
          title="Close"
          whileTap={{ scale: 0.88 }}
        >
          <VscChromeClose />
        </motion.button>
      </div>
    </motion.div>
  );
};

export default TitleBar;
