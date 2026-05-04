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

interface DiffMalla {
    diffs: {
        [entidad: string]: {
            INSERT: any[];
            UPDATE: any[];
            DELETE: any[];
        };
    };
    resumen: {
        total_cambios: number;
        por_entidad: Record<string, number>;
        por_tipo: Record<string, number>;
        asignaturas_agregadas: number;
        asignaturas_eliminadas: number;
        asignaturas_modificadas: number;
        requisitos_agregados: number;
        requisitos_eliminados: number;
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
    const [diffs, setDiffs] = useState<DiffMalla | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'pendientes' | 'mis-cargas'>('pendientes');
    const [reviewForm, setReviewForm] = useState({
        accion: 'aprobar' as 'aprobar' | 'rechazar',
        comentario: '',
    });

    const fetchCargas = async () => {
        try {
            const [pendientesRes, misCargasRes] = await Promise.all([
                apiClient.get<CargaMalla[]>('/aprobacion/pendientes'),
                apiClient.get<CargaMalla[]>('/aprobacion/mis-cargas'),
            ]);
            
            setPendientes(pendientesRes);
            setMisCargas(misCargasRes);
        } catch (error) {
            console.error('Error fetching cargas:', error);
        }
    };

    const fetchDiffs = async (cargaId: number) => {
        setLoading(true);
        try {
            const response = await apiClient.get<{ data: any }>(`/auditoria/diffs/${cargaId}`);
            setDiffs(response.data.data || null);
        } catch (error) {
            console.error('Error fetching diffs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectCarga = (carga: CargaMalla) => {
        setSelectedCarga(carga);
        fetchDiffs(carga.ID_Carga);
    };

    const handleEnviarRevision = async (cargaId: number) => {
        try {
            await apiClient.post(`/cargas/${cargaId}/enviar-revision`);
            await fetchCargas();
            alert('Malla enviada a revisión exitosamente');
        } catch (error) {
            console.error('Error enviando a revisión:', error);
            alert('Error al enviar a revisión');
        }
    };

    const handleRevisar = async () => {
        if (!selectedCarga) return;

        try {
            await apiClient.patch(`/cargas/${selectedCarga.ID_Carga}/revisar`, reviewForm);
            await fetchCargas();
            setSelectedCarga(null);
            setDiffs(null);
            alert(`Malla ${reviewForm.accion === 'aprobar' ? 'aprobada' : 'rechazada'} exitosamente`);
        } catch (error) {
            console.error('Error en revisión:', error);
            alert('Error al procesar la revisión');
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

    const renderDiffItem = (item: any, tipo: string) => {
        if (tipo === 'INSERT') {
            return (
                <div className="bg-green-50 border-l-4 border-green-400 p-3">
                    <div className="flex items-center">
                        <svg className="w-4 h-4 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium text-green-800">NUEVO</span>
                    </div>
                    <div className="mt-2 text-sm text-gray-700">
                        <p><strong>Nombre:</strong> {item.Nombre_Asignatura || item.Nombre_Agrupacion || 'N/A'}</p>
                        <p><strong>Código:</strong> {item.Codigo_Asignatura || 'N/A'}</p>
                        <p><strong>Tipo:</strong> {item.Tipo_Asignatura || 'N/A'}</p>
                    </div>
                </div>
            );
        } else if (tipo === 'DELETE') {
            return (
                <div className="bg-red-50 border-l-4 border-red-400 p-3">
                    <div className="flex items-center">
                        <svg className="w-4 h-4 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium text-red-800">ELIMINADO</span>
                    </div>
                    <div className="mt-2 text-sm text-gray-700">
                        <p><strong>Nombre:</strong> {item.Nombre_Asignatura || item.Nombre_Agrupacion || 'N/A'}</p>
                        <p><strong>Código:</strong> {item.Codigo_Asignatura || 'N/A'}</p>
                        <p><strong>Tipo:</strong> {item.Tipo_Asignatura || 'N/A'}</p>
                    </div>
                </div>
            );
        } else {
            return (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
                    <div className="flex items-center">
                        <svg className="w-4 h-4 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium text-yellow-800">MODIFICADO</span>
                    </div>
                    <div className="mt-2 text-sm text-gray-700">
                        <p><strong>Nombre:</strong> {item.Nombre_Asignatura || item.Nombre_Agrupacion || 'N/A'}</p>
                        <p><strong>Código:</strong> {item.Codigo_Asignatura || 'N/A'}</p>
                        <div className="mt-1">
                            <p className="text-xs text-gray-600">Cambios detectados en los campos</p>
                        </div>
                    </div>
                </div>
            );
        }
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
                                onClick={() => setActiveTab('pendientes')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === 'pendientes'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                Pendientes de Revisión ({pendientes.length})
                            </button>
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
                        </nav>
                    </div>

                    {/* Lista de Cargas */}
                    <div className="p-6">
                        {activeTab === 'pendientes' ? (
                            <div className="space-y-4">
                                {pendientes.length === 0 ? (
                                    <div className="text-center py-12">
                                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <h3 className="mt-2 text-sm font-medium text-gray-900">No hay mallas pendientes</h3>
                                        <p className="mt-1 text-sm text-gray-500">No hay mallas esperando revisión en este momento.</p>
                                    </div>
                                ) : (
                                    pendientes.map((carga) => (
                                        <div key={carga.ID_Carga} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-3">
                                                        <h3 className="text-lg font-medium text-gray-900">
                                                            {carga.programa?.Nombre_Programa}
                                                        </h3>
                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(carga.Estado_Carga)}`}>
                                                            {carga.Estado_Carga}
                                                        </span>
                                                    </div>
                                                    <div className="mt-1 text-sm text-gray-500">
                                                        <p>Cargada por: {carga.usuario?.Nombre_Usuario}</p>
                                                        <p>Fecha: {new Date(carga.Creacion_Carga).toLocaleDateString('es-CO')}</p>
                                                        <p>Comentario: {carga.Comentario_Carga}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleSelectCarga(carga)}
                                                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                                                >
                                                    Revisar
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {misCargas.length === 0 ? (
                                    <div className="text-center py-12">
                                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <h3 className="mt-2 text-sm font-medium text-gray-900">No tienes cargas</h3>
                                        <p className="mt-1 text-sm text-gray-500">No has cargado ninguna malla curricular.</p>
                                    </div>
                                ) : (
                                    misCargas.map((carga) => (
                                        <div key={carga.ID_Carga} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-3">
                                                        <h3 className="text-lg font-medium text-gray-900">
                                                            {carga.programa?.Nombre_Programa}
                                                        </h3>
                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(carga.Estado_Carga)}`}>
                                                            {carga.Estado_Carga}
                                                        </span>
                                                    </div>
                                                    <div className="mt-1 text-sm text-gray-500">
                                                        <p>Fecha: {new Date(carga.Creacion_Carga).toLocaleDateString('es-CO')}</p>
                                                        <p>Comentario: {carga.Comentario_Carga}</p>
                                                    </div>
                                                </div>
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handleSelectCarga(carga)}
                                                        className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                                                    >
                                                        Ver Detalles
                                                    </button>
                                                    {carga.Estado_Carga === 'borrador' && (
                                                        <button
                                                            onClick={() => handleEnviarRevision(carga.ID_Carga)}
                                                            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                                                        >
                                                            Enviar a Revisión
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
                        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-semibold text-gray-900">
                                        Revisión de Malla - {selectedCarga.programa?.Nombre_Programa}
                                    </h2>
                                    <button
                                        onClick={() => {
                                            setSelectedCarga(null);
                                            setDiffs(null);
                                        }}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="px-6 py-4">
                                {/* Información General */}
                                <div className="mb-6">
                                    <h3 className="text-lg font-medium text-gray-900 mb-3">Información General</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="font-medium">Programa:</span> {selectedCarga.programa?.Nombre_Programa}
                                        </div>
                                        <div>
                                            <span className="font-medium">Estado:</span> 
                                            <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(selectedCarga.Estado_Carga)}`}>
                                                {selectedCarga.Estado_Carga}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="font-medium">Cargada por:</span> {selectedCarga.usuario?.Nombre_Usuario}
                                        </div>
                                        <div>
                                            <span className="font-medium">Fecha:</span> {new Date(selectedCarga.Creacion_Carga).toLocaleDateString('es-CO')}
                                        </div>
                                        <div className="col-span-2">
                                            <span className="font-medium">Comentario:</span> {selectedCarga.Comentario_Carga}
                                        </div>
                                    </div>
                                </div>

                                {/* Resumen de Cambios */}
                                {diffs?.resumen && (
                                    <div className="mb-6">
                                        <h3 className="text-lg font-medium text-gray-900 mb-3">Resumen de Cambios</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="bg-blue-50 p-3 rounded-lg">
                                                <div className="text-2xl font-bold text-blue-600">{diffs.resumen.total_cambios}</div>
                                                <div className="text-sm text-blue-800">Total Cambios</div>
                                            </div>
                                            <div className="bg-green-50 p-3 rounded-lg">
                                                <div className="text-2xl font-bold text-green-600">{diffs.resumen.asignaturas_agregadas}</div>
                                                <div className="text-sm text-green-800">Asignaturas Agregadas</div>
                                            </div>
                                            <div className="bg-red-50 p-3 rounded-lg">
                                                <div className="text-2xl font-bold text-red-600">{diffs.resumen.asignaturas_eliminadas}</div>
                                                <div className="text-sm text-red-800">Asignaturas Eliminadas</div>
                                            </div>
                                            <div className="bg-yellow-50 p-3 rounded-lg">
                                                <div className="text-2xl font-bold text-yellow-600">{diffs.resumen.asignaturas_modificadas}</div>
                                                <div className="text-sm text-yellow-800">Asignaturas Modificadas</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Diferencias Detalladas */}
                                {diffs?.diffs && (
                                    <div className="mb-6">
                                        <h3 className="text-lg font-medium text-gray-900 mb-3">Cambios Detallados</h3>
                                        {loading ? (
                                            <div className="text-center py-8">
                                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                                <p className="mt-2 text-gray-500">Cargando diferencias...</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {Object.entries(diffs.diffs).map(([entidad, cambios]) => (
                                                    <div key={entidad}>
                                                        <h4 className="font-medium text-gray-900 mb-2 capitalize">{entidad}</h4>
                                                        <div className="space-y-2">
                                                            {cambios.INSERT.length > 0 && (
                                                                <div>
                                                                    <p className="text-sm font-medium text-green-700 mb-1">Agregados ({cambios.INSERT.length})</p>
                                                                    {cambios.INSERT.map((item, idx) => (
                                                                        <div key={idx} className="ml-4">
                                                                            {renderDiffItem(item, 'INSERT')}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {cambios.DELETE.length > 0 && (
                                                                <div>
                                                                    <p className="text-sm font-medium text-red-700 mb-1">Eliminados ({cambios.DELETE.length})</p>
                                                                    {cambios.DELETE.map((item, idx) => (
                                                                        <div key={idx} className="ml-4">
                                                                            {renderDiffItem(item, 'DELETE')}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {cambios.UPDATE.length > 0 && (
                                                                <div>
                                                                    <p className="text-sm font-medium text-yellow-700 mb-1">Modificados ({cambios.UPDATE.length})</p>
                                                                    {cambios.UPDATE.map((item, idx) => (
                                                                        <div key={idx} className="ml-4">
                                                                            {renderDiffItem(item, 'UPDATE')}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Formulario de Revisión */}
                                {selectedCarga.Estado_Carga === 'pendiente_aprobacion' && (
                                    <div className="border-t border-gray-200 pt-6">
                                        <h3 className="text-lg font-medium text-gray-900 mb-3">Revisión</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Acción</label>
                                                <select
                                                    value={reviewForm.accion}
                                                    onChange={(e) => setReviewForm(prev => ({ ...prev, accion: e.target.value as 'aprobar' | 'rechazar' }))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                >
                                                    <option value="aprobar">Aprobar</option>
                                                    <option value="rechazar">Rechazar</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Comentario</label>
                                                <textarea
                                                    value={reviewForm.comentario}
                                                    onChange={(e) => setReviewForm(prev => ({ ...prev, comentario: e.target.value }))}
                                                    rows={3}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    placeholder="Comentarios sobre la decisión..."
                                                />
                                            </div>
                                            <div className="flex justify-end space-x-3">
                                                <button
                                                    onClick={() => {
                                                        setSelectedCarga(null);
                                                        setDiffs(null);
                                                    }}
                                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={handleRevisar}
                                                    className={`px-4 py-2 rounded-md text-white ${
                                                        reviewForm.accion === 'aprobar'
                                                            ? 'bg-green-600 hover:bg-green-700'
                                                            : 'bg-red-600 hover:bg-red-700'
                                                    }`}
                                                >
                                                    {reviewForm.accion === 'aprobar' ? 'Aprobar Malla' : 'Rechazar Malla'}
                                                </button>
                                            </div>
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
