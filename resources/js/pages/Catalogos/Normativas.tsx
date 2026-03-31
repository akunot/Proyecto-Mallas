import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import MainLayout from '@/Layout/MainLayout';
import DataTable from '@/components/DataTable';

interface Normativa {
  ID_Normativa: number;
  ID_Programa: number;
  Tipo_Normativa: string;
  Numero_Normativa: string;
  Anio_Normativa: number;
  Instancia: string;
  Descripcion_Normativa: string | null;
  Url_Normativa: string | null;
  Esta_Activo: number;
  Nombre_Programa?: string;
}

interface Props {
  normativas: {
    data: Normativa[];
    meta: {
      current_page: number;
      total: number;
      per_page: number;
      last_page: number;
    };
  };
  programas: { ID_Programa: number; Nombre_Programa: string }[];
}

export default function Normativas({ normativas, programas }: Props) {
  const initialData = normativas?.data || [];
  const initialMeta = normativas?.meta || { current_page: 1, total: 0, per_page: 20, last_page: 1 };
  
  const [data, setData] = useState<Normativa[]>(initialData);
  const [meta, setMeta] = useState(initialMeta);
  const [loading, setLoading] = useState(false);

  const columns = [
    { key: 'ID_Normativa', label: 'ID', sortable: true },
    { key: 'Tipo_Normativa', label: 'Tipo', sortable: true },
    { key: 'Numero_Normativa', label: 'Número', sortable: true },
    { key: 'Anio_Normativa', label: 'Año', sortable: true },
    { key: 'Instancia', label: 'Instancia' },
    { 
      key: 'Esta_Activo', 
      label: 'Estado',
      render: (value: number) => (
        <span className={`badge ${value ? 'badge-success' : 'badge-danger'}`}>
          {value ? 'Activo' : 'Inactivo'}
        </span>
      )
    },
  ];

  // Los datos se cargan desde el servidor via Inertia props
  const handleSearch = async (search: string, page: number = 1) => {
    setLoading(true);
    try {
      if (!search) {
        setData(initialData);
        setMeta(initialMeta);
      } else {
        const filtered = initialData.filter(n => 
          n.Tipo_Normativa?.toLowerCase().includes(search.toLowerCase()) ||
          n.Numero_Normativa?.toLowerCase().includes(search.toLowerCase())
        );
        setData(filtered);
        setMeta({ ...meta, total: filtered.length });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setData(initialData);
    setMeta(initialMeta);
  };

  const handleToggle = async (id: number) => {
    router.patch(`/normativas/${id}/toggle`, {}, {
      onSuccess: () => handleRefresh(),
    });
  };

  const actions = (row: Normativa) => (
    <div className="action-buttons">
      <button
        className="btn-edit"
        onClick={() => router.visit(`/normativas/${row.ID_Normativa}/edit`)}
        title="Editar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <button 
        className="btn-delete" 
        onClick={() => handleToggle(row.ID_Normativa)}
        title={row.Esta_Activo ? 'Desactivar' : 'Activar'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {row.Esta_Activo ? (
            <>
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>
            </>
          ) : (
            <>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </>
          )}
        </svg>
      </button>
    </div>
  );

  return (
    <MainLayout>
      <Head title="Normativas - Mallas UNAL" />
      
      <div className="page-header">
        <div className="page-title">
          <h1>Gestión de Normativas</h1>
          <p className="page-subtitle">Administra las normativas de los programas</p>
        </div>
        <div className="page-actions">
          <button className="btn-primary" onClick={() => router.visit('/normativas/create')}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nueva Normativa
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        meta={meta}
        loading={loading}
        searchPlaceholder="Buscar por número o instancia..."
        onSearch={handleSearch}
        onRefresh={handleRefresh}
        actions={actions}
        emptyMessage="No hay normativas registradas"
      />
    </MainLayout>
  );
}
