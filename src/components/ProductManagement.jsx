import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineSearch,
  HiOutlineX,
  HiOutlineCube,
  HiOutlinePhotograph,
  HiOutlineClock,
  HiOutlineScissors,
  HiOutlineSparkles,
  HiOutlineCamera,
  HiOutlineVideoCamera,
  HiOutlineLightBulb,
  HiOutlineDatabase,
  HiOutlineExclamation,
  HiOutlineCash,
  HiOutlineStar,
  HiOutlineTag,
} from 'react-icons/hi';
import './ProductManagement.css';

const api = (window.api && window.api.products) ? window.api : {
  products: {
    getAll: async () => [],
    create: async (p) => ({ id: Date.now(), ...p }),
    update: async (id, p) => ({ id, ...p }),
    delete: async () => ({ success: true }),
  },
  services: {
    getAll: async () => [],
    create: async (s) => ({ id: Date.now(), ...s }),
    update: async (id, s) => ({ id, ...s }),
    delete: async () => ({ success: true }),
  },
  settings: {
    getAll: async () => ({}),
  },
  dialog: { openImage: async () => null },
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

const emptyProduct = {
  name: '', category: 'General', price: '', cost: '',
  stock: '', sku: '', is_service: 0, duration_minutes: 0, image: '',
};

const emptyService = {
  name: '', category: 'Hair', price: '', duration_minutes: 60, description: '',
};

export default function ProductManagement({ showToast }) {
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'services' | 'categories'
  const [settings, setSettings] = useState({ currency: 'LKR' });

  // Products state
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState({ ...emptyProduct });

  // Services state
  const [services, setServices] = useState([]);
  const [svcSearch, setSvcSearch] = useState('');
  const [svcFilter, setSvcFilter] = useState('All');
  const [showSvcModal, setShowSvcModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [svcForm, setSvcForm] = useState({ ...emptyService });

  // Categories state
  const [categories, setCategories] = useState([]);
  const [catType, setCatType] = useState('product'); // 'product' | 'service'
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [catForm, setCatForm] = useState({ name: '', parent_id: '', type: 'product' });

  useEffect(() => { loadProducts(); loadServices(); loadSettings(); loadCategories(); }, []);

  async function loadSettings() {
    try {
      const data = await api.settings.getAll();
      if (data) setSettings(prev => ({ ...prev, ...data }));
    } catch (err) { console.error(err); }
  }

  async function loadCategories() {
    try {
      const data = await api.categories.getAll();
      setCategories(data);
    } catch (err) { console.error(err); }
  }

  async function loadProducts() {
    try { setProducts(await api.products.getAll()); } catch (e) { console.error(e); }
  }
  async function loadServices() {
    try { setServices(await api.services.getAll()); } catch (e) { console.error(e); }
  }

  const formatPrice = (val) => `${settings.currency} ${Number(val).toLocaleString()}`;

  // ── Product image picker ───────────────────────────────────
  async function pickImage() {
    try {
      const path = await api.dialog.openImage();
      if (path) setForm((f) => ({ ...f, image: path }));
    } catch (e) { showToast('Could not open file picker', 'error'); }
  }

  // ── Product CRUD ───────────────────────────────────────────
  const productCategories = ['All', ...new Set(products.map((p) => p.category))];
  const filteredProducts = products.filter((p) => {
    const matchSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = filterCategory === 'All' || p.category === filterCategory;
    return matchSearch && matchCat;
  });

  function openAddProduct() { setEditingProduct(null); setForm({ ...emptyProduct }); setShowModal(true); }
  function openEditProduct(p) {
    setEditingProduct(p);
    setForm({ name: p.name, category: p.category, category_id: p.category_id || '', price: p.price, cost: p.cost || '',
      stock: p.stock, sku: p.sku || '', is_service: p.is_service || 0,
      duration_minutes: p.duration_minutes || 0, image: p.image || '' });
    setShowModal(true);
  }
  async function handleSaveProduct() {
    if (!form.name || !form.price) { showToast('Name and price are required', 'error'); return; }
    try {
      const data = { ...form, price: Number(form.price), cost: Number(form.cost) || 0,
        stock: Number(form.stock) || 0, duration_minutes: Number(form.duration_minutes) || 0 };
      if (editingProduct) await api.products.update(editingProduct.id, data);
      else await api.products.create(data);
      showToast(editingProduct ? 'Product updated' : 'Product added');
      setShowModal(false); loadProducts();
    } catch { showToast('Failed to save product', 'error'); }
  }
  async function handleDeleteProduct(id) {
    if (!confirm('Delete this product?')) return;
    try { await api.products.delete(id); showToast('Product deleted'); loadProducts(); }
    catch { showToast('Failed to delete', 'error'); }
  }

  // ── Service CRUD ───────────────────────────────────────────
  const serviceCategories = ['All', ...new Set(services.map((s) => s.category))];
  const filteredServices = services.filter((s) => {
    const matchSearch = !svcSearch || s.name.toLowerCase().includes(svcSearch.toLowerCase());
    const matchCat = svcFilter === 'All' || s.category === svcFilter;
    return matchSearch && matchCat;
  });

  function openAddService() { setEditingService(null); setSvcForm({ ...emptyService }); setShowSvcModal(true); }
  function openEditService(s) {
    setEditingService(s);
    setSvcForm({ name: s.name, category: s.category, category_id: s.category_id || '', price: s.price, duration_minutes: s.duration_minutes, description: s.description || '' });
    setShowSvcModal(true);
  }
  async function handleSaveService() {
    if (!svcForm.name || !svcForm.price) { showToast('Name and price are required', 'error'); return; }
    try {
      const data = { ...svcForm, price: Number(svcForm.price), duration_minutes: Number(svcForm.duration_minutes) || 60 };
      if (editingService) await api.services.update(editingService.id, data);
      else await api.services.create(data);
      showToast(editingService ? 'Service updated' : 'Service added');
      setShowSvcModal(false); loadServices();
    } catch { showToast('Failed to save service', 'error'); }
  }
  async function handleDeleteService(id) {
    if (!confirm('Delete this service?')) return;
    try { await api.services.delete(id); showToast('Service deleted'); loadServices(); }
    catch { showToast('Failed to delete', 'error'); }
  }

  async function handleSaveCategory() {
    if (!catForm.name) { showToast('Name is required', 'error'); return; }
    try {
      if (editingCat) {
        await api.categories.update(editingCat.id, catForm);
        showToast('Category updated');
      } else {
        await api.categories.create(catForm);
        showToast('Category created');
      }
      setShowCatModal(false); loadCategories();
    } catch { showToast('Failed to save category', 'error'); }
  }

  async function handleDeleteCategory(id) {
    if (!confirm('Delete category? Products will be unlinked.')) return;
    try { await api.categories.delete(id); showToast('Category deleted'); loadCategories(); }
    catch { showToast('Failed to delete', 'error'); }
  }

  const renderCategoryTree = (nodes, level = 0) => {
    return nodes.map(node => (
      <div key={node.id} className="cat-tree-node" style={{ marginLeft: level * 24 }}>
        <div className="cat-node-content">
          <div className="cat-node-info">
            <span className="cat-node-name">{node.name}</span>
            {level === 0 && <span className="badge badge-secondary">{node.type}</span>}
          </div>
          <div className="cat-node-actions">
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditingCat(node); setCatForm({ ...node }); setShowCatModal(true); }}>
              <HiOutlinePencil />
            </button>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDeleteCategory(node.id)}>
              <HiOutlineTrash />
            </button>
          </div>
        </div>
        {node.children && renderCategoryTree(node.children, level + 1)}
      </div>
    ));
  };
    <div className="pm-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory & Services</h1>
          <p className="page-subtitle">Manage products, stock, and services</p>
        </div>
        {activeTab === 'products' && (
          <button className="btn btn-primary" onClick={openAddProduct}>
            <HiOutlinePlus /> Add Product
          </button>
        )}
        {activeTab === 'services' && (
          <button className="btn btn-primary" onClick={openAddService}>
            <HiOutlinePlus /> Add Service
          </button>
        )}
        {activeTab === 'categories' && (
          <button className="btn btn-primary" onClick={() => { setEditingCat(null); setCatForm({ ...catForm, name: '', parent_id: '', type: catType }); setShowCatModal(true); }}>
            <HiOutlinePlus /> Add Category
          </button>
        )}
      </div>

      {/* Tab Switch */}
      <div className="pm-tabs-wrapper">
        <div className="pm-tabs">
          <button className={`pm-tab ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
            <HiOutlineCube /> Products
            <span className="pm-tab-count">{products.length}</span>
          </button>
          <button className={`pm-tab ${activeTab === 'services' ? 'active' : ''}`} onClick={() => setActiveTab('services')}>
            <HiOutlineStar /> Services
            <span className="pm-tab-count">{services.length}</span>
          </button>
          <button className={`pm-tab ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => setActiveTab('categories')}>
            <HiOutlineTag /> Categories
            <span className="pm-tab-count">{categories.length}</span>
          </button>
        </div>
      </div>

      {/* ── PRODUCTS TAB ──────────────────────────────────────── */}
      {activeTab === 'products' && (
        <>
          {/* Stats */}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-icon orange"><HiOutlineCube /></div>
              <div className="stat-info">
                <div className="stat-value">{products.length}</div>
                <div className="stat-label">Total Products</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green"><HiOutlineDatabase /></div>
              <div className="stat-info">
                <div className="stat-value">{products.reduce((s, p) => s + (p.stock || 0), 0)}</div>
                <div className="stat-label">Total Stock</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon red"><HiOutlineExclamation /></div>
              <div className="stat-info">
                <div className="stat-value">{products.filter((p) => (p.stock || 0) <= 5).length}</div>
                <div className="stat-label">Low Stock</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon blue"><HiOutlineCash /></div>
              <div className="stat-info">
                <div className="stat-value">
                  {formatPrice(products.reduce((s, p) => s + (p.price || 0) * (p.stock || 0), 0))}
                </div>
                <div className="stat-label">Inventory Value</div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="pm-filters">
            <div className="pos-search-wrapper" style={{ maxWidth: 300 }}>
              <HiOutlineSearch className="pos-search-icon" />
              <input type="text" className="pos-search" placeholder="Search products..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="pm-category-filter">
              {productCategories.map((cat) => (
                <button key={cat} className={`pos-cat-btn ${filterCategory === cat ? 'active' : ''}`}
                  onClick={() => setFilterCategory(cat)}>{cat}</button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="pm-product-grid">
            {filteredProducts.map((product) => (
              <motion.div key={product.id} className="pm-product-card"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                {/* Image */}
                <div className="pm-product-card-image">
                  {product.image ? (
                    <img 
                      src={`local-resource://${product.image}`} 
                      alt={product.name}
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                    />
                  ) : null}
                  <div className="pm-product-card-placeholder" style={{ display: product.image ? 'none' : 'flex' }}>
                    <CategoryIcon category={product.category} isService={false} />
                  </div>
                  {(product.stock || 0) <= 5 && (
                    <span className="pm-low-badge">Low Stock</span>
                  )}
                </div>
                {/* Info */}
                <div className="pm-product-card-info">
                  <div className="pm-product-card-name">{product.name}</div>
                  <div className="pm-product-card-cat">{product.category}</div>
                  <div className="pm-product-card-footer">
                    <span className="pm-product-card-price">{formatPrice(product.price)}</span>
                    <span className={`badge ${(product.stock || 0) <= 5 ? 'badge-danger' : 'badge-success'}`}>
                      {product.stock || 0} left
                    </span>
                  </div>
                  {product.sku && <div className="pm-product-card-sku">{product.sku}</div>}
                </div>
                {/* Actions */}
                <div className="pm-card-actions">
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditProduct(product)}>
                    <HiOutlinePencil />
                  </button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDeleteProduct(product.id)}>
                    <HiOutlineTrash />
                  </button>
                </div>
              </motion.div>
            ))}
            {filteredProducts.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <div className="empty-state-icon"><HiOutlineCube /></div>
              <div className="empty-state-title">No products found</div>
              <div className="empty-state-text">Try adjusting your search or add a new product</div>
            </div>
          )}
          </div>
        </>
      )}

      {/* ── SERVICES TAB ──────────────────────────────────────── */}
      {activeTab === 'services' && (
        <>
          {/* Stats */}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-icon orange"><HiOutlineStar /></div>
              <div className="stat-info">
                <div className="stat-value">{services.length}</div>
                <div className="stat-label">Total Services</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">💰</div>
              <div className="stat-info">
                <div className="stat-value">
                  {services.length > 0 ? formatPrice(services.reduce((s, v) => s + v.price, 0) / services.length) : 0}
                </div>
                <div className="stat-label">Avg. Price</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon blue"><HiOutlineClock /></div>
              <div className="stat-info">
                <div className="stat-value">
                  {services.length > 0 ? Math.round(services.reduce((s, v) => s + (v.duration_minutes || 0), 0) / services.length) : 0} min
                </div>
                <div className="stat-label">Avg. Duration</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon red">🗂️</div>
              <div className="stat-info">
                <div className="stat-value">{new Set(services.map((s) => s.category)).size}</div>
                <div className="stat-label">Categories</div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="pm-filters">
            <div className="pos-search-wrapper" style={{ maxWidth: 300 }}>
              <HiOutlineSearch className="pos-search-icon" />
              <input type="text" className="pos-search" placeholder="Search services..."
                value={svcSearch} onChange={(e) => setSvcSearch(e.target.value)} />
            </div>
            <div className="pm-category-filter">
              {serviceCategories.map((cat) => (
                <button key={cat} className={`pos-cat-btn ${svcFilter === cat ? 'active' : ''}`}
                  onClick={() => setSvcFilter(cat)}>{cat}</button>
              ))}
            </div>
          </div>

          {/* Services Table */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Category</th>
                  <th>Duration</th>
                  <th>Price</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.map((svc) => (
                  <tr key={svc.id}>
                    <td>
                      <div className="pm-product-name">
                        <span className="pm-product-icon">
                          <CategoryIcon category={svc.category} isService={true} />
                        </span>
                        {svc.name}
                      </div>
                    </td>
                    <td><span className="badge badge-primary">{svc.category}</span></td>
                    <td>
                      <span className="pm-duration">
                        <HiOutlineClock /> {svc.duration_minutes} min
                      </span>
                    </td>
                    <td className="pm-price">{formatPrice(svc.price)}</td>
                    <td className="pm-desc">{svc.description || '—'}</td>
                    <td>
                      <div className="pm-actions">
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditService(svc)}>
                          <HiOutlinePencil />
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDeleteService(svc.id)}>
                          <HiOutlineTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredServices.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><HiOutlineStar /></div>
                    <div className="empty-state-title">No services found</div>
                  </div>
                </td>
              </tr>
            )}
          </div>
        </>
      )}

      {/* ── Categories View ──────────────────────────────────────── */}
      {activeTab === 'categories' && (
        <motion.div key="categories" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
          <div className="pm-categories-view">
            <div className="pm-cat-sidebar">
              <div className="pm-tabs mini">
                <button className={`pm-tab ${catType === 'product' ? 'active' : ''}`} onClick={() => setCatType('product')}>Products</button>
                <button className={`pm-tab ${catType === 'service' ? 'active' : ''}`} onClick={() => setCatType('service')}>Services</button>
              </div>
            </div>
            <div className="pm-cat-main">
              <div className="cat-tree-container">
                {renderCategoryTree(
                  (() => {
                    const list = categories.filter(c => c.type === catType);
                    const roots = list.filter(c => !c.parent_id);
                    const build = (p) => ({ ...p, children: list.filter(c => c.parent_id === p.id).map(build) });
                    return roots.map(build);
                  })()
                )}
                {categories.filter(c => c.type === catType).length === 0 && (
                   <div className="empty-state">
                     <div className="empty-state-icon"><HiOutlineTag /></div>
                     <div className="empty-state-title">No categories yet</div>
                     <p className="empty-state-text">Add your first category to start organizing items.</p>
                   </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Product Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}>
            <motion.div className="modal" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
                <button className="modal-close" onClick={() => setShowModal(false)}><HiOutlineX /></button>
              </div>

              <div className="modal-body">
                {/* Image picker */}
                <div className="pm-image-picker">
                  <div className="pm-image-preview">
                    {form.image ? (
                      <img src={`local-resource://${form.image}`} alt="Product" />
                    ) : (
                      <div className="pm-image-placeholder">
                        <HiOutlinePhotograph />
                        <span>No image</span>
                      </div>
                    )}
                  </div>
                  <div className="pm-image-actions">
                    <button className="btn btn-secondary btn-sm" onClick={pickImage}>
                      <HiOutlinePhotograph /> Choose Image
                    </button>
                    {form.image && (
                      <button className="btn btn-ghost btn-sm" onClick={() => setForm({ ...form, image: '' })}>
                        Remove
                      </button>
                    )}
                    <p className="pm-image-hint">Recommended: square image 200×200px+</p>
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Product Name *</label>
                  <input className="input" placeholder="Enter product name"
                    value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="input-group">
                    <label className="input-label">Category</label>
                    <select className="input" value={form.category_id || ''}
                      onChange={(e) => {
                        const opt = e.target.selectedOptions[0];
                        setForm({ ...form, category_id: e.target.value || null, category: opt.text });
                      }}>
                      <option value="">No Category</option>
                      {categories.filter(c => c.type === 'product').map(c => (
                        <option key={c.id} value={c.id}>
                          {c.parent_id ? `— ${c.name}` : c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">SKU</label>
                    <input className="input" placeholder="e.g. HC-001"
                      value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div className="input-group">
                    <label className="input-label">Price *</label>
                    <input className="input" type="number" step="0.01" placeholder="0.00"
                      value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Cost</label>
                    <input className="input" type="number" step="0.01" placeholder="0.00"
                      value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Stock</label>
                    <input className="input" type="number" placeholder="0"
                      value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSaveProduct}>
                  {editingProduct ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Service Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {showSvcModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowSvcModal(false)}>
            <motion.div className="modal" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">{editingService ? 'Edit Service' : 'Add Service'}</h2>
                <button className="modal-close" onClick={() => setShowSvcModal(false)}><HiOutlineX /></button>
              </div>

              <div className="modal-body">
                <div className="input-group">
                  <label className="input-label">Service Name *</label>
                  <input className="input" placeholder="e.g. Haircut - Premium"
                    value={svcForm.name} onChange={(e) => setSvcForm({ ...svcForm, name: e.target.value })} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="input-group">
                    <label className="input-label">Category</label>
                    <select className="input" value={svcForm.category_id || ''}
                      onChange={(e) => {
                        const opt = e.target.selectedOptions[0];
                        setSvcForm({ ...svcForm, category_id: e.target.value || null, category: opt.text });
                      }}>
                      <option value="">No Category</option>
                      {categories.filter(c => c.type === 'service').map(c => (
                        <option key={c.id} value={c.id}>
                          {c.parent_id ? `— ${c.name}` : c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Price *</label>
                    <input className="input" type="number" step="0.01" placeholder="0.00"
                      value={svcForm.price} onChange={(e) => setSvcForm({ ...svcForm, price: e.target.value })} />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Duration (minutes)</label>
                  <input className="input" type="number" placeholder="60"
                    value={svcForm.duration_minutes} onChange={(e) => setSvcForm({ ...svcForm, duration_minutes: e.target.value })} />
                </div>

                <div className="input-group">
                  <label className="input-label">Description</label>
                  <textarea className="input" placeholder="Service description..."
                    value={svcForm.description} onChange={(e) => setSvcForm({ ...svcForm, description: e.target.value })} />
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowSvcModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSaveService}>
                  {editingService ? 'Save Changes' : 'Add Service'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
      {/* ── Category Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {showCatModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowCatModal(false)}>
            <motion.div className="modal" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">{editingCat ? 'Edit Category' : 'Add Category'}</h2>
                <button className="modal-close" onClick={() => setShowCatModal(false)}><HiOutlineX /></button>
              </div>

              <div className="modal-body">
                <div className="input-group">
                  <label className="input-label">Category Name *</label>
                  <input className="input" placeholder="e.g. Skin Care, Hair Color"
                    value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} />
                </div>

                <div className="input-group">
                  <label className="input-label">Parent Category (Optional)</label>
                  <select className="input" value={catForm.parent_id || ''} 
                    onChange={(e) => setCatForm({ ...catForm, parent_id: e.target.value || null })}>
                    <option value="">Top Level (None)</option>
                    {categories
                      .filter(c => c.type === catForm.type && c.id !== editingCat?.id && !c.parent_id)
                      .map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                    }
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">Sort Order</label>
                  <input type="number" className="input"
                    value={catForm.sort_order} onChange={(e) => setCatForm({ ...catForm, sort_order: Number(e.target.value) })} />
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowCatModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSaveCategory}>
                  {editingCat ? 'Save Changes' : 'Add Category'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getProductEmoji(category) {
  const map = { 
    'Hair Care': '💇', 'Skin Care': '🧴', 'Nails': '💅', 
    'Makeup': '💄', 'Fragrance': '🌸', 'Body Care': '🧼',
    'Accessories': '🔌', 'Decor': '🖼️' 
  };
  return map[category] || '📦';
}
function getServiceEmoji(category) {
  const map = { 
    'Hair': '✂️', 'Skin': '✨', 'Nails': '💅', 
    'Makeup': '💄', 'Beauty': '🌟',
    'Photography': '📷', 'Video': '🎥', 'Studio': '🔦'
  };
  return map[category] || '⭐';
}
