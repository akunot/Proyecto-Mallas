import { Head, useForm, Link } from '@inertiajs/react';
import MainLayout from '@/Layout/MainLayout';

interface Componente {
  ID_Componente: number;
  Nombre_Componente: string;
  Descripcion_Componente: string | null;
}

interface Props {
  componente?: Componente;
  errors?: Record<string, string>;
}

export default function ComponentesForm({ componente }: Props) {
  const isEditing = !!componente;
  
  const { data, setData, post, put, processing, errors } = useForm({
    Nombre_Componente: componente?.Nombre_Componente || '',
    Descripcion_Componente: componente?.Descripcion_Componente || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      put(`/componentes/${componente.ID_Componente}`);
    } else {
      post('/componentes');
    }
  };

  return (
    <MainLayout>
      <Head title={isEditing ? 'Editar Componente' : 'Nuevo Componente'} />
      
      <div className="max-w-4xl mx-auto py-10 px-4">
        <header className="mb-10">
          <Link href="/componentes" className="text-sm font-bold text-[#00236f] flex items-center gap-1 hover:underline mb-4">
            <span className="material-symbols-outlined !text-sm">arrow_back</span> Volver a componentes
          </Link>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
            {isEditing ? 'Actualizar Componente' : 'Nuevo Componente'}
          </h1>
          <p className="text-slate-500 mt-2">{isEditing ? 'Modifica el componente curricular.' : 'Registra un nuevo componente en el sistema.'}</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600">widgets</span>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Datos del Componente</h3>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nombre del Componente *</label>
                <input
                  type="text"
                  value={data.Nombre_Componente}
                  onChange={e => setData('Nombre_Componente', e.target.value)}
                  className={`w-full px-4 py-3 bg-slate-50 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 transition-all ${errors.Nombre_Componente ? 'border-rose-300 bg-rose-50' : 'border-transparent focus:border-blue-500'}`}
                  placeholder="Ej: Fundamentación"
                />
                {errors.Nombre_Componente && <p className="text-rose-600 text-[10px] font-bold mt-1 ml-1">{errors.Nombre_Componente}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Descripción</label>
                <textarea
                  value={data.Descripcion_Componente}
                  onChange={e => setData('Descripcion_Componente', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-blue-500 transition-all resize-none"
                  placeholder="Descripción del componente curricular..."
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end items-center gap-4 pt-4">
            <Link href="/componentes" className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={processing}
              className="px-10 py-4 bg-[#00236f] text-white rounded-2xl font-black shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all uppercase tracking-widest text-[11px]"
            >
              {processing ? 'GUARDANDO...' : isEditing ? 'ACTUALIZAR COMPONENTE' : 'CREAR COMPONENTE'}
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}