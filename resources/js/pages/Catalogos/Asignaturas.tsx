import { Head, Link, router, usePage } from '@inertiajs/react';
import MainLayout from '@/Layout/MainLayout';
import DataTable from '@/components/DataTable';

interface Asignatura {
    ID_Asignatura: number;
    Codigo_Asignatura: string;
    Nombre_Asignatura: string;
    Creditos_Asignatura: number;
    Horas_Presencial: number | null;
    Horas_Estudiante: number | null;
    Descripcion_Asignatura: string | null;
}

interface Props {
    asignaturas: {
        data: Asignatura[];
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

export default function Asignaturas({ asignaturas }: Props) {
    const { url } = usePage();
    const currentSearch = new URLSearchParams(url.split('?')[1] || '').get('search') || '';
    const sortBy = asignaturas.meta.sort_by || 'ID_Asignatura';
    const sortOrder = asignaturas.meta.sort_order || 'asc';

    const columns = [
        { 
            key: 'Nombre_Asignatura', 
            label: 'Asignatura / Código', 
            sortable: true,
            render: (value: string, row: Asignatura) => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-800 leading-tight">{value}</span>
                    <span className="text-[10px] font-mono text-blue-600 font-bold uppercase tracking-tighter">
                        CÓD: {row.Codigo_Asignatura}
                    </span>
                </div>
            )
        },
        { 
            key: 'Creditos_Asignatura', 
            label: 'Carga Académica', 
            sortable: true,
            render: (value: number, row: Asignatura) => (
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center bg-blue-50 border border-blue-100 rounded-lg w-10 h-10">
                        <span className="text-[9px] font-black text-blue-400 uppercase leading-none">Créd</span>
                        <span className="text-sm font-black text-[#00236f]">{value}</span>
                    </div>
                    <div className="flex flex-col text-[10px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined !text-[12px]">school</span>
                            {row.Horas_Presencial || 0}h Presenciales
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined !text-[12px]">menu_book</span>
                            {row.Horas_Estudiante || 0}h Autónomas
                        </span>
                    </div>
                </div>
            )
        },
        {
            key: 'Descripcion_Asignatura',
            label: 'Estado',
            render: (value: string | null) => (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Vigente
                </span>
            )
        }
    ];

    const actions = (row: Asignatura) => (
        <div className="flex justify-end gap-1">
            <Link
                href={`/asignaturas/${row.ID_Asignatura}/edit`}
                className="p-2 text-slate-400 hover:text-[#00236f] hover:bg-blue-50 rounded-lg transition-all"
            >
                <span className="material-symbols-outlined !text-xl">edit_square</span>
            </Link>
        </div>
    );

    return (
        <MainLayout>
            <Head title="Catálogo de Asignaturas - UNAL" />

            <div className="max-w-[1400px] mx-auto space-y-8 pb-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">
                            <span className="material-symbols-outlined !text-sm">book</span>
                            Contenidos
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Asignaturas</h1>
                        <p className="text-slate-500 mt-2">Banco maestro de asignaturas para mallas y programas.</p>
                    </div>
                    <Link
                        href="/asignaturas/create"
                        className="flex items-center gap-2 px-6 py-3 bg-[#00236f] text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        <span className="material-symbols-outlined">add_circle</span>
                        Nueva Asignatura
                    </Link>
                </div>

                <DataTable
                    columns={columns}
                    data={asignaturas.data}
                    meta={asignaturas.meta}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    searchValue={currentSearch}
                    onSort={(col, dir) => router.get('/asignaturas', { search: currentSearch, sort_by: col, sort_order: dir }, { preserveState: true })}
                    onSearch={(search, page) => router.get('/asignaturas', { search, page, sort_by: sortBy, sort_order: sortOrder }, { preserveState: true })}
                    actions={actions}
                    emptyMessage="No se encontraron asignaturas registradas."
                />
            </div>
        </MainLayout>
    );
}