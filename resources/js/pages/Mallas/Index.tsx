import { Head, Link } from '@inertiajs/react';
import React from 'react';
import Layout from '@/Layout/MainLayout';

// --- Interfaces ---
interface Malla {
    ID_Malla: number;
    ID_Programa: number;
    Fecha_Vigencia: string;
    Estado: string;
    programa?: { Nombre_Programa: string };
}

interface Props {
    mallas: {
        data: Malla[];
        meta: { current_page: number; last_page: number; total: number; };
    };
}

// --- Componentes Internos de UI ---
const StatusBadge = ({ estado }: { estado: string }) => {
    const config: Record<string, { color: string; label: string }> = {
        ACTIVO:      { color: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20', label: 'Activo' },
        BORRADOR:    { color: 'bg-amber-100 text-amber-700 ring-amber-600/20', label: 'Borrador' },
        INACTIVO:    { color: 'bg-rose-100 text-rose-700 ring-rose-600/20', label: 'Inactivo' },
        PENDIENTE:   { color: 'bg-indigo-100 text-indigo-700 ring-indigo-600/20', label: 'Pendiente' },
    };
    const c = config[estado] || { color: 'bg-slate-100 text-slate-600 ring-slate-600/20', label: estado };
    
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ring-1 ring-inset ${c.color}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {c.label}
        </span>
    );
};

export default function MallasIndex({ mallas }: Props) {
    // Lógica de Negocio para el Dashboard
    const total = mallas.meta?.total || mallas.data.length;
    const activas = mallas.data.filter(m => m.Estado === 'ACTIVO').length;
    const borradores = mallas.data.filter(m => m.Estado === 'BORRADOR').length;

    return (
        <Layout>
            <Head title="Gestión de Mallas Curriculares" />

            <div className="max-w-[1400px] mx-auto space-y-8 pb-10">
                
                {/* Header con Branding e IA Principal */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest">
                            <span className="material-symbols-outlined !text-sm">school</span>
                            Gestión Académica
                            <span className="material-symbols-outlined !text-xs">chevron_right</span>
                            <span className="text-[#00236f]">Mallas</span>
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                            Mallas Curriculares
                        </h1>
                        <p className="text-slate-500 max-w-2xl">
                            Panel centralizado para la administración de planes de estudio y vigencias normativas de la sede.
                        </p>
                    </div>
                    
                    <Link
                        href="/cargas"
                        className="flex items-center gap-2 px-6 py-3 bg-[#00236f] text-white rounded-xl font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-blue-900/20"
                    >
                        <span className="material-symbols-outlined">add_box</span>
                        Cargar Nueva Malla
                    </Link>
                </div>

                {/* Tabla de Datos Estilizada */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-8 py-5 text-[11px] font-black text-slate-500 uppercase tracking-wider">Identificador</th>
                                    <th className="px-8 py-5 text-[11px] font-black text-slate-500 uppercase tracking-wider">Programa Académico</th>
                                    <th className="px-8 py-5 text-[11px] font-black text-slate-500 uppercase tracking-wider text-center">Fecha Vigencia</th>
                                    <th className="px-8 py-5 text-[11px] font-black text-slate-500 uppercase tracking-wider text-center">Estado</th>
                                    <th className="px-8 py-5 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {mallas.data.map((malla) => (
                                    <tr key={malla.ID_Malla} className="group hover:bg-slate-50/80 transition-all duration-200">
                                        <td className="px-8 py-5">
                                            <span className="px-2 py-1 bg-blue-50 text-[#00236f] rounded-lg text-xs font-mono font-bold border border-blue-100">
                                                MAL-{malla.ID_Malla.toString().padStart(4, '0')}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-sm font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                                                {malla.programa?.Nombre_Programa || 'Programa no definido'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-sm text-slate-600 font-medium">
                                                    {malla.Fecha_Vigencia ? new Date(malla.Fecha_Vigencia).toLocaleDateString('es-CO') : '—'}
                                                </span>
                                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Calendario SIA</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <StatusBadge estado={malla.Estado} />
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <Link
                                                href={`/mallas/${malla.ID_Malla}`}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-[#00236f] hover:text-white transition-all group/btn"
                                            >
                                                Gestionar
                                                <span className="material-symbols-outlined !text-sm group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginación Moderna */}
                    {mallas.meta && (
                        <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                Mostrando <span className="text-slate-900">{mallas.data.length}</span> de <span className="text-slate-900">{mallas.meta.total}</span> mallas
                            </span>
                            
                            <div className="flex items-center gap-1">
                                <button disabled={mallas.meta.current_page <= 1} className="p-2 text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-colors">
                                    <span className="material-symbols-outlined">chevron_left</span>
                                </button>
                                
                                {Array.from({ length: Math.min(mallas.meta.last_page, 5) }, (_, i) => i + 1).map((page) => (
                                    <button
                                        key={page}
                                        className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${
                                            page === mallas.meta.current_page 
                                            ? 'bg-[#00236f] text-white shadow-lg shadow-blue-900/20' 
                                            : 'text-slate-400 hover:bg-slate-200'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                                
                                <button disabled={mallas.meta.current_page >= mallas.meta.last_page} className="p-2 text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-colors">
                                    <span className="material-symbols-outlined">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}