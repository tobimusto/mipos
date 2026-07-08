import { useState, useEffect } from 'react';
import { Search, Plus, Phone, Mail, Building, History, X, Loader2, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useCountry } from '../context/CountryContext';
import toast from 'react-hot-toast';
import Pagination from '../components/Pagination';

export default function Providers() {
  const { user, owner_id } = useAuth();
  const { formatCurrency, formatDateShort, formatDate, countryConfig } = useCountry();

  const [providers, setProviders]       = useState([]);
  const [providerStats, setStats]       = useState({});
  const [loading, setLoading]           = useState(true);
  const [searchTerm, setSearchTerm]     = useState('');
  const [currentPage, setCurrentPage]  = useState(1);

  // Modales
  const [showCreateModal, setShowCreateModal]   = useState(false);
  const [showEditModal, setShowEditModal]       = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [selectedProvider, setSelectedProvider] = useState(null);
  const [providerHistory, setProviderHistory]   = useState([]);
  const [historyLoading, setHistoryLoading]     = useState(false);
  const [isSaving, setIsSaving]                 = useState(false);
  const [isDeleting, setIsDeleting]             = useState(false);

  const emptyForm = { nombre: '', telefono: '', cuit: '', email: '', notas: '' };
  const [form, setForm]         = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

  /* ── Fetch ── */
  useEffect(() => {
    if (user) { fetchProviders(); fetchProviderStats(); }
  }, [user]);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const uid = owner_id || user?.id;
      const { data, error } = await supabase
        .from('providers').select('*')
        .eq('user_id', uid).order('nombre');
      if (error) throw error;
      setProviders(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchProviderStats = async () => {
    try {
      const uid = owner_id || user?.id;
      const { data } = await supabase
        .from('purchases').select('provider_id, subtotal, fecha')
        .eq('user_id', uid);
      const stats = {};
      (data || []).forEach(p => {
        if (!p.provider_id) return;
        if (!stats[p.provider_id]) stats[p.provider_id] = { total: 0, count: 0, lastDate: null };
        stats[p.provider_id].total += Number(p.subtotal);
        stats[p.provider_id].count++;
        if (!stats[p.provider_id].lastDate || p.fecha > stats[p.provider_id].lastDate)
          stats[p.provider_id].lastDate = p.fecha;
      });
      setStats(stats);
    } catch (e) { console.error(e); }
  };

  const openHistory = async (provider) => {
    setSelectedProvider(provider);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('purchases').select(`*, products (name)`)
        .eq('provider_id', provider.id)
        .order('fecha', { ascending: false });
      if (error) throw error;
      setProviderHistory(data || []);
    } catch (e) { console.error(e); }
    finally { setHistoryLoading(false); }
  };

  /* ── Handlers ── */
  const handleCreate = async () => {
    if (!form.nombre.trim()) return toast.error('El nombre es obligatorio.');
    setIsSaving(true);
    try {
      const uid = owner_id || user?.id;
      const { data, error } = await supabase
        .from('providers').insert([{ user_id: uid, ...form }]).select().single();
      if (error) throw error;
      setProviders(prev => [data, ...prev].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setShowCreateModal(false); setForm(emptyForm);
      toast.success('Proveedor creado');
    } catch (e) { toast.error('Error al crear el proveedor.'); }
    finally { setIsSaving(false); }
  };

  const handleEdit = async () => {
    if (!editForm.nombre.trim()) return toast.error('El nombre es obligatorio.');
    setIsSaving(true);
    try {
      const { nombre, telefono, cuit, email, notas } = editForm;
      const { error } = await supabase.from('providers')
        .update({ nombre, telefono, cuit, email, notas }).eq('id', editForm.id);
      if (error) throw error;
      setProviders(prev => prev.map(p => p.id === editForm.id ? { ...p, ...editForm } : p).sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setShowEditModal(false);
      toast.success('Proveedor actualizado');
    } catch (e) { toast.error('Error al actualizar el proveedor.'); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    if (!selectedProvider) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('providers').delete().eq('id', selectedProvider.id);
      if (error) throw error;
      setProviders(prev => prev.filter(p => p.id !== selectedProvider.id));
      setShowDeleteConfirm(false); setSelectedProvider(null);
      toast.success('Proveedor eliminado');
    } catch (e) {
      toast.error('No se puede eliminar: tiene compras asociadas.');
    } finally { setIsDeleting(false); }
  };

  /* ── Computed ── */
  const filtered = providers.filter(p =>
    p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.cuit?.includes(searchTerm) ||
    p.telefono?.includes(searchTerm)
  );

  useEffect(() => setCurrentPage(1), [searchTerm]);

  const PAGE_SIZE_PROVIDERS = 12;
  const totalPagesProviders = Math.ceil(filtered.length / PAGE_SIZE_PROVIDERS);
  const paginatedProviders  = filtered.slice(
    (currentPage - 1) * PAGE_SIZE_PROVIDERS,
    currentPage * PAGE_SIZE_PROVIDERS
  );

  const historyTotal = providerHistory.reduce((s, p) => s + Number(p.subtotal), 0);

  /* ── Render ── */
  return (
    <div className="flex flex-col p-4 md:p-8">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-display font-bold text-text">Proveedores</h1>
          <p className="text-sm md:text-[15px] text-muted">Gestioná a quién le comprás y el historial de compras.</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setShowCreateModal(true); }}
          className="bg-brand hover:bg-brand-hover text-text font-bold py-2.5 px-5 rounded-xl transition-all text-sm md:text-[15px] flex items-center justify-center gap-2 w-full sm:w-auto shrink-0">
          <Plus size={16} /> Nuevo Proveedor
        </button>
      </div>

      {/* Resumen */}
      {!loading && providers.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { label: 'Proveedores', value: providers.length },
            { label: 'Con compras registradas', value: Object.keys(providerStats).length },
          ].map(({ label, value }) => (
            <div key={label} className="bg-surface-2 border border-border rounded-2xl p-4">
              <p className="text-sm md:text-[15px] font-bold text-muted uppercase tracking-wider mb-1">{label}</p>
              <p className="text-xl font-bold font-mono text-text">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-surface-2 border border-border rounded-2xl flex flex-col">
        {/* Búsqueda */}
        <div className="p-4 border-b border-border bg-surface">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input type="text" placeholder={`Buscar por nombre, ${countryConfig.taxId.label} o teléfono…`}
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-bg border border-border rounded-xl py-2 pl-9 pr-4 text-sm md:text-[15px] focus:outline-none focus:border-brand/50 transition-colors text-text" />
          </div>
        </div>

        {/* Grid de cards */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? (
            <div className="col-span-full flex justify-center p-12">
              <Loader2 className="animate-spin text-brand" size={28} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full text-center p-12">
              <Building size={36} className="text-dim mx-auto mb-3" />
              <p className="text-sm md:text-[15px] text-muted">{searchTerm ? 'Sin resultados.' : 'No hay proveedores registrados.'}</p>
            </div>
          ) : (
            paginatedProviders.map(p => {
              const stats = providerStats[p.id];
              return (
                <div key={p.id} className="bg-surface border border-border rounded-2xl p-4 hover:border-brand/40 transition-all flex flex-col">
                  {/* Header card */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 bg-brand/10 rounded-xl flex items-center justify-center shrink-0">
                      <Building size={16} className="text-brand" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm md:text-[15px] text-text truncate leading-tight">{p.nombre}</h3>
                      <p className="text-sm md:text-[15px] text-muted mt-0.5">
                        {stats?.lastDate
                          ? `Última compra: ${formatDateShort(new Date(stats.lastDate))}`
                          : 'Sin compras registradas'}
                      </p>
                    </div>
                  </div>

                  {/* Datos de contacto */}
                  <div className="space-y-1.5 py-3 border-t border-border/60 flex-1">
                    {p.telefono && (
                      <div className="flex items-center gap-2 text-sm md:text-[15px]">
                        <Phone size={11} className="text-muted shrink-0" />
                        <span className="text-text truncate">{p.telefono}</span>
                      </div>
                    )}
                    {p.email && (
                      <div className="flex items-center gap-2 text-sm md:text-[15px]">
                        <Mail size={11} className="text-muted shrink-0" />
                        <span className="text-text truncate">{p.email}</span>
                      </div>
                    )}
                    {p.cuit && (
                      <div className="flex items-center gap-2 text-sm md:text-[15px]">
                        <span className="text-muted text-sm md:text-[15px] font-bold">{countryConfig.taxId.label}</span>
                        <span className="text-text font-mono">{p.cuit}</span>
                      </div>
                    )}
                    {!p.telefono && !p.email && !p.cuit && (
                      <p className="text-sm md:text-[15px] text-dim italic">Sin datos de contacto</p>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-2 pt-3 border-t border-border/60">
                    <button onClick={() => openHistory(p)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm md:text-[15px] font-semibold text-muted hover:text-text bg-bg border border-border hover:border-brand/50 transition-colors">
                      <History size={12} /> Historial
                    </button>
                    <button onClick={() => { setEditForm({ ...p }); setShowEditModal(true); }}
                      className="p-1.5 rounded-lg text-muted hover:text-text bg-bg border border-border hover:border-border transition-colors"
                      title="Editar">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => { setSelectedProvider(p); setShowDeleteConfirm(true); }}
                      className="p-1.5 rounded-lg text-muted hover:text-red-400 bg-bg border border-border hover:border-red-400/40 transition-colors"
                      title="Eliminar">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPagesProviders}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE_PROVIDERS}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* ── MODAL: Crear proveedor ── */}
      {showCreateModal && (
        <ProviderModal
          title="Nuevo Proveedor"
          form={form} setForm={setForm}
          onClose={() => setShowCreateModal(false)}
          onConfirm={handleCreate}
          isSaving={isSaving}
          confirmLabel="Guardar"
        />
      )}

      {/* ── MODAL: Editar proveedor ── */}
      {showEditModal && (
        <ProviderModal
          title="Editar Proveedor"
          form={editForm} setForm={setEditForm}
          onClose={() => setShowEditModal(false)}
          onConfirm={handleEdit}
          isSaving={isSaving}
          confirmLabel="Guardar cambios"
        />
      )}

      {/* ── MODAL: Historial ── */}
      {showHistoryModal && selectedProvider && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-border bg-surface flex items-center justify-between shrink-0">
              <div>
                <h2 className="font-bold text-text flex items-center gap-2">
                  <History size={16} className="text-brand" /> {selectedProvider.nombre}
                </h2>
                <p className="text-sm md:text-[15px] text-muted mt-0.5">Historial de compras</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-muted hover:text-text"><X size={18} /></button>
            </div>

            {/* Resumen del proveedor */}
            {!historyLoading && providerHistory.length > 0 && (
              <div className="px-6 py-3 border-b border-border bg-surface/50 flex gap-6">
                <div>
                  <p className="text-sm md:text-[15px] font-bold text-muted uppercase tracking-wider">Compras</p>
                  <p className="text-lg font-bold text-text font-mono">{providerHistory.length}</p>
                </div>
                <div>
                  <p className="text-sm md:text-[15px] font-bold text-muted uppercase tracking-wider">Total gastado</p>
                  <p className="text-lg font-bold text-brand font-mono">{formatCurrency(historyTotal)}</p>
                </div>
                <div>
                  <p className="text-sm md:text-[15px] font-bold text-muted uppercase tracking-wider">Ticket promedio</p>
                  <p className="text-lg font-bold text-text font-mono">{formatCurrency(historyTotal / providerHistory.length)}</p>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
              {historyLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-brand" size={24} /></div>
              ) : providerHistory.length === 0 ? (
                <div className="text-center py-12 text-muted text-sm md:text-[15px]">Sin compras registradas para este proveedor.</div>
              ) : (
                <div className="space-y-2">
                  {providerHistory.map(purchase => (
                    <div key={purchase.id} className="bg-surface-2 border border-border rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-text text-sm md:text-[15px] truncate">{purchase.products?.name || 'Producto eliminado'}</p>
                        <p className="text-sm md:text-[15px] text-muted mt-0.5">
                          {formatDate(new Date(purchase.fecha))}
                          {' · '}{purchase.cantidad} {purchase.unidad_medida}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-right shrink-0">
                        <div>
                          <p className="text-sm md:text-[15px] text-muted">Costo unit.</p>
                          <p className="text-sm md:text-[15px] font-bold text-text font-mono">{formatCurrency(purchase.costo_unitario)}</p>
                        </div>
                        <div className="pl-4 border-l border-border">
                          <p className="text-sm md:text-[15px] text-muted">Subtotal</p>
                          <p className="text-sm md:text-[15px] font-bold text-brand font-mono">{formatCurrency(purchase.subtotal)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Confirmar eliminación ── */}
      {showDeleteConfirm && selectedProvider && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle size={20} style={{ color: 'var(--c-crit)' }} />
              </div>
              <div>
                <h3 className="font-bold text-text">¿Eliminar proveedor?</h3>
                <p className="text-sm md:text-[15px] text-muted mt-0.5">{selectedProvider.nombre}</p>
              </div>
            </div>
            <p className="text-sm md:text-[15px] text-muted mb-5">
              Si tiene compras asociadas no podrá eliminarse. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 border border-border text-text font-medium py-2.5 rounded-xl hover:bg-surface transition-all text-sm md:text-[15px]">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={isDeleting}
                className="flex-1 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm md:text-[15px]">
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Form modal reutilizable ── */
function ProviderModal({ title, form, setForm, onClose, onConfirm, isSaving, confirmLabel }) {
  const f = (key, label, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm md:text-[15px] font-bold text-text mb-1.5">{label}</label>
      <input type={type} value={form[key] ?? ''} placeholder={placeholder}
        onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
        className="w-full bg-surface-2 border border-border rounded-lg py-2.5 px-3 text-sm md:text-[15px] focus:outline-none focus:border-brand/50 text-text transition-colors" />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-bg border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-surface flex items-center justify-between">
          <h2 className="font-bold text-text">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-text"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          {f('nombre', 'Nombre o Razón Social *', 'text', 'Ej: Distribuidora Norte')}
          <div className="grid grid-cols-2 gap-4">
            {f('telefono', 'Teléfono')}
            {f('cuit', countryConfig.taxId.label)}
          </div>
          {f('email', 'Email', 'email')}
          <div>
            <label className="block text-sm md:text-[15px] font-bold text-text mb-1.5">Notas</label>
            <textarea value={form.notas ?? ''} rows={2}
              onChange={e => setForm(prev => ({ ...prev, notas: e.target.value }))}
              className="w-full bg-surface-2 border border-border rounded-lg py-2.5 px-3 text-sm md:text-[15px] focus:outline-none focus:border-brand/50 text-text transition-colors resize-none" />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-border bg-surface flex justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2 text-sm md:text-[15px] text-muted hover:text-text border border-border rounded-lg transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={isSaving}
            className="bg-brand hover:bg-brand-hover disabled:opacity-50 text-text font-bold py-2 px-5 rounded-lg transition-all text-sm md:text-[15px] flex items-center gap-2">
            {isSaving && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
