import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import DataTable from '@/components/DataTable';
import MainLayout from '@/Layout/MainLayout';

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
    const currentSearch =
        new URLSearchParams(url.split('?')[1] || '').get('search') || '';
    const sortBy = agrupaciones.meta.sort_by || 'ID_Plantilla_Agrupacion';
    const sortOrder = agrupaciones.meta.sort_order || 'asc';

    const [deleteId, setDeleteId] = useState<number | null>(null);

    const columns = [
        {
            key: 'ID_Plantilla_Agrupacion',
            label: 'ID',
            sortable: true,
            render: (value: number) => (
                <span className="font-mono text-xs font-bold text-slate-400">
                    #{String(value).padStart(3, '0')}
                </span>
            ),
        },
        {
            key: 'Nombre_Agrupacion',
            label: 'Agrupación / Programa',
            sortable: true,
            render: (value: string, record: PlantillaAgrupacion) => (
                <div className="flex max-w-[400px] flex-col">
                    <span className="leading-tight font-bold text-slate-800">
                        {value}
                    </span>
                    <span className="truncate text-[10px] font-medium tracking-tighter text-slate-500 uppercase">
                        {record.programa?.Nombre_Programa || 'Sin programa'}
                    </span>
                    <span className="mt-1 text-[9px] font-black tracking-widest text-blue-600 uppercase">
                        {record.componente?.Nombre_Componente ||
                            'Sin componente'}
                    </span>
                </div>
            ),
        },
        {
            key: 'Tipo_Agrupacion',
            label: 'Tipo',
            sortable: true,
            render: (value: string) => (
                <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 uppercase">
                    {value}
                </span>
            ),
        },
        {
            key: 'Creditos',
            label: 'Regla de Créditos',
            render: (_: any, record: PlantillaAgrupacion) => (
                <div className="flex items-center gap-2">
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">
                            Mín
                        </span>
                        <span className="text-sm font-black text-slate-700">
                            {record.Creditos_Requeridos ?? 0}
                        </span>
                    </div>
                    <span className="text-slate-300">/</span>
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">
                            Máx
                        </span>
                        <span className="text-sm font-black text-slate-700">
                            {record.Creditos_Maximos || '∞'}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            key: 'Es_Obligatoria',
            label: 'Estado',
            render: (value: boolean) => (
                <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black tracking-wider uppercase ring-1 ring-inset ${
                        value
                            ? 'bg-emerald-100 text-emerald-700 ring-emerald-600/20'
                            : 'bg-blue-100 text-blue-700 ring-blue-600/20'
                    }`}
                >
                    <span
                        className={`h-1.5 w-1.5 rounded-full ${value ? 'bg-emerald-500' : 'bg-blue-500'}`}
                    />
                    {value ? 'Obligatoria' : 'Opcional'}
                </span>
            ),
        },
    ];

    const handleDelete = (id: number) => {
        router.delete(`/agrupaciones/${id}`, {
            preserveScroll: true,
            onSuccess: () => setDeleteId(null),
        });
    };

    return (
        <MainLayout>
            <Head title="Agrupaciones Curriculares - UNAL" />

            <div className="mx-auto max-w-[1400px] space-y-8 pb-10">
                <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
                    <div>
                        <div className="mb-1 flex items-center gap-2 text-xs font-bold tracking-widest text-slate-500 uppercase">
                            <span className="material-symbols-outlined !text-sm">
                                account_tree
                            </span>
                            Estructura de Malla
                        </div>
                        <h1 className="text-4xl leading-none font-black tracking-tight text-balance text-slate-900">
                            Agrupaciones
                        </h1>
                        <p className="mt-2 text-slate-500">
                            Plantillas de agrupación de materias por componente
                            y programa.
                        </p>
                    </div>
                    <Link
                        href="/agrupaciones/create"
                        className="flex items-center gap-2 rounded-xl bg-[#00236f] px-6 py-3 font-bold text-white shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-95"
                    >
                        <span className="material-symbols-outlined">
                            playlist_add
                        </span>
                        Nueva Agrupación
                    </Link>
                </div>

                <DataTable
                    data={agrupaciones.data}
                    columns={columns}
                    meta={agrupaciones.meta}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    searchValue={currentSearch}
                    onSearch={(search, page) =>
                        router.get(
                            '/agrupaciones',
                            { search, page },
                            { preserveState: true },
                        )
                    }
                    onSort={(col, dir) =>
                        router.get(
                            '/agrupaciones',
                            { sort_by: col, sort_order: dir },
                            { preserveState: true },
                        )
                    }
                    actions={(record) => (
                        <div className="flex justify-end gap-1">
                            <Link
                                href={`/agrupaciones/${record.ID_Plantilla_Agrupacion}/edit`}
                                className="rounded-lg p-2 text-slate-400 transition-all hover:bg-blue-50 hover:text-[#00236f]"
                            >
                                <span className="material-symbols-outlined !text-xl">
                                    edit_note
                                </span>
                            </Link>
                            <button
                                onClick={() =>
                                    setDeleteId(record.ID_Plantilla_Agrupacion)
                                }
                                className="rounded-lg p-2 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600"
                            >
                                <span className="material-symbols-outlined !text-xl">
                                    delete
                                </span>
                            </button>
                        </div>
                    )}
                />
            </div>

            {deleteId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
                        <span className="material-symbols-outlined mb-3 !text-5xl text-red-500">
                            warning
                        </span>
                        <h3 className="text-lg font-bold text-slate-900">
                            ¿Eliminar plantilla de agrupación?
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
        </MainLayout>
    );
}
