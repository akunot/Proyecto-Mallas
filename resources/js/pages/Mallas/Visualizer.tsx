import React, { useMemo, useState, useCallback } from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '@/Layout/MainLayout';

const PLACEHOLDER_RE = /^(LIBRE|OPTATIVA|NIVELATORIO)\s*\d+$/i;

const formatTipoRequisito = (tipo: string): string => {
    const t = (tipo ?? '').toLowerCase();
    if (t.includes('pre') || t === 'opcional' || t.includes('obligatorio')) return 'Prerrequisito';
    if (t.includes('co')) return 'Correquisito';
    if (t.includes('credito') || t.includes('crédito')) return 'Req. créditos';
    return tipo;
};

interface Requisito {
    ID_Asignatura_Requerida: number | null;
    Tipo_Requisito: string;
    Descripcion_Requisito?: string;
    Valor_Creditos?: number;
    asignatura_requerida?: {
        Nombre_Asignatura: string;
        Codigo_Asignatura: string;
    };
}

interface Asignatura {
    ID_Asignatura: number;
    Nombre_Asignatura: string;
    Codigo_Asignatura: string;
    Creditos_Asignatura: number;
    Horas_Presencial: number;
    Horas_Estudiante: number;
    requisitos: Requisito[];
    ID_Componente?: number;
    pivot: {
        Semestre_Sugerido: number;
        Tipo_Asignatura: string;
        Orden: number;
    };
}

interface Slot {
    ID_Slot: number;
    Nombre_Slot: string;
    Tipo_Slot: 'optativa' | 'libre' | 'nivelatorio';
    Semestre: number | null;
    Orden?: number;
}

interface ElectivaRequisito {
    ID_Asignatura_Requerida: number | null;
    Tipo_Requisito: string;
    Descripcion_Requisito?: string;
    Valor_Creditos?: number;
    asignatura_requerida?: { Nombre_Asignatura: string; Codigo_Asignatura: string } | null;
}

interface Electiva {
    ID_Asignatura: number;
    Codigo_Asignatura: string;
    Nombre_Asignatura: string;
    Creditos_Asignatura: number;
    requisitos?: ElectivaRequisito[];
}

interface Agrupacion {
    ID_Agrupacion: number;
    Nombre_Agrupacion: string;
    ID_Componente: number;
    componente?: {
        Nombre_Componente: string;
    };
    asignaturas: Asignatura[];
    slots: Slot[];
}

interface Props {
    malla: {
        ID_Malla: number;
        programa: {
            Nombre_Programa: string;
            ID_Programa: number;
        };
        agrupaciones: Agrupacion[];
    };
}

type GridItem =
    | (Asignatura & { isSlot: false; ID_Componente: number })
    | (Slot      & { isSlot: true;  ID_Componente: number });

const itemKey = (item: GridItem): string =>
    item.isSlot
        ? `slot-${(item as Slot & { isSlot: true }).ID_Slot}`
        : `asig-${(item as Asignatura & { isSlot: false }).ID_Asignatura}`;

export default function MallaGrafica({ malla }: Props) {
    const [selectedAsig, setSelectedAsig] = useState<number | null>(null);

    const [showElectivasModal, setShowElectivasModal] = useState(false);
    const [electivas, setElectivas]                   = useState<Electiva[]>([]);
    const [loadingElectivas, setLoadingElectivas]     = useState(false);
    const [errorElectivas, setErrorElectivas]         = useState(false);
    const [searchElectivas, setSearchElectivas]       = useState('');

    const [showOptativasModal, setShowOptativasModal] = useState(false);
    const [optativas, setOptativas]                   = useState<Electiva[]>([]);
    const [loadingOptativas, setLoadingOptativas]     = useState(false);
    const [errorOptativas, setErrorOptativas]         = useState(false);
    const [searchOptativas, setSearchOptativas]       = useState('');
    const [expandedOptativa, setExpandedOptativa]     = useState<number | null>(null);

    // Drag-and-drop state: draggingKey = "asig-{id}" | "slot-{id}"
    const [draggingKey, setDraggingKey] = useState<string | null>(null);
    // dragOver: which column + where to insert (beforeKey=null → append at end)
    const [dragOver, setDragOver]       = useState<{ sem: number; beforeKey: string | null } | null>(null);

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
            const res = await fetch(`/api/v1/programas/${malla.programa.ID_Programa}/electivas`, {
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

    // Encontrar la asignatura seleccionada para obtener sus requisitos rápidamente
    const selectedAsigData = useMemo(() => {
        if (!selectedAsig) return null;
        for (const agrup of malla.agrupaciones) {
            const found = agrup.asignaturas.find(a => a.ID_Asignatura == selectedAsig);
            if (found) return found;
        }
        return null;
    }, [selectedAsig, malla]);

    // Construir el grid inicial (asignaturas + slots por semestre)
    const buildGrid = useCallback((src: Props['malla']): Record<number, GridItem[]> => {
        const g: Record<number, GridItem[]> = {};
        src.agrupaciones.forEach(agrup => {
            agrup.asignaturas.forEach(asig => {
                if (PLACEHOLDER_RE.test(asig.Codigo_Asignatura)) return;
                const item: GridItem = { ...asig, ID_Componente: agrup.ID_Componente, isSlot: false };
                const sem = asig.pivot.Semestre_Sugerido || 0;
                if (!g[sem]) g[sem] = [];
                if (!g[sem].find(a => !a.isSlot && (a as Asignatura).ID_Asignatura === asig.ID_Asignatura)) {
                    g[sem].push(item);
                }
            });
            (agrup.slots || []).forEach(slot => {
                const sem = slot.Semestre || 0;
                if (!g[sem]) g[sem] = [];
                g[sem].push({ ...slot, isSlot: true, ID_Componente: agrup.ID_Componente });
            });
        });
        Object.keys(g).forEach(sem => {
            g[Number(sem)].sort((a, b) => {
                const oa = a.isSlot ? ((a as Slot).Orden ?? 999) : ((a as Asignatura).pivot.Orden || 0);
                const ob = b.isSlot ? ((b as Slot).Orden ?? 999) : ((b as Asignatura).pivot.Orden || 0);
                return oa - ob;
            });
        });
        return g;
    }, []);

    const [semestres, setSemestres] = useState<Record<number, GridItem[]>>(() => buildGrid(malla));

    const numSemestres = Math.max(...Object.keys(semestres).map(Number), 10);
    const listaSemestres = useMemo(() => {
        const list = Array.from({ length: numSemestres }, (_, i) => i + 1);
        if (semestres[0] && semestres[0].length > 0) return [0, ...list];
        return list;
    }, [numSemestres, semestres]);

    // Drag-and-drop handlers
    const handleDragStart = (e: React.DragEvent, key: string) => {
        setDraggingKey(key);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        setDraggingKey(null);
        setDragOver(null);
    };

    // Called when dragging over a specific item — detects upper/lower half for insert position
    const handleItemDragOver = (e: React.DragEvent, sem: number, key: string) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const isUpperHalf = e.clientY < rect.top + rect.height / 2;
        if (isUpperHalf) {
            setDragOver({ sem, beforeKey: key });
        } else {
            const items = semestres[sem] || [];
            const idx   = items.findIndex(i => itemKey(i) === key);
            const next  = items[idx + 1];
            setDragOver({ sem, beforeKey: next ? itemKey(next) : null });
        }
    };

    const handleDrop = (e: React.DragEvent, toSem: number) => {
        e.preventDefault();
        if (!draggingKey) return;

        const isSlotKey = draggingKey.startsWith('slot-');
        const dragId    = parseInt(draggingKey.split('-')[1]);

        // Locate the dragged item
        let dragItem: GridItem | null = null;
        let fromSem = -1;
        for (const [semStr, items] of Object.entries(semestres)) {
            const found = items.find(i =>
                isSlotKey
                    ? i.isSlot  && (i as Slot).ID_Slot          === dragId
                    : !i.isSlot && (i as Asignatura).ID_Asignatura === dragId
            );
            if (found) { dragItem = found; fromSem = Number(semStr); break; }
        }
        if (!dragItem) { setDraggingKey(null); setDragOver(null); return; }

        // Build updated grid
        const newGrid: Record<number, GridItem[]> = {};
        for (const [s, items] of Object.entries(semestres)) newGrid[Number(s)] = [...items];
        if (!newGrid[toSem]) newGrid[toSem] = [];

        // Remove from source
        newGrid[fromSem] = newGrid[fromSem].filter(i =>
            isSlotKey
                ? !i.isSlot || (i as Slot).ID_Slot          !== dragId
                : i.isSlot  || (i as Asignatura).ID_Asignatura !== dragId
        );

        // Update the semestre field on the dragged item
        const updatedItem: GridItem = isSlotKey
            ? { ...(dragItem as Slot & { isSlot: true; ID_Componente: number }), Semestre: toSem }
            : { ...(dragItem as Asignatura & { isSlot: false; ID_Componente: number }),
                pivot: { ...(dragItem as Asignatura).pivot, Semestre_Sugerido: toSem } };

        // Insert at the tracked position (beforeKey from dragOver)
        const insertBeforeKey = dragOver?.sem === toSem ? dragOver.beforeKey : null;
        if (insertBeforeKey === null) {
            newGrid[toSem] = [...newGrid[toSem], updatedItem];
        } else {
            const insertIdx = newGrid[toSem].findIndex(i => itemKey(i) === insertBeforeKey);
            if (insertIdx === -1) {
                newGrid[toSem] = [...newGrid[toSem], updatedItem];
            } else {
                newGrid[toSem] = [
                    ...newGrid[toSem].slice(0, insertIdx),
                    updatedItem,
                    ...newGrid[toSem].slice(insertIdx),
                ];
            }
        }

        // Recalculate Orden for all affected columns
        const recalc = (items: GridItem[]): GridItem[] =>
            items.map((item, idx) =>
                item.isSlot
                    ? { ...item, Orden: idx + 1 }
                    : { ...item, pivot: { ...(item as Asignatura).pivot, Orden: idx + 1 } }
            ) as GridItem[];
        newGrid[fromSem] = recalc(newGrid[fromSem]);
        if (fromSem !== toSem) newGrid[toSem] = recalc(newGrid[toSem]);

        setSemestres(newGrid);
        setDraggingKey(null);
        setDragOver(null);

        // Persist changes to both asignaturas and slots
        const affectedSems = fromSem === toSem ? [fromSem] : [fromSem, toSem];
        const cambios = affectedSems.flatMap(s =>
            (newGrid[s] || []).filter(i => !i.isSlot).map(item => ({
                ID_Asignatura:     (item as Asignatura).ID_Asignatura,
                Semestre_Sugerido: (item as Asignatura).pivot.Semestre_Sugerido,
                Orden:             (item as Asignatura).pivot.Orden,
            }))
        );
        const cambios_slots = affectedSems.flatMap(s =>
            (newGrid[s] || []).filter(i => i.isSlot).map(item => ({
                ID_Slot:  (item as Slot).ID_Slot,
                Semestre: s,
                Orden:    (item as any).Orden ?? 0,
            }))
        );
        fetch(`/api/v1/mallas/${malla.ID_Malla}/reordenar`, {
            method:      'PATCH',
            headers:     { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
            body:        JSON.stringify({ cambios, cambios_slots }),
        });
    };

    // Colores por componente (basado en IDs comunes o nombres)
    const getComponentColor = (id: number) => {
        const colors: Record<number, string> = {
            1: 'bg-green-100 border-green-500', // Fundamentación
            2: 'bg-orange-100 border-orange-500', // Disciplinar
            3: 'bg-blue-100 border-blue-500',    // Libre Elección
            4: 'bg-yellow-100 border-yellow-500', // Nivelatorio
            5: 'bg-red-100 border-red-500',       // Idiomas
        };
        return colors[id] || 'bg-gray-100 border-gray-400';
    };

    const isRelated = (asigId: number, type: 'any' | 'pre' | 'co' = 'any') => {
        if (!selectedAsig || !selectedAsigData) return false;
        if (type === 'any' && selectedAsig == asigId) return true;

        const reqs = selectedAsigData.requisitos || [];

        // Verificar si la materia actual (asigId) es un requisito de la seleccionada
        const matchesReq = reqs.some(r => {
            if (r.ID_Asignatura_Requerida != asigId) return false;
            const reqType = r.Tipo_Requisito?.toLowerCase() || '';
            if (type === 'pre') return reqType.includes('pre') || reqType.includes('obligatorio') || reqType === 'opcional';
            if (type === 'co') return reqType.includes('co');
            return true;
        });

        if (matchesReq) return true;

        return false;
    };

    return (
        <Layout>
            <Head title={`Visualización - ${malla.programa.Nombre_Programa}`} />

            <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <Link href="/mallas" className="text-blue-600 hover:underline text-sm">
                            &larr; Volver
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900">Malla Curricular: {malla.programa.Nombre_Programa}</h1>
                    </div>
                    <div className="flex gap-4">
                         <div className="flex items-center gap-2 text-xs">
                            <span className="w-3 h-3 bg-green-200 border border-green-500 block"></span> Fundamentación
                            <span className="w-3 h-3 bg-orange-200 border border-orange-500 block ml-2"></span> Disciplinar
                            <span className="w-3 h-3 bg-blue-200 border border-blue-500 block ml-2"></span> Libre Elección
                         </div>
                         <div className="flex items-center gap-2 text-xs border-l pl-4 border-gray-300">
                            <span className="w-3 h-3 ring-2 ring-red-500 block"></span> Prerrequisito
                            <span className="w-3 h-3 ring-2 ring-yellow-500 block ml-2"></span> Correquisito
                         </div>
                    </div>
                </div>

                <div className="overflow-x-auto pb-8">
                    <div className="flex gap-4 min-w-max">
                        {listaSemestres.map(sem => (
                            <div
                                key={sem}
                                className="flex-1 min-w-[150px] max-w-[180px]"
                                onDragOver={e => {
                                    e.preventDefault();
                                    if (!dragOver || dragOver.sem !== sem) setDragOver({ sem, beforeKey: null });
                                }}
                                onDragLeave={e => {
                                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null);
                                }}
                                onDrop={e => handleDrop(e, sem)}
                            >
                                <div className={`text-white text-center py-2 rounded-t-lg font-bold mb-4 transition-colors ${dragOver?.sem === sem ? 'bg-blue-600' : 'bg-gray-800'}`}>
                                    {sem === 0 ? 'OTRO' : sem === 1 ? 'I' : sem === 2 ? 'II' : sem === 3 ? 'III' : sem === 4 ? 'IV' : sem === 5 ? 'V' : sem === 6 ? 'VI' : sem === 7 ? 'VII' : sem === 8 ? 'VIII' : sem === 9 ? 'IX' : 'X'}
                                </div>
                                <div className="space-y-2">
                                    {semestres[sem]?.map((item) => {
                                        const key           = itemKey(item);
                                        const showIndicator = dragOver?.sem === sem && dragOver?.beforeKey === key;

                                        if (item.isSlot) {
                                            const slot       = item as Slot & { isSlot: true; ID_Componente: number };
                                            const isLibre    = slot.Tipo_Slot === 'libre';
                                            const isOptativa = slot.Tipo_Slot === 'optativa';
                                            const isDragging = draggingKey === key;
                                            return (
                                                <React.Fragment key={key}>
                                                    {showIndicator && <div className="h-1 bg-blue-500 rounded-full" />}
                                                    <div
                                                        draggable
                                                        onDragStart={e => handleDragStart(e, key)}
                                                        onDragEnd={handleDragEnd}
                                                        onDragOver={e => handleItemDragOver(e, sem, key)}
                                                        onClick={
                                                            isLibre    ? () => { setShowElectivasModal(true);  fetchElectivas();  } :
                                                            isOptativa ? () => { setShowOptativasModal(true); fetchOptativas(); } :
                                                            undefined
                                                        }
                                                        className={[
                                                            'border-dashed border-2 p-2 h-[120px] flex flex-col items-center justify-center',
                                                            'text-[11px] font-semibold text-center leading-tight transition-all duration-200',
                                                            isDragging ? 'opacity-40 scale-95' : '',
                                                            isLibre
                                                                ? 'border-blue-400 bg-blue-50 text-blue-700 cursor-grab active:cursor-grabbing hover:bg-blue-100 hover:shadow-md'
                                                                : isOptativa
                                                                    ? 'border-orange-400 bg-orange-50 text-orange-700 cursor-grab active:cursor-grabbing hover:bg-orange-100 hover:shadow-md'
                                                                    : 'border-yellow-400 bg-yellow-50 text-yellow-700 cursor-grab active:cursor-grabbing',
                                                        ].join(' ')}
                                                    >
                                                        <span className="uppercase tracking-wide">
                                                            {isLibre ? 'Libre Elección' : isOptativa ? 'Optativa' : 'Nivelatorio'}
                                                        </span>
                                                        {isLibre && (
                                                            <span className="mt-1 text-[9px] text-blue-500">clic para ver catálogo</span>
                                                        )}
                                                        {isOptativa && (
                                                            <span className="mt-1 text-[9px] text-orange-500">clic para ver catálogo</span>
                                                        )}
                                                    </div>
                                                </React.Fragment>
                                            );
                                        }

                                        const asig    = item as Asignatura & { isSlot: false; ID_Componente: number };
                                        const active  = selectedAsig === asig.ID_Asignatura;
                                        const isPre   = isRelated(asig.ID_Asignatura, 'pre');
                                        const isCo    = isRelated(asig.ID_Asignatura, 'co');
                                        const related = isPre || isCo;
                                        const isDragging = draggingKey === key;

                                        return (
                                            <React.Fragment key={key}>
                                                {showIndicator && <div className="h-1 bg-blue-500 rounded-full" />}
                                                <div
                                                    draggable
                                                    onDragStart={e => handleDragStart(e, key)}
                                                    onDragEnd={handleDragEnd}
                                                    onDragOver={e => handleItemDragOver(e, sem, key)}
                                                    onClick={() => setSelectedAsig(asig.ID_Asignatura === selectedAsig ? null : asig.ID_Asignatura)}
                                                    className={[
                                                        getComponentColor(asig.ID_Componente || 0),
                                                        'border-l-4 p-2 shadow-sm cursor-grab active:cursor-grabbing transition-all duration-200',
                                                        'hover:shadow-md h-[120px] flex flex-col justify-between relative',
                                                        active     ? 'ring-4 ring-blue-600 scale-105 z-20 shadow-xl' : '',
                                                        isDragging ? 'opacity-40 scale-95' : '',
                                                        selectedAsig && !active && !related && !isDragging ? 'opacity-30' : '',
                                                        isPre ? 'ring-4 ring-red-500 z-10' : '',
                                                        isCo  ? 'ring-4 ring-yellow-500 z-10' : '',
                                                    ].join(' ')}
                                                >
                                                    <div className="flex justify-between text-[10px] font-bold text-gray-600">
                                                        <span>{asig.Creditos_Asignatura}</span>
                                                        <span>{asig.Horas_Presencial || 0}</span>
                                                        <span>{asig.Horas_Estudiante || 0}</span>
                                                    </div>
                                                    <div className="text-center text-[11px] font-semibold leading-tight flex-grow flex items-center justify-center py-1">
                                                        {asig.Nombre_Asignatura}
                                                    </div>
                                                    <div className="flex justify-between items-center mt-1 border-t border-gray-200 pt-1">
                                                        <span className="text-[10px] text-gray-500">{asig.Codigo_Asignatura}</span>
                                                        <div className="flex gap-1">
                                                            {asig.requisitos?.some(r => r.Tipo_Requisito?.toLowerCase().includes('pre')) && (
                                                                <div className="w-3 h-3 bg-red-400 rounded-full flex items-center justify-center" title="Tiene prerrequisitos">
                                                                    <span className="text-[8px] text-white">P</span>
                                                                </div>
                                                            )}
                                                            {asig.requisitos?.some(r => r.Tipo_Requisito?.toLowerCase().includes('co')) && (
                                                                <div className="w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center" title="Tiene correquisitos">
                                                                    <span className="text-[8px] text-white font-bold">C</span>
                                                                </div>
                                                            )}
                                                            {asig.requisitos?.some(r => r.Tipo_Requisito?.toLowerCase().includes('credito')) && (
                                                                <div className="w-3 h-3 bg-blue-400 rounded-full flex items-center justify-center" title="Tiene requisitos de créditos">
                                                                    <span className="text-[8px] text-white font-bold">Cr</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </React.Fragment>
                                        );
                                    })}
                                    {/* Drop indicator at end of column (append position) */}
                                    {dragOver?.sem === sem && dragOver?.beforeKey === null && draggingKey && (
                                        <div className="h-1 bg-blue-500 rounded-full" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {selectedAsig && (
                    <div className="mt-6 bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                        <h4 className="font-bold text-lg mb-2">Detalles de la Asignatura</h4>
                        {(() => {
                            const asig = malla.agrupaciones.flatMap(a => a.asignaturas).find(a => a.ID_Asignatura == selectedAsig);
                            return (
                                <>
                                    <p><strong>{asig?.Nombre_Asignatura}</strong> ({asig?.Codigo_Asignatura})</p>
                                    <p className="text-sm">Créditos: {asig?.Creditos_Asignatura}</p>
                                    {asig?.requisitos && asig.requisitos.length > 0 ? (
                                        <div className="mt-2">
                                            <p className="text-sm font-bold text-red-600">Prerrequisitos / Correquisitos:</p>
                                            <ul className="list-disc list-inside text-sm">
                                                {asig.requisitos.map((r, idx) => (
                                                    <li key={idx}>
                                                        {r.ID_Asignatura_Requerida ? (
                                                            <>
                                                                {r.asignatura_requerida?.Nombre_Asignatura || 'Materia'} ({r.asignatura_requerida?.Codigo_Asignatura || 'N/A'})
                                                            </>
                                                        ) : (
                                                            <span className="font-medium text-blue-700">
                                                                {r.Descripcion_Requisito || `${r.Valor_Creditos} créditos requeridos`}
                                                            </span>
                                                        )}
                                                        {' '}- <span className="italic text-gray-500">{formatTipoRequisito(r.Tipo_Requisito)}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 mt-2">No tiene requisitos registrados.</p>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                )}
            </div>

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
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
                            <div>
                                <h2 className="text-base font-semibold text-gray-900">Catálogo de Libre Elección</h2>
                                <p className="text-xs text-gray-500 mt-0.5">{malla.programa.Nombre_Programa}</p>
                            </div>
                            <button
                                onClick={() => setShowElectivasModal(false)}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Search bar */}
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
                                        <button
                                            onClick={() => setSearchElectivas('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Body */}
                        <div className="overflow-y-auto px-6 py-4 flex-1">
                            {loadingElectivas ? (
                                <div className="flex items-center justify-center gap-3 py-12 text-gray-400">
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                                    <span className="text-sm">Cargando catálogo…</span>
                                </div>
                            ) : errorElectivas ? (
                                <p className="py-10 text-center text-sm text-red-500">
                                    No se pudieron cargar las electivas. Intenta de nuevo.
                                </p>
                            ) : electivas.length === 0 ? (
                                <p className="py-10 text-center text-sm text-gray-500">
                                    No hay electivas registradas.
                                </p>
                            ) : filtered.length === 0 ? (
                                <p className="py-10 text-center text-sm text-gray-500">
                                    Sin resultados para <span className="font-medium">"{searchElectivas}"</span>.
                                </p>
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

                        {/* Footer */}
                        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 shrink-0">
                            {!loadingElectivas && !errorElectivas && electivas.length > 0 && (
                                <span className="text-xs text-gray-400">
                                    {q ? `${filtered.length} de ${electivas.length}` : electivas.length} materias
                                </span>
                            )}
                            <button
                                onClick={() => setShowElectivasModal(false)}
                                className="ml-auto rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
                );
            })()}

            {showOptativasModal && (() => {
                const q = searchOptativas.trim().toLowerCase();
                const filtered = q
                    ? optativas.filter(e =>
                        e.Nombre_Asignatura.toLowerCase().includes(q) ||
                        String(e.Codigo_Asignatura).toLowerCase().includes(q)
                      )
                    : optativas;
                return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                    <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl flex flex-col max-h-[85vh]">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
                            <div>
                                <h2 className="text-base font-semibold text-gray-900">Catálogo de Optativas</h2>
                                <p className="text-xs text-gray-500 mt-0.5">{malla.programa.Nombre_Programa}</p>
                            </div>
                            <button
                                onClick={() => setShowOptativasModal(false)}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Search */}
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
                                        <button
                                            onClick={() => setSearchOptativas('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Body */}
                        <div className="overflow-y-auto px-6 py-4 flex-1">
                            {loadingOptativas ? (
                                <div className="flex items-center justify-center gap-3 py-12 text-gray-400">
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                                    <span className="text-sm">Cargando catálogo…</span>
                                </div>
                            ) : errorOptativas ? (
                                <p className="py-10 text-center text-sm text-red-500">
                                    No se pudieron cargar las optativas. Intenta de nuevo.
                                </p>
                            ) : optativas.length === 0 ? (
                                <p className="py-10 text-center text-sm text-gray-500">
                                    No hay optativas registradas para este programa.
                                </p>
                            ) : filtered.length === 0 ? (
                                <p className="py-10 text-center text-sm text-gray-500">
                                    Sin resultados para <span className="font-medium">"{searchOptativas}"</span>.
                                </p>
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
                                        {filtered.map((e) => {
                                            const reqs = e.requisitos ?? [];
                                            const isOpen = expandedOptativa === e.ID_Asignatura;
                                            return (
                                                <>
                                                    <tr
                                                        key={e.ID_Asignatura}
                                                        onClick={() => setExpandedOptativa(isOpen ? null : e.ID_Asignatura)}
                                                        className="border-b border-gray-50 hover:bg-orange-50 cursor-pointer select-none"
                                                    >
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
                                                        <tr key={`req-${e.ID_Asignatura}`} className="bg-orange-50 border-b border-orange-100">
                                                            <td colSpan={4} className="px-4 pb-3 pt-1">
                                                                <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-600 mb-1">Requisitos</p>
                                                                <ul className="space-y-1">
                                                                    {reqs.map((r, idx) => (
                                                                        <li key={idx} className="flex items-start gap-2 text-xs text-gray-700">
                                                                            <span className={`mt-0.5 shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase ${
                                                                                r.Tipo_Requisito?.toLowerCase().includes('pre') || r.Tipo_Requisito?.toLowerCase() === 'opcional' ? 'bg-red-100 text-red-700' :
                                                                                r.Tipo_Requisito?.toLowerCase().includes('co')  ? 'bg-yellow-100 text-yellow-700' :
                                                                                'bg-gray-100 text-gray-600'
                                                                            }`}>
                                                                                {formatTipoRequisito(r.Tipo_Requisito)}
                                                                            </span>
                                                                            <span>
                                                                                {r.asignatura_requerida
                                                                                    ? `${r.asignatura_requerida.Nombre_Asignatura} (${r.asignatura_requerida.Codigo_Asignatura})`
                                                                                    : r.Descripcion_Requisito || (r.Valor_Creditos ? `${r.Valor_Creditos} créditos` : '—')
                                                                                }
                                                                            </span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 shrink-0">
                            {!loadingOptativas && !errorOptativas && optativas.length > 0 && (
                                <span className="text-xs text-gray-400">
                                    {q ? `${filtered.length} de ${optativas.length}` : optativas.length} materias
                                </span>
                            )}
                            <button
                                onClick={() => setShowOptativasModal(false)}
                                className="ml-auto rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
                );
            })()}
        </Layout>
    );
}
