import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, User, Save, Loader2, Copy, CheckCircle2, Mail, Phone, Store } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, profile, owner_id } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: user?.email || '',
    businessPhone: '',
    businessName: ''
  });

  useEffect(() => {
    if (user && profile !== undefined) {
      fetchData();
    }
  }, [user, profile, owner_id]);

  const fetchData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      let pUsername = profile?.username || '';
      let pFullName = profile?.full_name || '';

      // Fetch store settings
      let sName = '';
      let sPhone = '';
      if (owner_id) {
        const { data: storeData } = await supabase
          .from('store_settings')
          .select('store_name, whatsapp_number')
          .eq('user_id', owner_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (storeData) {
          sName = storeData.store_name || '';
          sPhone = storeData.whatsapp_number || '';
        }
      }

      setFormData(prev => ({
        ...prev,
        username: pUsername,
        fullName: pFullName,
        businessName: sName,
        businessPhone: sPhone
      }));

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCopyId = () => {
    const id = user?.id || '';
    if (id) {
      navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Update profile
      if (profile?.id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            username: formData.username,
            full_name: formData.fullName
          })
          .eq('id', profile.id);
        if (profileError) throw profileError;
      } else {
        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert({ 
            id: user.id,
            username: formData.username,
            full_name: formData.fullName,
            owner_id: user.id,
            role: 'Propietario'
          });
        if (upsertError) throw upsertError;
      }

      // Update store settings
      if (owner_id) {
        const { data: existingStore } = await supabase
          .from('store_settings')
          .select('id')
          .eq('user_id', owner_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingStore) {
          const { error: updateStoreError } = await supabase
            .from('store_settings')
            .update({
              store_name: formData.businessName,
              whatsapp_number: formData.businessPhone
            })
            .eq('id', existingStore.id);
          if (updateStoreError) throw updateStoreError;
        } else {
          const { error: insertStoreError } = await supabase
            .from('store_settings')
            .insert({
              user_id: owner_id,
              store_name: formData.businessName,
              whatsapp_number: formData.businessPhone
            });
          if (insertStoreError) throw insertStoreError;
        }
      }

      toast.success('Perfil actualizado correctamente');
      
      // Reload page to refresh AuthContext and other global states
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      toast.error(error?.message || 'Error al actualizar el perfil');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg">
        <Loader2 className="animate-spin text-brand" size={32} />
      </div>
    );
  }

  const shortId = user?.id ? user.id.substring(0, 8).toUpperCase() : '------';

  return (
    <div className="flex-1 bg-bg overflow-y-auto min-h-screen">
      <div className="max-w-3xl mx-auto p-4 md:p-8 animate-in fade-in">
        
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm md:text-[15px] text-muted hover:text-text mb-6 transition-colors font-medium">
            <ArrowLeft size={16} /> Volver al inicio
          </Link>
          <h1 className="text-3xl font-display font-bold text-text">Mi Perfil</h1>
          <p className="text-muted mt-1">Gestiona la información de tu cuenta</p>
        </div>

        {/* Info Card */}
        <div className="bg-surface border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <User size={18} className="text-text" />
              <h2 className="font-bold text-text">Información de la cuenta</h2>
              <div className="flex items-center gap-2 bg-surface-2 border border-border px-2 py-0.5 rounded-md ml-2">
                <span className="text-sm md:text-[15px] font-mono font-medium text-text">{shortId}</span>
              </div>
              <button onClick={handleCopyId} className="text-muted hover:text-text transition-colors p-1" title="Copiar ID">
                {copied ? <CheckCircle2 size={14} className="text-brand" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
          <p className="text-sm md:text-[15px] text-muted mb-6">Tu información básica y datos de contacto</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm md:text-[15px] font-medium text-muted mb-2">Usuario</label>
              <input 
                type="text" 
                readOnly
                value={`@${formData.username || 'usuario'}`}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-sm md:text-[15px] text-muted focus:outline-none cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm md:text-[15px] font-medium text-muted mb-2">Estado</label>
              <div className="inline-flex">
                <span className="bg-brand/20 text-brand font-bold text-sm md:text-[15px] px-3 py-1.5 rounded-md">Activo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSave} className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6">
            <h2 className="font-bold text-text mb-1">Editar Perfil</h2>
            <p className="text-sm md:text-[15px] text-muted mb-6">Actualiza tu información personal</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="flex items-center gap-2 text-sm md:text-[15px] font-medium text-text mb-2">
                  <User size={16} className="text-muted" /> Nombre completo
                </label>
                <input 
                  type="text" 
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm md:text-[15px] text-text focus:outline-none focus:border-brand transition-colors"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm md:text-[15px] font-medium text-text mb-2">
                  <User size={16} className="text-muted" /> Usuario
                </label>
                <input 
                  type="text" 
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm md:text-[15px] text-text focus:outline-none focus:border-brand transition-colors"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm md:text-[15px] font-medium text-text mb-2">
                  <Mail size={16} className="text-muted" /> Email (opcional)
                </label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled
                  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-sm md:text-[15px] text-muted focus:outline-none cursor-not-allowed"
                />
              </div>
            </div>

            <Link to="/reset-password" className="text-sm md:text-[15px] text-brand font-medium hover:underline block mb-8">
              ¿Quieres cambiar tu contraseña? Hazlo Aquí
            </Link>

            <hr className="border-border mb-6" />

            <div className="bg-surface border border-border rounded-xl p-4 mb-6">
              <h3 className="font-bold text-text mb-1 text-sm md:text-[15px]">Editar negocio</h3>
              <p className="text-sm md:text-[15px] text-muted">Actualiza el nombre y teléfono del negocio actual</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm md:text-[15px] font-medium text-text mb-2">
                  <Phone size={16} className="text-muted" /> Teléfono de contacto
                </label>
                <input 
                  type="tel" 
                  name="businessPhone"
                  value={formData.businessPhone}
                  onChange={handleChange}
                  placeholder="+54 11..."
                  className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm md:text-[15px] text-text focus:outline-none focus:border-brand transition-colors"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm md:text-[15px] font-medium text-text mb-2">
                  <Store size={16} className="text-muted" /> Nombre del negocio
                </label>
                <input 
                  type="text" 
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm md:text-[15px] text-text focus:outline-none focus:border-brand transition-colors"
                />
              </div>
            </div>
          </div>
          
          <div className="p-4 border-t border-border flex justify-end bg-surface-2/50">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
              Guardar Cambios
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
