/**
 * Pagination — componente compartido para todas las listas.
 * Client-side sobre datos ya filtrados.
 */
export default function Pagination({ currentPage, totalPages, totalItems, pageSize, onPageChange }) {
  if (totalPages <= 1) return null;

  const from = (currentPage - 1) * pageSize + 1;
  const to   = Math.min(currentPage * pageSize, totalItems);

  const getPages = () => {
    const delta = 2;
    const range = [];
    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) range.push(i);

    const pages = [1];
    if (range[0] > 2)                             pages.push('…');
    pages.push(...range);
    if (range[range.length - 1] < totalPages - 1) pages.push('…');
    if (totalPages > 1)                           pages.push(totalPages);
    return pages;
  };

  const base   = 'min-w-[30px] h-7 px-1.5 text-sm md:text-[15px] font-semibold rounded-lg border transition-colors';
  const idle   = `${base} border-border text-muted hover:text-text hover:border-brand/50`;
  const active = `${base} bg-brand border-brand text-text`;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
      <p className="text-sm md:text-[15px] text-muted">
        {from}–{to} de <span className="font-semibold text-text">{totalItems}</span>
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}
          className={`${idle} disabled:opacity-30 disabled:cursor-not-allowed`}>←</button>

        {getPages().map((p, i) =>
          p === '…'
            ? <span key={`e${i}`} className="px-1 text-sm md:text-[15px] text-muted select-none">…</span>
            : <button key={p} onClick={() => onPageChange(p)}
                className={p === currentPage ? active : idle}>{p}</button>
        )}

        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}
          className={`${idle} disabled:opacity-30 disabled:cursor-not-allowed`}>→</button>
      </div>
    </div>
  );
}
