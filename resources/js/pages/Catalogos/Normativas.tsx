import { Head, Link, router, usePage } from '@inertiajs/react';
import DataTable from '@/components/DataTable';
import MainLayout from '@/Layout/MainLayout';

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

export default function Normativas({ normativas }: Props) {
    const { url } = usePage();
    const currentSearch = new URLSearchParams(url.split('?')[1] || '').get('search') || '';
    const sortBy = normativas.meta.sort_by || 'ID_Normativa';
    const sortOrder = normativas.meta.sort_order || 'asc';

    const columns = [
        {
            key: 'ID_Normativa',
            label: 'ID',
            sortable: true,
            render: (value: number) => (
                <span className="font-mono text-xs text-slate-500">#{value}</span>
            )
        },
        { 
            key: 'Documento', 
            label: 'Documento Legal',
            render: (_: any, row: Normativa) => (
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">
                            {row.Tipo_Normativa} {row.Numero_Normativa}
                        </span>
                        {row.Url_Normativa && (
                            <a 
                                href={row.Url_Normativa} 
                                target="_blank" 
                                className="text-blue-600 hover:text-blue-800"
                                title="Ver documento original"
                            >
                                <span className="material-symbols-outlined !text-sm">open_in_new</span>
                            </a>
                        )}
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Año {row.Anio_Normativa}
                    </span>
                </div>
            )
        },
        { 
            key: 'Nombre_Programa', 
            label: 'Programa Relacionado',
            render: (_value: any, row: Normativa) => (
                <span className="text-xs text-slate-600 font-medium line-clamp-1 max-w-[200px]">
                    {row.Nombre_Programa || 'General / No asignado'}
                </span>
            )
        },
        { 
            key: 'Instancia', 
            label: 'Instancia / Emisor',
            sortable: true,
            render: (_: any, row: Normativa) => (
                <span className="text-xs text-slate-600 font-medium line-clamp-1 max-w-[200px]">
                    {row.Instancia || 'General / No asignado'}
                </span>
            )
        },
        {
            key: 'Esta_Activo',
            label: 'Estado',
            sortable: true,
            render: (value: number) => (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ring-1 ring-inset ${
                    value ? 'bg-emerald-100 text-emerald-700 ring-emerald-600/20' : 'bg-rose-100 text-rose-700 ring-rose-600/20'
                }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${value ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    {value ? 'Vigente' : 'Derogada'}
                </span>
            ),
        },
    ];

    const actions = (row: Normativa) => (
        <div className="flex justify-end gap-1">
            <Link
                href={`/normativas/${row.ID_Normativa}/edit`}
                className="p-2 text-slate-400 hover:text-[#00236f] hover:bg-blue-50 rounded-lg transition-all"
            >
                <span className="material-symbols-outlined !text-xl">edit_document</span>
            </Link>
            <button
                onClick={() => router.patch(`/normativas/${row.ID_Normativa}/toggle`)}
                className={`p-2 rounded-lg transition-all ${row.Esta_Activo ? 'text-rose-400 hover:text-rose-600 hover:bg-rose-50' : 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
            >
                <span className="material-symbols-outlined !text-xl">
                    {row.Esta_Activo ? 'cancel' : 'check_circle'}
                </span>
            </button>
        </div>
    );

    return (
        <MainLayout>
            <Head title="Normativas Académicas - UNAL" />

            <div className="max-w-[1400px] mx-auto space-y-8 pb-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">
                            <span className="material-symbols-outlined !text-sm">gavel</span>
                            Marco Legal
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Normativas</h1>
                        <p className="text-slate-500 mt-2">Base documental de acuerdos y resoluciones de programas.</p>
                    </div>
                    <Link
                        href="/normativas/create"
                        className="flex items-center gap-2 px-6 py-3 bg-[#00236f] text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:scale-[1.02] transition-all"
                    >
                        <span className="material-symbols-outlined">add_moderator</span>
                        Nueva Normativa
                    </Link>
                </div>

                <DataTable
                    columns={columns}
                    data={normativas.data}
                    meta={normativas.meta}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    searchValue={currentSearch}
                    onSort={(col, dir) => router.get('/normativas', { search: currentSearch, sort_by: col, sort_order: dir }, { preserveState: true })}
                    onSearch={(search, page) => router.get('/normativas', { search, page, sort_by: sortBy, sort_order: sortOrder }, { preserveState: true })}
                    actions={actions}
                />
            </div>
        </MainLayout>
    );
}