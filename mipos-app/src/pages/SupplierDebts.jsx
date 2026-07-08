import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, Check, Loader2, CreditCard, AlertCircle, CalendarClock, TrendingDown, Search, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useCountry } from '../context/CountryContext';
import toast from 'react-hot-toast';

const STATUS_LABELS = {
  pending: 'Pendiente',
  partial: 'Parcial',
  paid: 'Pagada',
};

const STATUS_COLORS = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  partial: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  paid: 'bg-green-500/10 text-green-400 border-green-500/20',
};

export default function SupplierDebts() {
  const { user, owner_id } = useAuth();
  const { formatCurrency, formatDate } = useCountry();

  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [installmentsMap, setInstallmentsMap] = useState({});
  const [loadingInstallments, setLoadingInstallments] = useState({});
  const [expandedDebt, setExpandedDebt] = useState(null);
  const [payingInstallment, setPayingInstallment] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) fetchDebts();
  }, [user]);

  const fetchDebts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('supplier_debts')
        .select(`*, providers (nombre), purchases (fecha)`)
        .eq('user_id', owner_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDebts(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar deudas');
    } finally {
      setLoading(false);
    }
  };

  const fetchInstallments = async (debtId) => {
    if (installmentsMap[debtId]) return;
    setLoadingInstallments(prev => ({ ...prev, [debtId]: true }));
    try {
      const { data, error } = await supabase
        .from('supplier_debt_installments')
        .select('*')
        .eq('debt_id', debtId)
        .order('numero');
      if (error) throw error;
      setInstallmentsMap(prev => ({ ...prev, [debtId]: data || [] }));
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar cuotas');
    } finally {
      setLoadingInstallments(prev => ({ ...prev, [debtId]: false }));
    }
  };

  const toggleExpand = (debtId) => {
    if (expandedDebt === debtId) {
      setExpandedDebt(null);
    } else {
      setExpandedDebt(debtId);
      fetchInstallments(debtId);
    }
  };

  const handlePayInstallment = async (installment, debt) => {
    setPayingInstallment(installment.id);
    try {
      const now = new Date().toISOString();
      const { error: instError } = await supabase
        .from('supplier_debt_installments')
        .update({ status: 'paid', paid_at: now })
        .eq('id', installment.id);
      if (instError) throw instError;

      const newPaidAmount = Number(debt.paid_amount) + Number(installment.monto);
      const allInstallments = installmentsMap[debt.id] || [];
      const pendingCount = allInstallments.filter(i => i.id !== installment.id && i.status === 'pending').length;
      const newStatus = pendingCount === 0 ? 'paid' : 'partial';

      const { error: debtError } = await supabase
        .from('supplier_debts')
        .update({ paid_amount: newPaidAmount, status: newStatus })
        .eq('id', debt.id);
      if (debtError) throw debtError;

      setInstallmentsMap(prev => ({
        ...prev,
        [debt.id]: (prev[debt.id] || []).map(i =>
          i.id === installment.id ? { ...i, status: 'paid', paid_at: now } : i
        ),
      }));
      setDebts(prev => prev.map(d =>
        d.id === debt.id ? { ...d, paid_amount: newPaidAmount, status: newStatus } : d
      ));
      toast.success('Cuota marcada como pagada');
    } catch (err) {
      console.error(err);
      toast.error('Error al registrar pago');
    } finally {
      setPayingInstallment(null);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stats = {
    totalPendiente: debts
      .filter(d => d.status !== 'paid')
      .reduce((s, d) => s + (Number(d.total_amount) - Number(d.paid_amount)), 0),
    vencidas: Object.values(installmentsMap).flat()
      .filter(i => i.status === 'pending' && i.fecha_vencimiento && new Date(i.fecha_vencimiento) < today).length,
    esteMes: Object.values(installmentsMap).flat().filter(i => {
      if (i.status !== 'pending' || !i.fecha_vencimiento) return false;
      const d = new Date(i.fecha_vencimiento);
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    }).length,
  };

  const filteredDebts = debts.filter(d => {
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchesSearch = !searchTerm || (d.providers?.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) || (d.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const STATUS_TABS = [
    { key: 'all', label: 'Todas' },
    { key: 'pending', label: 'Pendientes' },
    { key: 'partial', label: 'Parciales' },
    { key: 'paid', label: 'Pagadas' },
  ];

  return (
    <div className="flex flex-col p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-text">Deudas con Proveedores</h1>
        <p className="text-sm md:text-[15px] text-muted mt-1">Gestioná las compras a crédito y hacé seguimiento de tus cuotas pendientes.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface-2 border border-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <CreditCard size={15} className="text-amber-400" />
            </div>
            <span className="text-sm md:text-[15px] text-muted font-medium">Total pendiente</span>
          </div>
          <p className="text-2xl font-bold text-text">{formatCurrency(stats.totalPendiente)}</p>
        </div>
        <div className="bg-surface-2 border border-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertCircle size={15} className="text-red-400" />
            </div>
            <span className="text-sm md:text-[15px] text-muted font-medium">Cuotas vencidas</span>
          </div>
          <p className="text-2xl font-bold text-text">{stats.vencidas}</p>
        </div>
        <div className="bg-surface-2 border border-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <CalendarClock size={15} className="text-blue-400" />
            </div>
            <span className="text-sm md:text-[15px] text-muted font-medium">Cuotas este mes</span>
          </div>
          <p className="text-2xl font-bold text-text">{stats.esteMes}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-2 border border-border rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 bg-surface border border-border rounded-xl p-1">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-sm md:text-[15px] font-medium transition-colors ${statusFilter === tab.key ? 'bg-surface-2 text-text shadow-sm' : 'text-muted hover:text-text'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={15} />
            <input
              type="text"
              placeholder="Buscar proveedor..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-bg border border-border rounded-xl py-2 pl-9 pr-4 text-sm md:text-[15px] focus:outline-none focus:border-brand/50 transition-colors"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Debt list */}
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="animate-spin text-brand" size={32} />
          </div>
        ) : filteredDebts.length === 0 ? (
          <div className="p-12 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center border border-border">
              <TrendingDown size={20} className="text-muted" />
            </div>
            <p className="text-muted text-sm md:text-[15px]">
              {debts.length === 0 ? 'No hay deudas registradas. Las compras a crédito aparecerán aquí.' : 'No hay deudas que coincidan con el filtro.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredDebts.map(debt => {
              const isExpanded = expandedDebt === debt.id;
              const remaining = Number(debt.total_amount) - Number(debt.paid_amount);
              const progress = debt.total_amount > 0 ? (Number(debt.paid_amount) / Number(debt.total_amount)) * 100 : 0;
              const installments = installmentsMap[debt.id] || [];
              const loadingInst = loadingInstallments[debt.id];

              return (
                <div key={debt.id}>
                  <div className="p-4 md:p-5 hover:bg-surface/50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-text text-sm md:text-[15px]">
                            {debt.providers?.nombre || 'Sin proveedor'}
                          </span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[debt.status]}`}>
                            {STATUS_LABELS[debt.status]}
                          </span>
                        </div>
                        {debt.descripcion && (
                          <p className="text-sm md:text-[15px] text-muted mb-2">{debt.descripcion}</p>
                        )}
                        <p className="text-[11px] text-dim mb-3">
                          {debt.purchases?.fecha ? formatDate(new Date(debt.purchases.fecha)) : formatDate(new Date(debt.created_at))}
                        </p>

                        {/* Progress bar */}
                        <div className="mb-2">
                          <div className="flex justify-between text-[11px] text-muted mb-1">
                            <span>Pagado: {formatCurrency(debt.paid_amount)}</span>
                            <span>Restante: {formatCurrency(remaining)}</span>
                          </div>
                          <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${debt.status === 'paid' ? 'bg-green-500' : 'bg-brand'}`}
                              style={{ width: `${Math.min(100, progress)}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-sm md:text-[15px]">
                          <span className="text-muted">Total:</span>
                          <span className="font-bold text-text">{formatCurrency(debt.total_amount)}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleExpand(debt.id)}
                        className="p-2 rounded-lg hover:bg-surface-2 text-muted hover:text-text transition-colors shrink-0"
                      >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Installments */}
                  {isExpanded && (
                    <div className="bg-surface border-t border-border px-4 md:px-5 py-3 animate-in fade-in slide-in-from-top-1">
                      {loadingInst ? (
                        <div className="py-4 flex justify-center">
                          <Loader2 className="animate-spin text-brand" size={20} />
                        </div>
                      ) : installments.length === 0 ? (
                        <p className="text-sm md:text-[15px] text-muted text-center py-4">No hay cuotas registradas.</p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[11px] font-bold text-dim uppercase tracking-wider mb-3">Cuotas</p>
                          {installments.map(inst => {
                            const isOverdue = inst.status === 'pending' && inst.fecha_vencimiento && new Date(inst.fecha_vencimiento) < today;
                            return (
                              <div key={inst.id} className={`flex items-center gap-3 p-3 rounded-xl border ${inst.status === 'paid' ? 'border-green-500/20 bg-green-500/5' : isOverdue ? 'border-red-500/20 bg-red-500/5' : 'border-border bg-bg'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold ${inst.status === 'paid' ? 'bg-green-500/20 text-green-400' : isOverdue ? 'bg-red-500/20 text-red-400' : 'bg-surface-2 text-muted'}`}>
                                  {inst.status === 'paid' ? <Check size={11} /> : inst.numero}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="font-bold text-text text-sm md:text-[15px]">{formatCurrency(inst.monto)}</span>
                                  {inst.fecha_vencimiento && (
                                    <span className={`ml-2 text-[11px] ${isOverdue ? 'text-red-400 font-bold' : 'text-muted'}`}>
                                      {isOverdue ? 'Vencida · ' : ''}{formatDate(new Date(inst.fecha_vencimiento + 'T00:00:00'))}
                                    </span>
                                  )}
                                  {inst.notas && <p className="text-[11px] text-dim mt-0.5">{inst.notas}</p>}
                                </div>
                                {inst.status === 'pending' ? (
                                  <button
                                    onClick={() => handlePayInstallment(inst, debt)}
                                    disabled={payingInstallment === inst.id}
                                    className="shrink-0 bg-brand hover:bg-brand-hover text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                                  >
                                    {payingInstallment === inst.id ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                                    Pagar
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-green-400 font-bold shrink-0">Pagada</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
