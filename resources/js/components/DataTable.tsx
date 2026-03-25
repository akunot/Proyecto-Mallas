import { useState, useEffect, useCallback } from 'react';

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
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  meta?: PaginationMeta;
  loading?: boolean;
  searchPlaceholder?: string;
  onSearch?: (search: string, page?: number) => void;
  onRefresh?: () => void;
  actions?: (row: any) => React.ReactNode;
  emptyMessage?: string;
}

export default function DataTable({
  columns,
  data,
  meta,
  loading = false,
  searchPlaceholder = 'Buscar...',
  onSearch,
  onRefresh,
  actions,
  emptyMessage = 'No hay datos disponibles',
}: DataTableProps) {
  const [search, setSearch] = useState('');

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (onSearch) {
        onSearch(search);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [search, onSearch]);

  const handlePageChange = (page: number) => {
    if (onSearch) {
      onSearch(search, page);
    }
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <div className="data-table-container">
      {/* Barra de búsqueda y acciones */}
      <div className="data-table-toolbar">
        <div className="search-box">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="search-input"
          />
          {onRefresh && (
            <button onClick={handleRefresh} className="btn-refresh" title="Actualizar">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
                <path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={column.sortable ? 'sortable' : ''}>
                  {column.label}
                </th>
              ))}
              {actions && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="loading-cell">
                  <div className="loading-spinner">
                    <div className="spinner"></div>
                    <span>Cargando...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="empty-cell">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr key={row.id || index}>
                  {columns.map((column) => (
                    <td key={column.key}>
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                  {actions && <td className="actions-cell">{actions(row)}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {meta && meta.last_page > 1 && (
        <div className="pagination">
          <div className="pagination-info">
            Mostrando {(meta.current_page - 1) * meta.per_page + 1} - {Math.min(meta.current_page * meta.per_page, meta.total)} de {meta.total} registros
          </div>
          <div className="pagination-controls">
            <button
              onClick={() => handlePageChange(meta.current_page - 1)}
              disabled={meta.current_page === 1}
              className="pagination-btn"
            >
              Anterior
            </button>
            <span className="pagination-current">
              Página {meta.current_page} de {meta.last_page}
            </span>
            <button
              onClick={() => handlePageChange(meta.current_page + 1)}
              disabled={meta.current_page === meta.last_page}
              className="pagination-btn"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
