import { Head } from '@inertiajs/react';
import { useState, useEffect, useMemo } from 'react';
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
    tipo_carga: 'asignaturas' | 'electivas' | 'malla' | 'optativa' | string;
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

type TipoCarga = 'asignaturas' | 'electivas' | 'malla' | 'optativa' | '';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ESTADOS_TERMINALES = ['borrador', 'con_errores', 'aprobado', 'rechazado'];

const TIPO_LABELS: Record<string, { label: string; bg: string; text: string }> =
    {
        asignaturas: {
            label: 'Asignaturas',
            bg: 'bg-primary-container/10',
            text: 'text-primary',
        },
        electivas: {
            label: 'Electivas',
            bg: 'bg-on-tertiary-container/10',
            text: 'text-on-tertiary-fixed-variant',
        },
        malla: {
            label: 'Malla',
            bg: 'bg-primary-container/10',
            text: 'text-primary',
        },
        optativa: {
            label: 'Optativa',
            bg: 'bg-secondary-container/20',
            text: 'text-on-secondary-container',
        },
    };

const formatDate = (d: string) =>
    new Date(d).toLocaleString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

const COLUMN_LABELS: Record<string, string> = {
    agrupaciones: 'Agrupaciones',
    agrupacion_asignatura: 'Asignaturas de la agrupación',
    componentes: 'Componentes',
    requisitos: 'Requisitos',
    obligatoria: 'Tipo Obligatoria',
    asignatura: 'Código de Asignatura',
};

const friendlyColumnName = (col: string | null): string => {
    if (!col) return '';
    const key = col.replace(/^\d+/, '').toLowerCase();
    return COLUMN_LABELS[key] || col;
};

const simplifyErrorMessage = (msg: string): string => {
    // SQL constraint violations
    if (msg.includes('SQLSTATE[23000]') && msg.includes('1452')) {
        const match = msg.match(/REFERENCES\s+`?(\w+)`?/i);
        if (match) {
            const refTable = match[1]
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase());
            return `El valor no existe en la tabla de referencia (${refTable}). Verifique que los datos relacionados estén cargados primero.`;
        }
        return 'Error de integridad referencial: un valor no existe en la tabla relacionada.';
    }
    if (msg.includes('SQLSTATE[23000]') && msg.includes('1062')) {
        return 'Valor duplicado: este registro ya existe en el sistema.';
    }
    if (msg.includes('Data truncated')) {
        return 'El formato del valor no es válido para la columna. Revise que el tipo de dato sea correcto.';
    }
    if (msg.includes('bulk insert')) {
        const tableMatch = msg.match(/bulk insert de (\w+)/);
        if (tableMatch) {
            const table = tableMatch[1]
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase());
            return `Error al insertar datos en ${table}. Revise que los valores sean correctos.`;
        }
    }
    return msg;
};

// --- Subcomponente: Badge de Estado Unificado ---
const StatusBadge = ({ estado, tipo }: { estado: string; tipo: string }) => {
    const config: Record<
        string,
        { label: string; color: string; pulse?: boolean }
    > = {
        esperando_archivos: {
            label: 'Recibido',
            color: 'bg-slate-100 text-slate-600',
        },
        listo_para_procesar: {
            label: 'Listo',
            color: 'bg-blue-100 text-blue-700',
        },
        iniciado: {
            label: 'Procesando',
            color: 'bg-blue-600 text-white',
            pulse: true,
        },
        validando: {
            label: 'Validando',
            color: 'bg-amber-500 text-white',
            pulse: true,
        },
        borrador: { label: 'Borrador', color: 'bg-slate-200 text-slate-700' },
        con_errores: {
            label: 'Con Errores',
            color: 'bg-rose-100 text-rose-700',
        },
        pendiente_aprobacion: {
            label: 'En Revisión',
            color: 'bg-violet-100 text-violet-700',
        },
        aprobado: {
            label: 'Completado',
            color: 'bg-emerald-100 text-emerald-700',
        },
        rechazado: { label: 'Rechazado', color: 'bg-rose-600 text-white' },
    };

    const s = config[estado] || {
        label: estado,
        color: 'bg-slate-100 text-slate-600',
    };

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase ${s.color}`}
        >
            {s.pulse && (
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-white" />
            )}
            {s.label}
        </span>
    );
};

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Cargas() {
    const [cargas, setCargas] = useState<Carga[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal de subida
    const [showModal, setShowModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedTipo, setSelectedTipo] = useState<TipoCarga>('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Modal de errores
    const [errorModal, setErrorModal] = useState<{
        cargaId: number;
        tipo: string;
    } | null>(null);
    const [errores, setErrores] = useState<ErrorCarga[]>([]);
    const [loadingErrores, setLoadingErrores] = useState(false);

    // Confirmación de eliminación
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Polling
    const [pollingIds, setPollingIds] = useState<Set<number>>(new Set());

    // Procesamiento en curso (evita doble clic)
    const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

    // Filtros
    const [filtroTipo, setFiltroTipo] = useState<string>('');
    const [filtroEstado, setFiltroEstado] = useState<string>('');
    const [filtroBusqueda, setFiltroBusqueda] = useState<string>('');

    // Toast notifications
    const [toast, setToast] = useState<{
        message: string;
        type: 'error' | 'success' | 'info';
    } | null>(null);

    useEffect(() => {
        if (toast) {
            const t = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(t);
        }
    }, [toast]);

    const apiUrl = window.location.origin;

    const getCsrf = () =>
        document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute('content') ?? '';

    // ── Fetch inicial ──────────────────────────────────────────────────────────

    useEffect(() => {
        fetchCargas();
    }, []);

    // ── Polling ────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (pollingIds.size === 0) {
            return;
        }

        const interval = setInterval(() => {
            pollingIds.forEach((id) => fetchEstado(id));
        }, 3000);

        return () => clearInterval(interval);
    }, [pollingIds]);

    const fetchCargas = async () => {
        try {
            const res = await fetch(`${apiUrl}/api/v1/cargas`, {
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': getCsrf(),
                },
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

    const fetchEstado = async (id: number) => {
        try {
            const res = await fetch(`${apiUrl}/api/v1/cargas/${id}/estado`, {
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': getCsrf(),
                },
                credentials: 'same-origin',
            });

            if (res.ok) {
                const data = await res.json();
                const estado: string =
                    data.data?.Estado_Carga ?? data.data?.estado ?? '';

                if (ESTADOS_TERMINALES.includes(estado)) {
                    setPollingIds((prev) => {
                        const next = new Set(prev);
                        next.delete(id);

                        return next;
                    });
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
            const res = await fetch(
                `${apiUrl}/api/v1/cargas/${cargaId}/errores`,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-CSRF-TOKEN': getCsrf(),
                    },
                    credentials: 'same-origin',
                },
            );

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

        if (!selectedTipo || !selectedFile) {
            setToast({
                message: 'Seleccione el tipo de archivo y un archivo Excel.',
                type: 'error',
            });
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
                    tipo_carga: selectedTipo,
                }),
            });

            const createData = await createRes.json();

            if (!createRes.ok) {
                const msgs = createData.errors
                    ? Object.values(createData.errors).flat().join('\n')
                    : (createData.message ?? 'Error al crear la carga');
                setToast({ message: msgs, type: 'error' });
                return;
            }

            const cargaId: number =
                createData.data.carga_id ?? createData.data.ID_Carga;

            // 2. Subir el archivo
            const form = new FormData();
            form.append('archivo', selectedFile);
            form.append('tipo_archivo', selectedTipo);

            const uploadRes = await fetch(
                `${apiUrl}/api/v1/cargas/${cargaId}/archivo`,
                {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': getCsrf(),
                    },
                    credentials: 'same-origin',
                    body: form,
                },
            );

            // El backend responde JSON, pero si PHP emite un warning que se
            // imprime antes (p.ej. al superar `post_max_size`), la respuesta
            // deja de ser JSON válido. Parseamos de forma robusta para
            // mostrar el mensaje real en lugar de un error de sintaxis.
            let uploadData: Record<string, any> = {};

            try {
                uploadData = await uploadRes.json();
            } catch {
                const text = await uploadRes.text().catch(() => '');
                setToast({
                    message: text
                        ? `El servidor respondió con un error inesperado: ${text.slice(0, 200)}`
                        : 'Error inesperado al subir el archivo.',
                    type: 'error',
                });
                return;
            }

            if (!uploadRes.ok) {
                const msgs = uploadData.errors
                    ? Object.values(uploadData.errors).flat().join('\n')
                    : (uploadData.message ?? 'Error al subir el archivo');
                setToast({ message: msgs, type: 'error' });
                return;
            }

            handleCloseModal();

            const estadoActual: string =
                uploadData.data?.estado_carga_actual ?? '';

            if (
                estadoActual === 'listo_para_procesar' ||
                estadoActual === 'iniciado'
            ) {
                setPollingIds((prev) => new Set(prev).add(cargaId));
            }

            fetchCargas();
        } catch (e) {
            console.error('Error en upload:', e);
            setToast({
                message: 'Error de conexión al subir el archivo.',
                type: 'error',
            });
        } finally {
            setUploading(false);
        }
    };

    const handleProcesar = async (cargaId: number) => {
        setProcessingIds((prev) => new Set(prev).add(cargaId));
        try {
            const res = await fetch(
                `${apiUrl}/api/v1/cargas/${cargaId}/procesar`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': getCsrf(),
                    },
                    credentials: 'same-origin',
                },
            );

            if (!res.ok) {
                const data = await res.json();
                setToast({
                    message: data.message ?? 'Error al procesar.',
                    type: 'error',
                });
                return;
            }

            setToast({
                message: 'Procesamiento iniciado correctamente.',
                type: 'success',
            });
            setPollingIds((prev) => new Set(prev).add(cargaId));
            fetchCargas();
        } catch (e) {
            console.error('Error procesando:', e);
            setToast({
                message: 'Error de conexión al procesar.',
                type: 'error',
            });
        } finally {
            setProcessingIds((prev) => {
                const next = new Set(prev);
                next.delete(cargaId);
                return next;
            });
        }
    };

    const handleOpenErrores = (carga: Carga) => {
        setErrorModal({ cargaId: carga.ID_Carga, tipo: carga.tipo_carga });
        fetchErrores(carga.ID_Carga);
    };

    const handleDelete = async (cargaId: number) => {
        setDeleting(true);
        try {
            const res = await fetch(`${apiUrl}/api/v1/cargas/${cargaId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCsrf(),
                },
                credentials: 'same-origin',
            });

            const data = await res.json();

            if (!res.ok) {
                setToast({
                    message: data.message ?? 'Error al eliminar la carga.',
                    type: 'error',
                });
                setDeleting(false);
                return;
            }

            setDeleteConfirm(null);
            setDeleting(false);
            setToast({
                message: 'Carga eliminada correctamente.',
                type: 'success',
            });
            fetchCargas();
        } catch (e) {
            console.error('Error deleting carga:', e);
            setToast({
                message: 'Error de conexión al eliminar.',
                type: 'error',
            });
            setDeleting(false);
        }
    };

    const ESTADOS_ELIMINABLES = [
        'esperando_archivos',
        'listo_para_procesar',
        'con_errores',
        'borrador',
    ];

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedTipo('');
        setSelectedFile(null);
    };

    // ── Filtros aplicados (Memoized) ───────────────────────────────────────────

    const cargasFiltradas = useMemo(() => {
        return cargas.filter((c) => {
            const matchTipo = !filtroTipo || c.tipo_carga === filtroTipo;
            const matchEstado =
                !filtroEstado || c.Estado_Carga === filtroEstado;
            const searchLower = filtroBusqueda.toLowerCase();
            const matchSearch =
                !filtroBusqueda ||
                c.usuario?.Nombre_Usuario?.toLowerCase().includes(
                    searchLower,
                ) ||
                c.normativa?.Numero_Normativa?.includes(searchLower);

            return matchTipo && matchEstado && matchSearch;
        });
    }, [cargas, filtroTipo, filtroEstado, filtroBusqueda]);

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <MainLayout>
            <Head title="Gestión de Cargas" />

            {/* Toast Notification */}
            {toast && (
                <div className="fixed top-6 right-6 z-[200] duration-300 animate-in fade-in slide-in-from-right-4">
                    <div
                        className={`flex items-center gap-3 rounded-2xl border px-5 py-3 text-sm font-bold shadow-2xl ${
                            toast.type === 'error'
                                ? 'border-red-200 bg-red-50 text-red-700'
                                : toast.type === 'success'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border-blue-200 bg-blue-50 text-blue-700'
                        }`}
                    >
                        <span className="material-symbols-outlined !text-lg">
                            {toast.type === 'error'
                                ? 'error'
                                : toast.type === 'success'
                                  ? 'check_circle'
                                  : 'info'}
                        </span>
                        {toast.message}
                        <button
                            onClick={() => setToast(null)}
                            className="ml-2 opacity-60 hover:opacity-100"
                        >
                            <span className="material-symbols-outlined !text-lg">
                                close
                            </span>
                        </button>
                    </div>
                </div>
            )}

            <div className="mx-auto max-w-[1400px] space-y-6 pb-10">
                {/* Header Profesional */}
                <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900">
                            Cargas de Archivos
                        </h1>
                        <p className="text-sm text-slate-500">
                            Monitoreo y procesamiento de datos institucionales.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 rounded-xl bg-[#00236f] px-5 py-2.5 font-bold text-white shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-95"
                    >
                        <span className="material-symbols-outlined !text-xl">
                            cloud_upload
                        </span>
                        Nueva Carga
                    </button>
                </div>

                {/* Filtros Inteligentes (Compactos) */}
                <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="relative min-w-[240px] flex-1">
                        <span className="material-symbols-outlined absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">
                            search
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar por usuario o normativa..."
                            className="w-full rounded-xl border-none bg-slate-50 py-2 pr-4 pl-10 text-sm focus:ring-2 focus:ring-blue-500"
                            value={filtroBusqueda}
                            onChange={(e) => setFiltroBusqueda(e.target.value)}
                        />
                    </div>
                    <select
                        className="rounded-xl border-none bg-slate-50 px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                        value={filtroTipo}
                        onChange={(e) => setFiltroTipo(e.target.value)}
                    >
                        <option value="">Todos los tipos</option>
                        <option value="malla">Malla Curricular</option>
                        <option value="asignaturas">
                            Catálogo Asignaturas
                        </option>
                    </select>
                    {pollingIds.size > 0 && (
                        <div className="flex animate-pulse items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                            <span className="material-symbols-outlined animate-spin !text-sm">
                                sync
                            </span>
                            {pollingIds.size} en proceso
                        </div>
                    )}
                </div>

                {/* Tabla Refactorizada */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px] border-collapse">
                            <thead>
                                <tr>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                                        Carga & Tipo
                                    </th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                                        Programa / Normativa
                                    </th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                                        Estado
                                    </th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                                        Calidad de Datos
                                    </th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                                        Registro
                                    </th>
                                    <th className="px-6 py-4 text-right text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {cargasFiltradas.map((carga) => (
                                    <tr
                                        key={carga.ID_Carga}
                                        className={`transition-colors hover:bg-slate-50/80 ${pollingIds.has(carga.ID_Carga) ? 'bg-blue-50/30' : ''}`}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-mono text-xs text-slate-400">
                                                    #{carga.ID_Carga}
                                                </span>
                                                <span className="text-sm font-bold text-slate-800 capitalize">
                                                    {carga.tipo_carga}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex max-w-[250px] flex-col">
                                                <span className="truncate text-sm font-semibold text-slate-700">
                                                    {carga.programa
                                                        ?.Nombre_Programa ||
                                                        carga.normativa
                                                            ?.programa
                                                            ?.Nombre_Programa ||
                                                        '—'}
                                                </span>
                                                <span className="text-xs text-slate-400">
                                                    {carga.normativa
                                                        ? `${carga.normativa.Tipo_Normativa} ${carga.normativa.Numero_Normativa}`
                                                        : 'Sin normativa'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge
                                                estado={carga.Estado_Carga}
                                                tipo={carga.tipo_carga}
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {(carga.errores_count || 0) >
                                                    0 && (
                                                    <button
                                                        onClick={() =>
                                                            handleOpenErrores(
                                                                carga,
                                                            )
                                                        }
                                                        className="flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-black text-rose-600 ring-1 ring-rose-200 transition-colors hover:bg-rose-100"
                                                    >
                                                        <span className="material-symbols-outlined !text-sm">
                                                            error
                                                        </span>
                                                        {carga.errores_count}
                                                    </button>
                                                )}
                                                {(carga.advertencias_count ||
                                                    0) > 0 && (
                                                    <div className="flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-black text-amber-600 ring-1 ring-amber-200">
                                                        <span className="material-symbols-outlined !text-sm">
                                                            warning
                                                        </span>
                                                        {
                                                            carga.advertencias_count
                                                        }
                                                    </div>
                                                )}
                                                {!carga.errores_count &&
                                                    !carga.advertencias_count && (
                                                        <span className="material-symbols-outlined !text-sm text-emerald-400">
                                                            check_circle
                                                        </span>
                                                    )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col text-[11px]">
                                                <span className="font-bold text-slate-600">
                                                    {
                                                        carga.usuario
                                                            ?.Nombre_Usuario
                                                    }
                                                </span>
                                                <span className="text-slate-400">
                                                    {new Date(
                                                        carga.Creacion_Carga,
                                                    ).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-1">
                                                {carga.Estado_Carga ===
                                                    'listo_para_procesar' && (
                                                    <button
                                                        onClick={() =>
                                                            handleProcesar(
                                                                carga.ID_Carga,
                                                            )
                                                        }
                                                        disabled={pollingIds.has(
                                                            carga.ID_Carga,
                                                        ) || processingIds.has(
                                                            carga.ID_Carga,
                                                        )}
                                                        className="rounded-lg bg-blue-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                                                    >
                                                        {processingIds.has(
                                                            carga.ID_Carga,
                                                        )
                                                            ? 'PROCESANDO…'
                                                            : 'PROCESAR'}
                                                    </button>
                                                )}
                                                {[
                                                    'esperando_archivos',
                                                    'listo_para_procesar',
                                                    'con_errores',
                                                    'borrador',
                                                ].includes(
                                                    carga.Estado_Carga,
                                                ) && (
                                                    <button
                                                        onClick={() =>
                                                            setDeleteConfirm(
                                                                carga.ID_Carga,
                                                            )
                                                        }
                                                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                                        title="Eliminar carga"
                                                    >
                                                        <span className="material-symbols-outlined !text-xl">
                                                            delete
                                                        </span>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() =>
                                                        handleOpenErrores(carga)
                                                    }
                                                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                                                    title="Ver Errores"
                                                >
                                                    <span className="material-symbols-outlined !text-xl">
                                                        visibility
                                                    </span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {loading ? (
                        <div className="flex items-center justify-center gap-3 py-20 text-slate-400">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
                            <span className="text-sm font-medium">
                                Cargando registros…
                            </span>
                        </div>
                    ) : (
                        cargasFiltradas.length === 0 && (
                            <div className="py-20 text-center">
                                <span className="material-symbols-outlined !text-6xl text-slate-200">
                                    folder_open
                                </span>
                                <p className="mt-4 font-medium text-slate-400">
                                    No se encontraron registros de carga.
                                </p>
                                {(filtroTipo || filtroBusqueda) && (
                                    <button
                                        onClick={() => {
                                            setFiltroTipo('');
                                            setFiltroBusqueda('');
                                        }}
                                        className="mt-2 text-sm font-semibold text-blue-600 hover:underline"
                                    >
                                        Limpiar filtros
                                    </button>
                                )}
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Modal de Subida Refactorizado */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl duration-200 animate-in fade-in zoom-in">
                        <div className="p-8">
                            <div className="mb-6 flex items-center justify-between">
                                <h2 className="text-2xl font-black text-slate-900">
                                    Subir Archivo
                                </h2>
                                <button
                                    onClick={handleCloseModal}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <span className="material-symbols-outlined">
                                        close
                                    </span>
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Selector de Tipo Estilizado */}
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        'malla',
                                        'asignaturas',
                                        'electivas',
                                        'optativa',
                                    ].map((tipo) => (
                                        <button
                                            key={tipo}
                                            onClick={() =>
                                                setSelectedTipo(tipo as any)
                                            }
                                            className={`flex flex-col gap-2 rounded-2xl border-2 p-4 text-left transition-all ${selectedTipo === tipo ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-50' : 'border-slate-100 hover:border-slate-200'}`}
                                        >
                                            <span
                                                className={`material-symbols-outlined ${selectedTipo === tipo ? 'text-blue-600' : 'text-slate-400'}`}
                                            >
                                                {tipo === 'malla'
                                                    ? 'account_tree'
                                                    : tipo === 'asignaturas'
                                                      ? 'auto_stories'
                                                      : tipo === 'electivas'
                                                        ? 'star_half'
                                                        : 'playlist_add_check'}
                                            </span>
                                            <span
                                                className={`text-xs font-bold tracking-wider uppercase ${selectedTipo === tipo ? 'text-blue-700' : 'text-slate-500'}`}
                                            >
                                                {tipo}
                                            </span>
                                        </button>
                                    ))}
                                </div>

                                {/* Dropzone Moderna */}
                                <div
                                    className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all ${selectedFile ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}
                                >
                                    <input
                                        type="file"
                                        className="absolute inset-0 cursor-pointer opacity-0"
                                        accept=".xlsx,.xls,.csv"
                                        onChange={(e) =>
                                            setSelectedFile(
                                                e.target.files?.[0] || null,
                                            )
                                        }
                                    />
                                    <span
                                        className={`material-symbols-outlined mb-2 !text-4xl ${selectedFile ? 'text-emerald-500' : 'text-slate-300'}`}
                                    >
                                        {selectedFile
                                            ? 'check_circle'
                                            : 'upload_file'}
                                    </span>
                                    <p className="text-sm font-bold text-slate-700">
                                        {selectedFile
                                            ? selectedFile.name
                                            : 'Arrastra tu archivo Excel aquí'}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-400">
                                        Soporta .xlsx hasta 10MB
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 bg-slate-50 p-6">
                            <button
                                onClick={handleCloseModal}
                                className="px-6 py-2 text-sm font-bold text-slate-500 hover:text-slate-700"
                            >
                                CANCELAR
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={
                                    uploading || !selectedFile || !selectedTipo
                                }
                                className="rounded-xl bg-[#00236f] px-8 py-2 text-sm font-bold text-white shadow-lg disabled:opacity-50 disabled:grayscale"
                            >
                                {uploading ? (
                                    <span className="flex items-center gap-2">
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        SUBIENDO…
                                    </span>
                                ) : (
                                    'INICIAR CARGA'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Detalle de errores ────────────────────────────────────── */}
            {errorModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{
                        backgroundColor: 'rgba(15, 17, 20, 0.55)',
                        backdropFilter: 'blur(8px)',
                    }}
                >
                    <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                            <div>
                                <h2 className="text-lg font-bold tracking-tight text-slate-900">
                                    Detalle de problemas
                                </h2>
                                <p className="text-sm text-slate-500">
                                    Carga #{errorModal.cargaId}{' '}
                                    <span className="mx-1.5 text-slate-300">
                                        ·
                                    </span>
                                    {TIPO_LABELS[errorModal.tipo]?.label ??
                                        errorModal.tipo}
                                    {errores.length > 0 && (
                                        <>
                                            <span className="mx-1.5 text-slate-300">
                                                ·
                                            </span>
                                            <span className="font-semibold text-slate-600">
                                                {errores.length} registro
                                                {errores.length !== 1
                                                    ? 's'
                                                    : ''}
                                            </span>
                                        </>
                                    )}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setErrorModal(null);
                                    setErrores([]);
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                            >
                                <span className="material-symbols-outlined !text-xl">
                                    close
                                </span>
                            </button>
                        </div>

                        {/* Summary bar */}
                        {errores.length > 0 && !loadingErrores && (
                            <div className="flex gap-3 border-b border-slate-100 px-6 py-3">
                                {(() => {
                                    const errCount = errores.filter(
                                        (e) => e.Severidad_Error === 'error',
                                    ).length;
                                    const warnCount = errores.filter(
                                        (e) =>
                                            e.Severidad_Error === 'advertencia',
                                    ).length;
                                    return (
                                        <>
                                            {errCount > 0 && (
                                                <div className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5">
                                                    <span className="material-symbols-outlined !text-base text-red-600">
                                                        error
                                                    </span>
                                                    <span className="text-xs font-bold text-red-700">
                                                        {errCount} error
                                                        {errCount !== 1
                                                            ? 'es'
                                                            : ''}
                                                    </span>
                                                </div>
                                            )}
                                            {warnCount > 0 && (
                                                <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5">
                                                    <span className="material-symbols-outlined !text-base text-amber-600">
                                                        warning
                                                    </span>
                                                    <span className="text-xs font-bold text-amber-700">
                                                        {warnCount} advertencia
                                                        {warnCount !== 1
                                                            ? 's'
                                                            : ''}
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        )}

                        {/* Content */}
                        <div className="max-h-[55vh] overflow-y-auto">
                            {loadingErrores ? (
                                <div className="flex items-center justify-center gap-3 py-16 text-slate-400">
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
                                    <span className="text-sm font-medium">
                                        Cargando errores…
                                    </span>
                                </div>
                            ) : errores.length === 0 ? (
                                <div className="py-16 text-center">
                                    <span className="material-symbols-outlined !text-5xl text-emerald-200">
                                        check_circle
                                    </span>
                                    <p className="mt-3 font-medium text-slate-500">
                                        No se encontraron errores registrados.
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {errores.map((err) => (
                                        <div
                                            key={err.ID_Error}
                                            className={`px-6 py-4 transition-colors hover:bg-slate-50/50 ${
                                                err.Severidad_Error === 'error'
                                                    ? 'border-l-2 border-l-red-400'
                                                    : 'border-l-2 border-l-amber-400'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        {err.Severidad_Error ===
                                                        'error' ? (
                                                            <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-bold tracking-wide text-red-700 uppercase">
                                                                <span className="material-symbols-outlined !text-xs">
                                                                    error
                                                                </span>
                                                                Error
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold tracking-wide text-amber-700 uppercase">
                                                                <span className="material-symbols-outlined !text-xs">
                                                                    warning
                                                                </span>
                                                                Advertencia
                                                            </span>
                                                        )}
                                                        {(err.Fila_Error ||
                                                            err.Columna_Error) && (
                                                            <span className="font-mono text-[11px] text-slate-400">
                                                                {err.Fila_Error &&
                                                                    `Fila ${err.Fila_Error}`}
                                                                {err.Fila_Error &&
                                                                    err.Columna_Error &&
                                                                    ' · '}
                                                                {err.Columna_Error &&
                                                                    friendlyColumnName(
                                                                        err.Columna_Error,
                                                                    )}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="mt-1.5 text-sm leading-relaxed text-slate-800">
                                                        {simplifyErrorMessage(
                                                            err.Mensaje_Error,
                                                        )}
                                                    </p>
                                                    {err.Valor_Recibido && (
                                                        <div className="mt-1.5 flex items-center gap-1.5">
                                                            <span className="text-[11px] font-medium text-slate-400 uppercase">
                                                                Valor:
                                                            </span>
                                                            <code className="max-w-full truncate rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600">
                                                                {
                                                                    err.Valor_Recibido
                                                                }
                                                            </code>
                                                        </div>
                                                    )}
                                                    {err.Mensaje_Error.includes(
                                                        'SQLSTATE',
                                                    ) && (
                                                        <details className="mt-2">
                                                            <summary className="cursor-pointer text-[11px] font-medium text-slate-400 hover:text-slate-600">
                                                                Detalle técnico
                                                            </summary>
                                                            <pre className="mt-1 whitespace-pre-wrap rounded bg-slate-50 p-2 font-mono text-[11px] text-slate-500">
                                                                {
                                                                    err.Mensaje_Error
                                                                }
                                                            </pre>
                                                        </details>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end border-t border-slate-100 px-6 py-4">
                            <button
                                onClick={() => {
                                    setErrorModal(null);
                                    setErrores([]);
                                }}
                                className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* ── Modal: Confirmar eliminación ──────────────────────────────────── */}
            {deleteConfirm && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    style={{
                        backgroundColor: 'rgba(25, 28, 30, 0.4)',
                        backdropFilter: 'blur(8px)',
                    }}
                >
                    <div
                        className="w-full max-w-sm overflow-hidden rounded-xl shadow-2xl"
                        style={{
                            backgroundColor:
                                'var(--unal-surface-container-lowest)',
                            border: '1px solid var(--unal-outline-variant)',
                        }}
                    >
                        <div className="px-6 py-6 text-center">
                            <span className="material-symbols-outlined mb-3 !text-5xl text-red-500">
                                warning
                            </span>
                            <h3
                                className="text-lg font-bold"
                                style={{
                                    color: 'var(--unal-on-surface)',
                                }}
                            >
                                ¿Eliminar carga #{deleteConfirm}?
                            </h3>
                            <p
                                className="mt-1 text-sm"
                                style={{
                                    color: 'var(--unal-on-surface-variant)',
                                }}
                            >
                                Esta acción eliminará la carga, sus archivos y
                                la malla asociada si está en borrador. No se
                                puede deshacer.
                            </p>
                        </div>
                        <div
                            className="flex justify-end gap-2 px-6 py-4"
                            style={{
                                borderTop:
                                    '1px solid var(--unal-outline-variant)',
                            }}
                        >
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="rounded-lg px-4 py-2 text-sm transition-colors"
                                style={{
                                    border: '1px solid var(--unal-outline)',
                                    color: 'var(--unal-on-surface-variant)',
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                disabled={deleting}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {deleting ? (
                                    <span className="flex items-center gap-2">
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        ELIMINANDO…
                                    </span>
                                ) : (
                                    'Eliminar'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
}
