import { Head, router, usePage } from '@inertiajs/react';
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
            sort_by?: string;
            sort_order?: 'asc' | 'desc';
        };
    };
    programas: { ID_Programa: number; Nombre_Programa: string }[];
}

export default function Normativas({ normativas, programas }: Props) {
    const { url } = usePage();
    const currentSearch = new URLSearchParams(url.split('?')[1] || '').get('search') || '';

    const sortBy = normativas.meta.sort_by || 'ID_Normativa';
    const sortOrder = normativas.meta.sort_order || 'asc';

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
                <span
                    className={`badge ${value ? 'badge-success' : 'badge-danger'}`}
                >
                    {value ? 'Activo' : 'Inactivo'}
                </span>
            ),
        },
    ];

    const handleSearch = (search: string, page: number = 1) => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (page > 1) params.set('page', page.toString());
        params.set('sort_by', sortBy);
        params.set('sort_order', sortOrder);

        router.visit(`/normativas?${params.toString()}`, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleRefresh = () => {
        router.visit('/normativas', {
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

        router.visit(`/normativas?${params.toString()}`, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleToggle = async (id: number) => {
        await router.patch(`/normativas/${id}/toggle`, {}, {
            onSuccess: () => handleRefresh(),
        });
    };

    const actions = (row: Normativa) => (
        <div className="action-buttons">
            <button
                className="btn-edit"
                onClick={() =>
                    router.visit(`/normativas/${row.ID_Normativa}/edit`)
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
                onClick={() => handleToggle(row.ID_Normativa)}
                title={row.Esta_Activo ? 'Desactivar' : 'Activar'}
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
                    {row.Esta_Activo ? (
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
            <Head title="Normativas - Mallas UNAL" />

            <div className="page-header">
                <div className="page-title">
                    <h1>Gestión de Normativas</h1>
                    <p className="page-subtitle">
                        Administra las normativas de los programas
                    </p>
                </div>
                <div className="page-actions">
                    <button
                        className="btn-primary"
                        onClick={() => router.visit('/normativas/create')}
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
                        Nueva Normativa
                    </button>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={normativas.data}
                meta={normativas.meta}
                sortBy={sortBy}
                sortOrder={sortOrder}
                searchValue={currentSearch}
                onSort={handleSort}
                searchPlaceholder="Buscar por número o instancia..."
                onSearch={handleSearch}
                onRefresh={handleRefresh}
                actions={actions}
                emptyMessage="No hay normativas registradas"
            />
        </MainLayout>
    );
}
