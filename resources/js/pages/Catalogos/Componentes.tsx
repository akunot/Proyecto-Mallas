import { useState } from 'react';
import { Head } from '@inertiajs/react';
import MainLayout from '@/Layout/MainLayout';
import DataTable from '@/components/DataTable';

interface Componente {
  ID_Componente: number;
  Nombre_Componente: string;
  Descripcion_Componente: string | null;
}

interface Props {
  componentes: {
    data: Componente[];
    meta: {
      current_page: number;
      total: number;
      per_page: number;
      last_page: number;
    };
  };
}

export default function Componentes({ componentes }: Props) {
  const [data, setData] = useState<Componente[]>(componentes.data);
  const [meta, setMeta] = useState(componentes.meta);
  const [loading, setLoading] = useState(false);

  const columns = [
    { key: 'ID_Componente', label: 'ID', sortable: true },
    { key: 'Nombre_Componente', label: 'Nombre', sortable: true },
    { 
      key: 'Descripcion_Componente', 
      label: 'Descripción',
      render: (value: string | null) => value || '-'
    },
  ];

  const handleSearch = async (search: string, page: number = 1) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/componentes?search=${search}&page=${page}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();
      setData(result.data);
      setMeta(result.meta);
    } catch (error) {
      console.error('Error fetching componentes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await handleSearch('', 1);
  };

  const actions = (row: Componente) => (
    <div className="action-buttons">
      <button 
        className="btn-edit" 
        onClick={() => window.location.href = `/componentes/${row.ID_Componente}/edit`}
        title="Editar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
    </div>
  );

  return (
    <MainLayout>
      <Head title="Componentes - Mallas UNAL" />
      
      <div className="page-header">
        <div className="page-title">
          <h1>Gestión de Componentes</h1>
          <p className="page-subtitle">Administra los componentes curriculares</p>
        </div>
        <div className="page-actions">
          <button className="btn-primary" onClick={() => window.location.href = '/componentes/create'}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nuevo Componente
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
        emptyMessage="No hay componentes registrados"
      />
    </MainLayout>
  );
}
