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

const TIPO_LABELS: Record<string, { label: string; bg: string; text: string }> = {
    asignaturas: { label: 'Asignaturas', bg: 'bg-primary-container/10', text: 'text-primary' },
    electivas:   { label: 'Electivas',   bg: 'bg-on-tertiary-container/10', text: 'text-on-tertiary-fixed-variant' },
    malla:       { label: 'Malla',       bg: 'bg-primary-container/10', text: 'text-primary' },
    optativa:    { label: 'Optativa',    bg: 'bg-secondary-container/20', text: 'text-on-secondary-container' },
};

const formatDate = (d: string) =>
    new Date(d).toLocaleString('es-CO', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

// --- Subcomponente: Badge de Estado Unificado ---
const StatusBadge = ({ estado, tipo }: { estado: string, tipo: string }) => {
    const config: Record<string, { label: string, color: string, pulse?: boolean }> = {
        esperando_archivos:  { label: 'Recibido', color: 'bg-slate-100 text-slate-600' },
        listo_para_procesar: { label: 'Listo', color: 'bg-blue-100 text-blue-700' },
        iniciado:            { label: 'Procesando', color: 'bg-blue-600 text-white', pulse: true },
        validando:           { label: 'Validando', color: 'bg-amber-500 text-white', pulse: true },
        borrador:            { label: 'Borrador', color: 'bg-slate-200 text-slate-700' },
        con_errores:         { label: 'Con Errores', color: 'bg-rose-100 text-rose-700' },
        pendiente_aprobacion: { label: 'En Revisión', color: 'bg-violet-100 text-violet-700' },
        aprobado:            { label: 'Completado', color: 'bg-emerald-100 text-emerald-700' },
        rechazado:           { label: 'Rechazado', color: 'bg-rose-600 text-white' },
    };

    const s = config[estado] || { label: estado, color: 'bg-slate-100 text-slate-600' };

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${s.color}`}>
            {s.pulse && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
            {s.label}
        </span>
    );
};

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Cargas() {
    const [cargas, setCargas]           = useState<Carga[]>([]);
    const [loading, setLoading]         = useState(true);

    // Modal de subida
    const [showModal, setShowModal]             = useState(false);
    const [uploading, setUploading]             = useState(false);
    const [selectedTipo, setSelectedTipo]       = useState<TipoCarga>('');
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
    const [filtroBusqueda, setFiltroBusqueda] = useState<string>('');

    const apiUrl = window.location.origin;

    const getCsrf = () =>
        document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';

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
                    setPollingIds((prev) => {
 const next = new Set(prev); next.delete(id);

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

        if (!selectedTipo || !selectedFile) {
            alert('Seleccione el tipo de archivo y un archivo Excel.');

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
        setSelectedFile(null);
    };

    // ── Filtros aplicados (Memoized) ───────────────────────────────────────────

    const cargasFiltradas = useMemo(() => {
        return cargas.filter(c => {
            const matchTipo = !filtroTipo || c.tipo_carga === filtroTipo;
            const matchEstado = !filtroEstado || c.Estado_Carga === filtroEstado;
            const searchLower = filtroBusqueda.toLowerCase();
            const matchSearch = !filtroBusqueda || 
                c.usuario?.Nombre_Usuario?.toLowerCase().includes(searchLower) ||
                c.normativa?.Numero_Normativa?.includes(searchLower);

            return matchTipo && matchEstado && matchSearch;
        });
    }, [cargas, filtroTipo, filtroEstado, filtroBusqueda]);

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <MainLayout>
            <Head title="Gestión de Cargas" />

            <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
                {/* Header Profesional */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Cargas de Archivos</h1>
                        <p className="text-slate-500 text-sm">Monitoreo y procesamiento de datos institucionales.</p>
                    </div>
                    <button 
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#00236f] text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        <span className="material-symbols-outlined !text-xl">cloud_upload</span>
                        Nueva Carga
                    </button>
                </div>

                {/* Filtros Inteligentes (Compactos) */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
                    <div className="flex-1 min-w-[240px] relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                        <input 
                            type="text"
                            placeholder="Buscar por usuario o normativa..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                            value={filtroBusqueda}
                            onChange={(e) => setFiltroBusqueda(e.target.value)}
                        />
                    </div>
                    <select 
                        className="bg-slate-50 border-none rounded-xl text-sm py-2 px-4 focus:ring-2 focus:ring-blue-500"
                        value={filtroTipo}
                        onChange={(e) => setFiltroTipo(e.target.value)}
                    >
                        <option value="">Todos los tipos</option>
                        <option value="malla">Malla Curricular</option>
                        <option value="asignaturas">Catálogo Asignaturas</option>
                    </select>
                    {pollingIds.size > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-bold animate-pulse">
                            <span className="material-symbols-outlined animate-spin !text-sm">sync</span>
                            {pollingIds.size} en proceso
                        </div>
                    )}
                </div>

                {/* Tabla Refactorizada */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-left">Carga & Tipo</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-left">Programa / Normativa</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-left">Estado</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-left">Calidad de Datos</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-left">Registro</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {cargasFiltradas.map((carga) => (
                                <tr key={carga.ID_Carga} className={`hover:bg-slate-50/80 transition-colors ${pollingIds.has(carga.ID_Carga) ? 'bg-blue-50/30' : ''}`}>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-mono text-slate-400">#{carga.ID_Carga}</span>
                                            <span className="text-sm font-bold text-slate-800 capitalize">{carga.tipo_carga}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col max-w-[250px]">
                                            <span className="text-sm font-semibold text-slate-700 truncate">
                                                {carga.programa?.Nombre_Programa || carga.normativa?.programa?.Nombre_Programa || '—'}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {carga.normativa ? `${carga.normativa.Tipo_Normativa} ${carga.normativa.Numero_Normativa}` : 'Sin normativa'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge estado={carga.Estado_Carga} tipo={carga.tipo_carga} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {(carga.errores_count || 0) > 0 && (
                                                <button
                                                    onClick={() => handleOpenErrores(carga)}
                                                    className="flex items-center gap-1 px-2 py-1 bg-rose-50 text-rose-600 rounded-lg text-[11px] font-black ring-1 ring-rose-200 hover:bg-rose-100 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined !text-sm">error</span>
                                                    {carga.errores_count}
                                                </button>
                                            )}
                                            {(carga.advertencias_count || 0) > 0 && (
                                                <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-[11px] font-black ring-1 ring-amber-200">
                                                    <span className="material-symbols-outlined !text-sm">warning</span>
                                                    {carga.advertencias_count}
                                                </div>
                                            )}
                                            {!carga.errores_count && !carga.advertencias_count && (
                                                <span className="material-symbols-outlined text-emerald-400 !text-sm">check_circle</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col text-[11px]">
                                            <span className="font-bold text-slate-600">{carga.usuario?.Nombre_Usuario}</span>
                                            <span className="text-slate-400">{new Date(carga.Creacion_Carga).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-1">
                                            {carga.Estado_Carga === 'listo_para_procesar' && (
                                                <button
                                                    onClick={() => handleProcesar(carga.ID_Carga)}
                                                    disabled={pollingIds.has(carga.ID_Carga)}
                                                    className="px-3 py-1 bg-blue-600 text-white text-[11px] font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                                >
                                                    PROCESAR
                                                </button>
                                            )}
                                            {carga.Estado_Carga === 'con_errores' && (
                                                <button
                                                    onClick={() => handleProcesar(carga.ID_Carga)}
                                                    className="px-3 py-1 bg-amber-500 text-white text-[11px] font-bold rounded-lg hover:bg-amber-600"
                                                    title="Reintentar"
                                                >
                                                    REINTENTAR
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleOpenErrores(carga)}
                                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                title="Ver Errores"
                                            >
                                                <span className="material-symbols-outlined !text-xl">visibility</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {loading ? (
                        <div className="flex items-center justify-center gap-3 py-20 text-slate-400">
                            <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                            <span className="text-sm font-medium">Cargando registros…</span>
                        </div>
                    ) : cargasFiltradas.length === 0 && (
                        <div className="py-20 text-center">
                            <span className="material-symbols-outlined !text-6xl text-slate-200">folder_open</span>
                            <p className="mt-4 text-slate-400 font-medium">No se encontraron registros de carga.</p>
                            {(filtroTipo || filtroBusqueda) && (
                                <button
                                    onClick={() => {
 setFiltroTipo(''); setFiltroBusqueda(''); 
}}
                                    className="mt-2 text-blue-600 text-sm font-semibold hover:underline"
                                >
                                    Limpiar filtros
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Subida Refactorizado */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-black text-slate-900">Subir Archivo</h2>
                                <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Selector de Tipo Estilizado */}
                                <div className="grid grid-cols-2 gap-3">
                                    {['malla', 'asignaturas', 'electivas', 'optativa'].map((tipo) => (
                                        <button
                                            key={tipo}
                                            onClick={() => setSelectedTipo(tipo as any)}
                                            className={`p-4 rounded-2xl border-2 transition-all text-left flex flex-col gap-2
                                                ${selectedTipo === tipo ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-50' : 'border-slate-100 hover:border-slate-200'}`}
                                        >
                                            <span className={`material-symbols-outlined ${selectedTipo === tipo ? 'text-blue-600' : 'text-slate-400'}`}>
                                                {tipo === 'malla' ? 'account_tree' : tipo === 'asignaturas' ? 'auto_stories' : tipo === 'electivas' ? 'star_half' : 'playlist_add_check'}
                                            </span>
                                            <span className={`text-xs font-bold uppercase tracking-wider ${selectedTipo === tipo ? 'text-blue-700' : 'text-slate-500'}`}>
                                                {tipo}
                                            </span>
                                        </button>
                                    ))}
                                </div>

                                {/* Dropzone Moderna */}
                                <div 
                                    className={`relative border-2 border-dashed rounded-2xl p-10 transition-all flex flex-col items-center justify-center text-center
                                        ${selectedFile ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}
                                >
                                    <input 
                                        type="file" 
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        accept=".xlsx,.xls,.csv"
                                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                    />
                                    <span className={`material-symbols-outlined !text-4xl mb-2 ${selectedFile ? 'text-emerald-500' : 'text-slate-300'}`}>
                                        {selectedFile ? 'check_circle' : 'upload_file'}
                                    </span>
                                    <p className="text-sm font-bold text-slate-700">
                                        {selectedFile ? selectedFile.name : 'Arrastra tu archivo Excel aquí'}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">Soporta .xlsx hasta 10MB</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 flex justify-end gap-3">
                            <button onClick={handleCloseModal} className="px-6 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">
                                CANCELAR
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={uploading || !selectedFile || !selectedTipo}
                                className="px-8 py-2 bg-[#00236f] text-white rounded-xl text-sm font-bold shadow-lg disabled:opacity-50 disabled:grayscale"
                            >
                                {uploading ? (
                                    <span className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        SUBIENDO…
                                    </span>
                                ) : 'INICIAR CARGA'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Detalle de errores ────────────────────────────────────── */}
            {errorModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(25, 28, 30, 0.4)', backdropFilter: 'blur(8px)' }}>
                    <div className="w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden" style={{ backgroundColor: 'var(--unal-surface-container-lowest)', border: '1px solid var(--unal-outline-variant)' }}>
                        {/* Header */}
                        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--unal-outline-variant)' }}>
                            <div>
                                <h2 style={{ fontSize: '14px', lineHeight: '20px', fontWeight: 600, color: 'var(--unal-on-surface)' }}>
                                    Detalle de problemas
                                </h2>
                                <p style={{ fontSize: '12px', lineHeight: '16px', color: 'var(--unal-on-surface-variant)' }} className="mt-0.5">
                                    Carga #{errorModal.cargaId} — {TIPO_LABELS[errorModal.tipo]?.label ?? errorModal.tipo}
                                </p>
                            </div>
                            <button
                                onClick={() => {
 setErrorModal(null); setErrores([]); 
}}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--unal-surface-container-high)] transition-colors"
                                style={{ color: 'var(--unal-on-surface-variant)' }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
                            {loadingErrores ? (
                                <div className="flex items-center justify-center gap-3 py-10" style={{ color: 'var(--unal-outline)' }}>
                                    <div className="w-5 h-5 border-2 border-gray-300 border-t-[var(--unal-primary)] rounded-full animate-spin" />
                                    <span style={{ fontSize: '14px', lineHeight: '20px' }}>Cargando errores…</span>
                                </div>
                            ) : errores.length === 0 ? (
                                <p className="py-8 text-center" style={{ fontSize: '14px', lineHeight: '20px', color: 'var(--unal-on-surface-variant)' }}>
                                    No se encontraron errores registrados.
                                </p>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left" style={{ fontSize: '12px', lineHeight: '16px', fontWeight: 700, color: 'var(--unal-on-surface-variant)' }}>
                                            <th className="pb-3 pr-4 uppercase tracking-wider">Severidad</th>
                                            <th className="pb-3 pr-4 uppercase tracking-wider">Fila</th>
                                            <th className="pb-3 pr-4 uppercase tracking-wider">Columna</th>
                                            <th className="pb-3 pr-4 uppercase tracking-wider">Mensaje</th>
                                            <th className="pb-3 uppercase tracking-wider">Valor recibido</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--unal-outline-variant)]">
                                        {errores.map((err) => (
                                            <tr key={err.ID_Error} className="align-top">
                                                <td className="py-2 pr-4">
                                                    {err.Severidad_Error === 'error' ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-semibold">
                                                            Error
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 text-yellow-700 px-2 py-0.5 text-xs font-semibold">
                                                            Advertencia
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-2 pr-4 font-mono" style={{ color: 'var(--unal-outline)' }}>
                                                    {err.Fila_Error ?? '—'}
                                                </td>
                                                <td className="py-2 pr-4" style={{ color: 'var(--unal-on-surface-variant)' }}>
                                                    {err.Columna_Error ?? '—'}
                                                </td>
                                                <td className="py-2 pr-4" style={{ color: 'var(--unal-on-surface)' }}>
                                                    {err.Mensaje_Error}
                                                </td>
                                                <td className="py-2 font-mono text-xs max-w-[120px] truncate" style={{ color: 'var(--unal-outline)' }} title={err.Valor_Recibido ?? ''}>
                                                    {err.Valor_Recibido ?? '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end px-6 py-4" style={{ borderTop: '1px solid var(--unal-outline-variant)' }}>
                            <button
                                onClick={() => {
 setErrorModal(null); setErrores([]); 
}}
                                className="px-4 py-2 rounded-lg text-sm transition-colors"
                                style={{ border: '1px solid var(--unal-outline)', color: 'var(--unal-on-surface-variant)' }}
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