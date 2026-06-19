import { Head, useForm, Link } from '@inertiajs/react';
import MainLayout from '@/Layout/MainLayout';

interface Programa {
  ID_Programa: number;
  Codigo_Facultad: number;
  Codigo_Programa: string;
  Nombre_Programa: string;
  Titulo_Otorgado: string | null;
  Nivel_Formacion: string | null;
  Creditos_Totales: number | null;
  Duracion_Semestres: number | null;
  Codigo_SNIES: string | null;
  Url_Programa: string | null;
  Campus_Programa: string | null;
  Conmutador: string | null;
  Extension: string | null;
  Correo: string | null;
  Area_Curricular: string | null;
  Esta_Activo: number;
}

interface Facultad {
  ID_Facultad: number;
  Codigo_Facultad: number;
  Nombre_Facultad: string;
}

interface Props {
  programa?: Programa;
  facultades: Facultad[];
  errors?: Record<string, string>;
}

export default function ProgramasForm({ programa, facultades }: Props) {
  const isEditing = !!programa;
  
  const { data, setData, post, put, processing, errors } = useForm({
    Codigo_Facultad: programa?.Codigo_Facultad?.toString() || '',
    Codigo_Programa: programa?.Codigo_Programa || '',
    Nombre_Programa: programa?.Nombre_Programa ?? '',
    Titulo_Otorgado: programa?.Titulo_Otorgado ?? '',
    Nivel_Formacion: programa?.Nivel_Formacion ?? '',
    Creditos_Totales: programa?.Creditos_Totales ?? '',
    Duracion_Semestres: programa?.Duracion_Semestres ?? '',
    Codigo_SNIES: programa?.Codigo_SNIES ?? '',
    Url_Programa: programa?.Url_Programa ?? '',
    Campus_Programa: programa?.Campus_Programa ?? '',
    Conmutador: programa?.Conmutador ?? '',
    Extension: programa?.Extension ?? '',
    Correo: programa?.Correo ?? '',
    Area_Curricular: programa?.Area_Curricular ?? '',
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing) {
put(`/programas/${programa.ID_Programa}`);
} else {
post('/programas');
}
  };

  return (
    <MainLayout>
      <Head title={isEditing ? 'Editar Programa' : 'Nuevo Programa'} />
      
      <div className="max-w-5xl mx-auto py-10 px-4">
        <header className="mb-10">
          <Link href="/programas" className="text-sm font-bold text-[#00236f] flex items-center gap-1 hover:underline mb-4">
            <span className="material-symbols-outlined !text-sm">arrow_back</span> Volver a la lista
          </Link>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
            {isEditing ? 'Actualizar Programa' : 'Registro de Programa'}
          </h1>
          <p className="text-slate-500 mt-2">Define la estructura académica y de contacto para el programa.</p>
        </header>

        <form onSubmit={onSubmit} className="space-y-8">
          
          {/* SECCIÓN 1: IDENTIFICACIÓN */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="px-8 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600">badge</span>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-600">Identificación Básica</h3>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Facultad *</label>
                <select 
                  value={data.Codigo_Facultad} 
                  onChange={e => setData('Codigo_Facultad', e.target.value)}
                  className={`w-full mt-1 px-4 py-3 bg-slate-50 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 transition-all ${errors.Codigo_Facultad ? 'border-rose-300' : 'border-transparent focus:border-blue-500'}`}
                >
                  <option value="">Seleccionar facultad...</option>
                  {facultades.map(f => <option key={f.ID_Facultad} value={f.Codigo_Facultad.toString()}>{f.Nombre_Facultad}</option>)}
                </select>
                {errors.Codigo_Facultad && <p className="text-rose-600 text-[10px] font-bold mt-1 ml-1">{errors.Codigo_Facultad}</p>}
              </div>
              <div className="lg:col-span-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre del Programa *</label>
                <input 
                  type="text" 
                  value={data.Nombre_Programa} 
                  onChange={e => setData('Nombre_Programa', e.target.value)}
                  className={`w-full mt-1 px-4 py-3 bg-slate-50 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 transition-all ${errors.Nombre_Programa ? 'border-rose-300' : 'border-transparent focus:border-blue-500'}`}
                />
                {errors.Nombre_Programa && <p className="text-rose-600 text-[10px] font-bold mt-1 ml-1">{errors.Nombre_Programa}</p>}
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Código SIA *</label>
                <input type="text" value={data.Codigo_Programa} onChange={e => setData('Codigo_Programa', e.target.value)} className="w-full mt-1 px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-blue-500" />
                {errors.Codigo_Programa && <p className="text-rose-600 text-[10px] font-bold mt-1 ml-1">{errors.Codigo_Programa}</p>}
              </div>
              <div className="lg:col-span-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Título que Otorga</label>
                <input type="text" value={data.Titulo_Otorgado} onChange={e => setData('Titulo_Otorgado', e.target.value)} className="w-full mt-1 px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-blue-500" />
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: ESPECIFICACIONES ACADÉMICAS */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="px-8 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-600">terminal</span>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-600">Parámetros Académicos</h3>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nivel</label>
                 <select value={data.Nivel_Formacion} onChange={e => setData('Nivel_Formacion', e.target.value)} className="w-full mt-1 px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-blue-500">
                   <option value="">Seleccionar nivel...</option>
                   <option value="pregrado">Pregrado</option>
                   <option value="maestria">Maestría</option>
                   <option value="doctorado">Doctorado</option>
                 </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Créditos Totales</label>
                <input type="number" value={data.Creditos_Totales} onChange={e => setData('Creditos_Totales', e.target.value)} className="w-full mt-1 px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-blue-500" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Duración (Sem)</label>
                <input type="number" value={data.Duracion_Semestres} onChange={e => setData('Duracion_Semestres', e.target.value)} className="w-full mt-1 px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-blue-500" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Código SNIES</label>
                <input type="text" value={data.Codigo_SNIES} onChange={e => setData('Codigo_SNIES', e.target.value)} className="w-full mt-1 px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-blue-500" />
              </div>
            </div>
          </div>

          <div className="flex justify-end items-center gap-4 pt-4">
            <Link href="/programas" className="text-sm font-bold text-slate-400 uppercase tracking-widest">Cancelar</Link>
            <button 
              type="submit" 
              disabled={processing}
              className="px-10 py-4 bg-[#00236f] text-white rounded-2xl font-black shadow-xl shadow-blue-900/20 hover:scale-[1.02] disabled:opacity-50 transition-all uppercase tracking-widest text-xs"
            >
              {processing ? 'Guardando...' : isEditing ? 'Actualizar Programa' : 'Crear Programa'}
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}