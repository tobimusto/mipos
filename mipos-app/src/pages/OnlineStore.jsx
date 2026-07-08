import { useState, useEffect, useRef } from 'react';
import { Save, Store, Link as LinkIcon, ExternalLink, Copy, CheckCircle2, Trash2, Plus, Image as ImageIcon, Upload, X, Loader2, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../hooks/usePlan';
import toast from 'react-hot-toast';

export default function OnlineStore() {
  const { user, owner_id } = useAuth();
  const plan = usePlan();
  const [storeName, setStoreName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [slug, setSlug] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [storeId, setStoreId] = useState(null);
  const [promotions, setPromotions] = useState([
    { icon: "🔥", title: "3+ productos · 10% OFF", description: "Llevá 3 productos y obtené 10% OFF" },
    { icon: "🛒", title: "$50.000+ · Envío gratis", description: "Comprando más de $50.000" }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [products, setProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const logoInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  useEffect(() => {
    fetchStoreSettings();
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data } = await supabase.from('products').select('*').eq('user_id', owner_id).order('name');
      if (data) setProducts(data);
    } catch (err) {
      console.error('Error fetching products:', err);
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
      if (data) {
        setStoreName(data.store_name || '');
        setWhatsappNumber(data.whatsapp_number || '');
        setDescription(data.description || '');
        setLogoUrl(data.logo_url || '');
        setBannerUrl(data.banner_url || '');
        setSlug(data.slug || '');
        setStoreAddress(data.store_address || '');
        setInstagramUrl(data.instagram_url || '');
        setStoreId(data.id);
        if (data.promotions && Array.isArray(data.promotions)) setPromotions(data.promotions);
      }
    } catch (err) {
      console.error('Error fetching store settings:', err);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
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
      promotions,
      store_address: storeAddress || null,
      instagram_url: instagramUrl || null,
      user_id: owner_id
    };
    try {
      if (storeId) {
        const { data: updatedData, error } = await supabase
          .from('store_settings').update(payload).eq('id', storeId).eq('user_id', owner_id).select();
        if (error) throw error;
        if (!updatedData || updatedData.length === 0) {
          const { data: newData, error: insertError } = await supabase
            .from('store_settings').insert([payload]).select().single();
          if (insertError) throw insertError;
          if (newData) setStoreId(newData.id);
        }
      } else {
        const { data, error } = await supabase
          .from('store_settings').insert([payload]).select().single();
        if (error) throw error;
        if (data) setStoreId(data.id);
      }
      toast.success('Tienda guardada correctamente.');
    } catch (error) {
      if (error?.code === '23505') toast.error('Ese Link Personalizado ya está en uso. Elegí otro.');
      else toast.error(`Error al guardar: ${error?.message || 'Error desconocido'}`);
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
        let { width, height } = img;
        if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } }
        else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/webp', 0.8);
        if (type === 'logo') setLogoUrl(dataUrl);
        else setBannerUrl(dataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const catalogUrl = slug ? `${window.location.origin}/c/${slug}` : (storeId ? `${window.location.origin}/c/${storeId}` : '');
  const copyUrl = () => { if (catalogUrl) { navigator.clipboard.writeText(catalogUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } };
  const handleAddPromotion = () => setPromotions([...promotions, { icon: "🔥", title: "Nueva Promo", description: "Descripción de la promo" }]);
  const handleUpdatePromotion = (index, field, value) => { const p = [...promotions]; p[index][field] = value; setPromotions(p); };
  const handleDeletePromotion = (index) => setPromotions(promotions.filter((_, i) => i !== index));

  const toggleProductStore = async (id, currentVal) => {
    try {
      const { error } = await supabase.from('products').update({ show_in_store: !currentVal }).eq('id', id);
      if (error) throw error;
      setProducts(products.map(p => p.id === id ? { ...p, show_in_store: !currentVal } : p));
      toast.success(currentVal ? 'Producto ocultado en tienda' : 'Producto visible en tienda');
    } catch (e) {
      toast.error('Error al actualizar producto');
    }
  };

  const handleSaveProductInfo = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('products').update({ 
        description: editingProduct.description,
        icon: editingProduct.icon,
        addons: editingProduct.addons || [],
        recommended: editingProduct.recommended || []
      }).eq('id', editingProduct.id);
      
      if (error) throw error;
      setProducts(products.map(p => p.id === editingProduct.id ? editingProduct : p));
      setEditingProduct(null);
      toast.success('Información del producto actualizada');
    } catch (e) {
      toast.error('Error al guardar información');
    }
  };

  if (!plan.hasCatalog) {
    return (
      <div className="flex flex-col h-full bg-bg items-center justify-center p-8 text-center animate-in fade-in">
        <Store size={64} className="text-[#ff5252] mb-4 opacity-50" />
        <h2 className="text-2xl font-bold text-text mb-2">Catálogo Online</h2>
        <p className="text-muted max-w-md mb-6">Esta función está disponible a partir del Plan Pro. Mejorá tu plan para armar tu tienda pública y recibir pedidos por WhatsApp.</p>
        <button className="bg-brand hover:bg-brand-hover text-text font-bold py-3 px-8 rounded-xl transition-all shadow-[0_4px_15px_rgba(82,82,255,0.2)]">
          Ver planes
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto animate-in fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-[#ff5252]/20 to-[#ff5252]/5 rounded-xl flex items-center justify-center border border-[#ff5252]/20">
            <Globe size={20} className="text-[#ff5252]" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-text">Mi Tienda Online</h1>
            <p className="text-muted text-sm md:text-[15px]">Configurá tu catálogo público y recibí pedidos por WhatsApp.</p>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl overflow-hidden mb-6">
        <div className="p-4 md:p-6 border-b border-border flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-text flex items-center gap-2">
              <Store size={20} className="text-[#ff5252]" /> Mi Catálogo Online
            </h2>
            <p className="text-sm md:text-[15px] text-muted mt-1">
              Configurá tu tienda online pública para recibir pedidos directo por WhatsApp.
            </p>
          </div>
          {storeId && (
            <span className="bg-brand/10 text-brand text-sm md:text-[15px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">Activo</span>
          )}
        </div>

        <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Logo & Banner */}
          <div className="md:col-span-2 flex flex-col sm:flex-row gap-6 items-start">
            <div>
              <label className="block text-sm md:text-[15px] font-bold text-text mb-2">Logo del Negocio</label>
              <div
                className="w-24 h-24 rounded-full border-2 border-dashed border-border flex items-center justify-center bg-surface-2 cursor-pointer hover:border-[#ff5252] overflow-hidden group relative"
                onClick={() => logoInputRef.current.click()}
              >
                {logoUrl ? (
                  <><img src={logoUrl} alt="Logo" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center"><Upload size={20} className="text-text" /></div></>
                ) : (<ImageIcon size={28} className="text-dim group-hover:text-[#ff5252] transition-colors" />)}
                <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} />
              </div>
            </div>
            <div className="flex-1 w-full">
              <label className="block text-sm md:text-[15px] font-bold text-text mb-2">Banner (Portada)</label>
              <div
                className="w-full h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-surface-2 cursor-pointer hover:border-[#ff5252] overflow-hidden group relative"
                onClick={() => bannerInputRef.current.click()}
              >
                {bannerUrl ? (
                  <><img src={bannerUrl} alt="Banner" className="w-full h-full object-cover opacity-80" /><div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center"><span className="text-text text-sm md:text-[15px] font-bold flex items-center gap-2"><Upload size={16} /> Cambiar Portada</span></div></>
                ) : (<div className="text-dim flex items-center gap-2 group-hover:text-[#ff5252] transition-colors"><ImageIcon size={20} /><span className="text-sm md:text-[15px] font-medium">Subir imagen de portada</span></div>)}
                <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'banner')} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm md:text-[15px] font-bold text-text mb-2">Nombre del Comercio</label>
            <input type="text" placeholder="Ej: Kiosco Don Carlos" value={storeName} onChange={(e) => setStoreName(e.target.value)} className="w-full bg-surface-2 border border-border rounded-xl py-3 px-4 text-text focus:outline-none focus:border-[#ff5252] transition-colors" />
          </div>
          <div>
            <label className="block text-sm md:text-[15px] font-bold text-text mb-2">Número de WhatsApp</label>
            <input type="text" placeholder="Ej: 5491100000000" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} className="w-full bg-surface-2 border border-border rounded-xl py-3 px-4 text-text focus:outline-none focus:border-[#ff5252] transition-colors" />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm md:text-[15px] font-bold text-text mb-2">Descripción breve (Opcional)</label>
            <textarea placeholder="Ej: El kiosco con el mayor surtido del barrio. Abierto 24hs." value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-surface-2 border border-border rounded-xl py-3 px-4 text-text focus:outline-none focus:border-[#ff5252] transition-colors resize-none h-20" />
          </div>

          <div>
            <label className="block text-sm md:text-[15px] font-bold text-text mb-2">Dirección del Local</label>
            <input type="text" placeholder="Ej: Av. Corrientes 1234, Buenos Aires" value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} className="w-full bg-surface-2 border border-border rounded-xl py-3 px-4 text-text focus:outline-none focus:border-[#ff5252] transition-colors" />
          </div>

          <div>
            <label className="block text-sm md:text-[15px] font-bold text-text mb-2 flex items-center gap-2">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              Instagram (Opcional)
            </label>
            <input type="text" placeholder="Ej: @kioscodon o enlace completo" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} className="w-full bg-surface-2 border border-border rounded-xl py-3 px-4 text-text focus:outline-none focus:border-[#ff5252] transition-colors" />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm md:text-[15px] font-bold text-text mb-2">Link Personalizado (Slug)</label>
            <div className="flex items-center">
              <span className="bg-surface-2 border border-border border-r-0 rounded-l-xl py-3 px-4 text-muted text-sm md:text-[15px] whitespace-nowrap">{window.location.origin}/c/</span>
              <input type="text" placeholder="kiosco-don-carlos" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} className="w-full bg-surface-2 border border-border rounded-r-xl py-3 px-4 text-text focus:outline-none focus:border-[#ff5252] transition-colors" />
            </div>
            <p className="text-sm md:text-[15px] text-muted mt-2">Se autocompleta con tu nombre y teléfono. Usa letras, números y guiones.</p>
          </div>
        </div>

        {storeId && (
          <div className="p-4 md:p-6 pt-0">
            <label className="block text-sm md:text-[15px] font-bold text-text mb-2">Enlace de tu Catálogo</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-surface-2 border border-border rounded-xl py-3 px-4 text-text1 flex items-center gap-2 overflow-hidden">
                <LinkIcon size={16} className="text-dim flex-shrink-0" />
                <span className="truncate">{catalogUrl}</span>
              </div>
              <button onClick={copyUrl} className="bg-surface-2 hover:bg-bg border border-border text-text p-3 rounded-xl transition-colors shrink-0" title="Copiar enlace">
                {copied ? <CheckCircle2 size={20} className="text-mipos-green" /> : <Copy size={20} />}
              </button>
              <a href={catalogUrl} target="_blank" rel="noreferrer" className="bg-surface-2 hover:bg-bg border border-border text-text p-3 rounded-xl transition-colors shrink-0" title="Abrir catálogo">
                <ExternalLink size={20} />
              </a>
            </div>
          </div>
        )}

        {/* Promotions */}
        <div className="p-4 md:p-6 border-t border-border/50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-md font-bold text-text">Promociones del Catálogo</h3>
            <button onClick={handleAddPromotion} className="bg-surface-2 border border-[#ff5252]/20 hover:border-[#ff5252]/50 text-text font-bold py-1.5 px-4 rounded-xl transition-all flex items-center gap-2 text-sm md:text-[15px]">
              <Plus size={16} /> Agregar Promoción
            </button>
          </div>
          <div className="space-y-4">
            {promotions.map((promo, index) => (
              <div key={index} className="flex gap-3 bg-surface border border-border p-4 rounded-xl items-start">
                <div className="w-16">
                  <label className="block text-sm md:text-[15px] text-muted mb-1">Emoji</label>
                  <input type="text" value={promo.icon} maxLength={2} onChange={(e) => handleUpdatePromotion(index, 'icon', e.target.value)} className="w-full bg-surface-2 border border-border rounded-lg p-2 text-center text-text text-lg focus:outline-none focus:border-[#ff5252]" />
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <label className="block text-sm md:text-[15px] text-muted mb-1">Título de la Promo</label>
                    <input type="text" placeholder="Ej: 3+ productos · 10% OFF" value={promo.title} onChange={(e) => handleUpdatePromotion(index, 'title', e.target.value)} className="w-full bg-surface-2 border border-border rounded-lg p-2 text-sm md:text-[15px] text-text focus:outline-none focus:border-[#ff5252]" />
                  </div>
                  <div>
                    <label className="block text-sm md:text-[15px] text-muted mb-1">Detalle / Descripción</label>
                    <input type="text" placeholder="Ej: Llevá 3 productos y obtené 10% OFF" value={promo.description} onChange={(e) => handleUpdatePromotion(index, 'description', e.target.value)} className="w-full bg-surface-2 border border-border rounded-lg p-2 text-sm md:text-[15px] text-text focus:outline-none focus:border-[#ff5252]" />
                  </div>
                </div>
                <button onClick={() => handleDeletePromotion(index)} className="text-dim hover:text-red-400 p-2 rounded-lg transition-colors mt-5" title="Eliminar Promoción">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {promotions.length === 0 && <p className="text-sm md:text-[15px] text-dim text-center py-4">No hay promociones activas.</p>}
          </div>
        </div>

        {/* Productos en Tienda */}
        <div className="p-4 md:p-6 border-t border-border/50">
          <div className="mb-4">
            <h3 className="text-md font-bold text-text">Productos en Tienda</h3>
            <p className="text-sm md:text-[15px] text-muted">Seleccioná qué productos querés que aparezcan en tu catálogo público y agregales una descripción.</p>
          </div>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {products.map((product) => (
              <div key={product.id} className="flex items-center justify-between bg-surface border border-border p-3 rounded-xl">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 bg-surface-2 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                    {(product.icon?.startsWith('http') || product.icon?.startsWith('products/')) ? (
                      <img src={product.icon?.startsWith('http') ? product.icon : `https://images.openfoodfacts.org/images/${product.icon}`} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl">{product.icon || '📦'}</span>
                    )}
                  </div>
                  <div className="truncate">
                    <h4 className="font-bold text-text text-sm md:text-[15px] truncate">{product.name}</h4>
                    <p className="text-sm md:text-[15px] text-muted truncate">{product.description || 'Sin descripción'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 pl-2">
                  <button 
                    onClick={() => setEditingProduct({ ...product, addons: product.addons || [], recommended: product.recommended || [] })}
                    className="text-sm md:text-[15px] font-bold text-brand hover:text-brand-hover px-2 py-1 bg-brand/10 rounded-lg transition-colors"
                  >
                    Editar Info
                  </button>
                  <button 
                    onClick={() => toggleProductStore(product.id, product.show_in_store)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${product.show_in_store ? 'bg-brand' : 'bg-surface-2 border border-border'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${product.show_in_store ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            ))}
            {products.length === 0 && <p className="text-sm md:text-[15px] text-dim text-center py-4">No tenés productos cargados en el inventario.</p>}
          </div>
        </div>

        <div className="p-4 bg-surface-2 border-t border-border flex justify-end">
          <button onClick={handleSave} disabled={isSaving} className="bg-[#ff5252] hover:bg-[#ff3333] disabled:opacity-50 text-text font-bold py-2 px-6 rounded-lg transition-all flex items-center justify-center gap-2 w-full sm:w-auto shadow-[0_4px_15px_rgba(255,82,82,0.2)]">
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? 'Guardando...' : 'Guardar Tienda'}
          </button>
        </div>
      </div>

      {/* Modal Editar Producto */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center bg-surface-2">
              <h3 className="font-bold text-text">Editar para Tienda: {editingProduct.name}</h3>
              <button onClick={() => setEditingProduct(null)} className="text-muted hover:text-text transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveProductInfo} className="p-6">
              <div className="mb-4 flex flex-col items-center">
                <label className="block text-sm md:text-[15px] font-bold text-text mb-2 text-center">Icono / Emoji Público</label>
                <div className="relative group w-20 h-20 bg-surface-2 border border-border hover:border-[#ff5252]/50 rounded-xl flex items-center justify-center overflow-hidden transition-colors">
                  <div className="flex flex-col items-center mt-1 w-full h-full">
                    {(editingProduct.icon?.startsWith('http') || editingProduct.icon?.startsWith('products/')) ? (
                      <img src={editingProduct.icon?.startsWith('http') ? editingProduct.icon : `https://images.openfoodfacts.org/images/${editingProduct.icon}`} alt="Icon" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl mb-1 leading-none flex items-center justify-center h-full">{editingProduct.icon || '📦'}</span>
                    )}
                  </div>
                </div>
                <input 
                  type="text"
                  value={editingProduct.icon?.startsWith('http') ? '' : editingProduct.icon}
                  onChange={(e) => setEditingProduct({...editingProduct, icon: e.target.value})}
                  placeholder="o Emoji"
                  maxLength={2}
                  className="mt-2 w-24 bg-surface-2 border border-border rounded-lg py-1 px-2 text-center text-sm md:text-[15px] focus:outline-none focus:border-[#ff5252] text-text"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm md:text-[15px] font-bold text-text mb-2">Descripción (Pública)</label>
                <textarea 
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                  placeholder="Escribí una buena descripción del producto para tus clientes..."
                  className="w-full bg-surface-2 border border-border rounded-xl py-3 px-4 text-text focus:outline-none focus:border-[#ff5252] transition-colors resize-none h-24"
                />
              </div>

              {/* Opcionales (Addons) */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm md:text-[15px] font-bold text-text">Opcionales (Ej: Agregar Cheddar)</label>
                  <button 
                    type="button"
                    onClick={() => setEditingProduct({
                      ...editingProduct, 
                      addons: [...(editingProduct.addons || []), { id: Date.now().toString(), name: '', price: 0 }]
                    })}
                    className="text-brand hover:text-brand-hover text-sm font-bold flex items-center gap-1 transition-colors"
                  >
                    <Plus size={14} /> Agregar
                  </button>
                </div>
                <div className="space-y-3 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                  {(!editingProduct.addons || editingProduct.addons.length === 0) && (
                    <p className="text-sm text-dim italic">No hay opcionales configurados.</p>
                  )}
                  {editingProduct.addons?.map((addon, idx) => (
                    <div key={addon.id || idx} className="flex items-center gap-2">
                      <input 
                        type="text"
                        placeholder="Nombre (ej. Papas)"
                        value={addon.name}
                        onChange={(e) => {
                          const newAddons = [...editingProduct.addons];
                          newAddons[idx].name = e.target.value;
                          setEditingProduct({...editingProduct, addons: newAddons});
                        }}
                        className="flex-1 bg-surface-2 border border-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-[#ff5252] text-text"
                      />
                      <input 
                        type="number"
                        placeholder="Precio $"
                        value={addon.price}
                        onChange={(e) => {
                          const newAddons = [...editingProduct.addons];
                          newAddons[idx].price = Number(e.target.value);
                          setEditingProduct({...editingProduct, addons: newAddons});
                        }}
                        className="w-24 bg-surface-2 border border-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-[#ff5252] text-text"
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          const newAddons = editingProduct.addons.filter((_, i) => i !== idx);
                          setEditingProduct({...editingProduct, addons: newAddons});
                        }}
                        className="text-dim hover:text-red-400 p-2 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recomendados */}
              <div className="mb-6">
                <label className="block text-sm md:text-[15px] font-bold text-text mb-2">Productos Recomendados</label>
                <p className="text-xs text-muted mb-2">Seleccioná los productos que querés mostrar al final de este producto.</p>
                <div className="bg-surface-2 border border-border rounded-xl max-h-40 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                  {products.filter(p => p.id !== editingProduct.id).map(p => {
                    const isSelected = editingProduct.recommended?.includes(p.id);
                    return (
                      <label key={p.id} className="flex items-center gap-2 p-2 hover:bg-bg rounded-lg cursor-pointer transition-colors">
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            let newRec = [...(editingProduct.recommended || [])];
                            if (e.target.checked) newRec.push(p.id);
                            else newRec = newRec.filter(id => id !== p.id);
                            setEditingProduct({...editingProduct, recommended: newRec});
                          }}
                          className="w-4 h-4 rounded border-border text-brand focus:ring-brand accent-brand"
                        />
                        <span className="text-sm text-text truncate">{p.icon && p.icon.length <= 2 ? p.icon + ' ' : ''}{p.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingProduct(null)} className="flex-1 px-4 py-2 border border-border rounded-lg text-text font-medium hover:bg-surface-2 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 bg-brand hover:bg-brand-hover text-text font-bold px-4 py-2 rounded-lg transition-colors">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
