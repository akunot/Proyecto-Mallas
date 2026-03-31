import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import MainLayout from '@/Layout/MainLayout';
import DataTable from '@/components/DataTable';

interface Usuario {
  ID_Usuario: number;
  Nombre_Usuario: string;
  Email_Usuario: string;
  Activo_Usuario: number;
  Creacion_Usuario: string;
}

interface Props {
  usuarios: {
    data: Usuario[];
    meta: {
      current_page: number;
      total: number;
      per_page: number;
      last_page: number;
    };
  };
}

export default function Usuarios({ usuarios }: Props) {
  const initialData = usuarios?.data || [];
  const initialMeta = usuarios?.meta || { current_page: 1, total: 0, per_page: 20, last_page: 1 };
  
  const [data, setData] = useState<Usuario[]>(initialData);
  const [meta, setMeta] = useState(initialMeta);
  const [loading, setLoading] = useState(false);

  const columns = [
    { key: 'ID_Usuario', label: 'ID', sortable: true },
    { key: 'Nombre_Usuario', label: 'Nombre', sortable: true },
    { key: 'Email_Usuario', label: 'Correo', sortable: true },
    { 
      key: 'Activo_Usuario', 
      label: 'Estado',
      render: (value: number) => (
        <span className={`badge ${value ? 'badge-success' : 'badge-danger'}`}>
          {value ? 'Activo' : 'Inactivo'}
        </span>
      )
    },
    { 
      key: 'Creacion_Usuario', 
      label: 'Creado',
      render: (value: string) => value ? new Date(value).toLocaleDateString('es-CO') : '-'
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
        const filtered = initialData.filter(u => 
          u.Nombre_Usuario.toLowerCase().includes(search.toLowerCase()) ||
          u.Email_Usuario?.toLowerCase().includes(search.toLowerCase())
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
    router.patch(`/usuarios/${id}/toggle`, {}, {
      onSuccess: () => handleRefresh(),
    });
  };

  const actions = (row: Usuario) => (
    <div className="action-buttons">
      <button
        className="btn-edit"
        onClick={() => router.visit(`/usuarios/${row.ID_Usuario}/edit`)}
        title="Editar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <button 
        className="btn-delete" 
        onClick={() => handleToggle(row.ID_Usuario)}
        title={row.Activo_Usuario ? 'Desactivar' : 'Activar'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {row.Activo_Usuario ? (
            <>
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
              <line x1="12" y1="2" x2="12" y2="12"/>
            </>
          ) : (
            <>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </>
          )}
        </svg>
      </button>
    </div>
  );

  return (
    <MainLayout>
      <Head title="Usuarios - Mallas UNAL" />
      
      <div className="page-header">
        <div className="page-title">
          <h1>Gestión de Usuarios</h1>
          <p className="page-subtitle">Administra los usuarios del sistema</p>
        </div>
        <div className="page-actions">
          <button className="btn-primary" onClick={() => router.visit('/usuarios/create')}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nuevo Usuario
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        meta={meta}
        loading={loading}
        searchPlaceholder="Buscar por nombre o correo..."
        onSearch={handleSearch}
        onRefresh={handleRefresh}
        actions={actions}
        emptyMessage="No hay usuarios registrados"
      />
    </MainLayout>
  );
}
