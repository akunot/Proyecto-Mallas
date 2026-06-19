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

    const columns = [
        { 
            key: 'Nombre_Sede', 
            label: 'Sede / Código', 
            sortable: true,
            render: (value: string, row: Sede) => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-800 leading-tight">{value}</span>
                    <span className="text-[10px] font-mono text-blue-600 font-bold uppercase tracking-tighter">
                        COD: {row.Codigo_Sede || 'N/A'} • ID: {row.ID_Sede}
                    </span>
                </div>
            )
        },
        { key: 'Ciudad_Sede', label: 'Ciudad', sortable: true },
        { 
            key: 'Campus_Sede', 
            label: 'Campus',
            render: (value: string | null) => (
                <div className="flex items-center gap-1.5 text-slate-600">
                    <span className="material-symbols-outlined !text-sm opacity-50">domain</span>
                    <span className="text-sm">{value || 'No asignado'}</span>
                </div>
            )
        },
        { 
            key: 'Url_Sede', 
            label: 'Sitio Web',
            render: (value: string | null) => value ? (
                <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 text-xs">
                    <span className="material-symbols-outlined !text-sm">open_in_new</span>
                    Visitar
                </a>
            ) : '—'
        },
    ];

    const handleDelete = (id: number) => {
        if (confirm('¿Realmente deseas eliminar esta sede? Esta acción no se puede deshacer.')) {
            router.delete(`/sedes/${id}`, {
                preserveScroll: true,
                onSuccess: () => { /* Aquí podrías disparar una notificación */ }
            });
        }
    };

    const actions = (row: Sede) => (
        <div className="flex justify-end gap-1">
            <Link
                href={`/sedes/${row.ID_Sede}/edit`}
                className="p-2 text-slate-400 hover:text-[#00236f] hover:bg-blue-50 rounded-lg transition-all"
            >
                <span className="material-symbols-outlined !text-xl">edit_note</span>
            </Link>
            <button
                onClick={() => handleDelete(row.ID_Sede)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
            >
                <span className="material-symbols-outlined !text-xl">delete</span>
            </button>
        </div>
    );

    return (
        <MainLayout>
            <Head title="Sedes Institucionales - UNAL" />

            <div className="max-w-[1400px] mx-auto space-y-8 pb-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">
                            <span className="material-symbols-outlined !text-sm">location_on</span>
                            Infraestructura
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Sedes UNAL</h1>
                        <p className="text-slate-500 mt-2">Gestión de campus y centros de operación a nivel nacional.</p>
                    </div>
                    <Link
                        href="/sedes/create"
                        className="flex items-center gap-2 px-6 py-3 bg-[#00236f] text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        <span className="material-symbols-outlined">add_location_alt</span>
                        Nueva Sede
                    </Link>
                </div>

                <DataTable
                    columns={columns}
                    data={sedes.data}
                    meta={sedes.meta}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    searchValue={currentSearch}
                    onSort={(col, dir) => router.get('/sedes', { search: currentSearch, sort_by: col, sort_order: dir }, { preserveState: true })}
                    onSearch={(search, page) => router.get('/sedes', { search, page, sort_by: sortBy, sort_order: sortOrder }, { preserveState: true })}
                    onRefresh={() => router.visit('/sedes')}
                    actions={actions}
                    emptyMessage="No se encontraron sedes con los criterios de búsqueda."
                />
            </div>
        </MainLayout>
    );
}