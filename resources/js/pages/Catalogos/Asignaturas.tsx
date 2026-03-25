import { useState } from 'react';
import { Head } from '@inertiajs/react';
import MainLayout from '@/Layout/MainLayout';
import DataTable from '@/components/DataTable';

interface Asignatura {
  ID_Asignatura: number;
  Codigo_Asignatura: string;
  Nombre_Asignatura: string;
  Creditos_Asignatura: number;
  Horas_Presencial: number | null;
  Horas_Estudiante: number | null;
  Descripcion_Asignatura: string | null;
}

interface Props {
  asignaturas: {
    data: Asignatura[];
    meta: {
      current_page: number;
      total: number;
      per_page: number;
      last_page: number;
    };
  };
}

export default function Asignaturas({ asignaturas }: Props) {
  const [data, setData] = useState<Asignatura[]>(asignaturas.data);
  const [meta, setMeta] = useState(asignaturas.meta);
  const [loading, setLoading] = useState(false);

  const columns = [
    { key: 'ID_Asignatura', label: 'ID', sortable: true },
    { key: 'Codigo_Asignatura', label: 'Código', sortable: true },
    { key: 'Nombre_Asignatura', label: 'Nombre', sortable: true },
    { key: 'Creditos_Asignatura', label: 'Créditos', sortable: true },
    { 
      key: 'Horas_Presencial', 
      label: 'Horas Presencial',
      render: (value: number | null) => value || '-'
    },
    { 
      key: 'Horas_Estudiante', 
      label: 'Horas Estudiante',
      render: (value: number | null) => value || '-'
    },
  ];

  const handleSearch = async (search: string, page: number = 1) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/asignaturas?search=${search}&page=${page}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();
      setData(result.data);
      setMeta(result.meta);
    } catch (error) {
      console.error('Error fetching asignaturas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await handleSearch('', 1);
  };

  const actions = (row: Asignatura) => (
    <div className="action-buttons">
      <button 
        className="btn-edit" 
        onClick={() => window.location.href = `/asignaturas/${row.ID_Asignatura}/edit`}
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
      <Head title="Asignaturas - Mallas UNAL" />
      
      <div className="page-header">
        <div className="page-title">
          <h1>Gestión de Asignaturas</h1>
          <p className="page-subtitle">Administra el catálogo de asignaturas</p>
        </div>
        <div className="page-actions">
          <button className="btn-primary" onClick={() => window.location.href = '/asignaturas/create'}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nueva Asignatura
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        meta={meta}
        loading={loading}
        searchPlaceholder="Buscar por código o nombre..."
        onSearch={handleSearch}
        onRefresh={handleRefresh}
        actions={actions}
        emptyMessage="No hay asignaturas registradas"
      />
    </MainLayout>
  );
}
