import { Head, router, usePage } from '@inertiajs/react';
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
            sort_by?: string;
            sort_order?: 'asc' | 'desc';
        };
    };
}

export default function Usuarios({ usuarios }: Props) {
    const { url } = usePage();
    const currentSearch = new URLSearchParams(url.split('?')[1] || '').get('search') || '';

    const sortBy = usuarios.meta.sort_by || 'ID_Usuario';
    const sortOrder = usuarios.meta.sort_order || 'asc';

    const columns = [
        { key: 'ID_Usuario', label: 'ID', sortable: true },
        { key: 'Nombre_Usuario', label: 'Nombre', sortable: true },
        { key: 'Email_Usuario', label: 'Correo', sortable: true },
        {
            key: 'Activo_Usuario',
            label: 'Estado',
            render: (value: number) => (
                <span
                    className={`badge ${value ? 'badge-success' : 'badge-danger'}`}
                >
                    {value ? 'Activo' : 'Inactivo'}
                </span>
            ),
        },
        {
            key: 'Creacion_Usuario',
            label: 'Creado',
            render: (value: string) =>
                value ? new Date(value).toLocaleDateString('es-CO') : '-',
        },
    ];

    const handleSearch = (search: string, page: number = 1) => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (page > 1) params.set('page', page.toString());
        params.set('sort_by', sortBy);
        params.set('sort_order', sortOrder);

        router.visit(`/usuarios?${params.toString()}`, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleRefresh = () => {
        router.visit('/usuarios', {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSort = (column: string) => {
        const newDirection = (column === sortBy && sortOrder === 'asc') ? 'desc' : 'asc';

        const params = new URLSearchParams();
        if (currentSearch) params.set('search', currentSearch);
        params.set('sort_by', column);
        params.set('sort_order', newDirection);
        params.set('page', '1');

        router.visit(`/usuarios?${params.toString()}`, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleToggle = async (id: number) => {
        await router.patch(`/usuarios/${id}/toggle`, {}, {
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
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
            </button>
            <button
                className="btn-delete"
                onClick={() => handleToggle(row.ID_Usuario)}
                title={row.Activo_Usuario ? 'Desactivar' : 'Activar'}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    {row.Activo_Usuario ? (
                        <>
                            <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                            <line x1="12" y1="2" x2="12" y2="12" />
                        </>
                    ) : (
                        <>
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
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
                    <p className="page-subtitle">
                        Administra los usuarios del sistema
                    </p>
                </div>
                <div className="page-actions">
                    <button
                        className="btn-primary"
                        onClick={() => router.visit('/usuarios/create')}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Nuevo Usuario
                    </button>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={usuarios.data}
                meta={usuarios.meta}
                sortBy={sortBy}
                sortOrder={sortOrder}
                searchValue={currentSearch}
                onSort={handleSort}
                searchPlaceholder="Buscar por nombre o correo..."
                onSearch={handleSearch}
                onRefresh={handleRefresh}
                actions={actions}
                emptyMessage="No hay usuarios registrados"
            />
        </MainLayout>
    );
}
