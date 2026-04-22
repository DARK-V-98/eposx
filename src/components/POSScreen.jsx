import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlinePlus,
  HiOutlineMinus,
  HiOutlineTrash,
  HiOutlineShoppingCart,
  HiOutlineCreditCard,
  HiOutlineCash,
  HiOutlineSearch,
  HiOutlineTag,
  HiOutlineX,
  HiOutlineCheck,
  HiOutlinePause,
  HiOutlinePlay,
  HiOutlineClipboardList,
  HiOutlineClock,
  HiOutlineUserAdd,
  HiOutlineUser,
  HiOutlineRefresh,
  HiOutlineCheckCircle,
  HiOutlinePhotograph,
  HiOutlineScissors,
  HiOutlineSparkles,
  HiOutlineCamera,
  HiOutlineVideoCamera,
  HiOutlineLightBulb,
  HiOutlineCube,
  HiOutlineStar,
} from 'react-icons/hi';
import './POSScreen.css';
import ReceiptModal from './ReceiptModal';

const api = (window.api && window.api.sales) ? window.api : {
  products: { getAll: async () => [], search: async () => [] },
  services: { getAll: async () => [] },
  customers: { getAll: async () => [], create: async (c) => ({ id: Date.now(), ...c }) },
  sales: { create: async (s) => ({ id: Date.now(), ...s }) },
  settings: { getAll: async () => ({}) },
};

function CategoryIcon({ category, isService }) {
  if (isService) {
    const map = {
      'Hair': HiOutlineScissors,
      'Skin': HiOutlineSparkles,
      'Photography': HiOutlineCamera,
      'Video': HiOutlineVideoCamera,
      'Studio': HiOutlineLightBulb,
    };
    const Icon = map[category] || HiOutlineStar;
    return <Icon />;
  } else {
    const map = {
      'Electronics': HiOutlineLightBulb,
      'Fragrance': HiOutlineSparkles,
    };
    const Icon = map[category] || HiOutlineCube;
    return <Icon />;
  }
}

export default function POSScreen({ showToast, parkedBills = [], onHoldBill, onDeleteParkedBill, addNotification }) {
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [showProductsTab, setShowProductsTab] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showParkedPanel, setShowParkedPanel] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('percent'); // 'percent' | 'fixed'
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [billNote, setBillNote] = useState('');

  // ── #8 Split Payment ──────────────────────────────────────
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitCash, setSplitCash] = useState('');
  const [splitCard, setSplitCard] = useState('');

  // ── #10 Cash tendered (for change calculation) ────────────
  const [cashTendered, setCashTendered] = useState('');

  // ── #6 Barcode Scanner ───────────────────────────────────
  const barcodeBuffer = useRef('');
  const barcodeTimer  = useRef(null);

  useEffect(() => {
    const handleBarcode = (e) => {
      // Ignore if user is typing in an input/textarea
      if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) return;
      if (e.key === 'Enter') {
        const code = barcodeBuffer.current.trim();
        barcodeBuffer.current = '';
        if (code.length >= 3) {
          const match = products.find(
            p => (p.barcode && p.barcode === code) ||
                 (p.sku    && p.sku    === code)
          );
          if (match) {
            addToCart(match);
            showToast(`✅ Scanned: ${match.name}`, 'success');
          } else {
            // Fall back to searching by code in product name
            const fuzzy = products.find(p =>
              (p.name || '').toLowerCase().includes(code.toLowerCase())
            );
            if (fuzzy) {
              addToCart(fuzzy);
              showToast(`✅ Scanned: ${fuzzy.name}`, 'success');
            } else {
              showToast(`❌ Barcode not found: ${code}`, 'error');
            }
          }
        }
        return;
      }
      if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
        clearTimeout(barcodeTimer.current);
        barcodeTimer.current = setTimeout(() => { barcodeBuffer.current = ''; }, 120);
      }
    };
    window.addEventListener('keydown', handleBarcode);
    return () => window.removeEventListener('keydown', handleBarcode);
  }, [products]);

  // Customer selection state
  const [custSearch, setCustSearch] = useState('');
  const [showCustDropdown, setShowCustDropdown] = useState(false);
  const [showAddCustModal, setShowAddCustModal] = useState(false);
  const [newCustForm, setNewCustForm] = useState({ name: '', phone: '', email: '' });

  // Receipt state
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState(null);

  // Real-time clock
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Settings state
  const [settings, setSettings] = useState({
    currency: 'LKR',
    tax_percentage: '0'
  });

  useEffect(() => { 
    // Initial load with a small delay to ensure DB is ready
    const timer = setTimeout(() => {
      loadData();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  async function loadData() {
    try {
      console.log('POS: Loading data...');
      
      // Load settings
      try {
        const data = await api.settings.getAll();
        if (data) setSettings(prev => ({ ...prev, ...data }));
      } catch (e) { console.error('POS: Failed settings load', e); }

      // Load products safely
      try {
        const prods = await api.products.getAll();
        if (Array.isArray(prods)) setProducts(prods);
        else console.warn('POS: Products API did not return an array');
      } catch (e) { console.error('POS: Failed products load', e); }

      // Load services safely
      try {
        const svcs = await api.services.getAll();
        if (Array.isArray(svcs)) setServices(svcs);
      } catch (e) { console.error('POS: Failed services load', e); }

      // Load customers safely
      try {
        const custs = await api.customers.getAll();
        if (Array.isArray(custs)) setCustomers(custs);
      } catch (e) { console.error('POS: Failed customers load', e); }

    } catch (err) { 
      console.error('POS: Critical load error:', err);
      showToast('Database connection issues. Retrying...', 'error');
    }
  }

  const formatPrice = (val) => `${settings.currency} ${Number(val).toLocaleString()}`;

  const [categories, setCategories] = useState([]);
  
  useEffect(() => { loadCategories(); }, []);

  async function loadCategories() {
    try { setCategories(await api.categories.getAll()); } catch (e) { console.error(e); }
  }

  // Categories list for tabs
  const categoryList = useMemo(() => {
    const list = categories.filter(c => c.type === (showProductsTab ? 'product' : 'service'));
    return ['All', ...list.map(c => c.name)];
  }, [categories, showProductsTab]);

  // Filtered items
  const filteredItems = useMemo(() => {
    let items = showProductsTab ? products : services;
    
    if (activeCategory !== 'All') {
      // Find the category object
      const catObj = categories.find(c => c.name === activeCategory && c.type === (showProductsTab ? 'product' : 'service'));
      if (catObj) {
        // Find all child category IDs if any
        const childIds = categories.filter(c => c.parent_id === catObj.id).map(c => c.id);
        const searchIds = [catObj.id, ...childIds];
        items = items.filter((i) => i.category === activeCategory || searchIds.includes(i.category_id));
      } else {
        items = items.filter((i) => i.category === activeCategory);
      }
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((i) => 
        (i.name || '').toLowerCase().includes(q) || 
        (i.category || '').toLowerCase().includes(q)
      );
    }
    return items;
  }, [products, services, showProductsTab, activeCategory, searchQuery, categories]);

  // Filtered customers for search
  const filteredCustomers = useMemo(() => {
    if (!custSearch) return customers.slice(0, 5);
    const q = custSearch.toLowerCase();
    return customers.filter((c) =>
      c.name.toLowerCase().includes(q) || (c.phone || '').includes(q)
    );
  }, [customers, custSearch]);

  async function handleQuickAddCustomer() {
    if (!newCustForm.name || !newCustForm.phone) {
      showToast('Name and phone are required', 'error');
      return;
    }
    try {
      const created = await api.customers.create(newCustForm);
      showToast('Customer created', 'success');
      setCustomers((prev) => [...prev, created]);
      setSelectedCustomer(created);
      setCustSearch('');
      setShowAddCustModal(false);
      setNewCustForm({ name: '', phone: '', email: '' });
    } catch {
      showToast('Failed to create customer', 'error');
    }
  }

  // ── Cart Operations ────────────────────────────────────────
  function addToCart(item) {
    const isService = !showProductsTab;
    setCart((prev) => {
      const existingIdx = prev.findIndex((c) => c.id === item.id && c.isService === isService);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], qty: updated[existingIdx].qty + 1 };
        return updated;
      }
      return [...prev, {
        id: item.id,
        productId: isService ? null : item.id,
        serviceId: isService ? item.id : null,
        name: item.name,
        price: item.price,
        qty: 1,
        isService,
        stock: item.stock || 999,
      }];
    });
  }

  function updateQty(index, delta) {
    setCart((prev) => {
      const updated = [...prev];
      const newQty = updated[index].qty + delta;
      if (newQty <= 0) return prev.filter((_, i) => i !== index);
      updated[index] = { ...updated[index], qty: newQty };
      return updated;
    });
  }

  function removeFromCart(index) {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }

  function clearCart() {
    setCart([]);
    setDiscount(0);
    setSelectedCustomer(null);
    setBillNote('');
  }

  // ── Totals ─────────────────────────────────────────────────
  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

    // Calculate discount amount based on type
    const calculatedDiscount = discountType === 'percent' 
      ? (subtotal * Number(discount || 0)) / 100
      : Number(discount || 0);

    const actualDiscount = Math.min(calculatedDiscount, subtotal);
    const taxableAmount = Math.max(0, subtotal - actualDiscount);
    const taxValue = (taxableAmount * Number(settings.tax_percentage || 0)) / 100;
    const total = taxableAmount + taxValue;

    return { subtotal, discountAmount: actualDiscount, taxValue, total };
  }, [cart, discount, discountType, settings.tax_percentage]);

  // ── Hold / Park Bill ───────────────────────────────────────
  function handleHoldBill() {
    if (cart.length === 0) { showToast('Cart is empty', 'error'); return; }
    const label = billNote.trim() || (selectedCustomer?.name) || `Bill #${Date.now().toString().slice(-4)}`;
    onHoldBill({
      label,
      cart: [...cart],
      customer: selectedCustomer,
      discount,
      note: billNote,
      heldAt: new Date().toLocaleTimeString(),
    });
    clearCart();
    showToast(`"${label}" saved — bill on hold`, 'info');
  }

  function handleResumeBill(parked) {
    if (cart.length > 0) {
      if (!confirm('Current cart will be replaced. Continue?')) return;
    }
    setCart(parked.cart);
    setSelectedCustomer(parked.customer);
    setDiscount(parked.discount || 0);
    setBillNote(parked.note || '');
    onDeleteParkedBill(parked.id);
    setShowParkedPanel(false);
    showToast(`Resumed "${parked.label}"`, 'success');
  }

  // ── Checkout ───────────────────────────────────────────────
  // Split payment validation helper
  const splitValid = useMemo(() => {
    if (!splitEnabled) return true;
    const cash = parseFloat(splitCash) || 0;
    const card = parseFloat(splitCard) || 0;
    return Math.abs((cash + card) - totals.total) < 0.01;
  }, [splitEnabled, splitCash, splitCard, totals.total]);

  // Change due
  const changeDue = useMemo(() => {
    if (paymentMethod !== 'cash' || splitEnabled) return 0;
    const tendered = parseFloat(cashTendered) || 0;
    return Math.max(0, tendered - totals.total);
  }, [cashTendered, totals.total, paymentMethod, splitEnabled]);

  async function handleCheckout() {
    if (cart.length === 0) return;
    if (splitEnabled && !splitValid) {
      showToast('Split amounts must equal the total', 'error'); return;
    }
    try {
      const sale = {
        customer_id: selectedCustomer?.id || null,
        items: cart.map((item) => ({
          productId: item.productId,
          serviceId: item.serviceId,
          name: item.name,
          qty: item.qty,
          price: item.price,
        })),
        subtotal: Math.round(totals.subtotal * 100) / 100,
        discount: Math.round(totals.discountAmount * 100) / 100,
        tax: Math.round(totals.taxValue * 100) / 100,
        total: Math.round(totals.total * 100) / 100,
        payment_method: splitEnabled ? 'split' : paymentMethod,
        split_cash: splitEnabled ? parseFloat(splitCash) || 0 : undefined,
        split_card: splitEnabled ? parseFloat(splitCard) || 0 : undefined,
        notes: billNote,
      };
      const result = await api.sales.create(sale);
      
      // Check for low stock or out of stock items in the cart
      cart.forEach(item => {
        if (!item.isService) {
          const remainingStock = item.stock - item.qty;
          if (remainingStock <= 0) {
            addNotification({
              title: 'OUT OF STOCK',
              message: `${item.name} has run out of stock. Immediate reorder required.`,
              type: 'critical'
            });
            showToast(`Critical: ${item.name} is out of stock!`, 'critical');
          } else if (remainingStock <= 5) {
            addNotification({
              title: 'Low Stock Alert',
              message: `${item.name} is running low (${remainingStock} left).`,
              type: 'warning'
            });
            showToast(`${item.name} stock is low!`, 'warning');
          }
        }
      });
      
      // Prepare for receipt
      setLastSale({
        ...sale,
        id: result.id,
        customer_name: selectedCustomer?.name || 'Walk-in Customer',
        created_at: new Date().toLocaleString()
      });

      showToast(`Sale completed! Total: ${formatPrice(totals.total)}`, 'success');
      clearCart();
      setShowCheckout(false);
      setShowReceipt(true);
      loadData();
    } catch (err) {
      showToast('Failed to process sale', 'error');
      console.error(err);
    }
  }

  return (
    <div className="pos-layout">
      {/* ── Left — Product Grid ─────────────────────────────── */}
      <div className="pos-products">
        {/* Top bar */}
        <div className="pos-topbar">
          <div className="pos-tabs">
            <button className={`pos-tab ${showProductsTab ? 'active' : ''}`}
              onClick={() => { setShowProductsTab(true); setActiveCategory('All'); }}>
              <HiOutlineTag /> Products
            </button>
            <button className={`pos-tab ${!showProductsTab ? 'active' : ''}`}
              onClick={() => { setShowProductsTab(false); setActiveCategory('All'); }}>
              <HiOutlineCreditCard /> Services
            </button>
          </div>

          <div className="pos-search-wrapper">
            <HiOutlineSearch className="pos-search-icon" />
            <input type="text" className="pos-search"
              placeholder={`Search ${showProductsTab ? 'products' : 'services'}...`}
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            {searchQuery && (
              <button className="pos-search-clear" onClick={() => setSearchQuery('')}>
                <HiOutlineX />
              </button>
            )}
          </div>

          <div className="pos-clock">
            <div className="clock-time">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="clock-date">
              {currentTime.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>

          <button className="btn btn-ghost btn-icon" onClick={loadData} title="Refresh Data" 
            style={{ marginLeft: 8 }}>
            <HiOutlineRefresh />
          </button>
        </div>

        {/* Categories */}
        <div className="pos-categories">
          {categoryList.map((cat) => (
            <button key={cat} className={`pos-cat-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}>{cat}</button>
          ))}
        </div>

        {/* Grid */}
        <div className="pos-grid">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item) => (
              <motion.button
                key={`${showProductsTab ? 'p' : 's'}-${item.id}`}
                className="pos-product-card"
                onClick={() => addToCart(item)}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                whileTap={{ scale: 0.95 }}
              >
                {/* Product image or emoji */}
                <div className="product-card-image">
                  {item.image ? (
                    <img 
                      src={`local-resource://${item.image}`} 
                      alt={item.name} 
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                    />
                  ) : null}
                  <div className="product-card-placeholder" style={{ display: item.image ? 'none' : 'flex' }}>
                    <CategoryIcon category={item.category} isService={!showProductsTab} />
                  </div>
                </div>
                <div className="product-card-name">{item.name}</div>
                <div className="product-card-meta">
                  <div className="product-card-price">{formatPrice(item.price)}</div>
                  {showProductsTab ? (
                    <span className={`product-card-stock ${(item.stock || 0) <= 5 ? 'low' : ''}`}>
                      {item.stock} in stock
                    </span>
                  ) : (
                    <span className="product-card-duration">{item.duration_minutes} min</span>
                  )}
                </div>
              </motion.button>
            ))}
          </AnimatePresence>

          {filteredItems.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <div className="empty-state-icon"><HiOutlineCube /></div>
              <div className="empty-state-title">No items found</div>
              <div className="empty-state-text">Try adjusting your search or category</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right — Cart ────────────────────────────────────── */}
      <div className="pos-cart">
        <div className="cart-header">
          <div className="cart-title">
            <HiOutlineShoppingCart />
            <span>Current Order</span>
          </div>
          <div className="cart-header-actions">
            {/* Parked bills button */}
            <button
              className={`btn btn-ghost btn-sm pos-parked-btn ${parkedBills.length > 0 ? 'has-parked' : ''}`}
              onClick={() => setShowParkedPanel(true)}
              title="View held bills"
            >
              <HiOutlineClipboardList />
              {parkedBills.length > 0 && (
                <span className="parked-badge">{parkedBills.length}</span>
              )}
            </button>
            {cart.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={clearCart}>Clear</button>
            )}
          </div>
        </div>

        {/* Customer search & select */}
        <div className="cart-customer-section">
          <div className="customer-search-box">
            <div className="cust-input-wrapper">
              <HiOutlineUser className="cust-icon" />
              <input
                className="input cust-search-input"
                placeholder="Search name or phone..."
                value={selectedCustomer ? selectedCustomer.name : custSearch}
                onChange={(e) => {
                  setCustSearch(e.target.value);
                  setSelectedCustomer(null);
                  setShowCustDropdown(true);
                }}
                onFocus={() => setShowCustDropdown(true)}
              />
              {selectedCustomer && (
                <button className="cust-clear" onClick={() => { setSelectedCustomer(null); setCustSearch(''); }}>
                  <HiOutlineX />
                </button>
              )}
            </div>
            
            <button className="btn btn-ghost btn-icon btn-sm add-cust-quick" 
              onClick={() => setShowAddCustModal(true)} title="Add New Customer">
              <HiOutlineUserAdd />
            </button>

            {/* Dropdown */}
            <AnimatePresence>
              {showCustDropdown && (
                <motion.div className="cust-dropdown"
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="cust-dropdown-header">
                    <span>{filteredCustomers.length} results</span>
                    <button onClick={() => setShowCustDropdown(false)}><HiOutlineX /></button>
                  </div>
                  <div className="cust-dropdown-list">
                    {filteredCustomers.map((c) => (
                      <div key={c.id} className="cust-dropdown-item" onClick={() => {
                        setSelectedCustomer(c);
                        setShowCustDropdown(false);
                        setCustSearch('');
                      }}>
                        <div className="cust-item-name">{c.name}</div>
                        <div className="cust-item-phone">{c.phone || 'No phone'}</div>
                      </div>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <div className="cust-no-results">
                        No customer found. <span onClick={() => setShowAddCustModal(true)}>Add new?</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Cart Items */}
        <div className="cart-items">
          <AnimatePresence>
            {cart.map((item, index) => (
              <motion.div
                key={`${item.isService ? 's' : 'p'}-${item.id}-${index}`}
                className="cart-item"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="cart-item-info">
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-price">{formatPrice(item.price)} each</div>
                </div>
                <div className="cart-item-controls">
                  <button className="qty-btn" onClick={() => updateQty(index, -1)}><HiOutlineMinus /></button>
                  <span className="qty-value">{item.qty}</span>
                  <button className="qty-btn" onClick={() => updateQty(index, 1)}><HiOutlinePlus /></button>
                  <button className="qty-btn remove" onClick={() => removeFromCart(index)}><HiOutlineTrash /></button>
                </div>
                <span className="pos-item-price">{formatPrice(item.price * item.qty)}</span>
              </motion.div>
            ))}
          </AnimatePresence>

          {cart.length === 0 && (
            <div className="cart-empty">
              <div className="cart-empty-icon"><HiOutlineShoppingCart /></div>
              <p>Cart is empty</p>
              <span>Add items from the left panel</span>
            </div>
          )}
        </div>

        {/* Cart Footer */}
        {cart.length > 0 && (
          <div className="cart-footer">
            {/* Bill note */}
            <div className="cart-note">
              <input className="input" placeholder="Bill note / customer name..."
                value={billNote} onChange={(e) => setBillNote(e.target.value)} />
            </div>

            {/* Discount */}
            <div className="cart-discount">
              <div className="discount-controls">
                <span className="discount-label">Discount</span>
                <div className="discount-toggle">
                  <button 
                    className={`toggle-btn ${discountType === 'percent' ? 'active' : ''}`}
                    onClick={() => { setDiscountType('percent'); setDiscount(0); }}
                  >
                    %
                  </button>
                  <button 
                    className={`toggle-btn ${discountType === 'fixed' ? 'active' : ''}`}
                    onClick={() => { setDiscountType('fixed'); setDiscount(0); }}
                  >
                    {settings.currency}
                  </button>
                </div>
              </div>
              <input 
                type="number" 
                className="input discount-input"
                placeholder="0"
                value={discount || ''} 
                min={0}
                max={discountType === 'percent' ? 100 : totals.subtotal}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (discountType === 'percent') {
                    setDiscount(Math.min(100, Math.max(0, val)));
                  } else {
                    setDiscount(Math.max(0, val));
                  }
                }} 
              />
            </div>

            <div className="cart-totals">
              <div className="cart-total-row"><span>Subtotal</span><span>{formatPrice(totals.subtotal)}</span></div>
              {totals.discountAmount > 0 && (
                <div className="cart-total-row discount">
                  <span>Discount {discountType === 'percent' ? `(${discount}%)` : ''}</span>
                  <span>-{formatPrice(totals.discountAmount)}</span>
                </div>
              )}
              <div className="cart-total-row">
                <span className="pos-summary-label">Tax ({settings.tax_percentage}%)</span>
                <span>{formatPrice(totals.taxValue)}</span>
              </div>
              <div className="cart-total-row grand"><span>Total</span><span>{formatPrice(totals.total)}</span></div>
            </div>

            {/* Action Buttons */}
            <div className="cart-actions">
              <button className="btn btn-secondary hold-btn" onClick={handleHoldBill} title="Hold bill & keep shop running">
                <HiOutlinePause /> Hold Bill
              </button>
              <button className="btn btn-primary checkout-btn" onClick={() => setShowCheckout(true)}>
                <HiOutlineCreditCard /> {formatPrice(totals.total)}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Parked Bills Panel ──────────────────────────────── */}
      <AnimatePresence>
        {showParkedPanel && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowParkedPanel(false)}>
            <motion.div className="modal parked-modal"
              initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 60 }}
              onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">
                  <HiOutlineClipboardList /> Held Bills
                </h2>
                <button className="modal-close" onClick={() => setShowParkedPanel(false)}><HiOutlineX /></button>
              </div>

              {parkedBills.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <div className="empty-state-icon">🧾</div>
                  <div className="empty-state-title">No held bills</div>
                  <div className="empty-state-text">Press "Hold Bill" to pause a sale and come back later</div>
                </div>
              ) : (
                <div className="parked-list">
                  {parkedBills.map((bill) => {
                    const billTotal = bill.cart.reduce((s, i) => s + i.price * i.qty, 0);
                    return (
                      <motion.div key={bill.id} className="parked-item"
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="parked-item-info">
                          <div className="parked-item-name">{bill.label}</div>
                          <div className="parked-item-meta">
                            <span><HiOutlineClock /> {bill.heldAt}</span>
                            <span>{bill.cart.length} item{bill.cart.length !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="parked-item-items">
                            {bill.cart.slice(0, 3).map((c, i) => (
                              <span key={i} className="badge badge-neutral">{c.name} ×{c.qty}</span>
                            ))}
                            {bill.cart.length > 3 && <span className="badge badge-neutral">+{bill.cart.length - 3} more</span>}
                          </div>
                        </div>
                        <div className="parked-item-right">
                          <div className="parked-item-total">{formatPrice(billTotal)}</div>
                          <div className="parked-item-actions">
                            <button className="btn btn-primary btn-sm" onClick={() => handleResumeBill(bill)}>
                              <HiOutlinePlay /> Resume
                            </button>
                            <button className="btn btn-danger btn-icon btn-sm"
                              onClick={() => { onDeleteParkedBill(bill.id); showToast('Bill discarded'); }}>
                              <HiOutlineTrash />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Checkout Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {showCheckout && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowCheckout(false)}>
            <motion.div className="modal checkout-modal"
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Complete Sale</h2>
                <button className="modal-close" onClick={() => setShowCheckout(false)}><HiOutlineX /></button>
              </div>

              <div className="checkout-summary">
                <div className="checkout-total-display">
                  <span className="checkout-total-label">Total Amount</span>
                  <span className="checkout-total-value">{formatPrice(totals.total)}</span>
                </div>
                {selectedCustomer && (
                  <div className="checkout-customer-info">
                    <span>Customer:</span><strong>{selectedCustomer.name}</strong>
                  </div>
                )}
                <div className="checkout-items-count">
                  {cart.reduce((sum, item) => sum + item.qty, 0)} items in order
                </div>
              </div>

              <div className="checkout-payment">
                <div className="checkout-payment-header">
                  <p className="checkout-section-label">Payment Method</p>
                  <button
                    className={`split-toggle-btn ${splitEnabled ? 'active' : ''}`}
                    onClick={() => { setSplitEnabled(v => !v); setSplitCash(''); setSplitCard(''); }}
                  >
                    ✂️ Split Payment
                  </button>
                </div>

                {/* ── #8 Split Payment UI ── */}
                {splitEnabled ? (
                  <div className="split-payment-grid">
                    <div className="split-field">
                      <label>💵 Cash Amount</label>
                      <input
                        className="input"
                        type="number"
                        placeholder="0.00"
                        value={splitCash}
                        onChange={e => setSplitCash(e.target.value)}
                        min={0}
                      />
                    </div>
                    <div className="split-field">
                      <label>💳 Card Amount</label>
                      <input
                        className="input"
                        type="number"
                        placeholder="0.00"
                        value={splitCard}
                        onChange={e => setSplitCard(e.target.value)}
                        min={0}
                      />
                    </div>
                    <div className={`split-status ${splitValid ? 'ok' : 'err'}`}>
                      {splitValid
                        ? `✅ Split confirmed: ${formatPrice((parseFloat(splitCash)||0))} cash + ${formatPrice((parseFloat(splitCard)||0))} card`
                        : `⚠️ Amounts must equal ${formatPrice(totals.total)}`
                      }
                    </div>
                  </div>
                ) : (
                  <div className="payment-methods">
                    <button className={`payment-method-btn ${paymentMethod === 'cash' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('cash')}>
                      <HiOutlineCash className="payment-icon" /><span>Cash</span>
                    </button>
                    <button className={`payment-method-btn ${paymentMethod === 'card' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('card')}>
                      <HiOutlineCreditCard className="payment-icon" /><span>Card</span>
                    </button>
                  </div>
                )}

                {/* ── #10 Quick Cash Denominations ── */}
                {paymentMethod === 'cash' && !splitEnabled && (
                  <div className="quick-cash-section">
                    <p className="quick-cash-label">Quick Cash</p>
                    <div className="quick-cash-grid">
                      {[100, 200, 500, 1000, 2000, 5000].map(denom => (
                        <button
                          key={denom}
                          className={`quick-cash-btn ${parseFloat(cashTendered) === denom ? 'active' : ''}`}
                          onClick={() => setCashTendered(String(denom))}
                        >
                          {denom.toLocaleString()}
                        </button>
                      ))}
                    </div>
                    <div className="cash-tendered-row">
                      <input
                        className="input"
                        type="number"
                        placeholder={`Amount tendered (${settings.currency})`}
                        value={cashTendered}
                        onChange={e => setCashTendered(e.target.value)}
                        min={totals.total}
                      />
                      {changeDue > 0 && (
                        <div className="change-due">
                          Change: <strong>{formatPrice(changeDue)}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowCheckout(false)}>Cancel</button>
                <button className="btn btn-primary btn-lg" onClick={handleCheckout}>
                  <HiOutlineCheck /> Confirm Payment
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Quick Add Customer Modal ────────────────────────── */}
      <AnimatePresence>
        {showAddCustModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowAddCustModal(false)}>
            <motion.div className="modal" style={{ maxWidth: 400 }}
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">New Customer</h2>
                <button className="modal-close" onClick={() => setShowAddCustModal(false)}><HiOutlineX /></button>
              </div>
              <div className="modal-body">
                <div className="input-group">
                  <label className="input-label">Full Name *</label>
                  <input className="input" placeholder="e.g. John Doe" autoFocus
                    value={newCustForm.name} onChange={(e) => setNewCustForm({ ...newCustForm, name: e.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">Mobile Number *</label>
                  <input className="input" placeholder="e.g. 555-0101"
                    value={newCustForm.phone} onChange={(e) => setNewCustForm({ ...newCustForm, phone: e.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">Email (Optional)</label>
                  <input className="input" placeholder="john@example.com"
                    value={newCustForm.email} onChange={(e) => setNewCustForm({ ...newCustForm, email: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowAddCustModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleQuickAddCustomer}>Create & Select</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Receipt Modal ────────────────────────────────────── */}
      <ReceiptModal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        saleData={lastSale}
      />
    </div>
  );
}
