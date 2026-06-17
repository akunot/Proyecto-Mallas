import { Head, useForm, Link } from '@inertiajs/react';
import MainLayout from '@/Layout/MainLayout';

interface Normativa {
  ID_Normativa: number;
  Codigo_Programa: number;
  Tipo_Normativa: string;
  Numero_Normativa: string;
  Anio_Normativa: number;
  Instancia: string;
  Descripcion_Normativa: string | null;
  Url_Normativa: string | null;
  Esta_Activo: number;
}

interface Programa {
  ID_Programa: number;
  Codigo_Programa: number;
  Nombre_Programa: string;
}

interface Props {
  normativa?: Normativa;
  programas: Programa[];
  errors?: Record<string, string>;
}

export default function NormativasForm({ normativa, programas }: Props) {
  const isEditing = !!normativa;
  
  const { data, setData, post, put, processing, errors } = useForm({
    Codigo_Programa: normativa?.Codigo_Programa?.toString() || '',
    Tipo_Normativa: normativa?.Tipo_Normativa || 'Acuerdo',
    Numero_Normativa: normativa?.Numero_Normativa || '',
    Anio_Normativa: normativa?.Anio_Normativa?.toString() || new Date().getFullYear().toString(),
    Instancia: normativa?.Instancia || '',
    Descripcion_Normativa: normativa?.Descripcion_Normativa || '',
    Url_Normativa: normativa?.Url_Normativa || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) put(`/normativas/${normativa.ID_Normativa}`);
    else post('/normativas');
  };

  return (
    <MainLayout>
      <Head title={isEditing ? 'Editar Normativa' : 'Nueva Normativa'} />
      
      <div className="max-w-4xl mx-auto py-10 px-4">
        <header className="mb-10">
          <Link href="/normativas" className="text-sm font-bold text-[#00236f] flex items-center gap-1 hover:underline mb-4">
            <span className="material-symbols-outlined !text-sm">arrow_back</span> Volver
          </Link>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
            {isEditing ? 'Actualizar Normativa' : 'Registro de Normativa'}
          </h1>
          <p className="text-slate-500 mt-2">Define los parámetros legales que rigen el programa académico.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bloque 1: El Documento */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest text-slate-400">
                <span className="material-symbols-outlined !text-sm">history_edu</span>
                Definición del Documento
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Tipo de Acto *</label>
                    <select 
                        value={data.Tipo_Normativa} 
                        onChange={e => setData('Tipo_Normativa', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-blue-500 transition-all focus:ring-4 focus:ring-blue-100"
                    >
                        <option value="Acuerdo">Acuerdo</option>
                        <option value="Resolución">Resolución</option>
                        <option value="Decreto">Decreto</option>
                        <option value="Circular">Circular</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Número *</label>
                    <input 
                        type="text" 
                        value={data.Numero_Normativa} 
                        onChange={e => setData('Numero_Normativa', e.target.value)}
                        className={`w-full px-4 py-3 bg-slate-50 border-2 rounded-xl transition-all focus:ring-4 focus:ring-blue-100 ${errors.Numero_Normativa ? 'border-rose-300 bg-rose-50' : 'border-transparent focus:border-blue-500'}`}
                        placeholder="Ej: 025"
                    />
                    {errors.Numero_Normativa && <p className="text-rose-600 text-[10px] font-bold mt-1 ml-1">{errors.Numero_Normativa}</p>}
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Año *</label>
                    <input 
                        type="number" 
                        value={data.Anio_Normativa} 
                        onChange={e => setData('Anio_Normativa', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-blue-500 transition-all focus:ring-4 focus:ring-blue-100"
                    />
                </div>
            </div>
          </div>

          {/* Bloque 2: Contexto y Soporte */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest text-slate-400">
                <span className="material-symbols-outlined !text-sm">account_balance</span>
                Contexto y Soporte
            </div>
            <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Programa Académico *</label>
                        <select 
                            value={data.Codigo_Programa} 
                            onChange={e => setData('Codigo_Programa', e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-blue-500 transition-all focus:ring-4 focus:ring-blue-100"
                        >
                            <option value="">Seleccionar...</option>
                            {programas.map(p => <option key={p.Codigo_Programa.toString()} value={p.Codigo_Programa.toString()}>{p.Nombre_Programa}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Instancia Emisora *</label>
                        <input 
                            type="text" 
                            value={data.Instancia} 
                            onChange={e => setData('Instancia', e.target.value)}
                            placeholder="Ej: Consejo de Facultad"
                            className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-blue-500 transition-all"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">URL del Documento (PDF/Web)</label>
                    <input 
                        type="url" 
                        value={data.Url_Normativa} 
                        onChange={e => setData('Url_Normativa', e.target.value)}
                        placeholder="https://..."
                        className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-blue-500 transition-all"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Descripción / Notas</label>
                    <textarea 
                        value={data.Descripcion_Normativa} 
                        onChange={e => setData('Descripcion_Normativa', e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-blue-500 transition-all resize-none"
                        placeholder="Resumen del contenido de la normativa..."
                    />
                </div>
            </div>
          </div>

          <div className="flex justify-end items-center gap-4 pt-4">
            <Link href="/normativas" className="text-sm font-bold text-slate-400 uppercase tracking-widest">Cancelar</Link>
            <button 
              type="submit" 
              disabled={processing}
              className="px-10 py-4 bg-[#00236f] text-white rounded-2xl font-black shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all uppercase tracking-widest text-xs"
            >
              {processing ? 'Guardando...' : isEditing ? 'Actualizar Normativa' : 'Crear Normativa'}
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}