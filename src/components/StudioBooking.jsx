import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineX,
  HiOutlineCalendar,
  HiOutlineClock,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineCheck,
  HiOutlineScissors,
  HiOutlineCurrencyDollar,
} from 'react-icons/hi';
import './StudioBooking.css';

const api = (window.api && window.api.appointments) ? window.api : {
  appointments: {
    getAll: async () => [],
    create: async (a) => ({ id: Date.now() }),
    delete: async () => ({ success: true }),
    updateStatus: async () => ({ success: true }),
  },
  services: { getAll: async () => [] },
  customers: { getAll: async () => [] },
  settings: { getAll: async () => ({ currency: 'LKR' }) },
};

const statusColors = {
  scheduled: 'badge-info',
  confirmed: 'badge-primary',
  completed: 'badge-success',
  cancelled: 'badge-danger',
};

export default function StudioBooking({ showToast }) {
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week'); // 'day' | 'week'
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    customer_id: '',
    customer_name: '',
    service_id: '',
    service_name: '',
    date: '',
    time: '09:00',
    duration_minutes: 60,
    price: 0,
    notes: '',
  });

  const [settings, setSettings] = useState({ currency: 'LKR' });

  useEffect(() => { loadData(); loadSettings(); }, []);

  async function loadSettings() {
    try {
      const data = await api.settings.getAll();
      if (data) setSettings(prev => ({ ...prev, ...data }));
    } catch (err) { console.error(err); }
  }

  async function loadData() {
    try {
      const [appts, svcs, custs] = await Promise.all([
        api.appointments.getAll(),
        api.services.getAll(),
        api.customers.getAll(),
      ]);
      setAppointments(appts);
      setServices(svcs);
      setCustomers(custs);
    } catch (err) {
      console.error(err);
    }
  }

  const formatPrice = (val) => `${settings.currency} ${Number(val).toLocaleString()}`;

  // Date navigation
  function navigateDate(delta) {
    const d = new Date(currentDate);
    if (viewMode === 'day') d.setDate(d.getDate() + delta);
    else d.setDate(d.getDate() + delta * 7);
    setCurrentDate(d);
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  // Get week days
  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  const timeSlots = Array.from({ length: 12 }, (_, i) => {
    const hour = 8 + i;
    return `${String(hour).padStart(2, '0')}:00`;
  });

  function getAppointmentsForDateAndTime(date, time) {
    const dateStr = date.toISOString().split('T')[0];
    return appointments.filter((a) => a.date === dateStr && a.time === time);
  }

  function getAppointmentsForDate(date) {
    const dateStr = date.toISOString().split('T')[0];
    return appointments.filter((a) => a.date === dateStr);
  }

  // Today stats
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter((a) => a.date === todayStr);
  const upcomingAppointments = appointments.filter((a) => a.date >= todayStr && a.status !== 'completed' && a.status !== 'cancelled');

  function openAddModal(date, time) {
    const dateStr = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    setForm({
      customer_id: '',
      customer_name: '',
      service_id: '',
      service_name: '',
      date: dateStr,
      time: time || '09:00',
      duration_minutes: 60,
      price: 0,
      notes: '',
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.customer_name || !form.service_name || !form.date) {
      showToast('Please fill in all required fields', 'error');
      return;
    }
    try {
      await api.appointments.create({
        ...form,
        customer_id: form.customer_id || null,
        service_id: form.service_id || null,
        status: 'scheduled',
      });
      showToast('Appointment booked!');
      setShowModal(false);
      loadData();
    } catch (err) {
      showToast('Failed to create appointment', 'error');
    }
  }

  async function handleStatusChange(id, status) {
    try {
      await api.appointments.updateStatus(id, status);
      showToast(`Appointment ${status}`);
      loadData();
    } catch (err) {
      showToast('Failed to update', 'error');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this appointment?')) return;
    try {
      await api.appointments.delete(id);
      showToast('Appointment deleted');
      loadData();
    } catch (err) {
      showToast('Failed to delete', 'error');
    }
  }

  function isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="sb-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Studio Booking</h1>
          <p className="page-subtitle">Manage appointments and services</p>
        </div>
        <button className="btn btn-primary" onClick={() => openAddModal()}>
          <HiOutlinePlus /> New Appointment
        </button>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon orange"><HiOutlineCalendar /></div>
          <div className="stat-info">
            <div className="stat-value">{todayAppointments.length}</div>
            <div className="stat-label">Today's Appointments</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><HiOutlineClock /></div>
          <div className="stat-info">
            <div className="stat-value">{upcomingAppointments.length}</div>
            <div className="stat-label">Upcoming</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><HiOutlineCurrencyDollar /></div>
          <div className="stat-info">
            <div className="stat-value">
              {formatPrice(todayAppointments.reduce((sum, a) => sum + (a.price || 0), 0))}
            </div>
            <div className="stat-label">Today's Revenue</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><HiOutlineScissors /></div>
          <div className="stat-info">
            <div className="stat-value">{services.length}</div>
            <div className="stat-label">Active Services</div>
          </div>
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="sb-calendar-controls">
        <div className="sb-nav-group">
          <button className="btn btn-secondary btn-sm" onClick={goToToday}>Today</button>
          <button className="btn btn-ghost btn-icon" onClick={() => navigateDate(-1)}>
            <HiOutlineChevronLeft />
          </button>
          <button className="btn btn-ghost btn-icon" onClick={() => navigateDate(1)}>
            <HiOutlineChevronRight />
          </button>
          <span className="sb-current-date">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
        </div>
        <div className="sb-view-toggle">
          <button className={`pos-tab ${viewMode === 'day' ? 'active' : ''}`} onClick={() => setViewMode('day')}>Day</button>
          <button className={`pos-tab ${viewMode === 'week' ? 'active' : ''}`} onClick={() => setViewMode('week')}>Week</button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="sb-calendar card">
        {viewMode === 'week' ? (
          <div className="sb-week-grid">
            {/* Header Row */}
            <div className="sb-week-header">
              <div className="sb-time-col-header">Time</div>
              {weekDays.map((day, i) => (
                <div
                  key={i}
                  className={`sb-day-header ${isToday(day) ? 'today' : ''}`}
                >
                  <span className="sb-day-name">{dayNames[day.getDay()]}</span>
                  <span className="sb-day-num">{day.getDate()}</span>
                </div>
              ))}
            </div>

            {/* Time Rows */}
            <div className="sb-week-body">
              {timeSlots.map((time) => (
                <div key={time} className="sb-time-row">
                  <div className="sb-time-label">{time}</div>
                  {weekDays.map((day, di) => {
                    const appts = getAppointmentsForDateAndTime(day, time);
                    return (
                      <div
                        key={di}
                        className={`sb-cell ${isToday(day) ? 'today' : ''}`}
                        onClick={() => openAddModal(day, time)}
                      >
                        {appts.map((appt) => (
                          <div
                            key={appt.id}
                            className={`sb-appt sb-appt-${appt.status}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="sb-appt-name">{appt.customer_name}</div>
                            <div className="sb-appt-service">{appt.service_name}</div>
                            <div className="sb-appt-actions">
                              {appt.status === 'scheduled' && (
                                <button
                                  className="sb-appt-btn"
                                  title="Confirm"
                                  onClick={() => handleStatusChange(appt.id, 'confirmed')}
                                >
                                  <HiOutlineCheck />
                                </button>
                              )}
                              {(appt.status === 'scheduled' || appt.status === 'confirmed') && (
                                <button
                                  className="sb-appt-btn complete"
                                  title="Complete"
                                  onClick={() => handleStatusChange(appt.id, 'completed')}
                                >
                                  ✓
                                </button>
                              )}
                              <button
                                className="sb-appt-btn cancel"
                                title="Delete"
                                onClick={() => handleDelete(appt.id)}
                              >
                                <HiOutlineTrash />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Day View */
          <div className="sb-day-view">
            <h3 className="sb-day-title">
              {dayNames[currentDate.getDay()]}, {currentDate.getDate()} {monthNames[currentDate.getMonth()]}
            </h3>
            <div className="sb-day-list">
              {timeSlots.map((time) => {
                const appts = getAppointmentsForDateAndTime(currentDate, time);
                return (
                  <div key={time} className="sb-day-slot" onClick={() => openAddModal(currentDate, time)}>
                    <div className="sb-day-time">{time}</div>
                    <div className="sb-day-content">
                      {appts.length > 0 ? (
                        appts.map((appt) => (
                          <div
                            key={appt.id}
                            className={`sb-day-appt sb-appt-${appt.status}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="sb-day-appt-header">
                              <strong>{appt.customer_name}</strong>
                              <span className={`badge ${statusColors[appt.status]}`}>{appt.status}</span>
                            </div>
                            <div className="sb-day-appt-detail">
                              {appt.service_name} • {appt.duration_minutes}min • ${appt.price}
                            </div>
                            <div className="sb-appt-actions">
                              {appt.status !== 'completed' && appt.status !== 'cancelled' && (
                                <button className="btn btn-sm btn-secondary" onClick={() => handleStatusChange(appt.id, 'completed')}>
                                  <HiOutlineCheck /> Complete
                                </button>
                              )}
                              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(appt.id)}>
                                <HiOutlineTrash />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <span className="sb-day-empty">Available</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add Appointment Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              className="modal"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2 className="modal-title">New Appointment</h2>
                <button className="modal-close" onClick={() => setShowModal(false)}>
                  <HiOutlineX />
                </button>
              </div>

              <div className="modal-body">
                <div className="input-group">
                  <label className="input-label">Customer *</label>
                  <select
                    className="input"
                    value={form.customer_id}
                    onChange={(e) => {
                      const cust = customers.find((c) => c.id === Number(e.target.value));
                      setForm({
                        ...form,
                        customer_id: e.target.value,
                        customer_name: cust?.name || '',
                      });
                    }}
                  >
                    <option value="">Select customer...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {!form.customer_id && (
                  <div className="input-group">
                    <label className="input-label">Or enter name</label>
                    <input
                      className="input"
                      placeholder="Walk-in customer name"
                      value={form.customer_name}
                      onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                    />
                  </div>
                )}

                <div className="input-group">
                  <label className="input-label">Service *</label>
                  <select
                    className="input"
                    value={form.service_id}
                    onChange={(e) => {
                      const svc = services.find((s) => s.id === Number(e.target.value));
                      setForm({
                        ...form,
                        service_id: e.target.value,
                        service_name: svc?.name || '',
                        duration_minutes: svc?.duration_minutes || 60,
                        price: svc?.price || 0,
                      });
                    }}
                  >
                    <option value="">Select service...</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — ${s.price} ({s.duration_minutes}min)
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="input-group">
                    <label className="input-label">Date *</label>
                    <input
                      className="input"
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Time *</label>
                    <input
                      className="input"
                      type="time"
                      value={form.time}
                      onChange={(e) => setForm({ ...form, time: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="input-group">
                    <label className="input-label">Duration (min)</label>
                    <input
                      className="input"
                      type="number"
                      value={form.duration_minutes}
                      onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Price ($)</label>
                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Notes</label>
                  <textarea
                    className="input"
                    placeholder="Additional notes..."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave}>
                  <HiOutlineCalendar /> Book Appointment
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
