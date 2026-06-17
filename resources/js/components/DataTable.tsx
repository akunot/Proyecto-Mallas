import { useState, useEffect, useCallback, useRef } from 'react';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

interface PaginationMeta {
  current_page: number;
  total: number;
  per_page: number;
  last_page: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  meta?: PaginationMeta;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  loading?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearch?: (search: string, page?: number) => void;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  onRefresh?: () => void;
  actions?: (row: any) => React.ReactNode;
  emptyMessage?: string;
}

export default function DataTable({
  columns, data, meta, sortBy, sortOrder, loading = false,
  searchPlaceholder = 'Buscar en la tabla...',
  searchValue = '', onSearch, onSort, onRefresh, actions,
  emptyMessage = 'No se encontraron registros coincidentes',
}: DataTableProps) {
  const [search, setSearch] = useState(searchValue);
  const isInitialMount = useRef(true);

  // Sincronizar búsqueda externa
  useEffect(() => {
    setSearch(searchValue);
  }, [searchValue]);

  // Debounce mejorado
  useEffect(() => {
    if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
    }
    const timer = setTimeout(() => {
      if (onSearch) onSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, onSearch]);

  const toggleSort = (key: string) => {
    if (!onSort) return;
    const direction = (sortBy === key && sortOrder === 'asc') ? 'desc' : 'asc';
    onSort(key, direction);
  };

  return (
    <div className="table-container-modern">
      {/* TOOLBAR */}
      <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white border-b border-slate-100">
        <div className="search-input-wrapper">
          <span className="material-symbols-outlined search-icon-inside">search</span>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="clear-search-btn">
              <span className="material-symbols-outlined !text-sm">close</span>
            </button>
          )}
          
          {onRefresh && (
            <button 
              onClick={onRefresh} 
              className={`ml-2 p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 active:scale-95 transition-all ${loading && 'animate-spin'}`}
              title="Actualizar datos"
            >
              <span className="material-symbols-outlined !text-xl">refresh</span>
            </button>
          )}
        </div>

        {/* Action summary (Opcional) */}
        {meta && (
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                Total: <span className="text-slate-900">{meta.total}</span> registros
            </div>
        )}
      </div>

      {/* TABLE WRAPPER */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && toggleSort(col.key)}
                  className={`table-header-cell ${col.sortable ? 'sortable' : ''}`}
                  role={col.sortable ? 'button' : undefined}
                  aria-sort={sortBy === col.key ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  <div className="flex items-center gap-2">
                    {col.label}
                    {col.sortable && (
                      <div className="flex flex-col text-slate-300">
                        <span className={`material-symbols-outlined !text-[14px] leading-[8px] ${sortBy === col.key && sortOrder === 'asc' ? 'text-blue-600' : ''}`}>arrow_drop_up</span>
                        <span className={`material-symbols-outlined !text-[14px] leading-[8px] ${sortBy === col.key && sortOrder === 'desc' ? 'text-blue-600' : ''}`}>arrow_drop_down</span>
                      </div>
                    )}
                  </div>
                </th>
              ))}
              {actions && <th className="table-header-cell text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Skeleton Loading State (Simplified)
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={columns.length + (actions ? 1 : 0)} className="px-6 py-4">
                    <div className="h-4 bg-slate-100 rounded-md w-full"></div>
                  </td>
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="py-20 text-center">
                  <div className="flex flex-col items-center opacity-40">
                    <span className="material-symbols-outlined !text-5xl mb-2">inventory_2</span>
                    <p className="text-sm font-medium">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr key={row.id || i} className="table-row group">
                  {columns.map((col) => (
                    <td key={col.key} className="table-cell">
                      {col.render ? col.render(row[col.key], row) : (row[col.key] || '—')}
                    </td>
                  ))}
                   {actions && (
                    <td className="table-cell text-right">
                      <div className="flex justify-end">
                        {actions(row)}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {meta && meta.last_page > 1 && (
        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Página <span className="text-slate-900">{meta.current_page}</span> de {meta.last_page}
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => onSearch?.(search, meta.current_page - 1)}
              disabled={meta.current_page === 1}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-all"
            >
              <span className="material-symbols-outlined !text-xl">chevron_left</span>
            </button>
            
            {/* Simple range logic */}
            {[...Array(meta.last_page)].map((_, i) => {
                const p = i + 1;
                // Mostrar solo páginas cercanas a la actual para no romper el layout
                if (p === 1 || p === meta.last_page || (p >= meta.current_page - 1 && p <= meta.current_page + 1)) {
                    return (
                        <button
                            key={p}
                            onClick={() => onSearch?.(search, p)}
                            className={`w-9 h-9 rounded-lg text-xs font-black transition-all ${meta.current_page === p ? 'bg-[#00236f] text-white shadow-md' : 'text-slate-400 hover:bg-white'}`}
                        >
                            {p}
                        </button>
                    );
                }
                if (p === meta.current_page - 2 || p === meta.current_page + 2) {
                    return <span key={p} className="text-slate-300 text-xs">...</span>;
                }
                return null;
            })}

            <button
              onClick={() => onSearch?.(search, meta.current_page + 1)}
              disabled={meta.current_page === meta.last_page}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-all"
            >
              <span className="material-symbols-outlined !text-xl">chevron_right</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}