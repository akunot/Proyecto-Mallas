import { Head, Link } from '@inertiajs/react';
import React, { useCallback, useMemo, useState } from 'react';

// --- Interfaces (adaptadas / copiadas desde Mallas/Visualizer.tsx) ---
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
    // Campos adicionales (no presentes en Visualizer.tsx) necesarios para
    // calcular en el frontend el resumen de créditos por componente.
    Creditos_Requeridos?: number | null;
    Es_Obligatoria?: boolean | number;
}

type GridItem =
    | (Asignatura & { isSlot: false; ID_Componente: number })
    | (Slot      & { isSlot: true;  ID_Componente: number });

// --- Resumen de créditos por agrupación/componente (calculado en el frontend) ---
interface ResumenAgrupacionRow {
    Nombre_Agrupacion: string;
    Creditos_Requeridos: number | null;
    Total_Creditos: number;
    Total_Horas_P: number;
    Total_Horas_E: number;
    Es_Obligatoria: boolean;
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

interface MallaData {
    ID_Malla: number;
    Codigo_Plan?: string | null;
    programa: {
        Nombre_Programa: string;
        ID_Programa: number;
    };
    normativa?: NormativaInfo | null;
    agrupaciones: Agrupacion[];
}

interface Props {
    disponible: boolean;
    programa: ProgramaInfo;
    malla?: MallaData;
}

// --- Config Visual ---
const COMPONENT_STYLES: Record<number, { border: string, bg: string, text: string, dot: string }> = {
    1: { border: 'border-l-[#f9a825]', bg: 'bg-[#fff8e1]', text: 'text-[#f9a825]', dot: 'bg-[#f9a825]' }, // Fundamentación
    2: { border: 'border-l-[#8bc34a]', bg: 'bg-[#f1f8e9]', text: 'text-[#8bc34a]', dot: 'bg-[#8bc34a]' }, // Disciplinar
    3: { border: 'border-l-[#4fc3f7]', bg: 'bg-[#e1f5fe]', text: 'text-[#4fc3f7]', dot: 'bg-[#4fc3f7]' }, // Libre Elección
    4: { border: 'border-l-[#f06292]', bg: 'bg-[#fce4ec]', text: 'text-[#f06292]', dot: 'bg-[#f06292]' }, // Idiomas
};

const getComponentColor = (id: number) => COMPONENT_STYLES[id] || { border: 'border-l-gray-400', bg: 'bg-gray-100', text: 'text-gray-400', dot: 'bg-gray-400' };

const ROMAN: Record<number, string> = {
    1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V',
    6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X',
    11: 'XI', 12: 'XII', 13: 'XIII', 14: 'XIV', 15: 'XV',
    16: 'XVI', 17: 'XVII', 18: 'XVIII', 19: 'XIX', 20: 'XX',
};

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

export default function DetallePublico({ disponible, programa, malla }: Props) {
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

    // Panel de componentes (Fundamentación, Disciplinar, etc.)
    const [activeComponentPanel, setActiveComponentPanel] = useState<number | null>(null);

    // Acordeones de información
    const [openAccordion, setOpenAccordion] = useState<string | null>(null);

    // Modal de guía visual
    const [showGuideModal, setShowGuideModal] = useState(false);

    const fetchElectivas = async () => {
        setLoadingElectivas(true);
        setErrorElectivas(false);
        setElectivas([]);
        setSearchElectivas('');

        try {
            const res = await fetch(`/api/v1/public/electivas`, {
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
            const res = await fetch(`/api/v1/public/mallas/${malla?.ID_Malla}/optativas`, {
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

    // --- Construir grid de semestres a partir de malla.agrupaciones ---
    // (idéntico a buildGrid en Mallas/Visualizer.tsx, pero sin drag & drop)
    const buildGrid = useCallback((src?: MallaData): Record<number, GridItem[]> => {
        const g: Record<number, GridItem[]> = {};

        if (!src) {
            return g;
        }

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

    const [semestres] = useState<Record<number, GridItem[]>>(() => buildGrid(malla));

    // --- Materia seleccionada (buscada dentro de malla.agrupaciones, igual que Visualizer.tsx) ---
    const selectedAsigData = useMemo(() => {
        if (!selectedAsig || !malla) {
return null;
}

        for (const agrup of malla.agrupaciones) {
            const found = agrup.asignaturas.find(a => a.ID_Asignatura === selectedAsig);

            if (found) {
return found;
}
        }

        return null;
    }, [selectedAsig, malla]);

    // --- Lógica de Highlighter para prerrequisitos ---
    const activeRelations = useMemo(() => {
        const pre = new Set<number>();
        const co = new Set<number>();

        (selectedAsigData?.requisitos || []).forEach(r => {
            if (r.ID_Asignatura_Requerida) {
                const tipo = (r.Tipo_Requisito || '').toLowerCase();

                if (tipo.includes('pre') || tipo.includes('obligatorio') || tipo === 'opcional') {
pre.add(r.ID_Asignatura_Requerida);
} else if (tipo.includes('co')) {
co.add(r.ID_Asignatura_Requerida);
}
            }
        });

        return { pre, co };
    }, [selectedAsigData]);

    // --- Resumen de créditos por componente, calculado en el frontend a partir de malla.agrupaciones ---
    const creditosPorComponente = useMemo(() => {
        const map: Record<string, { agrupaciones: ResumenAgrupacionRow[]; totalOblig: number; totalOpt: number; total: number }> = {};

        if (!malla) {
            return map;
        }

        malla.agrupaciones.forEach(agrup => {
            const totalCreditos = agrup.asignaturas.reduce((sum, a) => sum + (a.Creditos_Asignatura || 0), 0);
            const totalHorasP = agrup.asignaturas.reduce((sum, a) => sum + (a.Horas_Presencial || 0), 0);
            const totalHorasE = agrup.asignaturas.reduce((sum, a) => sum + (a.Horas_Estudiante || 0), 0);
            const comp = agrup.componente?.Nombre_Componente || 'Otros';
            const esObligatoria = !!agrup.Es_Obligatoria;

            if (!map[comp]) {
map[comp] = { agrupaciones: [], totalOblig: 0, totalOpt: 0, total: 0 };
}

            map[comp].agrupaciones.push({
                Nombre_Agrupacion: agrup.Nombre_Agrupacion,
                Creditos_Requeridos: agrup.Creditos_Requeridos ?? null,
                Total_Creditos: totalCreditos,
                Total_Horas_P: totalHorasP,
                Total_Horas_E: totalHorasE,
                Es_Obligatoria: esObligatoria,
            });

            if (esObligatoria) {
map[comp].totalOblig += totalCreditos;
} else {
map[comp].totalOpt += totalCreditos;
}

            map[comp].total += totalCreditos;
        });

        return map;
    }, [malla]);

    const numSemestres = programa.Duracion_Semestres ?? 10;
    const listaSemestres = useMemo(() => Array.from({ length: numSemestres }, (_, i) => i + 1), [numSemestres]);

    // Máximo de items en cualquier semestre → determina el alto de las cards
    const maxItemsPerSemestre = useMemo(() => {
        let max = 1;
        listaSemestres.forEach(num => {
            const count = (semestres[num] || []).length;

            if (count > max) {
max = count;
}
        });

        return max;
    }, [semestres, listaSemestres]);

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

    // Datos estáticos de cada componente de formación
    const COMPONENT_INFO: Record<number, { nombre: string; descripcion: string; nota: string }> = {
        1: {
            nombre: 'Fundamentación',
            descripcion: 'Este componente introduce y contextualiza el campo de conocimiento por el que optó el estudiante desde una perspectiva de ciudadanía, humanística, ambiental y cultural. Identifica las relaciones generales que caracterizan los saberes de las distintas disciplinas y profesiones del área, el contexto nacional e internacional de su desarrollo, el contexto institucional y los requisitos indispensables para su formación integral.',
            nota: 'Tomado de ACUERDO 033 DEL CSU "Por el cual se establecen los lineamientos básicos para el proceso de formación de los estudiantes de la Universidad Nacional de Colombia a través de sus programas curriculares"',
        },
        2: {
            nombre: 'Disciplinar o Profesional',
            descripcion: 'Este componente suministra al estudiante la gramática básica de su profesión o disciplina, las teorías, métodos y prácticas fundamentales, cuyo ejercicio formativo, investigativo y de extensión le permitirá integrarse con una comunidad profesional o disciplinar determinada. El Trabajo de Grado en cualquier modalidad hará parte de este componente.',
            nota: 'Tomado de ACUERDO 033 DEL CSU "Por el cual se establecen los lineamientos básicos para el proceso de formación de los estudiantes de la Universidad Nacional de Colombia a través de sus programas curriculares"',
        },
        3: {
            nombre: 'Libre Elección',
            descripcion: 'Este componente permite al estudiante aproximarse, contextualizar y/o profundizar temas de su profesión o disciplina y apropiar herramientas y conocimientos de distintos saberes tendientes a la diversificación, flexibilidad e interdisciplinariedad. Es objetivo de este componente acercar a los estudiantes a las tareas de investigación, extensión, emprendimiento y toma de conciencia de las implicaciones sociales de la generación de conocimiento.',
            nota: 'Tomado de ACUERDO 033 DEL CSU "Por el cual se establecen los lineamientos básicos para el proceso de formación de los estudiantes de la Universidad Nacional de Colombia a través de sus programas curriculares"',
        },
        4: {
            nombre: 'Lengua Extranjera',
            descripcion: 'Todo estudiante deberá tener formación en una de las lenguas extranjeras ofrecidas por las sedes de la Universidad Nacional de Colombia de acuerdo con las necesidades académicas propias de los programas curriculares. Los programas curriculares de pregrado deben incluir en los cuatro primeros semestres de la carrera los niveles de lengua extranjera, correspondientes a los doce (12) créditos que serán adicionales a los estipulados para el programa curricular.',
            nota: 'Tomado de ACUERDO 033 DEL CSU "Por el cual se establecen los lineamientos básicos para el proceso de formación de los estudiantes de la Universidad Nacional de Colombia a través de sus programas curriculares"',
        },
    };

    return (
        <div className="h-screen flex flex-col bg-[#f1f5f9] overflow-y-auto font-sans selection:bg-blue-100">
            <Head title={`${programa.Nombre_Programa} - Malla Curricular`} />

            {/* 1. HEADER DASHBOARD - Información General */}
            {/* UX: jerarquía clara (volver → identidad del programa → métricas → CTA),
                texto mínimo de 11px para legibilidad real, foco visible para teclado. */}
            <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3 shrink-0 shadow-sm z-50">
                <div className="flex flex-wrap items-center justify-between gap-3 max-w-[1800px] mx-auto">
                    <div className="flex items-center gap-4 min-w-0">
                        <Link
                            href="/"
                            aria-label="Volver al inicio"
                            title="Volver al inicio"
                            className="w-10 h-10 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-[#00236f] hover:text-white focus-visible:ring-2 focus-visible:ring-[#00236f] focus-visible:ring-offset-2 transition-all"
                        >
                            <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
                        </Link>
                        <div className="min-w-0">
                            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight truncate">
                                {programa.Nombre_Programa}
                            </h1>
                            <p className="text-[11px] font-semibold text-blue-700 mt-0.5 truncate">
                                {programa.Facultad}
                                <span className="mx-1.5 text-blue-300">•</span>
                                Plan {malla?.Codigo_Plan || '—'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex divide-x divide-slate-200 bg-slate-100 rounded-xl border border-slate-200" role="group" aria-label="Resumen del programa">
                            <div className="px-4 py-1.5 text-center">
                                <span className="block text-[10px] font-bold text-slate-500 uppercase">Créditos</span>
                                <span className="text-sm font-black text-[#00236f]">{programa.Creditos_Totales}</span>
                            </div>
                            <div className="px-4 py-1.5 text-center">
                                <span className="block text-[10px] font-bold text-slate-500 uppercase">Duración</span>
                                <span className="text-sm font-black text-[#00236f]">{programa.Duracion_Semestres} Sem</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* 2. SEMESTER CANVAS - Sin scroll, todo visible */}
            <main className="flex-1 overflow-y-auto p-4" style={{ '--n-sem': numSemestres, '--n-rows': maxItemsPerSemestre } as React.CSSProperties}>
                <div className="h-full grid gap-3" style={{ gridTemplateColumns: `repeat(${numSemestres}, minmax(0, 1fr))` }}>
                    {listaSemestres.map(num => {
                        return (
                            <div key={num} className="flex flex-col h-full min-w-0">
                                <div className="flex items-center justify-between mb-1.5 px-1 shrink-0">
                                    <div className="flex items-center gap-1">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[1px] truncate">Semestre</span>
                                    </div>
                                    <span className="text-lg font-black text-slate-200 italic leading-none">{ROMAN[num]}</span>
                                </div>

                                <div className="flex-1 grid gap-1.5 min-h-0" style={{ gridTemplateRows: `repeat(${maxItemsPerSemestre}, minmax(0, 1fr))` }}>
                                    {(semestres[num] || []).map((item) => {
                                        // SLOT
                                        if (item.isSlot) {
                                            const slot = item as Slot & { isSlot: true; ID_Componente: number };
                                            const isLibre = slot.Tipo_Slot === 'libre';
                                            const isOptativa = slot.Tipo_Slot === 'optativa';

                                            return (
                                                <div
                                                    key={`slot-${slot.ID_Slot}`}
                                                    className={`border-2 border-dashed rounded-xl h-full flex flex-col items-center justify-center p-2 text-center transition-all duration-200 cursor-pointer
                                                        ${isLibre
                                                            ? 'border-blue-300 bg-blue-50/60 text-blue-700 hover:bg-blue-100 hover:border-blue-500'
                                                            : isOptativa
                                                                ? 'border-orange-300 bg-orange-50/60 text-orange-700 hover:bg-orange-100 hover:border-orange-500'
                                                                : 'border-yellow-300 bg-yellow-50/60 text-yellow-700 hover:bg-yellow-100 hover:border-yellow-500'
                                                        }`}
                                                    onClick={
                                                        isLibre ? () => {
 setShowElectivasModal(true); fetchElectivas(); 
} :
                                                        isOptativa ? () => {
 setShowOptativasModal(true); fetchOptativas(); 
} :
                                                        undefined
                                                    }
                                                >
                                                    <span className="material-symbols-outlined !text-base mb-0.5 opacity-60">add_circle</span>
                                                    <span className="text-[9px] font-black uppercase leading-tight">
                                                        {isLibre ? 'Libre Elección' : isOptativa ? 'Optativa' : 'Nivelatorio'}
                                                    </span>
                                                    {slot.Nombre_Agrupacion && (
                                                        <span className="mt-0.5 text-[8px] font-medium opacity-70 line-clamp-2">{slot.Nombre_Agrupacion}</span>
                                                    )}
                                                </div>
                                            );
                                        }

                                        // ASIGNATURA
                                        const asig = item as Asignatura & { isSlot: false; ID_Componente: number };
                                        const isSelected = selectedAsig === asig.ID_Asignatura;
                                        const isPre = activeRelations.pre.has(asig.ID_Asignatura);
                                        const isCo = activeRelations.co.has(asig.ID_Asignatura);
                                        const isDimmed = selectedAsig !== null && !isSelected && !isPre && !isCo;
                                        const style = getComponentColor(asig.ID_Componente || 0);
                                        const oblig = asig.pivot.Tipo_Asignatura.toUpperCase().includes('OBLI');

                                        return (
                                            <div
                                                key={asig.ID_Asignatura}
                                                role="button"
                                                tabIndex={0}
                                                aria-pressed={isSelected}
                                                aria-label={`${asig.Nombre_Asignatura}, ${asig.Creditos_Asignatura} créditos${oblig ? ', obligatoria' : ', optativa'}`}
                                                onClick={() => setSelectedAsig(isSelected ? null : asig.ID_Asignatura)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        setSelectedAsig(isSelected ? null : asig.ID_Asignatura);
                                                    }
                                                }}
                                                className={`
                                                    group relative bg-white border-l-[5px] rounded-xl shadow-sm cursor-pointer transition-all duration-300 h-full
                                                    ${style.border} flex flex-col justify-between overflow-hidden
                                                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1
                                                    ${isSelected ? 'ring-2 ring-blue-600 z-30 shadow-xl' : 'hover:shadow-md hover:-translate-y-0.5'}
                                                    ${isPre ? 'ring-2 ring-rose-500 bg-rose-50 z-20' : ''}
                                                    ${isCo ? 'ring-2 ring-amber-400 bg-amber-50 z-20' : ''}
                                                    ${isDimmed ? 'opacity-30 grayscale-[0.8]' : 'opacity-100'}
                                                `}
                                            >
                                                {/* Métricas Top */}
                                                <div className={`${style.bg} flex justify-around py-0.5 text-[9px] font-black text-slate-600 border-b border-white/50 shrink-0`}>
                                                    <span>{asig.Creditos_Asignatura} CR</span>
                                                    <span>{asig.Horas_Presencial} HP</span>
                                                    <span>{asig.Horas_Estudiante} HE</span>
                                                </div>

                                                {/* Nombre Central */}
                                                <div className="flex-1 flex items-center justify-center px-2 py-1 text-center min-h-0">
                                                    <h4 className="text-[11px] font-bold text-slate-800 leading-tight line-clamp-3">
                                                        {asig.Nombre_Asignatura}
                                                    </h4>
                                                </div>

                                                {/* Footer Info: código + un único indicador de requisitos (evita saturación de íconos) */}
                                                <div className="px-2 py-1 flex items-center justify-between bg-slate-50/50 shrink-0">
                                                    <span className="text-[9px] font-mono font-bold text-slate-500 truncate">{asig.Codigo_Asignatura}</span>
                                                    <div className="flex items-center gap-1">
                                                        {(() => {
                                                            const hasPre = asig.requisitos?.some(r => {
                                                                const t = (r.Tipo_Requisito || '').toLowerCase();

                                                                return t.includes('pre') || t.includes('obligatorio') || t === 'opcional';
                                                            });
                                                            const hasCo = asig.requisitos?.some(r => (r.Tipo_Requisito || '').toLowerCase().includes('co'));
                                                            const hasCr = asig.requisitos?.some(r => (r.Tipo_Requisito || '').toLowerCase().includes('credito'));
                                                            const reqCount = asig.requisitos?.length ?? 0;

                                                            if (reqCount === 0) {
return null;
}

                                                            const label = hasPre ? 'Tiene prerrequisitos' : hasCo ? 'Tiene correquisitos' : 'Tiene requisito de créditos';
                                                            const dotColor = hasPre ? 'bg-rose-500' : hasCo ? 'bg-amber-400' : 'bg-blue-400';

                                                            return (
                                                                <span
                                                                    title={label}
                                                                    aria-label={label}
                                                                    className={`inline-flex items-center gap-0.5 ${dotColor} text-white rounded-full px-1.5 h-4 text-[9px] font-bold ring-2 ring-white`}
                                                                >
                                                                    {reqCount}
                                                                </span>
                                                            );
                                                        })()}
                                                        <span className={`material-symbols-outlined !text-sm ${oblig ? 'text-rose-500' : 'text-blue-500'}`} aria-hidden="true">
                                                            {oblig ? 'verified' : 'stars'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* 3. SIDE INFO DRAWER - Detalles de Materia Seleccionada */}
            {/* UX: en mobile se comporta como bottom-sheet a ancho completo; en desktop, panel flotante.
                Se agrega backdrop para que el cierre por clic-afuera sea consistente con los modales. */}
            {selectedAsig && selectedAsigData && (
                <>
                    <div
                        className="fixed inset-0 z-[99] bg-black/20 sm:bg-transparent"
                        onClick={() => setSelectedAsig(null)}
                        aria-hidden="true"
                    />
                    <div
                        role="dialog"
                        aria-label={`Detalle de ${selectedAsigData.Nombre_Asignatura}`}
                        className="fixed inset-x-0 bottom-0 sm:inset-x-auto sm:right-8 sm:bottom-8 w-full sm:w-80 max-h-[80vh] sm:max-h-[calc(100vh-4rem)] overflow-y-auto bg-white rounded-t-[2rem] sm:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-200 z-[100] animate-in slide-in-from-bottom sm:slide-in-from-right duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                    <div className="p-6 bg-[#00236f] text-white">
                        <div className="flex justify-between items-start mb-4">
                            <span className="px-2 py-0.5 bg-white/10 rounded text-[9px] font-black uppercase tracking-widest border border-white/20">Expediente Académico</span>
                            <button onClick={() => setSelectedAsig(null)} aria-label="Cerrar detalle" className="text-white/60 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60 rounded transition-colors">
                                <span className="material-symbols-outlined" aria-hidden="true">close</span>
                            </button>
                        </div>
                        <h3 className="text-lg font-black leading-tight">{selectedAsigData.Nombre_Asignatura}</h3>
                        <p className="text-xs text-blue-200 mt-1 font-mono tracking-widest">#{selectedAsigData.Codigo_Asignatura}</p>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                <span className="text-[9px] font-black text-slate-400 uppercase block mb-1 tracking-tighter">Horas Directas</span>
                                <span className="text-lg font-black text-slate-800">{selectedAsigData.Horas_Presencial}h <small className="text-[10px] font-medium text-slate-400">/sem</small></span>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                <span className="text-[9px] font-black text-slate-400 uppercase block mb-1 tracking-tighter">Trabajo Auto.</span>
                                <span className="text-lg font-black text-slate-800">{selectedAsigData.Horas_Estudiante}h <small className="text-[10px] font-medium text-slate-400">/sem</small></span>
                            </div>
                        </div>

                        <div>
                            <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <span className="w-4 h-[1px] bg-slate-200" /> Prerrequisitos de área
                            </h5>
                            {selectedAsigData.requisitos && selectedAsigData.requisitos.length > 0 ? (
                                <ul className="space-y-2">
                                    {selectedAsigData.requisitos.map((r, i) => {
                                        const t = (r.Tipo_Requisito ?? '').toLowerCase();
                                        const isPre = t.includes('pre') || t.includes('obligatorio') || t === 'opcional';

                                        return (
                                            <li key={i} className={`flex items-start gap-2 p-3 border rounded-xl text-xs font-bold ${isPre ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                                                <span className="material-symbols-outlined !text-sm">{isPre ? 'lock' : 'sync_alt'}</span>
                                                {r.asignatura_requerida
                                                    ? `${r.asignatura_requerida.Nombre_Asignatura} (${r.asignatura_requerida.Codigo_Asignatura})`
                                                    : r.Descripcion_Requisito || (r.Valor_Creditos ? `${r.Valor_Creditos} créditos` : '—')
                                                }
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <p className="text-xs italic text-slate-400 text-center py-4">Materia de libre acceso sin prerrequisitos.</p>
                            )}
                        </div>
                    </div>
                    </div>
                </>
            )}

            {/* 4. FOOTER LEGEND + GUÍA + PANEL DE COMPONENTE */}
            {/* UX: el contenedor relativo permite que el panel deslizable se ancle con
                "bottom-full" en lugar de un valor fijo en píxeles (bottom-[52px]),
                evitando que se desalinee si el footer cambia de alto (p. ej. al envolver en mobile). */}
            <div className="relative shrink-0 z-10">
                {/* PANEL DESLIZABLE DE COMPONENTE */}
                {activeComponentPanel && (() => {
                    const id = activeComponentPanel;
                    const info = COMPONENT_INFO[id];
                    const style = COMPONENT_STYLES[id];
                    const compName = info?.nombre || '';
                    const compData = Object.entries(creditosPorComponente).find(([k]) =>
                        k.toLowerCase().includes(compName.split(' ')[0].toLowerCase())
                    );
                    const rows = compData?.[1]?.agrupaciones ?? [];
                    const totalOblig = compData?.[1]?.totalOblig ?? 0;
                    const totalOpt = compData?.[1]?.totalOpt ?? 0;
                    const total = compData?.[1]?.total ?? 0;
                    const creditosReq = rows[0]?.Creditos_Requeridos ?? total;

                    return (
                        <div className="absolute bottom-full left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] animate-in slide-in-from-bottom duration-300 max-h-[60vh] overflow-y-auto">
                            <div className="max-w-5xl mx-auto px-5 sm:px-8 py-5">
                                <div className="flex flex-col sm:flex-row items-start justify-between gap-5">
                                    <div className="flex-1 min-w-0 order-1">
                                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                                            <span className={`w-3 h-3 rounded-full ${style.dot} shrink-0`} />
                                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{info?.nombre}</h3>
                                            {creditosReq > 0 && (
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${style.bg} ${style.text}`}>
                                                    {creditosReq} créditos requeridos
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{info?.descripcion}</p>
                                        {info?.nota && (
                                            <p className="text-[10px] text-slate-400 italic mt-1 line-clamp-1">Nota: {info.nota}</p>
                                        )}
                                    </div>
                                    {rows.length > 0 && (
                                        <div className="order-2 w-full sm:w-[400px] sm:shrink-0">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="border-b border-slate-100">
                                                        <th className="text-left pb-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Agrupación</th>
                                                        <th className="text-center pb-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Oblig.</th>
                                                        <th className="text-center pb-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Optat.</th>
                                                        <th className="text-center pb-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {rows.map((r, i) => (
                                                        <tr key={i} className="border-b border-slate-50">
                                                            <td className="py-1 pr-2 font-medium text-slate-700 text-[11px]">{r.Nombre_Agrupacion}</td>
                                                            <td className="py-1 text-center text-slate-600">{r.Es_Obligatoria ? r.Total_Creditos : 0}</td>
                                                            <td className="py-1 text-center text-slate-600">{!r.Es_Obligatoria ? r.Total_Creditos : 0}</td>
                                                            <td className={`py-1 text-center font-black ${style.text}`}>{r.Total_Creditos}</td>
                                                        </tr>
                                                    ))}
                                                    <tr className={`${style.bg}`}>
                                                        <td className="py-1 pr-2 font-black text-slate-800 text-[11px]">Total</td>
                                                        <td className="py-1 text-center font-black text-slate-800">{totalOblig}</td>
                                                        <td className="py-1 text-center font-black text-slate-800">{totalOpt}</td>
                                                        <td className={`py-1 text-center font-black ${style.text}`}>{total}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setActiveComponentPanel(null)}
                                        aria-label="Cerrar panel de componente"
                                        className="order-3 sm:order-3 shrink-0 w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-slate-400 transition-all mt-0.5 self-end sm:self-start"
                                    >
                                        <span className="material-symbols-outlined !text-sm" aria-hidden="true">close</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                <footer className="bg-white border-t border-slate-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                        {([
                            { id: 1, label: 'Fundamentación' },
                            { id: 2, label: 'Disciplinar' },
                            { id: 3, label: 'Libre Elección' },
                            { id: 4, label: 'Idiomas' },
                        ] as const).map(({ id, label }) => {
                            const style = COMPONENT_STYLES[id];
                            const isActive = activeComponentPanel === id;

                            return (
                                <button
                                    key={id}
                                    onClick={() => setActiveComponentPanel(isActive ? null : id)}
                                    aria-pressed={isActive}
                                    aria-label={`Ver información de ${label}`}
                                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-300 ${isActive ? 'ring-1 ring-slate-300 bg-slate-50' : ''}`}
                                >
                                    <span className={`w-2.5 h-2.5 rounded-full ${style.dot} shrink-0`} aria-hidden="true" />
                                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight whitespace-nowrap">{label}</span>
                                    <span className="material-symbols-outlined !text-xs text-slate-300" aria-hidden="true">info</span>
                                </button>
                            );
                        })}
                        <div className="w-px h-4 bg-slate-200 hidden sm:block" />
                        <button
                            onClick={() => setShowGuideModal(true)}
                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-bold text-[#00236f] uppercase tracking-tight hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-200 transition-all whitespace-nowrap"
                        >
                            <span className="material-symbols-outlined !text-xs" aria-hidden="true">help_outline</span>
                            ¿Cómo leer la malla?
                        </button>
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                        SIA • UNAL — 2026
                    </div>
                </footer>
            </div>

            {/* MODAL: ¿Cómo leer la malla? */}
            {showGuideModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4" onClick={() => setShowGuideModal(false)}>
                    <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                            <div>
                                <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">¿Cómo leer la malla curricular?</h2>
                                <p className="text-xs text-slate-500 mt-0.5">{programa.Nombre_Programa}</p>
                            </div>
                            <button onClick={() => setShowGuideModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-all">
                                <span className="material-symbols-outlined !text-sm">close</span>
                            </button>
                        </div>
                        <div className="overflow-y-auto max-h-[75vh]">
                            {/* Ejemplo visual de card */}
                            <div className="px-8 pt-6 pb-5 bg-slate-50 border-b border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Ejemplo de tarjeta de asignatura</p>
                                <div className="flex gap-8 items-start">
                                    <div className="w-44 shrink-0 bg-white border-l-[5px] border-l-[#8bc34a] rounded-xl shadow-md overflow-hidden">
                                        <div className="bg-[#f1f8e9] flex justify-around py-1 text-[8px] font-black text-slate-500 border-b border-white/50">
                                            <span>3 CR</span><span>4 HP</span><span>5 HE</span>
                                        </div>
<div className="flex items-center justify-center px-3 py-3 text-center h-14">
                                        <h4 className="text-[10px] font-bold text-slate-800 leading-tight">Bases de Datos I</h4>
                                    </div>
                                        <div className="px-2 py-1 flex items-center justify-between bg-slate-50/50">
                                            <span className="text-[8px] font-mono font-bold text-slate-400">4100552</span>
                                            <div className="flex items-center gap-1">
                                                <div className="w-3.5 h-3.5 bg-rose-500 rounded-full flex items-center justify-center ring-2 ring-white">
                                                    <span className="text-[7px] text-white font-bold">P</span>
                                                </div>
                                                <span className="material-symbols-outlined !text-sm text-rose-500">verified</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-3 text-xs text-slate-700">
                                        <div className="flex items-start gap-2.5">
                                            <div className="w-5 h-5 rounded bg-[#f1f8e9] border-l-4 border-[#8bc34a] shrink-0 mt-0.5" />
                                            <p><span className="font-bold">Barra de color + fondo</span> — indica el <span className="font-bold">componente de formación</span>. Haz clic en los botones del footer para ver la descripción de cada componente y su tabla de créditos.</p>
                                        </div>
                                        <div className="flex items-start gap-2.5">
                                            <span className="text-[9px] font-black bg-slate-100 rounded px-1.5 py-0.5 shrink-0 mt-0.5 whitespace-nowrap">3 CR / 4 HP / 5 HE</span>
                                            <p><span className="font-bold">CR</span> = créditos · <span className="font-bold">HP</span> = horas presenciales/semana · <span className="font-bold">HE</span> = horas de trabajo autónomo/semana.</p>
                                        </div>
                                        <div className="flex items-start gap-2.5">
                                            <span className="material-symbols-outlined !text-sm text-rose-500 shrink-0">verified</span>
                                            <p><span className="font-bold text-rose-600">Birrete rojo</span> = materia obligatoria · <span className="font-bold text-blue-500">Estrella azul</span> = materia optativa.</p>
                                        </div>
                                        <div className="flex items-start gap-2.5">
                                            <div className="flex gap-1 shrink-0 mt-0.5">
                                                <div className="w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center"><span className="text-[7px] text-white font-bold">P</span></div>
                                                <div className="w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center"><span className="text-[7px] text-white font-bold">C</span></div>
                                            </div>
                                            <p>Punto <span className="font-bold text-rose-600">P</span> = tiene prerrequisitos · Punto <span className="font-bold text-amber-500">C</span> = tiene correquisitos. <span className="font-bold">Haz clic en la tarjeta</span> para resaltarlos en toda la malla.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Acordeones */}
                            <div className="divide-y divide-slate-100">
                                {([
                                    { key: 'plan', title: 'Plan de Estudios', content: 'Un plan de estudios es un conjunto de actividades académicas, organizadas mediante asignaturas reunidas en componentes de formación que un estudiante debe cursar para alcanzar los propósitos de formación de un programa curricular. Tomado del Acuerdo 033 del CSU.' },
                                    { key: 'malla', title: '¿Qué es una Malla Curricular?', content: 'La malla curricular es una propuesta de visualización de un plan de estudios donde se sugiere la inscripción de asignaturas por periodo académico diferenciándolas por componente de formación. Contiene información de prerrequisitos y correquisitos de cada asignatura y se puede conocer su código, número de créditos, intensidad horaria, horas de trabajo semanal fuera de clase y su respectivo contenido.' },
                                    { key: 'uso', title: '¿Para qué sirve?', content: 'Las asignaturas se encuentran agrupadas en componentes de formación diferenciados por color. Al seleccionar cada asignatura se resaltan los prerrequisitos o correquisitos necesarios para cursarla. En los campos de Optativas o Libre Elección se listan las asignaturas ofertadas. Haz clic en los botones del footer para explorar la descripción y tabla de créditos de cada componente.' },
                                    { key: 'contacto', title: 'Información y contacto', content: `Si tienes inquietudes sobre este plan de estudios, puedes comunicarte con la Dirección del Programa Curricular de ${programa.Nombre_Programa} a través de los canales institucionales de la ${programa.Facultad}.` },
                                ]).map(({ key, title, content }) => (
                                    <div key={key}>
                                        <button
                                            className="w-full flex items-center justify-between px-8 py-4 text-left hover:bg-slate-50 transition-colors"
                                            onClick={() => setOpenAccordion(openAccordion === key ? null : key)}
                                        >
                                            <span className="text-sm font-black text-slate-800">{title}</span>
                                            <span className={`material-symbols-outlined !text-base text-slate-400 transition-transform duration-200 ${openAccordion === key ? 'rotate-180' : ''}`}>expand_more</span>
                                        </button>
                                        {openAccordion === key && (
                                            <div className="px-8 pb-5">
                                                <p className="text-sm text-slate-600 leading-relaxed">{content}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4">
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
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4">
                        <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl flex flex-col max-h-[85vh]">
                            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
                                <div>
                                    <h2 className="text-base font-semibold text-gray-900">Catálogo de Optativas</h2>
                                    <p className="text-xs text-gray-500 mt-0.5">{programa.Nombre_Programa}</p>
                                </div>
                                <button onClick={() => {
 setShowOptativasModal(false); 
}} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
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
                                <button onClick={() => {
 setShowOptativasModal(false); 
}} className="ml-auto rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Cerrar</button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            `}</style>
        </div>
    );
}