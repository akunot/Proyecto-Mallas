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

    useEffect(() => {
        setPendientes(initialPendientes.filter(c => c.programa?.ID_Programa));
        setMisCargas(initialMisCargas.filter(c => c.programa?.ID_Programa));
        fetchCargas();
    }, []);

    const fetchCargas = async () => {
        try {
            const [pRes, mRes] = await Promise.all([
                apiClient.get<{ data: CargaMalla[] }>('/aprobacion/pendientes'),
                apiClient.get<{ data: CargaMalla[] }>('/aprobacion/mis-cargas'),
            ]);
            setPendientes((pRes.data || []).filter(c => c.programa?.ID_Programa));
            setMisCargas((mRes.data || []).filter(c => c.programa?.ID_Programa));
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
            await apiClient.post(`/aprobacion/cargas/${selectedCarga.ID_Carga}/enviar-revision`);
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
            await apiClient.patch(`/aprobacion/cargas/${selectedCarga.ID_Carga}/revisar`, {
                accion: reviewForm.accion,
                comentario: reviewForm.comentario,
            });
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
            'borrador': 'bg-slate-100 text-slate-600 ring-slate-200',
            'pendiente_aprobacion': 'bg-indigo-100 text-indigo-700 ring-indigo-200',
            'aprobado': 'bg-emerald-100 text-emerald-700 ring-emerald-200',
            'rechazado': 'bg-rose-100 text-rose-700 ring-rose-200',
            'validando': 'bg-amber-100 text-amber-700 ring-amber-200',
        };
        const style = config[estado] || 'bg-slate-100 text-slate-600 ring-slate-200';

        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ring-1 ring-inset ${style}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {estado.replace('_', ' ')}
            </span>
        );
    };

    return (
        <MainLayout>
            <Head title="Centro de Aprobaciones" />

            <div className="max-w-[1200px] mx-auto space-y-8 pb-20">
                {/* 1. Header Dinámico */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-[2px] mb-1">
                            <span className="material-symbols-outlined !text-sm text-blue-600">verified_user</span>
                            Gobierno Curricular
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Aprobaciones</h1>
                        <p className="text-slate-500 mt-2">Valida y autoriza las versiones de mallas académicas antes de su publicación en el SIA.</p>
                    </div>
                    <Link 
                        href="/auditoria" 
                        className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-95"
                    >
                        <span className="material-symbols-outlined !text-xl">history</span>
                        Historial de Cambios
                    </Link>
                </div>

                {/* 2. Tabs Estilo Segmented Control */}
                <div className="bg-slate-100 p-1.5 rounded-2xl inline-flex w-full sm:w-auto">
                    <button
                        onClick={() => setActiveTab('mis-cargas')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'mis-cargas' ? 'tab-active' : 'tab-inactive'}`}
                    >
                        Mis Cargas
                        <span className={`px-2 py-0.5 rounded-md text-[10px] ${activeTab === 'mis-cargas' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                            {misCargas.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('pendientes')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'pendientes' ? 'tab-active' : 'tab-inactive'}`}
                    >
                        Pendientes de Revisión
                        <span className={`px-2 py-0.5 rounded-md text-[10px] ${activeTab === 'pendientes' ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                            {pendientes.length}
                        </span>
                    </button>
                </div>

                {/* 3. Lista de Trabajo (Cards) */}
                <div className="grid grid-cols-1 gap-4">
                    {(activeTab === 'mis-cargas' ? misCargas : pendientes).length === 0 ? (
                        <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 p-20 text-center">
                            <span className="material-symbols-outlined !text-6xl text-slate-200 mb-4">fact_check</span>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Bandeja de entrada vacía</p>
                        </div>
                    ) : (
                        (activeTab === 'mis-cargas' ? misCargas : pendientes).map((carga) => (
                            <div key={carga.ID_Carga} className="workflow-card flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-black text-slate-800 truncate">
                                            {carga.programa?.Nombre_Programa || 'Sin programa definido'}
                                        </h3>
                                        {getStatusPill(carga.Estado_Carga)}
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-6">
                                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                            <span className="material-symbols-outlined !text-sm">person</span>
                                            {carga.usuario?.Nombre_Usuario || 'N/A'}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                            <span className="material-symbols-outlined !text-sm">calendar_month</span>
                                            {new Date(carga.Creacion_Carga).toLocaleDateString('es-CO')}
                                        </div>
                                        <div className="col-span-2 md:col-span-1 flex items-center gap-2 text-xs text-slate-400 italic italic line-clamp-1">
                                            <span className="material-symbols-outlined !text-sm">chat_bubble</span>
                                            {carga.Comentario_Carga || 'Sin observaciones'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <button 
                                        onClick={() => setSelectedCarga(carga)}
                                        className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined !text-lg">{activeTab === 'mis-cargas' ? 'visibility' : 'rate_review'}</span>
                                        {activeTab === 'mis-cargas' ? 'DETALLES' : 'REVISAR'}
                                    </button>
                                    {carga.ID_Malla && (
                                        <button 
                                            onClick={() => window.open(`/mallas/${carga.ID_Malla}/grafica`, '_blank')}
                                            className="p-2.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all"
                                            title="Ver Grafo"
                                        >
                                            <span className="material-symbols-outlined">account_tree</span>
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-slate-100 flex justify-between items-start shrink-0">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Expediente #{selectedCarga.ID_Carga}</span>
                                    {getStatusPill(selectedCarga.Estado_Carga)}
                                </div>
                                <h2 className="text-2xl font-black text-slate-900 leading-tight">
                                    {selectedCarga.programa?.Nombre_Programa}
                                </h2>
                            </div>
                            <button onClick={() => setSelectedCarga(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-8 overflow-y-auto space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Solicitante</p>
                                    <p className="text-sm font-bold text-slate-800">{selectedCarga.usuario?.Nombre_Usuario}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Fecha de Envío</p>
                                    <p className="text-sm font-bold text-slate-800">{new Date(selectedCarga.Creacion_Carga).toLocaleDateString('es-CO', {day:'numeric', month:'long'})}</p>
                                </div>
                            </div>

                            {selectedCarga.Estado_Carga === 'pendiente_aprobacion' ? (
                                <div className="decision-panel space-y-6">
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                        <span className="material-symbols-outlined !text-lg">gavel</span>
                                        Dictamen de la Revisión
                                    </h3>
                                    
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => setReviewForm(f => ({...f, accion: 'aprobar'}))}
                                            className={`flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${reviewForm.accion === 'aprobar' ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-500/10' : 'border-slate-200 bg-white opacity-60'}`}
                                        >
                                            <span className={`material-symbols-outlined ${reviewForm.accion === 'aprobar' ? 'text-emerald-600' : 'text-slate-400'}`}>check_circle</span>
                                            <span className="text-xs font-bold uppercase">Aprobar</span>
                                        </button>
                                        <button 
                                            onClick={() => setReviewForm(f => ({...f, accion: 'rechazar'}))}
                                            className={`flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${reviewForm.accion === 'rechazar' ? 'border-rose-500 bg-rose-50 shadow-lg shadow-rose-500/10' : 'border-slate-200 bg-white opacity-60'}`}
                                        >
                                            <span className={`material-symbols-outlined ${reviewForm.accion === 'rechazar' ? 'text-rose-600' : 'text-slate-400'}`}>cancel</span>
                                            <span className="text-xs font-bold uppercase">Rechazar</span>
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Observaciones Técnicas</label>
                                        <textarea 
                                            value={reviewForm.comentario}
                                            onChange={e => setReviewForm(f => ({...f, comentario: e.target.value}))}
                                            placeholder="Justifica tu decisión para el registro de auditoría..."
                                            className="w-full p-4 bg-white border-none rounded-2xl text-sm focus:ring-4 focus:ring-blue-100 transition-all resize-none shadow-inner min-h-[100px]"
                                        />
                                    </div>

                                    <button 
                                        onClick={handleRevisar}
                                        disabled={loading}
                                        className={`w-full py-4 rounded-2xl font-black text-white shadow-xl transition-all active:scale-95 disabled:opacity-50 ${reviewForm.accion === 'aprobar' ? 'bg-emerald-600 shadow-emerald-900/20' : 'bg-rose-600 shadow-rose-900/20'}`}
                                    >
                                        {loading ? 'PROCESANDO...' : `CONFIRMAR ${reviewForm.accion.toUpperCase()}`}
                                    </button>
                                </div>
                            ) : selectedCarga.Estado_Carga === 'borrador' ? (
                                <div className="decision-panel space-y-6">
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                        <span className="material-symbols-outlined !text-lg">send</span>
                                        Enviar a Revisión
                                    </h3>
                                    <p className="text-sm text-slate-600 font-medium">
                                        Una vez enviada, un revisor podrá aprobar o rechazar esta malla. Asegúrate de que la información esté completa antes de continuar.
                                    </p>
                                    <button 
                                        onClick={handleEnviarRevision}
                                        disabled={loading}
                                        className="w-full py-4 rounded-2xl font-black text-white shadow-xl transition-all active:scale-95 disabled:opacity-50 bg-blue-600 shadow-blue-900/20"
                                    >
                                        {loading ? 'PROCESANDO...' : 'ENVIAR A REVISIÓN'}
                                    </button>
                                </div>
                            ) : (
                                <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 flex items-center gap-4">
                                    <span className="material-symbols-outlined text-blue-600 !text-3xl">info</span>
                                    <p className="text-xs text-blue-800 font-medium leading-relaxed">
                                        Esta solicitud se encuentra en fase de <strong>{selectedCarga.Estado_Carga.replace('_', ' ')}</strong>. 
                                        No se requieren acciones de aprobación en este momento.
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