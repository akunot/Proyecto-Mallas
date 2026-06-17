import { Head, useForm, Link } from '@inertiajs/react';
import MainLayout from '@/Layout/MainLayout';

interface Props {
    sede?: {
        ID_Sede: number;
        Codigo_Sede: number;
        Nombre_Sede: string;
        Ciudad_Sede: string;
        Direccion_Sede: string | null;
        Conmutador_Sede: string | null;
        Campus_Sede: string | null;
        Url_Sede: string | null;
    };
    errors?: Record<string, string>;
}

export default function SedesForm({ sede }: Props) {
    const isEditing = !!sede;
    
    const { data, setData, post, put, processing, errors } = useForm({
        Codigo_Sede: sede?.Codigo_Sede?.toString() || '',
        Nombre_Sede: sede?.Nombre_Sede || '',
        Ciudad_Sede: sede?.Ciudad_Sede || '',
        Direccion_Sede: sede?.Direccion_Sede || '',
        Conmutador_Sede: sede?.Conmutador_Sede || '',
        Campus_Sede: sede?.Campus_Sede || '',
        Url_Sede: sede?.Url_Sede || '',
    });

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditing) put(`/sedes/${sede.ID_Sede}`);
        else post('/sedes');
    };

    return (
        <MainLayout>
            <Head title={isEditing ? 'Editar Sede' : 'Registrar Sede'} />

            <div className="max-w-4xl mx-auto py-10 px-4">
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
                            {isEditing ? 'Actualizar Sede' : 'Nueva Sede'}
                        </h1>
                        <p className="text-slate-500 mt-2">Configuración de información básica y contacto institucional.</p>
                    </div>
                    <Link href="/sedes" className="text-slate-400 hover:text-[#00236f] transition-colors">
                        <span className="material-symbols-outlined !text-3xl">cancel</span>
                    </Link>
                </div>

                <form onSubmit={onSubmit} className="space-y-6">
                    {/* Sección: Identificación */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                        <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-600">info</span>
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Identificación Principal</h3>
                        </div>
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nombre de la Sede *</label>
                                <input
                                    type="text"
                                    value={data.Nombre_Sede}
                                    onChange={e => setData('Nombre_Sede', e.target.value)}
                                    className={`w-full px-4 py-3 bg-slate-50 border-2 rounded-xl transition-all focus:ring-4 focus:ring-blue-100 ${errors.Nombre_Sede ? 'border-rose-300 bg-rose-50' : 'border-transparent focus:border-blue-500'}`}
                                    placeholder="Ej: Sede Manizales"
                                />
                                {errors.Nombre_Sede && <p className="text-rose-600 text-[10px] font-bold mt-1 ml-1">{errors.Nombre_Sede}</p>}
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Código Oficial</label>
                                <input
                                    type="text"
                                    value={data.Codigo_Sede}
                                    onChange={e => setData('Codigo_Sede', e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-blue-500 transition-all focus:ring-4 focus:ring-blue-100"
                                    placeholder="Código SIA/DANE"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Ciudad *</label>
                                <input
                                    type="text"
                                    value={data.Ciudad_Sede}
                                    onChange={e => setData('Ciudad_Sede', e.target.value)}
                                    className={`w-full px-4 py-3 bg-slate-50 border-2 rounded-xl transition-all focus:ring-4 focus:ring-blue-100 ${errors.Ciudad_Sede ? 'border-rose-300 bg-rose-50' : 'border-transparent focus:border-blue-500'}`}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nombre del Campus</label>
                                <input
                                    type="text"
                                    value={data.Campus_Sede}
                                    onChange={e => setData('Campus_Sede', e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-blue-500 transition-all focus:ring-4 focus:ring-blue-100"
                                    placeholder="Ej: Campus La Nubia"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Sección: Ubicación y Contacto */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                        <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                            <span className="material-symbols-outlined text-orange-500">contact_mail</span>
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Ubicación y Contacto</h3>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Dirección Física</label>
                                    <input
                                        type="text"
                                        value={data.Direccion_Sede}
                                        onChange={e => setData('Direccion_Sede', e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-blue-500 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Conmutador / Teléfono</label>
                                    <input
                                        type="text"
                                        value={data.Conmutador_Sede}
                                        onChange={e => setData('Conmutador_Sede', e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-blue-500 transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">URL Sitio Web Oficial</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">language</span>
                                    <input
                                        type="url"
                                        value={data.Url_Sede}
                                        onChange={e => setData('Url_Sede', e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-blue-500 transition-all"
                                        placeholder="https://manizales.unal.edu.co"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end items-center gap-4 pt-4">
                        <Link href="/sedes" className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest">
                            Cancelar
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-10 py-4 bg-[#00236f] text-white rounded-2xl font-black shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all uppercase tracking-widest text-xs"
                        >
                            {processing ? 'Guardando...' : isEditing ? 'Actualizar Sede' : 'Guardar Sede'}
                        </button>
                    </div>
                </form>
            </div>
        </MainLayout>
    );
}