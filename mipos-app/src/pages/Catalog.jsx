import { useState, useEffect, useRef } from 'react';
import TimePicker from '../components/ui/TimePicker';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCountry } from '../context/CountryContext';
import './Catalog.css';

const DAY_NAMES  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

function formatDays(days) {
  if (!days || days.length === 0) return null;
  if (days.length === 7) return 'Todos los días';
  const sorted = [...days].sort((a,b) => (a===0?7:a) - (b===0?7:b));
  const orderArr = sorted.map(d => d === 0 ? 7 : d);
  const isConsec = orderArr.every((d,i) => i === 0 || d === orderArr[i-1]+1);
  if (isConsec && sorted.length > 1) return `${DAY_NAMES[sorted[0]]} a ${DAY_NAMES[sorted[sorted.length-1]]}`;
  return sorted.map(d => DAY_NAMES[d]).join(', ');
}

function getNextOpenTime(bh) {
  if (!bh?.opening || !bh?.closing) return null;
  const days = bh.days?.length ? bh.days : [1,2,3,4,5,6];
  const now = new Date();
  const curDay = now.getDay();
  const curMin = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = bh.opening.split(':').map(Number);
  if (days.includes(curDay) && curMin < oh * 60 + om) {
    return { when: 'hoy', time: bh.opening };
  }
  for (let i = 1; i <= 7; i++) {
    const d = (curDay + i) % 7;
    if (days.includes(d)) {
      return { when: i === 1 ? 'mañana' : `el ${DAY_NAMES[d]}`, time: bh.opening };
    }
  }
  return null;
}

function getStoreStatus(bh) {
  if (!bh?.opening || !bh?.closing) return null;
  const now = new Date();
  const curDay = now.getDay();
  const curMin = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = bh.opening.split(':').map(Number);
  const [ch, cm] = bh.closing.split(':').map(Number);
  const days = bh.days ?? [1,2,3,4,5,6];
  const isOpen = days.includes(curDay) && curMin >= oh*60+om && curMin < ch*60+cm;
  return { isOpen, opening: bh.opening, closing: bh.closing, days };
}

const PAYMENT_OPTS = [
  { id: 'cash',     icon: '💵', label: 'Efectivo' },
  { id: 'transfer', icon: '📱', label: 'Transferencia / MP' },
  { id: 'debit',    icon: '💳', label: 'Tarjeta débito' },
  { id: 'credit',   icon: '💳', label: 'Tarjeta crédito' },
];

const TIME_OPTS = [
  { id: 'asap',  label: 'Lo antes posible' },
  { id: '30min', label: 'En 30 min' },
  { id: '1h',    label: 'En 1 hora' },
  { id: '2h',    label: 'En 2 horas' },
  { id: 'custom',label: 'Hora exacta…' },
];

export default function Catalog() {
  const { slugOrId } = useParams();
  const { formatCurrency } = useCountry();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Todos');
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [selectedProduct, _setSelectedProduct] = useState(null);
  const setSelectedProduct = (p) => { _setSelectedProduct(p); setSelectedAddons([]); setModalQty(1); };
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [popItems, setPopItems] = useState({});
  const [modalQty, setModalQty] = useState(1);

  // checkout state
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [ckName, setCkName] = useState('');
  const [ckMode, setCkMode] = useState('pickup');
  const [ckAddress, setCkAddress] = useState('');
  const [ckPayment, setCkPayment] = useState('');
  const [ckCashAmount, setCkCashAmount] = useState('');
  const [ckTime, setCkTime] = useState('asap');
  const [ckCustomTime, setCkCustomTime] = useState('');

  useEffect(() => { fetchData(); }, [slugOrId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase.from('store_settings').select('*');
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
      query = isUuid ? query.eq('id', slugOrId) : query.eq('slug', slugOrId);
      const { data: s } = await query.single();
      if (s) {
        setStore(s);
        const { data: p } = await supabase.from('products').select('*').eq('user_id', s.user_id).eq('show_in_store', true).order('name');
        if (p) setProducts(p);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.description && p.description.toLowerCase().includes(search.toLowerCase())));
  const categories = ['Todos', ...new Set(products.map(p => p.category || 'Otros'))];
  const displayProducts = activeTab === 'Todos' ? filtered : filtered.filter(p => (p.category || 'Otros') === activeTab);
  
  const grouped = {};
  displayProducts.forEach(p => { 
    const cat = p.category || 'Otros'; 
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p); 
  });

  const addToCart = (product, selectedAddonIds = [], qtyToAdd = 1) => setCart(prev => {
    const activeAddons = (product.addons || []).filter(a => selectedAddonIds.includes(a.id));
    const addonTotal = activeAddons.reduce((s, a) => s + Number(a.price), 0);
    const addonsKey = selectedAddonIds.sort().join(',');
    const cartItemId = `${product.id}-${addonsKey}`;
    const ex = prev.find(i => i.cartItemId === cartItemId);
    if (ex) { 
      if (ex.qty + qtyToAdd > (product.stock || 999)) return prev; 
      return prev.map(i => i.cartItemId === cartItemId ? {...i, qty: i.qty + qtyToAdd} : i); 
    }
    return [...prev, { ...product, cartItemId, selectedAddons: activeAddons, addonTotal, qty: qtyToAdd }];
  });

  const removeFromCart = (cartItemId) => setCart(prev => {
    const ex = prev.find(i => i.cartItemId === cartItemId || i.id === cartItemId);
    if (ex && ex.qty > 1) return prev.map(i => i.cartItemId === ex.cartItemId ? {...i, qty: i.qty-1} : i);
    return prev.filter(i => i.cartItemId !== ex?.cartItemId);
  });

  const cartTotal = cart.reduce((s,i) => s + (i.price + (i.addonTotal || 0)) * i.qty, 0);
  const cartCount = cart.reduce((s,i) => s + i.qty, 0);

  const handleQuickAdd = (e, p) => {
    e.stopPropagation();
    if (p.addons?.length > 0) {
      setSelectedProduct(p);
    } else {
      addToCart(p);
      setPopItems(prev => ({ ...prev, [p.id]: Date.now() }));
    }
  };

  const sendToWhatsApp = () => {
    if (!store?.whatsapp_number) return;
    let msg = `Hola *${store.store_name}*, quisiera realizar el siguiente pedido:\n\n`;
    cart.forEach(i => {
      msg += `• ${i.name} *x${i.qty}* · ${formatCurrency((i.price + (i.addonTotal || 0)) * i.qty)}\n`;
      if (i.selectedAddons && i.selectedAddons.length > 0) {
        msg += `  ↳ ${i.selectedAddons.map(a => '+' + a.name).join(', ')}\n`;
      }
    });
    msg += `\n*Total: ${formatCurrency(cartTotal)}*\n`;
    msg += `\n📦 *Modalidad:* ${ckMode === 'pickup' ? 'Retiro en local' : `Delivery — ${ckAddress}`}\n`;
    if (ckPayment) {
      const payLabel = PAYMENT_OPTS.find(p => p.id === ckPayment)?.label || ckPayment;
      msg += `💳 *Pago:* ${payLabel}`;
      if (ckPayment === 'cash' && ckCashAmount) {
        const change = parseInt(ckCashAmount) - cartTotal;
        msg += ` (abono $${ckCashAmount}${change >= 0 ? `, vuelto: ${formatCurrency(change)}` : ''})`;
      }
      msg += '\n';
    }
    const timeLabel = TIME_OPTS.find(t => t.id === ckTime)?.label;
    msg += `🕐 *Hora:* ${ckTime === 'custom' ? ckCustomTime : timeLabel}\n`;
    if (ckName) msg += `👤 *Nombre:* ${ckName}\n`;
    window.open(`https://wa.me/${store.whatsapp_number}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (loading) return <div className="cat-loading"><div className="cat-spinner"></div></div>;
  if (!store) return (
    <div className="cat-notfound">
      <div className="cat-notfound-icon">🏪</div>
      <h1>Tienda no encontrada</h1>
      <p>Revisá que el enlace sea correcto.</p>
    </div>
  );

  const initial = store.store_name?.charAt(0)?.toUpperCase() || 'C';
  const promos = store.promotions && Array.isArray(store.promotions) && store.promotions.length > 0 ? store.promotions : [];
  const status = getStoreStatus(store.business_hours);
  const scheduleText = [
    status?.days ? formatDays(status.days) : null,
    store.business_hours?.opening ? `${store.business_hours.opening}–${store.business_hours.closing}hs` : null
  ].filter(Boolean).join(' · ');

  return (
    <div className="cat-wrapper">
      
      {/* Banner */}
      <div className="cat-header-banner">
        {store.banner_url ? (
          <img src={store.banner_url} alt="Banner" />
        ) : (
          <span className="cat-header-banner-placeholder">foto de portada</span>
        )}
      </div>

      {/* Info Block */}
      <div className="cat-info-block">
        <div className="cat-info-container">
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
            <div className="cat-logo-box">
              {store.logo_url ? <img src={store.logo_url} alt="Logo" /> : initial}
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <a href={`https://wa.me/${store.whatsapp_number}`} target="_blank" rel="noreferrer" className="cat-social-link" aria-label="WhatsApp">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.07L2 22l5.06-1.33A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm5.2 14.2c-.22.62-1.28 1.18-1.77 1.24-.45.06-1.02.08-1.65-.1-.38-.11-.87-.28-1.5-.55-2.64-1.14-4.36-3.82-4.5-4-.13-.18-1.07-1.42-1.07-2.71 0-1.29.68-1.92.92-2.18.24-.26.53-.32.7-.32.18 0 .35 0 .5.01.16.01.38-.06.6.46.22.53.75 1.83.82 1.96.07.13.11.28.02.46-.09.18-.13.28-.26.44-.13.15-.27.34-.39.46-.13.13-.26.27-.11.53.15.26.66 1.09 1.42 1.77.98.87 1.8 1.14 2.06 1.27.26.13.41.11.56-.07.15-.18.65-.75.82-1.01.17-.26.34-.21.57-.13.24.09 1.5.71 1.76.84.26.13.43.19.5.3.06.11.06.63-.16 1.25z"/></svg>
              </a>
              {store.instagram_url && (
                <a href={store.instagram_url.startsWith('http') ? store.instagram_url : `https://instagram.com/${store.instagram_url.replace('@','')}`} target="_blank" rel="noreferrer" className="cat-social-link" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                </a>
              )}
            </div>
          </div>

          <h1 className="cat-store-title">{store.store_name}</h1>
          <p className="cat-store-desc">{store.description}</p>

          <div className="cat-badges">
            {status && (
              status.isOpen 
                ? <span className="cat-badge-open">Abierto ahora</span>
                : <span className="cat-badge-closed">Cerrado</span>
            )}
            {store.store_address && (
              <span className="cat-badge-info">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                {store.store_address}
              </span>
            )}
            {scheduleText && (
              <span className="cat-badge-info">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                {scheduleText}
              </span>
            )}
          </div>

        </div>
      </div>

      {/* Main Container */}
      <div className="cat-main-content">
        
        {/* Floating Filters */}
        <div className="cat-filter-card">
          <div className="cat-select-wrapper">
            <select value={activeTab} onChange={(e) => setActiveTab(e.target.value)} className="cat-select">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#475467" strokeWidth="2" className="cat-select-icon"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
          <div className="cat-search-wrapper">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#98A2B3" strokeWidth="2" className="cat-search-icon"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" placeholder="Buscar productos..." value={search} onChange={(e) => setSearch(e.target.value)} className="cat-search-input" />
          </div>
        </div>

        {/* Promotions */}
        {promos.length > 0 && (
          <div className="cat-promos-scroll">
            {promos.map((promo, idx) => (
              <div key={idx} className="cat-promo-pill">
                <span className="cat-promo-icon">{promo.icon || '🔥'}</span>
                <div style={{ minWidth: 0 }}>
                  <div className="cat-promo-title">{promo.title}</div>
                  <div className="cat-promo-desc">{promo.description}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Products */}
        {Object.entries(grouped).map(([cat, prods]) => (
          <div key={cat} className="cat-section">
            <div className="cat-section-header">
              <span className="cat-section-indicator"></span>
              <h2 className="cat-section-title">{cat}</h2>
            </div>
            <div className="cat-grid">
              {prods.map(p => {
                const inCartCount = cart.filter(c => c.id === p.id).reduce((sum,c)=>sum+c.qty, 0);
                const isImageHttp = p.icon?.startsWith('http') || p.icon?.startsWith('products/');
                return (
                  <div key={p.id} className="cat-product-card" onClick={() => setSelectedProduct(p)}>
                    <div className="cat-product-img">
                      {isImageHttp ? (
                        <img src={p.icon?.startsWith('http') ? p.icon : `https://images.openfoodfacts.org/images/${p.icon}`} alt={p.name} />
                      ) : (
                        <span className="cat-product-img-emoji">{p.icon || '📦'}</span>
                      )}
                    </div>
                    <div className="cat-product-body">
                      <div className="cat-product-name">{p.name}</div>
                      <div className="cat-product-desc">{p.description}</div>
                      <div className="cat-product-footer">
                        <span className="cat-product-price">{formatCurrency(p.price)}</span>
                        <button className={`cat-product-add ${inCartCount > 0 ? 'has-items' : ''}`} onClick={(e) => handleQuickAdd(e, p)}>
                          <span key={popItems[p.id] || 'init'} className={popItems[p.id] ? 'cat-pop-anim' : ''}>
                            {inCartCount > 0 ? inCartCount : '+'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {Object.keys(grouped).length === 0 && (
          <p className="cat-empty">No encontramos productos para tu búsqueda.</p>
        )}

        <div style={{ height: '40px' }}></div>
      </div>

      {/* Cart Pill */}
      {cartCount > 0 && (
        <div className="cat-cart-pill" onClick={() => setCartOpen(true)}>
          <span>🛒 {cartCount} producto{cartCount !== 1 ? 's' : ''}</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>{formatCurrency(cartTotal)}</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span className="cat-cart-pill-action">Ver pedido</span>
        </div>
      )}

      {/* Product Modal */}
      {selectedProduct && (() => {
        const modalTotal = selectedProduct.price + selectedAddons.reduce((s, id) => s + Number(selectedProduct.addons?.find(a => a.id === id)?.price || 0), 0);
        const isImageHttp = selectedProduct.icon?.startsWith('http') || selectedProduct.icon?.startsWith('products/');
        
        return (
          <div className="cat-modal-overlay" onClick={() => setSelectedProduct(null)}>
            <div className="cat-modal-container" onClick={e => e.stopPropagation()}>
              
              <div className="cat-modal-hero">
                {isImageHttp ? (
                  <img src={selectedProduct.icon?.startsWith('http') ? selectedProduct.icon : `https://images.openfoodfacts.org/images/${selectedProduct.icon}`} alt={selectedProduct.name} />
                ) : (
                  <span className="cat-modal-hero-emoji">{selectedProduct.icon || '📦'}</span>
                )}
                <button className="cat-modal-close" onClick={() => setSelectedProduct(null)}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              
              <div className="cat-modal-body">
                <h3 className="cat-modal-title">{selectedProduct.name}</h3>
                <p className="cat-modal-desc">{selectedProduct.description || 'Sin descripción detallada.'}</p>

                {selectedProduct.addons && selectedProduct.addons.length > 0 && (
                  <div style={{ marginBottom: '22px' }}>
                    <div className="cat-modal-section-title">
                      <span>Sumale extras</span>
                      <span className="cat-badge-optional">Opcional</span>
                    </div>
                    {selectedProduct.addons.map(addon => {
                      const selected = selectedAddons.includes(addon.id);
                      return (
                        <label key={addon.id} className={`cat-option-row ${selected ? 'selected' : ''}`} onClick={(e) => {
                          e.preventDefault();
                          if (selected) setSelectedAddons(selectedAddons.filter(id => id !== addon.id));
                          else setSelectedAddons([...selectedAddons, addon.id]);
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span className="cat-option-checkbox">
                              {selected && <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff" strokeWidth="3.4"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                            </span>
                            <span className="cat-option-label">{addon.name}</span>
                          </div>
                          {Number(addon.price) > 0 && <span className="cat-option-price">+{formatCurrency(addon.price)}</span>}
                        </label>
                      )
                    })}
                  </div>
                )}

                {selectedProduct.recommended && selectedProduct.recommended.length > 0 && (
                  <div>
                    <div className="cat-modal-section-title">
                      <span>También te puede interesar</span>
                    </div>
                    <div className="cat-recommended-scroll">
                      {selectedProduct.recommended.map(recId => {
                        const recProd = products.find(p => p.id === recId);
                        if (!recProd) return null;
                        const isRecHttp = recProd.icon?.startsWith('http') || recProd.icon?.startsWith('products/');
                        return (
                          <div key={recId} className="cat-rec-card" onClick={() => setSelectedProduct(recProd)}>
                            <div className="cat-rec-img">
                              {isRecHttp ? (
                                <img src={recProd.icon?.startsWith('http') ? recProd.icon : `https://images.openfoodfacts.org/images/${recProd.icon}`} alt={recProd.name} />
                              ) : (
                                <span style={{ fontSize: '32px' }}>{recProd.icon || '📦'}</span>
                              )}
                            </div>
                            <div className="cat-rec-name">{recProd.name}</div>
                            <div className="cat-rec-price">{formatCurrency(recProd.price)}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="cat-modal-footer">
                <div className="cat-qty-control">
                  <button className="cat-qty-btn" onClick={() => setModalQty(Math.max(1, modalQty - 1))}>−</button>
                  <span className="cat-qty-val">{modalQty}</span>
                  <button className="cat-qty-btn plus" onClick={() => setModalQty(modalQty + 1)}>+</button>
                </div>
                <button className="cat-btn-primary" onClick={() => {
                  addToCart(selectedProduct, selectedAddons, modalQty);
                  setSelectedProduct(null);
                }}>
                  <span>Agregar</span>
                  <span style={{ fontWeight: 800 }}>{formatCurrency(modalTotal * modalQty)}</span>
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Cart Drawer */}
      {cartOpen && !checkoutOpen && (
        <div className="cat-drawer-overlay" onClick={() => setCartOpen(false)}>
          <div className="cat-side-drawer" onClick={e => e.stopPropagation()}>
            <div className="cat-drawer-head">
              <h2>Tu pedido</h2>
              <button className="cat-drawer-close" onClick={() => setCartOpen(false)}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div className="cat-drawer-items">
              {cart.map(item => {
                const isImageHttp = item.icon?.startsWith('http') || item.icon?.startsWith('products/');
                return (
                  <div key={item.cartItemId} className="cat-cart-item">
                    <div className="cat-cart-item-img">
                      {isImageHttp ? (
                        <img src={item.icon?.startsWith('http') ? item.icon : `https://images.openfoodfacts.org/images/${item.icon}`} alt={item.name} />
                      ) : ( item.icon || '📦' )}
                    </div>
                    <div className="cat-cart-item-info">
                      <div className="cat-cart-item-name">{item.name}</div>
                      {item.selectedAddons?.length > 0 && (
                        <div className="cat-cart-item-addons">
                          {item.selectedAddons.map(a => '+' + a.name).join(', ')}
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                        <div className="cat-cart-item-price">{formatCurrency((item.price + (item.addonTotal || 0)) * item.qty)}</div>
                        <div className="cat-qty-control" style={{ transform: 'scale(0.85)', transformOrigin: 'right center' }}>
                          <button className="cat-qty-btn" onClick={() => removeFromCart(item.cartItemId)}>
                            {item.qty === 1 ? <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> : '−'}
                          </button>
                          <span className="cat-qty-val">{item.qty}</span>
                          <button className="cat-qty-btn plus" onClick={() => addToCart(item, item.selectedAddons?.map(a => a.id) || [])}>+</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              {cart.length === 0 && <p className="cat-empty">Tu carrito está vacío.</p>}
            </div>

            <div className="cat-drawer-footer">
              <div className="cat-drawer-total-row"><span>Subtotal</span><span>{formatCurrency(cartTotal)}</span></div>
              <div className="cat-drawer-total-row total"><span>Total</span><span>{formatCurrency(cartTotal)}</span></div>
              <button className="cat-btn-primary" onClick={() => setCheckoutOpen(true)} disabled={cart.length===0} style={{ width: '100%', justifyContent: 'center' }}>
                Confirmar pedido →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Drawer */}
      {checkoutOpen && (
        <div className="cat-drawer-overlay" onClick={() => setCheckoutOpen(false)}>
          <div className="cat-side-drawer" onClick={e => e.stopPropagation()}>
            <div className="cat-drawer-head">
              <h2>Completá tu pedido</h2>
              <button className="cat-drawer-close" onClick={() => setCheckoutOpen(false)}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div className="cat-drawer-items" style={{ padding: '20px 24px' }}>
              <div className="cat-ck-field">
                <label className="cat-ck-label">Tu nombre <span className="cat-ck-opt">opcional</span></label>
                <input className="cat-ck-input" placeholder="Ej: María García" value={ckName} onChange={e => setCkName(e.target.value)} />
              </div>

              <div className="cat-ck-field">
                <label className="cat-ck-label">Modalidad</label>
                <div className="cat-ck-toggle">
                  <button className={`cat-ck-toggle-btn ${ckMode==='pickup'?'active':''}`} onClick={() => setCkMode('pickup')}>🏪 Retiro en local</button>
                  <button className={`cat-ck-toggle-btn ${ckMode==='delivery'?'active':''}`} onClick={() => setCkMode('delivery')}>🛵 Delivery</button>
                </div>
              </div>

              {ckMode === 'delivery' && (
                <div className="cat-ck-field">
                  <label className="cat-ck-label">Dirección de entrega</label>
                  <input className="cat-ck-input" placeholder="Ej: Av. Corrientes 1234, Piso 3" value={ckAddress} onChange={e => setCkAddress(e.target.value)} />
                </div>
              )}

              <div className="cat-ck-field">
                <label className="cat-ck-label">Método de pago</label>
                <div className="cat-ck-payment-list">
                  {PAYMENT_OPTS.map(opt => (
                    <button key={opt.id} className={`cat-ck-payment-opt ${ckPayment===opt.id?'active':''}`} onClick={() => setCkPayment(opt.id)}>
                      <span className="cat-ck-payment-icon">{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {ckPayment === 'cash' && (
                <div className="cat-ck-field">
                  <label className="cat-ck-label">¿Con cuánto abonás? <span className="cat-ck-opt">opcional</span></label>
                  <input className="cat-ck-input" type="number" placeholder="Monto en efectivo" value={ckCashAmount} onChange={e => setCkCashAmount(e.target.value)} />
                  {ckCashAmount && parseInt(ckCashAmount) >= cartTotal && (
                    <p style={{ marginTop: '8px', fontSize: '13px', color: '#009B65', fontWeight: 600 }}>Vuelto: {formatCurrency(parseInt(ckCashAmount) - cartTotal)}</p>
                  )}
                </div>
              )}

              <div className="cat-ck-field">
                <label className="cat-ck-label">¿Cuándo lo necesitás?</label>
                <div className="cat-ck-time-opts">
                  {TIME_OPTS.map(opt => (
                    <button key={opt.id} className={`cat-ck-time-opt ${ckTime===opt.id?'active':''}`} onClick={() => setCkTime(opt.id)}>{opt.label}</button>
                  ))}
                </div>
                {ckTime === 'custom' && (
                  <TimePicker value={ckCustomTime} onChange={setCkCustomTime} className="w-full mt-3 !rounded-xl border-[1.5px] border-[#E4E9F0]" />
                )}
              </div>
            </div>

            <div className="cat-drawer-footer">
              <button className="cat-btn-wa" onClick={sendToWhatsApp} disabled={cart.length===0}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Enviar por WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
