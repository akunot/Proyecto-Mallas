import { Head, Link } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import MainLayout from '../../Layout/MainLayout';
import apiClient from '../../api/client';

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
}

export default function AuditoriaPage({ logs: initialLogs, estadisticas, acciones, entidades }: Props) {
    const [logs, setLogs] = useState<LogActividad[]>(initialLogs);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        usuario_id: '',
        accion: '',
        entidad: '',
        desde: '',
        hasta: '',
        search: '',
        page: '1',
    });

    const [pagination, setPagination] = useState({
        current_page: 1,
        per_page: 20,
        total: initialLogs.length,
        last_page: 1,
    });

    // Solo buscar por API cuando hay filtros activos (no en carga inicial)
    useEffect(() => {
        const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
            if (key === 'page' && value === '1') return false;
            return value !== '';
        });

        if (hasActiveFilters) {
            fetchLogs();
        }
    }, [filters]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });

            const response = await apiClient.get<ApiResponse>(`/auditoria/logs?${params.toString()}`);
            setLogs(response.data);
            setPagination({
                current_page: response.meta?.current_page || 1,
                per_page: response.meta?.per_page || 20,
                total: response.meta?.total || 0,
                last_page: response.meta?.last_page || 1,
            });
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (field: string, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const exportLogs = async () => {
        try {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });

            // Usar fetch directo para descargar blob (apiClient no soporta responseType)
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            const response = await fetch(`/api/v1/auditoria/exportar-logs?${params.toString()}`, {
                headers: {
                    'Accept': 'text/csv',
                    'X-CSRF-TOKEN': token || '',
                },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `logs_actividad_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting logs:', error);
        }
    };

    const getAccionColor = (accion: string) => {
        const colors: Record<string, string> = {
            'CREATE': 'bg-green-100 text-green-800',
            'UPDATE': 'bg-blue-100 text-blue-800',
            'DELETE': 'bg-red-100 text-red-800',
            'LOGIN': 'bg-purple-100 text-purple-800',
            'LOGOUT': 'bg-gray-100 text-gray-800',
            'UPLOAD_EXCEL': 'bg-yellow-100 text-yellow-800',
            'APROBAR_MALLA': 'bg-emerald-100 text-emerald-800',
            'RECHAZAR_MALLA': 'bg-orange-100 text-orange-800',
        };
        return colors[accion] || 'bg-gray-100 text-gray-800';
    };

    return (
        <MainLayout>
            <Head title="Auditoría del Sistema" />
            
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Auditoría del Sistema</h1>
                        <p className="text-sm text-gray-500">Registro de todas las actividades del sistema</p>
                    </div>
                    <div className="flex space-x-3">
                        <Link
                            href="/aprobacion"
                            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                        >
                            Ver Aprobaciones
                        </Link>
                        <button
                            onClick={exportLogs}
                            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                        >
                            Exportar CSV
                        </button>
                    </div>
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-3 bg-blue-100 rounded-full">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Total Logs</p>
                                <p className="text-2xl font-semibold text-gray-900">{estadisticas.total_logs}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-3 bg-green-100 rounded-full">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Acciones</p>
                                <p className="text-2xl font-semibold text-gray-900">{estadisticas.por_accion.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-3 bg-purple-100 rounded-full">
                                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Entidades</p>
                                <p className="text-2xl font-semibold text-gray-900">{estadisticas.por_entidad.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-3 bg-orange-100 rounded-full">
                                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Usuarios</p>
                                <p className="text-2xl font-semibold text-gray-900">{estadisticas.por_usuario.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filtros */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Filtros</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Usuario ID</label>
                            <input
                                type="text"
                                value={filters.usuario_id}
                                onChange={(e) => handleFilterChange('usuario_id', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="ID Usuario"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Acción</label>
                            <select
                                value={filters.accion}
                                onChange={(e) => handleFilterChange('accion', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Todas</option>
                                {acciones.map(accion => (
                                    <option key={accion} value={accion}>{accion}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Entidad</label>
                            <select
                                value={filters.entidad}
                                onChange={(e) => handleFilterChange('entidad', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Todas</option>
                                {entidades.map(entidad => (
                                    <option key={entidad} value={entidad}>{entidad}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
                            <input
                                type="date"
                                value={filters.desde}
                                onChange={(e) => handleFilterChange('desde', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
                            <input
                                type="date"
                                value={filters.hasta}
                                onChange={(e) => handleFilterChange('hasta', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
                            <input
                                type="text"
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Buscar..."
                            />
                        </div>
                    </div>
                </div>

                {/* Tabla de Logs */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Registro de Actividad</h2>
                    </div>
                    
                    {loading ? (
                        <div className="px-6 py-12 text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            <p className="mt-2 text-gray-500">Cargando...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Fecha/Hora
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Usuario
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Acción
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Entidad
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            IP Origen
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Detalles
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {logs.map((log) => (
                                        <tr key={log.ID_Log} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {log.Creacion_Log ? new Date(log.Creacion_Log).toLocaleString('es-CO') : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {log.usuario?.Nombre_Usuario || `Usuario ${log.ID_Usuario}`}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAccionColor(log.Accion_Log)}`}>
                                                    {log.Accion_Log}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {log.Entidad_Log} #{log.Entidad_ID_Log}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {log.IP_Origen_Log}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                <button
                                                    onClick={() => alert(JSON.stringify(log.Detalle_Log, null, 2))}
                                                    className="text-indigo-600 hover:text-indigo-900 font-medium"
                                                >
                                                    Ver detalles
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Paginación */}
                    <div className="px-6 py-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-700">
                                Mostrando {logs.length} de {pagination.total} resultados
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => handleFilterChange('page', String(Math.max(1, pagination.current_page - 1)))}
                                    disabled={pagination.current_page === 1}
                                    className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
                                >
                                    Anterior
                                </button>
                                <span className="px-3 py-1">
                                    Página {pagination.current_page}
                                </span>
                                <button
                                    onClick={() => handleFilterChange('page', String(pagination.current_page + 1))}
                                    disabled={logs.length < pagination.per_page}
                                    className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
