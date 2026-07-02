import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import DataTable from '@/components/DataTable';
import MainLayout from '@/Layout/MainLayout';

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

export default function Facultades({ facultades }: Props) {
    const { url } = usePage();
    const currentParams = new URLSearchParams(url.split('?')[1] || '');
    const currentSearch = currentParams.get('search') || '';
    const sortBy = facultades.meta.sort_by || 'ID_Facultad';
    const sortOrder = facultades.meta.sort_order || 'asc';

    const [deleteId, setDeleteId] = useState<number | null>(null);

    const columns = [
        {
            key: 'Nombre_Facultad',
            label: 'Facultad / Identificación',
            sortable: true,
            render: (value: string, row: Facultad) => (
                <div className="flex flex-col">
                    <span className="leading-tight font-bold text-slate-800">
                        {value}
                    </span>
                    <span className="font-mono text-[10px] font-bold tracking-tighter text-blue-600 uppercase">
                        CÓD: {row.Codigo_Facultad || 'N/A'} • ID:{' '}
                        {row.ID_Facultad}
                    </span>
                </div>
            ),
        },
        {
            key: 'Nombre_Sede',
            label: 'Sede Institucional',
            sortable: true,
            render: (value: string | null) => (
                <div className="flex items-center gap-2 text-slate-600">
                    <span className="material-symbols-outlined !text-sm text-slate-400">
                        location_city
                    </span>
                    <span className="text-sm font-medium">{value || '—'}</span>
                </div>
            ),
        },
        {
            key: 'Campus_Facultad',
            label: 'Campus / Ubicación',
            render: (value: string | null) => (
                <div className="flex flex-col">
                    <span className="text-xs text-slate-700">
                        {value || 'No asignado'}
                    </span>
                </div>
            ),
        },
        {
            key: 'Url_Facultad',
            label: 'Enlace',
            render: (value: string | null) =>
                value ? (
                    <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 transition-colors hover:text-blue-800"
                    >
                        <span className="material-symbols-outlined !text-xl">
                            language
                        </span>
                    </a>
                ) : (
                    <span className="text-slate-300">—</span>
                ),
        },
    ];

    const handleDelete = (id: number) => {
        router.delete(`/facultades/${id}`, {
            preserveScroll: true,
            onSuccess: () => setDeleteId(null),
        });
    };

    const actions = (row: Facultad) => (
        <div className="flex justify-end gap-1">
            <Link
                href={`/facultades/${row.ID_Facultad}/edit`}
                className="rounded-lg p-2 text-slate-400 transition-all hover:bg-blue-50 hover:text-[#00236f]"
            >
                <span className="material-symbols-outlined !text-xl">
                    edit_note
                </span>
            </Link>
            <button
                onClick={() => setDeleteId(row.ID_Facultad)}
                className="rounded-lg p-2 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600"
            >
                <span className="material-symbols-outlined !text-xl">
                    delete_sweep
                </span>
            </button>
        </div>
    );

    return (
        <MainLayout>
            <Head title="Facultades - UNAL" />

            <div className="mx-auto max-w-[1400px] space-y-8 pb-10">
                <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
                    <div>
                        <div className="mb-1 flex items-center gap-2 text-xs font-bold tracking-widest text-slate-500 uppercase">
                            <span className="material-symbols-outlined !text-sm">
                                account_balance
                            </span>
                            Estructura Orgánica
                        </div>
                        <h1 className="text-4xl leading-none font-black tracking-tight text-slate-900">
                            Facultades
                        </h1>
                        <p className="mt-2 text-slate-500">
                            Gestión de unidades académicas y administrativas por
                            sede.
                        </p>
                    </div>
                    <Link
                        href="/facultades/create"
                        className="flex items-center gap-2 rounded-xl bg-[#00236f] px-6 py-3 font-bold text-white shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02]"
                    >
                        <span className="material-symbols-outlined">
                            add_business
                        </span>
                        Nueva Facultad
                    </Link>
                </div>

                <DataTable
                    columns={columns}
                    data={facultades.data}
                    meta={facultades.meta}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    searchValue={currentSearch}
                    onSort={(col, dir) =>
                        router.get(
                            '/facultades',
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
                            '/facultades',
                            {
                                search,
                                page,
                                sort_by: sortBy,
                                sort_order: sortOrder,
                            },
                            { preserveState: true },
                        )
                    }
                    onRefresh={() => router.visit('/facultades')}
                    actions={actions}
                />
            </div>

            {deleteId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
                        <span className="material-symbols-outlined mb-3 !text-5xl text-red-500">
                            warning
                        </span>
                        <h3 className="text-lg font-bold text-slate-900">
                            ¿Eliminar facultad?
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                            Los programas asociados podrían verse afectados.
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
        </MainLayout>
    );
}
