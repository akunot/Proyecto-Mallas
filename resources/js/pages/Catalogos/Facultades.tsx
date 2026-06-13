import { Head, Link, router, usePage } from '@inertiajs/react';
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

export default function Facultades({ facultades }: Props) {
    const { url } = usePage();
    const currentParams = new URLSearchParams(url.split('?')[1] || '');
    const currentSearch = currentParams.get('search') || '';
    const sortBy = facultades.meta.sort_by || 'ID_Facultad';
    const sortOrder = facultades.meta.sort_order || 'asc';

    const columns = [
        { 
            key: 'Nombre_Facultad', 
            label: 'Facultad / Identificación', 
            sortable: true,
            render: (value: string, row: Facultad) => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-800 leading-tight">{value}</span>
                    <span className="text-[10px] font-mono text-blue-600 font-bold uppercase tracking-tighter">
                        CÓD: {row.Codigo_Facultad || 'N/A'} • ID: {row.ID_Facultad}
                    </span>
                </div>
            )
        },
        { 
            key: 'Nombre_Sede', 
            label: 'Sede Institucional', 
            sortable: true,
            render: (value: string | null) => (
                <div className="flex items-center gap-2 text-slate-600">
                    <span className="material-symbols-outlined !text-sm text-slate-400">location_city</span>
                    <span className="text-sm font-medium">{value || '—'}</span>
                </div>
            )
        },
        { 
            key: 'Campus_Facultad', 
            label: 'Campus / Ubicación',
            render: (value: string | null) => (
                <div className="flex flex-col">
                    <span className="text-xs text-slate-700">{value || 'No asignado'}</span>
                </div>
            )
        },
        {
            key: 'Url_Facultad',
            label: 'Enlace',
            render: (value: string | null) => value ? (
                <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 transition-colors">
                    <span className="material-symbols-outlined !text-xl">language</span>
                </a>
            ) : <span className="text-slate-300">—</span>
        }
    ];

    const handleDelete = (id: number) => {
        if (confirm('¿Estás seguro de eliminar esta facultad? Todos los programas asociados podrían verse afectados.')) {
            router.delete(`/facultades/${id}`, { preserveScroll: true });
        }
    };

    const actions = (row: Facultad) => (
        <div className="flex justify-end gap-1">
            <Link
                href={`/facultades/${row.ID_Facultad}/edit`}
                className="p-2 text-slate-400 hover:text-[#00236f] hover:bg-blue-50 rounded-lg transition-all"
            >
                <span className="material-symbols-outlined !text-xl">edit_note</span>
            </Link>
            <button
                onClick={() => handleDelete(row.ID_Facultad)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
            >
                <span className="material-symbols-outlined !text-xl">delete_sweep</span>
            </button>
        </div>
    );

    return (
        <MainLayout>
            <Head title="Facultades - UNAL" />

            <div className="max-w-[1400px] mx-auto space-y-8 pb-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">
                            <span className="material-symbols-outlined !text-sm">account_balance</span>
                            Estructura Orgánica
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Facultades</h1>
                        <p className="text-slate-500 mt-2">Gestión de unidades académicas y administrativas por sede.</p>
                    </div>
                    <Link
                        href="/facultades/create"
                        className="flex items-center gap-2 px-6 py-3 bg-[#00236f] text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:scale-[1.02] transition-all"
                    >
                        <span className="material-symbols-outlined">add_business</span>
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
                    onSort={(col, dir) => router.get('/facultades', { search: currentSearch, sort_by: col, sort_order: dir }, { preserveState: true })}
                    onSearch={(search, page) => router.get('/facultades', { search, page, sort_by: sortBy, sort_order: sortOrder }, { preserveState: true })}
                    onRefresh={() => router.visit('/facultades')}
                    actions={actions}
                />
            </div>
        </MainLayout>
    );
}