import { Head, Link } from '@inertiajs/react';
import React, { useMemo, useState, useCallback } from 'react';
import Layout from '@/Layout/MainLayout';

const PLACEHOLDER_RE = /^(LIBRE|OPTATIVA|NIVELATORIO)\s*\d+$/i;

const formatTipoRequisito = (tipo: string): string => {
    const t = (tipo ?? '').toLowerCase();

    if (t.includes('pre') || t === 'opcional' || t.includes('obligatorio')) {
return 'Prerrequisito';
}

    if (t.includes('co')) {
return 'Correquisito';
}

    if (t.includes('credito') || t.includes('crédito')) {
return 'Req. créditos';
}

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
    Nombre_Agrupacion?: string;
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

interface OptativaGroup {
    ID_Agrupacion: number;
    Nombre_Agrupacion: string;
    asignaturas: Electiva[];
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
        Codigo_Plan?: string;
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
    const [selectedOptativaSlot, setSelectedOptativaSlot] = useState<Slot | null>(null);
    const [optativas, setOptativas]                   = useState<OptativaGroup[]>([]);
    const [loadingOptativas, setLoadingOptativas]     = useState(false);
    const [errorOptativas, setErrorOptativas]         = useState(false);
    const [searchOptativas, setSearchOptativas]       = useState('');
    const [expandedOptativa, setExpandedOptativa]     = useState<number | null>(null);

    const [draggingKey, setDraggingKey] = useState<string | null>(null);
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

    const fetchOptativas = async (slot?: Slot) => {
        if (slot) {
            setSelectedOptativaSlot(slot);
        }

        setLoadingOptativas(true);
        setErrorOptativas(false);
        setOptativas([]);
        setSearchOptativas('');
        setExpandedOptativa(null);

        try {
            const url = `/api/v1/mallas/${malla.ID_Malla}/optativas${slot ? `?slot_id=${slot.ID_Slot}` : ''}`;
            const res = await fetch(url, {
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

    const selectedAsigData = useMemo(() => {
        if (!selectedAsig) {
return null;
}

        for (const agrup of malla.agrupaciones) {
            const found = agrup.asignaturas.find(a => a.ID_Asignatura == selectedAsig);

            if (found) {
return found;
}
        }

        return null;
    }, [selectedAsig, malla]);

    const buildGrid = useCallback((src: Props['malla']): Record<number, GridItem[]> => {
        const g: Record<number, GridItem[]> = {};
        src.agrupaciones.forEach(agrup => {
            agrup.asignaturas.forEach(asig => {
                if (PLACEHOLDER_RE.test(asig.Codigo_Asignatura)) {
return;
}

                const item: GridItem = { ...asig, ID_Componente: agrup.ID_Componente, isSlot: false };
                const sem = asig.pivot.Semestre_Sugerido || 0;

                if (!g[sem]) {
g[sem] = [];
}

                if (!g[sem].find(a => !a.isSlot && (a as Asignatura).ID_Asignatura === asig.ID_Asignatura)) {
                    g[sem].push(item);
                }
            });
            (agrup.slots || []).forEach(slot => {
                const sem = slot.Semestre || 0;

                if (!g[sem]) {
g[sem] = [];
}

                g[sem].push({ ...slot, isSlot: true, ID_Componente: agrup.ID_Componente, Nombre_Agrupacion: agrup.Nombre_Agrupacion });
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
        return Array.from({ length: numSemestres }, (_, i) => i + 1);
    }, [numSemestres]);

    const handleDragStart = (e: React.DragEvent, key: string) => {
        setDraggingKey(key);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        setDraggingKey(null);
        setDragOver(null);
    };

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

        if (!draggingKey) {
return;
}

        const isSlotKey = draggingKey.startsWith('slot-');
        const dragId    = parseInt(draggingKey.split('-')[1]);

        let dragItem: GridItem | null = null;
        let fromSem = -1;

        for (const [semStr, items] of Object.entries(semestres)) {
            const found = items.find(i =>
                isSlotKey
                    ? i.isSlot  && (i as Slot).ID_Slot          === dragId
                    : !i.isSlot && (i as Asignatura).ID_Asignatura === dragId
            );

            if (found) {
 dragItem = found; fromSem = Number(semStr); break; 
}
        }

        if (!dragItem) {
 setDraggingKey(null); setDragOver(null);

 return; 
}

        const newGrid: Record<number, GridItem[]> = {};

        for (const [s, items] of Object.entries(semestres)) {
newGrid[Number(s)] = [...items];
}

        if (!newGrid[toSem]) {
newGrid[toSem] = [];
}

        newGrid[fromSem] = newGrid[fromSem].filter(i =>
            isSlotKey
                ? !i.isSlot || (i as Slot).ID_Slot          !== dragId
                : i.isSlot  || (i as Asignatura).ID_Asignatura !== dragId
        );

        const updatedItem: GridItem = isSlotKey
            ? { ...(dragItem as Slot & { isSlot: true; ID_Componente: number }), Semestre: toSem }
            : { ...(dragItem as Asignatura & { isSlot: false; ID_Componente: number }),
                pivot: { ...(dragItem as Asignatura).pivot, Semestre_Sugerido: toSem } };

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

        const recalc = (items: GridItem[]): GridItem[] =>
            items.map((item, idx) =>
                item.isSlot
                    ? { ...item, Orden: idx + 1 }
                    : { ...item, pivot: { ...(item as Asignatura).pivot, Orden: idx + 1 } }
            ) as GridItem[];
        newGrid[fromSem] = recalc(newGrid[fromSem]);

        if (fromSem !== toSem) {
newGrid[toSem] = recalc(newGrid[toSem]);
}

        setSemestres(newGrid);
        setDraggingKey(null);
        setDragOver(null);

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

    const getComponentColor = (id: number) => {
        const colors: Record<number, string> = {
            1: 'bg-green-100 border-green-500',
            2: 'bg-orange-100 border-orange-500',
            3: 'bg-blue-100 border-blue-500',
            4: 'bg-yellow-100 border-yellow-500',
            5: 'bg-red-100 border-red-500',
        };

        return colors[id] || 'bg-gray-100 border-gray-400';
    };

    const isRelated = (asigId: number, type: 'any' | 'pre' | 'co' = 'any') => {
        if (!selectedAsig || !selectedAsigData) {
return false;
}

        if (type === 'any' && selectedAsig == asigId) {
return true;
}

        const reqs = selectedAsigData.requisitos || [];
        const matchesReq = reqs.some(r => {
            if (r.ID_Asignatura_Requerida != asigId) {
return false;
}

            const reqType = r.Tipo_Requisito?.toLowerCase() || '';

            if (type === 'pre') {
return reqType.includes('pre') || reqType.includes('obligatorio') || reqType === 'opcional';
}

            if (type === 'co') {
return reqType.includes('co');
}

            return true;
        });

        if (matchesReq) {
return true;
}

        return false;
    };

    return (
        <Layout>
            <Head title={`Diseño - ${malla.programa.Nombre_Programa}`} />

            <div className="min-h-screen bg-[#f8fafc]">
                {/* Header Glassmorphism — Con Hide on Scroll */}
                <div className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4">
                    {/* Left Section */}
                    <div className="flex items-center gap-3">
                        {/* Back Button */}
                        <Link 
                            href={`/mallas/${malla.ID_Malla}`} 
                            className="w-8 h-8 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors flex-shrink-0"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
                        </Link>

                        {/* Vertical Divider */}
                        <div className="w-px h-7 bg-slate-200" />

                        {/* Program Info */}
                        <div>
                            <h1 className="text-[15px] font-medium text-slate-900 leading-tight">
                                {malla.programa.Nombre_Programa}
                            </h1>
                            <span className="inline-flex items-center gap-1.5 mt-1.5 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2.5 py-0.5">
                                <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>grid_view</span>
                                Plan {malla.Codigo_Plan || '—'}
                            </span>
                        </div>
                    </div>

                    {/* Right Section — Legend */}
                    <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-full px-3.5 py-1.5 shrink-0">
                        {/* Fund. */}
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-green-600 flex-shrink-0" />
                            <span className="text-[11px] font-medium text-slate-600">Fund.</span>
                        </div>

                        {/* Separator */}
                        <span className="w-px h-3 bg-slate-300" />

                        {/* Disc. */}
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-orange-600 flex-shrink-0" />
                            <span className="text-[11px] font-medium text-slate-600">Disc.</span>
                        </div>

                        {/* Separator */}
                        <span className="w-px h-3 bg-slate-300" />

                        {/* Libre */}
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                            <span className="text-[11px] font-medium text-slate-600">Libre</span>
                        </div>

                        {/* Separator */}
                        <span className="w-px h-3 bg-slate-300" />

                        {/* Compl. */}
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-600 flex-shrink-0" />
                            <span className="text-[11px] font-medium text-slate-600">Compl.</span>
                        </div>
                    </div>
                </div>

                {/* Canvas de Semestres */}
                <div className="p-6 overflow-x-auto">
                    <div className="flex gap-6 min-w-max">
                        {listaSemestres.map(sem => (
                            <div
                                key={sem}
                                className={[
                                    'flex-1 min-w-[200px] max-w-[220px] bg-white/60 rounded-2xl p-3 border border-slate-200/80 transition-colors',
                                    dragOver?.sem === sem ? 'bg-blue-50/50 border-blue-300' : '',
                                ].join(' ')}
                                onDragOver={e => {
                                    e.preventDefault();

                                    if (!dragOver || dragOver.sem !== sem) {
setDragOver({ sem, beforeKey: null });
}
                                }}
                                onDragLeave={e => {
                                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
setDragOver(null);
}
                                }}
                                onDrop={e => handleDrop(e, sem)}
                            >
                                <div className="flex items-center justify-between mb-4 px-1">
                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-[2px]">
                                        {sem === 0 ? 'Otros' : `Semestre ${sem}`}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-300 bg-slate-100 px-2 py-0.5 rounded">
                                        {semestres[sem]?.length || 0}
                                    </span>
                                </div>
                                <div className="space-y-3">
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
                                                            isLibre    ? () => {
 setSelectedOptativaSlot(null); setShowElectivasModal(true);  fetchElectivas();  
} :
                                                            isOptativa ? () => {
 setShowOptativasModal(true); fetchOptativas(slot); 
} :
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
                                                        {slot.Nombre_Agrupacion && (
                                                            <span className="mt-1 text-[10px] text-gray-500">{slot.Nombre_Agrupacion}</span>
                                                        )}
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
                                                        'border-l-4 rounded-xl p-2.5 shadow-sm cursor-grab active:cursor-grabbing transition-all duration-200',
                                                        'hover:shadow-md h-[120px] flex flex-col justify-between relative',
                                                        active     ? 'ring-2 ring-blue-600 scale-[1.04] z-20 shadow-xl' : '',
                                                        isDragging ? 'opacity-40 scale-95' : '',
                                                        selectedAsig && !active && !related && !isDragging ? 'opacity-40 grayscale-[0.5] scale-[0.98]' : '',
                                                        isPre ? 'ring-2 ring-rose-500 bg-rose-50/30 z-10' : '',
                                                        isCo  ? 'ring-2 ring-amber-500 bg-amber-50/30 z-10' : '',
                                                    ].join(' ')}
                                                >
                                                    {/* Card Header */}
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] font-black text-slate-400">CR: {asig.Creditos_Asignatura}</span>
                                                        <div className="flex gap-1">
                                                            <span className="text-[9px] font-bold text-slate-300">P:{asig.Horas_Presencial || 0}</span>
                                                            <span className="text-[9px] font-bold text-slate-300">I:{asig.Horas_Estudiante || 0}</span>
                                                        </div>
                                                    </div>
                                                    {/* Course Name */}
                                                    <div className="flex-1 flex items-center justify-center py-1">
                                                        <h4 className="text-[11px] font-bold text-slate-800 text-center leading-tight line-clamp-3">
                                                            {asig.Nombre_Asignatura}
                                                        </h4>
                                                    </div>
                                                    {/* Card Footer */}
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
                                            </React.Fragment>
                                        );
                                    })}
                                    {dragOver?.sem === sem && dragOver?.beforeKey === null && draggingKey && (
                                        <div className="h-1 bg-blue-500 rounded-full" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Panel de Detalles — Side Drawer */}
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
                                    <p className="text-sm font-black text-slate-800">#{selectedAsigData.pivot.Semestre_Sugerido}</p>
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
                                {selectedOptativaSlot?.Nombre_Agrupacion ? (
                                    <p className="text-xs text-gray-500 mt-0.5">Agrupación: {selectedOptativaSlot.Nombre_Agrupacion}</p>
                                ) : (
                                    <p className="text-xs text-gray-500 mt-0.5">{malla.programa.Nombre_Programa}</p>
                                )}
                                {selectedOptativaSlot?.Nombre_Slot && (
                                    <p className="text-xs text-gray-500">Slot: {selectedOptativaSlot.Nombre_Slot}</p>
                                )}
                            </div>
                            <button
                                onClick={() => {
 setShowOptativasModal(false); setSelectedOptativaSlot(null); 
}}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                            >
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
                                                                            {reqs.map((r, idx) => (
                                                                                <li key={idx} className="flex items-start gap-2 text-xs text-gray-700">
                                                                                    <span className={`mt-0.5 shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase ${r.Tipo_Requisito?.toLowerCase().includes('pre') || r.Tipo_Requisito?.toLowerCase() === 'opcional' ? 'bg-red-100 text-red-700' : r.Tipo_Requisito?.toLowerCase().includes('co') ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
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
                            <button onClick={() => {
 setShowOptativasModal(false); setSelectedOptativaSlot(null); 
}} className="ml-auto rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Cerrar</button>
                        </div>
                    </div>
                </div>
                );
            })()}
        </Layout>
    );
}