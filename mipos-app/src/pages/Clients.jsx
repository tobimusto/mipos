import { useState, useEffect } from 'react';
import {
  Search, UserPlus, Users as UsersIcon, X, Loader2, Edit2,
  ChevronUp, ChevronDown, Phone, FileText, ChevronsUpDown
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useCountry } from '../context/CountryContext';
import { IVA_CONDITIONS, DEFAULT_IVA } from '../constants/enums';
import toast from 'react-hot-toast';
import Pagination from '../components/Pagination';

const WhatsAppIcon = ({ size = 16, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
  </svg>
);

export default function Clients() {
  const { user, owner_id } = useAuth();
  const { formatCurrency, formatDate, formatDateTime, countryConfig } = useCountry();

  const [clients, setClients]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy]         = useState('created_at');
  const [sortDir, setSortDir]       = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Modales
  const [showNewModal, setShowNewModal]     = useState(false);
  const [showEditModal, setShowEditModal]   = useState(false);
  const [showDebtModal, setShowDebtModal]   = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [newClient, setNewClient] = useState({
    nombre: '', telefono: '', cuit: '', iva: DEFAULT_IVA, domicilio: '', provincia: ''
  });
  const [editingClient, setEditingClient]   = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [debtAction, setDebtAction]         = useState('sumar');
  const [debtAmount, setDebtAmount]         = useState('');
  const [errorMsg, setErrorMsg]             = useState('');

  // Historial de ventas del cliente
  const [clientSales, setClientSales]     = useState([]);
  const [loadingSales, setLoadingSales]   = useState(false);

  /* ── Fetchers ── */
  useEffect(() => { if (user) fetchClients(); }, [user]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients').select('*').eq('user_id', owner_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setClients(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchClientSales = async (clientId) => {
    setLoadingSales(true);
    try {
      const { data } = await supabase
        .from('sales')
        .select('id, created_at, total, payment_method')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(30);
      setClientSales(data || []);
    } catch (e) { console.error(e); }
    finally { setLoadingSales(false); }
  };

  /* ── Computed ── */
  const filteredClients = clients.filter(c => {
    const q = searchTerm.toLowerCase();
    return (
      c.nombre?.toLowerCase().includes(q) ||
      c.telefono?.includes(q) ||
      c.cuit?.includes(q) ||
      c.domicilio?.toLowerCase().includes(q)
    );
  });

  const sortedClients = [...filteredClients].sort((a, b) => {
    let va = a[sortBy] ?? '', vb = b[sortBy] ?? '';
    if (sortBy === 'nombre') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
    if (sortBy === 'deuda') { va = Number(va); vb = Number(vb); }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const PAGE_SIZE_CLIENTS = 20;
  const totalPagesClients = Math.ceil(sortedClients.length / PAGE_SIZE_CLIENTS);
  const paginatedClients  = sortedClients.slice(
    (currentPage - 1) * PAGE_SIZE_CLIENTS,
    currentPage * PAGE_SIZE_CLIENTS
  );

  useEffect(() => setCurrentPage(1), [searchTerm, sortBy, sortDir]);

  const totalDeuda     = clients.reduce((s, c) => s + Number(c.deuda || 0), 0);
  const clientsInDebt  = clients.filter(c => Number(c.deuda) > 0).length;

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <ChevronsUpDown size={13} className="text-dim ml-1 inline" />;
    return sortDir === 'asc'
      ? <ChevronUp size={13} className="text-brand ml-1 inline" />
      : <ChevronDown size={13} className="text-brand ml-1 inline" />;
  };

  /* ── Handlers ── */
  const handleCreate = async () => {
    if (!newClient.nombre) return toast.error('El nombre es obligatorio.');
    try {
      const { data, error } = await supabase.from('clients')
        .insert([{ ...newClient, user_id: owner_id }]).select();
      if (error) throw error;
      setClients(prev => [data[0], ...prev]);
      setShowNewModal(false);
      setNewClient({ nombre: '', telefono: '', cuit: '', iva: DEFAULT_IVA, domicilio: '', provincia: '' });
      toast.success('Cliente creado');
    } catch (e) { toast.error('Error al crear el cliente.'); }
  };

  const handleEdit = async () => {
    if (!editingClient?.nombre) return toast.error('El nombre es obligatorio.');
    try {
      const { nombre, telefono, cuit, iva, domicilio, provincia } = editingClient;
      const { error } = await supabase.from('clients')
        .update({ nombre, telefono, cuit, iva, domicilio, provincia })
        .eq('id', editingClient.id);
      if (error) throw error;
      setClients(prev => prev.map(c => c.id === editingClient.id ? { ...c, ...editingClient } : c));
      // Sync si el detail modal está abierto
      if (selectedClient?.id === editingClient.id) setSelectedClient(prev => ({ ...prev, ...editingClient }));
      setShowEditModal(false);
      toast.success('Cliente actualizado');
    } catch (e) { toast.error('Error al actualizar el cliente.'); }
  };

  const handleUpdateDebt = async () => {
    setErrorMsg('');
    const amount = parseFloat(debtAmount);
    if (!amount || amount <= 0) return setErrorMsg('Ingresá un monto mayor a 0.');
    
    if (debtAction === 'restar' && amount > Number(selectedClient.deuda)) {
      return setErrorMsg(`No podés mipos más de la deuda actual (${formatCurrency(selectedClient.deuda)}).`);
    }

    const newDebt = debtAction === 'sumar'
      ? Number(selectedClient.deuda) + amount
      : Number(selectedClient.deuda) - amount;
    try {
      const { error } = await supabase.from('clients')
        .update({ deuda: newDebt }).eq('id', selectedClient.id);
      if (error) throw error;
      const updated = { ...selectedClient, deuda: newDebt };
      setClients(prev => prev.map(c => c.id === selectedClient.id ? updated : c));
      setSelectedClient(updated);
      setShowDebtModal(false);
      setDebtAmount('');
      toast.success('Deuda actualizada');
    } catch (e) { toast.error('Error al actualizar la deuda.'); }
  };

  const openDetail = (client) => {
    setSelectedClient(client);
    setShowDetailModal(true);
    fetchClientSales(client.id);
  };

  /* ── Render ── */
  return (
    <div className="flex flex-col p-4 md:p-8">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-display font-bold text-text">Clientes</h1>
          <p className="text-sm md:text-[15px] text-muted">Gestioná tus clientes y sus cuentas corrientes</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="w-full sm:w-auto bg-brand hover:bg-brand-hover text-text font-bold py-2.5 px-5 rounded-xl transition-all text-sm md:text-[15px] flex items-center justify-center gap-2 shrink-0"
        >
          <UserPlus size={16} /> Nuevo Cliente
        </button>
      </div>

      {/* Resumen */}
      {!loading && clients.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Total clientes', value: clients.length, color: null },
            { label: 'Con deuda', value: clientsInDebt, color: clientsInDebt > 0 ? 'text-orange-400' : null },
            { label: 'Deuda total', value: formatCurrency(totalDeuda), color: totalDeuda > 0 ? 'text-red-400' : 'text-brand' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-surface-2 border border-border rounded-2xl p-4">
              <p className="text-sm md:text-[15px] font-bold text-muted uppercase tracking-wider mb-1">{label}</p>
              <p className={`text-xl font-bold font-mono ${color ?? 'text-text'}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-surface-2 border border-border rounded-2xl flex flex-col">
        {/* Búsqueda */}
        <div className="p-4 border-b border-border bg-surface">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono, CUIT o domicilio…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-bg border border-border rounded-xl py-2 pl-9 pr-4 text-sm md:text-[15px] focus:outline-none focus:border-brand/50 transition-colors text-text"
            />
          </div>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="flex items-center justify-center p-16">
            <Loader2 className="animate-spin text-brand" size={28} />
          </div>
        ) : sortedClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <UsersIcon size={40} className="text-dim mb-3" />
            <h3 className="text-base font-bold text-text mb-1">
              {searchTerm ? 'Sin resultados' : 'No hay clientes'}
            </h3>
            <p className="text-sm md:text-[15px] text-muted mb-5">
              {searchTerm ? 'Probá con otro término.' : 'Registrá tu primer cliente para empezar.'}
            </p>
            {!searchTerm && (
              <button onClick={() => setShowNewModal(true)}
                className="bg-brand/10 text-brand hover:bg-brand/20 font-bold py-2 px-5 rounded-lg text-sm md:text-[15px] flex items-center gap-2 border border-brand/30 transition-colors">
                <UserPlus size={15} /> Registrar primer cliente
              </button>
            )}
          </div>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm md:text-[15px] border-collapse">
              <thead className="bg-surface">
                <tr>
                  {[
                    { key: 'nombre',     label: 'Nombre' },
                    { key: 'telefono',   label: 'Teléfono' },
                    { key: 'cuit',       label: `${countryConfig.taxId.label} / ${countryConfig.personId.label}` },
                    { key: 'iva',        label: 'IVA' },
                    { key: 'created_at', label: 'Alta' },
                    { key: 'deuda',      label: 'Deuda' },
                  ].map(({ key, label }) => (
                    <th key={key}
                      onClick={() => toggleSort(key)}
                      className="px-4 py-3 text-sm md:text-[15px] font-bold tracking-wider text-muted uppercase border-b border-border cursor-pointer hover:text-text transition-colors select-none">
                      {label}<SortIcon col={key} />
                    </th>
                  ))}
                  <th className="px-4 py-3 border-b border-border" />
                </tr>
              </thead>
              <tbody>
                {paginatedClients.map(c => (
                  <tr key={c.id}
                    onClick={() => openDetail(c)}
                    className="border-b border-border/50 hover:bg-surface transition-colors cursor-pointer">
                    <td className="px-4 py-3 font-semibold text-text">{c.nombre}</td>
                    <td className="px-4 py-3 text-muted">
                      {c.telefono ? (
                        <div className="flex items-center gap-2">
                          {c.telefono}
                          <a 
                            href={`https://wa.me/${c.telefono.replace(/[^0-9]/g, '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[#25D366] hover:text-[#128C7E] transition-colors"
                            onClick={(e) => e.stopPropagation()}
                            title="Contactar por WhatsApp"
                          >
                            <WhatsAppIcon size={16} />
                          </a>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted font-mono text-sm md:text-[15px]">{c.cuit || '—'}</td>
                    <td className="px-4 py-3 text-muted text-sm md:text-[15px]">{c.iva}</td>
                    <td className="px-4 py-3 text-muted text-sm md:text-[15px]">
                      {formatDate(new Date(c.created_at))}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono tabular-nums"
                          style={{ color: Number(c.deuda) > 0 ? 'var(--c-crit)' : 'var(--my-brand)' }}>
                          {formatCurrency(c.deuda)}
                        </span>
                        {Number(c.deuda) > 0 && (
                          <button
                            onClick={() => { setSelectedClient(c); setDebtAction('restar'); setDebtAmount(''); setErrorMsg(''); setShowDebtModal(true); }}
                            className="text-sm md:text-[15px] font-bold px-2 py-0.5 rounded-full border transition-colors bg-brand/10 border-brand/30 text-brand hover:bg-brand hover:text-text"
                            title="Registrar cobro">
                            mipos
                          </button>
                        )}
                        <button
                          onClick={() => { setSelectedClient(c); setDebtAction('sumar'); setDebtAmount(''); setErrorMsg(''); setShowDebtModal(true); }}
                          className="text-sm md:text-[15px] font-bold w-5 h-5 rounded-full border transition-colors bg-surface border-border text-muted hover:border-brand hover:text-brand flex items-center justify-center"
                          title="Sumar deuda">
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => { setEditingClient({ ...c }); setShowEditModal(true); }}
                        className="p-1.5 text-muted hover:text-text rounded-lg transition-colors border border-transparent hover:border-border"
                        title="Editar cliente">
                        <Edit2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPagesClients}
            totalItems={sortedClients.length}
            pageSize={PAGE_SIZE_CLIENTS}
            onPageChange={setCurrentPage}
          />
          </>
        )}
      </div>

      {/* ── MODAL: Nuevo Cliente ── */}
      {showNewModal && (
        <Modal title="Nuevo Cliente" onClose={() => setShowNewModal(false)}>
          <ClientForm data={newClient} onChange={setNewClient} />
          <ModalFooter
            onCancel={() => setShowNewModal(false)}
            onConfirm={handleCreate}
            confirmLabel="Crear Cliente"
          />
        </Modal>
      )}

      {/* ── MODAL: Editar Cliente ── */}
      {showEditModal && editingClient && (
        <Modal title="Editar Cliente" onClose={() => setShowEditModal(false)}>
          <ClientForm data={editingClient} onChange={setEditingClient} />
          <ModalFooter
            onCancel={() => setShowEditModal(false)}
            onConfirm={handleEdit}
            confirmLabel="Guardar cambios"
          />
        </Modal>
      )}

      {/* ── MODAL: Detalle del cliente ── */}
      {showDetailModal && selectedClient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg border border-border rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border bg-surface flex items-center gap-4 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-brand/15 text-brand flex items-center justify-center font-bold text-lg shrink-0">
                {selectedClient.nombre?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-text truncate">{selectedClient.nombre}</h2>
                <div className="text-sm md:text-[15px] text-muted flex items-center gap-2 mt-0.5">
                  {selectedClient.telefono || 'Sin teléfono'}
                  {selectedClient.telefono && (
                    <a 
                      href={`https://wa.me/${selectedClient.telefono.replace(/[^0-9]/g, '')}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[#25D366] hover:text-[#128C7E] transition-colors"
                      title="Contactar por WhatsApp"
                    >
                      <WhatsAppIcon size={14} />
                    </a>
                  )}
                  {selectedClient.cuit ? ` · CUIT: ${selectedClient.cuit}` : ''}
                </div>
              </div>
              <button onClick={() => { setShowDetailModal(false); setErrorMsg(''); }} className="text-muted hover:text-text transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* Deuda */}
              <div className="p-5 border-b border-border">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm md:text-[15px] font-bold text-muted uppercase tracking-wider">Cuenta corriente</p>
                  <button
                    onClick={() => { setShowDebtModal(true); setDebtAction('sumar'); setDebtAmount(''); setErrorMsg(''); }}
                    className="text-sm md:text-[15px] font-bold text-brand hover:underline"
                  >
                    Ajustar deuda
                  </button>
                </div>
                <p className="text-3xl font-bold font-mono"
                  style={{ color: Number(selectedClient.deuda) > 0 ? 'var(--c-crit)' : 'var(--my-brand)' }}>
                  {formatCurrency(selectedClient.deuda)}
                </p>
                {Number(selectedClient.deuda) === 0 && (
                  <p className="text-sm md:text-[15px] text-muted mt-1">Sin deuda pendiente</p>
                )}
              </div>

              {/* Info */}
              <div className="p-5 border-b border-border grid grid-cols-2 gap-3">
                {[
                  ['IVA', selectedClient.iva],
                  ['Domicilio', selectedClient.domicilio || '—'],
                  ['Provincia', selectedClient.provincia || '—'],
                  ['Alta', formatDate(new Date(selectedClient.created_at))],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p className="text-sm md:text-[15px] font-bold text-muted uppercase tracking-wider">{label}</p>
                    <p className="text-sm md:text-[15px] text-text mt-0.5">{val}</p>
                  </div>
                ))}
              </div>

              {/* Historial de ventas */}
              <div className="p-5">
                <p className="text-sm md:text-[15px] font-bold text-muted uppercase tracking-wider mb-3">
                  Ventas registradas
                </p>
                {loadingSales ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="animate-spin text-brand" size={20} />
                  </div>
                ) : clientSales.length === 0 ? (
                  <p className="text-sm md:text-[15px] text-muted py-2">Sin ventas registradas para este cliente.</p>
                ) : (
                  <div className="space-y-2">
                    {clientSales.map(sale => (
                      <div key={sale.id} className="flex items-center justify-between px-3 py-2.5 bg-surface border border-border rounded-xl">
                        <div>
                          <p className="text-sm md:text-[15px] font-medium text-text">
                            {formatDateTime(new Date(sale.created_at))}
                          </p>
                          <span className={`text-sm md:text-[15px] font-bold capitalize ${
                            sale.payment_method === 'fiado' ? 'text-orange-400' : 'text-brand'
                          }`}>
                            {sale.payment_method}
                          </span>
                        </div>
                        <p className="text-sm md:text-[15px] font-bold text-brand font-mono">{formatCurrency(sale.total)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-border shrink-0 flex gap-3">
              <button
                onClick={() => { setEditingClient({ ...selectedClient }); setShowEditModal(true); setShowDetailModal(false); }}
                className="flex-1 border border-border text-text font-medium py-2.5 rounded-xl hover:bg-surface transition-all text-sm md:text-[15px] flex items-center justify-center gap-2"
              >
                <Edit2 size={14} /> Editar datos
              </button>
              <button onClick={() => { setShowDetailModal(false); setErrorMsg(''); }}
                className="flex-1 bg-brand hover:bg-brand-hover text-text font-bold py-2.5 rounded-xl transition-all text-sm md:text-[15px]">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Ajustar deuda ── */}
      {showDebtModal && selectedClient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-bg border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h2 className="text-base font-bold text-text mb-1">Ajustar deuda</h2>
            <p className="text-sm md:text-[15px] text-muted mb-4">
              {selectedClient.nombre} · actual: <span className="font-bold font-mono" style={{ color: Number(selectedClient.deuda) > 0 ? 'var(--c-crit)' : 'var(--my-brand)' }}>{formatCurrency(selectedClient.deuda)}</span>
            </p>

            <div className="flex bg-surface-2 rounded-lg p-1 mb-4 border border-border">
              {[['sumar', 'Sumar deuda'], ['restar', 'Abonar (restar)']]
                .filter(([val]) => val === 'sumar' || Number(selectedClient.deuda) > 0)
                .map(([val, label]) => (
                <button key={val} onClick={() => setDebtAction(val)}
                  className={`flex-1 py-1.5 text-sm md:text-[15px] font-bold rounded-md transition-colors ${debtAction === val ? 'bg-brand text-text' : 'text-muted hover:text-text'}`}>
                  {label}
                </button>
              ))}
            </div>

            <div className="relative mb-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-muted font-bold">$</span>
              <input
                type="number" value={debtAmount} onChange={e => { setDebtAmount(e.target.value); setErrorMsg(''); }}
                placeholder="0.00" autoFocus
                className="w-full bg-surface-2 border border-border rounded-xl py-3 pl-8 pr-4 text-text text-lg font-bold focus:outline-none focus:border-brand transition-colors"
              />
            </div>
            {errorMsg && <p className="text-sm md:text-[15px] text-red-400 mb-2">{errorMsg}</p>}

            <div className="flex gap-3 mt-4">
              <button onClick={() => { setShowDebtModal(false); setErrorMsg(''); }}
                className="flex-1 border border-border text-text font-medium py-3 rounded-xl hover:bg-surface transition-all text-sm md:text-[15px]">
                Cancelar
              </button>
              <button onClick={handleUpdateDebt}
                className="flex-1 bg-brand hover:bg-brand-hover text-text font-bold py-3 rounded-xl transition-all text-sm md:text-[15px]">
                Actualizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-componentes ── */
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-bg border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted hover:text-text transition-colors">
          <X size={18} />
        </button>
        <div className="p-5 border-b border-border bg-surface">
          <h2 className="text-base font-display font-bold text-text">{title}</h2>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalFooter({ onCancel, onConfirm, confirmLabel }) {
  return (
    <div className="p-4 border-t border-border bg-surface flex justify-end gap-3 sticky bottom-0">
      <button onClick={onCancel}
        className="px-4 py-2 text-sm md:text-[15px] font-medium text-muted hover:text-text border border-border rounded-lg transition-colors">
        Cancelar
      </button>
      <button onClick={onConfirm}
        className="bg-brand hover:bg-brand-hover font-bold text-text py-2 px-5 rounded-lg transition-all text-sm md:text-[15px]">
        {confirmLabel}
      </button>
    </div>
  );
}

function ClientForm({ data, onChange }) {
  const { countryConfig } = useCountry();
  const field = (key, label, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm md:text-[15px] font-bold text-text mb-1.5">{label}</label>
      <input
        type={type} value={data[key] ?? ''}
        onChange={e => onChange(prev => ({ ...prev, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full bg-surface-2 border border-border rounded-lg py-2.5 px-3 text-sm md:text-[15px] focus:outline-none focus:border-brand/50 text-text transition-colors"
      />
    </div>
  );

  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {field('nombre', 'Nombre *', 'text', 'Nombre del cliente')}
        {field('telefono', 'Teléfono', 'tel', '+54 9 ...')}
        {field('cuit', `${countryConfig.taxId.label} / ${countryConfig.personId.label} (Opcional)`, 'text', '')}
        <div>
          <label className="block text-sm md:text-[15px] font-bold text-text mb-1.5">Condición {countryConfig.tax.name}</label>
          <select
            value={data.iva}
            onChange={e => onChange(prev => ({ ...prev, iva: e.target.value }))}
            className="w-full bg-surface-2 border border-border rounded-lg py-2.5 px-3 text-sm md:text-[15px] focus:outline-none focus:border-brand/50 text-text transition-colors appearance-none"
          >
            {countryConfig.tax.conditions.map(o => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
        {field('domicilio', 'Domicilio (Opcional)', 'text', 'Dirección')}
        {field('provincia', `${countryConfig.region.label} (Opcional)`, 'text', countryConfig.region.placeholder)}
      </div>
    </div>
  );
}
