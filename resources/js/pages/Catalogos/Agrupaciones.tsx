import { Head, Link, router, usePage } from '@inertiajs/react';
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
        {
            key: 'ID_Plantilla_Agrupacion',
            label: 'ID',
            sortable: true,
            render: (value: number) => (
                <span className="text-xs font-mono font-bold text-slate-400">#{String(value).padStart(3, '0')}</span>
            )
        },
        { 
            key: 'Nombre_Agrupacion', 
            label: 'Agrupación / Programa', 
            sortable: true,
            render: (value: string, record: PlantillaAgrupacion) => (
                <div className="flex flex-col max-w-[400px]">
                    <span className="font-bold text-slate-800 leading-tight">{value}</span>
                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter truncate">
                        {record.programa?.Nombre_Programa || 'Sin programa'}
                    </span>
                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest mt-1">
                        {record.componente?.Nombre_Componente || 'Sin componente'}
                    </span>
                </div>
            )
        },
        { 
            key: 'Tipo_Agrupacion', 
            label: 'Tipo', 
            sortable: true,
            render: (value: string) => (
                <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md border border-slate-200 uppercase">
                    {value}
                </span>
            )
        },
        {
            key: 'Creditos',
            label: 'Regla de Créditos',
            render: (_: any, record: PlantillaAgrupacion) => (
                <div className="flex items-center gap-2">
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Mín</span>
                        <span className="text-sm font-black text-slate-700">{record.Creditos_Requeridos ?? 0}</span>
                    </div>
                    <span className="text-slate-300">/</span>
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Máx</span>
                        <span className="text-sm font-black text-slate-700">{record.Creditos_Maximos || '∞'}</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'Es_Obligatoria',
            label: 'Estado',
            render: (value: boolean) => (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ring-1 ring-inset ${
                    value ? 'bg-emerald-100 text-emerald-700 ring-emerald-600/20' : 'bg-blue-100 text-blue-700 ring-blue-600/20'
                }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${value ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                    {value ? 'Obligatoria' : 'Opcional'}
                </span>
            ),
        },
    ];

    const handleDelete = (id: number) => {
        if (confirm('¿Realmente deseas eliminar esta plantilla de agrupación?')) {
            router.delete(`/agrupaciones/${id}`, { preserveScroll: true });
        }
    };

    return (
        <MainLayout>
            <Head title="Agrupaciones Curriculares - UNAL" />
            
            <div className="max-w-[1400px] mx-auto space-y-8 pb-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">
                            <span className="material-symbols-outlined !text-sm">account_tree</span>
                            Estructura de Malla
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none text-balance">Agrupaciones</h1>
                        <p className="text-slate-500 mt-2">Plantillas de agrupación de materias por componente y programa.</p>
                    </div>
                    <Link
                        href="/agrupaciones/create"
                        className="flex items-center gap-2 px-6 py-3 bg-[#00236f] text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        <span className="material-symbols-outlined">playlist_add</span>
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
                    onSearch={(search, page) => router.get('/agrupaciones', { search, page }, { preserveState: true })}
                    onSort={(col, dir) => router.get('/agrupaciones', { sort_by: col, sort_order: dir }, { preserveState: true })}
                    actions={(record) => (
                        <div className="flex justify-end gap-1">
                            <Link href={`/agrupaciones/${record.ID_Plantilla_Agrupacion}/edit`} className="p-2 text-slate-400 hover:text-[#00236f] hover:bg-blue-50 rounded-lg transition-all">
                                <span className="material-symbols-outlined !text-xl">edit_note</span>
                            </Link>
                            <button onClick={() => handleDelete(record.ID_Plantilla_Agrupacion)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                                <span className="material-symbols-outlined !text-xl">delete</span>
                            </button>
                        </div>
                    )}
                />
            </div>
        </MainLayout>
    );
}