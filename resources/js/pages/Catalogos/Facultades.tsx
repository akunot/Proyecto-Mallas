import { Head, router, usePage } from '@inertiajs/react';
import MainLayout from '@/Layout/MainLayout';
import DataTable from '@/components/DataTable';

interface Facultad {
    ID_Facultad: number;
    ID_Sede: number;
    Codigo_Facultad: string | null;
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
            sort_by?: string;
            sort_order?: 'asc' | 'desc';
        };
    };
    sedes: { ID_Sede: number; Nombre_Sede: string }[];
}

export default function Facultades({ facultades, sedes }: Props) {
    const { url } = usePage();
    const currentSearch = new URLSearchParams(url.split('?')[1] || '').get('search') || '';

    const sortBy = facultades.meta.sort_by || 'ID_Facultad';
    const sortOrder = facultades.meta.sort_order || 'asc';

    const columns = [
        { key: 'Codigo_Facultad', label: 'Código', sortable: true },
        { key: 'ID_Facultad', label: 'ID', sortable: true },
        { key: 'Nombre_Facultad', label: 'Nombre', sortable: true },
        {
            key: 'Nombre_Sede',
            label: 'Sede',
            render: (value: string | null) => value || '-',
        },
        { key: 'Campus_Facultad', label: 'Campus' },
        { key: 'Conmutador_Facultad', label: 'Conmutador' },
        { key: 'Extension_Facultad', label: 'Extensión' },
    ];

    const handleSearch = (search: string, page: number = 1) => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (page > 1) params.set('page', page.toString());
        params.set('sort_by', sortBy);
        params.set('sort_order', sortOrder);

        router.visit(`/facultades?${params.toString()}`, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleRefresh = () => {
        router.visit('/facultades', {
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

        router.visit(`/facultades?${params.toString()}`, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Está seguro de eliminar esta facultad?')) return;

        await fetch(`/facultades/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            credentials: 'same-origin',
        }).then(() => handleRefresh());
    };

    const actions = (row: Facultad) => (
        <div className="action-buttons">
            <button
                className="btn-edit"
                onClick={() =>
                    router.visit(`/facultades/${row.ID_Facultad}/edit`)
                }
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
                onClick={() => handleDelete(row.ID_Facultad)}
                title="Eliminar"
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
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
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
                    <p className="page-subtitle">
                        Administra las facultades de la Universidad Nacional de
                        Colombia
                    </p>
                </div>
                <div className="page-actions">
                    <button
                        className="btn-primary"
                        onClick={() => router.visit('/facultades/create')}
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
                        Nueva Facultad
                    </button>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={facultades.data}
                meta={facultades.meta}
                sortBy={sortBy}
                sortOrder={sortOrder}
                searchValue={currentSearch}
                onSort={handleSort}
                searchPlaceholder="Buscar por nombre..."
                onSearch={handleSearch}
                onRefresh={handleRefresh}
                actions={actions}
                emptyMessage="No hay facultades registradas"
            />
        </MainLayout>
    );
}
