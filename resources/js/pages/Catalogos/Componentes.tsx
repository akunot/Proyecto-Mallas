import { Head, router, usePage } from '@inertiajs/react';
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
            sort_by?: string;
            sort_order?: 'asc' | 'desc';
        };
    };
}

export default function Componentes({ componentes }: Props) {
    const { url } = usePage();
    const currentSearch = new URLSearchParams(url.split('?')[1] || '').get('search') || '';

    const sortBy = componentes.meta.sort_by || 'ID_Componente';
    const sortOrder = componentes.meta.sort_order || 'asc';

    const columns = [
        { key: 'ID_Componente', label: 'ID', sortable: true },
        { key: 'Nombre_Componente', label: 'Nombre', sortable: true },
        {
            key: 'Descripcion_Componente',
            label: 'Descripción',
            render: (value: string | null) => value || '-',
        },
    ];

    const handleSearch = (search: string, page: number = 1) => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (page > 1) params.set('page', page.toString());
        params.set('sort_by', sortBy);
        params.set('sort_order', sortOrder);

        router.visit(`/componentes?${params.toString()}`, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleRefresh = () => {
        router.visit('/componentes', {
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

        router.visit(`/componentes?${params.toString()}`, {
            preserveState: true,
            preserveScroll: true,
        });
    };

const actions = (row: Componente) => (
        <div className="action-buttons">
            <button
                className="btn-edit"
                onClick={() =>
                    router.visit(`/componentes/${row.ID_Componente}/edit`)
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
        </div>
    );

    return (
        <MainLayout>
            <Head title="Componentes - Mallas UNAL" />

            <div className="page-header">
                <div className="page-title">
                    <h1>Gestión de Componentes</h1>
                    <p className="page-subtitle">
                        Administra los componentes curriculares
                    </p>
                </div>
                <div className="page-actions">
                    <button
                        className="btn-primary"
                        onClick={() => router.visit('/componentes/create')}
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
                        Nuevo Componente
                    </button>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={componentes.data}
                meta={componentes.meta}
                sortBy={sortBy}
                sortOrder={sortOrder}
                searchValue={currentSearch}
                onSort={handleSort}
                searchPlaceholder="Buscar por nombre..."
                onSearch={handleSearch}
                onRefresh={handleRefresh}
                actions={actions}
                emptyMessage="No hay componentes registrados"
            />
        </MainLayout>
    );
}
