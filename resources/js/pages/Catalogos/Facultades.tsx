import { useState } from 'react';
import { Head } from '@inertiajs/react';
import MainLayout from '@/Layout/MainLayout';
import DataTable from '@/components/DataTable';

interface Facultad {
  ID_Facultad: number;
  ID_Sede: number;
  Nombre_Facultad: string;
  Conmutador_Facultad: string | null;
  Extension_Facultad: string | null;
  Campus_Facultad: string | null;
  Url_Facultad: string | null;
  Nombre_Sede?: string;
}

interface Props {
  facultades: {
    data: Facultad[];
    meta: {
      current_page: number;
      total: number;
      per_page: number;
      last_page: number;
    };
  };
  sedes: { ID_Sede: number; Nombre_Sede: string }[];
}

export default function Facultades({ facultades, sedes }: Props) {
  const [data, setData] = useState<Facultad[]>(facultades.data);
  const [meta, setMeta] = useState(facultades.meta);
  const [loading, setLoading] = useState(false);

  const columns = [
    { key: 'ID_Facultad', label: 'ID', sortable: true },
    { key: 'Nombre_Facultad', label: 'Nombre', sortable: true },
    { 
      key: 'Nombre_Sede', 
      label: 'Sede',
      render: (value: string | null) => value || '-'
    },
    { key: 'Campus_Facultad', label: 'Campus' },
    { key: 'Conmutador_Facultad', label: 'Conmutador' },
    { key: 'Extension_Facultad', label: 'Extensión' },
  ];

  const handleSearch = async (search: string, page: number = 1) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/facultades?search=${search}&page=${page}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();
      setData(result.data);
      setMeta(result.meta);
    } catch (error) {
      console.error('Error fetching facultades:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await handleSearch('', 1);
  };

  const handleToggle = async (id: number) => {
    try {
      const response = await fetch(`/api/v1/facultades/${id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        handleRefresh();
      }
    } catch (error) {
      console.error('Error toggling facultad:', error);
    }
  };

  const actions = (row: Facultad) => (
    <div className="action-buttons">
      <button 
        className="btn-edit" 
        onClick={() => window.location.href = `/facultades/${row.ID_Facultad}/edit`}
        title="Editar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <button 
        className="btn-delete" 
        onClick={() => handleToggle(row.ID_Facultad)}
        title={row.Campus_Facultad ? 'Desactivar' : 'Activar'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {row.Campus_Facultad ? (
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
      <Head title="Facultades - Mallas UNAL" />
      
      <div className="page-header">
        <div className="page-title">
          <h1>Gestión de Facultades</h1>
          <p className="page-subtitle">Administra las facultades de la Universidad Nacional de Colombia</p>
        </div>
        <div className="page-actions">
          <button className="btn-primary" onClick={() => window.location.href = '/facultades/create'}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nueva Facultad
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        meta={meta}
        loading={loading}
        searchPlaceholder="Buscar por nombre..."
        onSearch={handleSearch}
        onRefresh={handleRefresh}
        actions={actions}
        emptyMessage="No hay facultades registradas"
      />
    </MainLayout>
  );
}
