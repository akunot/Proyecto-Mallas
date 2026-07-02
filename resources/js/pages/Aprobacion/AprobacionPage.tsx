import { Head, Link } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import MainLayout from '../../Layout/MainLayout';

interface CargaMalla {
    ID_Carga: number;
    ID_Programa: number;
    ID_Normativa: number;
    ID_Malla: number;
    ID_Malla_Base?: number;
    ID_Usuario: number;
    Estado_Carga: string;
    Comentario_Carga: string;
    Comentario_Revisor?: string | null;
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

export default function AprobacionPage({
    pendientes: initialPendientes,
    misCargas: initialMisCargas,
}: Props) {
    const [pendientes, setPendientes] =
        useState<CargaMalla[]>(initialPendientes);
    const [misCargas, setMisCargas] = useState<CargaMalla[]>(initialMisCargas);
    const [selectedCarga, setSelectedCarga] = useState<CargaMalla | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'pendientes' | 'mis-cargas'>(
        'mis-cargas',
    );
    const [reviewForm, setReviewForm] = useState({
        accion: 'aprobar' as 'aprobar' | 'rechazar',
        comentario: '',
    });

    useEffect(() => {
        setPendientes(initialPendientes.filter((c) => c.programa?.ID_Programa));
        setMisCargas(initialMisCargas.filter((c) => c.programa?.ID_Programa));
        fetchCargas();
    }, []);

    const fetchCargas = async () => {
        try {
            const [pRes, mRes] = await Promise.all([
                apiClient.get<{ data: CargaMalla[] }>('/aprobacion/pendientes'),
                apiClient.get<{ data: CargaMalla[] }>('/aprobacion/mis-cargas'),
            ]);
            setPendientes(
                (pRes.data || []).filter((c) => c.programa?.ID_Programa),
            );
            setMisCargas(
                (mRes.data || []).filter((c) => c.programa?.ID_Programa),
            );
        } catch (error) {
            console.error(error);
        }
    };

    const handleEnviarRevision = async () => {
        if (!selectedCarga) {
            return;
        }

        setLoading(true);

        try {
            await apiClient.post(
                `/aprobacion/cargas/${selectedCarga.ID_Carga}/enviar-revision`,
            );
            setSelectedCarga(null);
            fetchCargas();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleRevisar = async () => {
        if (!selectedCarga) {
            return;
        }

        setLoading(true);

        try {
            await apiClient.patch(
                `/aprobacion/cargas/${selectedCarga.ID_Carga}/revisar`,
                {
                    accion: reviewForm.accion,
                    comentario: reviewForm.comentario,
                },
            );
            setSelectedCarga(null);
            setReviewForm({ accion: 'aprobar', comentario: '' });
            fetchCargas();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusPill = (estado: string) => {
        const config: Record<string, string> = {
            borrador: 'bg-slate-100 text-slate-600 ring-slate-200',
            pendiente_aprobacion:
                'bg-indigo-100 text-indigo-700 ring-indigo-200',
            aprobado: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
            rechazado: 'bg-rose-100 text-rose-700 ring-rose-200',
            validando: 'bg-amber-100 text-amber-700 ring-amber-200',
        };
        const style =
            config[estado] || 'bg-slate-100 text-slate-600 ring-slate-200';

        return (
            <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black tracking-wider uppercase ring-1 ring-inset ${style}`}
            >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {estado.replace('_', ' ')}
            </span>
        );
    };

    return (
        <MainLayout>
            <Head title="Centro de Aprobaciones" />

            <div className="mx-auto max-w-[1200px] space-y-8 pb-20">
                {/* 1. Header Dinámico */}
                <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
                    <div>
                        <div className="mb-1 flex items-center gap-2 text-xs font-bold tracking-[2px] text-slate-500 uppercase">
                            <span className="material-symbols-outlined !text-sm text-blue-600">
                                verified_user
                            </span>
                            Gobierno Curricular
                        </div>
                        <h1 className="text-4xl leading-none font-black tracking-tight text-slate-900">
                            Aprobaciones
                        </h1>
                        <p className="mt-2 text-slate-500">
                            Valida y autoriza las versiones de mallas académicas
                            antes de su publicación en el SIA.
                        </p>
                    </div>
                    <Link
                        href="/auditoria"
                        className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 transition-all hover:bg-slate-50 active:scale-95"
                    >
                        <span className="material-symbols-outlined !text-xl">
                            history
                        </span>
                        Historial de Cambios
                    </Link>
                </div>

                {/* 2. Tabs Estilo Segmented Control */}
                <div className="inline-flex w-full rounded-2xl bg-slate-100 p-1.5 sm:w-auto">
                    <button
                        onClick={() => setActiveTab('mis-cargas')}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-8 py-3 text-sm font-bold transition-all sm:flex-none ${activeTab === 'mis-cargas' ? 'tab-active' : 'tab-inactive'}`}
                    >
                        Mis Cargas
                        <span
                            className={`rounded-md px-2 py-0.5 text-[10px] ${activeTab === 'mis-cargas' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}
                        >
                            {misCargas.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('pendientes')}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-8 py-3 text-sm font-bold transition-all sm:flex-none ${activeTab === 'pendientes' ? 'tab-active' : 'tab-inactive'}`}
                    >
                        Pendientes de Revisión
                        <span
                            className={`rounded-md px-2 py-0.5 text-[10px] ${activeTab === 'pendientes' ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-500'}`}
                        >
                            {pendientes.length}
                        </span>
                    </button>
                </div>

                {/* 3. Lista de Trabajo (Cards) */}
                <div className="grid grid-cols-1 gap-4">
                    {(activeTab === 'mis-cargas' ? misCargas : pendientes)
                        .length === 0 ? (
                        <div className="rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-white p-20 text-center">
                            <span className="material-symbols-outlined mb-4 !text-6xl text-slate-200">
                                fact_check
                            </span>
                            <p className="text-sm font-bold tracking-widest text-slate-400 uppercase">
                                Bandeja de entrada vacía
                            </p>
                        </div>
                    ) : (
                        (activeTab === 'mis-cargas'
                            ? misCargas
                            : pendientes
                        ).map((carga) => (
                            <div
                                key={carga.ID_Carga}
                                className="workflow-card flex flex-col justify-between gap-6 md:flex-row md:items-center"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="mb-2 flex items-center gap-3">
                                        <h3 className="truncate text-lg font-black text-slate-800">
                                            {carga.programa?.Nombre_Programa ||
                                                'Sin programa definido'}
                                        </h3>
                                        {getStatusPill(carga.Estado_Carga)}
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-3">
                                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                            <span className="material-symbols-outlined !text-sm">
                                                person
                                            </span>
                                            {carga.usuario?.Nombre_Usuario ||
                                                'N/A'}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                            <span className="material-symbols-outlined !text-sm">
                                                calendar_month
                                            </span>
                                            {new Date(
                                                carga.Creacion_Carga,
                                            ).toLocaleDateString('es-CO')}
                                        </div>
                                        <div className="col-span-2 line-clamp-1 flex items-center gap-2 text-xs text-slate-400 italic md:col-span-1">
                                            <span className="material-symbols-outlined !text-sm">
                                                chat_bubble
                                            </span>
                                            {carga.Comentario_Carga ||
                                                'Sin observaciones'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                    <button
                                        onClick={() => setSelectedCarga(carga)}
                                        className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white transition-all hover:bg-slate-800"
                                    >
                                        <span className="material-symbols-outlined !text-lg">
                                            {activeTab === 'mis-cargas'
                                                ? 'visibility'
                                                : 'rate_review'}
                                        </span>
                                        {activeTab === 'mis-cargas'
                                            ? 'DETALLES'
                                            : 'REVISAR'}
                                    </button>
                                    {carga.ID_Malla && (
                                        <button
                                            onClick={() =>
                                                window.open(
                                                    `/mallas/${carga.ID_Malla}/grafica`,
                                                    '_blank',
                                                )
                                            }
                                            className="rounded-xl bg-blue-50 p-2.5 text-blue-600 transition-all hover:bg-blue-100"
                                            title="Ver Grafo"
                                        >
                                            <span className="material-symbols-outlined">
                                                account_tree
                                            </span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* 4. MODAL DE REVISIÓN PROFESIONAL */}
            {selectedCarga && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm duration-200 animate-in fade-in">
                    <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-2xl">
                        {/* Modal Header */}
                        <div className="flex shrink-0 items-start justify-between border-b border-slate-100 p-8">
                            <div>
                                <div className="mb-1 flex items-center gap-2">
                                    <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase">
                                        Expediente #{selectedCarga.ID_Carga}
                                    </span>
                                    {getStatusPill(selectedCarga.Estado_Carga)}
                                </div>
                                <h2 className="text-2xl leading-tight font-black text-slate-900">
                                    {selectedCarga.programa?.Nombre_Programa}
                                </h2>
                            </div>
                            <button
                                onClick={() => setSelectedCarga(null)}
                                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100"
                            >
                                <span className="material-symbols-outlined">
                                    close
                                </span>
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="space-y-6 overflow-y-auto p-8">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                    <p className="mb-1 text-[9px] font-black tracking-widest text-slate-400 uppercase">
                                        Solicitante
                                    </p>
                                    <p className="text-sm font-bold text-slate-800">
                                        {selectedCarga.usuario?.Nombre_Usuario}
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                    <p className="mb-1 text-[9px] font-black tracking-widest text-slate-400 uppercase">
                                        Fecha de Envío
                                    </p>
                                    <p className="text-sm font-bold text-slate-800">
                                        {new Date(
                                            selectedCarga.Creacion_Carga,
                                        ).toLocaleDateString('es-CO', {
                                            day: 'numeric',
                                            month: 'long',
                                        })}
                                    </p>
                                </div>
                            </div>

                            {selectedCarga.Estado_Carga ===
                            'pendiente_aprobacion' ? (
                                <div className="decision-panel space-y-6">
                                    <h3 className="flex items-center gap-2 text-sm font-black tracking-widest text-slate-900 uppercase">
                                        <span className="material-symbols-outlined !text-lg">
                                            gavel
                                        </span>
                                        Dictamen de la Revisión
                                    </h3>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() =>
                                                setReviewForm((f) => ({
                                                    ...f,
                                                    accion: 'aprobar',
                                                }))
                                            }
                                            className={`flex flex-1 flex-col items-center gap-1 rounded-2xl border-2 p-4 transition-all ${reviewForm.accion === 'aprobar' ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-500/10' : 'border-slate-200 bg-white opacity-60'}`}
                                        >
                                            <span
                                                className={`material-symbols-outlined ${reviewForm.accion === 'aprobar' ? 'text-emerald-600' : 'text-slate-400'}`}
                                            >
                                                check_circle
                                            </span>
                                            <span className="text-xs font-bold uppercase">
                                                Aprobar
                                            </span>
                                        </button>
                                        <button
                                            onClick={() =>
                                                setReviewForm((f) => ({
                                                    ...f,
                                                    accion: 'rechazar',
                                                }))
                                            }
                                            className={`flex flex-1 flex-col items-center gap-1 rounded-2xl border-2 p-4 transition-all ${reviewForm.accion === 'rechazar' ? 'border-rose-500 bg-rose-50 shadow-lg shadow-rose-500/10' : 'border-slate-200 bg-white opacity-60'}`}
                                        >
                                            <span
                                                className={`material-symbols-outlined ${reviewForm.accion === 'rechazar' ? 'text-rose-600' : 'text-slate-400'}`}
                                            >
                                                cancel
                                            </span>
                                            <span className="text-xs font-bold uppercase">
                                                Rechazar
                                            </span>
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="ml-1 text-[10px] font-black text-slate-500 uppercase">
                                            Observaciones Técnicas
                                        </label>
                                        <textarea
                                            value={reviewForm.comentario}
                                            onChange={(e) =>
                                                setReviewForm((f) => ({
                                                    ...f,
                                                    comentario: e.target.value,
                                                }))
                                            }
                                            placeholder="Justifica tu decisión para el registro de auditoría..."
                                            className="min-h-[100px] w-full resize-none rounded-2xl border-none bg-white p-4 text-sm shadow-inner transition-all focus:ring-4 focus:ring-blue-100"
                                        />
                                    </div>

                                    <button
                                        onClick={handleRevisar}
                                        disabled={loading}
                                        className={`w-full rounded-2xl py-4 font-black text-white shadow-xl transition-all active:scale-95 disabled:opacity-50 ${reviewForm.accion === 'aprobar' ? 'bg-emerald-600 shadow-emerald-900/20' : 'bg-rose-600 shadow-rose-900/20'}`}
                                    >
                                        {loading
                                            ? 'PROCESANDO...'
                                            : `CONFIRMAR ${reviewForm.accion.toUpperCase()}`}
                                    </button>
                                </div>
                            ) : selectedCarga.Estado_Carga === 'borrador' ? (
                                <div className="decision-panel space-y-6">
                                    <h3 className="flex items-center gap-2 text-sm font-black tracking-widest text-slate-900 uppercase">
                                        <span className="material-symbols-outlined !text-lg">
                                            send
                                        </span>
                                        Enviar a Revisión
                                    </h3>
                                    <p className="text-sm font-medium text-slate-600">
                                        Una vez enviada, un revisor podrá
                                        aprobar o rechazar esta malla. Asegúrate
                                        de que la información esté completa
                                        antes de continuar.
                                    </p>
                                    <button
                                        onClick={handleEnviarRevision}
                                        disabled={loading}
                                        className="w-full rounded-2xl bg-blue-600 py-4 font-black text-white shadow-xl shadow-blue-900/20 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {loading
                                            ? 'PROCESANDO...'
                                            : 'ENVIAR A REVISIÓN'}
                                    </button>
                                </div>
                            ) : selectedCarga.Estado_Carga === 'rechazado' ? (
                                <div className="decision-panel space-y-6">
                                    <h3 className="flex items-center gap-2 text-sm font-black tracking-widest text-slate-900 uppercase">
                                        <span className="material-symbols-outlined !text-lg">
                                            refresh
                                        </span>
                                        Reenviar a Revisión
                                    </h3>
                                    {selectedCarga.Comentario_Revisor && (
                                        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                                            <p className="mb-1 text-[9px] font-black tracking-widest text-rose-500 uppercase">
                                                Motivo del Rechazo
                                            </p>
                                            <p className="text-sm font-medium text-rose-800">
                                                {
                                                    selectedCarga.Comentario_Revisor
                                                }
                                            </p>
                                        </div>
                                    )}
                                    <p className="text-sm font-medium text-slate-600">
                                        Corrige los errores señalados y envía
                                        nuevamente la malla para su revisión.
                                    </p>
                                    <button
                                        onClick={handleEnviarRevision}
                                        disabled={loading}
                                        className="w-full rounded-2xl bg-blue-600 py-4 font-black text-white shadow-xl shadow-blue-900/20 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {loading
                                            ? 'PROCESANDO...'
                                            : 'REENVIAR A REVISIÓN'}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-4 rounded-3xl border border-blue-100 bg-blue-50 p-6">
                                    <span className="material-symbols-outlined !text-3xl text-blue-600">
                                        info
                                    </span>
                                    <p className="text-xs leading-relaxed font-medium text-blue-800">
                                        Esta solicitud se encuentra en fase de{' '}
                                        <strong>
                                            {selectedCarga.Estado_Carga.replace(
                                                '_',
                                                ' ',
                                            )}
                                        </strong>
                                        . No se requieren acciones de aprobación
                                        en este momento.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
}
