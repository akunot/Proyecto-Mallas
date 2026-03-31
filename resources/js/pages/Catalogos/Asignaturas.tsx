import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
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
  const initialData = asignaturas?.data || [];
  const initialMeta = asignaturas?.meta || { current_page: 1, total: 0, per_page: 20, last_page: 1 };
  
  const [data, setData] = useState<Asignatura[]>(initialData);
  const [meta, setMeta] = useState(initialMeta);
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

  // Los datos se cargan desde el servidor via Inertia props
  const handleSearch = async (search: string, page: number = 1) => {
    setLoading(true);
    try {
      if (!search) {
        setData(initialData);
        setMeta(initialMeta);
      } else {
        const filtered = initialData.filter(a => 
          a.Nombre_Asignatura.toLowerCase().includes(search.toLowerCase()) ||
          a.Codigo_Asignatura?.toLowerCase().includes(search.toLowerCase())
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

  const actions = (row: Asignatura) => (
    <div className="action-buttons">
      <button
        className="btn-edit"
        onClick={() => router.visit(`/asignaturas/${row.ID_Asignatura}/edit`)}
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
          <button className="btn-primary" onClick={() => router.visit('/asignaturas/create')}>
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
