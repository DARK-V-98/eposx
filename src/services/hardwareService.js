/**
 * Hardware Integration Hub - Virtual Driver Layer
 * This service simulates communication with thermal printers, scanners, and scales.
 */

const hardwareHub = {
  printer: {
    status: 'Online',
    model: 'Epson TM-T88VI Thermal Receipt Printer',
    lastPrinted: null,
    printReceipt: (data) => {
      console.log('Sending print command to Epson TM-T88VI...', data);
      return new Promise((resolve) => {
        setTimeout(() => {
          this.lastPrinted = new Date().toISOString();
          resolve({ success: true, message: 'Receipt printed successfully' });
        }, 800);
      });
    },
    testPage: () => {
      return new Promise((resolve) => {
        setTimeout(() => resolve({ success: true }), 500);
      });
    }
  },

  scanner: {
    status: 'Ready',
    type: 'Omnidirectional Laser Barcode Scanner',
    lastScan: null,
    onScan: (callback) => {
      // Simulation of a hardware scan event
      window.addEventListener('keypress', (e) => {
        // Simple logic to simulate a barcode ending with Enter
        if (e.key === 'Enter') {
          const fakeBarcode = '501234567890';
          callback(fakeBarcode);
        }
      });
    }
  },

  scale: {
    status: 'Connected',
    weight: 0.00,
    getWeight: () => {
      // Simulate reading from a serial scale
      return (Math.random() * 2).toFixed(3);
    }
  },

  biometric: {
    status: 'Secure',
    scanFingerprint: () => {
      return new Promise((resolve) => {
        setTimeout(() => resolve({ success: true, userId: 'ADMIN_01' }), 1200);
      });
    }
  }
};

export default hardwareHub;
