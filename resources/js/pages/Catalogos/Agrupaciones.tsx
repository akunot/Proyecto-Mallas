import { Head, router, usePage } from '@inertiajs/react';
import MainLayout from '@/Layout/MainLayout';
import DataTable from '@/components/DataTable';

interface PlantillaAgrupacion {
    ID_Plantilla_Agrupacion: number;
    ID_Programa: number;
    ID_Componente: number;
    Nombre_Agrupacion: string;
    Tipo_Agrupacion: string;
    Creditos_Requeridos: number | null;
    Creditos_Maximos: number | null;
    Es_Obligatoria: boolean;
    programa?: {
        ID_Programa: number;
        Nombre_Programa: string;
    };
    componente?: {
        ID_Componente: number;
        Nombre_Componente: string;
    };
}

interface Props {
    agrupaciones: {
        data: PlantillaAgrupacion[];
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

export default function Agrupaciones({ agrupaciones }: Props) {
    const { url } = usePage();
    const currentSearch = new URLSearchParams(url.split('?')[1] || '').get('search') || '';

    const sortBy = agrupaciones.meta.sort_by || 'ID_Plantilla_Agrupacion';
    const sortOrder = agrupaciones.meta.sort_order || 'asc';

    const columns = [
        { key: 'ID_Plantilla_Agrupacion', label: 'ID', sortable: true },
        { key: 'Nombre_Agrupacion', label: 'Nombre', sortable: true },
        { key: 'Tipo_Agrupacion', label: 'Tipo', sortable: true },
        {
            key: 'programa.Nombre_Programa',
            label: 'Programa',
            render: (value: string, record: PlantillaAgrupacion) => 
                record.programa?.Nombre_Programa || '-',
        },
        {
            key: 'componente.Nombre_Componente',
            label: 'Componente',
            render: (value: string, record: PlantillaAgrupacion) => 
                record.componente?.Nombre_Componente || '-',
        },
        {
            key: 'Creditos_Requeridos',
            label: 'Créditos Req.',
            render: (value: number | null) => value || '-',
        },
        {
            key: 'Creditos_Maximos',
            label: 'Créditos Máx.',
            render: (value: number | null) => value || '-',
        },
        {
            key: 'Es_Obligatoria',
            label: 'Obligatoria',
            render: (value: boolean) => (
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    value 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                }`}>
                    {value ? 'Sí' : 'No'}
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

        router.visit(`/agrupaciones?${params.toString()}`, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSort = (column: string) => {
        const newOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
        
        const params = new URLSearchParams();
        if (currentSearch) params.set('search', currentSearch);
        params.set('sort_by', column);
        params.set('sort_order', newOrder);

        router.visit(`/agrupaciones?${params.toString()}`, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleEdit = (record: PlantillaAgrupacion) => {
        router.visit(`/agrupaciones/${record.ID_Plantilla_Agrupacion}/edit`);
    };

    const handleDelete = (record: PlantillaAgrupacion) => {
        if (confirm(`¿Está seguro de eliminar la agrupación "${record.Nombre_Agrupacion}"?`)) {
            router.delete(`/agrupaciones/${record.ID_Plantilla_Agrupacion}`, {
                onSuccess: () => {
                    // La recarga se maneja automáticamente
                },
                onError: (errors) => {
                    alert('Error al eliminar la agrupación: ' + Object.values(errors).flat().join(', '));
                },
            });
        }
    };

    return (
        <>
            <Head title="Agrupaciones" />
            
            <MainLayout>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">
                            Agrupaciones
                        </h1>
                        <p className="mt-2 text-gray-600">
                            Gestión de plantillas de agrupaciones curriculares
                        </p>
                    </div>

                    {/* Create Button */}
                    <div className="mb-4 flex justify-end">
                        <button
                            onClick={() => router.visit('/agrupaciones/create')}
                            className="btn-create"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Nueva Agrupación
                        </button>
                    </div>

                    {/* DataTable */}
                    <DataTable
                        data={agrupaciones.data}
                        columns={columns}
                        meta={agrupaciones.meta}
                        sortBy={sortBy}
                        sortOrder={sortOrder}
                        loading={false}
                        searchPlaceholder="Buscar agrupación..."
                        searchValue={currentSearch}
                        onSearch={handleSearch}
                        onSort={handleSort}
                        actions={(record: PlantillaAgrupacion) => (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleEdit(record)}
                                    className="btn-edit"
                                    title="Editar"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                    </svg>
                                </button>
                                <button
                                    onClick={() => handleDelete(record)}
                                    className="btn-delete"
                                    title="Eliminar"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3,6 5,6 21,6"/>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                    </svg>
                                </button>
                            </div>
                        )}
                    />
                </div>
            </MainLayout>
        </>
    );
}
