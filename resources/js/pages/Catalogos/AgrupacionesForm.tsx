import { Head, useForm, Link } from '@inertiajs/react';
import MainLayout from '@/Layout/MainLayout';

interface Agrupacion {
    ID_Plantilla_Agrupacion?: number;
    ID_Programa: number;
    ID_Componente: number;
    Nombre_Agrupacion: string;
    Tipo_Agrupacion: string;
    Creditos_Requeridos: number | null;
    Creditos_Maximos: number | null;
    Es_Obligatoria: boolean;
}

interface Props {
    agrupacion?: Agrupacion;
    programas: Array<{
        ID_Programa: number;
        Nombre_Programa: string;
    }>;
    componentes: Array<{
        ID_Componente: number;
        Nombre_Componente: string;
    }>;
}

export default function AgrupacionesForm({ agrupacion, programas = [], componentes = [] }: Props) {
    const isEditing = !!agrupacion?.ID_Plantilla_Agrupacion;
    
    // Migración a useForm para gestión nativa de Inertia
    const { data, setData, post, put, processing, errors } = useForm({
        ID_Programa: agrupacion?.ID_Programa || '',
        ID_Componente: agrupacion?.ID_Componente || '',
        Nombre_Agrupacion: agrupacion?.Nombre_Agrupacion || '',
        Tipo_Agrupacion: agrupacion?.Tipo_Agrupacion || '',
        Creditos_Requeridos: agrupacion?.Creditos_Requeridos || 0,
        Creditos_Maximos: agrupacion?.Creditos_Maximos || '',
        Es_Obligatoria: agrupacion?.Es_Obligatoria || false,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditing) put(`/agrupaciones/${agrupacion.ID_Plantilla_Agrupacion}`);
        else post('/agrupaciones');
    };

    return (
        <MainLayout>
            <Head title={isEditing ? 'Editar Agrupación' : 'Nueva Agrupación'} />
            
            <div className="max-w-4xl mx-auto py-10 px-4">
                <header className="mb-10 flex justify-between items-center">
                    <div>
                        <Link href="/agrupaciones" className="text-sm font-bold text-[#00236f] flex items-center gap-1 hover:underline mb-4 uppercase tracking-widest">
                            <span className="material-symbols-outlined !text-sm">arrow_back</span> Regresar
                        </Link>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
                            {isEditing ? 'Actualizar Plantilla' : 'Crear Agrupación'}
                        </h1>
                        <p className="text-slate-500 mt-2">Configura la lógica de créditos y pertenencia para la malla.</p>
                    </div>
                </header>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Bloque 1: Definición Estructural */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                        <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-600">schema</span>
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Ubicación y Nombre</h3>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Programa Académico *</label>
                                    <select 
                                        value={data.ID_Programa} 
                                        onChange={e => setData('ID_Programa', e.target.value)}
                                        className={`w-full px-4 py-3 bg-slate-50 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 transition-all ${errors.ID_Programa ? 'border-rose-300' : 'border-transparent focus:border-blue-500'}`}
                                    >
                                        <option value="">Seleccionar programa...</option>
                                        {programas.map(p => <option key={p.ID_Programa} value={p.ID_Programa}>{p.Nombre_Programa}</option>)}
                                    </select>
                                    {errors.ID_Programa && <p className="text-rose-600 text-[10px] font-bold mt-1 ml-1">{errors.ID_Programa}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Componente Curricular *</label>
                                    <select 
                                        value={data.ID_Componente} 
                                        onChange={e => setData('ID_Componente', e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-blue-500 transition-all"
                                    >
                                        <option value="">Seleccionar componente...</option>
                                        {componentes.map(c => <option key={c.ID_Componente} value={c.ID_Componente}>{c.Nombre_Componente}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre de la Agrupación *</label>
                                    <input 
                                        type="text" 
                                        value={data.Nombre_Agrupacion} 
                                        onChange={e => setData('Nombre_Agrupacion', e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-blue-500 transition-all"
                                        placeholder="Ej: Fundamentación Obligatoria"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Tipo de Agrupación</label>
                                    <input 
                                        type="text" 
                                        value={data.Tipo_Agrupacion} 
                                        onChange={e => setData('Tipo_Agrupacion', e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-blue-500 transition-all"
                                        placeholder="Ej: Obligatoria"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bloque 2: Reglas de Créditos */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                        <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-orange-500">pin</span>
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Límites y Obligatoriedad</h3>
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-blue-600 transition-colors">¿Es de carácter obligatorio?</span>
                                <div className="relative inline-flex items-center">
                                    <input 
                                        type="checkbox" 
                                        checked={data.Es_Obligatoria} 
                                        onChange={e => setData('Es_Obligatoria', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </div>
                            </label>
                        </div>
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Créditos Mínimos Requeridos</label>
                                <div className="flex items-center gap-4">
                                    <input 
                                        type="number" 
                                        value={data.Creditos_Requeridos} 
                                        onChange={e => setData('Creditos_Requeridos', Number(e.target.value))}
                                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-xl font-black text-[#00236f] focus:border-blue-500 transition-all shadow-inner"
                                    />
                                    <p className="text-[10px] text-slate-400 font-medium leading-tight">Cantidad de créditos que el estudiante DEBE cursar en esta agrupación.</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Créditos Máximos Permitidos</label>
                                <div className="flex items-center gap-4">
                                    <input 
                                        type="number" 
                                        value={data.Creditos_Maximos} 
                                        onChange={e => setData('Creditos_Maximos', e.target.value === '' ? '' : Number(e.target.value))}
                                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-xl font-black text-slate-700 focus:border-blue-500 transition-all shadow-inner"
                                        placeholder="∞"
                                    />
                                    <p className="text-[10px] text-slate-400 font-medium leading-tight">Límite superior de créditos válidos (Dejar vacío si no hay límite).</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end items-center gap-4 pt-4">
                        <Link href="/agrupaciones" className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Cancelar</Link>
                        <button 
                            type="submit" 
                            disabled={processing}
                            className="px-10 py-4 bg-[#00236f] text-white rounded-2xl font-black shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all uppercase tracking-widest text-[11px]"
                        >
                            {processing ? 'GUARDANDO...' : isEditing ? 'ACTUALIZAR PLANTILLA' : 'CREAR AGRUPACIÓN'}
                        </button>
                    </div>
                </form>
            </div>
        </MainLayout>
    );
}