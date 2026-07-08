import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, X, Loader2, Upload, CreditCard, Banknote, ChevronDown, ChevronUp } from 'lucide-react';
import DatePicker from '../components/ui/DatePicker';
import TimePicker from '../components/ui/TimePicker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useCountry } from '../context/CountryContext';
import toast from 'react-hot-toast';

export default function Purchases() {
  const { user, owner_id } = useAuth();
  const { formatCurrency } = useCountry();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortCol, setSortCol] = useState('fecha');
  const [sortDir, setSortDir] = useState('desc');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [providers, setProviders] = useState([]);
  const [providerId, setProviderId] = useState('');
  const [isNewProviderMode, setIsNewProviderMode] = useState(false);
  const [newProviderName, setNewProviderName] = useState('');

  // New Purchase state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [costo, setCosto] = useState(0);
  const [unidad, setUnidad] = useState('Unidad');
  const [updatePrices, setUpdatePrices] = useState(false);
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [fechaCompra, setFechaCompra] = useState(new Date().toISOString().split('T')[0]);
  const [horaCompra, setHoraCompra] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [barcodeInput, setBarcodeInput] = useState('');
  
  const [isNewProductMode, setIsNewProductMode] = useState(false);
  const [newProductName, setNewProductName] = useState('');

  const [precioPublico, setPrecioPublico] = useState('');
  const [productIcon, setProductIcon] = useState('📦');
  const [isUploading, setIsUploading] = useState(false);

  // Crédito / cuotas
  const [paymentMethod, setPaymentMethod] = useState('contado');
  const [numCuotas, setNumCuotas] = useState(2);
  const [cuotaDates, setCuotaDates] = useState([]);
  const [showCuotaDates, setShowCuotaDates] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPurchases();
      fetchProducts();
      fetchProviders();
    }
  }, [user]);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      // 500 compras como techo inicial — suficiente para historial visible.
      // La paginación real server-side está pendiente en el backlog técnico.
      const { data, error } = await supabase
        .from('purchases')
        .select(`*, products (name, icon), providers (nombre)`)
        .eq('user_id', owner_id)
        .order('fecha', { ascending: false })
        .limit(500);
      
      if (error) throw error;

      // employee_id → auth.users, no tiene FK con profiles.
      // Buscamos los perfiles por id para obtener el username.
      const rows = data || [];
      const employeeIds = [...new Set(rows.map(p => p.employee_id).filter(Boolean))];
      let profilesMap = {};
      if (employeeIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', employeeIds);
        (profilesData || []).forEach(p => { profilesMap[p.id] = p; });
      }

      setPurchases(rows.map(p => ({
        ...p,
        employee: profilesMap[p.employee_id] || null,
      })));
    } catch (err) {
      console.error('Error fetching purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, stock, price, icon, code')
        .eq('user_id', owner_id)
        .order('name');
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('providers')
        .select('id, nombre')
        .eq('user_id', owner_id)
        .order('nombre');
      if (!error && data) setProviders(data);
    } catch (err) {
      console.error('Error fetching providers:', err);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen.');
      return;
    }

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${owner_id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('product_images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product_images')
        .getPublicUrl(filePath);

      setProductIcon(data.publicUrl);
    } catch (err) {
      console.error('Error in upload:', err);
      toast.error('Hubo un error al subir la imagen. Asegúrate de haber ejecutado el SQL para crear el bucket "product_images".');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRegisterPurchase = async () => {
    setErrorMsg('');
    if (!selectedProductId && (!isNewProductMode || !newProductName.trim())) {
      setErrorMsg('Selecciona un producto o ingresa el nombre del nuevo.');
      return;
    }
    if (cantidad <= 0 || isNaN(cantidad)) {
      setErrorMsg('La cantidad debe ser mayor a 0.');
      return;
    }
    if (costo <= 0 || isNaN(costo)) {
      setErrorMsg('El costo debe ser mayor a 0.');
      return;
    }

    if (fechaVencimiento) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(fechaVencimiento);
      selectedDate.setMinutes(selectedDate.getMinutes() + selectedDate.getTimezoneOffset());
      
      if (selectedDate < today) {
        setErrorMsg('La fecha de vencimiento no puede estar en el pasado.');
        return;
      }
    }

    const subtotal = cantidad * costo;

    try {
      let finalProductId = selectedProductId;

      let finalProviderId = providerId;

      // -1. Si es modo nuevo proveedor, lo creamos primero
      if (isNewProviderMode && newProviderName.trim()) {
        const { data: newProv, error: provError } = await supabase.from('providers').insert([{
          nombre: newProviderName.trim(),
          user_id: owner_id
        }]).select().single();
        
        if (provError) throw provError;
        finalProviderId = newProv.id;
        setProviders(prev => [...prev, newProv]);
      }

      // 0. Si es modo nuevo, creamos el producto primero
      if (isNewProductMode) {
        const { data: newProd, error: newProdError } = await supabase.from('products').insert([{
          name: newProductName,
          code: barcodeInput || '',
          price: Number(precioPublico) || (Number(costo) * 1.3),
          stock: 0, // Se actualizará en el paso 2 con la compra
          icon: productIcon || '📦',
          provider_id: finalProviderId || null,
          unit: unidad,
          user_id: owner_id
        }]).select().single();

        if (newProdError) throw newProdError;
        finalProductId = newProd.id;
        
        // Agregar al estado local de productos (con stock 0 temporal, luego se actualiza)
        setProducts(prev => [...prev, newProd]);
      }

      // 1. Insert Purchase
      const { data: newPurchase, error: purchaseError } = await supabase
        .from('purchases')
        .insert([{
          user_id: owner_id,
          employee_id: user.id,
          product_id: finalProductId,
          cantidad: Number(cantidad),
          costo_unitario: Number(costo),
          subtotal: subtotal,
          unidad_medida: unidad,
          provider_id: finalProviderId || null,
          payment_method: paymentMethod,
        }])
        .select(`*, products (name, icon), providers (nombre)`);

      if (purchaseError) throw purchaseError;

      // 2. Update Product Stock (and optionally Price/Icon)
      // Necesitamos buscar el producto actualizado de la lista o el recién creado
      const selectedProduct = products.find(p => p.id === finalProductId) || { stock: 0, icon: productIcon };
      
      const newStock = Number(selectedProduct.stock || 0) + Number(cantidad);
      const updatePayload = { stock: newStock };
      
      if (productIcon && productIcon !== selectedProduct.icon) {
        updatePayload.icon = productIcon;
      }
      
      if (precioPublico && Number(precioPublico) > 0) {
        updatePayload.price = Number(precioPublico);
      }

      const { data: updatedProdData, error: updateError } = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', finalProductId)
        .select();

      if (updateError) throw updateError;
      if (!updatedProdData || updatedProdData.length === 0) {
         throw new Error('El producto no pudo actualizarse. Puede que no tengas permisos para modificarlo.');
      }

      // Registrar movimiento de stock
      await supabase.from('stock_movements').insert([{
        user_id: owner_id,
        product_id: finalProductId,
        tipo: 'entrada',
        cantidad: Number(cantidad),
        motivo: 'Compra de stock'
      }]);

      // Si la compra es a crédito, crear deuda + cuotas
      if (paymentMethod === 'credito') {
        const productName = isNewProductMode ? newProductName : (products.find(p => p.id === finalProductId)?.name || 'Producto');
        const { data: debtData, error: debtError } = await supabase
          .from('supplier_debts')
          .insert([{
            user_id: owner_id,
            provider_id: finalProviderId || null,
            purchase_id: newPurchase[0].id,
            total_amount: subtotal,
            paid_amount: 0,
            descripcion: `Compra: ${productName}`,
            status: 'pending',
          }])
          .select()
          .single();
        if (!debtError && debtData) {
          const baseAmount = Math.floor((subtotal / numCuotas) * 100) / 100;
          const lastAmount = Math.round((subtotal - baseAmount * (numCuotas - 1)) * 100) / 100;
          const today = new Date();
          const installments = Array.from({ length: numCuotas }, (_, i) => {
            const defaultDue = new Date(today);
            defaultDue.setDate(defaultDue.getDate() + 30 * (i + 1));
            return {
              debt_id: debtData.id,
              user_id: owner_id,
              numero: i + 1,
              monto: i === numCuotas - 1 ? lastAmount : baseAmount,
              fecha_vencimiento: cuotaDates[i] || defaultDue.toISOString().split('T')[0],
              status: 'pending',
            };
          });
          await supabase.from('supplier_debt_installments').insert(installments);
        }
      }

      // 3. Update local state
      setPurchases(prev => [newPurchase[0], ...prev]);
      setProducts(prev => prev.map(p => p.id === finalProductId ? { ...p, ...updatePayload } : p));
      
      // Close modal and reset
      setShowModal(false);
      setSelectedProductId('');
      setBarcodeInput('');
      setCantidad(1);
      setCosto(0);
      setPrecioPublico('');
      setProviderId('');
      setIsNewProviderMode(false);
      setNewProviderName('');
      setProductIcon('📦');
      setIsNewProductMode(false);
      setNewProductName('');
      setPaymentMethod('contado');
      setNumCuotas(2);
      setCuotaDates([]);
      setShowCuotaDates(false);
      setFechaCompra(new Date().toISOString().split('T')[0]);
      toast.success('Compra registrada correctamente');

    } catch (error) {
      console.error('Error registrando compra:', error);
      toast.error('Hubo un error al registrar la compra.');
    } finally { }
  };

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const filteredPurchases = useMemo(() => {
    const filtered = purchases.filter(p =>
      !searchTerm || p.products?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return [...filtered].sort((a, b) => {
      let va, vb;
      switch (sortCol) {
        case 'fecha':       va = new Date(a.fecha).getTime(); vb = new Date(b.fecha).getTime(); break;
        case 'unidad':      va = a.unidad_medida || ''; vb = b.unidad_medida || ''; break;
        case 'costo':       va = a.costo_unitario; vb = b.costo_unitario; break;
        case 'cantidad':    va = a.cantidad; vb = b.cantidad; break;
        case 'subtotal':    va = a.subtotal; vb = b.subtotal; break;
        case 'usuario':     va = a.employee?.username || ''; vb = b.employee?.username || ''; break;
        default:            return 0;
      }
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [purchases, searchTerm, sortCol, sortDir]);

  return (
    <div className="flex flex-col p-4 md:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-8 shrink-0">
        <div>
          <h1 className="text-2xl font-display font-bold text-text">Compras</h1>
          <p className="text-sm md:text-[15px] text-muted">Gestiona el historial de compras y mantené actualizado tu inventario.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            disabled
            className="bg-surface-2 border border-border text-muted font-bold py-2.5 px-5 rounded-xl transition-all text-sm md:text-[15px] flex items-center justify-center gap-2 w-full sm:w-auto cursor-not-allowed opacity-70"
            title="Función disponible próximamente en el Plan IA"
          >
            <span className="text-sm md:text-[15px] bg-brand/20 text-brand font-bold px-1.5 py-0.5 rounded uppercase tracking-widest mr-1">Pronto</span>
            Escaneo de Factura IA
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-brand hover:bg-brand-hover text-text font-bold py-2.5 px-5 rounded-xl transition-all text-sm md:text-[15px] flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Plus size={18} /> Nueva compra
          </button>
        </div>
      </div>
      
      <div className="bg-surface-2 border border-border rounded-2xl flex flex-col">
        <div className="p-4 border-b border-border bg-surface">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input
              type="text"
              placeholder="Buscar por producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-bg border border-border rounded-xl py-2 pl-10 pr-4 text-sm md:text-[15px] focus:outline-none focus:border-brand/50 transition-colors"
            />
          </div>
        </div>

        <div className="p-4 md:p-6 border-b border-border bg-surface">
          <h3 className="font-bold text-text text-sm md:text-[15px]">Historial de compras</h3>
          <p className="text-sm md:text-[15px] text-muted mt-1">Consulta las compras registradas y editalas cuando sea necesario.</p>
        </div>

        <div className="overflow-x-auto hide-scrollbar">
          <table className="w-full min-w-[640px] text-left border-collapse">
            <thead className="bg-surface sticky top-0 z-10">
              <tr>
                <th className="p-4 font-display font-semibold text-sm md:text-[15px] tracking-wider text-muted uppercase border-b border-border">Producto</th>
                {[
                  { col: 'fecha',    label: 'Fecha',         align: '' },
                  { col: 'unidad',   label: 'Unidad',        align: '' },
                  { col: 'costo',    label: 'Costo unitario',align: 'text-right' },
                  { col: 'cantidad', label: 'Cantidad',      align: 'text-center' },
                  { col: 'subtotal', label: 'Subtotal',      align: 'text-right' },
                ].map(({ col, label, align }) => (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className={`p-4 font-display font-semibold text-sm md:text-[15px] tracking-wider text-muted uppercase border-b border-border cursor-pointer select-none hover:text-text transition-colors ${align}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {label}
                      <span className="flex flex-col leading-[0] ml-0.5">
                        <ChevronUp size={12} className={sortCol === col && sortDir === 'asc' ? 'text-brand' : 'text-muted opacity-40'} />
                        <ChevronDown size={12} className={sortCol === col && sortDir === 'desc' ? 'text-brand' : 'text-muted opacity-40'} />
                      </span>
                    </span>
                  </th>
                ))}
                <th className="p-4 font-display font-semibold text-sm md:text-[15px] tracking-wider text-muted uppercase border-b border-border">Pago</th>
                <th
                  onClick={() => handleSort('usuario')}
                  className="p-4 font-display font-semibold text-sm md:text-[15px] tracking-wider text-muted uppercase border-b border-border cursor-pointer select-none hover:text-text transition-colors"
                >
                  <span className="inline-flex items-center gap-1">
                    Usuario
                    <span className="flex flex-col leading-[0] ml-0.5">
                      <ChevronUp size={12} className={sortCol === 'usuario' && sortDir === 'asc' ? 'text-brand' : 'text-muted opacity-40'} />
                      <ChevronDown size={12} className={sortCol === 'usuario' && sortDir === 'desc' ? 'text-brand' : 'text-muted opacity-40'} />
                    </span>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-12 text-center">
                    <Loader2 className="animate-spin text-brand mx-auto" size={32} />
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-12 text-center text-dim text-sm md:text-[15px]">
                    No encontramos compras para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map(p => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-surface transition-colors">
                    <td className="px-4 py-4 font-bold text-text">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-surface-2 border border-border flex items-center justify-center shrink-0 overflow-hidden text-lg">
                          {p.products?.icon?.startsWith('http') ? (
                            <img src={p.products.icon} alt={p.products.name} className="w-full h-full object-cover" />
                          ) : (
                            p.products?.icon || '📦'
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span>{p.products?.name || 'Desconocido'}</span>
                          {p.providers?.nombre && <span className="text-sm md:text-[15px] text-dim font-normal">Prov: {p.providers.nombre}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-muted">{new Date(p.fecha).toLocaleDateString()}</td>
                    <td className="px-4 py-4 text-muted">{p.unidad_medida}</td>
                    <td className="px-4 py-4 text-right text-muted">{formatCurrency(p.costo_unitario)}</td>
                    <td className="px-4 py-4 text-center font-bold text-text">{p.cantidad}</td>
                    <td className="px-4 py-4 text-right font-bold text-brand">{formatCurrency(p.subtotal)}</td>
                    <td className="px-4 py-4 text-muted">
                      {p.payment_method === 'credito' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-400">
                          <CreditCard size={10} /> Crédito
                        </span>
                      ) : (
                        <span className="text-muted text-[11px]">Contado</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-muted">{p.employee?.username || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nueva Compra Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button
              onClick={() => { setShowModal(false); setErrorMsg(''); setPaymentMethod('contado'); setNumCuotas(2); setCuotaDates([]); setShowCuotaDates(false); }}
              className="absolute top-4 right-4 text-dim hover:text-text transition-colors"
            >
              <X size={18} />
            </button>
            
            <div className="p-4 md:p-6 border-b border-border bg-surface">
              <h2 className="text-lg font-display font-bold text-text mb-1">Nueva compra</h2>
              <p className="text-sm md:text-[15px] text-muted">Registrá la compra para sumar stock automáticamente.</p>
            </div>

            <div className="p-4 md:p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-sm md:text-[15px] font-medium text-text mb-2">Escanear o Escribir Código de Barras</label>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="Escaneá o escribí el código..."
                    value={barcodeInput}
                    autoFocus
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const code = barcodeInput.trim();
                        if (!code) return;
                        const match = products.find(p => p.code === code);
                        if (match) {
                          setSelectedProductId(match.id);
                          setProductIcon(match.icon || '📦');
                          setPrecioPublico(match.price || '');
                          setIsNewProductMode(false);
                          setBarcodeInput(match.code || '');
                        } else {
                          setIsNewProductMode(true);
                          setSelectedProductId('');
                          setProductIcon('📦');
                          setPrecioPublico('');
                          setNewProductName('');
                        }
                      }
                    }}
                    className="flex-1 bg-bg border border-mipos-green/30 rounded-lg py-2.5 px-4 text-sm md:text-[15px] focus:outline-none focus:border-mipos-green text-text transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const code = barcodeInput.trim();
                      if (!code) return;
                      const match = products.find(p => p.code === code);
                      if (match) {
                        setSelectedProductId(match.id);
                        setProductIcon(match.icon || '📦');
                        setPrecioPublico(match.price || '');
                        setIsNewProductMode(false);
                        setBarcodeInput(match.code || '');
                      } else {
                        setIsNewProductMode(true);
                        setSelectedProductId('');
                        setProductIcon('📦');
                        setPrecioPublico('');
                        setNewProductName('');
                      }
                    }}
                    className="bg-brand/20 hover:bg-brand/30 text-brand border border-mipos-green/50 font-bold py-2.5 px-4 rounded-lg text-sm md:text-[15px] transition-colors"
                  >
                    Buscar
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm md:text-[15px] font-medium text-text mb-2">O seleccionar manualmente</label>
                <div className="relative">
                  <select 
                    value={isNewProductMode ? '__NEW__' : selectedProductId}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__NEW__') {
                        setIsNewProductMode(true);
                        setSelectedProductId('');
                        setProductIcon('📦');
                        setPrecioPublico('');
                        setNewProductName('');
                        setBarcodeInput('');
                        setProviderId('');
                        setIsNewProviderMode(false);
                        setNewProviderName('');
                      } else {
                        setSelectedProductId(val);
                        setIsNewProductMode(false);
                        const p = products.find(prod => prod.id === val);
                        if (p) {
                          setProductIcon(p.icon || '📦');
                          setPrecioPublico(p.price || '');
                          setBarcodeInput(p.code || '');
                        }
                      }
                    }}
                    className="w-full bg-surface-2 border border-border rounded-lg py-2.5 px-4 text-sm md:text-[15px] focus:outline-none focus:border-brand/50 text-text transition-colors appearance-none"
                  >
                    <option value="" disabled={isNewProductMode}>Selecciona un producto...</option>
                    <option value="__NEW__" className="text-brand font-bold">+ Crear Producto Nuevo</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {(selectedProductId || isNewProductMode) && (
                <div className="flex flex-col gap-4 mt-4 animate-in fade-in slide-in-from-top-2">
                  {isNewProductMode && (
                    <div>
                      <label className="block text-sm md:text-[15px] font-bold text-brand mb-2">Nombre del Nuevo Producto *</label>
                      <input 
                        type="text" 
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        placeholder="Ej. Alfajor Havanna"
                        className="w-full bg-surface-2 border border-brand/50 rounded-lg py-2.5 px-4 text-sm md:text-[15px] focus:outline-none focus:border-brand text-text transition-colors"
                      />
                    </div>
                  )}

                  <div className="flex gap-4 items-start">
                  <div className="w-16 shrink-0 flex flex-col gap-2">
                    <label className="block text-sm md:text-[15px] font-medium text-text mb-0 text-center" title="Adjunta una imagen o usa un Emoji">Imagen</label>
                    <div className="relative group w-16 h-16 bg-surface-2 border border-dashed border-border hover:border-brand/50 rounded-lg flex items-center justify-center overflow-hidden cursor-pointer transition-colors">
                      {isUploading ? (
                        <Loader2 size={20} className="text-brand animate-spin" />
                      ) : productIcon.startsWith('http') ? (
                        <>
                          <img src={productIcon} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                             <Upload size={16} className="text-text" />
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-1 pointer-events-none">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-dim"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                          <span className="text-[9px] text-muted uppercase font-bold tracking-wider">Subir</span>
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        title="Subir foto del producto"
                      />
                    </div>
                    <input 
                      type="text"
                      value={productIcon.startsWith('http') ? '' : productIcon}
                      onChange={(e) => setProductIcon(e.target.value)}
                      placeholder="o Emoji"
                      maxLength={2}
                      className="w-16 bg-surface-2 border border-border rounded-lg py-1 px-1 text-center text-sm md:text-[15px] focus:outline-none focus:border-brand/50 text-text"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm md:text-[15px] font-medium text-text mb-2">Proveedor de esta compra</label>
                    <select
                      value={isNewProviderMode ? '__NEW__' : providerId}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__NEW__') {
                          setIsNewProviderMode(true);
                          setProviderId('');
                        } else {
                          setIsNewProviderMode(false);
                          setProviderId(val);
                        }
                      }}
                      className="w-full bg-surface-2 border border-border rounded-lg py-2.5 px-4 text-sm md:text-[15px] focus:outline-none focus:border-brand/50 text-text transition-colors appearance-none"
                    >
                      <option value="">-- Sin proveedor --</option>
                      <option value="__NEW__" className="text-brand font-bold">+ Agregar Proveedor Nuevo</option>
                      {providers.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                    {isNewProviderMode && (
                      <input 
                        type="text" 
                        value={newProviderName}
                        onChange={(e) => setNewProviderName(e.target.value)}
                        placeholder="Nombre del nuevo proveedor"
                        className="w-full bg-bg border border-brand/50 rounded-lg py-2.5 px-4 text-sm md:text-[15px] focus:outline-none focus:border-brand text-text transition-colors mt-3 animate-in fade-in"
                      />
                    )}
                  </div>
                </div>
              </div>
              )}

              {/* Método de pago */}
              <div>
                <label className="block text-sm md:text-[15px] font-medium text-text mb-2">Método de pago</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('contado')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border text-sm md:text-[15px] font-medium transition-colors ${paymentMethod === 'contado' ? 'border-brand bg-brand/10 text-brand' : 'border-border text-muted hover:border-brand/30'}`}
                  >
                    <Banknote size={15} /> Contado
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('credito')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border text-sm md:text-[15px] font-medium transition-colors ${paymentMethod === 'credito' ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-border text-muted hover:border-amber-500/30'}`}
                  >
                    <CreditCard size={15} /> A crédito
                  </button>
                </div>
              </div>

              {/* Configuración de cuotas */}
              {paymentMethod === 'credito' && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 animate-in fade-in slide-in-from-top-1">
                  <p className="text-sm md:text-[15px] font-bold text-amber-400 mb-3">Configurar cuotas</p>
                  <div className="mb-3">
                    <label className="block text-sm md:text-[15px] font-medium text-text mb-2">Cantidad de cuotas</label>
                    <div className="relative">
                      <select
                        value={numCuotas}
                        onChange={(e) => { setNumCuotas(Number(e.target.value)); setCuotaDates([]); }}
                        className="w-full bg-surface-2 border border-amber-500/40 rounded-lg py-2.5 pl-4 pr-10 text-sm md:text-[15px] font-semibold text-amber-400 focus:outline-none focus:border-amber-500 transition-colors appearance-none cursor-pointer"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                          <option key={n} value={n}>{n} {n === 1 ? 'cuota' : 'cuotas'}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-amber-500">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  {cantidad > 0 && costo > 0 && (
                    <div className="text-sm md:text-[15px] text-muted mb-3">
                      Cuota estimada: <span className="font-bold text-text">{formatCurrency((cantidad * costo) / numCuotas)}</span> × {numCuotas}
                    </div>
                  )}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowCuotaDates(v => !v)}
                      className="flex items-center gap-1.5 text-sm md:text-[15px] text-dim hover:text-amber-400 transition-colors"
                    >
                      <svg className={`w-3.5 h-3.5 transition-transform ${showCuotaDates ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                      Personalizar fechas de vencimiento
                    </button>
                    {showCuotaDates && (
                      <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-1">
                        {Array.from({ length: numCuotas }, (_, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-dim w-8 shrink-0">#{i + 1}</span>
                            <DatePicker
                              value={cuotaDates[i] || ''}
                              onChange={(v) => {
                                const newDates = [...cuotaDates];
                                newDates[i] = v;
                                setCuotaDates(newDates);
                              }}
                              size="sm"
                              className="flex-1"
                            />
                          </div>
                        ))}
                        <p className="text-[11px] text-dim pt-1">Si no completás las fechas, se calculan automáticamente cada 30 días.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm md:text-[15px] font-medium text-text mb-2">Cantidad</label>
                  <input 
                    type="number" 
                    value={cantidad}
                    onChange={(e) => {
                      setCantidad(e.target.value);
                      setErrorMsg('');
                    }}
                    min="1"
                    className={`w-full bg-surface-2 border rounded-lg py-2.5 px-4 text-sm md:text-[15px] focus:outline-none transition-colors ${errorMsg.includes('cantidad') ? 'border-red-500 focus:border-red-500 text-text' : 'border-brand/30 focus:border-brand text-text'}`}
                  />
                </div>
                <div>
                  <label className="block text-sm md:text-[15px] font-medium text-text mb-2">Costo unitario ($)</label>
                  <input 
                    type="number" 
                    value={costo}
                    onChange={(e) => {
                      setCosto(e.target.value);
                      setErrorMsg('');
                    }}
                    min="0.01"
                    step="0.01"
                    className={`w-full bg-surface-2 border rounded-lg py-2.5 px-4 text-sm md:text-[15px] focus:outline-none transition-colors ${errorMsg.includes('costo') ? 'border-red-500 focus:border-red-500 text-text' : 'border-border focus:border-brand/50 text-text'}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm md:text-[15px] font-medium text-text mb-2">Unidad de medida</label>
                  <select 
                    value={unidad}
                    onChange={(e) => setUnidad(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-lg py-2.5 px-4 text-sm md:text-[15px] focus:outline-none focus:border-brand/50 text-text transition-colors appearance-none"
                  >
                    <option>Unidad</option>
                    <option>Caja</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm md:text-[15px] font-medium text-text mb-2">Fecha y hora</label>
                  <div className="flex flex-col gap-2">
                    <DatePicker value={fechaCompra} onChange={setFechaCompra} placeholder="Fecha de compra" />
                    <TimePicker value={horaCompra} onChange={setHoraCompra} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm md:text-[15px] font-medium text-text mb-2">Fecha de vencimiento (opcional)</label>
                <DatePicker
                  value={fechaVencimiento}
                  onChange={(v) => { setFechaVencimiento(v); setErrorMsg(''); }}
                  placeholder="Sin vencimiento"
                  error={errorMsg.includes('vencimiento') || errorMsg.includes('pasado')}
                />
              </div>

              {errorMsg && (
                <div className="text-red-400 text-sm md:text-[15px] font-medium">{errorMsg}</div>
              )}

              {(selectedProductId || isNewProductMode) && (
                <div className="bg-surface-2 border border-border p-4 rounded-lg mt-2 animate-in fade-in">
                  <label className="block text-sm md:text-[15px] font-bold text-text mb-2">Precio de Venta al Público ($)</label>
                  <input 
                    type="number" 
                    value={precioPublico}
                    onChange={(e) => setPrecioPublico(e.target.value)}
                    placeholder={isNewProductMode ? "Opcional. Se calcula +30% por defecto." : "Dejar en blanco para no modificar"}
                    className="w-full bg-bg border border-border rounded-lg py-2.5 px-4 text-sm md:text-[15px] focus:outline-none focus:border-brand text-text"
                  />
                  <p className="text-sm md:text-[15px] text-muted mt-2">
                    {isNewProductMode 
                      ? "Si lo dejas en blanco, se sumará un 30% al costo unitario para el precio de venta."
                      : "Ajusta el precio del catálogo usando los valores de esta compra. Si lo dejas vacío, mantenemos el precio actual."}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border bg-surface flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm md:text-[15px] font-bold text-text flex gap-2">
                Subtotal: <span className="text-brand">{formatCurrency(cantidad * costo)}</span>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button 
                  onClick={() => { setShowModal(false); setErrorMsg(''); setPaymentMethod('contado'); setNumCuotas(2); setCuotaDates([]); setShowCuotaDates(false); }}
                  className="px-4 py-2 text-sm md:text-[15px] font-medium text-text hover:bg-surface-2 border border-transparent hover:border-border rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleRegisterPurchase}
                  className="bg-brand hover:bg-brand-hover text-text font-bold py-2 px-5 rounded-lg transition-all text-sm md:text-[15px] shadow-[0_4px_15px_rgba(82,82,255,0.3)]"
                >
                  Registrar compra
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
