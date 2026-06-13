import { Head, useForm, Link } from '@inertiajs/react';
import MainLayout from '@/Layout/MainLayout';

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
  asignatura?: Asignatura;
  errors?: Record<string, string>;
}

export default function AsignaturasForm({ asignatura }: Props) {
  const isEditing = !!asignatura;
  
  const { data, setData, post, put, processing, errors } = useForm({
    Codigo_Asignatura: asignatura?.Codigo_Asignatura || '',
    Nombre_Asignatura: asignatura?.Nombre_Asignatura || '',
    Creditos_Asignatura: asignatura?.Creditos_Asignatura || '',
    Horas_Presencial: asignatura?.Horas_Presencial || '',
    Horas_Estudiante: asignatura?.Horas_Estudiante || '',
    Descripcion_Asignatura: asignatura?.Descripcion_Asignatura || '',
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) put(`/asignaturas/${asignatura.ID_Asignatura}`);
    else post('/asignaturas');
  };

  return (
    <MainLayout>
      <Head title={isEditing ? 'Editar Asignatura' : 'Nueva Asignatura'} />
      
      <div className="max-w-4xl mx-auto py-10 px-4">
        <header className="mb-10">
          <Link href="/asignaturas" className="text-sm font-bold text-[#00236f] flex items-center gap-1 hover:underline mb-4">
            <span className="material-symbols-outlined !text-sm">arrow_back</span> Volver al catálogo
          </Link>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
            {isEditing ? 'Actualizar Contenido' : 'Registro de Asignatura'}
          </h1>
          <p className="text-slate-500 mt-2">Ingresa los datos técnicos y la carga horaria de la asignatura.</p>
        </header>

        <form onSubmit={onSubmit} className="space-y-6">
          
          {/* SECCIÓN 1: IDENTIFICACIÓN */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600">fingerprint</span>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-600">Identificación Básica</h3>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Código de Materia *</label>
                <input
                    type="text"
                    value={data.Codigo_Asignatura}
                    onChange={e => setData('Codigo_Asignatura', e.target.value)}
                    className={`w-full px-4 py-3 bg-slate-50 border-2 rounded-xl transition-all focus:ring-4 focus:ring-blue-100 ${errors.Codigo_Asignatura ? 'border-rose-300' : 'border-transparent focus:border-blue-500'}`}
                    placeholder="Ej: 1000001"
                />
                {errors.Codigo_Asignatura && <p className="text-rose-600 text-[10px] font-bold mt-1 ml-1">{errors.Codigo_Asignatura}</p>}
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nombre de la Asignatura *</label>
                <input
                    type="text"
                    value={data.Nombre_Asignatura}
                    onChange={e => setData('Nombre_Asignatura', e.target.value)}
                    className={`w-full px-4 py-3 bg-slate-50 border-2 rounded-xl transition-all focus:ring-4 focus:ring-blue-100 ${errors.Nombre_Asignatura ? 'border-rose-300' : 'border-transparent focus:border-blue-500'}`}
                    placeholder="Ej: Cálculo Diferencial"
                />
                {errors.Nombre_Asignatura && <p className="text-rose-600 text-[10px] font-bold mt-1 ml-1">{errors.Nombre_Asignatura}</p>}
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: CARGA ACADÉMICA */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-orange-500">timer</span>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Carga Horaria y Créditos</h3>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Créditos Académicos *</label>
                <input
                    type="number"
                    value={data.Creditos_Asignatura}
                    onChange={e => setData('Creditos_Asignatura', e.target.value)}
                    className={`w-full px-4 py-3 bg-slate-50 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 ${errors.Creditos_Asignatura ? 'border-rose-300' : 'border-transparent focus:border-blue-500'}`}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Horas Presenciales</label>
                <input type="number" value={data.Horas_Presencial} onChange={e => setData('Horas_Presencial', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-blue-500" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Horas Trabajo Autónomo</label>
                <input type="number" value={data.Horas_Estudiante} onChange={e => setData('Horas_Estudiante', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-blue-500" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Descripción de la Asignatura</label>
            <textarea 
                value={data.Descripcion_Asignatura} 
                onChange={e => setData('Descripcion_Asignatura', e.target.value)}
                rows={4} 
                className="w-full px-6 py-4 bg-white border border-slate-200 rounded-3xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all resize-none shadow-sm"
                placeholder="Objetivos, contenidos mínimos o justificación..."
            />
          </div>

          <div className="flex justify-end items-center gap-4 pt-4">
            <Link href="/asignaturas" className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Cancelar</Link>
            <button
                type="submit"
                disabled={processing}
                className="px-10 py-4 bg-[#00236f] text-white rounded-2xl font-black shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all uppercase tracking-widest text-[11px]"
            >
              {processing ? 'GUARDANDO...' : isEditing ? 'ACTUALIZAR' : 'CREAR ASIGNATURA'}
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}