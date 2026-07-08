import { useState, useEffect, useRef } from 'react';
import TimePicker from '../components/ui/TimePicker';
import { Save, Clock, Store, Link as LinkIcon, ExternalLink, Copy, CheckCircle2, Trash2, Plus, Image as ImageIcon, Upload, X, Loader2, CreditCard, Smartphone, Banknote, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useCountry } from '../context/CountryContext';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { usePlan } from '../hooks/usePlan';

export default function Settings() {
  const { user, owner_id, profile } = useAuth();
  const { refreshCountry, countryConfig } = useCountry();
  const { planId, name: planName } = usePlan();
  const location = useLocation();
  const navigate = useNavigate();
  const [openingTime, setOpeningTime] = useState('08:00');
  const [closingTime, setClosingTime] = useState('20:00');
  const [selectedDays, setSelectedDays] = useState([1,2,3,4,5,6]);
  const [estimatedMargin, setEstimatedMargin] = useState(30);
  
  // Catalog settings
  const [storeName, setStoreName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [slug, setSlug] = useState('');
  
  // Tab State
  const [activeTab, setActiveTab] = useState('Negocio');
  
  // Negocio Settings
  const [cuit, setCuit] = useState('');
  const [country, setCountry] = useState('Argentina');
  const [businessType, setBusinessType] = useState('Otros');
  
  // POS Settings
  const [cardSurcharge, setCardSurcharge] = useState(0);
  const [cardDiscount, setCardDiscount] = useState(0);
  const [transferSurcharge, setTransferSurcharge] = useState(0);
  const [transferDiscount, setTransferDiscount] = useState(0);
  const [cashSurcharge, setCashSurcharge] = useState(0);
  const [cashDiscount, setCashDiscount] = useState(0);
  const [cardDiscountType, setCardDiscountType] = useState('percent');
  const [cardSurchargeType, setCardSurchargeType] = useState('percent');
  const [transferDiscountType, setTransferDiscountType] = useState('percent');
  const [transferSurchargeType, setTransferSurchargeType] = useState('percent');
  const [cashDiscountType, setCashDiscountType] = useState('percent');
  const [cashSurchargeType, setCashSurchargeType] = useState('percent');
  // 'none' | 'surcharge' | 'discount' — solo uno activo por método de pago
  const [cardMode, setCardMode] = useState('none');
  const [transferMode, setTransferMode] = useState('none');
  const [cashMode, setCashMode] = useState('none');
  
  const [storeId, setStoreId] = useState(null);
  const [promotions, setPromotions] = useState([
    { icon: "🔥", title: "3+ productos · 10% OFF", description: "Llevá 3 productos y obtené 10% OFF" },
    { icon: "🛒", title: "$50.000+ · Envío gratis", description: "Comprando más de $50.000" }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ type: '', message: '' });

  const logoInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  useEffect(() => {
    if (owner_id) fetchStoreSettings();
  }, [owner_id]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['Negocio', 'Horarios', 'POS', 'Plan'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(`/settings?tab=${tab}`, { replace: true });
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
      
      if (data) {
        setStoreName(data.store_name || '');
        setWhatsappNumber(data.whatsapp_number || '');
        setDescription(data.description || '');
        setLogoUrl(data.logo_url || '');
        setBannerUrl(data.banner_url || '');
        setSlug(data.slug || '');
        setCuit(data.cuit || '');
        setCountry(data.country || 'Argentina');
        setBusinessType(data.business_type || 'Otros');
        setStoreId(data.id);
        if (data.promotions && Array.isArray(data.promotions)) {
          setPromotions(data.promotions);
        }
        setCardSurcharge(data.card_surcharge || 0);
        setCardDiscount(data.card_discount || 0);
        setTransferSurcharge(data.transfer_surcharge || 0);
        setTransferDiscount(data.transfer_discount || 0);
        setCashSurcharge(data.cash_surcharge || 0);
        setCashDiscount(data.cash_discount || 0);
        setCardDiscountType(data.card_discount_type || 'percent');
        setCardSurchargeType(data.card_surcharge_type || 'percent');
        setTransferDiscountType(data.transfer_discount_type || 'percent');
        setTransferSurchargeType(data.transfer_surcharge_type || 'percent');
        setCashDiscountType(data.cash_discount_type || 'percent');
        setCashSurchargeType(data.cash_surcharge_type || 'percent');
        setCardMode(data.card_surcharge > 0 ? 'surcharge' : data.card_discount > 0 ? 'discount' : 'none');
        setTransferMode(data.transfer_surcharge > 0 ? 'surcharge' : data.transfer_discount > 0 ? 'discount' : 'none');
        setCashMode(data.cash_surcharge > 0 ? 'surcharge' : data.cash_discount > 0 ? 'discount' : 'none');
        setEstimatedMargin(data.estimated_margin || 30);
        if (data.business_hours) {
          setOpeningTime(data.business_hours.opening || '08:00');
          setClosingTime(data.business_hours.closing || '20:00');
          setSelectedDays(data.business_hours.days || [1,2,3,4,5,6]);
        }
      }
    } catch (err) {
      console.error('Error fetching store settings:', err);
    }
  };

  const handleSave = async () => {
    setSaveStatus({ type: '', message: '' });
    setIsSaving(true);
    
    // Auto-generate slug if empty
    let finalSlug = slug;
    if (!finalSlug && storeName && whatsappNumber) {
      finalSlug = `${storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${whatsappNumber}`.substring(0, 50);
      setSlug(finalSlug);
    }
    
    const payload = { 
      store_name: storeName, 
      whatsapp_number: whatsappNumber,
      description,
      logo_url: logoUrl,
      banner_url: bannerUrl,
      slug: finalSlug || null,
      cuit,
      country,
      business_type: businessType,
      promotions: promotions,
      card_surcharge: cardMode === 'surcharge' ? Number(cardSurcharge) : 0,
      card_discount: cardMode === 'discount' ? Number(cardDiscount) : 0,
      transfer_surcharge: transferMode === 'surcharge' ? Number(transferSurcharge) : 0,
      transfer_discount: transferMode === 'discount' ? Number(transferDiscount) : 0,
      cash_surcharge: cashMode === 'surcharge' ? Number(cashSurcharge) : 0,
      cash_discount: cashMode === 'discount' ? Number(cashDiscount) : 0,
      card_discount_type: cardDiscountType,
      card_surcharge_type: cardSurchargeType,
      transfer_discount_type: transferDiscountType,
      transfer_surcharge_type: transferSurchargeType,
      cash_discount_type: cashDiscountType,
      cash_surcharge_type: cashSurchargeType,
      estimated_margin: Number(estimatedMargin),
      business_hours: { opening: openingTime, closing: closingTime, days: selectedDays },
      user_id: owner_id
    };

    try {
      if (storeId) {
        const { data: updatedData, error } = await supabase
          .from('store_settings')
          .update(payload)
          .eq('id', storeId)
          .eq('user_id', owner_id)
          .select();
        
        if (error) throw error;
        if (!updatedData || updatedData.length === 0) {
          // El registro existe pero no le pertenece al usuario o no se pudo actualizar.
          // Creamos uno nuevo forzosamente para este usuario.
          const { data: newData, error: insertError } = await supabase
            .from('store_settings')
            .insert([payload])
            .select()
            .single();
          if (insertError) throw insertError;
          if (newData) setStoreId(newData.id);
        }
      } else {
        const { data, error } = await supabase
          .from('store_settings')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        if (data) setStoreId(data.id);
      }
      refreshCountry();
      setSaveStatus({ type: 'success', message: 'Configuración guardada correctamente.' });
      setTimeout(() => setSaveStatus({ type: '', message: '' }), 3000);
      window.dispatchEvent(new CustomEvent('store-settings-updated', {
        detail: { business_hours: { opening: openingTime, closing: closingTime } }
      }));
    } catch (error) {
      console.error('Error saving:', error);
      if (error?.code === '23505') {
        setSaveStatus({ type: 'error', message: 'Ese Link Personalizado ya está en uso. Por favor, elegí otro.' });
      } else {
        setSaveStatus({ type: 'error', message: `Error al guardar: ${error?.message || 'Error desconocido'}` });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = type === 'logo' ? 400 : 1200;
        const MAX_HEIGHT = type === 'logo' ? 400 : 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/webp', 0.8);
        if (type === 'logo') setLogoUrl(dataUrl);
        else setBannerUrl(dataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleAddPromotion = () => {
    setPromotions([...promotions, { icon: "🔥", title: "Nueva Promo", description: "Descripción de la promo" }]);
  };

  const handleUpdatePromotion = (index, field, value) => {
    const newPromotions = [...promotions];
    newPromotions[index][field] = value;
    setPromotions(newPromotions);
  };

  const handleDeletePromotion = (index) => {
    setPromotions(promotions.filter((_, i) => i !== index));
  };

  const catalogUrl = slug ? `${window.location.origin}/c/${slug}` : (storeId ? `${window.location.origin}/c/${storeId}` : '');

  const copyUrl = () => {
    if (catalogUrl) {
      navigator.clipboard.writeText(catalogUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto animate-in fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-text mb-2">Configuración</h1>
        <p className="text-muted">Ajustá las preferencias de tu negocio y aplicación.</p>
        
        {saveStatus.message && (
          <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${saveStatus.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-brand/10 text-brand border border-brand/20'}`}>
            {saveStatus.type === 'error' ? <X size={18} /> : <CheckCircle2 size={18} />}
            <span className="text-sm md:text-[15px] font-bold">{saveStatus.message}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-4 sm:gap-8 border-b border-border mb-6 custom-scrollbar pb-2">
        {['Negocio', 'Horarios', 'POS', 'Plan'].map((tab) => (
          <button 
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-2 py-2 border-b-2 font-medium text-sm md:text-[15px] transition-colors whitespace-nowrap ${activeTab === tab ? 'border-brand text-text' : 'border-transparent text-muted hover:text-text'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Horarios' && (() => {
        const DAYS_OF_WEEK = [
          { idx: 1, short: 'L', label: 'Lunes' },
          { idx: 2, short: 'M', label: 'Martes' },
          { idx: 3, short: 'X', label: 'Miércoles' },
          { idx: 4, short: 'J', label: 'Jueves' },
          { idx: 5, short: 'V', label: 'Viernes' },
          { idx: 6, short: 'S', label: 'Sábado' },
          { idx: 0, short: 'D', label: 'Domingo' },
        ];
        const DAY_NAMES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
        const toggleDay = (idx) => setSelectedDays(prev =>
          prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx]
        );
        const daysLabel = (() => {
          if (!selectedDays.length) return 'Ningún día seleccionado';
          if (selectedDays.length === 7) return 'Todos los días';
          const sorted = [...selectedDays].sort((a,b) => (a===0?7:a) - (b===0?7:b));
          const orderArr = sorted.map(d => d === 0 ? 7 : d);
          const isConsec = orderArr.every((d,i) => i === 0 || d === orderArr[i-1]+1);
          if (isConsec && sorted.length > 1) return `${DAY_NAMES[sorted[0]]} a ${DAY_NAMES[sorted[sorted.length-1]]}`;
          return sorted.map(d => DAY_NAMES[d]).join(', ');
        })();
        return (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden mb-6">
          <div className="p-4 md:p-6 border-b border-border">
            <h2 className="text-lg font-bold text-text flex items-center gap-2">
              <Clock size={20} className="text-brand" /> Horarios del Negocio
            </h2>
            <p className="text-sm md:text-[15px] text-muted mt-1">
              Se mostrará en tu tienda online y como recordatorio para abrir/cerrar caja.
            </p>
          </div>

          <div className="p-4 md:p-6 flex flex-col gap-6">

            {/* Day picker */}
            <div>
              <label className="block text-sm md:text-[15px] font-bold text-text mb-3">Días de Atención</label>
              <div className="flex gap-2 flex-wrap">
                {DAYS_OF_WEEK.map(d => (
                  <button
                    key={d.idx}
                    type="button"
                    onClick={() => toggleDay(d.idx)}
                    title={d.label}
                    className={`w-11 h-11 rounded-xl font-bold text-sm transition-all select-none focus:outline-none ${
                      selectedDays.includes(d.idx)
                        ? 'bg-brand text-text shadow-[0_4px_14px_rgba(82,82,255,0.35)] scale-105'
                        : 'bg-surface-2 border border-border text-muted hover:border-brand/50 hover:text-text'
                    }`}
                  >
                    {d.short}
                  </button>
                ))}
              </div>
              <p className="text-xs text-dim mt-2 font-medium">{daysLabel}</p>
            </div>

            {/* Time inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm md:text-[15px] font-bold text-text mb-2">Horario de Apertura</label>
                <TimePicker value={openingTime} onChange={setOpeningTime} className="w-full" />
              </div>
              <div>
                <label className="block text-sm md:text-[15px] font-bold text-text mb-2">Horario de Cierre</label>
                <TimePicker value={closingTime} onChange={setClosingTime} className="w-full" />
              </div>
              <div>
                <label className="block text-sm md:text-[15px] font-bold text-text mb-2">Margen Estimado (%)</label>
                <input
                  type="number"
                  min="0" max="100"
                  value={estimatedMargin}
                  onChange={(e) => setEstimatedMargin(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-xl py-3 px-4 text-text focus:outline-none focus:border-brand transition-colors"
                />
              </div>
            </div>

            {/* Preview */}
            {selectedDays.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted bg-surface-2 border border-border rounded-xl px-4 py-3">
                <Clock size={15} className="text-dim flex-shrink-0" />
                <span><span className="font-semibold text-text">{daysLabel}</span> · {openingTime} – {closingTime}hs</span>
              </div>
            )}
          </div>

          <div className="p-4 bg-surface-2 border-t border-border flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-brand hover:bg-brand-hover disabled:opacity-50 text-text font-bold py-2 px-6 rounded-lg transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
        );
      })()}

      {activeTab === 'POS' && (
      <div className="bg-surface border border-border rounded-2xl overflow-hidden mb-6">
        <div className="p-4 md:p-6 border-b border-border">
          <h2 className="text-lg font-bold text-text flex items-center gap-2">
            <CheckCircle2 size={20} className="text-brand" /> Recargos y Descuentos
          </h2>
          <p className="text-sm text-muted mt-1">
            Ajustes automáticos al seleccionar un método de pago en el Punto de Venta.
          </p>
        </div>

        <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              key: 'card',
              label: 'Tarjeta',
              Icon: CreditCard,
              iconBg: 'bg-blue-500/10',
              iconColor: 'text-blue-500',
              mode: cardMode, setMode: setCardMode,
              surcharge: cardSurcharge, setSurcharge: setCardSurcharge,
              surchargeType: cardSurchargeType, setSurchargeType: setCardSurchargeType,
              discount: cardDiscount, setDiscount: setCardDiscount,
              discountType: cardDiscountType, setDiscountType: setCardDiscountType,
            },
            {
              key: 'transfer',
              label: 'Transferencia',
              Icon: Smartphone,
              iconBg: 'bg-violet-500/10',
              iconColor: 'text-violet-500',
              mode: transferMode, setMode: setTransferMode,
              surcharge: transferSurcharge, setSurcharge: setTransferSurcharge,
              surchargeType: transferSurchargeType, setSurchargeType: setTransferSurchargeType,
              discount: transferDiscount, setDiscount: setTransferDiscount,
              discountType: transferDiscountType, setDiscountType: setTransferDiscountType,
            },
            {
              key: 'cash',
              label: 'Efectivo',
              Icon: Banknote,
              iconBg: 'bg-amber-500/10',
              iconColor: 'text-amber-600',
              mode: cashMode, setMode: setCashMode,
              surcharge: cashSurcharge, setSurcharge: setCashSurcharge,
              surchargeType: cashSurchargeType, setSurchargeType: setCashSurchargeType,
              discount: cashDiscount, setDiscount: setCashDiscount,
              discountType: cashDiscountType, setDiscountType: setCashDiscountType,
            },
          ].map(({ key, label, Icon, iconBg, iconColor, mode, setMode, surcharge, setSurcharge, surchargeType, setSurchargeType, discount, setDiscount, discountType, setDiscountType }) => {
            const activeValue = mode === 'surcharge' ? surcharge : mode === 'discount' ? discount : null;
            const activeType = mode === 'surcharge' ? surchargeType : discountType;
            const hasActive = mode !== 'none' && Number(activeValue) > 0;

            return (
              <div
                key={key}
                className={`rounded-xl border overflow-hidden transition-all duration-200 ${
                  mode === 'surcharge'
                    ? 'border-red-500/30 bg-red-500/[0.03]'
                    : mode === 'discount'
                    ? 'border-brand/30 bg-brand/[0.03]'
                    : 'border-border bg-surface-2'
                }`}
              >
                {/* Header */}
                <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                      <Icon size={15} className={iconColor} />
                    </span>
                    <span className="font-bold text-text text-sm">{label}</span>
                  </div>
                  {hasActive && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      mode === 'surcharge'
                        ? 'bg-red-500/15 text-red-400'
                        : 'bg-brand/15 text-brand'
                    }`}>
                      {mode === 'surcharge' ? '+' : '−'}{activeType === 'percent' ? `${activeValue}%` : `$${activeValue}`}
                    </span>
                  )}
                </div>

                <div className="px-4 pb-4 space-y-3">
                  {/* Mode selector */}
                  <div className="grid grid-cols-3 gap-1 bg-bg rounded-xl p-1 border border-border">
                    <button
                      onClick={() => setMode('none')}
                      className={`py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                        mode === 'none'
                          ? 'bg-surface text-text shadow-sm'
                          : 'text-dim hover:text-muted'
                      }`}
                    >
                      <Minus size={11} />
                      <span>Ninguno</span>
                    </button>
                    <button
                      onClick={() => setMode('surcharge')}
                      className={`py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                        mode === 'surcharge'
                          ? 'bg-red-500/20 text-red-400 shadow-sm'
                          : 'text-dim hover:text-muted'
                      }`}
                    >
                      <TrendingUp size={11} />
                      <span>Recargo</span>
                    </button>
                    <button
                      onClick={() => setMode('discount')}
                      className={`py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                        mode === 'discount'
                          ? 'bg-brand/20 text-brand shadow-sm'
                          : 'text-dim hover:text-muted'
                      }`}
                    >
                      <TrendingDown size={11} />
                      <span>Descuento</span>
                    </button>
                  </div>

                  {/* Input area */}
                  {mode === 'none' ? (
                    <div className="flex items-center justify-center gap-1.5 py-3 text-dim">
                      <Minus size={13} />
                      <span className="text-xs">Sin ajuste automático</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={mode === 'surcharge' ? surcharge : discount}
                          onChange={(e) => mode === 'surcharge' ? setSurcharge(e.target.value) : setDiscount(e.target.value)}
                          className={`w-full bg-bg rounded-xl p-3 pl-4 pr-[5.5rem] text-text outline-none text-2xl font-bold tabular-nums transition-colors ${
                            mode === 'surcharge'
                              ? 'border border-red-500/30 focus:border-red-400'
                              : 'border border-brand/30 focus:border-brand'
                          }`}
                          placeholder="0"
                          autoFocus
                        />
                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex gap-0.5 bg-surface rounded-lg p-0.5 border border-border">
                          <button
                            onClick={() => mode === 'surcharge' ? setSurchargeType('percent') : setDiscountType('percent')}
                            className={`w-8 h-7 rounded-md text-xs font-bold transition-colors ${
                              (mode === 'surcharge' ? surchargeType : discountType) === 'percent'
                                ? mode === 'surcharge'
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-brand/20 text-brand'
                                : 'text-muted hover:text-text'
                            }`}
                          >
                            %
                          </button>
                          <button
                            onClick={() => mode === 'surcharge' ? setSurchargeType('fixed') : setDiscountType('fixed')}
                            className={`w-8 h-7 rounded-md text-xs font-bold transition-colors ${
                              (mode === 'surcharge' ? surchargeType : discountType) === 'fixed'
                                ? mode === 'surcharge'
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-brand/20 text-brand'
                                : 'text-muted hover:text-text'
                            }`}
                          >
                            $
                          </button>
                        </div>
                      </div>
                      {Number(mode === 'surcharge' ? surcharge : discount) > 0 && (
                        <p className={`text-xs font-medium ${mode === 'surcharge' ? 'text-red-400' : 'text-brand'}`}>
                          {mode === 'surcharge' ? 'Se suma' : 'Se descuenta'}{' '}
                          {(mode === 'surcharge' ? surchargeType : discountType) === 'percent'
                            ? `${mode === 'surcharge' ? surcharge : discount}%`
                            : `$${mode === 'surcharge' ? surcharge : discount}`}{' '}
                          al total
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-surface-2 border-t border-border flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-brand hover:bg-brand-hover disabled:opacity-50 text-text font-bold py-2 px-6 rounded-lg transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
      )}

      {activeTab === 'Negocio' && (
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            <div className="p-4 md:p-6 border-b border-border flex items-center gap-4">
              <div className="w-12 h-12 bg-brand rounded-lg flex items-center justify-center text-text font-bold text-xl uppercase">
                {storeName ? storeName.charAt(0) : 'N'}
              </div>
              <div>
                <h2 className="text-lg font-bold text-text">{storeName || 'Mi Negocio'}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm md:text-[15px] text-dim bg-surface-2 px-2 py-0.5 rounded border border-border">{user?.id?.substring(0,8)}</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm md:text-[15px] font-bold text-text mb-2">Nombre del Negocio</label>
                <input 
                  type="text" 
                  value={storeName} 
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-lg p-2.5 text-text focus:border-brand outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm md:text-[15px] font-bold text-text mb-2">{countryConfig.taxId.label} del Negocio</label>
                <input 
                  type="text" 
                  value={cuit} 
                  onChange={(e) => setCuit(e.target.value)}
                  placeholder="20-12345678-9"
                  className="w-full bg-surface-2 border border-border rounded-lg p-2.5 text-text focus:border-brand outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm md:text-[15px] font-bold text-text mb-2">País</label>
                <select 
                  value={country} 
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-lg p-2.5 text-text focus:border-brand outline-none transition-colors appearance-none"
                >
                  <option value="Argentina">Argentina</option>
                  <option value="Uruguay">Uruguay</option>
                </select>
              </div>
              <div>
                <label className="block text-sm md:text-[15px] font-bold text-text mb-2">Tipo de negocio</label>
                <select 
                  value={businessType} 
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-lg p-2.5 text-text focus:border-brand outline-none transition-colors appearance-none"
                >
                  {countryConfig.businessTypes.map(bt => (
                    <option key={bt} value={bt}>{bt}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="p-4 bg-surface-2 border-t border-border flex justify-end">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-brand hover:bg-brand-hover disabled:opacity-50 text-text font-bold py-2 px-6 rounded-lg transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="border border-red-500/20 rounded-2xl overflow-hidden relative">
            <div className="absolute inset-0 bg-red-500/5 pointer-events-none"></div>
            <div className="p-6 relative z-10 flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center shrink-0">
                <X size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-red-500 font-bold text-lg">Restablecer negocio</h3>
                <p className="text-sm md:text-[15px] text-muted mt-1">
                  Elimina productos, compras, clientes, ventas y datos relacionados. <strong>No borra usuarios, plan ni configuración.</strong> Esta acción <strong>no se puede deshacer.</strong>
                </p>
              </div>
              <button 
                onClick={() => toast('Próximamente: Esta función ejecutará el borrado de la base de datos.', { icon: '⚠️' })}
                className="w-full md:w-auto bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold py-2 px-6 rounded-lg transition-colors border border-red-500/20 whitespace-nowrap"
              >
                Restablecer negocio
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Plan' && (() => {
        // Calcular fechas de vencimiento
        const planExpiresAt = profile?.plan_expires_at 
          ? new Date(profile.plan_expires_at) 
          : new Date(new Date(profile?.created_at || new Date()).getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const now = new Date();
        const diffTime = planExpiresAt - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const isExpired = diffDays < 0;
        
        const formatter = new Intl.DateTimeFormat('es-AR', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
        
        const vencimientoText = formatter.format(planExpiresAt);
        const diasRestantesText = isExpired ? 'Vencido' : `${diffDays} día${diffDays !== 1 ? 's' : ''}`;

        return (
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-2xl overflow-hidden p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <p className="text-sm md:text-[15px] font-bold tracking-widest text-brand uppercase mb-1">Plan Actual</p>
                <h2 className="text-2xl font-bold text-text mb-2">{planName}</h2>
                <p className="text-sm md:text-[15px] text-muted">La gestión de cambios y pagos se realiza desde el flujo formal de planes.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-surface-2 border border-border rounded-xl p-4">
                <p className="text-sm md:text-[15px] font-bold text-dim uppercase tracking-wider mb-2">Renovación</p>
                <p className="font-bold text-text text-lg">Manual</p>
              </div>
              <div className="bg-surface-2 border border-border rounded-xl p-4">
                <p className="text-sm md:text-[15px] font-bold text-dim uppercase tracking-wider mb-2">Vencimiento</p>
                <p className={`font-bold text-lg ${isExpired ? 'text-red-500' : 'text-text'}`}>{vencimientoText}</p>
              </div>
              <div className="bg-surface-2 border border-border rounded-xl p-4">
                <p className="text-sm md:text-[15px] font-bold text-dim uppercase tracking-wider mb-2">Días restantes</p>
                <p className={`font-bold text-lg ${isExpired ? 'text-red-500' : 'text-text'}`}>{diasRestantesText}</p>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-bold text-text flex items-center gap-2">
                <span className="bg-surface-2 px-2 py-1 rounded text-sm md:text-[15px]">$</span> Historial de pagos
              </h3>
            </div>
            <div className="p-6">
              <table className="w-full text-left text-sm md:text-[15px] border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 text-text font-bold">ID</th>
                    <th className="pb-3 text-text font-bold">Fecha</th>
                    <th className="pb-3 text-text font-bold">Plan</th>
                    <th className="pb-3 text-text font-bold">Monto</th>
                    <th className="pb-3 text-text font-bold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-dim">No hay pagos registrados.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
