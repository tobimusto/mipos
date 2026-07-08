import { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Loader2, Package, Upload, Download, X, HelpCircle, AlertTriangle, ChevronUp, ChevronDown, ChevronsUpDown, Wand2, ToggleRight, ToggleLeft, CheckSquare2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useCountry } from '../context/CountryContext';
import { usePlan } from '../hooks/usePlan';
import toast from 'react-hot-toast';
import Pagination from '../components/Pagination';

export default function Inventory() {
  const { user, owner_id } = useAuth();
  const { formatCurrency, countryConfig } = useCountry();
  const plan = usePlan();
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // CSV Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Providers State
  const [providers, setProviders] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  // OFF Enrichment State
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState(0);
  const [enrichTotal, setEnrichTotal] = useState(0);

  // Store Margin & Sorting
  const [storeMargin, setStoreMargin] = useState(30);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);

  // Multi-select
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', owner_id)
        .order('name');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProviders = async () => {
    try {
      const { data, error } = await supabase.from('providers').select('id, nombre').eq('user_id', owner_id).order('nombre');
      if (!error && data) setProviders(data);
    } catch (err) {
      console.error('Error fetching providers:', err);
    }
  };

  const fetchStoreSettings = async () => {
    if (!owner_id) return;
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('user_id', owner_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!error && data) {
        setStoreMargin(data.estimated_margin || 30);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchProviders();
    fetchStoreSettings();
  }, [owner_id]);

  const handleEnrichCatalog = async () => {
    const productsToEnrich = products.filter(p => p.code && p.code.length >= 5 && (!p.icon || p.icon === '📦'));
    
    if (productsToEnrich.length === 0) {
      toast.error('No hay productos pendientes de enriquecer con código de barras válido.');
      return;
    }

    setEnrichTotal(productsToEnrich.length);
    setEnrichProgress(0);
    setIsEnriching(true);

    try {
      const BATCH_SIZE = 30;
      let enrichedCount = 0;
      let updatedProducts = [...products];

      for (let i = 0; i < productsToEnrich.length; i += BATCH_SIZE) {
        const batch = productsToEnrich.slice(i, i + BATCH_SIZE);
        const codeList = batch.map(p => p.code).join(',');

        try {
          const res = await fetch(`https://${countryConfig.off.domain}/api/v2/search?code=${codeList}&fields=code,image_front_thumb_url,image_thumb_url`, {
            headers: { 'User-Agent': 'mipos-App - Web - Version 1.0' }
          });
          const data = await res.json();
          
          if (data.products && data.products.length > 0) {
            for (const offProduct of data.products) {
              const match = batch.find(p => p.code === offProduct.code);
              const imageUrl = offProduct.image_front_thumb_url || offProduct.image_thumb_url;
              if (match && imageUrl) {
                await supabase
                  .from('products')
                  .update({ icon: imageUrl })
                  .eq('id', match.id);
                
                updatedProducts = updatedProducts.map(p => 
                  p.id === match.id ? { ...p, icon: imageUrl } : p
                );
                enrichedCount++;
              }
            }
          }
        } catch (e) {
          console.error('Error fetching batch:', e);
        }
        
        setEnrichProgress(prev => Math.min(prev + batch.length, productsToEnrich.length));
      }

      setProducts(updatedProducts);
      toast.success(`Catálogo enriquecido: ${enrichedCount} imágenes actualizadas.`);
    } catch (e) {
      console.error('Error during catalog enrichment:', e);
      toast.error('Hubo un error al enriquecer el catálogo.');
    } finally {
      setIsEnriching(false);
    }
  };

  const handleToggleActive = async (prod) => {
    const newActive = !(prod.active !== false); // treat null/undefined as true
    try {
      const { error } = await supabase
        .from('products')
        .update({ active: newActive })
        .eq('id', prod.id);
      if (error) throw error;
      setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, active: newActive } : p));
      toast.success(newActive ? `"${prod.name}" activado` : `"${prod.name}" desactivado`);
    } catch (err) {
      toast.error('Error al cambiar estado del producto');
    }
  };

  const handleEditClick = (prod) => {
    setEditingProduct({ ...prod });
    setShowEditModal(true);
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

      setEditingProduct({...editingProduct, icon: data.publicUrl});
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Hubo un error al subir la imagen. Asegúrate de haber ejecutado el SQL para crear el bucket "product_images".');
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (Number(editingProduct.stock) < 0) {
      toast.error('El stock no puede ser negativo. El mínimo permitido es 0.');
      return;
    }
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .update({
          name: editingProduct.name,
          price: Number(editingProduct.price),
          stock: Number(editingProduct.stock),
          provider_id: editingProduct.provider_id || null,
          icon: editingProduct.icon
        })
        .eq('id', editingProduct.id)
        .select();
        
      if (error) throw error;
      if (!data || data.length === 0) {
         throw new Error('El producto no pudo actualizarse. Puede que no tengas permisos.');
      }
      
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...editingProduct, price: Number(editingProduct.price), stock: Number(editingProduct.stock) } : p));
      fetchProducts();
      toast.success('Producto actualizado correctamente');
    } catch (err) {
      console.error('Error saving product edits:', err);
      toast.error('Hubo un error al actualizar el producto');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = (prod) => {
    setProductToDelete(prod);
    setShowDeleteModal(true);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id);
        
      if (error) throw error;
      
      setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
      toast.success('Producto eliminado correctamente');
    } catch (err) {
      console.error('Error deleting product:', err);
      if (err.code === '23503') {
        toast.error('No se puede eliminar: el producto tiene ventas registradas. Desactivalo desde el switch para no perder tu historial financiero.');
      } else {
        toast.error('No se pudo eliminar el producto. Verifica que no tenga ventas asociadas.');
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setProductToDelete(null);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.code && p.code.includes(searchTerm))
  );

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];

    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();

    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  useEffect(() => { setCurrentPage(1); setSelectedIds(new Set()); }, [searchTerm]);
  useEffect(() => { setSelectedIds(new Set()); }, [currentPage]);

  const PAGE_SIZE_INVENTORY = 20;
  const totalPagesInventory = Math.ceil(sortedProducts.length / PAGE_SIZE_INVENTORY);
  const paginatedProducts   = sortedProducts.slice(
    (currentPage - 1) * PAGE_SIZE_INVENTORY,
    currentPage * PAGE_SIZE_INVENTORY
  );

  // CSV Export
  const handleExportCSV = () => {
    const headers = ['Código', 'Nombre', 'Precio', 'Costo', 'IVA', 'Stock', 'Imagen', 'Categoría', 'Unidad', 'Proveedor', 'Activo'];

    const rows = products.map(p => [
      p.code || '',
      p.name || '',
      p.price || 0,
      p.cost || 0,
      p.tax || 21,
      p.stock || 0,
      p.icon?.startsWith('http') ? p.icon : (p.icon || '📦'),
      p.category || '',
      p.unit || 'Unitario',
      providers.find(pv => pv.id === p.provider_id)?.nombre || '',
      p.active !== false ? 'SI' : 'NO'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `productos_exportados_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download Template
  const handleDownloadTemplate = () => {
    const headers = ['Código', 'Nombre', 'Precio', 'Costo', 'IVA', 'Stock', 'Imagen', 'Categoría', 'Unidad', 'Proveedor', 'Activo'];

    const exampleRow = ['7790895000997', 'Coca Cola 2.25L', '2200', '1650', '21', '24', '🥤', 'Bebidas', 'Unitario', '', 'SI'];

    const csvContent = [
      headers.join(','),
      exampleRow.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
    ].join('\n');

    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_productos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse CSV function
  const parseCSV = (text) => {
    const lines = [];
    let row = [""];
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          row[row.length - 1] += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push("");
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        lines.push(row);
        row = [""];
      } else {
        row[row.length - 1] += char;
      }
    }
    if (row.length > 1 || row[0] !== "") {
      lines.push(row);
    }
    return lines;
  };

  // CSV Import handler
  const handleImportCSV = async (e) => {
    e.preventDefault();
    if (!selectedFile || !user) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const parsedLines = parseCSV(text);

        if (parsedLines.length < 2) {
          toast.error('El archivo CSV está vacío o tiene un formato incorrecto.');
          setImporting(false);
          return;
        }

        const rawHeaders = parsedLines[0].map(h => h.trim().toLowerCase().replace(/^[﻿]/, ''));
        const col = (...names) => {
          for (const n of names) {
            const idx = rawHeaders.indexOf(n);
            if (idx !== -1) return idx;
          }
          return -1;
        };

        const idxName     = col('nombre');
        const idxCode     = col('código', 'codigo');
        const idxPrice    = col('precio');
        const idxCost     = col('costo');
        const idxTax      = col('iva');
        const idxStock    = col('stock');
        const idxIcon     = col('imagen');
        const idxCategory = col('categoría', 'categoria');
        const idxUnit     = col('unidad');
        const idxProvider = col('proveedor');
        const idxActive   = col('activo');

        if (idxName === -1) {
          toast.error('El archivo CSV debe contener al menos la columna "Nombre".');
          setImporting(false);
          return;
        }

        const toInsert = [];
        const toUpdate = [];

        for (let i = 1; i < parsedLines.length; i++) {
          const row = parsedLines[i];
          if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;

          const name = row[idxName]?.trim();
          if (!name) continue;

          const code = idxCode !== -1 ? row[idxCode]?.trim() : '';
          const provName = idxProvider !== -1 ? row[idxProvider]?.trim() : '';
          const provider = provName ? providers.find(p => p.nombre.toLowerCase() === provName.toLowerCase()) : null;

          const rowData = {
            name,
            code,
            price:    idxPrice    !== -1 ? parseFloat(row[idxPrice])    || 0   : 0,
            cost:     idxCost     !== -1 ? parseFloat(row[idxCost])     || 0   : 0,
            tax:      idxTax      !== -1 ? parseFloat(row[idxTax])      || 21  : 21,
            stock:    idxStock    !== -1 ? parseInt(row[idxStock], 10)  || 0   : 0,
            icon:     idxIcon     !== -1 ? row[idxIcon]?.trim()  || '📦' : '📦',
            category: idxCategory !== -1 ? row[idxCategory]?.trim() || '' : '',
            unit:     idxUnit     !== -1 ? row[idxUnit]?.trim()  || 'Unitario' : 'Unitario',
            provider_id: provider?.id || null,
            active:   idxActive   !== -1 ? row[idxActive]?.trim().toUpperCase() === 'SI' : true,
          };

          const match = products.find(p => (code && p.code === code) || p.name.toLowerCase() === name.toLowerCase());

          if (match) {
            toUpdate.push({ id: match.id, ...rowData });
          } else {
            toInsert.push({ ...rowData, user_id: owner_id });
          }
        }

        if (toInsert.length > 0) {
          const { error } = await supabase.from('products').insert(toInsert);
          if (error) throw error;
        }

        if (toUpdate.length > 0) {
          for (const item of toUpdate) {
            const { error } = await supabase
              .from('products')
              .update({
                name: item.name, code: item.code, price: item.price,
                cost: item.cost, tax: item.tax, stock: item.stock,
                icon: item.icon, category: item.category, unit: item.unit,
                provider_id: item.provider_id, active: item.active,
              })
              .eq('id', item.id);
            if (error) throw error;
          }
        }

        toast.success(`Importación completada. Creados: ${toInsert.length}, Actualizados: ${toUpdate.length}`);
        setShowImportModal(false);
        setSelectedFile(null);
        fetchProducts();

      } catch (err) {
        console.error('Error procesando CSV:', err);
        toast.error('Hubo un error al procesar el archivo CSV.');
      } finally {
        setImporting(false);
      }
    };

    reader.readAsText(selectedFile, 'UTF-8');
  };

  // Multi-select handlers (defined here to access paginatedProducts)
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const isAllPageSelected = paginatedProducts.length > 0 && paginatedProducts.every(p => selectedIds.has(p.id));
  const isPartialPageSelected = !isAllPageSelected && paginatedProducts.some(p => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    if (isAllPageSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedProducts.map(p => p.id)));
    }
  };

  const handleBulkActivate = async (active) => {
    const ids = [...selectedIds];
    try {
      const { error } = await supabase.from('products').update({ active }).in('id', ids);
      if (error) throw error;
      setProducts(prev => prev.map(p => ids.includes(p.id) ? { ...p, active } : p));
      setSelectedIds(new Set());
      toast.success(`${ids.length} producto${ids.length !== 1 ? 's' : ''} ${active ? 'activado' : 'desactivado'}${ids.length !== 1 ? 's' : ''}`);
    } catch {
      toast.error('Error al actualizar productos');
    }
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    setIsBulkDeleting(true);
    try {
      const { error } = await supabase.from('products').delete().in('id', ids);
      if (error) throw error;
      setProducts(prev => prev.filter(p => !ids.includes(p.id)));
      setSelectedIds(new Set());
      toast.success(`${ids.length} producto${ids.length !== 1 ? 's' : ''} eliminado${ids.length !== 1 ? 's' : ''}`);
    } catch (err) {
      if (err.code === '23503') {
        toast.error('Algunos productos tienen ventas y no se pueden eliminar. Desactívalos en su lugar.');
      } else {
        toast.error('Error al eliminar productos');
      }
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteModal(false);
    }
  };

  return (
    <div className="flex flex-col p-4 md:p-8">
      {isEnriching && (
        <div className="bg-brand/10 border border-brand/20 p-4 rounded-xl mb-6 flex flex-col gap-2">
          <div className="flex justify-between items-center text-sm md:text-[15px] font-bold text-text">
            <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin text-brand" /> Enriqueciendo con IA / OFF...</span>
            <span>{enrichProgress} / {enrichTotal}</span>
          </div>
          <div className="w-full bg-surface rounded-full h-2 overflow-hidden border border-border">
            <div className="bg-brand h-full transition-all duration-300" style={{ width: `${(enrichProgress / enrichTotal) * 100}%` }}></div>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-3 lg:flex-row lg:justify-between lg:items-center mb-8 shrink-0">
        <div>
          <h2 className="font-display font-bold text-2xl text-text">Inventario</h2>
          <p className="text-muted text-sm md:text-[15px] mt-1">Gestiona tus productos y controla el stock</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">

          <button 
            onClick={() => setShowImportModal(true)}
            className="w-full sm:w-auto justify-center bg-surface-2 border border-border text-text hover:bg-surface font-bold py-2.5 px-4 rounded-xl transition-all text-sm md:text-[15px] flex items-center gap-2"
          >
            <Upload size={16} />
            Importar CSV
          </button>
          <button 
            onClick={handleExportCSV}
            className="w-full sm:w-auto justify-center bg-surface-2 border border-border text-text hover:bg-surface font-bold py-2.5 px-4 rounded-xl transition-all text-sm md:text-[15px] flex items-center gap-2"
          >
            <Download size={16} />
            Exportar CSV
          </button>
          <button 
            onClick={() => {
              if (products.length >= plan.maxProducts) {
                toast.error(`Alcanzaste el límite de ${plan.maxProducts} productos de tu plan. Mejorá tu plan para seguir agregando.`);
              } else {
                window.location.href = '/inventory/new';
              }
            }}
            className="w-full sm:w-auto justify-center bg-brand text-black font-bold py-2.5 px-5 rounded-xl hover:bg-[#05FF88] transition-all text-sm md:text-[15px] flex items-center gap-2 shrink-0"
          >
            <Plus size={18} />
            Nuevo Producto
          </button>
        </div>
      </div>
      
      <div className="bg-surface-2 border border-border rounded-2xl flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-border bg-surface flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center shrink-0">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input 
              type="text" 
              placeholder="Buscar producto por nombre o código..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-bg border border-border rounded-xl py-2 pl-10 pr-4 text-sm md:text-[15px] focus:outline-none focus:border-mipos-green/50 transition-colors"
            />
          </div>
          <div className="text-sm md:text-[15px] text-muted flex flex-col items-end">
            <div>
              <span className="font-bold text-text">{sortedProducts.length}</span> / {plan.maxProducts} productos
            </div>
            {products.length >= plan.maxProducts && (
              <span className="text-sm md:text-[15px] text-[#ff5252] font-bold">Límite alcanzado</span>
            )}
          </div>
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="px-4 py-2.5 border-b border-border bg-brand/5 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-sm font-bold text-brand flex items-center gap-1.5">
              <CheckSquare2 size={15} />
              {selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkActivate(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-sm font-bold transition-colors"
              >
                <ToggleRight size={15} />
                Activar
              </button>
              <button
                onClick={() => handleBulkActivate(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface text-muted hover:bg-bg border border-border text-sm font-bold transition-colors"
              >
                <ToggleLeft size={15} />
                Desactivar
              </button>
              <button
                onClick={() => setShowBulkDeleteModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 text-sm font-bold transition-colors"
              >
                <Trash2 size={15} />
                Eliminar
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto hide-scrollbar">
          <table className="w-full min-w-[640px] text-left border-collapse">
            <thead className="bg-surface sticky top-0 z-10">
              <tr>
                <th className="p-4 w-10 border-b border-border">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    ref={el => { if (el) el.indeterminate = isPartialPageSelected; }}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded cursor-pointer accent-[#009B65]"
                  />
                </th>
                <th className="p-4 font-display font-semibold text-sm md:text-[15px] tracking-wider text-muted uppercase border-b border-border">Icono</th>
                <th className="p-4 font-display font-semibold text-sm md:text-[15px] tracking-wider text-muted uppercase border-b border-border cursor-pointer hover:text-text transition-colors group" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1.5">
                    Producto 
                    <span className={`transition-opacity ${sortConfig.key === 'name' ? 'text-brand opacity-100' : 'text-muted opacity-40 group-hover:opacity-100'}`}>
                      {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ChevronsUpDown size={14} />}
                    </span>
                  </div>
                </th>
                <th className="p-4 font-display font-semibold text-sm md:text-[15px] tracking-wider text-muted uppercase border-b border-border">Código</th>
                <th className="p-4 font-display font-semibold text-sm md:text-[15px] tracking-wider text-muted uppercase border-b border-border">Categoría</th>
                <th className="p-4 font-display font-semibold text-sm md:text-[15px] tracking-wider text-muted uppercase border-b border-border">Proveedor</th>
                <th className="p-4 font-display font-semibold text-sm md:text-[15px] tracking-wider text-muted uppercase border-b border-border text-right cursor-pointer hover:text-text transition-colors group" onClick={() => handleSort('price')}>
                  <div className="flex items-center justify-end gap-1.5">
                    Precio 
                    <span className={`transition-opacity ${sortConfig.key === 'price' ? 'text-brand opacity-100' : 'text-muted opacity-40 group-hover:opacity-100'}`}>
                      {sortConfig.key === 'price' ? (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ChevronsUpDown size={14} />}
                    </span>
                  </div>
                </th>
                <th className="p-4 font-display font-semibold text-sm md:text-[15px] tracking-wider text-muted uppercase border-b border-border text-center cursor-pointer hover:text-text transition-colors group" onClick={() => handleSort('stock')}>
                  <div className="flex items-center justify-center gap-1.5">
                    Stock 
                    <span className={`transition-opacity ${sortConfig.key === 'stock' ? 'text-brand opacity-100' : 'text-muted opacity-40 group-hover:opacity-100'}`}>
                      {sortConfig.key === 'stock' ? (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ChevronsUpDown size={14} />}
                    </span>
                  </div>
                </th>
                <th className="p-4 font-display font-semibold text-sm md:text-[15px] tracking-wider text-muted uppercase border-b border-border text-center">Disponible</th>
                <th className="p-4 font-display font-semibold text-sm md:text-[15px] tracking-wider text-muted uppercase border-b border-border text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" className="p-8 text-center text-brand">
                    <Loader2 className="animate-spin mx-auto" size={24} />
                  </td>
                </tr>
              ) : sortedProducts.length === 0 ? (
                <tr>
                  <td colSpan="10" className="p-12 text-center text-dim">
                    <Package size={32} className="mx-auto mb-3 opacity-50" />
                    No hay productos para mostrar
                  </td>
                </tr>
              ) : (
                paginatedProducts.map(prod => (
                  <tr key={prod.id} className={`border-b border-border/50 hover:bg-surface transition-colors group ${prod.active === false ? 'opacity-50' : ''}`}>
                    <td className="p-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(prod.id)}
                        onChange={() => toggleSelect(prod.id)}
                        className="w-4 h-4 rounded cursor-pointer accent-[#009B65]"
                      />
                    </td>
                    <td className="p-4">
                      <div className="w-10 h-10 bg-bg rounded-lg border border-border flex items-center justify-center text-xl overflow-hidden shrink-0">
                        {(prod.icon?.startsWith('http') || prod.icon?.startsWith('products/')) ? (
                          <img src={prod.icon?.startsWith('http') ? prod.icon : `https://images.openfoodfacts.org/images/${prod.icon}`} alt={prod.name} className="w-full h-full object-cover" />
                        ) : (
                          prod.icon || '📦'
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-medium text-text">
                      <div className="flex items-center gap-2">
                        {prod.name}
                        {plan.hasLowRotationAlerts && prod.stock > 0 && new Date() - new Date(prod.updated_at || prod.created_at || Date.now()) > 30*24*60*60*1000 && (
                          <span className="inline-flex items-center gap-1 bg-[#ff5252]/10 text-[#ff5252] text-sm md:text-[15px] font-bold px-1.5 py-0.5 rounded border border-[#ff5252]/20" title="Sin movimiento en más de 30 días">
                            <AlertTriangle size={10} /> Baja Rotación
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-muted text-sm md:text-[15px]">{prod.code || '-'}</td>
                    <td className="p-4 text-text text-sm md:text-[15px]">
                      {prod.category ? <span className="inline-block px-2 py-1 bg-surface-2 border border-border rounded text-sm md:text-[15px]">{prod.category}</span> : '-'}
                    </td>
                    <td className="p-4 text-muted text-sm md:text-[15px] truncate max-w-[120px]" title={providers.find(p => p.id === prod.provider_id)?.nombre || '-'}>
                      {providers.find(p => p.id === prod.provider_id)?.nombre || '-'}
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="font-bold text-text">{formatCurrency(prod.price * (storeMargin/100))} <span className="text-sm md:text-[15px] font-normal text-muted">Costo</span></div>
                      <div className="text-sm md:text-[15px] font-bold text-emerald-500 mt-0.5">Ganancia: {formatCurrency(prod.price * (1 - (storeMargin/100)))}</div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-sm md:text-[15px] font-bold ${prod.stock < 10 ? 'bg-mipos-orange/20 text-warning' : 'bg-bg text-muted border border-border'}`}>
                        {prod.stock}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggleActive(prod)}
                        title={prod.active === false ? 'Activar producto' : 'Desactivar producto'}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          prod.active !== false ? 'bg-brand' : 'bg-mipos-border'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          prod.active !== false ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEditClick(prod)} className="p-2 text-muted hover:text-text hover:bg-bg rounded-lg transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => confirmDelete(prod)} className="p-2 text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPagesInventory}
          totalItems={sortedProducts.length}
          pageSize={PAGE_SIZE_INVENTORY}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* ── CSV IMPORT MODAL ── */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-bg border border-border rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-text">Importar Productos desde CSV</h3>
                <p className="text-sm md:text-[15px] text-muted mt-1">Sube un archivo CSV para importar productos masivamente. Puedes actualizar productos existentes o crear nuevos.</p>
              </div>
              <button 
                onClick={() => { setShowImportModal(false); setSelectedFile(null); }}
                className="text-muted hover:text-text p-1 rounded-lg hover:bg-bg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleImportCSV} className="p-5 space-y-5">
              {/* Template download card */}
              <div className="bg-surface-2 border border-border p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-sm md:text-[15px] font-bold text-text">¿Necesitas una plantilla?</h4>
                  <p className="text-sm md:text-[15px] text-muted mt-0.5">Descarga un archivo CSV de ejemplo con el formato correcto</p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="bg-surface hover:bg-bg border border-border text-text text-sm md:text-[15px] font-bold py-2 px-4 rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Download size={14} />
                  Descargar Plantilla
                </button>
              </div>

              {/* File Input */}
              <div>
                <label className="block text-sm md:text-[15px] font-bold text-text mb-2">Archivo CSV</label>
                <div className="bg-surface-2 border border-border rounded-xl p-4 flex flex-col items-center justify-center border-dashed hover:border-brand/30 transition-colors relative">
                  <input
                    type="file"
                    accept=".csv"
                    required
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="text-dim mb-2" size={24} />
                  <span className="text-sm md:text-[15px] text-text font-medium">
                    {selectedFile ? selectedFile.name : 'Haz clic o arrastra tu archivo aquí'}
                  </span>
                  <span className="text-sm md:text-[15px] text-muted mt-1">Solo archivos .csv</span>
                </div>
              </div>

              {/* Expected Format Alert */}
              <div className="bg-surface-2 border border-border p-4 rounded-xl text-sm text-muted space-y-1.5">
                <strong className="text-text block mb-1">Columnas esperadas:</strong>
                <p><span className="text-text font-semibold">Código, Nombre</span> (requerido)<span className="text-text font-semibold">, Precio, Costo, IVA, Stock, Imagen, Categoría, Unidad, Proveedor, Activo</span></p>
                <p className="text-xs">Si un producto ya existe (mismo código o nombre), se actualiza. De lo contrario, se crea. Descarga la plantilla para ver el formato exacto.</p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => { setShowImportModal(false); setSelectedFile(null); }}
                  className="bg-transparent hover:bg-bg border border-border text-text text-sm md:text-[15px] font-bold py-2.5 px-5 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={importing || !selectedFile}
                  className="bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed text-text text-sm md:text-[15px] font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 transition-all shadow-[0_4px_15px_rgba(82,82,255,0.15)]"
                >
                  {importing ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                  Importar Productos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT PRODUCT MODAL ── */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-bg border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-surface">
              <h3 className="text-lg font-bold text-text">Editar Producto</h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-muted hover:text-text p-1 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              <div className="flex gap-4">
                <div className="w-16 shrink-0 flex flex-col gap-2">
                  <label className="block text-sm md:text-[15px] font-bold text-muted mb-0 text-center" title="Pega un Emoji o una URL de imagen">Imagen</label>
                  <div className="relative group w-16 h-16 bg-surface-2 border border-dashed border-border hover:border-brand/50 rounded-lg flex items-center justify-center overflow-hidden cursor-pointer transition-colors">
                    {isUploading ? (
                      <Loader2 size={20} className="text-brand animate-spin" />
                    ) : editingProduct.icon?.startsWith('http') ? (
                      <>
                        <img src={editingProduct.icon} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                           <Upload size={16} className="text-text" />
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center mt-1">
                        <span className="text-2xl mb-1 leading-none">{editingProduct.icon || '📦'}</span>
                        <span className="text-sm md:text-[15px] md:text-sm md:text-[15px] md:text-base text-muted uppercase font-bold tracking-wider opacity-0 group-hover:opacity-100 absolute bottom-1">Subir</span>
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
                    value={editingProduct.icon?.startsWith('http') ? '' : (editingProduct.icon || '')}
                    onChange={(e) => setEditingProduct({...editingProduct, icon: e.target.value})}
                    placeholder="o Emoji"
                    maxLength={2}
                    className="w-16 bg-surface-2 border border-border rounded-lg py-1 px-1 text-center text-sm md:text-[15px] text-text focus:outline-none focus:border-brand"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm md:text-[15px] font-bold text-muted mb-1">Nombre</label>
                  <input
                    type="text"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                    required
                    className="w-full bg-surface-2 border border-border rounded-lg p-2.5 text-sm md:text-[15px] text-text focus:outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm md:text-[15px] font-bold text-muted mb-1">Precio ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})}
                    required
                    className="w-full bg-surface-2 border border-border rounded-lg p-2.5 text-sm md:text-[15px] text-text focus:outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-sm md:text-[15px] font-bold text-muted mb-1">Stock Actual</label>
                  <input
                    type="number"
                    min="0"
                    value={editingProduct.stock}
                    onChange={(e) => setEditingProduct({...editingProduct, stock: e.target.value})}
                    required
                    className="w-full bg-surface-2 border border-border rounded-lg p-2.5 text-sm md:text-[15px] text-text focus:outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm md:text-[15px] font-bold text-muted mb-1">Proveedor</label>
                <select
                  value={editingProduct.provider_id || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, provider_id: e.target.value})}
                  className="w-full bg-surface-2 border border-border rounded-lg p-2.5 text-sm md:text-[15px] text-text focus:outline-none focus:border-brand appearance-none"
                >
                  <option value="">-- Sin proveedor --</option>
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="bg-transparent hover:bg-bg border border-transparent hover:border-border text-text text-sm md:text-[15px] py-2 px-4 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-brand hover:bg-brand-hover disabled:opacity-50 text-text font-bold py-2 px-6 rounded-lg flex items-center gap-2 transition-all shadow-[0_4px_15px_rgba(82,82,255,0.15)]"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Edit2 size={16} />}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* ── BULK DELETE MODAL ── */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-bg border border-border rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-surface">
              <h3 className="text-lg font-bold text-text">Eliminar productos</h3>
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="text-muted hover:text-text p-1 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm md:text-[15px] text-muted">
                ¿Estás seguro que deseas eliminar <strong className="text-text">{selectedIds.size} producto{selectedIds.size !== 1 ? 's' : ''}</strong>? Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulkDeleteModal(false)}
                  className="bg-transparent hover:bg-bg border border-border text-text text-sm font-bold py-2.5 px-5 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-red-500/20"
                >
                  {isBulkDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                  Eliminar {selectedIds.size}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE MODAL ── */}
      {showDeleteModal && productToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-bg border border-border rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-surface">
              <h3 className="text-lg font-bold text-text">Eliminar Producto</h3>
              <button 
                onClick={() => { setShowDeleteModal(false); setProductToDelete(null); }}
                className="text-muted hover:text-text p-1 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm md:text-[15px] text-muted">
                ¿Estás seguro que deseas eliminar el producto <strong className="text-text">"{productToDelete.name}"</strong>? Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowDeleteModal(false); setProductToDelete(null); }}
                  className="bg-transparent hover:bg-bg border border-border text-text text-sm md:text-[15px] font-bold py-2.5 px-5 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteProduct}
                  disabled={isDeleting}
                  className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm md:text-[15px] font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-red-500/20"
                >
                  {isDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

