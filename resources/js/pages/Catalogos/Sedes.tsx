import { useState } from 'react';
import { Head } from '@inertiajs/react';
import MainLayout from '@/Layout/MainLayout';
import DataTable from '@/components/DataTable';
import apiClient from '@/api/client';

interface Sede {
  ID_Sede: number;
  Nombre_Sede: string;
  Ciudad_Sede: string;
  Direccion_Sede: string | null;
  Conmutador_Sede: string | null;
  Campus_Sede: string | null;
  Url_Sede: string | null;
}

interface Props {
  sedes: {
    data: Sede[];
    meta: {
      current_page: number;
      total: number;
      per_page: number;
      last_page: number;
    };
  };
}

export default function Sedes({ sedes }: Props) {
  const [data, setData] = useState<Sede[]>(sedes.data);
  const [meta, setMeta] = useState(sedes.meta);
  const [loading, setLoading] = useState(false);

  const columns = [
    { key: 'ID_Sede', label: 'ID', sortable: true },
    { key: 'Nombre_Sede', label: 'Nombre', sortable: true },
    { key: 'Ciudad_Sede', label: 'Ciudad', sortable: true },
    { key: 'Direccion_Sede', label: 'Dirección' },
    { key: 'Conmutador_Sede', label: 'Conmutador' },
    { 
      key: 'Campus_Sede', 
      label: 'Campus',
      render: (value: string | null) => value || '-'
    },
  ];

  const handleSearch = async (search: string, page: number = 1) => {
    setLoading(true);
    try {
      const result = await apiClient.get<{ data: Sede[]; meta: any }>('/sedes', { search, page });
      setData(result.data);
      setMeta(result.meta);
    } catch (error) {
      console.error('Error fetching sedes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await handleSearch('', 1);
  };

  const handleToggle = async (id: number) => {
    try {
      await apiClient.patch(`/sedes/${id}/toggle`);
      handleRefresh();
    } catch (error) {
      console.error('Error toggling sede:', error);
    }
  };

  const actions = (row: Sede) => (
    <div className="action-buttons">
      <button 
        className="btn-edit" 
        onClick={() => window.location.href = `/sedes/${row.ID_Sede}/edit`}
        title="Editar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <button 
        className="btn-delete" 
        onClick={() => handleToggle(row.ID_Sede)}
        title={row.Campus_Sede ? 'Desactivar' : 'Activar'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {row.Campus_Sede ? (
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
      <Head title="Sedes - Mallas UNAL" />
      
      <div className="page-header">
        <div className="page-title">
          <h1>Gestión de Sedes</h1>
          <p className="page-subtitle">Administra las sedes de la Universidad Nacional de Colombia</p>
        </div>
        <div className="page-actions">
          <button className="btn-primary" onClick={() => window.location.href = '/sedes/create'}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nueva Sede
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        meta={meta}
        loading={loading}
        searchPlaceholder="Buscar por nombre o ciudad..."
        onSearch={handleSearch}
        onRefresh={handleRefresh}
        actions={actions}
        emptyMessage="No hay sedes registradas"
      />
    </MainLayout>
  );
}
