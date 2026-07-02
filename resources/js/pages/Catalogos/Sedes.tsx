import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import DataTable from '@/components/DataTable';
import MainLayout from '@/Layout/MainLayout';

interface Sede {
    ID_Sede: number;
    Nombre_Sede: string;
    Ciudad_Sede: string;
    Direccion_Sede: string | null;
    Conmutador_Sede: string | null;
    Campus_Sede: string | null;
    Codigo_Sede?: string | null;
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
            sort_by?: string;
            sort_order?: 'asc' | 'desc';
        };
    };
}

export default function Sedes({ sedes }: Props) {
    const { url } = usePage();
    const currentParams = new URLSearchParams(url.split('?')[1] || '');
    const currentSearch = currentParams.get('search') || '';
    const sortBy = sedes.meta.sort_by || 'ID_Sede';
    const sortOrder = sedes.meta.sort_order || 'asc';

    const [deleteId, setDeleteId] = useState<number | null>(null);

    const columns = [
        {
            key: 'Nombre_Sede',
            label: 'Sede / Código',
            sortable: true,
            render: (value: string, row: Sede) => (
                <div className="flex flex-col">
                    <span className="leading-tight font-bold text-slate-800">
                        {value}
                    </span>
                    <span className="font-mono text-[10px] font-bold tracking-tighter text-blue-600 uppercase">
                        COD: {row.Codigo_Sede || 'N/A'} • ID: {row.ID_Sede}
                    </span>
                </div>
            ),
        },
        { key: 'Ciudad_Sede', label: 'Ciudad', sortable: true },
        {
            key: 'Campus_Sede',
            label: 'Campus',
            render: (value: string | null) => (
                <div className="flex items-center gap-1.5 text-slate-600">
                    <span className="material-symbols-outlined !text-sm opacity-50">
                        domain
                    </span>
                    <span className="text-sm">{value || 'No asignado'}</span>
                </div>
            ),
        },
        {
            key: 'Url_Sede',
            label: 'Sitio Web',
            render: (value: string | null) =>
                value ? (
                    <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                        <span className="material-symbols-outlined !text-sm">
                            open_in_new
                        </span>
                        Visitar
                    </a>
                ) : (
                    '—'
                ),
        },
    ];

    const handleDelete = (id: number) => {
        router.delete(`/sedes/${id}`, {
            preserveScroll: true,
            onSuccess: () => setDeleteId(null),
        });
    };

    const actions = (row: Sede) => (
        <div className="flex justify-end gap-1">
            <Link
                href={`/sedes/${row.ID_Sede}/edit`}
                className="rounded-lg p-2 text-slate-400 transition-all hover:bg-blue-50 hover:text-[#00236f]"
            >
                <span className="material-symbols-outlined !text-xl">
                    edit_note
                </span>
            </Link>
            <button
                onClick={() => setDeleteId(row.ID_Sede)}
                className="rounded-lg p-2 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600"
            >
                <span className="material-symbols-outlined !text-xl">
                    delete
                </span>
            </button>
        </div>
    );

    return (
        <MainLayout>
            <Head title="Sedes Institucionales - UNAL" />

            <div className="mx-auto max-w-[1400px] space-y-8 pb-10">
                <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
                    <div>
                        <div className="mb-1 flex items-center gap-2 text-xs font-bold tracking-widest text-slate-500 uppercase">
                            <span className="material-symbols-outlined !text-sm">
                                location_on
                            </span>
                            Infraestructura
                        </div>
                        <h1 className="text-4xl leading-none font-black tracking-tight text-slate-900">
                            Sedes UNAL
                        </h1>
                        <p className="mt-2 text-slate-500">
                            Gestión de campus y centros de operación a nivel
                            nacional.
                        </p>
                    </div>
                    <Link
                        href="/sedes/create"
                        className="flex items-center gap-2 rounded-xl bg-[#00236f] px-6 py-3 font-bold text-white shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-95"
                    >
                        <span className="material-symbols-outlined">
                            add_location_alt
                        </span>
                        Nueva Sede
                    </Link>
                </div>

                {/* Confirmación de eliminación */}
                {deleteId && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
                            <span className="material-symbols-outlined mb-3 !text-5xl text-red-500">
                                warning
                            </span>
                            <h3 className="text-lg font-bold text-slate-900">
                                ¿Eliminar sede #{deleteId}?
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                                Esta acción no se puede deshacer.
                            </p>
                            <div className="mt-6 flex justify-center gap-3">
                                <button
                                    onClick={() => setDeleteId(null)}
                                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => handleDelete(deleteId)}
                                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <DataTable
                    columns={columns}
                    data={sedes.data}
                    meta={sedes.meta}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    searchValue={currentSearch}
                    onSort={(col, dir) =>
                        router.get(
                            '/sedes',
                            {
                                search: currentSearch,
                                sort_by: col,
                                sort_order: dir,
                            },
                            { preserveState: true },
                        )
                    }
                    onSearch={(search, page) =>
                        router.get(
                            '/sedes',
                            {
                                search,
                                page,
                                sort_by: sortBy,
                                sort_order: sortOrder,
                            },
                            { preserveState: true },
                        )
                    }
                    onRefresh={() => router.visit('/sedes')}
                    actions={actions}
                    emptyMessage="No se encontraron sedes con los criterios de búsqueda."
                />
            </div>
        </MainLayout>
    );
}
