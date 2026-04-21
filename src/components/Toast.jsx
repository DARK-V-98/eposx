import React from 'react';
import { motion } from 'framer-motion';

export default function Toast({ message, type = 'success' }) {
  return (
    <motion.div
      className={`toast toast-${type}`}
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95 }}
      transition={{ duration: 0.25 }}
    >
      {type === 'success' && '✓'}
      {type === 'error' && '✕'}
      {type === 'info' && 'ℹ'}
      {message}
    </motion.div>
  );
}
