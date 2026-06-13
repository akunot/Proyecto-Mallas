import { Head, Link } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import MainLayout from '../Layout/MainLayout';
import apiClient from '../api/client';

interface CargaMalla {
    ID_Carga: number;
    ID_Programa: number;
    ID_Normativa: number;
    ID_Malla: number;
    ID_Malla_Base?: number;
    ID_Usuario: number;
    Estado_Carga: string;
    Comentario_Carga: string;
    Creacion_Carga: string;
    usuario?: {
        ID_Usuario: number;
        Nombre_Usuario: string;
        Email_Usuario: string;
    };
    programa?: {
        ID_Programa: number;
        Nombre_Programa: string;
    };
    malla?: {
        ID_Malla: number;
        Version_Numero: number;
        Version_Etiqueta: string;
        Estado: string;
    };
}

interface Props {
    sedesCount: number;
    facultadesCount: number;
    programasCount: number;
    asignaturasCount: number;
    mallasCount: number;
    usuariosCount: number;
    normativasCount: number;
    componentesCount: number;
    agrupacionesCount: number;
    cargasPendientes: number;
    cargasRecientes: Array<{
        id: number;
        estado: string;
        malla: string;
        programa: string;
        usuario: string;
        fecha: string;
    }>;
}

const statCards = [
    { label: 'Mallas Totales', value: 'mallasCount' as const, icon: 'grid_on', bg: '#eef2ff', color: '#3730a3' },
    { label: 'Programas', value: 'programasCount' as const, icon: 'school', bg: '#f3e8ff', color: '#6b21a8' },
    { label: 'Asignaturas', value: 'asignaturasCount' as const, icon: 'menu_book', bg: '#fff7ed', color: '#9a3412' },
    { label: 'Facultades', value: 'facultadesCount' as const, icon: 'account_balance', bg: '#eff6ff', color: '#1e40af' },
    { label: 'Usuarios', value: 'usuariosCount' as const, icon: 'group', bg: '#f0fdfa', color: '#115e59' },
    { label: 'Sedes', value: 'sedesCount' as const, icon: 'apartment', bg: '#f0fdf4', color: '#15803d' },
    { label: 'Normativas', value: 'normativasCount' as const, icon: 'gavel', bg: '#fdf2f8', color: '#9d174d' },
    { label: 'Agrupaciones', value: 'agrupacionesCount' as const, icon: 'category', bg: '#fef9c3', color: '#854d0e' },
];

const quickActions = [
    { label: 'Gestionar Sedes', href: '/sedes', icon: 'apartment' },
    { label: 'Gestionar Facultades', href: '/facultades', icon: 'account_balance' },
    { label: 'Gestionar Programas', href: '/programas', icon: 'school' },
    { label: 'Gestionar Asignaturas', href: '/asignaturas', icon: 'menu_book' },
    { label: 'Cargar Archivos', href: '/cargas', icon: 'upload_file' },
    { label: 'Auditoría', href: '/auditoria', icon: 'history_edu' },
];

/**
 * Paleta de estados mejorada para cumplimiento WCAG AA
 * Colores más oscuros con mejor contraste (ratio > 4.5:1)
 */
const getEstadoColor = (estado: string) => {
    const colors: Record<string, string> = {
        'borrador': 'bg-slate-100 text-slate-700',
        'listo_para_procesar': 'bg-blue-100 text-blue-700',
        'iniciado': 'bg-amber-100 text-amber-700',
        'validando': 'bg-orange-100 text-orange-700',
        'pendiente_aprobacion': 'bg-violet-100 text-violet-700',
        'aprobado': 'bg-emerald-100 text-emerald-700',
        'rechazado': 'bg-rose-100 text-rose-700',
        'con_errores': 'bg-rose-100 text-rose-700',
    };
    return colors[estado] || 'bg-slate-100 text-slate-700';
};

/**
 * Dots de estado con colores más vibrantes para mejor visibilidad
 */
const getEstadoDot = (estado: string) => {
    const dots: Record<string, string> = {
        'borrador': '#64748b',
        'listo_para_procesar': '#2563eb',
        'iniciado': '#d97706',
        'validando': '#ea580c',
        'pendiente_aprobacion': '#7c3aed',
        'aprobado': '#059669',
        'rechazado': '#dc2626',
        'con_errores': '#dc2626',
    };
    return dots[estado] || '#64748b';
};

export default function Dashboard({
    sedesCount, facultadesCount, programasCount, asignaturasCount,
    mallasCount, usuariosCount, normativasCount, agrupacionesCount, cargasPendientes,
}: Props) {
    const [cargasRecientes, setCargasRecientes] = useState<CargaMalla[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchCargasRecientes(); }, []);

    const fetchCargasRecientes = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get<{ data: CargaMalla[] }>('/aprobacion/mis-cargas');
            const filtradas = (response.data || []).filter(c => c.programa?.ID_Programa);
            const recientes = filtradas.sort((a, b) => 
                new Date(b.Creacion_Carga).getTime() - new Date(a.Creacion_Carga).getTime()
            ).slice(0, 6); // Aumentado a 6 para mejor equilibrio visual
            setCargasRecientes(recientes);
        } catch (error) {
            console.error('Error fetching cargas recientes:', error);
        } finally {
            setLoading(false);
        }
    };

    const counts: Record<string, number> = {
        mallasCount, programasCount, asignaturasCount, facultadesCount,
        usuariosCount, sedesCount, normativasCount, agrupacionesCount,
    };

    return (
        <MainLayout>
            <Head title="Panel Principal" />

            <div className="max-w-[1400px] mx-auto space-y-8">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Panel de Control</h1>
                        <p className="text-slate-500 mt-1">Gestión integral de mallas y programas académicos.</p>
                    </div>
                    <Link
                        href="/cargas"
                        className="btn-primary-action px-6 py-3 rounded-xl shadow-lg shadow-blue-900/20 flex items-center gap-2 font-semibold transition-transform active:scale-95"
                    >
                        <span className="material-symbols-outlined !text-xl">add_circle</span>
                        Nueva Malla
                    </Link>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    
                    {/* Tarjeta de Acción Requerida (Alta Prioridad) */}
                    <div className={`md:col-span-4 lg:col-span-3 p-6 rounded-2xl border-2 flex flex-col justify-between min-h-[180px] transition-all
                        ${cargasPendientes > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`material-symbols-outlined ${cargasPendientes > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                    {cargasPendientes > 0 ? 'priority_high' : 'check_circle'}
                                </span>
                                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Pendientes</span>
                            </div>
                            <h3 className="text-slate-900 font-bold text-lg leading-tight">Acciones que requieren atención</h3>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-5xl font-black ${cargasPendientes > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                {cargasPendientes}
                            </span>
                            <span className="text-slate-500 font-medium">solicitudes</span>
                        </div>
                    </div>

                    {/* Grid de Métricas Secundarias */}
                    <div className="md:col-span-8 lg:col-span-9 grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {statCards.map((card) => (
                            <div key={card.label} className="dashboard-card p-4 flex flex-col gap-3 group cursor-default">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
                                     style={{ backgroundColor: card.bg, color: card.color }}>
                                    <span className="material-symbols-outlined">{card.icon}</span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{card.label}</p>
                                    <p className="metric-value-text group-hover:text-[#00236f] transition-colors">
                                        {counts[card.value] || 0}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content Areas */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Lista de Cargas Recientes (2/3) */}
                    <div className="lg:col-span-2 dashboard-card overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-blue-600">history</span>
                                <h3 className="font-bold text-slate-800">Actividad Reciente</h3>
                            </div>
                            <Link href="/cargas" className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1">
                                Ver todo
                                <span className="material-symbols-outlined !text-sm">arrow_forward</span>
                            </Link>
                        </div>

                        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                            {loading ? (
                                <div className="p-20 flex flex-col items-center justify-center gap-4">
                                    <div className="spinner border-4 border-blue-100 border-t-blue-600 w-10 h-10 rounded-full animate-spin"></div>
                                    <p className="text-slate-400 font-medium text-sm">Actualizando datos...</p>
                                </div>
                            ) : cargasRecientes.length > 0 ? (
                                <div className="divide-y divide-slate-100">
                                    {cargasRecientes.map((carga) => (
                                        <div key={carga.ID_Carga} className="p-5 hover:bg-slate-50 transition-colors flex items-start gap-4">
                                            <div className="mt-1">
                                                <div className="w-2.5 h-2.5 rounded-full" 
                                                     style={{ backgroundColor: getEstadoDot(carga.Estado_Carga), boxShadow: `0 0 10px ${getEstadoDot(carga.Estado_Carga)}60` }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-4 mb-1">
                                                    <h4 className="font-bold text-slate-900 truncate">
                                                        {carga.malla?.Version_Etiqueta || carga.programa?.Nombre_Programa}
                                                    </h4>
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${getEstadoColor(carga.Estado_Carga)}`}>
                                                        {carga.Estado_Carga.replace(/_/g, ' ')}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-500 mb-2">
                                                    <span className="font-medium text-slate-700">{carga.programa?.Nombre_Programa}</span> • {carga.usuario?.Nombre_Usuario}
                                                </p>
                                                <div className="flex items-center gap-3 text-xs text-slate-400">
                                                    <time className="flex items-center gap-1">
                                                        <span className="material-symbols-outlined !text-xs">calendar_today</span>
                                                        {new Date(carga.Creacion_Carga).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                                                    </time>
                                                    {carga.Comentario_Carga && (
                                                        <span className="flex items-center gap-1 truncate italic">
                                                            <span className="material-symbols-outlined !text-xs">chat_bubble_outline</span>
                                                            {carga.Comentario_Carga}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-20 text-center">
                                    <span className="material-symbols-outlined text-slate-200 !text-6xl mb-4">inbox</span>
                                    <p className="text-slate-500 font-medium">No hay actividad reciente en el sistema.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Acciones Rápidas (1/3) */}
                    <div className="space-y-6">
                        <section className="dashboard-card p-6">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-orange-500">bolt</span>
                                Accesos Directos
                            </h3>
                            <div className="grid grid-cols-1 gap-2">
                                {quickActions.map((action) => (
                                    <Link key={action.label} href={action.href} className="quick-action-btn group">
                                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-[#00236f] group-hover:text-white transition-all">
                                            <span className="material-symbols-outlined">{action.icon}</span>
                                        </div>
                                        <span className="flex-1 font-semibold text-slate-700 group-hover:text-[#00236f]">{action.label}</span>
                                        <span className="material-symbols-outlined text-slate-300 group-hover:translate-x-1 transition-transform">chevron_right</span>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}