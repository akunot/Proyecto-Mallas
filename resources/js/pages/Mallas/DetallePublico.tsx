import React, { useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';

// --- Interfaces ---
interface Requisito {
    ID_Asignatura_Requerida: number | null;
    Tipo_Requisito: string;
    Descripcion_Requisito?: string;
    Valor_Creditos?: number;
    asignatura_requerida?: {
        Nombre_Asignatura: string;
        Codigo_Asignatura: string;
    } | null;
}

interface SlotData {
    ID_Slot: number;
    ID_Agrupacion: number;
    Nombre_Slot: string;
    Tipo_Slot: 'optativa' | 'libre' | 'nivelatorio';
    Semestre: number | null;
    Orden: number;
    Nombre_Agrupacion: string;
    ID_Componente: number;
}

interface Asignatura {
    ID_Asignatura: number;
    Nombre_Asignatura: string;
    Codigo_Asignatura: string;
    Creditos_Asignatura: number;
    Horas_Presencial: number;
    Horas_Estudiante: number;
    Tipo_Asignatura: string;
    Nombre_Agrupacion: string;
    ID_Componente: number;
    Nombre_Componente: string;
    Tipo_Agrupacion: string | null;
    Orden?: number;
    requisitos?: Requisito[];
}

interface SemestreData {
    semestre: number;
    asignaturas: Asignatura[];
    slots: SlotData[];
}

interface Electiva {
    ID_Asignatura: number;
    Codigo_Asignatura: string;
    Nombre_Asignatura: string;
    Creditos_Asignatura: number;
    requisitos?: Array<{
        ID_Asignatura_Requerida: number | null;
        Tipo_Requisito: string;
        Descripcion_Requisito?: string;
        Valor_Creditos?: number;
        asignatura_requerida?: { Nombre_Asignatura: string; Codigo_Asignatura: string } | null;
    }>;
}

interface OptativaGroup {
    ID_Agrupacion: number;
    Nombre_Agrupacion: string;
    asignaturas: Electiva[];
}

interface ResumenCreditos {
    Nombre_Agrupacion: string;
    Tipo_Agrupacion: string | null;
    Creditos_Requeridos: number | null;
    Total_Creditos: number;
    Total_Horas_P: number;
    Total_Horas_E: number;
    Es_Obligatoria: boolean;
    Nombre_Componente: string;
}

interface NormativaInfo {
    Tipo_Normativa: string;
    Numero_Normativa: string;
    Instancia: string;
    Anio_Normativa: number | null;
}

interface ProgramaInfo {
    ID_Programa: number;
    Nombre_Programa: string;
    Nivel_Formacion: string | null;
    Duracion_Semestres: number | null;
    Creditos_Totales: number | null;
    Codigo_SNIES: string | null;
    Titulo_Otorgado: string | null;
    Facultad: string;
}

interface MallaInfo {
    ID_Malla: number;
    Version_Etiqueta: string | null;
    Version_Numero: number;
    Fecha_Vigencia: string;
    Estado: string;
    Normativa: NormativaInfo | null;
}

interface Props {
    disponible: boolean;
    programa: ProgramaInfo;
    malla?: MallaInfo;
    semestres?: SemestreData[];
    resumenCreditos?: ResumenCreditos[];
}

// --- Config Visual ---
const COMPONENT_COLORS: Record<number, string> = {
    1: 'bg-green-100 border-green-500',
    2: 'bg-orange-100 border-orange-500',
    3: 'bg-blue-100 border-blue-500',
    4: 'bg-yellow-100 border-yellow-500',
    5: 'bg-red-100 border-red-500',
};

const getComponentColor = (id: number) => COMPONENT_COLORS[id] || 'bg-gray-100 border-gray-400';

const PLACEHOLDER_RE = /^(LIBRE|OPTATIVA|NIVELATORIO)\s*\d+$/i;

const formatTipoRequisito = (tipo: string): string => {
    const t = (tipo ?? '').toLowerCase();
    if (t.includes('pre') || t === 'opcional' || t.includes('obligatorio')) return 'Prerrequisito';
    if (t.includes('co')) return 'Correquisito';
    if (t.includes('credito') || t.includes('crédito')) return 'Req. créditos';
    return tipo;
};

export default function DetallePublico({ disponible, programa, malla, semestres, resumenCreditos }: Props) {
    const [selectedAsig, setSelectedAsig] = useState<number | null>(null);

    // Modal de Libre Elección
    const [showElectivasModal, setShowElectivasModal] = useState(false);
    const [electivas, setElectivas] = useState<Electiva[]>([]);
    const [loadingElectivas, setLoadingElectivas] = useState(false);
    const [errorElectivas, setErrorElectivas] = useState(false);
    const [searchElectivas, setSearchElectivas] = useState('');

    // Modal de Optativas
    const [showOptativasModal, setShowOptativasModal] = useState(false);
    const [optativas, setOptativas] = useState<OptativaGroup[]>([]);
    const [loadingOptativas, setLoadingOptativas] = useState(false);
    const [errorOptativas, setErrorOptativas] = useState(false);
    const [searchOptativas, setSearchOptativas] = useState('');
    const [expandedOptativa, setExpandedOptativa] = useState<number | null>(null);

    const fetchElectivas = async () => {
        setLoadingElectivas(true);
        setErrorElectivas(false);
        setElectivas([]);
        setSearchElectivas('');
        try {
            const res = await fetch(`/api/v1/electivas`, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
            });
            if (res.ok) {
                const data = await res.json();
                setElectivas(data.data ?? []);
            } else {
                setErrorElectivas(true);
            }
        } catch {
            setErrorElectivas(true);
        } finally {
            setLoadingElectivas(false);
        }
    };

    const fetchOptativas = async () => {
        setLoadingOptativas(true);
        setErrorOptativas(false);
        setOptativas([]);
        setSearchOptativas('');
        setExpandedOptativa(null);
        try {
            const res = await fetch(`/api/v1/mallas/${malla?.ID_Malla}/optativas`, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
            });
            if (res.ok) {
                const data = await res.json();
                setOptativas(data.data ?? []);
            } else {
                setErrorOptativas(true);
            }
        } catch {
            setErrorOptativas(true);
        } finally {
            setLoadingOptativas(false);
        }
    };

    // --- Materia seleccionada ---
    const currentMallaAsigs = semestres?.flatMap(s => s.asignaturas) || [];

    const selectedAsigData = useMemo(() => {
        if (!selectedAsig) return null;
        return currentMallaAsigs.find(a => a.ID_Asignatura === selectedAsig) || null;
    }, [selectedAsig, currentMallaAsigs]);

    // Relaciones de requisitos
    const isRelated = (asigId: number, type: 'any' | 'pre' | 'co' = 'any') => {
        if (!selectedAsig || !selectedAsigData) return false;
        if (type === 'any' && selectedAsig == asigId) return true;

        const reqs = selectedAsigData.requisitos || [];
        return reqs.some(r => {
            if (r.ID_Asignatura_Requerida != asigId) return false;
            const reqType = r.Tipo_Requisito?.toLowerCase() || '';
            if (type === 'pre') return reqType.includes('pre') || reqType.includes('obligatorio') || reqType === 'opcional';
            if (type === 'co') return reqType.includes('co');
            return true;
        });
    };

    // --- Renderizado: No disponible ---
    if (!disponible) {
        return (
            <div className="h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-12 text-center border border-slate-200">
                    <span className="material-symbols-outlined !text-7xl text-amber-400 mb-4">error_outline</span>
                    <h1 className="text-2xl font-black text-slate-900">Malla no disponible</h1>
                    <p className="text-slate-500 mt-2 mb-8">
                        El programa <strong>{programa.Nombre_Programa}</strong> no tiene una malla activa.
                    </p>
                    <Link href="/" className="px-8 py-3 bg-[#00236f] text-white rounded-2xl font-bold transition-all hover:scale-105 active:scale-95">
                        Volver al inicio
                    </Link>
                </div>
            </div>
        );
    }

    // Construir grid de semestres (similar a Visualizer.buildGrid)
    const gridData = useMemo(() => {
        const g: Record<number, (Asignatura | SlotData)[]> = {};
        (semestres || []).forEach(sem => {
            g[sem.semestre] = [];
            sem.asignaturas.forEach(asig => {
                if (PLACEHOLDER_RE.test(asig.Codigo_Asignatura)) return;
                if (!g[sem.semestre].find(a => (a as Asignatura).ID_Asignatura === asig.ID_Asignatura)) {
                    g[sem.semestre].push(asig);
                }
            });
            sem.slots.forEach(slot => {
                g[sem.semestre].push(slot);
            });
            // Sort: asignaturas first (by Orden), then slots (by Orden) — igual que el Visualizer
            g[sem.semestre].sort((a, b) => {
                const isSlotA = (a as SlotData).Tipo_Slot !== undefined;
                const isSlotB = (b as SlotData).Tipo_Slot !== undefined;
                if (isSlotA && !isSlotB) return 1;
                if (!isSlotA && isSlotB) return -1;
                if (isSlotA && isSlotB) return ((a as SlotData).Orden || 999) - ((b as SlotData).Orden || 999);
                return ((a as Asignatura).Orden || 0) - ((b as Asignatura).Orden || 0);
            });
        });
        return g;
    }, [semestres]);

    const numSemestres = programa.Duracion_Semestres ?? 10;
    const listaSemestres = Array.from({ length: numSemestres }, (_, i) => i + 1);

    return (
        <>
            <Head title={`${programa.Nombre_Programa} — UNAL`} />

            <div className="min-h-screen bg-[#f8fafc]">
                {/* HEADER */}
                <div className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="w-8 h-8 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors flex-shrink-0">
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
                        </Link>
                        <div className="w-px h-7 bg-slate-200" />
                        <div>
                            <h1 className="text-[15px] font-medium text-slate-900 leading-tight">
                                {programa.Nombre_Programa}
                            </h1>
                            <span className="inline-flex items-center gap-1.5 mt-1.5 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2.5 py-0.5">
                                <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>grid_view</span>
                                Plan {malla?.Version_Etiqueta || 'Vigente'}
                            </span>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-full px-3.5 py-1.5 shrink-0">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-green-600 flex-shrink-0" />
                            <span className="text-[11px] font-medium text-slate-600">Fund.</span>
                        </div>
                        <span className="w-px h-3 bg-slate-300" />
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-orange-600 flex-shrink-0" />
                            <span className="text-[11px] font-medium text-slate-600">Disc.</span>
                        </div>
                        <span className="w-px h-3 bg-slate-300" />
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                            <span className="text-[11px] font-medium text-slate-600">Libre</span>
                        </div>
                        <span className="w-px h-3 bg-slate-300" />
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-600 flex-shrink-0" />
                            <span className="text-[11px] font-medium text-slate-600">Compl.</span>
                        </div>
                    </div>
                </div>

                {/* CANVAS DE SEMESTRES */}
                <div className="p-6 overflow-x-auto">
                    <div className="flex gap-6 min-w-max">
                        {listaSemestres.map(sem => (
                            <div key={sem} className="flex-1 min-w-[200px] max-w-[220px] bg-white/60 rounded-2xl p-3 border border-slate-200/80">
                                <div className="flex items-center justify-between mb-4 px-1">
                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-[2px]">
                                        Semestre {sem}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-300 bg-slate-100 px-2 py-0.5 rounded">
                                        {gridData[sem]?.length || 0}
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    {(gridData[sem] || []).map((item) => {
                                        const isSlot = (item as SlotData).Tipo_Slot !== undefined;

                                        // SLOT
                                        if (isSlot) {
                                            const slot = item as SlotData;
                                            const isLibre = slot.Tipo_Slot === 'libre';
                                            const isOptativa = slot.Tipo_Slot === 'optativa';
                                            return (
                                                <div
                                                    key={`slot-${slot.ID_Slot}`}
                                                    className={`border-dashed border-2 p-2 h-[120px] flex flex-col items-center justify-center
                                                        text-[11px] font-semibold text-center leading-tight transition-all duration-200 cursor-pointer
                                                        ${isLibre
                                                            ? 'border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:shadow-md'
                                                            : isOptativa
                                                                ? 'border-orange-400 bg-orange-50 text-orange-700 hover:bg-orange-100 hover:shadow-md'
                                                                : 'border-yellow-400 bg-yellow-50 text-yellow-700'
                                                        }`}
                                                    onClick={
                                                        isLibre ? () => { setShowElectivasModal(true); fetchElectivas(); } :
                                                        isOptativa ? () => { setShowOptativasModal(true); fetchOptativas(); } :
                                                        undefined
                                                    }
                                                >
                                                    <span className="uppercase tracking-wide">
                                                        {isLibre ? 'Libre Elección' : isOptativa ? 'Optativa' : 'Nivelatorio'}
                                                    </span>
                                                    {slot.Nombre_Agrupacion && (
                                                        <span className="mt-1 text-[10px] text-gray-500">{slot.Nombre_Agrupacion}</span>
                                                    )}
                                                    {isLibre && <span className="mt-1 text-[9px] text-blue-500">clic para ver catálogo</span>}
                                                    {isOptativa && <span className="mt-1 text-[9px] text-orange-500">clic para ver catálogo</span>}
                                                </div>
                                            );
                                        }

                                        // ASIGNATURA
                                        const asig = item as Asignatura;
                                        const active = selectedAsig === asig.ID_Asignatura;
                                        const isPre = isRelated(asig.ID_Asignatura, 'pre');
                                        const isCo = isRelated(asig.ID_Asignatura, 'co');
                                        const related = isPre || isCo;

                                        return (
                                            <div
                                                key={asig.ID_Asignatura}
                                                onClick={() => setSelectedAsig(asig.ID_Asignatura === selectedAsig ? null : asig.ID_Asignatura)}
                                                className={[
                                                    getComponentColor(asig.ID_Componente || 0),
                                                    'border-l-4 rounded-xl p-2.5 shadow-sm cursor-pointer transition-all duration-200',
                                                    'hover:shadow-md h-[120px] flex flex-col justify-between relative',
                                                    active ? 'ring-2 ring-blue-600 scale-[1.04] z-20 shadow-xl' : '',
                                                    selectedAsig && !active && !related ? 'opacity-40 grayscale-[0.5] scale-[0.98]' : '',
                                                    isPre ? 'ring-2 ring-rose-500 bg-rose-50/30 z-10' : '',
                                                    isCo ? 'ring-2 ring-amber-500 bg-amber-50/30 z-10' : '',
                                                ].join(' ')}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black text-slate-400">CR: {asig.Creditos_Asignatura}</span>
                                                    <div className="flex gap-1">
                                                        <span className="text-[9px] font-bold text-slate-300">P:{asig.Horas_Presencial || 0}</span>
                                                        <span className="text-[9px] font-bold text-slate-300">I:{asig.Horas_Estudiante || 0}</span>
                                                    </div>
                                                </div>
                                                <div className="flex-1 flex items-center justify-center py-1">
                                                    <h4 className="text-[11px] font-bold text-slate-800 text-center leading-tight line-clamp-3">
                                                        {asig.Nombre_Asignatura}
                                                    </h4>
                                                </div>
                                                <div className="flex justify-between items-center border-t border-slate-100 pt-1.5">
                                                    <span className="text-[9px] font-mono font-bold text-slate-400">{asig.Codigo_Asignatura}</span>
                                                    <div className="flex gap-1">
                                                        {asig.requisitos?.some(r => r.Tipo_Requisito?.toLowerCase().includes('pre') || r.Tipo_Requisito?.toLowerCase() === 'opcional' || r.Tipo_Requisito?.toLowerCase().includes('obligatorio')) && (
                                                            <div className="w-3.5 h-3.5 bg-rose-500 rounded-full flex items-center justify-center ring-2 ring-white" title="Tiene prerrequisitos">
                                                                <span className="text-[8px] text-white font-bold">P</span>
                                                            </div>
                                                        )}
                                                        {asig.requisitos?.some(r => r.Tipo_Requisito?.toLowerCase().includes('co')) && (
                                                            <div className="w-3.5 h-3.5 bg-amber-400 rounded-full flex items-center justify-center ring-2 ring-white" title="Tiene correquisitos">
                                                                <span className="text-[8px] text-white font-bold">C</span>
                                                            </div>
                                                        )}
                                                        {asig.requisitos?.some(r => r.Tipo_Requisito?.toLowerCase().includes('credito')) && (
                                                            <div className="w-3.5 h-3.5 bg-blue-400 rounded-full flex items-center justify-center ring-2 ring-white" title="Req. créditos">
                                                                <span className="text-[7px] text-white font-bold">Cr</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* PANEL DE DETALLES — Side Drawer */}
                {selectedAsig && selectedAsigData && (
                    <div className="fixed right-6 bottom-6 w-80 bg-white rounded-3xl shadow-2xl border border-slate-200 z-[60] overflow-hidden animate-in slide-in-from-right duration-300">
                        <div className="p-5 bg-slate-900 text-white flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-sm leading-tight">{selectedAsigData.Nombre_Asignatura}</h4>
                                <p className="text-[10px] text-slate-400 mt-1 font-mono uppercase">{selectedAsigData.Codigo_Asignatura}</p>
                            </div>
                            <button onClick={() => setSelectedAsig(null)} className="text-slate-400 hover:text-white ml-3 shrink-0">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Créditos</span>
                                    <p className="text-sm font-black text-slate-800">{selectedAsigData.Creditos_Asignatura}</p>
                                </div>
                                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Presencial</span>
                                    <p className="text-sm font-black text-slate-800">{selectedAsigData.Horas_Presencial}</p>
                                </div>
                                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Semestre</span>
                                    <p className="text-sm font-black text-slate-800">-</p>
                                </div>
                            </div>

                            <div>
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Requisitos</h5>
                                {selectedAsigData.requisitos && selectedAsigData.requisitos.length > 0 ? (
                                    <ul className="space-y-2">
                                        {selectedAsigData.requisitos.map((req, i) => {
                                            const t = (req.Tipo_Requisito ?? '').toLowerCase();
                                            const isPre = t.includes('pre') || t.includes('obligatorio') || t === 'opcional';
                                            return (
                                                <li key={i} className="flex items-start gap-2 text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase shrink-0 ${isPre ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                                        {isPre ? 'PRE' : 'CO'}
                                                    </span>
                                                    <span className="font-medium text-slate-700">
                                                        {req.asignatura_requerida
                                                            ? `${req.asignatura_requerida.Nombre_Asignatura} (${req.asignatura_requerida.Codigo_Asignatura})`
                                                            : req.Descripcion_Requisito || (req.Valor_Creditos ? `${req.Valor_Creditos} créditos` : '—')
                                                        }
                                                    </span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <p className="text-xs text-slate-400 italic">Sin requisitos registrados.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL: Catálogo de Libre Elección */}
            {showElectivasModal && (() => {
                const q = searchElectivas.trim().toLowerCase();
                const filtered = q
                    ? electivas.filter(e =>
                        e.Nombre_Asignatura.toLowerCase().includes(q) ||
                        String(e.Codigo_Asignatura).toLowerCase().includes(q)
                      )
                    : electivas;
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                        <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl flex flex-col max-h-[85vh]">
                            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
                                <div>
                                    <h2 className="text-base font-semibold text-gray-900">Catálogo de Libre Elección</h2>
                                    <p className="text-xs text-gray-500 mt-0.5">{programa.Nombre_Programa}</p>
                                </div>
                                <button onClick={() => setShowElectivasModal(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {!loadingElectivas && !errorElectivas && electivas.length > 0 && (
                                <div className="px-6 pt-4 pb-2 shrink-0">
                                    <div className="relative">
                                        <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                                        </svg>
                                        <input
                                            type="text"
                                            placeholder="Buscar por nombre o código…"
                                            value={searchElectivas}
                                            onChange={e => setSearchElectivas(e.target.value)}
                                            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                                        />
                                        {searchElectivas && (
                                            <button onClick={() => setSearchElectivas('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="overflow-y-auto px-6 py-4 flex-1">
                                {loadingElectivas ? (
                                    <div className="flex items-center justify-center gap-3 py-12 text-gray-400">
                                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                                        <span className="text-sm">Cargando catálogo…</span>
                                    </div>
                                ) : errorElectivas ? (
                                    <p className="py-10 text-center text-sm text-red-500">No se pudieron cargar las electivas. Intenta de nuevo.</p>
                                ) : electivas.length === 0 ? (
                                    <p className="py-10 text-center text-sm text-gray-500">No hay electivas registradas.</p>
                                ) : filtered.length === 0 ? (
                                    <p className="py-10 text-center text-sm text-gray-500">Sin resultados para <span className="font-medium">"{searchElectivas}"</span>.</p>
                                ) : (
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-100">
                                                <th className="pb-3 pr-4">Código</th>
                                                <th className="pb-3 pr-4">Nombre</th>
                                                <th className="pb-3 text-center">Créditos</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {filtered.map((e) => (
                                                <tr key={e.ID_Asignatura} className="hover:bg-gray-50">
                                                    <td className="py-2 pr-4 font-mono text-xs text-gray-500">{e.Codigo_Asignatura}</td>
                                                    <td className="py-2 pr-4 text-gray-800">{e.Nombre_Asignatura}</td>
                                                    <td className="py-2 text-center text-gray-600">{e.Creditos_Asignatura}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 shrink-0">
                                {!loadingElectivas && !errorElectivas && electivas.length > 0 && (
                                    <span className="text-xs text-gray-400">{q ? `${filtered.length} de ${electivas.length}` : electivas.length} materias</span>
                                )}
                                <button onClick={() => setShowElectivasModal(false)} className="ml-auto rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Cerrar</button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* MODAL: Catálogo de Optativas */}
            {showOptativasModal && (() => {
                const q = searchOptativas.trim().toLowerCase();
                const filteredGroups = optativas
                    .map(group => ({
                        ...group,
                        asignaturas: q
                            ? group.asignaturas.filter(e =>
                                e.Nombre_Asignatura.toLowerCase().includes(q) ||
                                String(e.Codigo_Asignatura).toLowerCase().includes(q)
                              )
                            : group.asignaturas,
                    }))
                    .filter(group => group.asignaturas.length > 0);
                const totalOptativas = optativas.reduce((sum, group) => sum + group.asignaturas.length, 0);
                const visibleOptativas = filteredGroups.reduce((sum, group) => sum + group.asignaturas.length, 0);
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                        <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl flex flex-col max-h-[85vh]">
                            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
                                <div>
                                    <h2 className="text-base font-semibold text-gray-900">Catálogo de Optativas</h2>
                                    <p className="text-xs text-gray-500 mt-0.5">{programa.Nombre_Programa}</p>
                                </div>
                                <button onClick={() => { setShowOptativasModal(false); }} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {!loadingOptativas && !errorOptativas && optativas.length > 0 && (
                                <div className="px-6 pt-4 pb-2 shrink-0">
                                    <div className="relative">
                                        <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                                        </svg>
                                        <input
                                            type="text"
                                            placeholder="Buscar por nombre o código…"
                                            value={searchOptativas}
                                            onChange={e => setSearchOptativas(e.target.value)}
                                            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-800 placeholder-gray-400 focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-400"
                                        />
                                        {searchOptativas && (
                                            <button onClick={() => setSearchOptativas('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="overflow-y-auto px-6 py-4 flex-1">
                                {loadingOptativas ? (
                                    <div className="flex items-center justify-center gap-3 py-12 text-gray-400">
                                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                                        <span className="text-sm">Cargando catálogo…</span>
                                    </div>
                                ) : errorOptativas ? (
                                    <p className="py-10 text-center text-sm text-red-500">No se pudieron cargar las optativas. Intenta de nuevo.</p>
                                ) : totalOptativas === 0 ? (
                                    <p className="py-10 text-center text-sm text-gray-500">No hay optativas registradas para este programa.</p>
                                ) : visibleOptativas === 0 ? (
                                    <p className="py-10 text-center text-sm text-gray-500">Sin resultados para <span className="font-medium">"{searchOptativas}"</span>.</p>
                                ) : (
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-100">
                                                <th className="pb-3 pr-4">Código</th>
                                                <th className="pb-3 pr-4">Nombre</th>
                                                <th className="pb-3 text-center">Créd.</th>
                                                <th className="pb-3 text-center">Req.</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredGroups.map((group) => (
                                                <React.Fragment key={`group-${group.ID_Agrupacion}`}>
                                                    <tr className="bg-gray-50 border-b border-gray-200">
                                                        <td colSpan={4} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                                                            {group.Nombre_Agrupacion}
                                                        </td>
                                                    </tr>
                                                    {group.asignaturas.map((e) => {
                                                        const reqs = e.requisitos ?? [];
                                                        const isOpen = expandedOptativa === e.ID_Asignatura;
                                                        return (
                                                            <React.Fragment key={e.ID_Asignatura}>
                                                                <tr onClick={() => setExpandedOptativa(isOpen ? null : e.ID_Asignatura)} className="border-b border-gray-50 hover:bg-orange-50 cursor-pointer select-none">
                                                                    <td className="py-2 pr-4 font-mono text-xs text-gray-500">{e.Codigo_Asignatura}</td>
                                                                    <td className="py-2 pr-4 text-gray-800 font-medium">{e.Nombre_Asignatura}</td>
                                                                    <td className="py-2 text-center text-gray-600">{e.Creditos_Asignatura}</td>
                                                                    <td className="py-2 text-center">
                                                                        {reqs.length > 0 ? (
                                                                            <span className="inline-flex items-center gap-1 text-orange-600 text-xs font-semibold">
                                                                                {reqs.length}
                                                                                <svg className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                                                </svg>
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-gray-300 text-xs">—</span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                                {isOpen && reqs.length > 0 && (
                                                                    <tr className="bg-orange-50 border-b border-orange-100">
                                                                        <td colSpan={4} className="px-4 pb-3 pt-1">
                                                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-600 mb-1">Requisitos</p>
                                                                            <ul className="space-y-1">
                                                {reqs.map((r, idx) => {
                                                    const reqType = r.Tipo_Requisito || '';
                                                                                    return (
                                                                                        <li key={idx} className="flex items-start gap-2 text-xs text-gray-700">
                                                                                            <span className={`mt-0.5 shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase ${reqType.toLowerCase().includes('pre') || reqType.toLowerCase() === 'opcional' ? 'bg-red-100 text-red-700' : reqType.toLowerCase().includes('co') ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                                                                                                {formatTipoRequisito(reqType)}
                                                                                            </span>
                                                                                            <span>
                                                                {r.asignatura_requerida
                                                                    ? `${r.asignatura_requerida.Nombre_Asignatura} (${r.asignatura_requerida.Codigo_Asignatura})`
                                                                    : r.Descripcion_Requisito || (r.Valor_Creditos ? `${r.Valor_Creditos} créditos` : '—')
                                                                                                }
                                                                                            </span>
                                                                                        </li>
                                                                                    );
                                                                                })}
                                                                            </ul>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 shrink-0">
                                {!loadingOptativas && !errorOptativas && totalOptativas > 0 && (
                                    <span className="text-xs text-gray-400">{q ? `${visibleOptativas} de ${totalOptativas}` : totalOptativas} materias</span>
                                )}
                                <button onClick={() => { setShowOptativasModal(false); }} className="ml-auto rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Cerrar</button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </>
    );
}