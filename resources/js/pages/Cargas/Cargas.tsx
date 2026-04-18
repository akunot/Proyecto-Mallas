import { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import MainLayout from '../../Layout/MainLayout';
import { useAuth } from '../../context/AuthContext';

interface Carga {
    ID_Carga: number;
    Estado_Carga: string;
    Comentario_Carga: string;
    Creacion_Carga: string;
    Finalizacion_Carga: string | null;
    usuario: {
        Nombre_Usuario: string;
    };
    malla: {
        ID_Malla: number;
        Estado: string;
        Version_Numero: number;
        normativa: {
            ID_Normativa: number;
            Tipo_Normativa: string;
            Numero_Normativa: string;
            Anio_Normativa: number;
            programa: {
                Nombre_Programa: string;
            };
        };
    };
    normativa: {
        ID_Normativa: number;
        Tipo_Normativa: string;
        Numero_Normativa: string;
        Anio_Normativa: number;
        programa: {
            Nombre_Programa: string;
        };
    };
    archivoAsignaturas?: {
        ID_Archivo: number;
    } | null;
    archivoElectivas?: {
        ID_Archivo: number;
    } | null;
    archivoMalla?: {
        ID_Archivo: number;
    } | null;
    errores_count?: number;
    advertencias_count?: number;
}

interface Normativa {
    ID_Normativa: number;
    Tipo_Normativa: string;
    Numero_Normativa: string;
    Anio_Normativa: number;
    programa: {
        ID_Programa: number;
        Nombre_Programa: string;
    };
}

export default function Cargas() {
    const {} = useAuth();
    const [cargas, setCargas] = useState<Carga[]>([]);
    const [normativas, setNormativas] = useState<Normativa[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [showModal, setShowModal] = useState<boolean>(false);
    const [uploading, setUploading] = useState<boolean>(false);
    const [selectedNormativa, setSelectedNormativa] = useState<number | ''>('');
    const [selectedTipoArchivo, setSelectedTipoArchivo] = useState<'asignaturas' | 'electivas' | 'malla' | ''>('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [currentCargaId, setCurrentCargaId] = useState<number | null>(null);
    const [currentCargaNormativaId, setCurrentCargaNormativaId] = useState<number | ''>('');
    const [pollingId, setPollingId] = useState<number | null>(null);
    const [processingCargaId, setProcessingCargaId] = useState<number | null>(null);
    const [pollingCarga, setPollingCarga] = useState<Carga | null>(null);

    const apiUrl = window.location.origin;

    const handleOpenModal = () => {
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedFile(null);
        setSelectedNormativa('');
        setSelectedTipoArchivo('');
    };

    useEffect(() => {
        fetchCargas();
        fetchNormativas();
    }, []);

    useEffect(() => {
        if (pollingId) {
            const interval = setInterval(() => {
                fetchCargaEstado(pollingId);
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [pollingId]);

    const fetchCargas = async () => {
        const csrfToken =
            document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute('content') || '';
        try {
            const response = await fetch(`${apiUrl}/api/v1/cargas`, {
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                credentials: 'same-origin',
            });
            if (response.ok) {
                const data = await response.json();
                console.log('Cargas fetched:', data);
                setCargas(data.data || []);
            } else {
                console.error(
                    'Failed to fetch cargas:',
                    response.status,
                    response.statusText,
                );
            }
        } catch (error) {
            console.error('Error fetching cargas:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchNormativas = async () => {
        const csrfToken =
            document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute('content') || '';
        try {
            const response = await fetch(`${apiUrl}/api/v1/normativas`, {
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                credentials: 'same-origin',
            });
            if (response.ok) {
                const data = await response.json();
                console.log('Normativas fetched:', data);
                setNormativas(data.data || []);
            } else {
                console.error(
                    'Failed to fetch normativas:',
                    response.status,
                    response.statusText,
                );
            }
        } catch (error) {
            console.error('Error fetching normativas:', error);
        }
    };

    const fetchCargaEstado = async (id: number) => {
        const csrfToken =
            document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute('content') || '';
        try {
            const response = await fetch(
                `${apiUrl}/api/v1/cargas/${id}/estado`,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-CSRF-TOKEN': csrfToken,
                    },
                    credentials: 'same-origin',
                },
            );
            if (response.ok) {
                const data = await response.json();
                const estado = data.data.Estado_Carga || data.data.estado;

                if (
                    estado === 'borrador' ||
                    estado === 'con_errores' ||
                    estado === 'aprobado' ||
                    estado === 'rechazado'
                ) {
                    setPollingId(null);
                    setProcessingCargaId(null);
                    setPollingCarga(null);
                    fetchCargas();
                }
            }
        } catch (error) {
            console.error('Error polling carga:', error);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedFile || !selectedNormativa || !selectedTipoArchivo) {
            alert('Debe seleccionar normativa, tipo de archivo y un archivo Excel.');
            return;
        }

        const csrfToken =
            document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute('content') || '';

        try {
            const testAuth = await fetch(`${apiUrl}/api/v1/test-auth`, {
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                },
                credentials: 'same-origin',
            });

            if (!testAuth.ok) {
                alert('Error de autenticación. Por favor inicie sesión.');
                return;
            }
        } catch (err) {
            console.error('Auth test error:', err);
            alert('Error de conexión al verificar autenticación.');
            return;
        }

        setUploading(true);

        try {
            let cargaId = currentCargaId;

            if (!cargaId) {
                const createResponse = await fetch(`${apiUrl}/api/v1/cargas`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': csrfToken,
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({ normativa_id: selectedNormativa }),
                });

                const createData = await createResponse.json();

                if (!createResponse.ok) {
                    if (createData.errors) {
                        const errorMessages = Object.values(createData.errors)
                            .flat()
                            .join('\n');
                        alert('Errores de validación:\n' + errorMessages);
                    } else {
                        alert(createData.message || 'Error al crear la carga');
                    }
                    return;
                }

                cargaId = createData.data.carga_id;
                setCurrentCargaId(cargaId);
                setCurrentCargaNormativaId(selectedNormativa);
            }

            if (currentCargaId && currentCargaNormativaId && currentCargaNormativaId !== selectedNormativa) {
                alert('Ya existe una carga en curso con otra normativa. Reinicie la carga actual antes de cambiar de normativa.');
                return;
            }

            const uploadForm = new FormData();
            uploadForm.append('archivo', selectedFile);
            uploadForm.append('tipo_archivo', selectedTipoArchivo);

            const uploadResponse = await fetch(`${apiUrl}/api/v1/cargas/${cargaId}/archivo`, {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrfToken,
                },
                credentials: 'same-origin',
                body: uploadForm,
            });

            const uploadData = await uploadResponse.json();

            if (!uploadResponse.ok) {
                if (uploadData.errors) {
                    const errorMessages = Object.values(uploadData.errors)
                        .flat()
                        .join('\n');
                    alert('Errores de validación:\n' + errorMessages);
                } else {
                    alert(uploadData.message || 'Error al subir el archivo');
                }
                return;
            }

            alert('Archivo subido correctamente. ID de carga: ' + cargaId);
            setSelectedFile(null);
            setSelectedTipoArchivo('');
            if (uploadData.data?.estado === 'listo_para_procesar') {
                setPollingId(cargaId);
            }
            fetchCargas();
        } catch (error) {
            console.error('Error uploading:', error);
            alert('Error al subir el archivo');
        } finally {
            setUploading(false);
        }
    };

    const handleResetCarga = () => {
        setCurrentCargaId(null);
        setCurrentCargaNormativaId('');
        setSelectedNormativa('');
        setSelectedTipoArchivo('');
        setSelectedFile(null);
    };

    const handleProcessCarga = async (cargaId: number) => {
        const csrfToken =
            document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute('content') || '';

        try {
            setProcessingCargaId(cargaId);
            const response = await fetch(`${apiUrl}/api/v1/cargas/${cargaId}/procesar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrfToken,
                },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                const data = await response.json();
                alert(data.message || 'Error al iniciar el procesamiento.');
                setProcessingCargaId(null);
                return;
            }

            setPollingId(cargaId);
            fetchCargas();
        } catch (error) {
            console.error('Error iniciando procesamiento:', error);
            alert('Error al iniciar el procesamiento.');
            setProcessingCargaId(null);
        }
    };

    const getEstadoBadge = (estado: string) => {
        const estados: Record<string, { bg: string; text: string }> = {
            esperando_archivos: { bg: 'bg-gray-100', text: 'text-gray-800' },
            listo_para_procesar: { bg: 'bg-blue-100', text: 'text-blue-800' },
            iniciado: { bg: 'bg-blue-100', text: 'text-blue-800' },
            validando: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
            borrador: { bg: 'bg-gray-100', text: 'text-gray-800' },
            con_errores: { bg: 'bg-red-100', text: 'text-red-800' },
            pendiente_aprobacion: {
                bg: 'bg-purple-100',
                text: 'text-purple-800',
            },
            aprobado: { bg: 'bg-green-100', text: 'text-green-800' },
            rechazado: { bg: 'bg-red-100', text: 'text-red-800' },
        };
        const style = estados[estado] || {
            bg: 'bg-gray-100',
            text: 'text-gray-800',
        };
        return (
            <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${style.bg} ${style.text}`}
            >
                {estado.replace('_', ' ')}
            </span>
        );
    };

    const renderArchivoStatus = (carga: Carga, tipo: 'asignaturas' | 'electivas' | 'malla') => {
        const status = {
            asignaturas: carga.archivoAsignaturas,
            electivas: carga.archivoElectivas,
            malla: carga.archivoMalla,
        }[tipo];

        const label = {
            asignaturas: 'Asignaturas',
            electivas: 'Electivas',
            malla: 'Malla',
        }[tipo];

        return status ? (
            <span
                key={tipo}
                className="rounded-full bg-green-100 px-2 py-1 text-[10px] font-semibold text-green-800"
            >
                {label}
            </span>
        ) : (
            <span
                key={tipo}
                className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-semibold text-red-800"
            >
                {label} falta
            </span>
        );
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('es-CO', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <MainLayout>
            <Head title="Cargas de Mallas" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Cargas de Mallas
                        </h1>
                        <p className="text-gray-500">
                            Gestión de cargas de archivos Excel
                        </p>
                    </div>
                    <button
                        onClick={handleOpenModal}
                        className="flex items-center space-x-2 rounded-lg bg-green-700 px-4 py-2 text-white hover:bg-green-800"
                    >
                        <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                            />
                        </svg>
                        <span>Subir Excel</span>
                    </button>
                </div>

                {pollingId && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-blue-600"></div>
                                <span className="text-blue-800">
                                    Procesando archivo... (ID: {pollingId})
                                </span>
                            </div>
                            <button
                                onClick={handleOpenModal}
                                className="flex items-center space-x-2 rounded-lg bg-green-700 px-4 py-2 text-white hover:bg-green-800"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}

                <div className="overflow-hidden rounded-lg bg-white shadow">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">
                            Cargando...
                        </div>
                    ) : cargas.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No hay cargas registradas. ¡Sube tu primer archivo
                            Excel!
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        ID
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Programa
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Normativa
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Versión
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Estado
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Usuario
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Fecha
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Archivos
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {cargas.map((carga) => (
                                    <tr
                                        key={carga.ID_Carga}
                                        className="hover:bg-gray-50"
                                    >
                                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
                                            {carga.ID_Carga}
                                        </td>
                                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
                                            {carga.malla?.normativa?.programa?.Nombre_Programa || carga.normativa?.programa?.Nombre_Programa || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-600">
                                            {carga.malla?.normativa?.Tipo_Normativa || carga.normativa?.Tipo_Normativa || ''}{' '}
                                            {carga.malla?.normativa?.Numero_Normativa || carga.normativa?.Numero_Normativa || ''}
                                            /
                                            {carga.malla?.normativa?.Anio_Normativa || carga.normativa?.Anio_Normativa || ''}
                                        </td>
                                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-600">
                                            v{carga.malla?.Version_Numero || 1}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            <div className="flex flex-wrap gap-1">
                                                {renderArchivoStatus(carga, 'asignaturas')}
                                                {renderArchivoStatus(carga, 'electivas')}
                                                {renderArchivoStatus(carga, 'malla')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-600">
                                            {getEstadoBadge(carga.Estado_Carga)}
                                        </td>
                                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-600">
                                            {carga.usuario?.Nombre_Usuario ||
                                                '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-600">
                                            {formatDate(carga.Creacion_Carga)}
                                        </td>
                                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-600">
                                            {carga.Estado_Carga === 'listo_para_procesar' ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleProcessCarga(carga.ID_Carga)}
                                                    disabled={processingCargaId === carga.ID_Carga}
                                                    className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                                >
                                                    {processingCargaId === carga.ID_Carga
                                                        ? 'Procesando...'
                                                        : 'Procesar'}
                                                </button>
                                            ) : (
                                                '-'
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {showModal ? (
                <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                        <h2 className="mb-4 text-xl font-bold text-gray-900">
                            Subir Archivo Excel
                        </h2>
                        <form onSubmit={handleUpload} className="space-y-4">
                            {currentCargaId ? (
                                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p>
                                                Carga actual: <strong>{currentCargaId}</strong>
                                            </p>
                                            <p>
                                                Suba los archivos restantes para esta carga. Si desea cambiar de normativa, reinicie la carga actual.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleResetCarga}
                                            className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
                                        >
                                            Reiniciar carga
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Normativa
                                </label>
                                <select
                                    value={selectedNormativa}
                                    onChange={(e) =>
                                        setSelectedNormativa(
                                            e.target.value
                                                ? parseInt(e.target.value)
                                                : '',
                                        )
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-2 focus:ring-green-500"
                                    required
                                >
                                    <option value="">
                                        Seleccione una normativa...
                                    </option>
                                    {normativas.map((n) => (
                                        <option
                                            key={n.ID_Normativa}
                                            value={n.ID_Normativa}
                                        >
                                            {n.Tipo_Normativa}{' '}
                                            {n.Numero_Normativa}/
                                            {n.Anio_Normativa} -{' '}
                                            {n.programa?.Nombre_Programa ??
                                                'Sin programa'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Tipo de archivo
                                </label>
                                <select
                                    value={selectedTipoArchivo}
                                    onChange={(e) =>
                                        setSelectedTipoArchivo(
                                            e.target.value as
                                                | 'asignaturas'
                                                | 'electivas'
                                                | 'malla'
                                                | '',
                                        )
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-2 focus:ring-green-500"
                                    required
                                >
                                    <option value="">
                                        Seleccione el tipo de archivo...
                                    </option>
                                    <option value="asignaturas">
                                        Asignaturas
                                    </option>
                                    <option value="electivas">Electivas</option>
                                    <option value="malla">Malla</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Archivo Excel (.xlsx)
                                </label>
                                <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={(e) =>
                                        setSelectedFile(
                                            e.target.files?.[0] || null,
                                        )
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-2 focus:ring-green-500"
                                    required
                                />
                            </div>
                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading || !selectedFile}
                                    className="rounded-lg bg-green-700 px-4 py-2 text-white hover:bg-green-800 disabled:opacity-50"
                                >
                                    {uploading ? 'Subiendo...' : 'Subir'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </MainLayout>
    );
}
