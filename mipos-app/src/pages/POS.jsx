import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, Loader2, User, HelpCircle, LayoutGrid, Wallet, Lock, CreditCard, Smartphone, X, Settings, Banknote, ArrowRight, Tag } from 'lucide-react';
import { useOutletContext, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useCountry } from '../context/CountryContext';
import { enqueueOfflineAction } from '../lib/offlineSync';
import { VARIABLE_UNITS, fmtQty as fmtUnitQty } from '../lib/units';
import { PAYMENT_METHODS } from '../constants/enums';
import toast from 'react-hot-toast';

export default function POS() {
  const { user, owner_id } = useAuth();
  const { formatCurrency, formatCurrencyCents, formatDate, formatDateTime, formatTime, countryConfig } = useCountry();
  const ivaConditions = countryConfig.tax.conditions;
  const { isRegisterOpen, setShowCashModal, setCashAction, cashAmount, setCashAmount, showHelpMenu, setShowHelpMenu } = useOutletContext();
  
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [ivaCondition, setIvaCondition] = useState(() => countryConfig.tax.conditions[0]);
  useEffect(() => { setIvaCondition(countryConfig.tax.conditions[0]); }, [countryConfig]);
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mipos_pos_cart') || '[]');
    } catch {
      return [];
    }
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Checkout Modal State
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS.EFECTIVO);
  const [amountTendered, setAmountTendered] = useState('');
  const [storeSettings, setStoreSettings] = useState(null);

  // Cash tender modal (bill entry + change calculation)
  const [showCashTenderModal, setShowCashTenderModal] = useState(false);

  // Manual discount state
  const [showManualDiscountModal, setShowManualDiscountModal] = useState(false);
  const [manualDiscountInput, setManualDiscountInput] = useState('');
  const [manualDiscountType, setManualDiscountType] = useState('percent');
  const [manualDiscountReason, setManualDiscountReason] = useState('');
  const [appliedManualDiscount, setAppliedManualDiscount] = useState(null);

  // Custom Amount Modal
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [customDesc, setCustomDesc] = useState('');

  // VARIABLE_UNITS importado desde src/lib/units.js
  const [showQtyModal, setShowQtyModal] = useState(false);
  const [pendingProduct, setPendingProduct] = useState(null);
  const [pendingQty, setPendingQty] = useState('');
  const [editingQtyId, setEditingQtyId] = useState(null);
  const [editingQtyValue, setEditingQtyValue] = useState('');

  // New Client Modal
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');

  const searchInputRef = useRef(null);

  // Sync cart to local storage
  useEffect(() => {
    localStorage.setItem('mipos_pos_cart', JSON.stringify(cart));
  }, [cart]);

  // Auto-focus search input on any key press (useful for barcode scanners)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // If user is already typing in an input or textarea, don't steal focus
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      // Only steal focus for printable characters or Enter
      if (e.key.length === 1 || e.key === 'Enter') {
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const printReceipt = (saleId, cartToPrint, total, payMethod, settings, subtotalAmt = 0, discountAmt = 0, surchargeAmt = 0, discountReasonTxt = null) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
      toast.error('Ventana emergente bloqueada. Habilitalas para imprimir recibos.');
      return;
    }

    const storeName = settings?.store_name || 'Mi Comercio';
    const dateStr = formatDateTime(new Date());
    const shortSaleId = String(saleId).split('-')[0];

    let itemsHtml = '';
    cartToPrint.forEach(item => {
      const itemTotal = item.product.price * item.qty;
      itemsHtml += `
        <div class="item">
          <div class="item-name">${item.product.name}</div>
          <div class="item-details">
            <span>${item.qty} x ${formatCurrency(item.product.price)}</span>
            <span>${formatCurrency(itemTotal)}</span>
          </div>
        </div>
      `;
    });

    const hasAdjustment = discountAmt > 0 || surchargeAmt > 0;
    const adjustmentHtml = hasAdjustment ? `
      <div class="detail-row">
        <span>Subtotal:</span>
        <span>${formatCurrency(subtotalAmt)}</span>
      </div>
      ${discountAmt > 0 ? `<div class="detail-row" style="color:#16a34a;">
        <span>Descuento${discountReasonTxt ? ` (${discountReasonTxt})` : ''}:</span>
        <span>-${formatCurrency(discountAmt)}</span>
      </div>` : ''}
      ${surchargeAmt > 0 ? `<div class="detail-row" style="color:#dc2626;">
        <span>Recargo:</span>
        <span>+${formatCurrency(surchargeAmt)}</span>
      </div>` : ''}
    ` : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ticket #${shortSaleId}</title>
        <style>
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 58mm;
            margin: 0 auto;
            padding: 0;
            color: #000;
            font-size: 12px;
          }
          .header { text-align: center; margin-bottom: 15px; }
          .header h1 { font-size: 16px; margin: 0 0 5px 0; font-weight: bold; text-transform: uppercase; }
          .header p { margin: 2px 0; font-size: 10px; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          .item { margin-bottom: 5px; }
          .item-name { font-weight: bold; font-size: 11px; margin-bottom: 2px; line-height: 1.1; }
          .item-details { display: flex; justify-content: space-between; font-size: 11px; }
          .detail-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px; }
          .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin-top: 5px; }
          .footer { text-align: center; margin-top: 20px; font-size: 10px; }
          .disclaimer { text-align: center; margin-top: 15px; font-size: 9px; font-weight: bold; border-top: 1px solid #000; padding-top: 5px; line-height: 1.2; }
          @media print {
            html, body { width: 58mm; margin: 0; padding: 0; }
            @page { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${storeName}</h1>
          <p>Ticket #${shortSaleId}</p>
          <p>${dateStr}</p>
        </div>

        <div class="divider"></div>

        ${itemsHtml}

        <div class="divider"></div>

        ${adjustmentHtml}

        <div class="total-row">
          <span>TOTAL:</span>
          <span>${formatCurrency(total)}</span>
        </div>
        <div style="text-align: right; font-size: 10px; margin-top: 3px;">
          Medio de pago: ${payMethod.toUpperCase()}
        </div>

        <div class="footer">
          <p>¡Gracias por su compra!</p>
        </div>

        <div class="disclaimer">
          DOCUMENTO NO VÁLIDO COMO FACTURA
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      // Límite de seguridad: 5 000 SKUs cubre cualquier kiosco/almacén real.
      // Si un negocio supera ese número, la búsqueda por nombre/código
      // deberá migrar a server-side (issue catalogado en el backlog técnico).
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', owner_id)
        .neq('active', false)
        .order('name')
        .limit(5000);
      
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', owner_id)
        .order('nombre');
      
      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  };

  const fetchStoreSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('user_id', owner_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (!error && data) {
        setStoreSettings(data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  useEffect(() => {
    if (owner_id) {
      fetchProducts();
      fetchClients();
      fetchStoreSettings();
    }
  }, [owner_id]);

  const [showCategorySettings, setShowCategorySettings] = useState(false);

  const allCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const visibleCategories = storeSettings?.pos_categories !== undefined
    ? allCategories.filter(c => storeSettings.pos_categories.includes(c))
    : allCategories;

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.code && p.code.includes(searchTerm));
    const matchesCategory = selectedCategory ? p.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product, forcedQty = null) => {
    if (forcedQty !== null) {
      // Desde el modal de cantidad o usos internos con qty explícita
      setCart(prev => {
        const existing = prev.find(i => i.product.id === product.id);
        if (existing) {
          return prev.map(i => i.product.id === product.id
            ? { ...i, qty: Math.round((i.qty + forcedQty) * 1000) / 1000 }
            : i);
        }
        return [...prev, { product, qty: forcedQty }];
      });
      setSearchTerm('');
      return;
    }
    // Producto con unidad variable → pedir cantidad
    if (VARIABLE_UNITS.includes(product.unit)) {
      setPendingProduct(product);
      setPendingQty('');
      setShowQtyModal(true);
      return;
    }
    // Producto normal → +1
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { product, qty: 1 }];
    });
    setSearchTerm('');
  };

  const confirmQtyModal = () => {
    const qty = parseFloat(pendingQty);
    if (!qty || qty <= 0) return;
    addToCart(pendingProduct, qty);
    setShowQtyModal(false);
    setPendingProduct(null);
    setPendingQty('');
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.product.id !== id) return item;
      const step = VARIABLE_UNITS.includes(item.product.unit) ? 0.1 : 1;
      const newQty = Math.round((item.qty + delta * step) * 1000) / 1000;
      return newQty > 0 ? { ...item, qty: newQty } : item;
    }));
  };

  const fmtQty = (item) => fmtUnitQty(item.qty, item.product.unit);

  const removeItem = (id) => {
    setCart(prev => prev.filter(item => item.product.id !== id));
  };

  const startEditingQty = (item) => {
    setEditingQtyId(item.product.id);
    setEditingQtyValue(String(item.qty));
  };

  const confirmEditingQty = (id) => {
    const parsed = parseFloat(editingQtyValue);
    if (!isNaN(parsed) && parsed > 0) {
      setCart(prev => prev.map(item =>
        item.product.id === id ? { ...item, qty: Math.round(parsed * 1000) / 1000 } : item
      ));
    } else if (!isNaN(parsed) && parsed <= 0) {
      setCart(prev => prev.filter(item => item.product.id !== id));
    }
    setEditingQtyId(null);
    setEditingQtyValue('');
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.qty), 0);

  const calcAmount = (value, type) => {
    if (!value || value <= 0) return 0;
    return type === 'fixed' ? Number(value) : subtotal * (value / 100);
  };

  let autoDiscountAmount = 0;
  let activeSurcharge = 0;

  if (storeSettings) {
    if (paymentMethod === PAYMENT_METHODS.EFECTIVO) {
      autoDiscountAmount = calcAmount(storeSettings.cash_discount, storeSettings.cash_discount_type || 'percent');
      activeSurcharge = calcAmount(storeSettings.cash_surcharge, storeSettings.cash_surcharge_type || 'percent');
    } else if (paymentMethod === PAYMENT_METHODS.TRANSFERENCIA) {
      autoDiscountAmount = calcAmount(storeSettings.transfer_discount, storeSettings.transfer_discount_type || 'percent');
      activeSurcharge = calcAmount(storeSettings.transfer_surcharge, storeSettings.transfer_surcharge_type || 'percent');
    } else if (paymentMethod === PAYMENT_METHODS.TARJETA) {
      autoDiscountAmount = calcAmount(storeSettings.card_discount, storeSettings.card_discount_type || 'percent');
      activeSurcharge = calcAmount(storeSettings.card_surcharge, storeSettings.card_surcharge_type || 'percent');
    }
  }

  const manualDiscountAmount = appliedManualDiscount?.amount || 0;
  const activeDiscount = autoDiscountAmount + manualDiscountAmount;
  const finalTotal = Number(Math.max(0, subtotal - activeDiscount + activeSurcharge).toFixed(2));

  const discountSource = manualDiscountAmount > 0 && autoDiscountAmount > 0 ? 'mixed'
    : manualDiscountAmount > 0 ? 'manual'
    : autoDiscountAmount > 0 ? 'auto_payment_method'
    : null;

  const change = paymentMethod === PAYMENT_METHODS.EFECTIVO && amountTendered 
    ? Math.max(0, Number(amountTendered) - finalTotal) 
    : 0;

  const handleAgregarMontoCarrito = () => {
    const customProduct = {
      id: `custom-${Date.now()}`,
      name: customDesc || 'Varios',
      price: Number(customAmount),
      stock: 999,
      icon: '🛒'
    };
    addToCart(customProduct);
    setShowCustomModal(false);
    setCustomAmount('');
    setCustomDesc('');
  };

  const handleAbonarDeudaDirecto = async () => {
    if (!selectedClientId) return;
    setProcessing(true);
    try {
      const client = clients.find(c => c.id === selectedClientId);
      const paid = Number(customAmount);
      const currentDebt = Number(client?.deuda || 0);
      const newDebt = Math.max(0, currentDebt - paid);
      
      await supabase.from('clients').update({ deuda: newDebt }).eq('id', selectedClientId);
      
      const newCash = cashAmount + paid;
      await supabase.from('cash_movements').insert([{
        user_id: owner_id,
        employee_id: user.id,
        tipo: 'ingreso',
        monto: paid,
        motivo: `Abono de deuda - ${client?.nombre || 'Cliente'} (${customDesc || 'Ingreso manual'})`,
        saldo_anterior: cashAmount,
        saldo_nuevo: newCash
      }]);
      setCashAmount(newCash);
      
      toast.success(`Abono registrado. Deuda restante: ${formatCurrency(newDebt)}`);
      setShowCustomModal(false);
      setCustomAmount('');
      setCustomDesc('');
      fetchClients();
    } catch (err) {
      toast.error('Error al registrar abono.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0 && !selectedClientId) return;
    if (paymentMethod === PAYMENT_METHODS.FIADO && !selectedClientId) {
      toast.error('Debe seleccionar un cliente para vender a Fiado');
      return;
    }
    if (paymentMethod === PAYMENT_METHODS.EFECTIVO) {
      setAmountTendered('');
      setShowCashTenderModal(true);
      return;
    }
    processCheckout();
  };

  const processCheckout = async () => {
    try {
      setProcessing(true);

      // === OFFLINE QUEUE INTERCEPT ===
      if (!navigator.onLine) {
        enqueueOfflineAction('SALE', {
          cart,
          finalTotal,
          subtotal,
          discountAmount: activeDiscount,
          surchargeAmount: activeSurcharge,
          discountSource,
          discountReason: appliedManualDiscount?.reason || null,
          paymentMethod,
          selectedClientId,
          owner_id,
          user_id: user.id,
          cashAmount
        });

        if (paymentMethod === PAYMENT_METHODS.EFECTIVO) {
          setCashAmount(cashAmount + finalTotal);
        } else if (cart.length === 0 && selectedClientId && finalTotal > 0) {
          const client = clients.find(c => c.id === selectedClientId);
          const currentDebt = Number(client?.deuda || 0);
          const paid = Math.min(finalTotal, currentDebt);
          setCashAmount(cashAmount + paid);
        }

        setCart([]);
        setAppliedManualDiscount(null);
        setShowCheckout(false);
        setAmountTendered('');
        toast.success(`Venta o Abono guardado localmente (Sin Conexión)`);
        setProcessing(false);
        return;
      }

      // === PAYMENT OF CLIENT DEBT (empty cart) ===
      if (cart.length === 0 && selectedClientId && finalTotal > 0) {
        const client = clients.find(c => c.id === selectedClientId);
        const currentDebt = Number(client?.deuda || 0);
        const paid = Math.min(finalTotal, currentDebt);
        const newDebt = Math.max(0, currentDebt - finalTotal);
        
        await supabase.from('clients').update({ deuda: newDebt }).eq('id', selectedClientId);
        
        const newCash = cashAmount + paid;
        await supabase.from('cash_movements').insert([{
          user_id: owner_id,
          employee_id: user.id,
          tipo: 'ingreso',
          monto: paid,
          motivo: `Abono de deuda - ${client?.nombre || 'Cliente'}`,
          saldo_anterior: cashAmount,
          saldo_nuevo: newCash
        }]);
        setCashAmount(newCash);
        
        setCart([]);
        setShowCheckout(false);
        setAmountTendered('');
        toast.success(`Abono registrado. Deuda restante: ${formatCurrency(newDebt)}`);
        setProcessing(false);
        return;
      }
      
      if (cart.length === 0) {
        toast.error('El carrito está vacío.');
        setProcessing(false);
        return;
      }

      // === OFFLINE QUEUE INTERCEPT ===
      if (!navigator.onLine) {
        enqueueOfflineAction('SALE', {
          cart,
          finalTotal,
          subtotal,
          discountAmount: activeDiscount,
          surchargeAmount: activeSurcharge,
          discountSource,
          discountReason: appliedManualDiscount?.reason || null,
          paymentMethod,
          selectedClientId,
          owner_id,
          user_id: user.id,
          cashAmount
        });

        if (paymentMethod === PAYMENT_METHODS.EFECTIVO) {
          setCashAmount(cashAmount + finalTotal);
        }

        setCart([]);
        setAppliedManualDiscount(null);
        setShowCheckout(false);
        setAmountTendered('');
        toast.success(`Venta guardada localmente (Sin Conexión)`);
        setProcessing(false);
        return;
      }

      // Pre-validación de stock client-side antes de llamar al RPC
      for (const item of cart) {
        if (item.product.id.startsWith('custom-')) continue;
        const stockDisponible = item.product.stock ?? Infinity;
        if (item.qty > stockDisponible) {
          toast.error(
            `Stock insuficiente para "${item.product.name}". ` +
            `Stock disponible: ${stockDisponible}, en carrito: ${item.qty}. ` +
            `Reducí la cantidad o agregá stock desde Inventario.`
          );
          setProcessing(false);
          return;
        }
      }

      const cartItemsPayload = cart.map(item => ({
        id: item.product.id,
        qty: item.qty,
        price: item.product.price,
        name: item.product.name
      }));
      const { data: rpcData, error: rpcError } = await supabase.rpc('process_sale', {
        p_user_id: owner_id,
        p_employee_id: user.id,
        p_payment_method: paymentMethod.toLowerCase(),
        p_total: finalTotal,
        p_cart_items: cartItemsPayload,
        p_client_id: selectedClientId || null,
        p_subtotal: subtotal,
        p_discount_amount: activeDiscount,
        p_surcharge_amount: activeSurcharge,
        p_discount_source: discountSource,
        p_discount_reason: appliedManualDiscount?.reason || null
      });
      if (rpcError) throw rpcError;
      if (rpcData && rpcData.new_cash_balance !== undefined && paymentMethod.toLowerCase() === PAYMENT_METHODS.EFECTIVO) {
        setCashAmount(rpcData.new_cash_balance);
      }
      const returnedSaleId = rpcData?.sale_id || '0000';
      const cartSnapshot = [...cart];
      setCart([]);
      setAppliedManualDiscount(null);
      setShowCheckout(false);
      setAmountTendered('');
      toast.success(`Venta registrada con éxito (#${returnedSaleId.split('-')[0]})`);
      printReceipt(returnedSaleId, cartSnapshot, finalTotal, paymentMethod, storeSettings, subtotal, activeDiscount, activeSurcharge, appliedManualDiscount?.reason);
      fetchProducts();
    } catch (err) {
      console.error('Error during checkout:', err);
      toast.error(`Error: ${err.message || 'Hubo un error al procesar la venta'}`);
    } finally {
      setProcessing(false);
    }
  };

  if (!isRegisterOpen) {
    return (
      <div className="flex flex-col h-full bg-bg items-center justify-center p-8">
        <div className="bg-surface-2 border border-brand/30 rounded-3xl p-12 text-center max-w-md shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-brand/5 blur-3xl pointer-events-none"></div>
          
          <div className="w-20 h-20 bg-brand/20 text-brand rounded-2xl flex items-center justify-center mx-auto mb-6 relative z-10">
            <Lock size={40} />
          </div>
          
          <h1 className="text-3xl font-display font-bold text-text mb-3 relative z-10">Caja Cerrada</h1>
          <p className="text-muted mb-8 relative z-10 text-sm md:text-[15px] leading-relaxed">
            Para poder empezar a registrar ventas y movimientos, es necesario realizar la apertura de caja y definir tu monto inicial.
          </p>
          
          <button 
            onClick={() => {
              setCashAction('abrir');
              setShowCashModal(true);
            }}
            className="w-full bg-brand hover:bg-brand-hover text-text font-bold py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(82,82,255,0.3)] relative z-10 text-lg"
          >
            Abrir Caja Ahora
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-1 bg-bg min-h-0">
      {/* Header POS */}
      <div className="hidden lg:flex flex-col sm:flex-row sm:justify-between items-start sm:items-center p-4 lg:p-6 shrink-0 border-b border-border bg-surface gap-4">
        <div>
          <h1 className="text-xl font-display font-bold text-text">Punto de Venta</h1>
          <p className="text-sm md:text-[15px] text-muted">Sistema POS - mipos</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none justify-center flex items-center gap-2 text-sm md:text-[15px] font-medium text-muted hover:text-text transition-colors bg-bg px-3 py-2 rounded-lg border border-border">
            <LayoutGrid size={16} /> Tutorial
          </button>
          <div className="relative flex-1 sm:flex-none" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setShowHelpMenu(prev => !prev)}
              className={`w-full justify-center flex items-center gap-2 text-sm md:text-[15px] font-medium transition-colors px-3 py-2 rounded-lg border ${
                showHelpMenu
                  ? 'bg-brand/10 text-brand border-brand/30'
                  : 'bg-bg text-muted hover:text-text border-border'
              }`}
            >
              <HelpCircle size={16} /> Ayuda <span className="bg-surface-2 px-1.5 py-0.5 rounded text-sm md:text-[15px] border border-border">F1</span>
            </button>
            {showHelpMenu && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-bg border border-border rounded-xl shadow-2xl overflow-hidden z-50">
                <Link
                  to="/faq"
                  onClick={() => setShowHelpMenu(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm md:text-[15px] text-muted hover:bg-surface-2 hover:text-text transition-colors"
                >
                  <HelpCircle size={16} className="text-brand" />
                  Preguntas Frecuentes
                </Link>
                <div className="border-t border-border" />
                <a
                  href="https://wa.me/5491100000000?text=Hola,%20necesito%20soporte%20con%20mipos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 text-sm md:text-[15px] text-muted hover:bg-surface-2 hover:text-text transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-green-400"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.352 0-4.556-.764-6.348-2.111l-.443-.34-3.09 1.036 1.036-3.09-.34-.443A9.953 9.953 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                  Soporte (WhatsApp)
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 lg:overflow-hidden p-3 sm:p-4 lg:p-5 xl:p-6 gap-3 sm:gap-4 lg:gap-5 xl:gap-6">
        {/* LEFT COLUMN: Search + Cart */}
        <div className="flex-1 flex flex-col gap-3 min-w-0 lg:overflow-hidden">

          {/* Search — shrink-0 */}
          <div className="shrink-0 bg-surface-2 border border-border rounded-2xl p-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand" size={18} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscar producto o escanear código…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const exactMatch = products.find(p => p.code === searchTerm);
                      if (exactMatch) { addToCart(exactMatch); setSearchTerm(''); }
                      else if (filteredProducts.length === 1) { addToCart(filteredProducts[0]); setSearchTerm(''); }
                    }
                  }}
                  className="w-full bg-bg border border-mipos-green/30 rounded-xl py-3 pl-10 pr-4 text-sm md:text-[15px] focus:outline-none focus:border-mipos-green transition-colors text-text placeholder:text-dim"
                  autoFocus
                />
                {/* Dropdown resultados */}
                {searchTerm && filteredProducts.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-50 max-h-60 overflow-y-auto">
                    {filteredProducts.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { addToCart(p); setSearchTerm(''); }}
                        className="w-full text-left px-4 py-3 hover:bg-surface-2 flex justify-between items-center border-b border-border/50 last:border-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 overflow-hidden bg-surface-2">
                            {(p.icon?.startsWith('http') || p.icon?.startsWith('products/')) ? (
                              <img src={p.icon?.startsWith('http') ? p.icon : `https://images.openfoodfacts.org/images/${p.icon}`} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xl">{p.icon || '📦'}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-sm md:text-[15px] text-text truncate">{p.name}</div>
                            {p.code && <div className="text-sm md:text-[15px] text-muted font-mono truncate">{p.code}</div>}
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <div className="font-bold text-brand text-sm md:text-[15px]">{formatCurrency(p.price)}</div>
                          <div className="text-sm md:text-[15px] text-muted">Stock: {p.stock}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowCustomModal(true)}
                className="shrink-0 bg-surface border border-border text-text text-sm md:text-[15px] font-medium px-4 py-3 rounded-xl hover:bg-surface-2 transition-colors flex items-center gap-2"
              >
                <Plus size={16} /> Monto
              </button>
            </div>
          </div>

          {/* Cart — flex-1, scrolleable */}
          <div className="flex-1 bg-surface-2 border border-border rounded-2xl flex flex-col min-h-0">
            <div className="px-5 py-3.5 border-b border-border shrink-0 flex items-center justify-between">
              <div>
                <h2 className="text-sm md:text-[15px] font-display font-bold text-text">Carrito</h2>
                <p className="text-sm md:text-[15px] text-muted mt-0.5">
                  {cart.length === 0 ? 'Vacío — buscá un producto para empezar' : `${cart.length} ${cart.length === 1 ? 'producto' : 'productos'}`}
                </p>
              </div>
              {cart.length > 0 && (
                <button onClick={() => { setCart([]); setAppliedManualDiscount(null); }} className="text-sm md:text-[15px] text-muted hover:text-red-400 transition-colors">Vaciar</button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar min-h-0">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-dim gap-3 py-12">
                  <ShoppingCart size={40} className="opacity-20" />
                  <p className="text-sm md:text-[15px] text-muted text-center">Usá el buscador para agregar productos</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.product.id} className="bg-surface px-4 py-3 rounded-xl border border-transparent hover:border-border flex items-center gap-4 group transition-colors">
                    <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 overflow-hidden bg-surface-2">
                      {(item.product.icon?.startsWith('http') || item.product.icon?.startsWith('products/')) ? (
                        <img src={item.product.icon?.startsWith('http') ? item.product.icon : `https://images.openfoodfacts.org/images/${item.product.icon}`} alt={item.product.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl">{item.product.icon || '📦'}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm md:text-[15px] font-bold text-text truncate">{item.product.name}</h4>
                      <div className="text-muted text-sm md:text-[15px] mt-0.5">{formatCurrency(item.product.price)} c/u</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1 bg-bg rounded-lg border border-border p-1">
                        <button onClick={() => updateQty(item.product.id, -1)} className="p-1 hover:text-text text-muted transition-colors"><Minus size={13} /></button>
                        {editingQtyId === item.product.id ? (
                          <input
                            type="number"
                            min="0"
                            step={VARIABLE_UNITS.includes(item.product.unit) ? '0.001' : '1'}
                            value={editingQtyValue}
                            onChange={e => setEditingQtyValue(e.target.value)}
                            onBlur={() => confirmEditingQty(item.product.id)}
                            onKeyDown={e => { if (e.key === 'Enter') confirmEditingQty(item.product.id); if (e.key === 'Escape') { setEditingQtyId(null); setEditingQtyValue(''); } }}
                            autoFocus
                            className="text-sm md:text-[15px] font-bold w-16 px-1 text-center text-text tabular-nums bg-transparent border-b border-brand outline-none"
                          />
                        ) : (
                          <span
                            onClick={() => startEditingQty(item)}
                            title="Click para editar cantidad"
                            className="text-sm md:text-[15px] font-bold min-w-[2.5rem] px-1 text-center text-text tabular-nums cursor-pointer hover:text-brand transition-colors"
                          >{fmtQty(item)}</span>
                        )}
                        <button onClick={() => updateQty(item.product.id, 1)} className="p-1 hover:text-text text-muted transition-colors"><Plus size={13} /></button>
                      </div>
                      <div className="w-24 text-right">
                        <div className="text-sm md:text-[15px] font-bold text-brand">{formatCurrency(item.product.price * item.qty)}</div>
                      </div>
                      <button onClick={() => removeItem(item.product.id)} className="p-1.5 text-dim hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>{/* end LEFT COLUMN */}

        {/* RIGHT COLUMN: Client + Summary */}
        <div className="w-full lg:w-[30%] lg:min-w-[280px] lg:max-w-[400px] xl:max-w-[440px] flex flex-col gap-3 shrink-0 lg:h-full lg:overflow-hidden">

          {/* Client Box */}
          <div className="shrink-0 bg-surface-2 border border-border rounded-2xl p-3 xl:p-4">
            <h2 className="text-sm md:text-[15px] font-display font-bold text-text flex items-center gap-2 mb-2.5">
              <User size={14} className="text-muted" /> Cliente
            </h2>
            
            <div className="relative mb-2.5">
              <label className="block text-sm md:text-[15px] uppercase font-bold text-muted mb-1 tracking-wider">Condición IVA</label>
              <select
                value={ivaCondition}
                onChange={(e) => setIvaCondition(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg py-2 px-3 text-sm md:text-[15px] focus:outline-none focus:border-mipos-green/50 transition-colors text-text appearance-none cursor-pointer"
              >
                {ivaConditions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="absolute right-4 bottom-3 pointer-events-none text-muted">
                ▼
              </div>
            </div>

            <div className="relative">
              <label className="block text-sm md:text-[15px] uppercase font-bold text-muted mb-1 tracking-wider">Cliente (Opcional)</label>
              <select
                value={selectedClientId}
                onChange={(e) => {
                  if (e.target.value === 'NEW_CLIENT') {
                    setShowNewClientModal(true);
                  } else {
                    setSelectedClientId(e.target.value);
                  }
                }}
                className="w-full bg-bg border border-border rounded-lg py-2 px-3 text-sm md:text-[15px] focus:outline-none focus:border-mipos-green/50 transition-colors text-text appearance-none cursor-pointer"
              >
                <option value="">Ninguno (Venta mostrador)</option>
                <option value="NEW_CLIENT" className="font-bold text-brand bg-surface-2">✚ Crear nuevo cliente...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre} {c.cuit ? `(${c.cuit})` : ''}</option>
                ))}
              </select>
              <div className="absolute right-4 bottom-3 pointer-events-none text-muted">
                ▼
              </div>
            </div>
          </div>

          {/* Summary Box — mipos siempre visible al fondo */}
          <div className="flex-1 min-h-0 bg-surface-2 border border-border rounded-2xl flex flex-col overflow-hidden">
            {/* Área scrolleable: totales + método + inputs condicionales */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm md:text-[15px] font-display font-bold text-text">Resumen</h2>
              <span className="bg-bg border border-border px-2 py-1 rounded text-sm md:text-[15px] text-muted">
                {cart.length} items
              </span>
            </div>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm md:text-[15px]">
                <span className="text-muted">Subtotal:</span>
                <span className="font-bold text-text">{formatCurrency(subtotal)}</span>
              </div>
              
              {autoDiscountAmount > 0 && (
                <div className="flex justify-between text-sm md:text-[15px]">
                  <span className="text-brand">Descuento ({paymentMethod}):</span>
                  <span className="font-bold text-brand">-{formatCurrency(autoDiscountAmount)}</span>
                </div>
              )}
              {activeSurcharge > 0 && (
                <div className="flex justify-between text-sm md:text-[15px]">
                  <span className="text-red-400">Recargo ({paymentMethod}):</span>
                  <span className="font-bold text-red-400">+{formatCurrency(activeSurcharge)}</span>
                </div>
              )}
              {appliedManualDiscount ? (
                <div className="flex justify-between text-sm md:text-[15px] items-center bg-brand/10 border border-brand/30 rounded-xl px-3 py-2.5">
                  <span className="text-brand flex items-center gap-2 font-bold min-w-0">
                    <Tag size={14} className="shrink-0" />
                    <span className="truncate">{appliedManualDiscount.reason}</span>
                  </span>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="font-bold text-brand">-{formatCurrency(manualDiscountAmount)}</span>
                    <button
                      onClick={() => setAppliedManualDiscount(null)}
                      className="w-5 h-5 rounded-full bg-brand/20 hover:bg-red-400/20 flex items-center justify-center text-brand hover:text-red-400 transition-colors"
                    >
                      <X size={11} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowManualDiscountModal(true)}
                  className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border hover:border-brand/50 hover:bg-brand/5 text-muted hover:text-brand rounded-xl py-2.5 text-sm font-bold transition-all"
                >
                  <Tag size={15} />
                  Aplicar descuento
                </button>
              )}

              <div className="h-px bg-mipos-border w-full"></div>
              <div className="flex justify-between items-end">
                <span className="text-sm md:text-[15px] font-bold text-muted">Total:</span>
                <span className="font-display font-bold text-3xl text-brand leading-none tabular-nums">
                  {formatCurrency(finalTotal)}
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-border/50">
              
              <div>
                <label className="block text-sm md:text-[15px] font-bold text-brand mb-2 uppercase tracking-wider">Método de Pago</label>
                <div className="grid grid-cols-4 gap-2 xl:gap-3">
                  <button 
                    onClick={() => setPaymentMethod(PAYMENT_METHODS.EFECTIVO)}
                    className={`flex flex-col items-center justify-center py-2.5 xl:py-3.5 rounded-xl border transition-all ${
                      paymentMethod === PAYMENT_METHODS.EFECTIVO ? 'bg-brand/10 border-brand text-brand' : 'bg-surface-2 border-border text-muted hover:text-text hover:border-brand/50'
                    }`}
                  >
                    <Wallet size={16} className="mb-1" />
                    <span className="text-sm md:text-[15px] font-bold">Efectivo</span>
                  </button>
                  <button 
                    onClick={() => setPaymentMethod(PAYMENT_METHODS.TARJETA)}
                    className={`flex flex-col items-center justify-center py-2.5 xl:py-3.5 rounded-xl border transition-all ${
                      paymentMethod === PAYMENT_METHODS.TARJETA ? 'bg-brand/10 border-brand text-brand' : 'bg-surface-2 border-border text-muted hover:text-text hover:border-brand/50'
                    }`}
                  >
                    <CreditCard size={16} className="mb-1" />
                    <span className="text-sm md:text-[15px] font-bold">Tarjeta</span>
                  </button>
                  <button 
                    onClick={() => setPaymentMethod(PAYMENT_METHODS.TRANSFERENCIA)}
                    className={`flex flex-col items-center justify-center py-2.5 xl:py-3.5 rounded-xl border transition-all ${
                      paymentMethod === PAYMENT_METHODS.TRANSFERENCIA ? 'bg-brand/10 border-brand text-brand' : 'bg-surface-2 border-border text-muted hover:text-text hover:border-brand/50'
                    }`}
                  >
                    <Smartphone size={16} className="mb-1" />
                    <span className="text-sm md:text-[15px] font-bold">QR / Transf.</span>
                  </button>
                  <button 
                    onClick={() => setPaymentMethod(PAYMENT_METHODS.FIADO)}
                    className={`flex flex-col items-center justify-center py-2.5 xl:py-3.5 rounded-xl border transition-all ${
                      paymentMethod === PAYMENT_METHODS.FIADO ? 'bg-brand/10 border-brand text-brand' : 'bg-surface-2 border-border text-muted hover:text-text hover:border-brand/50'
                    }`}
                  >
                    <User size={16} className="mb-1" />
                    <span className="text-sm md:text-[15px] font-bold">Fiado</span>
                  </button>
                </div>
              </div>


            </div>{/* fin área scrolleable de métodos */}
            </div>{/* fin overflow-y-auto */}

            {/* Zona inferior fija — efectivo/fiado inline + mipos */}
            <div className="shrink-0 p-3 border-t border-border space-y-2">

              {/* Fiado sin cliente */}
              {paymentMethod === PAYMENT_METHODS.FIADO && !selectedClientId && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm md:text-[15px] px-3 py-1.5 rounded-lg text-center font-bold">
                  ⚠️ Seleccioná un cliente arriba para registrar el fiado
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || processing || (paymentMethod === PAYMENT_METHODS.FIADO && !selectedClientId)}
                className="w-full bg-[#2563eb] hover:bg-[#3b82f6] text-text font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:hover:bg-[#2563eb] flex justify-center items-center gap-2 shadow-[0_4px_20px_rgba(37,99,235,0.3)] text-lg"
              >
                {processing ? <Loader2 className="animate-spin" size={18} /> : `Cobrar ${formatCurrency(finalTotal)}`}
              </button>
            </div>
          </div>
          
        </div>
      </div>



      {/* ══════════════════════════════════════════════
          Modal: Cobro en efectivo — billete + vuelto
      ══════════════════════════════════════════════ */}
      {showCashTenderModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center">
                  <Banknote size={16} className="text-brand" />
                </div>
                <span className="text-sm font-semibold text-text">Cobro en efectivo</span>
              </div>
              <button onClick={() => setShowCashTenderModal(false)}
                className="w-7 h-7 rounded-lg bg-bg hover:bg-border transition-colors flex items-center justify-center text-muted hover:text-text">
                <X size={14} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-5">

              {/* Total a cobrar */}
              <div className="bg-bg rounded-2xl p-4 text-center">
                <p className="text-xs font-medium text-muted mb-1">Total a cobrar</p>
                <p className="text-4xl font-display font-bold text-text tracking-tight">
                  {formatCurrencyCents(finalTotal)}
                </p>
              </div>

              {/* Input billete */}
              <div>
                <label className="block text-xs font-medium text-muted mb-2">¿Con cuánto paga?</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted pointer-events-none">$</span>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={amountTendered}
                    onChange={(e) => setAmountTendered(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    placeholder={String(finalTotal)}
                    autoFocus
                    className={`w-full bg-bg border rounded-2xl pl-9 pr-4 py-3.5 text-2xl font-bold focus:outline-none transition-all text-text ${
                      amountTendered && Number(amountTendered) < finalTotal
                        ? 'border-danger/60 focus:border-danger'
                        : 'border-border focus:border-brand/60 focus:ring-2 focus:ring-brand/10'
                    }`}
                  />
                </div>

                {/* Denominaciones rápidas */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {(() => {
                    const bills = [100, 200, 500, 1000, 2000, 5000, 10000, 20000];
                    const exactRounded = Math.ceil(finalTotal / 100) * 100;
                    const suggestions = [exactRounded, ...bills.filter(b => b > finalTotal)].slice(0, 4);
                    return [...new Set(suggestions)].map(bill => (
                      <button key={bill} type="button"
                        onClick={() => setAmountTendered(String(bill))}
                        className={`flex-1 min-w-0 py-2 px-3 rounded-xl text-sm font-semibold transition-all border ${
                          Number(amountTendered) === bill
                            ? 'bg-brand/10 border-brand text-brand'
                            : 'bg-bg border-border text-muted hover:border-brand/40 hover:text-text'
                        }`}>
                        {formatCurrency(bill)}
                      </button>
                    ));
                  })()}
                </div>
              </div>

              {/* Vuelto */}
              <div className={`rounded-2xl px-5 py-3.5 flex items-center justify-between transition-all ${
                amountTendered && Number(amountTendered) >= finalTotal
                  ? 'bg-brand/8 border border-brand/20'
                  : 'bg-bg border border-border'
              }`}>
                <span className="text-sm font-medium text-muted">Vuelto</span>
                <span className={`text-2xl font-display font-bold transition-colors ${
                  amountTendered && Number(amountTendered) >= finalTotal ? 'text-brand' : 'text-dim'
                }`}>
                  {amountTendered && Number(amountTendered) >= finalTotal
                    ? formatCurrencyCents(Number(amountTendered) - finalTotal)
                    : '—'}
                </span>
              </div>

              {/* Acciones */}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCashTenderModal(false)}
                  className="flex-1 py-3 rounded-2xl border border-border text-sm font-semibold text-muted hover:text-text hover:bg-bg transition-all">
                  Cancelar
                </button>
                <button type="button"
                  disabled={processing || !amountTendered || Number(amountTendered) < finalTotal}
                  onClick={() => { setShowCashTenderModal(false); processCheckout(); }}
                  className="flex-1 py-3 rounded-2xl bg-brand hover:bg-brand-hover text-white text-sm font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(0,150,101,0.3)]">
                  {processing ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  Confirmar
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Modal: cantidad variable (kg / gr / litros / ml) */}
      {showQtyModal && pendingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg border border-border rounded-2xl w-full max-w-[340px] shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-border bg-surface">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{pendingProduct.icon || '📦'}</span>
                <div className="min-w-0">
                  <h3 className="font-bold text-text truncate">{pendingProduct.name}</h3>
                  <p className="text-sm md:text-[15px] text-muted">{formatCurrency(pendingProduct.price)} / {pendingProduct.unit === 'litros' ? 'L' : pendingProduct.unit}</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm md:text-[15px] font-bold text-muted mb-2 uppercase tracking-wider">
                  Cantidad ({pendingProduct.unit === 'litros' ? 'L' : pendingProduct.unit})
                </label>
                <div className="relative">
                  <input
                    type="number" min="0.001" step="0.001"
                    value={pendingQty}
                    onChange={e => setPendingQty(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && confirmQtyModal()}
                    placeholder="0.000"
                    autoFocus
                    className="w-full bg-surface-2 border border-border rounded-xl py-3 px-4 pr-14 text-text text-xl font-bold text-center focus:outline-none focus:border-brand transition-colors"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted font-bold text-sm md:text-[15px]">
                    {pendingProduct.unit === 'litros' ? 'L' : pendingProduct.unit}
                  </span>
                </div>
              </div>

              {pendingQty && parseFloat(pendingQty) > 0 && (
                <div className="bg-brand/10 border border-brand/20 rounded-xl px-4 py-2.5 flex justify-between items-center">
                  <span className="text-sm md:text-[15px] text-muted">Subtotal</span>
                  <span className="text-base font-bold text-brand">
                    {formatCurrency(pendingProduct.price * parseFloat(pendingQty))}
                  </span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowQtyModal(false); setPendingProduct(null); setPendingQty(''); }}
                  className="flex-1 border border-border text-muted py-3 rounded-xl font-medium hover:bg-surface transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmQtyModal}
                  disabled={!pendingQty || parseFloat(pendingQty) <= 0}
                  className="flex-[2] bg-brand hover:bg-brand-hover disabled:opacity-50 text-text font-bold py-3 rounded-xl transition-all shadow-[0_4px_15px_rgba(82,82,255,0.3)]"
                >
                  Agregar al carrito
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agregar Monto / Abonar Deuda Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg border border-border rounded-3xl w-full max-w-[400px] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-border bg-surface flex justify-between items-center">
              <h2 className="text-xl font-display font-bold text-text">Agregar Monto</h2>
              <button onClick={() => setShowCustomModal(false)} className="text-muted hover:text-text"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm md:text-[15px] font-bold text-text mb-2 uppercase">Monto ($)</label>
                <input type="number" min="1" value={customAmount} onChange={e => setCustomAmount(e.target.value)} className="w-full bg-surface-2 border border-border rounded-xl py-3 px-4 text-text focus:outline-none focus:border-brand" placeholder="0" autoFocus />
              </div>
              <div>
                <label className="block text-sm md:text-[15px] font-bold text-text mb-2 uppercase">Detalle</label>
                <input type="text" value={customDesc} onChange={e => setCustomDesc(e.target.value)} className="w-full bg-surface-2 border border-border rounded-xl py-3 px-4 text-text focus:outline-none focus:border-brand" placeholder="Ej: Varios / Abono" />
              </div>
              <div className="pt-4 flex gap-3">
                {selectedClientId ? (
                  <button 
                    onClick={handleAbonarDeudaDirecto}
                    disabled={!customAmount || Number(customAmount) <= 0 || processing}
                    className="flex-1 bg-brand hover:bg-emerald-500 text-text font-bold py-3 rounded-xl transition-all text-sm md:text-[15px] flex justify-center items-center gap-2 disabled:opacity-50"
                  >
                    {processing ? <Loader2 className="animate-spin" size={16} /> : 'Abonar Deuda'}
                  </button>
                ) : null}
                <button 
                  onClick={handleAgregarMontoCarrito}
                  disabled={!customAmount || Number(customAmount) <= 0}
                  className="flex-[2] bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:hover:bg-brand text-text font-bold py-3 rounded-xl transition-all text-sm md:text-[15px] shadow-[0_4px_15px_rgba(82,82,255,0.3)] flex justify-center items-center gap-2"
                >
                  Agregar al Ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nuevo Cliente Modal */}
      {showNewClientModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg border border-border rounded-3xl w-full max-w-[400px] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-border bg-surface flex justify-between items-center">
              <h2 className="text-xl font-display font-bold text-text">Nuevo Cliente</h2>
              <button onClick={() => {
                setShowNewClientModal(false);
                setSelectedClientId('');
              }} className="text-muted hover:text-text"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm md:text-[15px] font-bold text-text mb-2 uppercase tracking-wider">Nombre del Cliente *</label>
                <input 
                  type="text" 
                  value={newClientName} 
                  onChange={e => setNewClientName(e.target.value)} 
                  className="w-full bg-surface-2 border border-border rounded-xl py-3 px-4 text-text focus:outline-none focus:border-brand transition-colors" 
                  placeholder="Ej: Juan Pérez" 
                  autoFocus 
                />
              </div>
              <div>
                <label className="block text-sm md:text-[15px] font-bold text-text mb-2 uppercase tracking-wider">Teléfono / WhatsApp (Opcional)</label>
                <input 
                  type="text" 
                  value={newClientPhone} 
                  onChange={e => setNewClientPhone(e.target.value)} 
                  className="w-full bg-surface-2 border border-border rounded-xl py-3 px-4 text-text focus:outline-none focus:border-brand transition-colors" 
                  placeholder="Ej: 351..." 
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  onClick={async () => {
                    if (!newClientName) return;
                    setProcessing(true);
                    try {
                      const { data, error } = await supabase
                        .from('clients')
                        .insert([{
                          user_id: owner_id,
                          nombre: newClientName,
                          telefono: newClientPhone || null,
                          deuda: 0,
                          cuit: '',
                          iva: DEFAULT_IVA,
                          domicilio: '',
                          provincia: ''
                        }])
                        .select()
                        .single();
                        
                      if (error) throw error;
                      
                      setClients(prev => [...prev, data].sort((a,b) => a.nombre.localeCompare(b.nombre)));
                      setSelectedClientId(data.id);
                      setShowNewClientModal(false);
                      setNewClientName('');
                      setNewClientPhone('');
                      toast.success('Cliente creado correctamente');
                    } catch (err) {
                      console.error(err);
                      toast.error('Error al guardar cliente');
                    } finally {
                      setProcessing(false);
                    }
                  }}
                  disabled={!newClientName || processing}
                  className="w-full bg-brand hover:bg-brand-hover disabled:opacity-50 text-text font-bold py-3.5 rounded-xl transition-all shadow-[0_4px_15px_rgba(82,82,255,0.3)] flex justify-center items-center gap-2"
                >
                  {processing ? <Loader2 className="animate-spin" size={18} /> : 'Guardar y Seleccionar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Discount Modal */}
      {showManualDiscountModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg border border-border rounded-3xl w-full max-w-[400px] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-border bg-surface flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center">
                  <Tag size={16} className="text-brand" />
                </div>
                <h2 className="text-lg font-display font-bold text-text">Descuento Manual</h2>
              </div>
              <button onClick={() => setShowManualDiscountModal(false)} className="text-muted hover:text-text"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Tipo de descuento */}
              <div>
                <label className="block text-sm font-bold text-muted mb-2 uppercase tracking-wider">Tipo</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setManualDiscountType('percent')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${manualDiscountType === 'percent' ? 'bg-brand/10 border-brand text-brand' : 'bg-surface-2 border-border text-muted hover:text-text'}`}
                  >
                    % Porcentaje
                  </button>
                  <button
                    onClick={() => setManualDiscountType('fixed')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${manualDiscountType === 'fixed' ? 'bg-brand/10 border-brand text-brand' : 'bg-surface-2 border-border text-muted hover:text-text'}`}
                  >
                    $ Monto fijo
                  </button>
                </div>
              </div>
              {/* Valor */}
              <div>
                <label className="block text-sm font-bold text-muted mb-2 uppercase tracking-wider">
                  {manualDiscountType === 'percent' ? 'Porcentaje (%)' : 'Monto ($)'}
                </label>
                <input
                  type="number"
                  min="0"
                  step={manualDiscountType === 'percent' ? '0.01' : '1'}
                  max={manualDiscountType === 'percent' ? '100' : undefined}
                  value={manualDiscountInput}
                  onChange={e => setManualDiscountInput(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-xl py-3 px-4 text-text focus:outline-none focus:border-brand transition-colors text-lg font-bold"
                  placeholder={manualDiscountType === 'percent' ? 'Ej: 10' : 'Ej: 500'}
                  autoFocus
                />
                {manualDiscountInput && Number(manualDiscountInput) > 0 && subtotal > 0 && (
                  <p className="text-xs text-brand mt-1.5 font-medium">
                    Ahorro: {formatCurrency(
                      manualDiscountType === 'fixed'
                        ? Math.min(Number(manualDiscountInput), subtotal)
                        : subtotal * (Number(manualDiscountInput) / 100)
                    )}
                  </p>
                )}
              </div>
              {/* Motivo */}
              <div>
                <label className="block text-sm font-bold text-muted mb-2 uppercase tracking-wider">
                  Motivo <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={manualDiscountReason}
                  onChange={e => setManualDiscountReason(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-xl py-3 px-4 text-text focus:outline-none focus:border-brand transition-colors"
                  placeholder="Ej: Descuento empleado, Cliente VIP..."
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => { setShowManualDiscountModal(false); setManualDiscountInput(''); setManualDiscountReason(''); }}
                  className="flex-1 border border-border text-muted py-3 rounded-xl font-medium hover:bg-surface transition-colors"
                >
                  Cancelar
                </button>
                <button
                  disabled={!manualDiscountInput || Number(manualDiscountInput) <= 0 || !manualDiscountReason.trim()}
                  onClick={() => {
                    const rawVal = Number(manualDiscountInput);
                    const amount = manualDiscountType === 'fixed'
                      ? Math.min(rawVal, subtotal)
                      : subtotal * (rawVal / 100);
                    setAppliedManualDiscount({ amount: Number(amount.toFixed(2)), reason: manualDiscountReason.trim(), type: manualDiscountType, inputValue: rawVal });
                    setShowManualDiscountModal(false);
                    setManualDiscountInput('');
                    setManualDiscountReason('');
                  }}
                  className="flex-[2] bg-brand hover:bg-brand-hover disabled:opacity-50 text-text font-bold py-3 rounded-xl transition-all shadow-[0_4px_15px_rgba(82,82,255,0.3)]"
                >
                  Aplicar Descuento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Settings Modal */}
      {showCategorySettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg border border-border rounded-3xl w-full max-w-[400px] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-border bg-surface flex justify-between items-center">
              <div>
                <h2 className="text-xl font-display font-bold text-text">Accesos Directos</h2>
                <p className="text-sm md:text-[15px] text-muted mt-1">Elegí qué categorías mostrar en la barra del POS.</p>
              </div>
              <button onClick={() => setShowCategorySettings(false)} className="text-muted hover:text-text"><X size={20}/></button>
            </div>
            <div className="p-4 max-h-[50vh] overflow-y-auto custom-scrollbar space-y-2">
              {allCategories.map(cat => {
                const isVisible = visibleCategories.includes(cat);
                return (
                  <div key={cat} className="flex justify-between items-center bg-surface-2 border border-border rounded-xl p-3">
                    <span className="text-sm md:text-[15px] font-bold text-text">{cat}</span>
                    <button
                      onClick={async () => {
                        let newVisible = [...visibleCategories];
                        if (isVisible) {
                          newVisible = newVisible.filter(c => c !== cat);
                        } else {
                          newVisible.push(cat);
                        }
                        
                        setStoreSettings(prev => ({ ...prev, pos_categories: newVisible }));
                        
                        try {
                          await supabase
                            .from('store_settings')
                            .update({ pos_categories: newVisible })
                            .eq('user_id', owner_id);
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isVisible ? 'bg-brand' : 'bg-surface border border-border'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isVisible ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                );
              })}
              {allCategories.length === 0 && (
                <p className="text-center text-sm md:text-[15px] text-muted py-4">No hay categorías disponibles.</p>
              )}
            </div>
            <div className="p-4 bg-surface border-t border-border">
              <button 
                onClick={() => setShowCategorySettings(false)}
                className="w-full bg-brand hover:bg-brand-hover text-text font-bold py-3 rounded-xl transition-all shadow-lg"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
