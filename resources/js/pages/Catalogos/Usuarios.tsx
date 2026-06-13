import { Head, Link, router, usePage } from '@inertiajs/react';
import MainLayout from '@/Layout/MainLayout';
import DataTable from '@/components/DataTable';

interface Usuario {
    ID_Usuario: number;
    Nombre_Usuario: string;
    Email_Usuario: string;
    Activo_Usuario: number;
    Creacion_Usuario: string;
}

interface Props {
    usuarios: {
        data: Usuario[];
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

export default function Usuarios({ usuarios }: Props) {
    const { url } = usePage();
    const currentSearch = new URLSearchParams(url.split('?')[1] || '').get('search') || '';
    const sortBy = usuarios.meta.sort_by || 'ID_Usuario';
    const sortOrder = usuarios.meta.sort_order || 'asc';

    const columns = [
        { 
            key: 'Nombre_Usuario', 
            label: 'Usuario', 
            sortable: true,
            render: (value: string, row: Usuario) => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-800">{value}</span>
                    <span className="text-xs text-slate-500 font-mono">{row.Email_Usuario}</span>
                </div>
            )
        },
        {
            key: 'Activo_Usuario',
            label: 'Estado',
            render: (value: number) => (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ring-1 ring-inset ${
                    value ? 'bg-emerald-100 text-emerald-700 ring-emerald-600/20' : 'bg-rose-100 text-rose-700 ring-rose-600/20'
                }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${value ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    {value ? 'Activo' : 'Inactivo'}
                </span>
            ),
        },
        {
            key: 'Creacion_Usuario',
            label: 'Miembro desde',
            render: (value: string) => (
                <div className="flex flex-col text-xs">
                    <span className="font-medium text-slate-600">{value ? new Date(value).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</span>
                </div>
            ),
        },
    ];

    const actions = (row: Usuario) => (
        <div className="flex justify-end gap-2">
            <Link
                href={`/usuarios/${row.ID_Usuario}/edit`}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Editar Perfil"
            >
                <span className="material-symbols-outlined !text-xl">edit_square</span>
            </Link>
            <button
                onClick={() => router.patch(`/usuarios/${row.ID_Usuario}/toggle`)}
                className={`p-2 rounded-lg transition-colors ${
                    row.Activo_Usuario ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                }`}
                title={row.Activo_Usuario ? 'Desactivar Acceso' : 'Habilitar Acceso'}
            >
                <span className="material-symbols-outlined !text-xl">
                    {row.Activo_Usuario ? 'person_off' : 'person_check'}
                </span>
            </button>
        </div>
    );

    return (
        <MainLayout>
            <Head title="Gestión de Usuarios - UNAL" />

            <div className="max-w-[1200px] mx-auto space-y-8 pb-10">
                {/* Header Estilo UNAL SaaS */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">
                            <span className="material-symbols-outlined !text-sm">admin_panel_settings</span>
                            Seguridad
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Usuarios</h1>
                        <p className="text-slate-500 mt-1">Control de accesos y perfiles administrativos del sistema.</p>
                    </div>
                    <Link
                        href="/usuarios/create"
                        className="flex items-center gap-2 px-6 py-3 bg-[#00236f] text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        <span className="material-symbols-outlined">person_add</span>
                        Registrar Usuario
                    </Link>
                </div>

                <DataTable
                    columns={columns}
                    data={usuarios.data}
                    meta={usuarios.meta}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    searchValue={currentSearch}
                    onSort={(col, dir) => router.get('/usuarios', { search: currentSearch, sort_by: col, sort_order: dir }, { preserveState: true })}
                    onSearch={(search, page) => router.get('/usuarios', { search, page, sort_by: sortBy, sort_order: sortOrder }, { preserveState: true })}
                    onRefresh={() => router.visit('/usuarios')}
                    actions={actions}
                    emptyMessage="No se encontraron usuarios en la base de datos."
                />
            </div>
        </MainLayout>
    );
}