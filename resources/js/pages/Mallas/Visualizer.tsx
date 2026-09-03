import { Head, Link } from '@inertiajs/react';
import React, { useMemo, useState, useCallback } from 'react';
import Layout from '@/Layout/MainLayout';
import {
    type Requisito,
    getUniqueRequisitos,
} from '../../lib/requisitos';

const PLACEHOLDER_RE = /^(LIBRE|OPTATIVA|NIVELATORIO)\s*\d+$/i;

const COMPONENT_STYLES: Record<
    number,
    { border: string; bg: string; text: string; dot: string }
> = {
    1: {
        border: 'border-l-[#f9a825]',
        bg: 'bg-[#fff8e1]',
        text: 'text-[#f9a825]',
        dot: 'bg-[#f9a825]',
    },
    2: {
        border: 'border-l-[#8bc34a]',
        bg: 'bg-[#f1f8e9]',
        text: 'text-[#8bc34a]',
        dot: 'bg-[#8bc34a]',
    },
    3: {
        border: 'border-l-[#4fc3f7]',
        bg: 'bg-[#e1f5fe]',
        text: 'text-[#4fc3f7]',
        dot: 'bg-[#4fc3f7]',
    },
    4: {
        border: 'border-l-[#f06292]',
        bg: 'bg-[#fce4ec]',
        text: 'text-[#f06292]',
        dot: 'bg-[#f06292]',
    },
    5: {
        border: 'border-l-[#9c27b0]',
        bg: 'bg-[#f3e5f5]',
        text: 'text-[#9c27b0]',
        dot: 'bg-[#9c27b0]',
    },
};

const getComponentStyle = (id: number) =>
    COMPONENT_STYLES[id] || {
        border: 'border-l-gray-400',
        bg: 'bg-gray-100',
        text: 'text-gray-400',
        dot: 'bg-gray-400',
    };

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

interface Electiva {
    ID_Asignatura: number;
    Codigo_Asignatura: string;
    Nombre_Asignatura: string;
    Creditos_Asignatura: number;
    requisitos?: Requisito[];
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

interface Normativa {
    ID_Normativa: number;
    Tipo_Normativa: string;
    Numero_Normativa: string;
    Anio_Normativa: number;
    Instancia: string;
    Descripcion_Normativa?: string;
}

interface Props {
    malla: {
        ID_Malla: number;
        Codigo_Plan?: string;
        programa: {
            Nombre_Programa: string;
            ID_Programa: number;
            Creditos_Totales?: number | null;
            Duracion_Semestres?: number | null;
            Nivel_Formacion?: string | null;
            Codigo_SNIES?: string | null;
            Titulo_Otorgado?: string | null;
            Facultad?: string;
        };
        normativa?: Normativa | null;
        agrupaciones: Agrupacion[];
    };
}

type GridItem =
    | (Asignatura & { isSlot: false; ID_Componente: number })
    | (Slot & { isSlot: true; ID_Componente: number });

const itemKey = (item: GridItem): string =>
    item.isSlot
        ? `slot-${(item as Slot & { isSlot: true }).ID_Slot}`
        : `asig-${(item as Asignatura & { isSlot: false }).ID_Asignatura}`;

export default function MallaGrafica({ malla }: Props) {
    const [selectedAsig, setSelectedAsig] = useState<number | null>(null);

    const [showElectivasModal, setShowElectivasModal] = useState(false);
    const [electivas, setElectivas] = useState<Electiva[]>([]);
    const [loadingElectivas, setLoadingElectivas] = useState(false);
    const [errorElectivas, setErrorElectivas] = useState(false);
    const [searchElectivas, setSearchElectivas] = useState('');

    const [showOptativasModal, setShowOptativasModal] = useState(false);
    const [selectedOptativaSlot, setSelectedOptativaSlot] =
        useState<Slot | null>(null);
    const [optativas, setOptativas] = useState<OptativaGroup[]>([]);
    const [loadingOptativas, setLoadingOptativas] = useState(false);
    const [errorOptativas, setErrorOptativas] = useState(false);
    const [searchOptativas, setSearchOptativas] = useState('');
    const [expandedOptativa, setExpandedOptativa] = useState<number | null>(
        null,
    );

    const [draggingKey, setDraggingKey] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState<{
        sem: number;
        beforeKey: string | null;
    } | null>(null);

    const fetchElectivas = async () => {
        setLoadingElectivas(true);
        setErrorElectivas(false);
        setElectivas([]);
        setSearchElectivas('');

        try {
            const res = await fetch(`/api/v1/electivas`, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
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

        setShowOptativasModal(true);
        setLoadingOptativas(true);
        setErrorOptativas(false);
        setOptativas([]);
        setSearchOptativas('');
        setExpandedOptativa(null);

        try {
            const url = `/api/v1/mallas/${malla.ID_Malla}/optativas${slot ? `?slot_id=${slot.ID_Slot}` : ''}`;
            const res = await fetch(url, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
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
            const found = agrup.asignaturas.find(
                (a) => a.ID_Asignatura == selectedAsig,
            );

            if (found) {
                return found;
            }
        }

        return null;
    }, [selectedAsig, malla]);

    const buildGrid = useCallback(
        (src: Props['malla']): Record<number, GridItem[]> => {
            const g: Record<number, GridItem[]> = {};
            src.agrupaciones.forEach((agrup) => {
                agrup.asignaturas.forEach((asig) => {
                    if (PLACEHOLDER_RE.test(asig.Codigo_Asignatura)) {
                        return;
                    }

                    const item: GridItem = {
                        ...asig,
                        ID_Componente: agrup.ID_Componente,
                        isSlot: false,
                    };
                    const sem = asig.pivot.Semestre_Sugerido || 0;

                    if (!g[sem]) {
                        g[sem] = [];
                    }

                    if (
                        !g[sem].find(
                            (a) =>
                                !a.isSlot &&
                                (a as Asignatura).ID_Asignatura ===
                                    asig.ID_Asignatura,
                        )
                    ) {
                        g[sem].push(item);
                    }
                });
                (agrup.slots || []).forEach((slot) => {
                    const sem = slot.Semestre || 0;

                    if (!g[sem]) {
                        g[sem] = [];
                    }

                    const tipoSlot = String(slot.Tipo_Slot ?? '').toLowerCase();
                    g[sem].push({
                        ...slot,
                        Tipo_Slot:
                            tipoSlot === 'libre' ||
                            tipoSlot === 'optativa' ||
                            tipoSlot === 'nivelatorio'
                                ? tipoSlot
                                : 'libre',
                        isSlot: true,
                        ID_Componente: agrup.ID_Componente,
                        Nombre_Agrupacion: agrup.Nombre_Agrupacion,
                    });
                });
            });
            Object.keys(g).forEach((sem) => {
                g[Number(sem)].sort((a, b) => {
                    const oa = a.isSlot
                        ? ((a as Slot).Orden ?? 999)
                        : (a as Asignatura).pivot.Orden || 0;
                    const ob = b.isSlot
                        ? ((b as Slot).Orden ?? 999)
                        : (b as Asignatura).pivot.Orden || 0;

                    return oa - ob;
                });
            });

            return g;
        },
        [],
    );

    const [semestres, setSemestres] = useState<Record<number, GridItem[]>>(() =>
        buildGrid(malla),
    );

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

    const handleItemDragOver = (
        e: React.DragEvent,
        sem: number,
        key: string,
    ) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const isUpperHalf = e.clientY < rect.top + rect.height / 2;

        if (isUpperHalf) {
            setDragOver({ sem, beforeKey: key });
        } else {
            const items = semestres[sem] || [];
            const idx = items.findIndex((i) => itemKey(i) === key);
            const next = items[idx + 1];
            setDragOver({ sem, beforeKey: next ? itemKey(next) : null });
        }
    };

    const handleDrop = (e: React.DragEvent, toSem: number) => {
        e.preventDefault();

        if (!draggingKey) {
            return;
        }

        const isSlotKey = draggingKey.startsWith('slot-');
        const dragId = parseInt(draggingKey.split('-')[1]);

        let dragItem: GridItem | null = null;
        let fromSem = -1;

        for (const [semStr, items] of Object.entries(semestres)) {
            const found = items.find((i) =>
                isSlotKey
                    ? i.isSlot && (i as Slot).ID_Slot === dragId
                    : !i.isSlot && (i as Asignatura).ID_Asignatura === dragId,
            );

            if (found) {
                dragItem = found;
                fromSem = Number(semStr);
                break;
            }
        }

        if (!dragItem) {
            setDraggingKey(null);
            setDragOver(null);

            return;
        }

        const newGrid: Record<number, GridItem[]> = {};

        for (const [s, items] of Object.entries(semestres)) {
            newGrid[Number(s)] = [...items];
        }

        if (!newGrid[toSem]) {
            newGrid[toSem] = [];
        }

        newGrid[fromSem] = newGrid[fromSem].filter((i) =>
            isSlotKey
                ? !i.isSlot || (i as Slot).ID_Slot !== dragId
                : i.isSlot || (i as Asignatura).ID_Asignatura !== dragId,
        );

        const updatedItem: GridItem = isSlotKey
            ? {
                  ...(dragItem as Slot & {
                      isSlot: true;
                      ID_Componente: number;
                  }),
                  Semestre: toSem,
              }
            : {
                  ...(dragItem as Asignatura & {
                      isSlot: false;
                      ID_Componente: number;
                  }),
                  pivot: {
                      ...(dragItem as Asignatura).pivot,
                      Semestre_Sugerido: toSem,
                  },
              };

        const insertBeforeKey =
            dragOver?.sem === toSem ? dragOver.beforeKey : null;

        if (insertBeforeKey === null) {
            newGrid[toSem] = [...newGrid[toSem], updatedItem];
        } else {
            const insertIdx = newGrid[toSem].findIndex(
                (i) => itemKey(i) === insertBeforeKey,
            );

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
                    : {
                          ...item,
                          pivot: {
                              ...(item as Asignatura).pivot,
                              Orden: idx + 1,
                          },
                      },
            ) as GridItem[];
        newGrid[fromSem] = recalc(newGrid[fromSem]);

        if (fromSem !== toSem) {
            newGrid[toSem] = recalc(newGrid[toSem]);
        }

        setSemestres(newGrid);
        setDraggingKey(null);
        setDragOver(null);

        const affectedSems = fromSem === toSem ? [fromSem] : [fromSem, toSem];
        const cambios = affectedSems.flatMap((s) =>
            (newGrid[s] || [])
                .filter((i) => !i.isSlot)
                .map((item) => ({
                    ID_Asignatura: (item as Asignatura).ID_Asignatura,
                    Semestre_Sugerido: (item as Asignatura).pivot
                        .Semestre_Sugerido,
                    Orden: (item as Asignatura).pivot.Orden,
                })),
        );
        const cambios_slots = affectedSems.flatMap((s) =>
            (newGrid[s] || [])
                .filter((i) => i.isSlot)
                .map((item) => ({
                    ID_Slot: (item as Slot).ID_Slot,
                    Semestre: s,
                    Orden: (item as any).Orden ?? 0,
                })),
        );
        fetch(`/api/v1/mallas/${malla.ID_Malla}/reordenar`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'same-origin',
            body: JSON.stringify({ cambios, cambios_slots }),
        });
    };

    const isRelated = (asigId: number, type: 'any' | 'pre' | 'co' = 'any') => {
        if (!selectedAsig || !selectedAsigData) {
            return false;
        }

        if (type === 'any' && selectedAsig == asigId) {
            return true;
        }

        const reqs = getUniqueRequisitos(selectedAsigData.requisitos || []);
        const matchesReq = reqs.some((r) => {
            if (r.ID_Asignatura_Requerida != asigId) {
                return false;
            }

            const reqType = r.Tipo_Requisito?.toLowerCase() || '';

            if (type === 'pre') {
                return (
                    reqType.includes('pre') ||
                    reqType.includes('obligatorio') ||
                    reqType === 'opcional'
                );
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

            <div className="flex min-h-0 flex-col bg-[#f8fafc]">
                {/* Header Glassmorphism — Con Hide on Scroll */}
                <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3.5">
                    {/* Left Section */}
                    <div className="flex items-center gap-3">
                        {/* Back Button */}
                        <Link
                            href={`/mallas/${malla.ID_Malla}`}
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100"
                        >
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '16px' }}
                            >
                                arrow_back
                            </span>
                        </Link>

                        {/* Vertical Divider */}
                        <div className="h-7 w-px bg-slate-200" />

                        {/* Program Info */}
                        <div>
                            <h1 className="text-[15px] leading-tight font-medium text-slate-900">
                                {malla.programa.Nombre_Programa}
                            </h1>
                            <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700">
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '11px' }}
                                >
                                    grid_view
                                </span>
                                Plan {malla.Codigo_Plan || '—'}
                            </span>
                            {malla.normativa && (
                                <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: '11px' }}
                                    >
                                        gavel
                                    </span>
                                    {malla.normativa.Tipo_Normativa}{' '}
                                    {malla.normativa.Numero_Normativa} de{' '}
                                    {malla.normativa.Anio_Normativa}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Right Section — Legend */}
                    <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3.5 py-1.5">
                        {/* Fund. */}
                        <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#f9a825]" />
                            <span className="text-[11px] font-medium text-slate-600">
                                Fund.
                            </span>
                        </div>

                        {/* Separator */}
                        <span className="h-3 w-px bg-slate-300" />

                        {/* Disc. */}
                        <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#8bc34a]" />
                            <span className="text-[11px] font-medium text-slate-600">
                                Disc.
                            </span>
                        </div>

                        {/* Separator */}
                        <span className="h-3 w-px bg-slate-300" />

                        {/* Libre */}
                        <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#4fc3f7]" />
                            <span className="text-[11px] font-medium text-slate-600">
                                Libre
                            </span>
                        </div>

                        {/* Separator */}
                        <span className="h-3 w-px bg-slate-300" />

                        {/* Compl. */}
                        <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#f06292]" />
                            <span className="text-[11px] font-medium text-slate-600">
                                Compl.
                            </span>
                        </div>

                        {/* Separator */}
                        <span className="h-3 w-px bg-slate-300" />

                        {/* Idiomas */}
                        <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#9c27b0]" />
                            <span className="text-[11px] font-medium text-slate-600">
                                Idiomas
                            </span>
                        </div>
                    </div>
                </div>

                {/* Canvas de Semestres */}
                <div className="overflow-x-auto p-6">
                    <div className="flex gap-6 bg-[#f8fafc]">
                        {listaSemestres.map((sem) => (
                            <div
                                key={sem}
                                className={[
                                    'flex-1 rounded-2xl border border-slate-200/80 bg-white/60 p-3 transition-colors',
                                    dragOver?.sem === sem
                                        ? 'border-blue-300 bg-blue-50/50'
                                        : '',
                                ].join(' ')}
                                onDragOver={(e) => {
                                    e.preventDefault();

                                    if (!dragOver || dragOver.sem !== sem) {
                                        setDragOver({ sem, beforeKey: null });
                                    }
                                }}
                                onDragLeave={(e) => {
                                    if (
                                        !e.currentTarget.contains(
                                            e.relatedTarget as Node,
                                        )
                                    ) {
                                        setDragOver(null);
                                    }
                                }}
                                onDrop={(e) => handleDrop(e, sem)}
                            >
                                <div className="mb-4 flex items-center justify-between px-1">
                                    <span className="text-[11px] font-black tracking-[2px] text-slate-400 uppercase">
                                        {sem === 0
                                            ? 'Otros'
                                            : `Semestre ${sem}`}
                                    </span>
                                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                                        {semestres[sem]?.length || 0}
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    {semestres[sem]?.map((item) => {
                                        const key = itemKey(item);
                                        const showIndicator =
                                            dragOver?.sem === sem &&
                                            dragOver?.beforeKey === key;

                                        if (item.isSlot) {
                                            const slot = item as Slot & {
                                                isSlot: true;
                                                ID_Componente: number;
                                            };
                                            const tipoSlot = String(
                                                slot.Tipo_Slot ?? '',
                                            ).toLowerCase();
                                            const isLibre =
                                                tipoSlot === 'libre';
                                            const isOptativa =
                                                tipoSlot === 'optativa';
                                            const isDragging =
                                                draggingKey === key;

                                            const slotTheme = isLibre
                                                ? {
                                                      wrapper:
                                                          'border-[#4fc3f7]/50 bg-[#e1f5fe]/40 hover:bg-[#e1f5fe]/80 hover:border-[#4fc3f7]/80 hover:shadow-sm',
                                                      icon: 'text-[#4fc3f7]',
                                                      label: 'text-slate-600',
                                                      sub: 'text-slate-400',
                                                      iconName: 'shuffle',
                                                  }
                                                : isOptativa
                                                  ? {
                                                        wrapper:
                                                            'border-[#f9a825]/50 bg-[#fff8e1]/40 hover:bg-[#fff8e1]/80 hover:border-[#f9a825]/80 hover:shadow-sm',
                                                        icon: 'text-[#f9a825]',
                                                        label: 'text-slate-600',
                                                        sub: 'text-slate-400',
                                                        iconName: 'stars',
                                                    }
                                                  : {
                                                        wrapper:
                                                            'border-slate-200/80 bg-slate-50/60 hover:bg-slate-100/80 hover:border-slate-300 hover:shadow-sm',
                                                        icon: 'text-slate-300',
                                                        label: 'text-slate-500',
                                                        sub: 'text-slate-400',
                                                        iconName: 'pending',
                                                    };

                                            return (
                                                <React.Fragment key={key}>
                                                    {showIndicator && (
                                                        <div className="h-1 rounded-full bg-blue-500" />
                                                    )}
                                                    <div
                                                        draggable
                                                        onDragStart={(e) =>
                                                            handleDragStart(
                                                                e,
                                                                key,
                                                            )
                                                        }
                                                        onDragEnd={
                                                            handleDragEnd
                                                        }
                                                        onDragOver={(e) =>
                                                            handleItemDragOver(
                                                                e,
                                                                sem,
                                                                key,
                                                            )
                                                        }
                                                        onClick={
                                                            isLibre
                                                                ? () => {
                                                                      setSelectedOptativaSlot(
                                                                          null,
                                                                      );
                                                                      setShowElectivasModal(
                                                                          true,
                                                                      );
                                                                      fetchElectivas();
                                                                  }
                                                                : isOptativa
                                                                  ? () =>
                                                                        fetchOptativas(
                                                                            slot,
                                                                        )
                                                                  : undefined
                                                        }
                                                        className={[
                                                            'flex min-h-[100px] flex-col items-center justify-center rounded-xl border border-dashed p-2 text-center transition-all duration-300',
                                                            isLibre ||
                                                            isOptativa
                                                                ? 'cursor-pointer'
                                                                : 'cursor-default',
                                                            isDragging
                                                                ? 'scale-95 opacity-40'
                                                                : '',
                                                            slotTheme.wrapper,
                                                        ].join(' ')}
                                                    >
                                                        <span
                                                            className={`material-symbols-outlined mb-1 !text-[15px] ${slotTheme.icon}`}
                                                            aria-hidden="true"
                                                        >
                                                            {slotTheme.iconName}
                                                        </span>
                                                        <span
                                                            className={`text-[9px] leading-tight font-black tracking-wide uppercase ${slotTheme.label}`}
                                                        >
                                                            {isLibre
                                                                ? 'Libre Elección'
                                                                : isOptativa
                                                                  ? 'Optativa'
                                                                  : 'Nivelatorio'}
                                                        </span>
                                                        {slot.Nombre_Agrupacion && (
                                                            <span
                                                                className={`mt-0.5 line-clamp-2 text-[8px] leading-snug font-medium ${slotTheme.sub}`}
                                                            >
                                                                {
                                                                    slot.Nombre_Agrupacion
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                </React.Fragment>
                                            );
                                        }

                                        const asig = item as Asignatura & {
                                            isSlot: false;
                                            ID_Componente: number;
                                        };
                                        const active =
                                            selectedAsig === asig.ID_Asignatura;
                                        const isPre = isRelated(
                                            asig.ID_Asignatura,
                                            'pre',
                                        );
                                        const isCo = isRelated(
                                            asig.ID_Asignatura,
                                            'co',
                                        );
                                        const related = isPre || isCo;
                                        const isDragging = draggingKey === key;
                                        const oblig =
                                            asig.pivot.Tipo_Asignatura.toUpperCase().includes(
                                                'OBLI',
                                            );
                                        const style = getComponentStyle(
                                            asig.ID_Componente || 0,
                                        );

                                        const hasPre =
                                            getUniqueRequisitos(
                                                asig.requisitos,
                                            ).some((r) => {
                                                const t = (
                                                    r.Tipo_Requisito || ''
                                                ).toLowerCase();
                                                return (
                                                    t.includes('pre') ||
                                                    t.includes('obligatorio') ||
                                                    t === 'opcional'
                                                );
                                            }) ?? false;
                                        const hasCo =
                                            getUniqueRequisitos(
                                                asig.requisitos,
                                            ).some((r) =>
                                                (r.Tipo_Requisito || '')
                                                    .toLowerCase()
                                                    .includes('co'),
                                            ) ?? false;
                                        const reqCount =
                                            getUniqueRequisitos(asig.requisitos)
                                                .length;

                                        return (
                                            <React.Fragment key={key}>
                                                {showIndicator && (
                                                    <div className="h-1 rounded-full bg-blue-500" />
                                                )}
                                                <div
                                                    draggable
                                                    onDragStart={(e) =>
                                                        handleDragStart(e, key)
                                                    }
                                                    onDragEnd={handleDragEnd}
                                                    onDragOver={(e) =>
                                                        handleItemDragOver(
                                                            e,
                                                            sem,
                                                            key,
                                                        )
                                                    }
                                                    onClick={() =>
                                                        setSelectedAsig(
                                                            asig.ID_Asignatura ===
                                                                selectedAsig
                                                                ? null
                                                                : asig.ID_Asignatura,
                                                        )
                                                    }
                                                    className={[
                                                        style.border,
                                                        'relative min-h-[100px] transform-gpu cursor-grab rounded-xl border-l-[5px] bg-white shadow-sm transition-all duration-200 active:cursor-grabbing',
                                                        'flex flex-col justify-between overflow-hidden',
                                                        'hover:shadow-md',
                                                        active
                                                            ? 'z-30 shadow-xl ring-2 ring-blue-600'
                                                            : '',
                                                        isDragging
                                                            ? 'scale-95 opacity-40'
                                                            : '',
                                                        selectedAsig &&
                                                        !active &&
                                                        !related &&
                                                        !isDragging
                                                            ? 'opacity-30 grayscale-[0.8]'
                                                            : '',
                                                        isPre
                                                            ? 'z-20 bg-rose-50 ring-2 ring-rose-500'
                                                            : '',
                                                        isCo
                                                            ? 'z-20 bg-amber-50 ring-2 ring-amber-400'
                                                            : '',
                                                    ].join(' ')}
                                                >
                                                    <div
                                                        className={`${style.bg} flex shrink-0 justify-around border-b border-white/50 py-0.5 text-[9px] font-black text-slate-600`}
                                                    >
                                                        <span>
                                                            {
                                                                asig.Creditos_Asignatura
                                                            }{' '}
                                                            CR
                                                        </span>
                                                        <span>
                                                            {
                                                                asig.Horas_Presencial
                                                            }{' '}
                                                            HP
                                                        </span>
                                                        <span>
                                                            {
                                                                asig.Horas_Estudiante
                                                            }{' '}
                                                            HE
                                                        </span>
                                                    </div>

                                                    <div className="flex min-h-0 flex-1 items-center justify-center px-2 py-1 text-center">
                                                        <h4 className="line-clamp-3 text-[11px] leading-tight font-bold text-slate-800">
                                                            {
                                                                asig.Nombre_Asignatura
                                                            }
                                                        </h4>
                                                    </div>

                                                    <div className="flex shrink-0 items-center justify-between bg-slate-50/50 px-2 py-1">
                                                        <span className="truncate font-mono text-[9px] font-bold text-slate-500">
                                                            {
                                                                asig.Codigo_Asignatura
                                                            }
                                                        </span>
                                                        <div className="flex items-center gap-1">
                                                            {reqCount > 0 &&
                                                                (() => {
                                                                    const label =
                                                                        hasPre
                                                                            ? 'Tiene prerrequisitos'
                                                                            : hasCo
                                                                              ? 'Tiene correquisitos'
                                                                              : 'Tiene requisito de créditos';
                                                                    const dotColor =
                                                                        hasPre
                                                                            ? 'bg-rose-500'
                                                                            : hasCo
                                                                              ? 'bg-amber-400'
                                                                              : 'bg-blue-400';

                                                                    return (
                                                                        <span
                                                                            title={
                                                                                label
                                                                            }
                                                                            aria-label={
                                                                                label
                                                                            }
                                                                            className={`inline-flex items-center gap-0.5 ${dotColor} h-4 rounded-full px-1.5 text-[9px] font-bold text-white ring-2 ring-white`}
                                                                        >
                                                                            {
                                                                                reqCount
                                                                            }
                                                                        </span>
                                                                    );
                                                                })()}
                                                            <span
                                                                className={`material-symbols-outlined !text-sm ${oblig ? 'text-rose-500' : 'text-blue-500'}`}
                                                                aria-hidden="true"
                                                            >
                                                                {oblig
                                                                    ? 'verified'
                                                                    : 'stars'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </React.Fragment>
                                        );
                                    })}
                                    {dragOver?.sem === sem &&
                                        dragOver?.beforeKey === null &&
                                        draggingKey && (
                                            <div className="h-1 rounded-full bg-blue-500" />
                                        )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Panel de Detalles — Side Drawer */}
                {selectedAsig && selectedAsigData && (
                    <div className="fixed right-6 bottom-6 z-[60] w-80 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl duration-300 animate-in slide-in-from-right">
                        <div className="flex items-start justify-between bg-slate-900 p-5 text-white">
                            <div>
                                <h4 className="text-sm leading-tight font-bold">
                                    {selectedAsigData.Nombre_Asignatura}
                                </h4>
                                <p className="mt-1 font-mono text-[10px] text-slate-400 uppercase">
                                    {selectedAsigData.Codigo_Asignatura}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedAsig(null)}
                                className="ml-3 shrink-0 text-slate-400 hover:text-white"
                            >
                                <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                        <div className="space-y-4 p-5">
                            <div className="grid grid-cols-3 gap-2">
                                <div className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-center">
                                    <span className="block text-[9px] font-bold text-slate-400 uppercase">
                                        Créditos
                                    </span>
                                    <p className="text-sm font-black text-slate-800">
                                        {selectedAsigData.Creditos_Asignatura}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-center">
                                    <span className="block text-[9px] font-bold text-slate-400 uppercase">
                                        Presencial
                                    </span>
                                    <p className="text-sm font-black text-slate-800">
                                        {selectedAsigData.Horas_Presencial}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-center">
                                    <span className="block text-[9px] font-bold text-slate-400 uppercase">
                                        Semestre
                                    </span>
                                    <p className="text-sm font-black text-slate-800">
                                        #
                                        {
                                            selectedAsigData.pivot
                                                .Semestre_Sugerido
                                        }
                                    </p>
                                </div>
                            </div>

                            <div>
                                <h5 className="mb-2 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                    Requisitos
                                </h5>
                                {(() => {
                                    const unicos = getUniqueRequisitos(
                                        selectedAsigData.requisitos,
                                    );
                                    return unicos.length > 0 ? (
                                        <ul className="space-y-2">
                                            {unicos.map((req, i) => {
                                                const t = (
                                                    req.Tipo_Requisito ?? ''
                                                ).toLowerCase();
                                                const isPre =
                                                    t.includes('pre') ||
                                                    t.includes('obligatorio') ||
                                                    t === 'opcional';

                                                return (
                                                    <li
                                                        key={i}
                                                        className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs"
                                                    >
                                                        <span
                                                            className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${isPre ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}
                                                        >
                                                            {isPre
                                                                ? 'PRE'
                                                                : 'CO'}
                                                        </span>
                                                        <span className="font-medium text-slate-700">
                                                            {req.asignatura_requerida
                                                                ? `${req.asignatura_requerida.Nombre_Asignatura} (${req.asignatura_requerida.Codigo_Asignatura})`
                                                                : req.Descripcion_Requisito ||
                                                                  (req.Valor_Creditos
                                                                      ? `${req.Valor_Creditos} créditos`
                                                                      : '—')}
                                                        </span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic">
                                            Sin requisitos registrados.
                                        </p>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showElectivasModal &&
                (() => {
                    const q = searchElectivas.trim().toLowerCase();
                    const filtered = q
                        ? electivas.filter(
                              (e) =>
                                  e.Nombre_Asignatura.toLowerCase().includes(
                                      q,
                                  ) ||
                                  String(e.Codigo_Asignatura)
                                      .toLowerCase()
                                      .includes(q),
                          )
                        : electivas;

                    return (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                            <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl">
                                <div className="flex shrink-0 items-center justify-between border-b-[3px] border-[#4fc3f7] bg-[#e1f5fe] px-6 py-4">
                                    <div>
                                        <h2 className="text-base font-semibold text-[#0277bd]">
                                            Catálogo de Libre Elección
                                        </h2>
                                        <p className="mt-0.5 text-xs text-[#0288d1]">
                                            {malla.programa.Nombre_Programa}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() =>
                                            setShowElectivasModal(false)
                                        }
                                        className="rounded-lg p-1.5 text-[#001a4b] transition-colors hover:bg-[#b3e5fc]"
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
                                                d="M6 18L18 6M6 6l12 12"
                                            />
                                        </svg>
                                    </button>
                                </div>

                                {!loadingElectivas &&
                                    !errorElectivas &&
                                    electivas.length > 0 && (
                                        <div className="shrink-0 px-6 pt-4 pb-2">
                                            <div className="relative">
                                                <svg
                                                    className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                                                    />
                                                </svg>
                                                <input
                                                    type="text"
                                                    placeholder="Buscar por nombre o código…"
                                                    value={searchElectivas}
                                                    onChange={(e) =>
                                                        setSearchElectivas(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pr-4 pl-9 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-400 focus:bg-white focus:ring-1 focus:ring-blue-400 focus:outline-none"
                                                />
                                                {searchElectivas && (
                                                    <button
                                                        onClick={() =>
                                                            setSearchElectivas(
                                                                '',
                                                            )
                                                        }
                                                        className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                    >
                                                        <svg
                                                            className="h-4 w-4"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M6 18L18 6M6 6l12 12"
                                                            />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                <div className="flex-1 overflow-y-auto px-6 py-4">
                                    {loadingElectivas ? (
                                        <div className="flex items-center justify-center gap-3 py-12 text-gray-400">
                                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                                            <span className="text-sm">
                                                Cargando catálogo…
                                            </span>
                                        </div>
                                    ) : errorElectivas ? (
                                        <p className="py-10 text-center text-sm text-red-500">
                                            No se pudieron cargar las electivas.
                                            Intenta de nuevo.
                                        </p>
                                    ) : electivas.length === 0 ? (
                                        <p className="py-10 text-center text-sm text-gray-500">
                                            No hay electivas registradas.
                                        </p>
                                    ) : filtered.length === 0 ? (
                                        <p className="py-10 text-center text-sm text-gray-500">
                                            Sin resultados para{' '}
                                            <span className="font-medium">
                                                "{searchElectivas}"
                                            </span>
                                            .
                                        </p>
                                    ) : (
                                        <table className="min-w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-gray-100 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                                    <th className="pr-4 pb-3">
                                                        Código
                                                    </th>
                                                    <th className="pr-4 pb-3">
                                                        Nombre
                                                    </th>
                                                    <th className="pb-3 text-center">
                                                        Créditos
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {filtered.map((e) => (
                                                    <tr
                                                        key={e.ID_Asignatura}
                                                        className="hover:bg-gray-50"
                                                    >
                                                        <td className="py-2 pr-4 font-mono text-xs text-gray-500">
                                                            {
                                                                e.Codigo_Asignatura
                                                            }
                                                        </td>
                                                        <td className="py-2 pr-4 text-gray-800">
                                                            {
                                                                e.Nombre_Asignatura
                                                            }
                                                        </td>
                                                        <td className="py-2 text-center text-gray-600">
                                                            {
                                                                e.Creditos_Asignatura
                                                            }
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>

                                <div className="flex shrink-0 items-center justify-between border-t border-gray-100 px-6 py-4">
                                    {!loadingElectivas &&
                                        !errorElectivas &&
                                        electivas.length > 0 && (
                                            <span className="text-xs text-gray-400">
                                                {q
                                                    ? `${filtered.length} de ${electivas.length}`
                                                    : electivas.length}{' '}
                                                materias
                                            </span>
                                        )}
                                    <button
                                        onClick={() =>
                                            setShowElectivasModal(false)
                                        }
                                        className="ml-auto rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}

            {showOptativasModal &&
                (() => {
                    const q = searchOptativas.trim().toLowerCase();
                    const filteredGroups = optativas
                        .map((group) => ({
                            ...group,
                            asignaturas: q
                                ? group.asignaturas.filter(
                                      (e) =>
                                          e.Nombre_Asignatura.toLowerCase().includes(
                                              q,
                                          ) ||
                                          String(e.Codigo_Asignatura)
                                              .toLowerCase()
                                              .includes(q),
                                  )
                                : group.asignaturas,
                        }))
                        .filter((group) => group.asignaturas.length > 0);
                    const totalOptativas = optativas.reduce(
                        (sum, group) => sum + group.asignaturas.length,
                        0,
                    );
                    const visibleOptativas = filteredGroups.reduce(
                        (sum, group) => sum + group.asignaturas.length,
                        0,
                    );

                    return (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                            <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl">
                                <div className="flex shrink-0 items-center justify-between border-b-[3px] border-[#f9a825] bg-[#fff8e1] px-6 py-4">
                                    <div>
                                        <h2 className="text-base font-semibold text-[#e65100]">
                                            Catálogo de Optativas
                                        </h2>
                                        {selectedOptativaSlot?.Nombre_Agrupacion ? (
                                            <p className="mt-0.5 text-xs text-[#e65100]">
                                                Agrupación:{' '}
                                                {
                                                    selectedOptativaSlot.Nombre_Agrupacion
                                                }
                                            </p>
                                        ) : (
                                            <p className="mt-0.5 text-xs text-[#e65100]">
                                                {malla.programa.Nombre_Programa}
                                            </p>
                                        )}
                                        {selectedOptativaSlot?.Nombre_Slot && (
                                            <p className="text-xs text-[#e65100]">
                                                Slot:{' '}
                                                {
                                                    selectedOptativaSlot.Nombre_Slot
                                                }
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowOptativasModal(false);
                                            setSelectedOptativaSlot(null);
                                        }}
                                        className="rounded-lg p-1.5 text-[#3d1a00] transition-colors hover:bg-[#ffecb3]"
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
                                                d="M6 18L18 6M6 6l12 12"
                                            />
                                        </svg>
                                    </button>
                                </div>

                                {!loadingOptativas &&
                                    !errorOptativas &&
                                    optativas.length > 0 && (
                                        <div className="shrink-0 px-6 pt-4 pb-2">
                                            <div className="relative">
                                                <svg
                                                    className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                                                    />
                                                </svg>
                                                <input
                                                    type="text"
                                                    placeholder="Buscar por nombre o código…"
                                                    value={searchOptativas}
                                                    onChange={(e) =>
                                                        setSearchOptativas(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pr-4 pl-9 text-sm text-gray-800 placeholder-gray-400 focus:border-orange-400 focus:bg-white focus:ring-1 focus:ring-orange-400 focus:outline-none"
                                                />
                                                {searchOptativas && (
                                                    <button
                                                        onClick={() =>
                                                            setSearchOptativas(
                                                                '',
                                                            )
                                                        }
                                                        className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                    >
                                                        <svg
                                                            className="h-4 w-4"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M6 18L18 6M6 6l12 12"
                                                            />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                <div className="flex-1 overflow-y-auto px-6 py-4">
                                    {loadingOptativas ? (
                                        <div className="flex items-center justify-center gap-3 py-12 text-gray-400">
                                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                                            <span className="text-sm">
                                                Cargando catálogo…
                                            </span>
                                        </div>
                                    ) : errorOptativas ? (
                                        <p className="py-10 text-center text-sm text-red-500">
                                            No se pudieron cargar las optativas.
                                            Intenta de nuevo.
                                        </p>
                                    ) : totalOptativas === 0 ? (
                                        <p className="py-10 text-center text-sm text-gray-500">
                                            No hay optativas registradas para
                                            este programa.
                                        </p>
                                    ) : visibleOptativas === 0 ? (
                                        <p className="py-10 text-center text-sm text-gray-500">
                                            Sin resultados para{' '}
                                            <span className="font-medium">
                                                "{searchOptativas}"
                                            </span>
                                            .
                                        </p>
                                    ) : (
                                        <table className="min-w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-gray-100 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                                    <th className="pr-4 pb-3">
                                                        Código
                                                    </th>
                                                    <th className="pr-4 pb-3">
                                                        Nombre
                                                    </th>
                                                    <th className="pb-3 text-center">
                                                        Créd.
                                                    </th>
                                                    <th className="pb-3 text-center">
                                                        Req.
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredGroups.map((group) => (
                                                    <React.Fragment
                                                        key={`group-${group.ID_Agrupacion}`}
                                                    >
                                                        <tr className="border-b border-gray-200 bg-gray-50">
                                                            <td
                                                                colSpan={4}
                                                                className="px-4 py-2 text-xs font-semibold tracking-wide text-gray-600 uppercase"
                                                            >
                                                                {
                                                                    group.Nombre_Agrupacion
                                                                }
                                                            </td>
                                                        </tr>
                                                        {group.asignaturas.map(
                                                            (e) => {
                                                                const reqs =
                                                                    getUniqueRequisitos(
                                                                        e.requisitos,
                                                                    );
                                                                const isOpen =
                                                                    expandedOptativa ===
                                                                    e.ID_Asignatura;

                                                                return (
                                                                    <React.Fragment
                                                                        key={
                                                                            e.ID_Asignatura
                                                                        }
                                                                    >
                                                                        <tr
                                                                            onClick={() =>
                                                                                setExpandedOptativa(
                                                                                    isOpen
                                                                                        ? null
                                                                                        : e.ID_Asignatura,
                                                                                )
                                                                            }
                                                                            className="cursor-pointer border-b border-gray-50 select-none hover:bg-orange-50"
                                                                        >
                                                                            <td className="py-2 pr-4 font-mono text-xs text-gray-500">
                                                                                {
                                                                                    e.Codigo_Asignatura
                                                                                }
                                                                            </td>
                                                                            <td className="py-2 pr-4 font-medium text-gray-800">
                                                                                {
                                                                                    e.Nombre_Asignatura
                                                                                }
                                                                            </td>
                                                                            <td className="py-2 text-center text-gray-600">
                                                                                {
                                                                                    e.Creditos_Asignatura
                                                                                }
                                                                            </td>
                                                                            <td className="py-2 text-center">
                                                                                {reqs.length >
                                                                                0 ? (
                                                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600">
                                                                                        {
                                                                                            reqs.length
                                                                                        }
                                                                                        <svg
                                                                                            className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                                                                            fill="none"
                                                                                            stroke="currentColor"
                                                                                            viewBox="0 0 24 24"
                                                                                        >
                                                                                            <path
                                                                                                strokeLinecap="round"
                                                                                                strokeLinejoin="round"
                                                                                                strokeWidth={
                                                                                                    2
                                                                                                }
                                                                                                d="M19 9l-7 7-7-7"
                                                                                            />
                                                                                        </svg>
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="text-xs text-gray-300">
                                                                                        —
                                                                                    </span>
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                        {isOpen &&
                                                                            reqs.length >
                                                                                0 && (
                                                                                <tr className="border-b border-orange-100 bg-orange-50">
                                                                                    <td
                                                                                        colSpan={
                                                                                            4
                                                                                        }
                                                                                        className="px-4 pt-1 pb-3"
                                                                                    >
                                                                                        <p className="mb-1 text-[10px] font-semibold tracking-wide text-orange-600 uppercase">
                                                                                            Requisitos
                                                                                        </p>
                                                                                        <ul className="space-y-1">
                                                                                            {reqs.map(
                                                                                                (
                                                                                                    r,
                                                                                                    idx,
                                                                                                ) => (
                                                                                                    <li
                                                                                                        key={
                                                                                                            idx
                                                                                                        }
                                                                                                        className="flex items-start gap-2 text-xs text-gray-700"
                                                                                                    >
                                                                                                        <span
                                                                                                            className={`mt-0.5 shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase ${r.Tipo_Requisito?.toLowerCase().includes('pre') || r.Tipo_Requisito?.toLowerCase() === 'opcional' ? 'bg-red-100 text-red-700' : r.Tipo_Requisito?.toLowerCase().includes('co') ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}
                                                                                                        >
                                                                                                            {formatTipoRequisito(
                                                                                                                r.Tipo_Requisito,
                                                                                                            )}
                                                                                                        </span>
                                                                                                        <span>
                                                                                                            {r.asignatura_requerida
                                                                                                                ? `${r.asignatura_requerida.Nombre_Asignatura} (${r.asignatura_requerida.Codigo_Asignatura})`
                                                                                                                : r.Descripcion_Requisito ||
                                                                                                                  (r.Valor_Creditos
                                                                                                                      ? `${r.Valor_Creditos} créditos`
                                                                                                                      : '—')}
                                                                                                        </span>
                                                                                                    </li>
                                                                                                ),
                                                                                            )}
                                                                                        </ul>
                                                                                    </td>
                                                                                </tr>
                                                                            )}
                                                                    </React.Fragment>
                                                                );
                                                            },
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>

                                <div className="flex shrink-0 items-center justify-between border-t border-gray-100 px-6 py-4">
                                    {!loadingOptativas &&
                                        !errorOptativas &&
                                        totalOptativas > 0 && (
                                            <span className="text-xs text-gray-400">
                                                {q
                                                    ? `${visibleOptativas} de ${totalOptativas}`
                                                    : totalOptativas}{' '}
                                                materias
                                            </span>
                                        )}
                                    <button
                                        onClick={() => {
                                            setShowOptativasModal(false);
                                            setSelectedOptativaSlot(null);
                                        }}
                                        className="ml-auto rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
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
