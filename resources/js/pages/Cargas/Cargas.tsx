import { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import MainLayout from '../../Layout/MainLayout';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ErrorCarga {
    ID_Error: number;
    Fila_Error: number | null;
    Columna_Error: string | null;
    Mensaje_Error: string;
    Valor_Recibido: string | null;
    Severidad_Error: 'error' | 'advertencia';
}

interface Carga {
    ID_Carga: number;
    Estado_Carga: string;
    tipo_carga: 'asignaturas' | 'electivas' | 'malla' | string;
    Comentario_Carga: string;
    Creacion_Carga: string;
    Finalizacion_Carga: string | null;
    usuario: { Nombre_Usuario: string };
    normativa?: {
        ID_Normativa: number;
        Tipo_Normativa: string;
        Numero_Normativa: string;
        Anio_Normativa: number;
        programa: { Nombre_Programa: string };
    } | null;
    programa?: { Nombre_Programa: string } | null;
    errores_count?: number;
    advertencias_count?: number;
}

interface Normativa {
    ID_Normativa: number;
    Tipo_Normativa: string;
    Numero_Normativa: string;
    Anio_Normativa: number;
    programa: { ID_Programa: number; Nombre_Programa: string };
}

type TipoCarga = 'asignaturas' | 'electivas' | 'malla' | '';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ESTADOS: Record<string, { bg: string; text: string; label: string }> = {
    esperando_archivos:   { bg: 'bg-gray-100',   text: 'text-gray-700',   label: 'Esperando archivo' },
    listo_para_procesar:  { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Listo para procesar' },
    iniciado:             { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Iniciado' },
    validando:            { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Validando' },
    borrador:             { bg: 'bg-gray-100',   text: 'text-gray-700',   label: 'Borrador' },
    con_errores:          { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Con errores' },
    pendiente_aprobacion: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Pendiente aprobación' },
    aprobado:             { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Aprobado' },
    rechazado:            { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Rechazado' },
};

const TIPO_LABELS: Record<string, { label: string; bg: string; text: string }> = {
    asignaturas: { label: 'Asignaturas', bg: 'bg-indigo-100', text: 'text-indigo-800' },
    electivas:   { label: 'Electivas',   bg: 'bg-teal-100',   text: 'text-teal-800' },
    malla:       { label: 'Malla',       bg: 'bg-amber-100',  text: 'text-amber-800' },
};

const ESTADOS_TERMINALES = ['borrador', 'con_errores', 'aprobado', 'rechazado'];

// Estados simplificados para cargas de catálogo (asignaturas y electivas)
// Dos estados primarios: Subido (archivo en BD, aún no procesado)
//                        Procesado (pasó por el parser)
const ESTADOS_CATALOGO: Record<string, { bg: string; text: string; label: string; spinner?: boolean }> = {
    esperando_archivos:  { bg: 'bg-gray-100',   text: 'text-gray-600',  label: 'Subido' },
    listo_para_procesar: { bg: 'bg-gray-100',   text: 'text-gray-600',  label: 'Subido' },
    iniciado:            { bg: 'bg-blue-100',   text: 'text-blue-800',  label: 'Procesando', spinner: true },
    validando:           { bg: 'bg-yellow-100', text: 'text-yellow-800',label: 'Procesando', spinner: true },
    borrador:            { bg: 'bg-green-100',  text: 'text-green-800', label: 'Procesado' },
    con_errores:         { bg: 'bg-red-100',    text: 'text-red-800',   label: 'Procesado con errores' },
};

type EstadoStyle = { bg: string; text: string; label: string; spinner?: boolean };

const getEstadoBadge = (estado: string, tipo: string) => {
    const esCatalogo = tipo === 'asignaturas' || tipo === 'electivas';
    const map: Record<string, EstadoStyle> = esCatalogo ? ESTADOS_CATALOGO : ESTADOS;
    const s: EstadoStyle = map[estado] ?? { bg: 'bg-gray-100', text: 'text-gray-700', label: estado };
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}>
            {s.spinner && (
                <span className="h-2.5 w-2.5 animate-spin rounded-full border border-current border-t-transparent" />
            )}
            {s.label}
        </span>
    );
};

const getTipoBadge = (tipo: string) => {
    const t = TIPO_LABELS[tipo] ?? { label: tipo, bg: 'bg-gray-100', text: 'text-gray-700' };
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${t.bg} ${t.text}`}>
            {t.label}
        </span>
    );
};

const formatDate = (d: string) =>
    new Date(d).toLocaleString('es-CO', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Cargas() {
    const [cargas, setCargas]           = useState<Carga[]>([]);
    const [normativas, setNormativas]   = useState<Normativa[]>([]);
    const [loading, setLoading]         = useState(true);

    // Modal de subida
    const [showModal, setShowModal]             = useState(false);
    const [uploading, setUploading]             = useState(false);
    const [selectedTipo, setSelectedTipo]       = useState<TipoCarga>('');
    const [selectedNormativa, setSelectedNormativa] = useState<number | ''>('');
    const [selectedFile, setSelectedFile]       = useState<File | null>(null);

    // Modal de errores
    const [errorModal, setErrorModal]           = useState<{ cargaId: number; tipo: string } | null>(null);
    const [errores, setErrores]                 = useState<ErrorCarga[]>([]);
    const [loadingErrores, setLoadingErrores]   = useState(false);

    // Polling
    const [pollingIds, setPollingIds]           = useState<Set<number>>(new Set());

    // Filtros
    const [filtroTipo, setFiltroTipo]     = useState<string>('');
    const [filtroEstado, setFiltroEstado] = useState<string>('');

    const apiUrl = window.location.origin;

    const getCsrf = () =>
        document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';

    // ── Fetch inicial ──────────────────────────────────────────────────────────

    useEffect(() => {
        fetchCargas();
        fetchNormativas();
    }, []);

    // ── Polling ────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (pollingIds.size === 0) return;
        const interval = setInterval(() => {
            pollingIds.forEach((id) => fetchEstado(id));
        }, 3000);
        return () => clearInterval(interval);
    }, [pollingIds]);

    const fetchCargas = async () => {
        try {
            const res = await fetch(`${apiUrl}/api/v1/cargas`, {
                headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': getCsrf() },
                credentials: 'same-origin',
            });
            if (res.ok) {
                const data = await res.json();
                setCargas(data.data ?? []);
            }
        } catch (e) {
            console.error('Error fetching cargas:', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchNormativas = async () => {
        try {
            const res = await fetch(`${apiUrl}/api/v1/normativas`, {
                headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': getCsrf() },
                credentials: 'same-origin',
            });
            if (res.ok) {
                const data = await res.json();
                setNormativas(data.data ?? []);
            }
        } catch (e) {
            console.error('Error fetching normativas:', e);
        }
    };

    const fetchEstado = async (id: number) => {
        try {
            const res = await fetch(`${apiUrl}/api/v1/cargas/${id}/estado`, {
                headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': getCsrf() },
                credentials: 'same-origin',
            });
            if (res.ok) {
                const data = await res.json();
                const estado: string = data.data?.Estado_Carga ?? data.data?.estado ?? '';
                if (ESTADOS_TERMINALES.includes(estado)) {
                    setPollingIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
                    fetchCargas();
                }
            }
        } catch (e) {
            console.error('Error polling estado:', e);
        }
    };

    const fetchErrores = async (cargaId: number) => {
        setLoadingErrores(true);
        setErrores([]);
        try {
            const res = await fetch(`${apiUrl}/api/v1/cargas/${cargaId}/errores`, {
                headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': getCsrf() },
                credentials: 'same-origin',
            });
            if (res.ok) {
                const data = await res.json();
                setErrores(data.data ?? []);
            }
        } catch (e) {
            console.error('Error fetching errores:', e);
        } finally {
            setLoadingErrores(false);
        }
    };

    // ── Acciones ───────────────────────────────────────────────────────────────

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedFile || !selectedTipo) {
            alert('Seleccione el tipo de archivo y un archivo Excel.');
            return;
        }
        if (selectedTipo === 'malla' && !selectedNormativa) {
            alert('Debe seleccionar una normativa para cargar una malla.');
            return;
        }

        setUploading(true);
        try {
            // 1. Crear la carga
            const createRes = await fetch(`${apiUrl}/api/v1/cargas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCsrf(),
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    normativa_id: selectedTipo === 'malla' ? selectedNormativa : null,
                    tipo_carga: selectedTipo,
                }),
            });

            const createData = await createRes.json();
            if (!createRes.ok) {
                const msgs = createData.errors
                    ? Object.values(createData.errors).flat().join('\n')
                    : createData.message ?? 'Error al crear la carga';
                alert(msgs);
                return;
            }

            const cargaId: number = createData.data.carga_id ?? createData.data.ID_Carga;

            // 2. Subir el archivo
            const form = new FormData();
            form.append('archivo', selectedFile);
            form.append('tipo_archivo', selectedTipo);

            const uploadRes = await fetch(`${apiUrl}/api/v1/cargas/${cargaId}/archivo`, {
                method: 'POST',
                headers: { 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': getCsrf() },
                credentials: 'same-origin',
                body: form,
            });

            const uploadData = await uploadRes.json();
            if (!uploadRes.ok) {
                const msgs = uploadData.errors
                    ? Object.values(uploadData.errors).flat().join('\n')
                    : uploadData.message ?? 'Error al subir el archivo';
                alert(msgs);
                return;
            }

            handleCloseModal();

            const estadoActual: string = uploadData.data?.estado_carga_actual ?? '';
            if (estadoActual === 'listo_para_procesar' || estadoActual === 'iniciado') {
                setPollingIds((prev) => new Set(prev).add(cargaId));
            }

            fetchCargas();
        } catch (e) {
            console.error('Error en upload:', e);
            alert('Error de conexión al subir el archivo.');
        } finally {
            setUploading(false);
        }
    };

    const handleProcesar = async (cargaId: number) => {
        try {
            const res = await fetch(`${apiUrl}/api/v1/cargas/${cargaId}/procesar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCsrf(),
                },
                credentials: 'same-origin',
            });
            if (!res.ok) {
                const data = await res.json();
                alert(data.message ?? 'Error al procesar.');
                return;
            }
            setPollingIds((prev) => new Set(prev).add(cargaId));
            fetchCargas();
        } catch (e) {
            console.error('Error procesando:', e);
            alert('Error de conexión.');
        }
    };

    const handleOpenErrores = (carga: Carga) => {
        setErrorModal({ cargaId: carga.ID_Carga, tipo: carga.tipo_carga });
        fetchErrores(carga.ID_Carga);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedTipo('');
        setSelectedNormativa('');
        setSelectedFile(null);
    };

    // ── Filtros aplicados ──────────────────────────────────────────────────────

    const cargasFiltradas = cargas.filter((c) => {
        if (filtroTipo && c.tipo_carga !== filtroTipo) return false;
        if (filtroEstado && c.Estado_Carga !== filtroEstado) return false;
        return true;
    });

    const hayProcesando = pollingIds.size > 0;

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <MainLayout>
            <Head title="Cargas de Mallas" />

            <div className="space-y-5">

                {/* Cabecera */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Cargas de archivos</h1>
                        <p className="mt-0.5 text-sm text-gray-500">
                            Gestión de subidas de archivos Excel al sistema
                        </p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-800 active:scale-95 transition-all"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Subir archivo
                    </button>
                </div>

                {/* Banner de procesamiento */}
                {hayProcesando && (
                    <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent shrink-0" />
                        <span>
                            Procesando {pollingIds.size === 1 ? 'una carga' : `${pollingIds.size} cargas`}… se actualizará automáticamente.
                        </span>
                    </div>
                )}

                {/* Filtros */}
                <div className="flex flex-wrap gap-3">
                    <select
                        value={filtroTipo}
                        onChange={(e) => setFiltroTipo(e.target.value)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    >
                        <option value="">Todos los tipos</option>
                        <option value="asignaturas">Asignaturas</option>
                        <option value="electivas">Electivas</option>
                        <option value="malla">Malla</option>
                    </select>

                    <select
                        value={filtroEstado}
                        onChange={(e) => setFiltroEstado(e.target.value)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    >
                        <option value="">Todos los estados</option>
                        {Object.entries(ESTADOS).map(([key, val]) => (
                            <option key={key} value={key}>{val.label}</option>
                        ))}
                    </select>

                    {(filtroTipo || filtroEstado) && (
                        <button
                            onClick={() => { setFiltroTipo(''); setFiltroEstado(''); }}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50"
                        >
                            Limpiar filtros
                        </button>
                    )}

                    {(filtroTipo || filtroEstado) && (
                        <span className="self-center text-xs text-gray-400">
                            {cargasFiltradas.length} de {cargas.length} registros
                        </span>
                    )}
                </div>

                {/* Tabla */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    {loading ? (
                        <div className="flex items-center justify-center gap-3 p-12 text-gray-400">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                            <span className="text-sm">Cargando registros…</span>
                        </div>
                    ) : cargasFiltradas.length === 0 ? (
                        <div className="p-12 text-center">
                            <svg className="mx-auto mb-3 h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-sm text-gray-500">
                                {cargas.length === 0 ? 'No hay cargas registradas.' : 'Ninguna carga coincide con los filtros.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100 text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        <th className="px-4 py-3 text-left">ID</th>
                                        <th className="px-4 py-3 text-left">Tipo</th>
                                        <th className="px-4 py-3 text-left">Programa</th>
                                        <th className="px-4 py-3 text-left">Normativa</th>
                                        <th className="px-4 py-3 text-left">Estado</th>
                                        <th className="px-4 py-3 text-left">Problemas</th>
                                        <th className="px-4 py-3 text-left">Usuario</th>
                                        <th className="px-4 py-3 text-left">Fecha</th>
                                        <th className="px-4 py-3 text-left">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {cargasFiltradas.map((carga) => {
                                        const isProcesando = pollingIds.has(carga.ID_Carga);
                                        const tieneErrores = (carga.errores_count ?? 0) > 0;
                                        const tieneAdvertencias = (carga.advertencias_count ?? 0) > 0;
                                        const normativa = carga.normativa;
                                        const nombrePrograma =
                                            normativa?.programa?.Nombre_Programa ??
                                            carga.programa?.Nombre_Programa ??
                                            '—';

                                        return (
                                            <tr key={carga.ID_Carga} className="hover:bg-gray-50 transition-colors">
                                                {/* ID */}
                                                <td className="px-4 py-3 font-mono text-gray-400">
                                                    #{carga.ID_Carga}
                                                </td>

                                                {/* Tipo */}
                                                <td className="px-4 py-3">
                                                    {getTipoBadge(carga.tipo_carga)}
                                                </td>

                                                {/* Programa */}
                                                <td className="px-4 py-3 text-gray-900 max-w-[180px] truncate" title={nombrePrograma}>
                                                    {nombrePrograma}
                                                </td>

                                                {/* Normativa */}
                                                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                                    {normativa
                                                        ? `${normativa.Tipo_Normativa} ${normativa.Numero_Normativa}/${normativa.Anio_Normativa}`
                                                        : <span className="text-gray-300">—</span>}
                                                </td>

                                                {/* Estado */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        {isProcesando && (
                                                            <div className="h-3 w-3 animate-spin rounded-full border border-blue-500 border-t-transparent" />
                                                        )}
                                                        {getEstadoBadge(carga.Estado_Carga, carga.tipo_carga)}
                                                    </div>
                                                </td>

                                                {/* Problemas */}
                                                <td className="px-4 py-3">
                                                    {tieneErrores || tieneAdvertencias ? (
                                                        <button
                                                            onClick={() => handleOpenErrores(carga)}
                                                            className="flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-gray-100 transition-colors"
                                                            title="Ver detalle de errores"
                                                        >
                                                            {tieneErrores && (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                                                                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                                    </svg>
                                                                    {carga.errores_count}
                                                                </span>
                                                            )}
                                                            {tieneAdvertencias && (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">
                                                                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                                    </svg>
                                                                    {carga.advertencias_count}
                                                                </span>
                                                            )}
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-300">—</span>
                                                    )}
                                                </td>

                                                {/* Usuario */}
                                                <td className="px-4 py-3 text-gray-600">
                                                    {carga.usuario?.Nombre_Usuario ?? '—'}
                                                </td>

                                                {/* Fecha */}
                                                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                                    {formatDate(carga.Creacion_Carga)}
                                                </td>

                                                {/* Acciones */}
                                                <td className="px-4 py-3">
                                                    {carga.Estado_Carga === 'listo_para_procesar' && (
                                                        <button
                                                            onClick={() => handleProcesar(carga.ID_Carga)}
                                                            disabled={isProcesando}
                                                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                                        >
                                                            Procesar
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Modal: Subir archivo ─────────────────────────────────────────── */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                    <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
                        {/* Encabezado */}
                        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                            <h2 className="text-base font-semibold text-gray-900">Subir archivo Excel</h2>
                            <button
                                onClick={handleCloseModal}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Cuerpo */}
                        <form onSubmit={handleUpload} className="space-y-4 px-6 py-5">

                            {/* Tipo de archivo */}
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                    Tipo de archivo
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['asignaturas', 'electivas', 'malla'] as const).map((tipo) => {
                                        const t = TIPO_LABELS[tipo];
                                        const selected = selectedTipo === tipo;
                                        return (
                                            <button
                                                key={tipo}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedTipo(tipo);
                                                    if (tipo !== 'malla') setSelectedNormativa('');
                                                }}
                                                className={`rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-all ${
                                                    selected
                                                        ? 'border-green-600 bg-green-50 text-green-800'
                                                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                                }`}
                                            >
                                                {t.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Normativa — solo para tipo malla */}
                            {selectedTipo === 'malla' && (
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                        Normativa <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={selectedNormativa}
                                        onChange={(e) => setSelectedNormativa(e.target.value ? parseInt(e.target.value) : '')}
                                        required
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                                    >
                                        <option value="">Seleccione una normativa…</option>
                                        {normativas.map((n) => (
                                            <option key={n.ID_Normativa} value={n.ID_Normativa}>
                                                {n.Tipo_Normativa} {n.Numero_Normativa}/{n.Anio_Normativa} — {n.programa?.Nombre_Programa ?? 'Sin programa'}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Archivo */}
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                    Archivo Excel (.xlsx)
                                </label>
                                <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                                    required
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-green-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-green-700 hover:file:bg-green-100 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                                />
                            </div>

                            {/* Pie */}
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading || !selectedFile || !selectedTipo || (selectedTipo === 'malla' && !selectedNormativa)}
                                    className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {uploading ? (
                                        <span className="flex items-center gap-2">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            Subiendo…
                                        </span>
                                    ) : 'Subir'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Modal: Detalle de errores ────────────────────────────────────── */}
            {errorModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                    <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
                        {/* Encabezado */}
                        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                            <div>
                                <h2 className="text-base font-semibold text-gray-900">
                                    Detalle de problemas
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Carga #{errorModal.cargaId} — {TIPO_LABELS[errorModal.tipo]?.label ?? errorModal.tipo}
                                </p>
                            </div>
                            <button
                                onClick={() => { setErrorModal(null); setErrores([]); }}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Contenido */}
                        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
                            {loadingErrores ? (
                                <div className="flex items-center justify-center gap-3 py-10 text-gray-400">
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                                    <span className="text-sm">Cargando errores…</span>
                                </div>
                            ) : errores.length === 0 ? (
                                <p className="py-8 text-center text-sm text-gray-500">No se encontraron errores registrados.</p>
                            ) : (
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                            <th className="pb-3 pr-4">Severidad</th>
                                            <th className="pb-3 pr-4">Fila</th>
                                            <th className="pb-3 pr-4">Columna</th>
                                            <th className="pb-3 pr-4">Mensaje</th>
                                            <th className="pb-3">Valor recibido</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {errores.map((err) => (
                                            <tr key={err.ID_Error} className="align-top">
                                                <td className="py-2 pr-4">
                                                    {err.Severidad_Error === 'error' ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                                                            Error
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">
                                                            Advertencia
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-2 pr-4 font-mono text-gray-500">
                                                    {err.Fila_Error ?? '—'}
                                                </td>
                                                <td className="py-2 pr-4 text-gray-600">
                                                    {err.Columna_Error ?? '—'}
                                                </td>
                                                <td className="py-2 pr-4 text-gray-800">
                                                    {err.Mensaje_Error}
                                                </td>
                                                <td className="py-2 font-mono text-xs text-gray-500 max-w-[120px] truncate" title={err.Valor_Recibido ?? ''}>
                                                    {err.Valor_Recibido ?? '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Pie */}
                        <div className="flex justify-end border-t border-gray-100 px-6 py-4">
                            <button
                                onClick={() => { setErrorModal(null); setErrores([]); }}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
}