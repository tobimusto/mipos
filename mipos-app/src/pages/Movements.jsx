import { useState, useEffect } from 'react';
import DatePicker from '../components/ui/DatePicker';
import { Search, Package, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { fmtQty, VARIABLE_UNITS } from '../lib/units';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/Pagination';
import toast from 'react-hot-toast';

export default function Movements() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const toISO = (d) => d.toISOString().split('T')[0];
  const today = toISO(new Date());
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [activePreset, setActivePreset] = useState(0); // 0 = Hoy por defecto

  const pagination = usePagination(20);

  // Modal State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [tipo, setTipo] = useState('entrada');
  const [cantidad, setCantidad] = useState(1);
  const [motivo, setMotivo] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      fetchMovements();
      fetchProducts();
    }
  }, [user]);

  /**
   * fetchMovements — paginación server-side real.
   *
   * Sin búsqueda: usa range() para traer solo la página solicitada.
   * Con búsqueda: trae todos los registros del rango de fechas y filtra
   * en cliente. El filtro de fechas ya acota el conjunto de datos, por lo
   * que este fallback es seguro dentro de rangos razonables (Hoy, 1 sem…).
   */
  const fetchMovements = async (oStart = null, oEnd = null, page = 1, search = searchTerm) => {
    const sd      = oStart ?? startDate;
    const ed      = oEnd   ?? endDate;
    const searching = search.trim().length > 0;

    try {
      setLoading(true);

      let query = supabase
        .from('stock_movements')
        .select('*, products(name, unit)', { count: 'exact' })
        .eq('user_id', user.id)
        .order('fecha', { ascending: false });

      if (sd) query = query.gte('fecha', `${sd}T00:00:00`);
      if (ed) query = query.lte('fecha', `${ed}T23:59:59`);

      if (!searching) {
        // Paginación real: solo se traen los N registros de esta página
        const { from, to } = pagination.getRange(page);
        query = query.range(from, to);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      let rows = data || [];

      if (searching) {
        // Filtro client-side sobre el set ya acotado por fechas
        const q = search.toLowerCase();
        rows = rows.filter(m =>
          m.products?.name?.toLowerCase().includes(q) ||
          m.motivo?.toLowerCase().includes(q)
        );
        pagination.setTotalCount(rows.length);
      } else {
        pagination.setTotalCount(count ?? 0);
      }

      setMovements(rows);
    } catch (err) {
      console.error('Error fetching movements:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (days) => {
    pagination.reset();
    if (activePreset === days) {
      setActivePreset(null); setStartDate(''); setEndDate('');
      fetchMovements('', '', 1);
    } else {
      const end = new Date(), start = new Date();
      start.setDate(start.getDate() - days);
      const s = toISO(start), e = toISO(end);
      setActivePreset(days); setStartDate(s); setEndDate(e);
      fetchMovements(s, e, 1);
    }
  };

  const clearFilters = () => {
    pagination.reset();
    setActivePreset(null); setStartDate(''); setEndDate('');
    fetchMovements('', '', 1);
  };

  // Debounce búsqueda: re-fetch al cambiar searchTerm
  useEffect(() => {
    const timer = setTimeout(() => {
      pagination.reset();
      fetchMovements(null, null, 1, searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, stock, unit')
        .order('name');
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const handleRegisterMovement = async () => {
    if (!selectedProductId || cantidad <= 0 || !motivo) {
      toast.error("Completá todos los campos correctamente.");
      return;
    }

    const selectedProduct = products.find(p => p.id === selectedProductId);
    const stockActual = selectedProduct.stock || 0;
    
    let newStock = stockActual;
    if (tipo === 'entrada') {
      newStock += Number(cantidad);
    } else {
      if (Number(cantidad) > stockActual) {
        toast.error("No podés retirar más stock del que tenés disponible.");
        return;
      }
      newStock -= Number(cantidad);
    }

    try {
      // 1. Insert Movement
      const { data: newMovement, error: movementError } = await supabase
        .from('stock_movements')
        .insert([{
          user_id: user.id,
          product_id: selectedProductId,
          tipo: tipo,
          cantidad: Number(cantidad),
          motivo: motivo
        }])
        .select(`*, products (name)`);

      if (movementError) throw movementError;

      // 2. Update Product Stock
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', selectedProductId);

      if (updateError) throw updateError;

      // 3. Update local state
      setMovements(prev => [newMovement[0], ...prev]);
      setProducts(prev => prev.map(p => p.id === selectedProductId ? { ...p, stock: newStock } : p));
      
      // Close modal
      setShowModal(false);
      setSelectedProductId('');
      setCantidad(1);
      setMotivo('');
      toast.success("Movimiento registrado con éxito");
    } catch (err) {
      console.error('Error registering movement:', err);
      toast.error('Hubo un error al registrar el movimiento.');
    }
  };

  // Sin filtro client-side: el fetchMovements ya resuelve búsqueda + paginación.
  const handlePageChange = (page) => {
    pagination.setCurrentPage(page);
    fetchMovements(null, null, page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-display font-bold text-text">Movimientos de stock</h1>
          <p className="text-sm md:text-[15px] text-muted">Historial de entradas y salidas de tu negocio</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto bg-brand hover:bg-brand-hover text-text font-bold py-2.5 px-5 rounded-xl transition-all text-sm md:text-[15px] flex items-center justify-center gap-2 shrink-0"
        >
          + Registrar movimiento
        </button>
      </div>

      <div className="bg-surface-2 border border-border rounded-2xl flex flex-col">
        {/* Barra de filtros */}
        <div className="p-4 border-b border-border bg-surface flex flex-wrap gap-2 items-center">
          {/* Búsqueda */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input
              type="text"
              placeholder="Buscar producto o motivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-bg border border-border rounded-xl py-2 pl-9 pr-4 text-sm md:text-[15px] focus:outline-none focus:border-brand/50 transition-colors text-text"
            />
          </div>

          <div className="w-px h-5 bg-border mx-0.5 hidden sm:block" />

          {/* Shortcuts */}
          {[{ l: 'Hoy', d: 0 }, { l: '1 sem', d: 7 }, { l: '2 sem', d: 14 }, { l: '1 mes', d: 30 }].map(({ l, d }) => (
            <button key={d} onClick={() => applyPreset(d)}
              className={`h-8 px-3 text-sm md:text-[15px] font-semibold rounded-xl border transition-colors ${
                activePreset === d ? 'bg-brand border-brand text-text' : 'bg-bg border-border text-muted hover:border-brand/60 hover:text-text'
              }`}>
              {l}
            </button>
          ))}

          {/* Inputs de fecha */}
          {[['Desde', startDate, setStartDate], ['Hasta', endDate, setEndDate]].map(([lbl, val, setter]) => (
            <div key={lbl} className="h-8 bg-bg border border-border rounded-xl px-2.5 flex items-center gap-1.5 text-sm md:text-[15px] text-text">
              <span className="text-muted">{lbl}:</span>
              <DatePicker
                value={val}
                onChange={(v) => { setter(v); setActivePreset(null); }}
                variant="ghost"
                placeholder="--/--/--"
              />
            </div>
          ))}

          <button onClick={() => fetchMovements()}
            className="h-8 px-3 bg-brand hover:bg-brand-hover text-text text-sm md:text-[15px] font-bold rounded-xl transition-colors">
            Aplicar
          </button>
          <button onClick={clearFilters}
            className="h-8 px-3 border border-border text-muted hover:text-text text-sm md:text-[15px] font-semibold rounded-xl transition-colors">
            Limpiar
          </button>
        </div>

        <div className="overflow-x-auto hide-scrollbar">
          <table className="w-full min-w-[640px] text-left border-collapse">
            <thead className="bg-surface sticky top-0 z-10">
              <tr>
                <th className="p-4 font-display font-semibold text-sm md:text-[15px] tracking-wider text-muted uppercase border-b border-border">Fecha</th>
                <th className="p-4 font-display font-semibold text-sm md:text-[15px] tracking-wider text-muted uppercase border-b border-border">Producto</th>
                <th className="p-4 font-display font-semibold text-sm md:text-[15px] tracking-wider text-muted uppercase border-b border-border">Tipo</th>
                <th className="p-4 font-display font-semibold text-sm md:text-[15px] tracking-wider text-muted uppercase border-b border-border text-center">Cantidad</th>
                <th className="p-4 font-display font-semibold text-sm md:text-[15px] tracking-wider text-muted uppercase border-b border-border">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center">
                    <Loader2 className="animate-spin text-brand mx-auto" size={32} />
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-dim text-sm md:text-[15px]">
                    No hubo movimientos de stock con esos filtros.
                  </td>
                </tr>
              ) : (
                movements.map(m => (
                  <tr key={m.id} className="border-b border-border/50 hover:bg-surface transition-colors">
                    <td className="px-4 py-4 text-muted">{new Date(m.fecha).toLocaleDateString()} {new Date(m.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                    <td className="px-4 py-4 font-bold text-text">{m.products?.name || 'Desconocido'}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-sm md:text-[15px] font-bold ${m.tipo === 'entrada' ? 'bg-brand/20 text-brand' : 'bg-red-400/20 text-red-400'}`}>
                        {m.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center font-bold text-text">
                      {m.tipo === 'entrada' ? '+' : '-'}{fmtQty(m.cantidad, m.products?.unit)}
                    </td>
                    <td className="px-4 py-4 text-muted">{m.motivo}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalCount}
          pageSize={pagination.pageSize}
          onPageChange={handlePageChange}
        />
      </div>

      {/* Nuevo Movimiento Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button 
              onClick={() => { setShowModal(false); setErrorMsg(''); }}
              className="absolute top-4 right-4 text-dim hover:text-text transition-colors"
            >
              <X size={18} />
            </button>
            
            <div className="p-6 border-b border-border bg-surface">
              <h2 className="text-lg font-display font-bold text-text mb-1">Registrar Movimiento Manual</h2>
              <p className="text-sm md:text-[15px] text-muted">Ajustá tu stock por roturas, obsequios o correcciones.</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm md:text-[15px] font-medium text-text mb-2">Tipo de Movimiento</label>
                <div className="flex bg-surface-2 rounded-lg p-1 border border-border">
                  <button 
                    onClick={() => setTipo('entrada')}
                    className={`flex-1 py-2 text-sm md:text-[15px] font-bold rounded-md transition-colors ${tipo === 'entrada' ? 'bg-brand text-text' : 'text-muted hover:text-text'}`}
                  >
                    Entrada
                  </button>
                  <button 
                    onClick={() => setTipo('salida')}
                    className={`flex-1 py-2 text-sm md:text-[15px] font-bold rounded-md transition-colors ${tipo === 'salida' ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'}`}
                  >
                    Salida
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm md:text-[15px] font-medium text-text mb-2">Producto</label>
                <div className="relative">
                  <select 
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-lg py-2.5 px-4 text-sm md:text-[15px] focus:outline-none focus:border-brand/50 text-text transition-colors appearance-none"
                  >
                    <option value="">Selecciona un producto...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  {(() => {
                    const selProd = products.find(p => p.id === selectedProductId);
                    const isVariable = selProd && VARIABLE_UNITS.includes(selProd.unit);
                    return (
                      <>
                        <label className="block text-sm md:text-[15px] font-medium text-text mb-2">
                          Cantidad a {tipo === 'entrada' ? 'sumar' : 'restar'}
                          {selProd?.unit && selProd.unit !== 'unidades' && (
                            <span className="ml-1 text-muted font-normal">({selProd.unit === 'litros' ? 'L' : selProd.unit})</span>
                          )}
                        </label>
                        <input
                          type="number"
                          value={cantidad}
                          onChange={(e) => { setCantidad(e.target.value); setErrorMsg(''); }}
                          min={isVariable ? '0.001' : '1'}
                          step={isVariable ? '0.001' : '1'}
                          className={`w-full bg-surface-2 border rounded-lg py-2.5 px-4 text-sm md:text-[15px] focus:outline-none transition-colors ${errorMsg.includes('cantidad') ? 'border-red-500 focus:border-red-500 text-text' : 'border-brand/30 focus:border-brand text-text'}`}
                        />
                      </>
                    );
                  })()}
                </div>
                <div>
                  <label className="block text-sm md:text-[15px] font-medium text-text mb-2">Motivo</label>
                  <input 
                    type="text" 
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Ej. Rotura, Devolución..."
                    className="w-full bg-surface-2 border border-border rounded-lg py-2.5 px-4 text-sm md:text-[15px] focus:outline-none focus:border-brand/50 text-text transition-colors"
                  />
                </div>
              </div>
              
              {errorMsg && (
                <div className="mt-2 text-red-400 text-sm md:text-[15px] font-medium">{errorMsg}</div>
              )}
            </div>

            <div className="p-4 border-t border-border bg-surface flex justify-end gap-3">
              <button 
                onClick={() => { setShowModal(false); setErrorMsg(''); }}
                className="px-4 py-2 text-sm md:text-[15px] font-medium text-text hover:bg-surface-2 border border-transparent hover:border-border rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleRegisterMovement}
                className="bg-brand hover:bg-brand-hover font-bold text-text py-2 px-5 rounded-lg transition-all text-sm md:text-[15px] shadow-[0_4px_15px_rgba(82,82,255,0.3)]"
              >
                Registrar Movimiento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
