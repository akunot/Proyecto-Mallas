import { Head, useForm, Link } from '@inertiajs/react';
import MainLayout from '@/Layout/MainLayout';

interface Facultad {
    ID_Facultad: number;
    Codigo_Sede: number;
    Codigo_Facultad: number;
    Nombre_Facultad: string;
    Conmutador_Facultad: string | null;
    Extension_Facultad: string | null;
    Campus_Facultad: string | null;
    Url_Facultad: string | null;
    Esta_Activo?: number;
}

interface Sede {
    Codigo_Sede: number;
    Nombre_Sede: string;
}

interface Props {
    facultad?: Facultad;
    sedes: Sede[];
    errors?: Record<string, string>;
}

export default function FacultadesForm({ facultad, sedes }: Props) {
    const isEditing = !!facultad;
    
    const { data, setData, post, put, processing, errors } = useForm({
        Codigo_Sede: facultad?.Codigo_Sede?.toString() || '',
        Codigo_Facultad: facultad?.Codigo_Facultad?.toString() || '',
        Nombre_Facultad: facultad?.Nombre_Facultad || '',
        Conmutador_Facultad: facultad?.Conmutador_Facultad || '',
        Extension_Facultad: facultad?.Extension_Facultad || '',
        Campus_Facultad: facultad?.Campus_Facultad || '',
        Url_Facultad: facultad?.Url_Facultad || '',
    });

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditing) put(`/facultades/${facultad.ID_Facultad}`);
        else post('/facultades');
    };

    return (
        <MainLayout>
            <Head title={isEditing ? 'Editar Facultad' : 'Registrar Facultad'} />

            <div className="max-w-4xl mx-auto py-10 px-4">
                <header className="mb-10 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
                            {isEditing ? 'Actualizar Facultad' : 'Nueva Facultad'}
                        </h1>
                        <p className="text-slate-500 mt-2 text-sm font-medium">Define los parámetros de la unidad académica.</p>
                    </div>
                    <Link href="/facultades" className="text-slate-400 hover:text-slate-600 transition-colors">
                        <span className="material-symbols-outlined !text-3xl">close</span>
                    </Link>
                </header>

                <form onSubmit={onSubmit} className="space-y-6">
                    {/* Bloque: Información Académica */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                        <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-600">account_balance</span>
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Datos Principales</h3>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nombre de la Facultad *</label>
                                    <input
                                        type="text"
                                        value={data.Nombre_Facultad}
                                        onChange={e => setData('Nombre_Facultad', e.target.value)}
                                        className={`w-full px-4 py-3 bg-slate-50 border-2 rounded-xl transition-all focus:ring-4 focus:ring-blue-100 ${errors.Nombre_Facultad ? 'border-rose-300' : 'border-transparent focus:border-blue-500'}`}
                                        placeholder="Ej: Facultad de Ingeniería"
                                    />
                                    {errors.Nombre_Facultad && <p className="text-rose-600 text-[10px] font-bold mt-1 ml-1">{errors.Nombre_Facultad}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Sede *</label>
                                    <select
                                        value={data.Codigo_Sede}
                                        onChange={e => setData('Codigo_Sede', e.target.value)}
                                        className={`w-full px-4 py-3 bg-slate-50 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 transition-all ${errors.Codigo_Sede ? 'border-rose-300' : 'border-transparent focus:border-blue-500'}`}
                                    >
                                        <option value="">Seleccionar Sede...</option>
                                        {sedes.map(s => <option key={s.Codigo_Sede} value={s.Codigo_Sede.toString()}>{s.Nombre_Sede}</option>)}
                                    </select>
                                    {errors.Codigo_Sede && <p className="text-rose-600 text-[10px] font-bold mt-1 ml-1">{errors.Codigo_Sede}</p>}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-1 space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Código Oficial</label>
                                    <input
                                        type="text"
                                        value={data.Codigo_Facultad}
                                        onChange={e => setData('Codigo_Facultad', e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-blue-500"
                                        placeholder="Ej: FAC-01"
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Campus</label>
                                    <input
                                        type="text"
                                        value={data.Campus_Facultad}
                                        onChange={e => setData('Campus_Facultad', e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-blue-500"
                                        placeholder="Ej: Campus Palogrande"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bloque: Contacto y Enlaces */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                        <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                            <span className="material-symbols-outlined text-orange-500">contact_phone</span>
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Contacto y Enlaces</h3>
                        </div>
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Conmutador</label>
                                <input
                                    type="text"
                                    value={data.Conmutador_Facultad}
                                    onChange={e => setData('Conmutador_Facultad', e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-blue-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Extensión</label>
                                <input
                                    type="text"
                                    value={data.Extension_Facultad}
                                    onChange={e => setData('Extension_Facultad', e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-blue-500"
                                />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Sitio Web Oficial</label>
                                <input
                                    type="url"
                                    value={data.Url_Facultad}
                                    onChange={e => setData('Url_Facultad', e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-blue-500"
                                    placeholder="https://ingenieria.manizales.unal.edu.co"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end items-center gap-4 pt-4">
                        <Link href="/facultades" className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">
                            Cancelar
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-10 py-4 bg-[#00236f] text-white rounded-2xl font-black shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all uppercase tracking-widest text-[11px]"
                        >
                            {processing ? 'Guardando...' : isEditing ? 'Actualizar Facultad' : 'Crear Facultad'}
                        </button>
                    </div>
                </form>
            </div>
        </MainLayout>
    );
}