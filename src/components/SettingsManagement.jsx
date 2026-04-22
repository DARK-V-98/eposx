import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  HiOutlineOfficeBuilding, 
  HiOutlinePhone, 
  HiOutlineLocationMarker, 
  HiOutlineMail,
  HiOutlineGlobeAlt,
  HiOutlineCurrencyDollar,
  HiOutlineDocumentText,
  HiOutlineSave,
  HiOutlineTrash,
  HiOutlineExclamation
} from 'react-icons/hi';
import './SettingsManagement.css';

const api = (window.api && window.api.settings) ? window.api : {
  settings: {
    getAll: async () => ({}),
    updateAll: async () => ({ success: true }),
  },
  system: {
    reset: async () => ({ success: true }),
  },
};

export default function SettingsManagement({ showToast }) {
  const [settings, setSettings] = useState({
    company_name: '',
    company_phone: '',
    company_address: '',
    company_email: '',
    website: '',
    currency: 'LKR',
    tax_percentage: '0',
    receipt_footer: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const data = await api.settings.getAll();
      if (data && Object.keys(data).length > 0) {
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      await api.settings.updateAll(settings);
      showToast('Settings updated successfully');
    } catch (err) {
      showToast('Failed to save settings', 'error');
    }
  }

  async function handleReset() {
    const confirmed = window.confirm(
      "⚠️ DANGER: This will permanently delete all products, services, customers, sales, and appointments. \n\nThis action CANNOT be undone. Are you absolutely sure?"
    );
    
    if (confirmed) {
      try {
        await api.system.reset();
        showToast('System data cleared successfully. Reloading...', 'success');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err) {
        showToast('Failed to reset system data', 'error');
      }
    }
  }

  if (loading) return <div className="loading">Loading settings...</div>;

  return (
    <motion.div 
      className="settings-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="page-header">
        <div>
          <h1 className="page-title">System Settings</h1>
          <p className="page-subtitle">Configure your studio profile and receipt details</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave}>
          <HiOutlineSave /> Save Changes
        </button>
      </div>

      <div className="settings-grid">
        {/* Business Profile */}
        <div className="card settings-section">
          <div className="card-header">
            <h3 className="card-title"><HiOutlineOfficeBuilding /> Business Profile</h3>
          </div>
          <div className="settings-form">
            <div className="input-group">
              <label className="input-label">Company Name</label>
              <div className="input-with-icon">
                <HiOutlineOfficeBuilding className="field-icon" />
                <input 
                  className="input" 
                  value={settings.company_name} 
                  onChange={e => setSettings({...settings, company_name: e.target.value})}
                  placeholder="e.g. E POS X Studio"
                />
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Phone Number</label>
              <div className="input-with-icon">
                <HiOutlinePhone className="field-icon" />
                <input 
                  className="input" 
                  value={settings.company_phone} 
                  onChange={e => setSettings({...settings, company_phone: e.target.value})}
                  placeholder="+94 ..."
                />
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Address</label>
              <div className="input-with-icon">
                <HiOutlineLocationMarker className="field-icon" />
                <textarea 
                  className="input" 
                  value={settings.company_address} 
                  onChange={e => setSettings({...settings, company_address: e.target.value})}
                  placeholder="Studio address..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Online Presence */}
        <div className="card settings-section">
          <div className="card-header">
            <h3 className="card-title"><HiOutlineGlobeAlt /> Digital Details</h3>
          </div>
          <div className="settings-form">
            <div className="input-group">
              <label className="input-label">Email Address</label>
              <div className="input-with-icon">
                <HiOutlineMail className="field-icon" />
                <input 
                  className="input" 
                  value={settings.company_email} 
                  onChange={e => setSettings({...settings, company_email: e.target.value})}
                  placeholder="info@studio.com"
                />
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Website</label>
              <div className="input-with-icon">
                <HiOutlineGlobeAlt className="field-icon" />
                <input 
                  className="input" 
                  value={settings.website} 
                  onChange={e => setSettings({...settings, website: e.target.value})}
                  placeholder="www.studio.com"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="card settings-section">
          <div className="card-header">
            <h3 className="card-title"><HiOutlineCurrencyDollar /> Regional & Tax</h3>
          </div>
          <div className="settings-form">
            <div className="input-group">
              <label className="input-label">Currency Symbol</label>
              <div className="input-with-icon">
                <HiOutlineCurrencyDollar className="field-icon" />
                <input 
                  className="input" 
                  value={settings.currency} 
                  onChange={e => setSettings({...settings, currency: e.target.value})}
                  placeholder="LKR, Rs, $"
                />
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Tax (%)</label>
              <input 
                className="input" 
                type="number"
                value={settings.tax_percentage} 
                onChange={e => setSettings({...settings, tax_percentage: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* Receipt Settings */}
        <div className="card settings-section full-width">
          <div className="card-header">
            <h3 className="card-title"><HiOutlineDocumentText /> Receipt Customization</h3>
          </div>
          <div className="settings-form">
            <div className="input-group">
              <label className="input-label">Receipt Footer Message</label>
              <textarea 
                className="input" 
                value={settings.receipt_footer} 
                onChange={e => setSettings({...settings, receipt_footer: e.target.value})}
                placeholder="Message displayed at the bottom of the receipt..."
              />
            </div>
          </div>
        </div>
        {/* Danger Zone */}
        <div className="card settings-section full-width danger-zone">
          <div className="card-header">
            <h3 className="card-title danger-text"><HiOutlineExclamation /> Danger Zone</h3>
          </div>
          <div className="settings-form danger-content">
            <div className="danger-info">
              <p className="danger-title">Reset System Data</p>
              <p className="danger-desc">This will permanently delete all products, services, sales, customers, and appointments. Your company profile and settings will remain intact.</p>
            </div>
            <button className="btn btn-danger" onClick={handleReset}>
              <HiOutlineTrash /> Clear All Data
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
