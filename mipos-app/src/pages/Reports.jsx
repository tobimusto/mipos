import { useState, useEffect, useMemo, useCallback } from 'react';
import DatePicker from '../components/ui/DatePicker';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/Pagination';
import { useCountry } from '../context/CountryContext';
import {
  DollarSign, TrendingUp, BarChart as BarChartIcon, FileText,
  Loader2, Trash2, AlertTriangle, Package, Award, TrendingDown,
  AlertCircle, ShoppingCart, Clock, CalendarDays, Users, Wallet,
  ArrowUpRight, ArrowDownRight, Target, MoreHorizontal
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell
} from 'recharts';
import toast from 'react-hot-toast';

/* ── Helpers ──────────────────────────────────────────────────────── */
const toISO  = (d)  => d.toISOString().split('T')[0];
const deltaCalc = (c, p) => (p > 0 ? ((c - p) / p) * 100 : null);

const WEEKDAYS    = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const PAY_COLORS  = { Efectivo:'#22c55e', efectivo:'#22c55e', Transferencia:'#6366f1', transferencia:'#6366f1', Tarjeta:'#f59e0b', tarjeta:'#f59e0b' };
const getPC = (n) => PAY_COLORS[n] || '#5A7896';
const COUNT_OPTIONS = [5, 10, 15, 20];

/* ── Sub-components ───────────────────────────────────────────────── */
const Delta = ({ pct }) => {
  if (pct === null) return <span className="text-[15px] md:text-base font-medium" style={{ color:'var(--my-muted)' }}>sin comparativa</span>;
  const up = pct >= 0;
  return (
    <span className="inline-flex items-center gap-0.5 text-[15px] md:text-base font-bold"
      style={{ color: up ? 'var(--c-up)' : 'var(--c-down)' }}>
      {up ? <ArrowUpRight size={11}/> : <ArrowDownRight size={11}/>}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
};

const CountSelector = ({ value, onChange }) => (
  <div className="flex gap-px bg-border rounded-lg p-px">
    {COUNT_OPTIONS.map(n => (
      <button key={n} onClick={() => onChange(n)}
        className={`px-2.5 py-1 text-[15px] md:text-base font-bold rounded-md transition-colors ${value === n ? 'bg-surface-2 text-text shadow-sm' : 'text-muted hover:text-text'}`}>
        {n}
      </button>
    ))}
  </div>
);

/** Tabla de sección reutilizable */
const SectionHeader = ({ icon: Icon, title, subtitle, action }) => (
  <div className="flex items-start gap-3 mb-5">
    {Icon && (
      <div className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center shrink-0 mt-0.5 border border-border">
        <Icon size={13} className="text-muted" />
      </div>
    )}
    <div className="flex-1 min-w-0">
      <p className="text-[15px] md:text-base font-bold text-text">{title}</p>
      {subtitle && <p className="text-[15px] md:text-base text-muted mt-0.5">{subtitle}</p>}
    </div>
    {action}
  </div>
);

const EmptyState = ({ icon: Icon, message, success = false }) => (
  <div className="flex flex-col items-center justify-center py-8 gap-2">
    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
      style={{ background: success ? 'rgba(0,214,143,0.1)' : 'rgba(90,120,150,0.08)' }}>
      <Icon size={16} style={{ color: success ? 'var(--my-brand)' : 'var(--my-muted)' }} />
    </div>
    <p className="text-[15px] md:text-base text-muted text-center max-w-[160px]">{message}</p>
  </div>
);

/* Tooltip personalizado para recharts */
const ChartTooltip = ({ active, payload, label, fmt }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded-xl p-3 shadow-lg" style={{ fontSize: 12 }}>
      <p className="text-muted mb-1.5 font-medium">{label}</p>
      {payload.map(e => (
        <p key={e.name} className="font-bold" style={{ color: e.color }}>
          {e.name}: ${fmt(e.value)}
        </p>
      ))}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════ */
export default function Reports() {
  const { user, owner_id, profile } = useAuth();
  const { formatCurrency, formatDate, formatDateShort, formatDateTime, formatTime, countryConfig } = useCountry();
  const fmt = (n) => Number(n || 0).toLocaleString(countryConfig.locale, { maximumFractionDigits: 0 });

  const [loading, setLoading]           = useState(true);
  const [activeTab, setActiveTab]       = useState('Resumen');
  const [usersList, setUsersList]       = useState([]);
  const [selectedEmp, setSelectedEmp]   = useState(null);
  const [empSort, setEmpSort]           = useState('fecha_desc');

  // Tab Ventas: query separada con paginación server-side
  const salesPag   = usePagination(25);
  const [salesPage, setSalesPage]       = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [startDate, setStartDate]       = useState('');
  const [endDate, setEndDate]           = useState('');
  const [salesList, setSalesList]       = useState([]);
  const [cashMovements, setCash]        = useState([]);
  const [allProducts, setAllProducts]   = useState([]);
  const [pendientes, setPendientes]     = useState({ mipos: [], pagar: [], totalmipos: 0, totalPagar: 0 });
  const [prevMetrics, setPrev]          = useState(null);
  const [storeMargin, setMargin]        = useState(30);
  const [metrics, setMetrics]           = useState({ ingresos:0, ganancia:0, ventas:0, ticket:0, cajaActual:0 });
  const [chartData, setChartData]       = useState([]);
  const [deletingSale, setDeletingSale] = useState(null);
  const [deleting, setDeleting]         = useState(false);
  const [topCount, setTopCount]         = useState(10);
  const [bajaCount, setBajaCount]       = useState(10);
  const [activePreset, setActivePreset] = useState(null);
  const [isEditingMargin, setIsEditingMargin] = useState(false);
  const [tempMargin, setTempMargin]     = useState(30);
  const [expandedmipos, setExpandedmipos] = useState(false);
  const [expandedPagar, setExpandedPagar]   = useState(false);

  /* ── Computed ─────────────────────────────────────────────────── */
  const productInsights = useMemo(() => {
    const map = {};
    salesList.forEach(sale => {
      (sale.sale_items || []).forEach(item => {
        const id = item.product_id;
        const name = item.products?.name || 'Producto eliminado';
        if (!map[id]) map[id] = { id, name, qty: 0, revenue: 0 };
        map[id].qty += Number(item.qty);
        map[id].revenue += Number(item.qty) * Number(item.price);
      });
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty);
  }, [salesList]);

  const topSellers = useMemo(() => productInsights.slice(0, topCount), [productInsights, topCount]);

  const bajaRotacion = useMemo(() =>
    allProducts
      .filter(p => p.active !== false && (p.stock ?? 0) > 0)
      .map(p => { const ins = productInsights.find(i => i.id === p.id); return { ...p, qty: ins?.qty || 0 }; })
      .sort((a, b) => a.qty - b.qty)
      .slice(0, bajaCount),
  [allProducts, productInsights, bajaCount]);

  const LOW_STOCK_THRESHOLD = 5;
  const lowStock = useMemo(() =>
    allProducts
      .filter(p => p.active !== false && p.stock != null && p.stock <= LOW_STOCK_THRESHOLD)
      .sort((a, b) => a.stock - b.stock).slice(0, 12),
  [allProducts]);

  const paymentData = useMemo(() => {
    const map = {};
    salesList.forEach(s => {
      const m = s.payment_method || 'Sin especificar';
      if (!map[m]) map[m] = { name: m, count: 0, total: 0 };
      map[m].count++; map[m].total += Number(s.total);
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [salesList]);

  const hourlyData = useMemo(() => {
    const h = Array.from({ length: 24 }, (_, i) => ({ hour: i, label: `${i}h`, total: 0 }));
    salesList.forEach(s => { h[new Date(s.created_at).getHours()].total += Number(s.total); });
    return h;
  }, [salesList]);

  const weekdayData = useMemo(() => {
    const d = WEEKDAYS.map((label, i) => ({ label, total: 0, day: i }));
    salesList.forEach(s => { d[new Date(s.created_at).getDay()].total += Number(s.total); });
    return [...d.slice(1), d[0]];
  }, [salesList]);

  const monthProjection = useMemo(() => {
    if (!salesList.length || startDate || endDate) return null;
    const today = new Date();
    const dom = today.getDate();
    const dim = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const ms = salesList.filter(s => {
      const d = new Date(s.created_at);
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    });
    if (!ms.length) return null;
    const total = ms.reduce((s, x) => s + Number(x.total), 0);
    const projected = Math.round(total + (total / dom) * (dim - dom));
    const marginRatio = storeMargin / 100;
    return { 
      current: total, 
      projected, 
      daysLeft: dim - dom, 
      progress: (dom / dim) * 100,
      currentProfit: total * marginRatio,
      projectedProfit: projected * marginRatio
    };
  }, [salesList, startDate, endDate, storeMargin]);

  const capitalInmovilizado = useMemo(() =>
    bajaRotacion.filter(p => p.qty === 0).reduce((s, p) => s + ((p.stock ?? 0) * (p.price ?? 0)), 0),
  [bajaRotacion]);

  const maxHour = useMemo(() => Math.max(...hourlyData.map(h => h.total), 1), [hourlyData]);
  const maxDay  = useMemo(() => Math.max(...weekdayData.map(d => d.total), 1), [weekdayData]);

  /** Días del período — para calcular tasa diaria de ventas */
  const periodDays = useMemo(() => {
    if (startDate && endDate) {
      const diff = Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000) + 1;
      return Math.max(1, diff);
    }
    if (salesList.length < 2) return 30;
    const ts = salesList.map(s => new Date(s.created_at).getTime());
    return Math.max(7, Math.ceil((Math.max(...ts) - Math.min(...ts)) / 86400000) + 1);
  }, [startDate, endDate, salesList]);

  /** Top sellers enriquecidos con stock actual y días de cobertura */
  const topSellersWithCoverage = useMemo(() => {
    return topSellers.map(p => {
      const product = allProducts.find(ap => ap.id === p.id);
      const stock = product?.stock ?? 0;
      const dailyRate = periodDays > 0 ? p.qty / periodDays : 0;
      const days = dailyRate > 0 ? Math.round(stock / dailyRate) : null;
      return { ...p, stock, days };
    });
  }, [topSellers, allProducts, periodDays]);

  /** Resumen del catálogo */
  const catalogStats = useMemo(() => {
    const active = allProducts.filter(p => p.active !== false);
    return {
      total:          active.length,
      inventoryValue: active.reduce((s, p) => s + ((p.stock ?? 0) * (p.price ?? 0)), 0),
      criticalStock:  active.filter(p => (p.stock ?? 0) <= LOW_STOCK_THRESHOLD).length,
      noMovement:     bajaRotacion.length,
    };
  }, [allProducts, bajaRotacion]);

  /* ── Fetchers ─────────────────────────────────────────────────── */
  /** Días hasta una fecha (negativo = vencida) */
  const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const due   = new Date(dateStr); due.setHours(0,0,0,0);
    return Math.ceil((due - today) / 86400000);
  };

  /**
   * fetchSalesPage — paginación server-side para el tab Ventas.
   * Independiente de fetchMetrics: no toca los datos de KPIs/gráficos.
   */
  const fetchSalesPage = async (page = 1, oStart = null, oEnd = null) => {
    const sd = oStart ?? startDate;
    const ed = oEnd   ?? endDate;
    const { from, to } = salesPag.getRange(page);

    setSalesLoading(true);
    try {
      let query = supabase
        .from('sales')
        .select('*, sale_items(qty, price, products(name))', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (sd) query = query.gte('created_at', `${sd}T00:00:00`);
      if (ed) query = query.lte('created_at', `${ed}T23:59:59`);

      const { data, error, count } = await query;
      if (error) throw error;

      setSalesPage(data || []);
      salesPag.setTotalCount(count ?? 0);
      salesPag.setCurrentPage(page);
    } catch (e) {
      console.error('Error fetching sales page:', e);
    } finally {
      setSalesLoading(false);
    }
  };

  const fetchPendientes = async () => {
    try {
      const uid = owner_id || user?.id;
      const { data: clients } = await supabase
        .from('clients').select('id, nombre, deuda')
        .eq('user_id', uid).gt('deuda', 0).order('deuda', { ascending: false });

      const { data: debts } = await supabase
        .from('supplier_debts')
        .select('id, total_amount, paid_amount, descripcion, provider_id, providers(nombre)')
        .eq('user_id', uid)
        .neq('status', 'paid')
        .order('created_at', { ascending: false });

      const mipos = clients || [];
      const pagar = (debts || []).map(d => ({
        id: d.id,
        nombre: d.providers?.nombre || 'Sin proveedor',
        subtotal: Number(d.total_amount) - Number(d.paid_amount),
      })).filter(d => d.subtotal > 0);

      setPendientes({
        mipos,
        pagar,
        totalmipos: mipos.reduce((s, c) => s + Number(c.deuda), 0),
        totalPagar:  pagar.reduce((s, p) => s + Number(p.subtotal), 0),
      });
    } catch(e) { console.error(e); }
  };

  const fetchProducts = async () => {
    try {
      const uid = owner_id || user?.id;
      if (!uid) return;
      const { data, error } = await supabase
        .from('products')
        .select('id,name,stock,price,category,active')
        .eq('user_id', uid);
      if (error) { console.error('[fetchProducts] error:', error); return; }
      console.log(`[fetchProducts] uid=${uid} → ${data?.length ?? 0} productos`);
      if (data) setAllProducts(data);
    } catch(e) { console.error('[fetchProducts] exception:', e); }
  };

  const fetchPrevPeriod = async (sd, ed) => {
    try {
      const uid = owner_id || user?.id;
      const s = new Date(sd), e = new Date(ed);
      const dur = e - s;
      const ps = toISO(new Date(s - dur - 86400000));
      const pe = toISO(new Date(s.getTime() - 86400000));
      const { data } = await supabase.from('sales').select('total').eq('user_id', uid)
        .gte('created_at', `${ps}T00:00:00`).lte('created_at', `${pe}T23:59:59`);
      if (data) {
        const ing = data.reduce((s, x) => s + Number(x.total), 0);
        const cnt = data.length;
        setPrev({ ingresos: ing, ventas: cnt, ticket: cnt > 0 ? ing / cnt : 0 });
      }
    } catch(e) { console.error(e); }
  };

  const fetchMetrics = async (oStart = null, oEnd = null) => {
    const sd = oStart ?? startDate, ed = oEnd ?? endDate;
    try {
      const uid = owner_id || user?.id;
      setLoading(true); setPrev(null);
      // Techo de seguridad para la agregación en memoria.
      // TODO (issue #6): mover totales, gráfico y product insights a vistas
      // de BD para eliminar este límite y mejorar performance a escala.
      let sq = supabase.from('sales').select('*, sale_items(qty,price,product_id,products(name))')
        .eq('user_id', uid).order('created_at', { ascending: false }).limit(10000);
      if (sd) sq = sq.gte('created_at', `${sd}T00:00:00`);
      if (ed) sq = sq.lte('created_at', `${ed}T23:59:59`);
      const { data: sales, error: se } = await sq;
      if (se) throw se;
      setSalesList(sales || []);

      let cq = supabase.from('cash_movements').select('*')
        .eq('user_id', uid).order('fecha', { ascending: false }).limit(2000);
      if (sd) cq = cq.gte('fecha', `${sd}T00:00:00`);
      if (ed) cq = cq.lte('fecha', `${ed}T23:59:59`);
      const { data: cash } = await cq;
      setCash(cash || []);

      const { data: stgData } = await supabase.from('store_settings').select('estimated_margin').eq('user_id', uid).order('created_at', { ascending: false }).limit(1);
      const stg = stgData?.[0];
      const mp = stg?.estimated_margin || 30; setMargin(mp); const md = mp / 100;

      const ing = (sales || []).reduce((s, x) => s + Number(x.total), 0);
      const cnt = (sales || []).length;
      setMetrics({ ingresos: ing, ganancia: ing * md, ventas: cnt, ticket: cnt > 0 ? ing / cnt : 0, cajaActual: cash?.length ? Number(cash[0].saldo_nuevo) : 0 });

      const dd = {};
      let minDateStr = sd;
      let maxDateStr = ed;
      
      if (!minDateStr || !maxDateStr) {
        if (sales && sales.length > 0) {
          const ts = sales.map(s => new Date(s.created_at).getTime());
          const minD = new Date(Math.min(...ts));
          const maxD = new Date(Math.max(...ts));
          const today = new Date();
          const effectiveMax = maxD > today ? maxD : today;
          const requiredMin = new Date(effectiveMax);
          requiredMin.setDate(effectiveMax.getDate() - 13);
          const effectiveMin = minD < requiredMin ? minD : requiredMin;
          minDateStr = minDateStr || toISO(effectiveMin);
          maxDateStr = maxDateStr || toISO(effectiveMax);
        } else {
          const today = new Date();
          maxDateStr = toISO(today);
          const past = new Date(today);
          past.setDate(today.getDate() - 13);
          minDateStr = toISO(past);
        }
      }

      const chartStart = new Date(minDateStr + 'T00:00:00');
      const chartEnd = new Date(maxDateStr + 'T23:59:59');

      for (let d = new Date(chartStart); d <= chartEnd; d.setDate(d.getDate() + 1)) {
        const k = toISO(new Date(d.getTime() - d.getTimezoneOffset() * 60000));
        dd[k] = { fecha: k, ingresos: 0, ganancia: 0 };
      }

      (sales || []).forEach(s => {
        const d = new Date(s.created_at);
        const k = toISO(new Date(d.getTime() - d.getTimezoneOffset() * 60000));
        if (!dd[k]) dd[k] = { fecha: k, ingresos: 0, ganancia: 0 };
        dd[k].ingresos += Number(s.total); dd[k].ganancia += Number(s.total) * md;
      });

      setChartData(Object.values(dd).sort((a, b) => a.fecha.localeCompare(b.fecha)).map(x => ({
        ...x, fecha: formatDateShort(new Date(x.fecha + 'T12:00:00'))
      })));

      if (sd && ed) fetchPrevPeriod(sd, ed);
    } catch(e) { console.error(e); } finally { setLoading(false); }
  };

  const applyPreset = (days) => {
    salesPag.reset();
    if (activePreset === days) {
      setActivePreset(null); setStartDate(''); setEndDate('');
      fetchMetrics('', '');
      if (activeTab === 'Ventas') fetchSalesPage(1, '', '');
    } else {
      const end = new Date(), start = new Date();
      start.setDate(start.getDate() - days);
      const s = toISO(start), e = toISO(end);
      setActivePreset(days); setStartDate(s); setEndDate(e);
      fetchMetrics(s, e);
      if (activeTab === 'Ventas') fetchSalesPage(1, s, e);
    }
  };

  const clearFilters = () => {
    salesPag.reset();
    setActivePreset(null); setStartDate(''); setEndDate('');
    fetchMetrics('', '');
    if (activeTab === 'Ventas') fetchSalesPage(1, '', '');
  };

  const handleDeleteSale = async (sale) => {
    setDeleting(true);
    try {
      const { error } = await supabase.rpc('cancel_sale', { p_sale_id: sale.id, p_user_id: user.id, p_employee_id: user.id });
      if (error) throw error;
      fetchMetrics();
      // Refrescar la página actual de ventas si el tab está activo
      fetchSalesPage(salesPag.currentPage);
      toast.success('Venta anulada y stock restaurado.');
    } catch(e) { console.error(e); toast.error('Error al anular.'); }
    finally { setDeleting(false); setDeletingSale(null); }
  };

  const handleUpdateMargin = async () => {
    const m = Number(tempMargin);
    if (isNaN(m) || m < 0 || m > 100) return;
    setMargin(m);
    setIsEditingMargin(false);
    const md = m / 100;
    setMetrics(prev => ({ ...prev, ganancia: prev.ingresos * md }));
    try {
      const uid = owner_id || user?.id;
      setChartData(prev => prev.map(x => ({ ...x, ganancia: x.ingresos * md })));
      const { data: stgData } = await supabase.from('store_settings').select('id').eq('user_id', uid).order('created_at', { ascending: false }).limit(1);
      if (stgData && stgData.length > 0) {
        await supabase.from('store_settings').update({ estimated_margin: m }).eq('id', stgData[0].id);
      } else {
        await supabase.from('store_settings').insert({ user_id: uid, estimated_margin: m });
      }
      toast.success('Margen actualizado');
    } catch(e) { console.error(e); toast.error('Error al guardar el margen'); }
  };

  const fetchUsers = async () => {
    try {
      const uid = owner_id || user?.id;
      const { data } = await supabase.from('profiles').select('*').or(`owner_id.eq.${uid},id.eq.${uid}`);
      setUsersList(data || []);
      if (data && data.length > 0) setSelectedEmp(data[0].id);
    } catch(e) { console.error(e); }
  };

  useEffect(() => { if (user) { fetchMetrics(); fetchPendientes(); fetchUsers(); } }, [user]);
  useEffect(() => { if (owner_id || user?.id) fetchProducts(); }, [owner_id, user?.id]);

  // Cargar página 1 de ventas al activar el tab Ventas
  useEffect(() => {
    if (activeTab === 'Ventas' && user) {
      salesPag.reset();
      fetchSalesPage(1);
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const employeeStats = useMemo(() => {
    const map = {};
    usersList.forEach(u => map[u.id] = { 
      ...u, 
      salesTotal: 0, 
      salesCount: 0, 
      anuladasCount: 0, 
      anuladasTotal: 0,
      paymentMethods: {}
    });
    
    salesList.forEach(s => {
      const eid = s.employee_id || s.user_id;
      if (map[eid]) {
        map[eid].salesTotal += Number(s.total);
        map[eid].salesCount += 1;
        const pm = s.payment_method || 'varios';
        map[eid].paymentMethods[pm] = (map[eid].paymentMethods[pm] || 0) + 1;
      }
    });

    cashMovements.forEach(c => {
      const eid = c.employee_id || c.user_id;
      if (map[eid] && c.motivo?.startsWith('Anulaci')) {
        map[eid].anuladasCount += 1;
        map[eid].anuladasTotal += Number(c.monto);
      }
    });

    return Object.values(map).map(emp => {
      emp.ticketPromedio = emp.salesCount > 0 ? emp.salesTotal / emp.salesCount : 0;
      const topMethod = Object.entries(emp.paymentMethods).sort((a,b) => b[1] - a[1])[0];
      emp.favoriteMethod = topMethod ? topMethod[0] : 'ninguno';
      return emp;
    }).sort((a, b) => b.salesTotal - a.salesTotal);
  }, [usersList, salesList, cashMovements]);

  const getEmployeeSales = useCallback((empId) => {
    return salesList.filter(s => (s.employee_id || s.user_id) === empId).map(s => ({
      ...s, _type: 'Venta', _date: new Date(s.created_at)
    }));
  }, [salesList]);

  const sortedEmpSales = useMemo(() => {
    if (!selectedEmp) return [];
    let list = getEmployeeSales(selectedEmp);
    if (empSort === 'monto_desc') return list.sort((a,b) => b.total - a.total);
    if (empSort === 'monto_asc') return list.sort((a,b) => a.total - b.total);
    return list.sort((a,b) => b._date - a._date);
  }, [getEmployeeSales, selectedEmp, empSort]);

  /* ── KPI config ───────────────────────────────────────────────── */
  const kpis = [
    { label: 'Ingresos del período', value: formatCurrency(metrics.ingresos), pct: deltaCalc(metrics.ingresos, prevMetrics?.ingresos), accent: 'var(--my-brand)' },
    { label: `Ganancia estimada (${storeMargin}%)`, value: formatCurrency(metrics.ganancia), pct: deltaCalc(metrics.ganancia, prevMetrics?.ingresos ? prevMetrics.ingresos * storeMargin / 100 : null), accent: '#22c55e' },
    { label: 'Total de ventas', value: fmt(metrics.ventas), pct: deltaCalc(metrics.ventas, prevMetrics?.ventas), accent: '#6366f1' },
    { label: 'Ticket promedio', value: formatCurrency(metrics.ticket), pct: deltaCalc(metrics.ticket, prevMetrics?.ticket), accent: '#f59e0b' },
  ];

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col p-4 md:p-8">

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 bg-bg border-b border-border px-4 md:px-6 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="shrink-0">
            <h1 className="text-[17px] font-display font-bold text-text leading-tight">Reportes</h1>
            <p className="text-[15px] md:text-base text-muted">Rendimiento del negocio</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center sm:ml-auto">
            {[{ l:'1 sem', d:7 },{ l:'2 sem', d:14 },{ l:'1 mes', d:30 }].map(({ l, d }) => (
              <button key={d} onClick={() => applyPreset(d)}
                className={`h-7 px-3 text-[15px] md:text-base font-semibold rounded-lg border transition-colors ${activePreset === d ? 'bg-brand border-brand text-text' : 'bg-surface border-border text-muted hover:text-text hover:border-brand/60'}`}>
                {l}
              </button>
            ))}
            <div className="w-px h-4 bg-border" />
            {[['Desde', startDate, setStartDate],['Hasta', endDate, setEndDate]].map(([lbl, val, setter]) => (
              <div key={lbl} className="h-7 bg-surface border border-border rounded-lg px-2.5 flex items-center gap-1.5 text-[15px] md:text-base text-text">
                <span className="text-muted">{lbl}</span>
                <DatePicker
                  value={val}
                  onChange={(v) => { setter(v); setActivePreset(null); }}
                  variant="ghost"
                  placeholder="--/--/--"
                />
              </div>
            ))}
            <button onClick={() => { fetchMetrics(); if (activeTab === 'Ventas') { salesPag.reset(); fetchSalesPage(1); } }} className="h-7 px-3 bg-brand hover:bg-brand-hover text-text text-[15px] md:text-base font-bold rounded-lg transition-colors">
              Aplicar
            </button>
            <button onClick={clearFilters} className="h-7 px-3 border border-border text-muted hover:text-text text-[15px] md:text-base font-semibold rounded-lg transition-colors">
              Limpiar
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 flex flex-col gap-5">

        {/* ── KPI row ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {kpis.map(({ label, value, pct, accent }) => (
            <div key={label} className="bg-surface-2 border border-border rounded-2xl p-4 flex flex-col gap-1 relative overflow-hidden">
              {/* Thin colored bottom accent */}
              <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: accent, opacity: 0.5 }} />
              <div className="flex items-center justify-between">
                {label.includes('Ganancia estimada') ? (
                  isEditingMargin ? (
                    <div className="flex items-center gap-1 z-10 relative">
                      <input 
                        type="number" min="0" max="100" 
                        value={tempMargin} onChange={e => setTempMargin(e.target.value)}
                        className="w-12 bg-bg border border-border rounded text-[15px] md:text-base px-1 py-0.5 text-text" 
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') handleUpdateMargin(); else if (e.key === 'Escape') setIsEditingMargin(false); }}
                      />
                      <span className="text-[15px] md:text-base text-muted">%</span>
                      <button onClick={handleUpdateMargin} className="ml-1 text-brand text-[15px] md:text-base hover:underline font-bold">OK</button>
                    </div>
                  ) : (
                    <p 
                      className="text-[15px] md:text-base font-bold text-muted uppercase tracking-wider leading-none cursor-pointer hover:text-text flex items-center gap-1 relative z-10"
                      onClick={() => { setTempMargin(storeMargin); setIsEditingMargin(true); }}
                      title="Haz clic para editar el margen estimado"
                    >
                      {label} <span className="opacity-50 text-[15px] md:text-base underline">Editar</span>
                    </p>
                  )
                ) : (
                  <p className="text-[15px] md:text-base font-bold text-muted uppercase tracking-wider leading-none">{label}</p>
                )}
                {prevMetrics && <Delta pct={pct} />}
              </div>
              <p className="font-display font-bold text-text leading-none mt-1 text-2xl sm:text-[28px] truncate" title={value}>
                {loading ? <Loader2 className="animate-spin text-muted" size={20} /> : value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-border -mb-1 w-full overflow-x-auto hide-scrollbar">
          {['Resumen','Productos','Ventas','Caja', ...(profile && ['Propietario', 'Superadmin', 'Gerente'].includes(profile.role) ? ['Usuarios'] : [])].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 justify-center px-4 py-2.5 text-[15px] md:text-base font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === tab ? 'border-brand text-text' : 'border-transparent text-muted hover:text-text'}`}>
              {tab}
              {tab === 'Productos' && lowStock.length > 0 &&
                <span className="text-[15px] md:text-base font-bold px-1.5 py-px rounded-full bg-surface border border-border"
                  style={{ color:'var(--c-crit)' }}>{lowStock.length}</span>}
            </button>
          ))}
        </div>

        {/* ══════════════ RESUMEN ═══════════════════════════════ */}
        {activeTab === 'Resumen' && (
          <div className="flex flex-col gap-4">

            {/* Grid principal */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* ── Columna izquierda: gráfico + pendientes (flex-1 rellena el alto) ── */}
              <div className="flex flex-col gap-4 min-w-0 h-full">

                {/* Gráfico */}
                <div className="bg-surface-2 border border-border rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[15px] md:text-base font-bold text-text">Ingresos por día</p>
                    <div className="flex items-center gap-3 text-[15px] md:text-base text-muted">
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm inline-block bg-indigo-500"/>Ingresos</span>
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm inline-block bg-emerald-500"/>Ganancia</span>
                    </div>
                  </div>
                  <div style={{ height: 160 }}>
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} barGap={2} barCategoryGap="15%" maxBarSize={45}>
                          <defs>
                            <linearGradient id="gIng" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9}/>
                              <stop offset="100%" stopColor="#6366f1" stopOpacity={0.2}/>
                            </linearGradient>
                            <linearGradient id="gGan" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.9}/>
                              <stop offset="100%" stopColor="#22c55e" stopOpacity={0.2}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="2 4" stroke="var(--my-border)" vertical={false}/>
                          <XAxis dataKey="fecha" stroke="var(--my-muted)" fontSize={10} tickLine={false} axisLine={false}/>
                          <YAxis stroke="var(--my-muted)" fontSize={10} tickLine={false} axisLine={false}
                            tickFormatter={v => `$${(v/1000).toFixed(0)}k`} width={38}/>
                          <Tooltip content={(props) => <ChartTooltip {...props} fmt={fmt} />} cursor={{ fill:'#C8DCF0', fillOpacity:0.05 }}/>
                          <Bar dataKey="ingresos" name="Ingresos" fill="url(#gIng)" radius={[3,3,0,0]}/>
                          <Bar dataKey="ganancia" name="Ganancia" fill="url(#gGan)" radius={[3,3,0,0]}/>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-[15px] md:text-base text-muted">Sin datos en el período</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pendientes — flex-1 para rellenar el espacio restante de la columna */}
                <div className="bg-surface-2 border border-border rounded-2xl overflow-hidden flex-1">
                  <div className="px-5 py-3.5 border-b border-border">
                    <p className="text-[15px] md:text-base font-bold text-text">Pendientes</p>
                  </div>
                  {/* A cobrar */}
                  <div className="px-5 py-3 border-b border-border/60 flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-brand shrink-0"/>
                    <p className="text-[15px] md:text-base font-semibold text-text flex-1 min-w-0 truncate">
                      A cobrar
                    </p>
                    <span className="text-[15px] md:text-base text-muted shrink-0">
                      {pendientes.mipos.length} {pendientes.mipos.length === 1 ? 'cliente' : 'clientes'}
                    </span>
                    <p className="text-[15px] md:text-base font-bold font-mono shrink-0" style={{ color:'var(--c-up)' }}>
                      +{formatCurrency(pendientes.totalmipos)}
                    </p>
                  </div>
                  {pendientes.mipos.slice(0,3).map(c => (
                    <div key={c.id} className="flex items-center gap-3 px-5 py-2 border-b border-border/30 bg-surface/30">
                      <span className="w-1 h-1 rounded-full bg-brand/40 shrink-0 ml-2"/>
                      <p className="text-[15px] md:text-base text-muted flex-1 min-w-0 truncate">{c.nombre}</p>
                      <p className="text-[15px] md:text-base font-bold font-mono shrink-0" style={{ color:'var(--c-up)' }}>{formatCurrency(c.deuda)}</p>
                    </div>
                  ))}
                  {expandedmipos && (
                    <div className="overflow-y-auto custom-scrollbar max-h-[160px]">
                      {pendientes.mipos.slice(3).map(c => (
                        <div key={c.id} className="flex items-center gap-3 px-5 py-2 border-b border-border/30 last:border-0 bg-surface/30">
                          <span className="w-1 h-1 rounded-full bg-brand/40 shrink-0 ml-2"/>
                          <p className="text-[15px] md:text-base text-muted flex-1 min-w-0 truncate">{c.nombre}</p>
                          <p className="text-[15px] md:text-base font-bold font-mono shrink-0" style={{ color:'var(--c-up)' }}>{formatCurrency(c.deuda)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {pendientes.mipos.length > 3 && (
                    <button onClick={() => setExpandedmipos(v => !v)}
                      className="flex items-center gap-1.5 px-5 py-2 w-full text-left text-[15px] md:text-base text-muted hover:text-text font-semibold transition-colors border-b border-border/30">
                      <MoreHorizontal size={12} className="shrink-0"/>
                      {expandedmipos ? 'Ver menos' : `+${pendientes.mipos.length - 3} clientes más`}
                    </button>
                  )}
                  {/* A pagar */}
                  <div className="px-5 py-3 border-b border-border/60 flex items-center gap-3 mt-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background:'var(--c-crit)' }}/>
                    <p className="text-[15px] md:text-base font-semibold text-text flex-1 min-w-0 truncate">A pagar</p>
                    <span className="text-[15px] md:text-base text-muted shrink-0">
                      {pendientes.pagar.length} {pendientes.pagar.length === 1 ? 'pago' : 'pagos'}
                    </span>
                    <p className="text-[15px] md:text-base font-bold font-mono shrink-0" style={{ color:'var(--c-down)' }}>
                      -{formatCurrency(pendientes.totalPagar)}
                    </p>
                  </div>
                  {pendientes.pagar.slice(0,3).map(p => (
                    <div key={p.id} className="flex items-center gap-3 px-5 py-2 border-b border-border/30 bg-surface/30">
                      <span className="w-1 h-1 rounded-full shrink-0 ml-2" style={{ background:'var(--c-crit)', opacity:0.4 }}/>
                      <p className="text-[15px] md:text-base text-muted flex-1 min-w-0 truncate">{p.nombre}</p>
                      <p className="text-[15px] md:text-base font-bold font-mono shrink-0" style={{ color:'var(--c-down)' }}>{formatCurrency(p.subtotal)}</p>
                    </div>
                  ))}
                  {expandedPagar && (
                    <div className="overflow-y-auto custom-scrollbar max-h-[160px]">
                      {pendientes.pagar.slice(3).map(p => (
                        <div key={p.id} className="flex items-center gap-3 px-5 py-2 border-b border-border/30 last:border-0 bg-surface/30">
                          <span className="w-1 h-1 rounded-full shrink-0 ml-2" style={{ background:'var(--c-crit)', opacity:0.4 }}/>
                          <p className="text-[15px] md:text-base text-muted flex-1 min-w-0 truncate">{p.nombre}</p>
                          <p className="text-[15px] md:text-base font-bold font-mono shrink-0" style={{ color:'var(--c-down)' }}>{formatCurrency(p.subtotal)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {pendientes.pagar.length > 3 && (
                    <button onClick={() => setExpandedPagar(v => !v)}
                      className="flex items-center gap-1.5 px-5 py-2 w-full text-left text-[15px] md:text-base text-muted hover:text-text font-semibold transition-colors border-b border-border/30">
                      <MoreHorizontal size={12} className="shrink-0"/>
                      {expandedPagar ? 'Ver menos' : `+${pendientes.pagar.length - 3} proveedores más`}
                    </button>
                  )}
                  {!pendientes.mipos.length && !pendientes.pagar.length && (
                    <div className="px-5 py-4 text-center text-[15px] md:text-base text-muted">Sin pendientes registrados</div>
                  )}
                </div>
              </div>

              {/* ── Columna derecha: proyección + medios + caja ── */}
              <div className="flex flex-col gap-4 min-w-0">

                {/* Proyección — solo si hay datos sin filtro */}
                <div className="bg-surface-2 border border-border rounded-2xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Target size={13} className="text-brand mt-0.5"/>
                      <p className="text-[15px] md:text-base font-bold text-text">Proyección del mes</p>
                    </div>
                    {monthProjection && (
                      <div className="text-right">
                        <p className="font-bold text-emerald-500 font-mono text-lg leading-none">{formatCurrency(monthProjection.projectedProfit)}</p>
                        <p className="text-[15px] md:text-base text-muted font-bold mt-1">Ingresos est.: {formatCurrency(monthProjection.projected)}</p>
                      </div>
                    )}
                  </div>
                  {monthProjection ? (
                    <>
                      <div className="h-1.5 bg-border rounded-full overflow-hidden mb-2">
                        <div className="h-full bg-brand rounded-full transition-all" style={{ width:`${monthProjection.progress}%` }}/>
                      </div>
                      <div className="flex items-center justify-between text-[15px] md:text-base text-muted">
                        <span>Ganancia acum.: <span className="text-text font-semibold">{formatCurrency(monthProjection.currentProfit)}</span></span>
                        <span>Mes en curso: {monthProjection.progress.toFixed(0)}% transcurrido</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-[15px] md:text-base text-muted">{startDate||endDate ? 'Sin filtro de fechas para proyectar' : 'Sin ventas este mes'}</p>
                  )}
                </div>

                {/* Medios de pago */}
                <div className="bg-surface-2 border border-border rounded-2xl overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-border">
                    <p className="text-[15px] md:text-base font-bold text-text">Medios de pago</p>
                  </div>
                  {paymentData.length > 0 ? paymentData.slice(0, 4).map((pm, i, arr) => {
                    const pct = metrics.ingresos > 0 ? (pm.total / metrics.ingresos) * 100 : 0;
                    const color = getPC(pm.name);
                    return (
                      <div key={pm.name}
                        className={`flex items-center gap-3 px-5 py-3 ${i < arr.length-1 ? 'border-b border-border/50' : ''}`}>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }}/>
                        <p className="text-[15px] md:text-base font-medium text-text capitalize flex-1 min-w-0 truncate">{pm.name}</p>
                        <div className="h-1 rounded-full overflow-hidden shrink-0" style={{ width: 72, background:'var(--my-border)' }}>
                          <div className="h-full rounded-full" style={{ width:`${pct}%`, background: color }}/>
                        </div>
                        <p className="text-[15px] md:text-base font-bold text-text font-mono shrink-0 w-24 text-right">{formatCurrency(pm.total)}</p>
                      </div>
                    );
                  }) : (
                    <div className="px-5 py-4 text-center text-[15px] md:text-base text-muted">Sin ventas en el período</div>
                  )}
                </div>

                {/* Estado de caja */}
                <div className="bg-surface-2 border border-border rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                    <p className="text-[15px] md:text-base font-bold text-text">Estado de Caja</p>
                    <p className="font-bold text-brand font-mono text-lg">{formatCurrency(metrics.cajaActual)}</p>
                  </div>
                  {cashMovements.length > 0 ? cashMovements.slice(0,5).map((m,i) => (
                    <div key={m.id}
                      className={`flex items-center gap-3 px-5 py-2.5 ${i < Math.min(4, cashMovements.length-1) ? 'border-b border-border/40' : ''}`}>
                      <span className="text-[15px] md:text-base text-muted w-12 shrink-0 tabular-nums font-mono">
                        {formatTime(new Date(m.fecha))}
                      </span>
                      <p className="text-[15px] md:text-base text-text capitalize flex-1">{m.tipo}</p>
                      <p className="text-[15px] md:text-base font-bold font-mono shrink-0 max-w-[140px] truncate text-right"
                        style={{ color: m.tipo==='ingreso' ? 'var(--my-brand)' : m.tipo==='retiro' ? 'var(--c-crit)' : 'var(--my-muted)' }}>
                        {m.tipo==='ingreso' ? '+' : m.tipo==='retiro' ? '-' : ''}{formatCurrency(Number(m.monto))}
                      </p>
                    </div>
                  )) : (
                    <div className="px-5 py-4 text-center text-[15px] md:text-base text-muted">Sin movimientos</div>
                  )}
                </div>
              </div>
            </div>

            {/* Fila inferior: ventas por hora + por día */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-surface-2 border border-border rounded-2xl p-5 min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={13} className="text-muted shrink-0"/>
                  <p className="text-[15px] md:text-base font-bold text-text">Ventas por hora</p>
                </div>
                <div style={{ height: 110 }}>
                  {salesList.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourlyData} barSize={7}>
                        <XAxis dataKey="label" stroke="var(--my-muted)" fontSize={9} tickLine={false} axisLine={false} interval={3}/>
                        <Tooltip cursor={{ fill:'#C8DCF0', fillOpacity:0.05 }}
                          content={({ active, payload, label }) => active && payload?.length ? (
                            <div className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-[15px] md:text-base">
                              <p className="text-muted">{label}</p>
                              <p className="font-bold text-text">${fmt(payload[0]?.value)}</p>
                            </div>
                          ) : null}/>
                        <Bar dataKey="total" radius={[2,2,0,0]}>
                          {hourlyData.map((e,i) => (
                            <Cell key={i} fill={e.total===maxHour ? 'var(--my-brand)' : e.total > maxHour*0.55 ? '#6366f1' : 'var(--my-border)'}/>
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="h-full flex items-center justify-center"><p className="text-[15px] md:text-base text-muted">Sin datos</p></div>}
                </div>
              </div>

              <div className="bg-surface-2 border border-border rounded-2xl p-5 min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays size={13} className="text-muted shrink-0"/>
                  <p className="text-[15px] md:text-base font-bold text-text">Ventas por día de semana</p>
                </div>
                <div style={{ height: 110 }}>
                  {salesList.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weekdayData} barSize={28}>
                        <XAxis dataKey="label" stroke="var(--my-muted)" fontSize={11} tickLine={false} axisLine={false}/>
                        <Tooltip cursor={{ fill:'#C8DCF0', fillOpacity:0.05 }}
                          content={({ active, payload, label }) => active && payload?.length ? (
                            <div className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-[15px] md:text-base">
                              <p className="text-muted">{label}</p>
                              <p className="font-bold text-text">${fmt(payload[0]?.value)}</p>
                            </div>
                          ) : null}/>
                        <Bar dataKey="total" radius={[4,4,0,0]}>
                          {weekdayData.map((e,i) => (
                            <Cell key={i} fill={e.total===maxDay ? 'var(--my-brand)' : e.total > maxDay*0.65 ? '#6366f1' : 'var(--my-border)'}/>
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="h-full flex items-center justify-center"><p className="text-[15px] md:text-base text-muted">Sin datos</p></div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ PRODUCTOS ═════════════════════════════ */}
        {activeTab === 'Productos' && (
          <div className="flex flex-col gap-4">

            {/* Resumen del catálogo */}
            {allProducts.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: 'Productos activos',
                    value: catalogStats.total,
                    sub: `${allProducts.filter(p => p.active === false).length} desactivados`,
                    color: null,
                  },
                  {
                    label: 'Valor en stock',
                    value: `$${fmt(catalogStats.inventoryValue)}`,
                    sub: 'a precio de venta',
                    color: null,
                  },
                  {
                    label: 'Stock crítico',
                    value: catalogStats.criticalStock,
                    sub: `≤ ${LOW_STOCK_THRESHOLD} unidades`,
                    color: catalogStats.criticalStock > 0 ? 'var(--c-warn)' : null,
                  },
                  {
                    label: 'Sin movimiento',
                    value: catalogStats.noMovement,
                    sub: 'en el período',
                    color: catalogStats.noMovement > 0 ? 'var(--c-warn)' : null,
                  },
                ].map(({ label, value, sub, color }) => (
                  <div key={label} className="bg-surface-2 border border-border rounded-2xl p-4">
                    <p className="text-[15px] md:text-base font-bold text-muted uppercase tracking-wider mb-2">{label}</p>
                    <p className="text-xl sm:text-2xl font-bold font-mono text-text truncate" style={color ? { color } : {}} title={value}>
                      {value}
                    </p>
                    <p className="text-[15px] md:text-base text-muted mt-1">{sub}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Capital inmovilizado */}
            {capitalInmovilizado > 0 && (
              <div className="bg-surface-2 border border-border rounded-2xl p-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-border bg-surface">
                  <Wallet size={16} style={{ color:'var(--c-warn)' }}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] md:text-base font-bold text-text">Capital inmovilizado</p>
                  <p className="text-[15px] md:text-base text-muted mt-0.5">Productos con stock sin ventas en el período seleccionado</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display font-bold text-lg font-mono truncate" style={{ color:'var(--c-warn)' }} title={formatCurrency(capitalInmovilizado)}>{formatCurrency(capitalInmovilizado)}</p>
                  <p className="text-[15px] md:text-base text-muted">precio de venta</p>
                </div>
              </div>
            )}

            {/* Top vendidos + Menos vendidos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              <div className="bg-surface-2 border border-border rounded-2xl overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                  <Award size={14} className="text-brand shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] md:text-base font-bold text-text">Más vendidos</p>
                    <p className="text-[15px] md:text-base text-muted">Por unidades en el período</p>
                  </div>
                  <CountSelector value={topCount} onChange={setTopCount}/>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ maxHeight: 360 }}>
                  {topSellersWithCoverage.length > 0 ? topSellersWithCoverage.map((p, i) => {
                    const maxQ = topSellersWithCoverage[0]?.qty || 1;
                    const rankColor = i === 0 ? 'var(--my-brand)' : i < 3 ? '#6366f1' : 'var(--my-dim)';
                    const coverageBadge = p.days !== null ? (
                      <span className="text-[15px] md:text-base font-bold px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap"
                        style={{
                          background: p.days <= 2 ? 'rgba(185,28,28,.15)' : p.days <= 7 ? 'rgba(180,83,9,.13)' : 'rgba(90,120,150,.1)',
                          color:      p.days <= 2 ? 'var(--c-crit)' : p.days <= 7 ? 'var(--c-warn)' : 'var(--my-muted)',
                        }}>
                        {p.stock === 0 ? 'Sin stock' : `${p.days}d`}
                      </span>
                    ) : null;
                    return (
                      <div key={p.id} className="flex items-center gap-3 px-5 py-3 border-b border-border/40 last:border-0 hover:bg-surface/50 transition-colors">
                        <span className="text-[15px] md:text-base font-black w-5 text-center shrink-0 tabular-nums" style={{ color: rankColor }}>{i+1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] md:text-base md:text-lg font-medium text-text truncate">{p.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="h-1 flex-1 bg-border rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all"
                                style={{ width:`${(p.qty/maxQ)*100}%`, background: i===0 ? 'var(--my-brand)' : '#6366f1', opacity: i===0 ? 1 : 0.7 }}/>
                            </div>
                            <span className="text-[15px] md:text-base text-muted shrink-0 font-mono">{p.qty} und.</span>
                          </div>
                        </div>
                        {coverageBadge}
                        <span className="text-[15px] md:text-base md:text-lg font-bold text-text font-mono shrink-0">{formatCurrency(p.revenue)}</span>
                      </div>
                    );
                  }) : <EmptyState icon={Award} message="Sin ventas en este período"/>}
                </div>
              </div>

              <div className="bg-surface-2 border border-border rounded-2xl overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                  <TrendingDown size={14} style={{ color:'var(--c-warn)' }} className="shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] md:text-base font-bold text-text">Menos vendidos</p>
                    <p className="text-[15px] md:text-base text-muted">Menor movimiento en el período</p>
                  </div>
                  <CountSelector value={bajaCount} onChange={setBajaCount}/>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ maxHeight: 360 }}>
                  {bajaRotacion.length > 0 ? bajaRotacion.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3 px-5 py-3 border-b border-border/40 last:border-0 hover:bg-surface/50 transition-colors">
                      <span className="text-[15px] md:text-base font-black w-5 text-center shrink-0 font-mono" style={{ color:'var(--my-dim)' }}>{i+1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] md:text-base md:text-lg font-medium text-text truncate">{p.name}</p>
                        <p className="text-[15px] md:text-base text-muted mt-0.5">{p.stock} en stock</p>
                      </div>
                      <div className="text-right shrink-0">
                        {p.qty === 0
                          ? <span className="text-[15px] md:text-base font-bold" style={{ color:'var(--c-warn)' }}>Sin ventas</span>
                          : <span className="text-[15px] md:text-base font-bold font-mono text-muted">{p.qty} und.</span>}
                        {p.price && <p className="text-[15px] md:text-base text-muted font-mono">{formatCurrency(p.price)}</p>}
                      </div>
                    </div>
                  )) : <EmptyState icon={TrendingDown} message="Todos los productos tuvieron movimiento" success/>}
                </div>
              </div>
            </div>

            {/* Stock crítico */}
            {lowStock.length > 0 && (
              <div className="bg-surface-2 border border-border rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
                  <AlertCircle size={13} style={{ color:'var(--c-crit)' }}/>
                  <p className="text-[15px] md:text-base font-bold text-text">Stock crítico</p>
                  <span className="ml-auto text-[15px] md:text-base font-bold px-2 py-0.5 rounded-full bg-surface border border-border"
                    style={{ color:'var(--c-crit)' }}>{lowStock.length} productos</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {lowStock.map((p, i) => {
                    const isLast = i === lowStock.length - 1;
                    return (
                      <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-r border-border/40 hover:bg-surface/50 transition-colors">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-surface border border-border">
                          <Package size={11} style={{ color: p.stock === 0 ? 'var(--c-crit)' : 'var(--c-warn)' }}/>
                        </div>
                        <p className="text-[15px] md:text-base font-medium text-text flex-1 truncate min-w-0">{p.name}</p>
                        <div className="text-right shrink-0">
                          <p className="text-[15px] md:text-base font-bold font-mono" style={{ color: p.stock === 0 ? 'var(--c-crit)' : 'var(--c-warn)' }}>
                            {p.stock === 0 ? 'Sin stock' : `${p.stock} und.`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════ VENTAS ════════════════════════════════ */}
        {activeTab === 'Ventas' && (
          <div className="bg-surface-2 border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface">
                    {['Fecha','Detalle','Medio de pago','Total',''].map((h, i) => (
                      <th key={h+i} className={`px-4 py-3 text-[15px] md:text-base font-bold tracking-widest text-muted uppercase ${i >= 3 ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {salesLoading ? (
                    <tr><td colSpan="5" className="p-12 text-center">
                      <Loader2 className="animate-spin text-brand mx-auto" size={24}/>
                    </td></tr>
                  ) : salesPage.length === 0 ? (
                    <tr><td colSpan="5" className="p-12 text-center text-muted text-[15px] md:text-base">No hay ventas registradas.</td></tr>
                  ) : (
                    salesPage.map(sale => {
                      let items = [];
                      if (sale.sale_items?.length) {
                        sale.sale_items.forEach(i => items.push(`${i.qty}× ${i.products?.name || 'Eliminado'}`));
                      } else { items.push('Venta general'); }
                      const total = Number(sale.total);
                      const color = getPC(sale.payment_method || '');
                      return (
                        <tr key={sale.id} className="border-b border-border/40 hover:bg-surface/60 transition-colors">
                          <td className="px-4 py-3 text-[15px] md:text-base text-text whitespace-nowrap font-mono">
                            {formatDateTime(new Date(sale.created_at))}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-0.5 max-w-[220px]">
                              {items.map((s, i) => <span key={i} className="text-[15px] md:text-base text-muted truncate">{s}</span>)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 text-[15px] md:text-base font-semibold capitalize text-text">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }}/>
                              {sale.payment_method || 'Varios'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold font-mono text-text text-right text-[15px] md:text-base">{formatCurrency(total)}</td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => setDeletingSale(sale)} className="p-1.5 text-muted hover:bg-red-500/10 rounded-lg transition-colors">
                              <Trash2 size={12}/>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={salesPag.currentPage}
              totalPages={salesPag.totalPages}
              totalItems={salesPag.totalCount}
              pageSize={salesPag.pageSize}
              onPageChange={(page) => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                fetchSalesPage(page);
              }}
            />
          </div>
        )}

        {/* ══════════════ CAJA ══════════════════════════════════ */}
        {activeTab === 'Caja' && (
          <div className="bg-surface-2 border border-border rounded-2xl overflow-x-auto">
            <table className="w-full min-w-[500px] text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface">
                  {['Fecha','Tipo','Motivo','Monto','Saldo Final'].map((h, i) => (
                    <th key={h} className={`px-4 py-3 text-[15px] md:text-base font-bold tracking-widest text-muted uppercase ${i >= 3 ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cashMovements.slice(0, 100).map(m => (
                  <tr key={m.id} className="border-b border-border/40 hover:bg-surface/60 transition-colors">
                    <td className="px-4 py-3 text-[15px] md:text-base text-text font-mono">{formatDateTime(new Date(m.fecha))}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-[15px] md:text-base font-semibold capitalize text-text">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.tipo==='ingreso' ? 'var(--my-brand)' : m.tipo==='retiro' ? 'var(--c-crit)' : 'var(--my-muted)' }}/>
                        {m.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[15px] md:text-base text-muted">{m.motivo || '—'}</td>
                    <td className="px-4 py-3 text-right font-bold text-[15px] md:text-base font-mono"
                      style={{ color: m.tipo==='ingreso' ? 'var(--my-brand)' : m.tipo==='retiro' ? 'var(--c-crit)' : 'var(--my-text)' }}>
                      {m.tipo==='ingreso' ? '+' : m.tipo==='retiro' ? '-' : ''}{formatCurrency(Number(m.monto))}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[15px] md:text-base font-mono text-text">{formatCurrency(Number(m.saldo_nuevo))}</td>
                  </tr>
                ))}
                {!cashMovements.length && (
                  <tr><td colSpan="5" className="p-12 text-center text-muted text-[15px] md:text-base">Sin movimientos.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ══════════════ USUARIOS ═══════════════════════════════ */}
        {activeTab === 'Usuarios' && (
          <div className="flex flex-col md:flex-row gap-4 min-h-[400px] h-[600px] max-h-[70vh]">
             <div className="w-full md:w-1/3 bg-surface-2 border border-border rounded-2xl overflow-hidden flex flex-col">
               <div className="px-5 py-3.5 border-b border-border bg-surface shrink-0">
                 <p className="text-[15px] md:text-base font-bold text-text">Trabajadores</p>
               </div>
               <div className="flex-1 overflow-y-auto custom-scrollbar">
                 {employeeStats.map(emp => (
                   <div key={emp.id} onClick={() => setSelectedEmp(emp.id)}
                     className={`p-4 border-b border-border/50 cursor-pointer transition-colors ${selectedEmp === emp.id ? 'bg-brand/10 border-l-2 border-l-brand' : 'hover:bg-surface'}`}>
                     <p className="font-bold text-text capitalize truncate">{emp.username}</p>
                     <p className="text-[15px] md:text-base text-muted truncate mb-2">{emp.role}</p>
                     <div className="flex items-center justify-between text-[15px] md:text-base mb-1">
                       <span className="font-semibold text-brand font-mono">{formatCurrency(emp.salesTotal)}</span>
                       <span className="text-muted">{emp.salesCount} ventas</span>
                     </div>
                     <div className="flex items-center justify-between text-[15px] md:text-base">
                       <span className="text-red-400 font-mono">-{formatCurrency(emp.anuladasTotal)}</span>
                       <span className="text-muted">{emp.anuladasCount} anuladas</span>
                     </div>
                      {['Propietario', 'Superadmin'].includes(profile?.role) && (
                        <div className="mt-3 bg-surface border border-border rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                          <span className="text-muted font-bold text-[13px] uppercase tracking-wider">Sueldo Base</span>
                          <span className="font-bold text-text text-[15px] md:text-base">{formatCurrency(emp.sueldo || 0)}</span>
                        </div>
                      )}
                   </div>
                 ))}
                 {employeeStats.length === 0 && (
                   <div className="p-6 text-center text-[15px] md:text-base text-muted">No se encontraron trabajadores.</div>
                 )}
               </div>
             </div>
             
             <div className="w-full md:w-2/3 bg-surface-2 border border-border rounded-2xl overflow-hidden flex flex-col">
               {selectedEmp ? (
                 <>
                   <div className="px-5 py-3.5 border-b border-border bg-surface shrink-0 flex items-center justify-between">
                     <div className="flex-1 min-w-0 pr-4">
                       <p className="text-[15px] md:text-base font-bold text-text truncate">Actividad de <span className="capitalize">{employeeStats.find(e => e.id === selectedEmp)?.username}</span></p>
                       <div className="flex flex-wrap items-center gap-3 mt-1 text-[15px] md:text-base text-muted">
                         <span>Ticket prom: <span className="font-mono text-text">{formatCurrency(employeeStats.find(e => e.id === selectedEmp)?.ticketPromedio)}</span></span>
                         <span>Medio favorito: <span className="capitalize text-text">{employeeStats.find(e => e.id === selectedEmp)?.favoriteMethod}</span></span>
                         <span>{sortedEmpSales.length} ventas</span>
                       </div>
                     </div>
                     <div className="shrink-0 flex flex-col items-end gap-1">
                       <select value={empSort} onChange={e => setEmpSort(e.target.value)} className="bg-bg border border-border text-[15px] md:text-base rounded px-2 py-1 text-muted focus:outline-none focus:border-brand cursor-pointer">
                         <option value="fecha_desc">Más recientes</option>
                         <option value="monto_desc">Mayor monto</option>
                         <option value="monto_asc">Menor monto</option>
                       </select>
                     </div>
                   </div>
                   <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                     {sortedEmpSales.length > 0 ? sortedEmpSales.map(item => (
                       <div key={item.id} className="bg-bg border border-border rounded-xl p-3 flex items-center justify-between">
                         <div className="flex-1 min-w-0 pr-4">
                           <div className="flex items-center gap-2">
                             <span className="text-[15px] md:text-base font-bold px-2 py-0.5 rounded-full shrink-0 bg-indigo-500/10 text-indigo-500">
                               {item._type}
                             </span>
                             <span className="text-[15px] md:text-base text-muted shrink-0 font-mono">
                               {formatDateTime(item._date)}
                             </span>
                           </div>
                           <p className="text-[15px] md:text-base text-text mt-1.5 font-medium truncate">
                             Venta #{String(item.id).split('-')[0]} - <span className="capitalize">{item.payment_method || 'Varios'}</span>
                           </p>
                         </div>
                         <p className="font-bold font-mono text-[15px] md:text-base shrink-0 text-brand">
                           {formatCurrency(item.total)}
                         </p>
                       </div>
                     )) : (
                       <div className="h-full flex items-center justify-center">
                         <p className="text-[15px] md:text-base text-muted">Sin actividad de ventas en este período.</p>
                       </div>
                     )}
                   </div>
                 </>
               ) : (
                 <div className="flex-1 flex items-center justify-center text-muted text-[15px] md:text-base">Selecciona un trabajador para ver sus registros</div>
               )}
             </div>
          </div>
        )}
      </div>

      {/* ── Modal anular ── */}
      {deletingSale && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg border border-border rounded-2xl w-full max-w-[400px] shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background:'rgba(239,68,68,0.1)' }}>
                <AlertTriangle size={20} style={{ color:'var(--c-crit)' }}/>
              </div>
              <div>
                <h3 className="text-[15px] md:text-base font-bold text-text">¿Anular esta venta?</h3>
                <p className="text-[15px] md:text-base text-muted">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-3.5 mb-5 text-[15px] md:text-base space-y-1.5">
              <p className="text-muted">Fecha: <span className="text-text font-medium">{formatDateTime(new Date(deletingSale.created_at))}</span></p>
              <p className="text-muted">Total: <span className="font-bold font-mono" style={{ color:'var(--c-crit)' }}>{formatCurrency(Number(deletingSale.total))}</span></p>
              {deletingSale.sale_items?.length > 0 && <p style={{ color:'var(--my-brand)' }}>✓ Se repondrá el stock de {deletingSale.sale_items.length} producto(s).</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeletingSale(null)} disabled={deleting}
                className="flex-1 border border-border text-text font-medium py-2.5 rounded-xl hover:bg-surface transition-all text-[15px] md:text-base">
                Cancelar
              </button>
              <button onClick={() => handleDeleteSale(deletingSale)} disabled={deleting}
                className="flex-1 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-[15px] md:text-base transition-colors">
                {deleting ? <Loader2 size={13} className="animate-spin"/> : <Trash2 size={13}/>}
                {deleting ? 'Anulando…' : 'Anular'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
