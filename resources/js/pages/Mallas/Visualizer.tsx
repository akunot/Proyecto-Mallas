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

interface Agrupacion {
    ID_Agrupacion: number;
    Nombre_Agrupacion: string;
    ID_Componente: number;
    componente?: {
        Nombre_Componente: string;
    };
    asignaturas: Asignatura[];
}

interface Props {
    malla: {
        ID_Malla: number;
        programa: {
            Nombre_Programa: string;
        };
        agrupaciones: Agrupacion[];
    };
}

export default function MallaGrafica({ malla }: Props) {
    const [selectedAsig, setSelectedAsig] = useState<number | null>(null);

    // Encontrar la asignatura seleccionada para obtener sus requisitos rápidamente
    const selectedAsigData = useMemo(() => {
        if (!selectedAsig) return null;
        for (const agrup of malla.agrupaciones) {
            const found = agrup.asignaturas.find(a => a.ID_Asignatura == selectedAsig);
            if (found) return found;
        }
        return null;
    }, [selectedAsig, malla]);

    // Organizar asignaturas por semestre
    const semestres = useMemo(() => {
        const grid: Record<number, Asignatura[]> = {};
        malla.agrupaciones.forEach(agrup => {
            agrup.asignaturas.forEach(asig => {
                const asigWithComp = { ...asig, ID_Componente: agrup.ID_Componente };
                const sem = asig.pivot.Semestre_Sugerido || 0;
                if (!grid[sem]) grid[sem] = [];
                // Evitar duplicados si una materia está en varias agrupaciones (raro pero posible)
                if (!grid[sem].find(a => a.ID_Asignatura === asig.ID_Asignatura)) {
                    grid[sem].push(asigWithComp);
                }
            });
        });
        // Ordenar cada semestre por el campo Orden
        Object.keys(grid).forEach(sem => {
            grid[Number(sem)].sort((a, b) => (a.pivot.Orden || 0) - (b.pivot.Orden || 0));
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

        // Opcional: ¿La materia seleccionada es un requisito de la actual? (Resaltado inverso)
        // Esto ayuda a ver qué materias se desbloquean
        /* 
        const currentAsig = malla.agrupaciones.flatMap(a => a.asignaturas).find(a => a.ID_Asignatura == asigId);
        if (currentAsig?.requisitos?.some(r => r.ID_Asignatura_Requerida == selectedAsig)) {
            return true; // Podríamos usar un color diferente, pero por ahora resaltemos igual
        }
        */

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
                                    {semestres[sem]?.map(asig => {
                                        const active = selectedAsig == asig.ID_Asignatura;
                                        const isPre = isRelated(asig.ID_Asignatura, 'pre');
                                        const isCo = isRelated(asig.ID_Asignatura, 'co');
                                        const related = isPre || isCo;
                                        
                                        return (
                                            <div 
                                                key={asig.ID_Asignatura}
                                                onClick={() => setSelectedAsig(asig.ID_Asignatura == selectedAsig ? null : asig.ID_Asignatura)}
                                                className={`
                                                    ${getComponentColor(asig.ID_Componente || 0)}
                                                    border-l-4 p-2 shadow-sm cursor-pointer transition-all duration-200
                                                    hover:shadow-md h-[120px] flex flex-col justify-between relative
                                                    ${active ? 'ring-4 ring-blue-600 scale-105 z-20 shadow-xl' : ''}
                                                    ${selectedAsig && !active && !related ? 'opacity-30' : 'opacity-100'}
                                                    ${isPre ? 'ring-4 ring-red-500 z-10' : ''}
                                                    ${isCo ? 'ring-4 ring-yellow-500 z-10' : ''}
                                                `}
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
                                                    <span>{asig.Codigo_Asignatura}</span>
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
        </Layout>
    );
}
