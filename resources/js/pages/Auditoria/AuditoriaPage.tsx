import { Head, Link, router } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import MainLayout from '../../Layout/MainLayout';


interface LogActividad {
    ID_Log: number;
    ID_Usuario: number;
    Accion_Log: string;
    Entidad_Log: string;
    Entidad_ID_Log: number;
    Detalle_Log: any;
    IP_Origen_Log: string;
    Creacion_Log: string;
    usuario?: {
        ID_Usuario: number;
        Nombre_Usuario: string;
        Email_Usuario: string;
    };
}

interface Estadisticas {
    total_logs: number;
    por_accion: Array<{ Accion_Log: string; total: number }>;
    por_entidad: Array<{ Entidad_Log: string; total: number }>;
    por_usuario: Array<{ usuario: any; total: number }>;
}

interface ApiResponse {
    data: LogActividad[];
    meta?: {
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
    };
}

interface Props {
    logs: LogActividad[];
    estadisticas: Estadisticas;
    acciones: string[];
    entidades: string[];
    meta?: {
        current_page: number;
        total: number;
        per_page: number;
        last_page: number;
    };
    filters?: {
        usuario_id: string;
        accion: string;
        entidad: string;
        desde: string;
        hasta: string;
        search: string;
    };
}

export default function AuditoriaPage({ logs, estadisticas, acciones, entidades, meta, filters: serverFilters }: Props) {
    const [viewingLog, setViewingLog] = useState<LogActividad | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    // Estado local de filtros sincronizado con la URL
    const [localFilters, setLocalFilters] = useState({
        usuario_id: serverFilters?.usuario_id || '',
        accion: serverFilters?.accion || '',
        entidad: serverFilters?.entidad || '',
        desde: serverFilters?.desde || '',
        hasta: serverFilters?.hasta || '',
        search: serverFilters?.search || '',
    });

    // Función de filtrado via Inertia (La forma correcta)
    const applyFilters = () => {
        router.get('/auditoria', localFilters, {
            preserveState: true,
            replace: true,
            only: ['logs', 'estadisticas'], // Partial reload
        });
    };

    const handleExport = async () => {
        setIsExporting(true);
        // Lógica de exportación similar pero con feedback visual
        const params = new URLSearchParams(localFilters as any).toString();
        window.location.href = `/api/v1/auditoria/exportar-logs?${params}`;
        setTimeout(() => setIsExporting(false), 2000);
    };

    return (
        <MainLayout>
            <Head title="Auditoría de Operaciones" />

            <div className="max-w-[1400px] mx-auto space-y-8 pb-10">
                
                {/* 1. Header Dinámico */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-[2px] mb-1">
                            <span className="material-symbols-outlined !text-sm text-rose-600">security</span>
                            Centro de Cumplimiento
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Auditoría</h1>
                        <p className="text-slate-500 mt-2">Trazabilidad completa de cambios y accesos al sistema académico.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleExport}
                            disabled={isExporting}
                            className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined !text-xl">download</span>
                            {isExporting ? 'Generando...' : 'Exportar CSV'}
                        </button>
                        <Link 
                            href="/aprobacion" 
                            className="flex items-center gap-2 px-5 py-3 bg-[#00236f] text-white rounded-2xl font-bold shadow-lg shadow-blue-900/20 hover:scale-[1.02] transition-all"
                        >
                            <span className="material-symbols-outlined !text-xl">fact_check</span>
                            Aprobaciones
                        </Link>
                    </div>
                </div>

                {/* 2. KPIs de Actividad */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Eventos Totales', val: estadisticas.total_logs, icon: 'database', color: 'blue' },
                        { label: 'Acciones Únicas', val: estadisticas.por_accion.length, icon: 'bolt', color: 'amber' },
                        { label: 'Entidades Monitoreadas', val: estadisticas.por_entidad.length, icon: 'category', color: 'purple' },
                        { label: 'Usuarios Activos', val: estadisticas.por_usuario.length, icon: 'group', color: 'emerald' },
                    ].map((kpi, i) => (
                        <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
                            <div className={`w-12 h-12 rounded-2xl bg-${kpi.color}-50 flex items-center justify-center text-${kpi.color}-600`}>
                                <span className="material-symbols-outlined !text-3xl">{kpi.icon}</span>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{kpi.label}</p>
                                <p className="text-2xl font-black text-slate-900 mt-1">{kpi.val}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 3. Panel de Filtros Inteligente */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
                        <div className="lg:col-span-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Búsqueda rápida</label>
                            <input 
                                type="text" 
                                placeholder="Buscar en detalles o IPs..."
                                className="w-full mt-1 bg-slate-50 border-none rounded-xl text-sm py-3 focus:ring-2 focus:ring-blue-500"
                                value={localFilters.search}
                                onChange={e => setLocalFilters({...localFilters, search: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Desde</label>
                            <input type="date" className="w-full mt-1 bg-slate-50 border-none rounded-xl text-sm py-2.5" value={localFilters.desde} onChange={e => setLocalFilters({...localFilters, desde: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Hasta</label>
                            <input type="date" className="w-full mt-1 bg-slate-50 border-none rounded-xl text-sm py-2.5" value={localFilters.hasta} onChange={e => setLocalFilters({...localFilters, hasta: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Acción</label>
                            <select className="w-full mt-1 bg-slate-50 border-none rounded-xl text-sm py-2.5" value={localFilters.accion} onChange={e => setLocalFilters({...localFilters, accion: e.target.value})}>
                                <option value="">Todas</option>
                                {acciones.map((a: string) => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                        <button 
                            onClick={applyFilters}
                            className="bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all"
                        >
                            Filtrar
                        </button>
                    </div>
                </div>

                {/* 4. Tabla de Trazabilidad */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Fecha y Hora</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Actor</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Operación</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Entidad Afectada</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {logs.map((log: LogActividad) => (
                                <tr key={log.ID_Log} className="log-row">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-700">
                                                {new Date(log.Creacion_Log).toLocaleDateString('es-CO', {day:'2-digit', month:'short'})}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-medium tracking-tighter uppercase">
                                                {new Date(log.Creacion_Log).toLocaleTimeString('es-CO', {hour:'2-digit', minute:'2-digit'})}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-xs">
                                                {log.usuario?.Nombre_Usuario?.[0] || 'U'}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-800">{log.usuario?.Nombre_Usuario || 'Sistema'}</span>
                                                <span className="ip-badge w-fit mt-1">{log.IP_Origen_Log}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide uppercase border ${
                                            log.Accion_Log.includes('DELETE') ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                            log.Accion_Log.includes('CREATE') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                            'bg-blue-50 text-blue-700 border-blue-100'
                                        }`}>
                                            {log.Accion_Log.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">{log.Entidad_Log}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">ID Ref: #{log.Entidad_ID_Log}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => setViewingLog(log)}
                                            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-600 rounded-lg text-[11px] font-bold transition-all"
                                        >
                                            INSPECCIONAR
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* 5. Paginación */}
                {meta && meta.last_page > 1 && (
                    <div className="flex items-center justify-between bg-white px-6 py-4 rounded-3xl border border-slate-200 shadow-sm">
                        <p className="text-sm text-slate-500 font-medium">
                            Mostrando <span className="font-bold text-slate-700">{(meta.current_page - 1) * meta.per_page + 1}</span> a{' '}
                            <span className="font-bold text-slate-700">
                                {Math.min(meta.current_page * meta.per_page, meta.total)}
                            </span>{' '}
                            de <span className="font-bold text-slate-700">{meta.total}</span> registros
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => router.get('/auditoria', { ...localFilters, page: meta.current_page - 1 }, { preserveState: true, replace: true })}
                                disabled={meta.current_page <= 1}
                                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                ← Anterior
                            </button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: meta.last_page }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === meta.last_page || Math.abs(p - meta.current_page) <= 1)
                                    .map((p, idx, arr) => (
                                        <span key={p} className="flex items-center">
                                            {idx > 0 && arr[idx - 1] !== p - 1 && (
                                                <span className="px-1 text-slate-300 font-bold">...</span>
                                            )}
                                            <button
                                                onClick={() => router.get('/auditoria', { ...localFilters, page: p }, { preserveState: true, replace: true })}
                                                className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                                                    p === meta.current_page
                                                        ? 'bg-[#00236f] text-white shadow-md'
                                                        : 'text-slate-500 hover:bg-slate-100'
                                                }`}
                                            >
                                                {p}
                                            </button>
                                        </span>
                                    ))}
                            </div>
                            <button
                                onClick={() => router.get('/auditoria', { ...localFilters, page: meta.current_page + 1 }, { preserveState: true, replace: true })}
                                disabled={meta.current_page >= meta.last_page}
                                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                Siguiente →
                            </button>
                        </div>
                    </div>
                )}

            </div>

            {/* MODAL DE INSPECCIÓN (Sustituye al alert) */}
            {viewingLog && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-8">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 leading-tight">Detalle de Operación</h3>
                                    <p className="text-slate-500 text-sm font-medium">Log de Auditoría ID: #{viewingLog.ID_Log}</p>
                                </div>
                                <button onClick={() => setViewingLog(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                    <span className="material-symbols-outlined text-slate-400">close</span>
                                </button>
                            </div>
                            
                            <div className="bg-slate-950 p-6 rounded-3xl overflow-x-auto max-h-[400px] custom-scrollbar">
                                <pre className="text-xs leading-relaxed">
                                    <code className="text-blue-300">
                                        {JSON.stringify(viewingLog.Detalle_Log, null, 4)}
                                    </code>
                                </pre>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 flex justify-end">
                            <button 
                                onClick={() => setViewingLog(null)}
                                className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold shadow-lg"
                            >
                                CERRAR VISOR
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
}