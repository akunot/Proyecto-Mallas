import { Head, Link } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import MainLayout from '../../Layout/MainLayout';
import apiClient from '../../api/client';

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
    pendientes: CargaMalla[];
    misCargas: CargaMalla[];
}

export default function AprobacionPage({ pendientes: initialPendientes, misCargas: initialMisCargas }: Props) {
    const [pendientes, setPendientes] = useState<CargaMalla[]>(initialPendientes);
    const [misCargas, setMisCargas] = useState<CargaMalla[]>(initialMisCargas);
    const [selectedCarga, setSelectedCarga] = useState<CargaMalla | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'pendientes' | 'mis-cargas'>('mis-cargas');
    const [reviewForm, setReviewForm] = useState({
        accion: 'aprobar' as 'aprobar' | 'rechazar',
        comentario: '',
    });

    // Filtrar datos iniciales y cargar cargas en el montaje
    useEffect(() => {
        const filteredPendientes = initialPendientes.filter(c => c.programa?.ID_Programa);
        const filteredMisCargas = initialMisCargas.filter(c => c.programa?.ID_Programa);
        
        setPendientes(filteredPendientes);
        setMisCargas(filteredMisCargas);
        
        // Cargar datos del servidor
        fetchCargas();
    }, []);

    const fetchCargas = async () => {
        try {
            const [pendientesRes, misCargasRes] = await Promise.all([
                apiClient.get<{ data: CargaMalla[] }>('/aprobacion/pendientes'),
                apiClient.get<{ data: CargaMalla[] }>('/aprobacion/mis-cargas'),
            ]);

            // Filtrar solo cargas con programa definido
            const filteredPendientes = (pendientesRes.data || []).filter(c => c.programa?.ID_Programa);
            const filteredMisCargas = (misCargasRes.data || []).filter(c => c.programa?.ID_Programa);

            setPendientes(filteredPendientes);
            setMisCargas(filteredMisCargas);
        } catch (error) {
            console.error('Error fetching cargas:', error);
        }
    };

    const handleEnviarRevision = async (cargaId: number) => {
        setLoading(true);
        try {
            const response = await apiClient.post<{ data: CargaMalla }>(`/aprobacion/cargas/${cargaId}/enviar-revision`);
            const cargaActualizada = response.data;

            // Remover de "Mis Cargas" y agregar a "Pendientes de Revisión"
            setMisCargas(prev => prev.filter(c => c.ID_Carga !== cargaId));
            setPendientes(prev => [cargaActualizada, ...prev]);

            alert('Malla enviada a revisión exitosamente');
        } catch (error: any) {
            const msg = error?.message || 'Error al enviar a revisión';
            alert(msg);
        } finally {
            setLoading(false);
        }
    };

    const [mallaData, setMallaData] = useState<any>(null);

    const handleVerGrafica = async (carga: CargaMalla) => {
        if (!carga.ID_Malla) return;
        // Abrir el visualizador en una nueva pestaña
        window.open(`/mallas/${carga.ID_Malla}/grafica`, '_blank');
    };

    const handleVerDetalle = async (carga: CargaMalla) => {
        setSelectedCarga(carga);
        // Cargar datos de la malla para el detalle
        try {
            const res = await apiClient.get<{ data: any }>(`/aprobacion/cargas/${carga.ID_Carga}/detalle-malla`);
            setMallaData(res.data);
        } catch {
            setMallaData(null);
        }
    };

    const handleRevisar = async () => {
        if (!selectedCarga) return;

        setLoading(true);
        try {
            await apiClient.patch(`/aprobacion/cargas/${selectedCarga.ID_Carga}/revisar`, reviewForm);
            
            // Remover de "Pendientes de Revisión" después de revisar
            setPendientes(prev => prev.filter(c => c.ID_Carga !== selectedCarga.ID_Carga));
            
            setSelectedCarga(null);
            alert(`Malla ${reviewForm.accion === 'aprobar' ? 'aprobada' : 'rechazada'} exitosamente`);
            
            // Resetear el formulario
            setReviewForm({
                accion: 'aprobar',
                comentario: '',
            });
        } catch (error) {
            console.error('Error en revisión:', error);
            alert('Error al procesar la revisión');
        } finally {
            setLoading(false);
        }
    };

    const getEstadoColor = (estado: string) => {
        const colors: Record<string, string> = {
            'borrador': 'bg-gray-100 text-gray-800',
            'listo_para_procesar': 'bg-blue-100 text-blue-800',
            'iniciado': 'bg-yellow-100 text-yellow-800',
            'validando': 'bg-orange-100 text-orange-800',
            'pendiente_aprobacion': 'bg-purple-100 text-purple-800',
            'aprobado': 'bg-green-100 text-green-800',
            'rechazado': 'bg-red-100 text-red-800',
            'con_errores': 'bg-red-100 text-red-800',
        };
        return colors[estado] || 'bg-gray-100 text-gray-800';
    };

    return (
        <MainLayout>
            <Head title="Aprobación de Mallas" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Aprobación de Mallas</h1>
                        <p className="text-sm text-gray-500">Gestión de aprobación de mallas curriculares</p>
                    </div>
                    <Link
                        href="/auditoria"
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                    >
                        Ver Auditoría
                    </Link>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-lg shadow">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab('mis-cargas')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === 'mis-cargas'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                Mis Cargas ({misCargas.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('pendientes')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === 'pendientes'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                Pendientes de Revisión ({pendientes.length})
                            </button>
                        </nav>
                    </div>

                    {/* Lista */}
                    <div className="p-6">
                        {activeTab === 'mis-cargas' ? (
                            <div className="space-y-4">
                                {misCargas.length === 0 ? (
                                    <div className="text-center py-12">
                                        <h3 className="text-sm font-medium text-gray-900">No tienes cargas</h3>
                                        <p className="mt-1 text-sm text-gray-500">No has cargado ninguna malla curricular.</p>
                                    </div>
                                ) : (
                                    misCargas.map((carga) => (
                                        <div key={carga.ID_Carga} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-3">
                                                        <h3 className="text-lg font-medium text-gray-900">
                                                            {carga.programa?.Nombre_Programa || 'Sin programa'}
                                                        </h3>
                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(carga.Estado_Carga)}`}>
                                                            {carga.Estado_Carga}
                                                        </span>
                                                    </div>
                                                    <div className="mt-1 text-sm text-gray-500">
                                                        <p>Cargada por: {carga.usuario?.Nombre_Usuario || 'N/A'}</p>
                                                        <p>Fecha: {new Date(carga.Creacion_Carga).toLocaleDateString('es-CO')}</p>
                                                        <p>Comentario: {carga.Comentario_Carga || 'Sin comentario'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex space-x-2">
                                                    <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handleVerDetalle(carga)}
                                                        className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors text-sm"
                                                    >
                                                        Ver Detalles
                                                    </button>
                                                    {carga.ID_Malla && (
                                                        <button
                                                            onClick={() => handleVerGrafica(carga)}
                                                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
                                                        >
                                                            Ver Gráfica
                                                        </button>
                                                    )}
                                                    </div>
                                                    {(carga.Estado_Carga === 'borrador' || carga.Estado_Carga === 'con_errores') && (
                                                        <button
                                                            onClick={() => handleEnviarRevision(carga.ID_Carga)}
                                                            disabled={loading}
                                                            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50"
                                                        >
                                                            {loading ? 'Enviando...' : 'Enviar a Revisión'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {pendientes.length === 0 ? (
                                    <div className="text-center py-12">
                                        <h3 className="text-sm font-medium text-gray-900">No hay mallas pendientes</h3>
                                        <p className="mt-1 text-sm text-gray-500">No hay mallas esperando revisión de otros usuarios.</p>
                                    </div>
                                ) : (
                                    pendientes.map((carga) => (
                                        <div key={carga.ID_Carga} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-3">
                                                        <h3 className="text-lg font-medium text-gray-900">
                                                            {carga.programa?.Nombre_Programa || 'Sin programa'}
                                                        </h3>
                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(carga.Estado_Carga)}`}>
                                                            {carga.Estado_Carga}
                                                        </span>
                                                    </div>
                                                    <div className="mt-1 text-sm text-gray-500">
                                                        <p>Cargada por: {carga.usuario?.Nombre_Usuario || 'N/A'}</p>
                                                        <p>Fecha: {new Date(carga.Creacion_Carga).toLocaleDateString('es-CO')}</p>
                                                        <p>Comentario: {carga.Comentario_Carga || 'Sin comentario'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex space-x-2">
                                                <button
                                                    onClick={() => handleVerDetalle(carga)}
                                                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors text-sm"
                                                >
                                                    Revisar
                                                </button>
                                                {carga.ID_Malla && (
                                                    <button
                                                        onClick={() => handleVerGrafica(carga)}
                                                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
                                                    >
                                                        Ver Gráfica
                                                    </button>
                                                )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal de Revisión */}
                {selectedCarga && (
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                                <h2 className="text-xl font-semibold text-gray-900">
                                    {selectedCarga.programa?.Nombre_Programa || 'Malla'}
                                </h2>
                                <button onClick={() => setSelectedCarga(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                            </div>
                            <div className="px-6 py-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><span className="font-medium">Programa:</span> {selectedCarga.programa?.Nombre_Programa}</div>
                                    <div>
                                        <span className="font-medium">Estado:</span>
                                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(selectedCarga.Estado_Carga)}`}>
                                            {selectedCarga.Estado_Carga}
                                        </span>
                                    </div>
                                    <div><span className="font-medium">Cargada por:</span> {selectedCarga.usuario?.Nombre_Usuario || 'N/A'}</div>
                                    <div><span className="font-medium">Fecha:</span> {new Date(selectedCarga.Creacion_Carga).toLocaleDateString('es-CO')}</div>
                                    <div className="col-span-2"><span className="font-medium">Comentario:</span> {selectedCarga.Comentario_Carga || 'Sin comentario'}</div>
                                </div>

                                {selectedCarga.Estado_Carga === 'pendiente_aprobacion' && (
                                    <div className="border-t pt-4 space-y-4">
                                        <h3 className="text-lg font-medium">Revisión</h3>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Acción</label>
                                            <select
                                                value={reviewForm.accion}
                                                onChange={(e) => setReviewForm(p => ({ ...p, accion: e.target.value as 'aprobar' | 'rechazar' }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            >
                                                <option value="aprobar">Aprobar</option>
                                                <option value="rechazar">Rechazar</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Comentario</label>
                                            <textarea
                                                value={reviewForm.comentario}
                                                onChange={(e) => setReviewForm(p => ({ ...p, comentario: e.target.value }))}
                                                rows={3}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                placeholder="Comentarios sobre la decisión..."
                                            />
                                        </div>
                                        <div className="flex justify-end space-x-3">
                                            <button onClick={() => setSelectedCarga(null)} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">Cancelar</button>
                                            <button
                                                onClick={handleRevisar}
                                                disabled={loading}
                                                className={`px-4 py-2 rounded-md text-white disabled:opacity-50 ${
                                                    reviewForm.accion === 'aprobar' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                                                }`}
                                            >
                                                {loading ? 'Procesando...' : reviewForm.accion === 'aprobar' ? 'Aprobar Malla' : 'Rechazar Malla'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}