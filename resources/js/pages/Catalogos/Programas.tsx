import { Head, Link, router, usePage } from '@inertiajs/react';
import DataTable from '@/components/DataTable';
import MainLayout from '@/Layout/MainLayout';
interface Programa {
    ID_Programa: number;
    ID_Facultad: number;
    Codigo_Programa: string;
    Nombre_Programa: string;
    Titulo_Otorgado: string | null;
    Nivel_Formacion: string | null;
    Creditos_Totales: number | null;
    Duracion_Semestres: number | null;
    Codigo_SNIES: string | null;
    Campus_Programa: string | null;
    Conmutador: string | null;
    Extension: string | null;
    Correo: string | null;
    Area_Curricular: string | null;
    Esta_Activo: number;
    Nombre_Facultad?: string;
}

interface Props {
    programas: {
        data: Programa[];
        meta: {
            current_page: number;
            total: number;
            per_page: number;
            last_page: number;
            sort_by?: string;
            sort_order?: 'asc' | 'desc';
        };
    };
    facultades: { ID_Facultad: number; Nombre_Facultad: string }[];
}

export default function Programas({ programas }: Props) {
    const { url } = usePage();
    const currentSearch = new URLSearchParams(url.split('?')[1] || '').get('search') || '';
    const sortBy = programas.meta.sort_by || 'ID_Programa';
    const sortOrder = programas.meta.sort_order || 'asc';

    const columns = [
        { 
            key: 'Nombre_Programa', 
            label: 'Programa Académico', 
            sortable: true,
            render: (value: string, row: Programa) => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-800 leading-tight">{value}</span>
                    <span className="text-[10px] font-mono text-blue-600 font-bold uppercase tracking-tighter">
                        CÓD: {row.Codigo_Programa} • SNIES: {row.Codigo_SNIES || 'N/A'}
                    </span>
                </div>
            )
        },
        {
            key: 'Nivel_Formacion',
            label: 'Nivel / Créditos',
            render: (value: string | null, row: Programa) => (
                <div className="flex flex-col">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md w-fit mb-1 ${
                        value === 'pregrado' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                        {value || 'No definido'}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                        {row.Creditos_Totales || 0} Créditos • {row.Duracion_Semestres || 0} Sem.
                    </span>
                </div>
            ),
        },
        {
            key: 'Esta_Activo',
            label: 'Estado',
            render: (value: number) => (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ring-1 ring-inset ${
                    value ? 'bg-emerald-100 text-emerald-700 ring-emerald-600/20' : 'bg-rose-100 text-rose-700 ring-rose-600/20'
                }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${value ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    {value ? 'Activo' : 'Inactivo'}
                </span>
            ),
        },
    ];

    const actions = (row: Programa) => (
        <div className="flex justify-end gap-1">
            <Link
                href={`/programas/${row.ID_Programa}/edit`}
                className="p-2 text-slate-400 hover:text-[#00236f] hover:bg-blue-50 rounded-lg transition-all"
            >
                <span className="material-symbols-outlined !text-xl">edit_note</span>
            </Link>
            <button
                onClick={() => router.patch(`/programas/${row.ID_Programa}/toggle`)}
                className={`p-2 rounded-lg transition-all ${row.Esta_Activo ? 'text-rose-400 hover:text-rose-600 hover:bg-rose-50' : 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
            >
                <span className="material-symbols-outlined !text-xl">
                    {row.Esta_Activo ? 'visibility_off' : 'visibility'}
                </span>
            </button>
        </div>
    );

    return (
        <MainLayout>
            <Head title="Programas Académicos - UNAL" />
            
            <div className="max-w-[1400px] mx-auto space-y-8 pb-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">
                            <span className="material-symbols-outlined !text-sm">auto_stories</span>
                            Oferta Académica
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Programas</h1>
                        <p className="text-slate-500 mt-2">Administración de currículos y planes de estudio activos.</p>
                    </div>
                    <Link
                        href="/programas/create"
                        className="flex items-center gap-2 px-6 py-3 bg-[#00236f] text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:scale-[1.02] transition-all"
                    >
                        <span className="material-symbols-outlined">add_circle</span>
                        Nuevo Programa
                    </Link>
                </div>

                <DataTable
                    columns={columns}
                    data={programas.data}
                    meta={programas.meta}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    searchValue={currentSearch}
                    onSort={(col, dir) => router.get('/programas', { search: currentSearch, sort_by: col, sort_order: dir }, { preserveState: true })}
                    onSearch={(search, page) => router.get('/programas', { search, page, sort_by: sortBy, sort_order: sortOrder }, { preserveState: true })}
                    actions={actions}
                    emptyMessage="No hay programas registrados para los criterios seleccionados."
                />
            </div>
        </MainLayout>
    );
}