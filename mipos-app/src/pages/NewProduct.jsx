import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, Upload, Lock, Tag, Package, BarChart2, DollarSign, TrendingUp, AlertTriangle, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useCountry } from '../context/CountryContext';
import toast from 'react-hot-toast';

const PAGE_SIZE = 10;

// Normaliza tildes y devuelve las palabras limpias
const toWords = (str) =>
  str.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().split(/\s+/).filter(w => w.length > 0);

// Arma el query FTS de Supabase con wildcards parciales
const toFtsQuery = (str) => toWords(str).map(w => `${w}:*`).join(' & ');

export default function NewProduct() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { countryConfig } = useCountry();

  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [existingCategories, setExistingCategories] = useState([]);
  const [providers, setProviders] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: '',
    provider: '',
    unitType: 'Unitario',
    isActive: true,
    stock: 0,
    icon: '📦',
    stockAlert: 5,
    expiryDate: '',
    cost: 0,
    price: 0
  });

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingOff, setIsSearchingOff] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreSuggestions, setHasMoreSuggestions] = useState(false);
  const [suggestionsOffset, setSuggestionsOffset] = useState(0);
  const [debouncedName, setDebouncedName] = useState('');
  const [existingProduct, setExistingProduct] = useState(null);
  const [autoFilledCode, setAutoFilledCode] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const codeParam = params.get('code');
    if (codeParam) setFormData(prev => ({ ...prev, code: codeParam }));

    const fetchCategories = async () => {
      try {
        const { data } = await supabase.from('products').select('category').not('category', 'is', null);
        if (data) setExistingCategories([...new Set(data.map(d => d.category).filter(Boolean))]);
      } catch (e) {}
    };

    const fetchProviders = async () => {
      try {
        const { data } = await supabase.from('providers').select('id, nombre').order('nombre');
        if (data) setProviders(data);
      } catch (e) {}
    };

    fetchCategories();
    fetchProviders();
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedName(formData.name), 500);
    return () => clearTimeout(timer);
  }, [formData.name]);

  useEffect(() => {
    const searchOFF = async () => {
      if (!debouncedName || debouncedName.length < 3 || !showSuggestions) {
        setSuggestions([]); setSuggestionsOffset(0); setHasMoreSuggestions(false); return;
      }
      setIsSearchingOff(true);
      try {
        const words = toWords(debouncedName);
        const ftsQuery = toFtsQuery(debouncedName);

        // Query 1: FTS sobre product_name (rápida, usa índice GIN)
        const ftsPromise = supabase
          .from('off_products').select('barcode, product_name, image_url, brands')
          .textSearch('fts', ftsQuery, { config: 'spanish' })
          .range(0, PAGE_SIZE - 1);

        // Query 2: cross-field — cada palabra puede ser brand, el resto va al nombre
        // "SURTIDO LIA" → prueba name ilike %surtido% AND brands ilike %lia%
        //                   Y también name ilike %lia% AND brands ilike %surtido%
        const brandPromises = words.length > 1
          ? words.map((brandWord, i) => {
              const namePattern = words.filter((_, j) => j !== i).map(w => `%${w}%`).join('');
              return supabase
                .from('off_products').select('barcode, product_name, image_url, brands')
                .ilike('brands', `%${brandWord}%`)
                .ilike('product_name', namePattern)
                .range(0, 5);
            })
          : [];

        const [ftsResult, ...brandResults] = await Promise.all([ftsPromise, ...brandPromises]);
        if (ftsResult.error) { console.error(ftsResult.error); return; }

        const seen = new Set();
        const toRow = p => ({ code: p.barcode, product_name: p.product_name, image_thumb_url: p.image_url, brands: p.brands });
        const allRows = [
          ...(ftsResult.data || []),
          ...brandResults.flatMap(r => r.data || [])
        ].filter(p => { if (!p.barcode || seen.has(p.barcode)) return false; seen.add(p.barcode); return true; });

        const fmt = allRows.map(toRow);
        setSuggestions(fmt);
        setSuggestionsOffset(ftsResult.data?.length ?? 0); // paginación solo sobre FTS
        setHasMoreSuggestions((ftsResult.data?.length ?? 0) === PAGE_SIZE);
      } catch (e) { console.error(e); }
      finally { setIsSearchingOff(false); }
    };
    searchOFF();
  }, [debouncedName, showSuggestions]);

  const loadMoreSuggestions = async () => {
    if (isLoadingMore || !hasMoreSuggestions || !debouncedName || debouncedName.length < 3) return;
    setIsLoadingMore(true);
    try {
      const { data, error } = await supabase
        .from('off_products').select('barcode, product_name, image_url, brands')
        .textSearch('fts', toFtsQuery(debouncedName), { config: 'spanish' })
        .range(suggestionsOffset, suggestionsOffset + PAGE_SIZE - 1);

      if (error) { console.error(error); return; }

      const fmt = (data || []).map(p => ({ code: p.barcode, product_name: p.product_name, image_thumb_url: p.image_url, brands: p.brands }));
      setSuggestions(prev => [...prev, ...fmt]);
      setSuggestionsOffset(prev => prev + fmt.length);
      setHasMoreSuggestions(fmt.length === PAGE_SIZE);
    } catch (e) { console.error(e); }
    finally { setIsLoadingMore(false); }
  };

  const checkExistingProduct = async (code) => {
    if (!code || !user) return null;
    try {
      const { data } = await supabase.from('products').select('*').eq('user_id', user.id).eq('code', code).limit(1);
      return data && data.length > 0 ? data[0] : null;
    } catch { return null; }
  };

  const applyExistingProduct = (existing) => {
    setExistingProduct(existing);
    setFormData(prev => ({
      ...prev,
      name: existing.name,
      category: existing.category || '',
      provider: existing.provider_id || '',
      unitType: existing.unit || 'Unitario',
      price: existing.price || 0,
      icon: existing.icon || '📦',
    }));
    toast('Este código ya existe en tu catálogo. Los datos fueron completados automáticamente.', { icon: '⚠️' });
  };

  const handleCodeBlur = async () => {
    if (!formData.code || formData.code.length < 3) return;
    const existing = await checkExistingProduct(formData.code);
    if (existing) { applyExistingProduct(existing); setAutoFilledCode(formData.code); return; }
    setExistingProduct(null);
    if (formData.code.length < 5) return;
    try {
      const res = await fetch(`https://${countryConfig.off.domain}/api/v2/product/${formData.code}.json`, {
        headers: { 'User-Agent': 'mipos-App - Web - Version 1.0' }
      });
      const data = await res.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        setFormData(prev => ({
          ...prev,
          name: prev.name || p.product_name || p.product_name_es || '',
          icon: prev.icon === '📦' ? (p.image_front_thumb_url || p.image_thumb_url || '📦') : prev.icon
        }));
        if (p.product_name || p.image_front_thumb_url) {
          toast.success('Información autocompletada con éxito');
          setAutoFilledCode(formData.code);
        }
      }
    } catch (e) { console.error(e); }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Por favor selecciona un archivo de imagen.'); return; }
    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('product_images').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('product_images').getPublicUrl(filePath);
      setFormData(prev => ({ ...prev, icon: data.publicUrl }));
    } catch (error) {
      console.error(error);
      toast.error('Error al subir la imagen.');
    } finally { setIsUploading(false); }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };


  const getUnitName = () => {
    switch (formData.unitType) {
      case 'kg': return 'kilo'; case 'gr': return 'gramo';
      case 'litros': return 'litro'; case 'ml': return 'mililitro';
      default: return 'unidad';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('products').insert([{
        name: formData.name, code: formData.code,
        category: formData.category || 'Otros', unit: formData.unitType,
        price: parseFloat(formData.price), stock: parseInt(formData.stock),
        icon: formData.icon || '📦', provider_id: formData.provider || null, user_id: user.id
      }]);
      if (error) throw error;
      toast.success('Producto creado exitosamente');
      navigate('/inventory');
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar el producto');
    } finally { setLoading(false); }
  };

  const inputCls = "w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-text text-sm focus:outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/10 transition-all placeholder:text-dim";
  const selectCls = `${inputCls} appearance-none`;
  const labelCls = "block text-xs font-medium text-muted mb-1.5";

  return (
    <div className="flex flex-col min-h-full bg-bg">

      {/* ── Compact Header ── */}
      <div className="sticky top-0 z-20 bg-surface/90 backdrop-blur-md border-b border-border px-5 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/inventory')}
          className="flex items-center gap-1.5 text-muted hover:text-text transition-colors text-sm"
        >
          <ArrowLeft size={14} />
          <span>Inventario</span>
        </button>
        <span className="text-border">·</span>
        <h1 className="text-sm font-semibold text-text">Nuevo Producto</h1>
      </div>

      <div className="flex-1 flex gap-5 p-5 md:p-6 items-start">
      <form onSubmit={handleSubmit} className="flex-1 min-w-0 grid grid-cols-1 lg:grid-cols-2 gap-5 content-start">

          {/* Section: Identidad — imagen + campos + preview inline */}
          <section className="bg-surface rounded-2xl border border-border p-5 lg:col-span-2">
            <SectionHeader icon={<Tag size={12} />} label="Identidad del producto" />

            {/* Fila principal: imagen | campos */}
            <div className="flex gap-4 mt-4">

              {/* Imagen + emoji */}
              <div className="flex flex-col gap-2 shrink-0">
                <div className="relative group w-16 h-16 bg-bg rounded-xl border border-border hover:border-brand/50 transition-all overflow-hidden cursor-pointer">
                  {isUploading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 size={16} className="text-brand animate-spin" />
                    </div>
                  ) : formData.icon?.startsWith('http') ? (
                    <>
                      <img src={formData.icon} alt="" className="w-full h-full object-contain p-1" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                        <Upload size={13} className="text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl select-none">{formData.icon || '📦'}</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleImageUpload} disabled={isUploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
                <input
                  type="text"
                  value={formData.icon?.startsWith('http') ? '' : formData.icon}
                  onChange={(e) => setFormData(p => ({ ...p, icon: e.target.value }))}
                  placeholder="📦"
                  maxLength={2}
                  title="Emoji del producto"
                  className="w-16 h-7 bg-bg border border-border rounded-lg text-center text-base focus:outline-none focus:border-brand/50 text-text"
                />
              </div>

              {/* Campos nombre + código */}
              <div className="flex-1 flex flex-col gap-3 min-w-0">
                {/* Name */}
                <div className="relative" ref={dropdownRef}>
                  <label className={`${labelCls} flex items-center gap-1.5`}>
                    Nombre <span className="text-brand">*</span>
                    {existingProduct && <Lock size={11} className="text-warning" />}
                  </label>
                  <input
                    type="text" name="name" required
                    value={formData.name}
                    disabled={!!existingProduct}
                    onChange={(e) => { handleChange(e); setShowSuggestions(true); }}
                    onFocus={() => { if (!existingProduct) setShowSuggestions(true); }}
                    placeholder="Ej. Coca Cola 2.25L"
                    autoComplete="off"
                    className={`${inputCls} ${existingProduct ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                  {existingProduct && (
                    <p className="mt-1 text-xs text-warning">Nombre bloqueado — cambiá el código</p>
                  )}
                  {/* Suggestions dropdown */}
                  {!existingProduct && showSuggestions && (debouncedName.length >= 3 || isSearchingOff) && (
                    <div
                      className="absolute z-30 left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-2xl max-h-56 overflow-y-auto"
                      onScroll={(e) => {
                        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                        if (scrollHeight - scrollTop <= clientHeight + 30 && hasMoreSuggestions && !isLoadingMore && !isSearchingOff) loadMoreSuggestions();
                      }}
                    >
                      {isSearchingOff ? (
                        <div className="p-3 text-center text-xs text-muted flex items-center justify-center gap-2">
                          <Loader2 size={13} className="animate-spin" /> Buscando...
                        </div>
                      ) : suggestions.length > 0 ? (
                        <>
                          {suggestions.map((p, idx) => (
                            <div key={idx}
                              className="px-3 py-2.5 hover:bg-bg cursor-pointer border-b border-border last:border-0 flex items-center gap-3 transition-colors"
                              onClick={async () => {
                                const code = p.code || formData.code;
                                if (code) {
                                  const ex = await checkExistingProduct(code);
                                  if (ex) { applyExistingProduct(ex); setFormData(prev => ({ ...prev, code })); setShowSuggestions(false); return; }
                                }
                                setExistingProduct(null);
                                setFormData(prev => ({ ...prev, name: p.product_name || prev.name, code: p.code || prev.code, icon: p.image_thumb_url || prev.icon }));
                                setShowSuggestions(false);
                              }}
                            >
                              <div className="w-8 h-8 shrink-0 bg-white rounded-lg border border-border overflow-hidden flex items-center justify-center">
                                {p.image_thumb_url ? <img src={p.image_thumb_url} alt="" className="w-full h-full object-cover" /> : <span className="text-base">📦</span>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold text-text truncate">{p.product_name || 'Sin nombre'}</div>
                                <div className="text-[11px] text-muted truncate">
                                  {p.brands ? (Array.isArray(p.brands) ? p.brands.join(', ') : p.brands) + ' · ' : ''}{p.code}
                                </div>
                              </div>
                            </div>
                          ))}
                          {isLoadingMore && <div className="p-2 text-center text-xs text-muted flex items-center justify-center gap-1"><Loader2 size={11} className="animate-spin" /> Cargando...</div>}
                          {!hasMoreSuggestions && !isLoadingMore && <div className="p-1.5 text-center text-[11px] text-dim">{suggestions.length} resultado{suggestions.length !== 1 ? 's' : ''}</div>}
                        </>
                      ) : debouncedName.length >= 3 ? (
                        <div className="p-3 flex items-center justify-between text-xs text-muted">
                          Sin sugerencias
                          <button type="button" onClick={() => setShowSuggestions(false)} className="text-brand font-semibold">Cerrar</button>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Code */}
                <div>
                  <label className={labelCls}>Código de barra / SKU <span className="text-brand">*</span></label>
                  <input
                    type="text" name="code" required
                    value={formData.code}
                    onChange={(e) => {
                      if (autoFilledCode && e.target.value !== autoFilledCode) {
                        setFormData(prev => ({ ...prev, code: e.target.value, name: '', icon: '📦' }));
                        setAutoFilledCode(null);
                        setExistingProduct(null);
                        return;
                      }
                      handleChange(e);
                      if (existingProduct) setExistingProduct(null);
                    }}
                    onBlur={handleCodeBlur}
                    placeholder="7790001234567"
                    className={inputCls}
                  />
                  {existingProduct && (
                    <p className="mt-1.5 text-xs text-warning flex items-center gap-1.5">
                      ⚠️ Ya registrado
                      <button type="button" onClick={() => { setExistingProduct(null); setFormData(p => ({ ...p, code: '', name: '', icon: '📦' })); }}
                        className="text-brand underline font-medium">Limpiar</button>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Preview strip — nombre · código · precio */}
            {(formData.name || formData.price > 0) && (
              <div className="mt-4 pt-4 border-t border-border flex items-center gap-3">
                <div className="w-8 h-8 shrink-0 bg-bg rounded-lg border border-border overflow-hidden flex items-center justify-center">
                  {formData.icon?.startsWith('http')
                    ? <img src={formData.icon} alt="" className="w-full h-full object-contain p-0.5" />
                    : <span className="text-base">{formData.icon || '📦'}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-text truncate block">{formData.name || '—'}</span>
                  {formData.code && <span className="text-[11px] text-muted font-mono">{formData.code}</span>}
                </div>
                <span className={`text-base font-bold font-display shrink-0 ${formData.price > 0 ? 'text-brand' : 'text-dim'}`}>
                  ${formData.price > 0 ? formData.price : '—'}
                </span>
                {parseInt(formData.stock) > 0 && (
                  <span className="text-[10px] bg-brand/10 text-brand px-1.5 py-0.5 rounded-full font-semibold shrink-0">
                    {formData.stock} u
                  </span>
                )}
              </div>
            )}
          </section>

          {/* Section: Clasificación */}
          <section className="bg-surface rounded-2xl border border-border p-5">
            <SectionHeader icon={<Package size={12} />} label="Clasificación" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">

              <div>
                <label className={labelCls}>Categoría</label>
                {isNewCategory ? (
                  <div className="flex gap-2">
                    <input type="text" name="category" value={formData.category} onChange={handleChange}
                      placeholder="Nueva categoría..." autoFocus className={`${inputCls} flex-1`} />
                    <button type="button" onClick={() => { setIsNewCategory(false); setFormData(p => ({ ...p, category: '' })); }}
                      className="px-3 bg-surface-2 border border-border rounded-xl text-muted hover:text-text text-sm transition-colors">✕</button>
                  </div>
                ) : (
                  <select name="category" value={formData.category}
                    onChange={(e) => { if (e.target.value === '__NEW__') { setIsNewCategory(true); setFormData(p => ({ ...p, category: '' })); } else { handleChange(e); } }}
                    className={selectCls}>
                    <option value="">Sin categoría</option>
                    {existingCategories.map((cat, i) => <option key={i} value={cat}>{cat}</option>)}
                    <option value="__NEW__">+ Nueva categoría...</option>
                  </select>
                )}
              </div>

              <div>
                <label className={labelCls}>Proveedor</label>
                <select name="provider" value={formData.provider} onChange={handleChange} className={selectCls}>
                  <option value="">Sin proveedor</option>
                  {providers.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className={labelCls}>Unidad de medida</label>
                <select name="unitType" value={formData.unitType} onChange={handleChange} className={selectCls}>
                  <option value="unidades">Unidades (u)</option>
                  <option value="kg">Kilogramos (kg)</option>
                  <option value="gr">Gramos (gr)</option>
                  <option value="litros">Litros (L)</option>
                  <option value="ml">Mililitros (ml)</option>
                </select>
              </div>
            </div>
          </section>

          {/* Section: Stock */}
          <section className="bg-surface rounded-2xl border border-border p-5">
            <SectionHeader icon={<BarChart2 size={12} />} label="Stock" />
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className={labelCls}>Cantidad inicial <span className="text-brand">*</span></label>
                <input type="number" name="stock" required min="0" value={formData.stock}
                  onChange={handleChange} onFocus={(e) => e.target.select()} className={inputCls} />
                <p className="mt-1.5 text-[11px] text-dim">En {formData.unitType === 'unidades' ? 'unidades' : formData.unitType}</p>
              </div>
              <div>
                <label className={labelCls}>Alerta de stock bajo</label>
                <input type="number" name="stockAlert" min="0" value={formData.stockAlert}
                  onChange={handleChange} onFocus={(e) => e.target.select()} className={inputCls} />
                <p className="mt-1.5 text-[11px] text-dim">Notificá cuando baje de este número</p>
              </div>
            </div>
          </section>

          {/* Section: Precios */}
          <section className="bg-surface rounded-2xl border border-brand/20 p-5 lg:col-span-2">
            <SectionHeader icon={<DollarSign size={12} />} label="Precios" accent />
            <div className="grid grid-cols-2 gap-4 mt-4">

              <div>
                <label className={labelCls}>
                  Precio de compra
                  <span className="text-dim font-normal ml-1 text-[11px]">(proveedor)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm pointer-events-none">$</span>
                  <input type="number" name="cost" min="0" step="0.01" value={formData.cost}
                    onChange={handleChange} onFocus={(e) => e.target.select()}
                    className={`${inputCls} pl-7`} />
                </div>
                <p className="mt-1.5 text-[11px] text-dim">Lo que pagás vos</p>
              </div>

              <div>
                <label className={`${labelCls} text-brand`}>
                  Precio al público <span className="text-brand">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand text-sm font-bold pointer-events-none">$</span>
                  <input type="number" name="price" required min="0" step="0.01" value={formData.price}
                    onChange={handleChange} onFocus={(e) => e.target.select()}
                    className="w-full bg-brand/5 border border-brand/30 rounded-xl pl-7 pr-4 py-2.5 text-text text-sm font-bold focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all" />
                </div>
                <p className="mt-1.5 text-[11px] text-dim">Lo que ve el cliente</p>
              </div>
            </div>

            {/* Ganancia calculada */}
            {(() => {
              const cost = parseFloat(formData.cost);
              const price = parseFloat(formData.price);
              if (!cost || !price) return null;
              const profit = price - cost;
              const margin = ((profit / cost) * 100).toFixed(1);
              const isLoss = price < cost;
              return (
                <div className={`mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl border ${
                  isLoss ? 'bg-red-500/8 border-red-500/20' : 'bg-green-500/8 border-green-500/20'
                }`}>
                  {isLoss
                    ? <AlertTriangle size={14} className="text-red-500 shrink-0" />
                    : <TrendingUp size={14} className="text-green-500 shrink-0" />
                  }
                  <span className={`text-sm ${isLoss ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                    {isLoss
                      ? `Estás vendiendo a pérdida (−${Math.abs(parseFloat(margin))}%)`
                      : `Ganancia: ${margin}% (+$${profit.toFixed(2)} por ${getUnitName()})`
                    }
                  </span>
                </div>
              );
            })()}
          </section>

          {/* ── Actions ── */}
          <div className="flex items-center justify-between pb-10 lg:col-span-2">
            <button type="button" onClick={() => navigate('/inventory')}
              className="text-sm text-muted hover:text-text transition-colors font-medium px-4 py-2 rounded-xl hover:bg-surface">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 bg-brand hover:bg-brand-hover text-white font-semibold px-7 py-2.5 rounded-xl transition-all disabled:opacity-50 shadow-[0_4px_20px_rgba(0,150,101,0.25)] text-sm">
              {loading ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
              Crear Producto
            </button>
          </div>

          {/* Mobile preview */}
          <div className="lg:hidden lg:col-span-2">
            <ProductPreview formData={formData} />
          </div>

      </form>

      {/* Desktop sticky preview */}
      <div className="hidden lg:block w-64 shrink-0 sticky top-[60px] self-start">
        <ProductPreview formData={formData} />
      </div>

      </div>
    </div>
  );
}

function SectionHeader({ icon, label, accent }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className={`flex items-center gap-1.5 text-xs font-semibold ${accent ? 'text-brand' : 'text-muted'}`}>
        {icon}
        {label}
      </span>
    </div>
  );
}

function ProductPreview({ formData }) {
  const price = parseFloat(formData.price) || 0;
  const cost = parseFloat(formData.cost) || 0;
  const profit = price - cost;
  const margin = cost > 0 && price > 0 ? ((profit / cost) * 100).toFixed(1) : null;
  const isLoss = cost > 0 && price > 0 && price < cost;
  const isUrl = formData.icon?.startsWith('http');

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Eye size={12} className="text-muted" />
        <p className="text-xs font-semibold text-muted uppercase tracking-wide">Vista previa</p>
      </div>

      <div className="p-4 space-y-3">
        {/* Product card mockup */}
        <div className="rounded-xl bg-bg border border-border p-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center overflow-hidden shrink-0">
            {isUrl
              ? <img src={formData.icon} alt="" className="w-full h-full object-cover" />
              : <span className="text-2xl">{formData.icon || '📦'}</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text truncate">
              {formData.name || <span className="text-dim italic font-normal">Sin nombre</span>}
            </p>
            {formData.category && (
              <p className="text-xs text-muted mt-0.5">{formData.category}</p>
            )}
          </div>
        </div>

        {/* Price highlight */}
        <div className="rounded-xl bg-brand/5 border border-brand/20 p-4 text-center">
          <p className="text-xs text-muted mb-1">Precio al público</p>
          <p className="text-3xl font-bold text-brand">
            {price > 0 ? `$${price.toFixed(2)}` : <span className="text-dim text-2xl font-normal">—</span>}
          </p>
          {cost > 0 && (
            <p className="text-xs text-muted mt-1.5">Costo: ${cost.toFixed(2)}</p>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-bg border border-border p-2.5 text-center">
            <p className="text-[10px] text-muted mb-0.5">Stock inicial</p>
            <p className="text-sm font-semibold text-text">{formData.stock || 0}</p>
            <p className="text-[10px] text-dim">{formData.unitType || 'un.'}</p>
          </div>
          <div className={`rounded-lg border p-2.5 text-center ${
            margin === null ? 'bg-bg border-border' :
            isLoss ? 'bg-red-500/5 border-red-500/20' :
            'bg-green-500/5 border-green-500/20'
          }`}>
            <p className="text-[10px] text-muted mb-0.5">Ganancia</p>
            <p className={`text-sm font-semibold ${
              margin === null ? 'text-dim' :
              isLoss ? 'text-red-500' : 'text-green-500'
            }`}>
              {margin !== null ? `${margin}%` : '—'}
            </p>
            {margin !== null && (
              <p className={`text-[10px] ${isLoss ? 'text-red-400' : 'text-green-400'}`}>
                {isLoss ? '' : '+'} ${profit.toFixed(2)}
              </p>
            )}
          </div>
        </div>

        {isLoss && (
          <div className="flex items-center gap-2 p-2.5 bg-red-500/8 rounded-xl border border-red-500/20">
            <AlertTriangle size={12} className="text-red-500 shrink-0" />
            <p className="text-xs text-red-500">Vendés por debajo del costo</p>
          </div>
        )}
      </div>
    </div>
  );
}
