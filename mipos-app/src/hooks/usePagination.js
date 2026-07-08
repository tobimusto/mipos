import { useState, useCallback } from 'react';

/**
 * usePagination
 *
 * Encapsula el estado y los helpers de paginación.
 * Úsalo tanto para server-side (range/count de Supabase)
 * como para client-side (slice sobre array filtrado).
 *
 * @param {number} pageSize - Items por página (default 20)
 */
export function usePagination(pageSize = 20) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount]   = useState(0);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  /** Rango de filas para Supabase .range(from, to) */
  const getRange = useCallback((page = currentPage) => ({
    from: (page - 1) * pageSize,
    to:   page * pageSize - 1,
  }), [currentPage, pageSize]);

  /** Vuelve a página 1 — llamar cuando cambia el filtro */
  const reset = useCallback(() => setCurrentPage(1), []);

  return {
    currentPage,
    setCurrentPage,
    totalCount,
    setTotalCount,
    totalPages,
    pageSize,
    getRange,
    reset,
  };
}
