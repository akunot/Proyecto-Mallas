import { Head, useForm, Link } from '@inertiajs/react';
import MainLayout from '@/Layout/MainLayout';

interface Usuario {
  ID_Usuario: number;
  Nombre_Usuario: string;
  Email_Usuario: string;
}

interface Props {
  usuario?: Usuario;
}

export default function UsuariosForm({ usuario }: Props) {
  const isEditing = !!usuario;
  
  // Uso de useForm para manejo nativo de Inertia
  const { data, setData, post, put, processing, errors } = useForm({
    Nombre_Usuario: usuario?.Nombre_Usuario || '',
    Email_Usuario: usuario?.Email_Usuario || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing) {
      put(`/usuarios/${usuario.ID_Usuario}`);
    } else {
      post('/usuarios');
    }
  };

  return (
    <MainLayout>
      <Head title={isEditing ? 'Editar Usuario' : 'Nuevo Usuario'} />
      
      <div className="max-w-2xl mx-auto py-10">
        <div className="mb-8">
            <Link href="/usuarios" className="text-sm font-bold text-[#00236f] flex items-center gap-1 hover:underline mb-4">
                <span className="material-symbols-outlined !text-sm">arrow_back</span>
                Volver a la lista
            </Link>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                {isEditing ? 'Actualizar Perfil' : 'Crear nuevo acceso'}
            </h1>
            <p className="text-slate-500">Completa la información para gestionar el acceso al sistema.</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
            <form onSubmit={handleSubmit}>
                <div className="p-8 space-y-6">
                    {/* Input Nombre */}
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Nombre Completo</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">person</span>
                            <input
                                type="text"
                                value={data.Nombre_Usuario}
                                onChange={e => setData('Nombre_Usuario', e.target.value)}
                                className={`w-full pl-10 pr-4 py-3 bg-slate-50 border-2 rounded-xl transition-all focus:ring-4 focus:ring-blue-100 ${
                                    errors.Nombre_Usuario ? 'border-rose-300 bg-rose-50' : 'border-transparent focus:border-blue-500'
                                }`}
                                placeholder="Ej: Juan Pérez"
                            />
                        </div>
                        {errors.Nombre_Usuario && <p className="text-rose-600 text-xs font-bold mt-1 ml-1">{errors.Nombre_Usuario}</p>}
                    </div>

                    {/* Input Email */}
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Correo Institucional</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">mail</span>
                            <input
                                type="email"
                                value={data.Email_Usuario}
                                onChange={e => setData('Email_Usuario', e.target.value)}
                                className={`w-full pl-10 pr-4 py-3 bg-slate-50 border-2 rounded-xl transition-all focus:ring-4 focus:ring-blue-100 ${
                                    errors.Email_Usuario ? 'border-rose-300 bg-rose-50' : 'border-transparent focus:border-blue-500'
                                }`}
                                placeholder="usuario@unal.edu.co"
                            />
                        </div>
                        {errors.Email_Usuario && <p className="text-rose-600 text-xs font-bold mt-1 ml-1">{errors.Email_Usuario}</p>}
                    </div>
                </div>

                {/* Footer del Formulario */}
                <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
                    <Link 
                        href="/usuarios" 
                        className="px-6 py-3 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        CANCELAR
                    </Link>
                    <button
                        type="submit"
                        disabled={processing}
                        className="px-10 py-3 bg-[#00236f] text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all"
                    >
                        {processing ? 'GUARDANDO...' : isEditing ? 'ACTUALIZAR' : 'CREAR USUARIO'}
                    </button>
                </div>
            </form>
        </div>
      </div>
    </MainLayout>
  );
}