import React, { useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '@/Layout/MainLayout';

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
}

interface Electiva {
    ID_Asignatura: number;
    Codigo_Asignatura: string;
    Nombre_Asignatura: string;
    Creditos_Asignatura: number;
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

export default function MallaGrafica({ malla }: Props) {
    const [selectedAsig, setSelectedAsig] = useState<number | null>(null);

    const [showElectivasModal, setShowElectivasModal] = useState(false);
    const [electivas, setElectivas]                   = useState<Electiva[]>([]);
    const [loadingElectivas, setLoadingElectivas]     = useState(false);
    const [errorElectivas, setErrorElectivas]         = useState(false);

    const fetchElectivas = async () => {
        setLoadingElectivas(true);
        setErrorElectivas(false);
        setElectivas([]);
        try {
            const res = await fetch(`/api/v1/programas/${malla.programa.ID_Programa}/electivas`);
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

    // Encontrar la asignatura seleccionada para obtener sus requisitos rápidamente
    const selectedAsigData = useMemo(() => {
        if (!selectedAsig) return null;
        for (const agrup of malla.agrupaciones) {
            const found = agrup.asignaturas.find(a => a.ID_Asignatura == selectedAsig);
            if (found) return found;
        }
        return null;
    }, [selectedAsig, malla]);

    // Organizar asignaturas y slots por semestre
    const semestres = useMemo(() => {
        const grid: Record<number, GridItem[]> = {};

        malla.agrupaciones.forEach(agrup => {
            agrup.asignaturas.forEach(asig => {
                const item: GridItem = { ...asig, ID_Componente: agrup.ID_Componente, isSlot: false };
                const sem = asig.pivot.Semestre_Sugerido || 0;
                if (!grid[sem]) grid[sem] = [];
                if (!grid[sem].find(a => !a.isSlot && (a as Asignatura).ID_Asignatura === asig.ID_Asignatura)) {
                    grid[sem].push(item);
                }
            });

            (agrup.slots || []).forEach(slot => {
                const sem = slot.Semestre || 0;
                if (!grid[sem]) grid[sem] = [];
                grid[sem].push({ ...slot, isSlot: true, ID_Componente: agrup.ID_Componente });
            });
        });

        Object.keys(grid).forEach(sem => {
            grid[Number(sem)].sort((a, b) => {
                const oa = a.isSlot ? 999 : ((a as Asignatura).pivot.Orden || 0);
                const ob = b.isSlot ? 999 : ((b as Asignatura).pivot.Orden || 0);
                return oa - ob;
            });
        });

        return grid;
    }, [malla]);

    const numSemestres = Math.max(...Object.keys(semestres).map(Number), 10);
    const listaSemestres = useMemo(() => {
        const list = Array.from({ length: numSemestres }, (_, i) => i + 1);
        if (semestres[0] && semestres[0].length > 0) {
            return [0, ...list];
        }
        return list;
    }, [numSemestres, semestres]);

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
                            <div key={sem} className="flex-1 min-w-[150px] max-w-[180px]">
                                <div className="bg-gray-800 text-white text-center py-2 rounded-t-lg font-bold mb-4">
                                    {sem === 0 ? 'OTRO' : sem === 1 ? 'I' : sem === 2 ? 'II' : sem === 3 ? 'III' : sem === 4 ? 'IV' : sem === 5 ? 'V' : sem === 6 ? 'VI' : sem === 7 ? 'VII' : sem === 8 ? 'VIII' : sem === 9 ? 'IX' : 'X'}
                                </div>
                                <div className="space-y-3">
                                    {semestres[sem]?.map((item) => {
                                        if (item.isSlot) {
                                            const slot = item as Slot & { isSlot: true; ID_Componente: number };
                                            const isLibre = slot.Tipo_Slot === 'libre';
                                            return (
                                                <div
                                                    key={`slot-${slot.ID_Slot}`}
                                                    onClick={isLibre ? () => { setShowElectivasModal(true); fetchElectivas(); } : undefined}
                                                    className={[
                                                        'border-dashed border-2 p-2 h-[120px] flex flex-col items-center justify-center',
                                                        'text-[11px] font-semibold text-center leading-tight transition-all duration-200',
                                                        isLibre
                                                            ? 'border-blue-400 bg-blue-50 text-blue-700 cursor-pointer hover:bg-blue-100 hover:shadow-md'
                                                            : slot.Tipo_Slot === 'optativa'
                                                                ? 'border-orange-400 bg-orange-50 text-orange-700 cursor-default'
                                                                : 'border-yellow-400 bg-yellow-50 text-yellow-700 cursor-default',
                                                    ].join(' ')}
                                                >
                                                    <span className="uppercase tracking-wide">
                                                        {slot.Tipo_Slot === 'libre' ? 'Libre Elección' : slot.Tipo_Slot === 'optativa' ? 'Optativa' : 'Nivelatorio'}
                                                    </span>
                                                    {isLibre && (
                                                        <span className="mt-1 text-[9px] text-blue-500">clic para ver catálogo</span>
                                                    )}
                                                </div>
                                            );
                                        }

                                        const asig   = item as Asignatura & { isSlot: false; ID_Componente: number };
                                        const active  = selectedAsig === asig.ID_Asignatura;
                                        const isPre   = isRelated(asig.ID_Asignatura, 'pre');
                                        const isCo    = isRelated(asig.ID_Asignatura, 'co');
                                        const related = isPre || isCo;

                                        return (
                                            <div
                                                key={asig.ID_Asignatura}
                                                onClick={() => setSelectedAsig(asig.ID_Asignatura === selectedAsig ? null : asig.ID_Asignatura)}
                                                className={[
                                                    getComponentColor(asig.ID_Componente || 0),
                                                    'border-l-4 p-2 shadow-sm cursor-pointer transition-all duration-200',
                                                    'hover:shadow-md h-[120px] flex flex-col justify-between relative',
                                                    active  ? 'ring-4 ring-blue-600 scale-105 z-20 shadow-xl' : '',
                                                    selectedAsig && !active && !related ? 'opacity-30' : 'opacity-100',
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
                                        );
                                    })}
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
                                                        {' '}- <span className="italic text-gray-500">{r.Tipo_Requisito}</span>
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

            {showElectivasModal && (
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
                                    No hay electivas registradas para este programa.
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
                                        {electivas.map((e) => (
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
                                <span className="text-xs text-gray-400">{electivas.length} materias disponibles</span>
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
            )}
        </Layout>
    );
}
