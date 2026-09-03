import { Head, Link } from '@inertiajs/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MallaDiffView, {
    type DiffResponse,
    type CambioItem,
    type CambioModificado,
} from '../../components/MallaDiffView';
import InstitutionalFooter from '../../components/InstitutionalFooter';
import InstitutionalHeader from '../../components/InstitutionalHeader';
import MallaHistoryModal from '../../components/MallaHistoryModal';
import SlotSelectorModal from '../../components/SlotSelectorModal';
import VersionBadge from '../../components/VersionBadge';

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
        Semestre_Sugerido: number | null;
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
    | (Slot & { isSlot: true; ID_Componente: number });

// --- Resumen de créditos por agrupación/componente (calculado en el frontend) ---
interface ResumenAgrupacionRow {
    Nombre_Agrupacion: string;
    /** Creditos declarados en la normativa del plan para esta agrupacion */
    Creditos_Requeridos: number | null;
    /** Creditos de asignaturas con Semestre_Sugerido definido (aparecen en el grid) */
    creditosEnGrid: number;
    /** Creditos de asignaturas optativas sin semestre fijo (no aparecen en el grid) */
    creditosOptativos: number;
    Total_Creditos: number;
    Total_Horas_P: number;
    Total_Horas_E: number;
    Es_Obligatoria: boolean;
    /** true si la agrupación mezcla asignaturas obligatorias y optativas (por pivot.Tipo_Asignatura) */
    Es_Mixta: boolean;
}

interface NormativaInfo {
    Tipo_Normativa: string;
    Numero_Normativa: string;
    Instancia: string;
    Anio_Normativa: number | null;
    Url_Normativa: string | null;
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

interface MallaVersion {
    ID_Malla: number;
    Version_Numero: number;
    Version_Etiqueta: string | null;
    Estado: string;
    Es_Vigente: number | null;
    Fecha_Vigencia: string;
    Fecha_Fin_Vigencia: string | null;
    created_at: string;
}

interface Props {
    disponible: boolean;
    programa: ProgramaInfo;
    malla?: MallaData;
}

// --- Config Visual ---
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

const getComponentColor = (id: number) =>
    COMPONENT_STYLES[id] || {
        border: 'border-l-gray-400',
        bg: 'bg-gray-100',
        text: 'text-gray-400',
        dot: 'bg-gray-400',
    };

const ROMAN: Record<number, string> = {
    1: 'I',
    2: 'II',
    3: 'III',
    4: 'IV',
    5: 'V',
    6: 'VI',
    7: 'VII',
    8: 'VIII',
    9: 'IX',
    10: 'X',
    11: 'XI',
    12: 'XII',
    13: 'XIII',
    14: 'XIV',
    15: 'XV',
    16: 'XVI',
    17: 'XVII',
    18: 'XVIII',
    19: 'XIX',
    20: 'XX',
};
const PLACEHOLDER_RE = /^(LIBRE|OPTATIVA|NIVELATORIO)\s*\d+$/i;

const getUniqueRequisitos = (requisitos: Requisito[] = []): Requisito[] => {
    const seen = new Set<string>();
    const unicos: Requisito[] = [];

    requisitos.forEach((r) => {
        const key = r.ID_Asignatura_Requerida
            ? `${r.ID_Asignatura_Requerida}|${r.Tipo_Requisito}`
            : `${r.Tipo_Requisito}|${r.Valor_Creditos ?? 0}|${r.Descripcion_Requisito ?? ''}`;

        if (!seen.has(key)) {
            seen.add(key);
            unicos.push(r);
        }
    });

    return unicos;
};

export default function DetallePublico({
    disponible,
    programa,
    malla: mallaProp,
}: Props) {
    const [selectedAsig, setSelectedAsig] = useState<number | null>(null);
    const [activeMalla, setActiveMalla] = useState<MallaData | undefined>(
        mallaProp,
    );
    const [currentVersionId, setCurrentVersionId] = useState<number | null>(
        mallaProp?.ID_Malla ?? null,
    );

    // --- Historial de versiones ---
    const [versiones, setVersiones] = useState<MallaVersion[]>([]);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedForDiff, setSelectedForDiff] = useState<Set<number>>(
        () => new Set<number>(),
    );
    const [showDiffModal, setShowDiffModal] = useState(false);
    const [diffData, setDiffData] = useState<DiffResponse | null>(null);
    const [loadingDiff, setLoadingDiff] = useState(false);
    const [historialRequisitos, setHistorialRequisitos] = useState<
        Array<{
            fecha: string;
            asignatura_afectada: {
                ID_Asignatura: number;
                Codigo_Asignatura: string;
                Nombre_Asignatura: string;
            } | null;
            tipo_cambio: string;
            resumen: string;
            normativa: {
                Tipo_Normativa: string;
                Numero_Normativa: string;
                Anio_Normativa: string;
            } | null;
        }>
    >([]);
    const [loadingVersion, setLoadingVersion] = useState(false);

    // Modal de Libre Elección
    const [showElectivasModal, setShowElectivasModal] = useState(false);
    const [electivas, setElectivas] = useState<Electiva[]>([]);
    const [loadingElectivas, setLoadingElectivas] = useState(false);
    const [errorElectivas, setErrorElectivas] = useState(false);

    // Modal de Optativas
    const [showOptativasModal, setShowOptativasModal] = useState(false);
    const [selectedOptativaSlot, setSelectedOptativaSlot] =
        useState<Slot | null>(null);
    const [optativas, setOptativas] = useState<OptativaGroup[]>([]);
    const [loadingOptativas, setLoadingOptativas] = useState(false);
    const [errorOptativas, setErrorOptativas] = useState(false);

    const flatOptativas = useMemo(
        () => optativas.flatMap((g) => g.asignaturas),
        [optativas],
    );
    const electivasErrorMsg = errorElectivas
        ? 'No se pudieron cargar las electivas. Intenta de nuevo.'
        : null;
    const optativasErrorMsg = errorOptativas
        ? 'No se pudieron cargar las optativas. Intenta de nuevo.'
        : null;

    // Panel de componentes (Fundamentación, Disciplinar, etc.)
    const [activeComponentPanel, setActiveComponentPanel] = useState<
        number | null
    >(null);

    // Acordeones de información
    const [openAccordion, setOpenAccordion] = useState<string | null>(null);

    // Modal de guía visual
    const [showGuideModal, setShowGuideModal] = useState(false);

    // --- Historial y comparación de versiones ---
    const fetchVersiones = async () => {
        try {
            const res = await fetch(
                `/api/v1/public/programas/${programa.ID_Programa}/historial`,
                {
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin',
                },
            );

            if (res.ok) {
                const data = await res.json();
                setVersiones(data.data ?? []);
            }
        } catch {
            // ignore
        }
    };

    const fetchHistorialRequisitos = async () => {
        try {
            const res = await fetch(
                `/api/v1/public/programas/${programa.ID_Programa}/historial-requisitos`,
                {
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin',
                },
            );

            if (res.ok) {
                const data = await res.json();
                setHistorialRequisitos(data.data ?? []);
            }
        } catch {
            // ignore
        }
    };

    useEffect(() => {
        if (activeMalla) {
            fetchVersiones();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSelectVersion = async (versionId: number) => {
        if (versionId === currentVersionId) {
            return;
        }

        setLoadingVersion(true);

        try {
            const res = await fetch(`/api/v1/public/mallas/${versionId}`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });

            if (res.ok) {
                const mallaData = await res.json();

                if (mallaData.ID_Malla) {
                    setActiveMalla(mallaData);
                    setCurrentVersionId(versionId);
                }
            }
        } catch {
            // ignore
        } finally {
            setLoadingVersion(false);
        }
    };

    const handleToggleDiffSelection = (id: number) => {
        setSelectedForDiff((prev) => {
            const next = new Set(prev);

            if (next.has(id)) {
                next.delete(id);
                return next;
            }

            if (next.size >= 2) {
                const first = next.values().next().value;
                if (first !== undefined) {
                    next.delete(first);
                }
            }

            next.add(id);
            return next;
        });
    };

    const handleCompare = async () => {
        if (selectedForDiff.size !== 2) {
            return;
        }

        setLoadingDiff(true);
        setShowDiffModal(true);
        setDiffData(null);
        setHistorialRequisitos([]);

        try {
            const [id1, id2] = Array.from(selectedForDiff);
            const [diffRes, historialRes] = await Promise.all([
                fetch(
                    `/api/v1/public/mallas/${id1}/diff/${id2}`,
                    {
                        headers: { Accept: 'application/json' },
                        credentials: 'same-origin',
                    },
                ),
                fetchHistorialRequisitos(),
            ]);

            if (diffRes.ok) {
                const data = await diffRes.json();
                setDiffData(data.data ?? null);
            }
        } catch {
            // ignore
        } finally {
            setLoadingDiff(false);
        }
    };

    const handleOpenHistory = () => {
        fetchVersiones();
        setSelectedForDiff(new Set<number>());
        setShowHistoryModal(true);
    };

    const fetchElectivas = async () => {
        setLoadingElectivas(true);
        setErrorElectivas(false);
        setElectivas([]);
        try {
            const res = await fetch(`/api/v1/public/electivas`, {
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

        setLoadingOptativas(true);
        setErrorOptativas(false);
        setOptativas([]);
        try {
            const url = `/api/v1/public/mallas/${activeMalla?.ID_Malla}/optativas${slot ? `?slot_id=${slot.ID_Slot}` : ''}`;
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

    // --- Construir grid de semestres a partir de malla.agrupaciones ---
    // (idéntico a buildGrid en Mallas/Visualizer.tsx, pero sin drag & drop)
    const buildGrid = useCallback(
        (src?: MallaData): Record<number, GridItem[]> => {
            const g: Record<number, GridItem[]> = {};

            if (!src) {
                return g;
            }

            src.agrupaciones.forEach((agrup) => {
                const placeholders: Asignatura[] = [];

                agrup.asignaturas.forEach((asig) => {
                    if (PLACEHOLDER_RE.test(asig.Codigo_Asignatura)) {
                        placeholders.push(asig);

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

                const slotsSource =
                    (agrup.slots || []).length > 0
                        ? agrup.slots
                        : placeholders.map((p) => {
                              const codigo = p.Codigo_Asignatura.toUpperCase();
                              let tipoSlot:
                                  | 'libre'
                                  | 'optativa'
                                  | 'nivelatorio' = 'libre';

                              if (codigo.includes('OPTATIVA')) {
                                  tipoSlot = 'optativa';
                              } else if (codigo.includes('NIVELATORIO')) {
                                  tipoSlot = 'nivelatorio';
                              }

                              return {
                                  ID_Slot: -p.ID_Asignatura,
                                  Nombre_Slot: p.Codigo_Asignatura,
                                  Tipo_Slot: tipoSlot,
                                  Semestre: p.pivot.Semestre_Sugerido,
                                  Orden: p.pivot.Orden ?? 999,
                                  Nombre_Agrupacion: agrup.Nombre_Agrupacion,
                              } as Slot;
                          });

                slotsSource.forEach((slot) => {
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

    const semestres = useMemo<Record<number, GridItem[]>>(
        () => buildGrid(activeMalla),
        [activeMalla, buildGrid],
    );

    // --- Materia seleccionada (buscada dentro de activeMalla.agrupaciones) ---
    const selectedAsigData = useMemo(() => {
        if (!selectedAsig || !activeMalla) {
            return null;
        }

        for (const agrup of activeMalla.agrupaciones) {
            const found = agrup.asignaturas.find(
                (a) => a.ID_Asignatura === selectedAsig,
            );

            if (found) {
                return found;
            }
        }

        return null;
    }, [selectedAsig, activeMalla]);

    const requisitosUnicos = useMemo(() => {
        return getUniqueRequisitos(selectedAsigData?.requisitos);
    }, [selectedAsigData]);

    // --- Lógica de Highlighter para prerrequisitos ---
    const activeRelations = useMemo(() => {
        const pre = new Set<number>();
        const co = new Set<number>();

        (selectedAsigData?.requisitos || []).forEach((r) => {
            if (r.ID_Asignatura_Requerida) {
                const tipo = (r.Tipo_Requisito || '').toLowerCase();

                if (
                    tipo.includes('pre') ||
                    tipo.includes('obligatorio') ||
                    tipo === 'opcional'
                ) {
                    pre.add(r.ID_Asignatura_Requerida);
                } else if (tipo.includes('co')) {
                    co.add(r.ID_Asignatura_Requerida);
                }
            }
        });

        return { pre, co };
    }, [selectedAsigData]);

    // --- Resumen de creditos por componente ---
    const creditosPorComponente = useMemo(() => {
        const map: Record<
            number,
            {
                agrupaciones: ResumenAgrupacionRow[];
                totalOblig: number;
                totalOpt: number;
                total: number;
                totalGrid: number;
                totalCreditosOptativos: number;
            }
        > = {};

        if (!activeMalla) {
            return map;
        }

        activeMalla.agrupaciones.forEach((agrup) => {
            const compId = agrup.ID_Componente || 0;

            // Fuente de verdad de "obligatoria vs optativa" SIEMPRE es pivot.Tipo_Asignatura
            // de cada asignatura (igual que en Mallas/Show.tsx), nunca el flag Es_Obligatoria
            // de la agrupación completa: una agrupación "obligatoria" puede contener
            // asignaturas optativas individuales (ver agrupación "Area de Comunicación").
            const esAsigOptativa = (a: Asignatura) =>
                (a.pivot?.Tipo_Asignatura || '').toLowerCase() === 'optativa';

            const esPlaceholder = (a: Asignatura) =>
                PLACEHOLDER_RE.test(a.Codigo_Asignatura);

            const asigReales = agrup.asignaturas.filter(
                (a) => !esPlaceholder(a),
            );

            const asigOblig = asigReales.filter((a) => !esAsigOptativa(a));
            const asigOpt = asigReales.filter((a) => esAsigOptativa(a));

            // Créditos que ocupan celda en el grid: asignaturas obligatorias con semestre fijo.
            // (Una optativa con semestre sugerido igual se considera "optativa" para el resumen,
            // aunque visualmente pueda ubicarse en el grid).
            const asigEnGrid = asigOblig.filter(
                (a) => a.pivot?.Semestre_Sugerido != null,
            );

            const creditosEnGrid = asigEnGrid.reduce(
                (s, a) => s + (a.Creditos_Asignatura || 0),
                0,
            );
            const creditosOptativos = asigOpt.reduce(
                (s, a) => s + (a.Creditos_Asignatura || 0),
                0,
            );
            const totalCreditos =
                creditosEnGrid +
                creditosOptativos +
                asigOblig
                    .filter((a) => a.pivot?.Semestre_Sugerido == null)
                    .reduce((s, a) => s + (a.Creditos_Asignatura || 0), 0);

            const totalHorasP = agrup.asignaturas.reduce(
                (s, a) => s + (a.Horas_Presencial || 0),
                0,
            );
            const totalHorasE = agrup.asignaturas.reduce(
                (s, a) => s + (a.Horas_Estudiante || 0),
                0,
            );

            // Creditos normativos declarados en el plan (Creditos_Requeridos de la agrupacion)
            const creditosReq = agrup.Creditos_Requeridos ?? totalCreditos;

            // Naturaleza de la agrupación para el badge: si mezcla asignaturas obligatorias
            // y optativas reales (por Tipo_Asignatura), es "mixta"; si no, sigue Es_Obligatoria.
            const esObligatoria = !!agrup.Es_Obligatoria;
            const esMixta = asigOblig.length > 0 && asigOpt.length > 0;

            if (!map[compId]) {
                map[compId] = {
                    agrupaciones: [],
                    totalOblig: 0,
                    totalOpt: 0,
                    total: 0,
                    totalGrid: 0,
                    totalCreditosOptativos: 0,
                };
            }

            const existeAgrupacion = map[compId].agrupaciones.some(
                (r) => r.Nombre_Agrupacion === agrup.Nombre_Agrupacion,
            );
            if (existeAgrupacion) return;

            map[compId].agrupaciones.push({
                Nombre_Agrupacion: agrup.Nombre_Agrupacion,
                Creditos_Requeridos: agrup.Creditos_Requeridos ?? null,
                creditosEnGrid,
                creditosOptativos,
                Total_Creditos: totalCreditos,
                Total_Horas_P: totalHorasP,
                Total_Horas_E: totalHorasE,
                Es_Obligatoria: esObligatoria,
                Es_Mixta: esMixta,
            });

            // El total del componente usa los creditos normativos (Creditos_Requeridos),
            // repartidos según si la agrupación tiene solo obligatorias, solo optativas, o mixta.
            // Para agrupaciones mixtas, Creditos_Requeridos es el normativo de TODA la
            // agrupación (obligatorias + optativas combinadas), así que la porción que va
            // a "oblig" es ese normativo MENOS la parte optativa, para no contar dos veces
            // los créditos optativos (antes: totalOblig += creditosReq completo Y
            // totalOpt += creditosOptativos por separado, duplicando el monto optativo).
            if (esMixta) {
                const obligPortion = Math.max(
                    creditosReq - creditosOptativos,
                    0,
                );
                map[compId].totalOblig += obligPortion;
                map[compId].totalOpt += creditosOptativos;
            } else if (esObligatoria) {
                map[compId].totalOblig += creditosReq;
            } else {
                map[compId].totalOpt += creditosReq;
            }

            map[compId].total += creditosReq;
            map[compId].totalGrid += creditosEnGrid;
            map[compId].totalCreditosOptativos += creditosOptativos;
        });

        return map;
    }, [activeMalla]);

    const numSemestres = programa.Duracion_Semestres ?? 10;

    // Mobile: carrusel de semestres
    const semestreCarouselRef = useRef<HTMLDivElement>(null);
    const [activeSemestre, setActiveSemestre] = useState(1);

    const handleCarouselScroll = useCallback(() => {
        if (semestreCarouselRef.current) {
            const container = semestreCarouselRef.current;
            const cardWidth = container.clientWidth;
            const { scrollLeft } = container;
            const index = Math.round(scrollLeft / cardWidth);
            setActiveSemestre(Math.min(Math.max(index + 1, 1), numSemestres));
        }
    }, [numSemestres]);

    const scrollToSemestre = (num: number) => {
        if (semestreCarouselRef.current) {
            const container = semestreCarouselRef.current;
            const child = container.children[num - 1] as HTMLElement | undefined;
            if (child) {
                child.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
            }
        }
        setActiveSemestre(num);
    };
    const listaSemestres = useMemo(
        () => Array.from({ length: numSemestres }, (_, i) => i + 1),
        [numSemestres],
    );

    // Máximo de items en cualquier semestre → determina el alto de las cards
    const maxItemsPerSemestre = useMemo(() => {
        let max = 1;
        listaSemestres.forEach((num) => {
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
            <div className="flex h-screen items-center justify-center bg-slate-50 p-6">
                <div className="w-full max-w-md rounded-[2.5rem] border border-slate-200 bg-white p-12 text-center shadow-2xl">
                    <span className="material-symbols-outlined mb-4 !text-7xl text-amber-400">
                        error_outline
                    </span>
                    <h1 className="text-2xl font-black text-slate-900">
                        Malla no disponible
                    </h1>
                    <p className="mt-2 mb-8 text-slate-500">
                        El programa <strong>{programa.Nombre_Programa}</strong>{' '}
                        no tiene una malla activa.
                    </p>
                    <Link
                        href="/"
                        className="rounded-2xl bg-[#00236f] px-8 py-3 font-bold text-white transition-all hover:scale-105 active:scale-95"
                    >
                        Volver al inicio
                    </Link>
                </div>
            </div>
        );
    }

    // Datos estáticos de cada componente de formación
    const COMPONENT_INFO: Record<
        number,
        { nombre: string; descripcion: string; nota: string }
    > = {
        1: {
            nombre: 'Fundamentación',
            descripcion:
                'Este componente introduce y contextualiza el campo de conocimiento por el que optó el estudiante desde una perspectiva de ciudadanía, humanística, ambiental y cultural. Identifica las relaciones generales que caracterizan los saberes de las distintas disciplinas y profesiones del área, el contexto nacional e internacional de su desarrollo, el contexto institucional y los requisitos indispensables para su formación integral.',
            nota: 'Tomado de ACUERDO 033 DEL CSU "Por el cual se establecen los lineamientos básicos para el proceso de formación de los estudiantes de la Universidad Nacional de Colombia a través de sus programas curriculares"',
        },
        2: {
            nombre: 'Disciplinar o Profesional',
            descripcion:
                'Este componente suministra al estudiante la gramática básica de su profesión o disciplina, las teorías, métodos y prácticas fundamentales, cuyo ejercicio formativo, investigativo y de extensión le permitirá integrarse con una comunidad profesional o disciplinar determinada. El Trabajo de Grado en cualquier modalidad hará parte de este componente.',
            nota: 'Tomado de ACUERDO 033 DEL CSU "Por el cual se establecen los lineamientos básicos para el proceso de formación de los estudiantes de la Universidad Nacional de Colombia a través de sus programas curriculares"',
        },
        3: {
            nombre: 'Libre Elección',
            descripcion:
                'Este componente permite al estudiante aproximarse, contextualizar y/o profundizar temas de su profesión o disciplina y apropiar herramientas y conocimientos de distintos saberes tendientes a la diversificación, flexibilidad e interdisciplinariedad. Es objetivo de este componente acercar a los estudiantes a las tareas de investigación, extensión, emprendimiento y toma de conciencia de las implicaciones sociales de la generación de conocimiento.',
            nota: 'Tomado de ACUERDO 033 DEL CSU "Por el cual se establecen los lineamientos básicos para el proceso de formación de los estudiantes de la Universidad Nacional de Colombia a través de sus programas curriculares"',
        },
        4: {
            nombre: 'Nivelatorio',
            descripcion:
                'Este componente corresponde a asignaturas que atienden las necesidades de nivelación académica de los estudiantes antes de iniciar su formación profesional.',
            nota: 'Tomado de ACUERDO 033 DEL CSU',
        },
        5: {
            nombre: 'Lengua Extranjera',
            descripcion:
                'Todo estudiante deberá tener formación en una de las lenguas extranjeras ofrecidas por las sedes de la Universidad Nacional de Colombia de acuerdo con las necesidades académicas propias de los programas curriculares. Los programas curriculares de pregrado deben incluir en los cuatro primeros semestres de la carrera los niveles de lengua extranjera, correspondientes a los doce (12) créditos.',
            nota: 'Tomado de ACUERDO 033 DEL CSU',
        },
    };

    return (
        <div className="flex min-h-screen flex-col bg-[#f1f5f9] font-sans selection:bg-blue-100">
            <Head title={`${programa.Nombre_Programa} - Malla Curricular`} />
            <InstitutionalHeader />

            {/* 1. HEADER DASHBOARD — Identidad institucional + Quick Stats */}
            <div className="bg-[#00236f] pt-10">
                <header className="shrink-0 bg-[#00236f] shadow-[0_4px_24px_rgba(0,35,111,0.22)]">
                {/* Barra superior: navegación + identidad */}
                <div className="px-4 pt-3 pb-0 sm:px-8">
                    <div className="mx-auto flex max-w-[1800px] items-start justify-between gap-4">
                        {/* Izquierda: back + nombre + facultad */}
                        <div className="flex min-w-0 items-start gap-3">
                            <Link
                                href="/"
                                aria-label="Volver al inicio"
                                title="Volver al inicio"
                                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white/80 transition-all duration-200 hover:bg-white hover:text-[#00236f] focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#00236f]"
                            >
                                <span
                                    className="material-symbols-outlined !text-[18px]"
                                    aria-hidden="true"
                                >
                                    arrow_back
                                </span>
                            </Link>

                            <div className="min-w-0 pt-0.5">
                                {/* Eyebrow: mobile condensed */}
                                <p className="mb-0.5 flex items-center gap-1.5 truncate text-[10px] font-bold tracking-[0.12em] text-blue-200 uppercase sm:hidden">
                                    <span
                                        className="material-symbols-outlined !text-[11px] opacity-70"
                                        aria-hidden="true"
                                    >
                                        school
                                    </span>
                                    <span className="truncate">{programa.Facultad}</span>
                                    {activeMalla?.Codigo_Plan && (
                                        <>
                                            <span className="mx-0.5 text-blue-400/60">·</span>
                                            <span className="shrink-0 font-mono tracking-wider text-blue-300">
                                                Plan {activeMalla.Codigo_Plan}
                                            </span>
                                        </>
                                    )}
                                </p>
                                {/* Eyebrow: desktop full */}
                                <p className="mb-0.5 hidden items-center gap-1.5 truncate text-[10px] font-bold tracking-[0.12em] text-blue-200 uppercase sm:flex">
                                    <span
                                        className="material-symbols-outlined !text-[11px] opacity-70"
                                        aria-hidden="true"
                                    >
                                        school
                                    </span>
                                    {programa.Facultad}
                                    {activeMalla?.normativa && (
                                        <>
                                            <span className="mx-0.5 text-blue-400/60">
                                                ·
                                            </span>
                                            {activeMalla.normativa.Url_Normativa ? (
                                                <a
                                                    href={activeMalla.normativa.Url_Normativa}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-100 underline decoration-blue-300/40 hover:decoration-blue-100 transition-all"
                                                >
                                                    {
                                                        activeMalla.normativa
                                                            .Tipo_Normativa
                                                    }{' '}
                                                    {
                                                        activeMalla.normativa
                                                            .Numero_Normativa
                                                    }
                                                    {activeMalla.normativa
                                                        .Anio_Normativa &&
                                                        ` de ${activeMalla.normativa.Anio_Normativa}`}
                                                    {activeMalla.normativa
                                                        .Instancia &&
                                                        ` (${activeMalla.normativa.Instancia})`}
                                                </a>
                                            ) : (
                                                <span className="text-blue-100">
                                                    {
                                                        activeMalla.normativa
                                                            .Tipo_Normativa
                                                    }{' '}
                                                    {
                                                        activeMalla.normativa
                                                            .Numero_Normativa
                                                    }
                                                    {activeMalla.normativa
                                                        .Anio_Normativa &&
                                                        ` de ${activeMalla.normativa.Anio_Normativa}`}
                                                    {activeMalla.normativa
                                                        .Instancia &&
                                                        ` (${activeMalla.normativa.Instancia})`}
                                                </span>
                                            )}
                                        </>
                                    )}
                                    {activeMalla?.Codigo_Plan && (
                                        <>
                                            <span className="mx-0.5 text-blue-400/60">
                                                ·
                                            </span>
                                            <span className="font-mono tracking-wider text-blue-300">
                                                Plan {activeMalla.Codigo_Plan}
                                            </span>
                                        </>
                                    )}
                                </p>
                                {/* Nombre del programa */}
                                <h1 className="truncate text-sm leading-tight font-black tracking-tight text-white sm:text-lg lg:text-xl">
                                    {programa.Nombre_Programa}
                                </h1>
                                {/* Subtítulo: título otorgado + SNIES */}
                                {(programa.Titulo_Otorgado ||
                                    programa.Codigo_SNIES) && (
                                    <p className="mt-0.5 truncate text-[9px] text-blue-200/70 sm:text-[10px]">
                                        {programa.Titulo_Otorgado && (
                                            <span>
                                                {programa.Titulo_Otorgado}
                                            </span>
                                        )}
                                        {programa.Titulo_Otorgado &&
                                            programa.Codigo_SNIES && (
                                                <span className="mx-1.5 text-blue-400/50">
                                                    ·
                                                </span>
                                            )}
                                        {programa.Codigo_SNIES && (
                                            <span className="font-mono">
                                                SNIES{' '}
                                                {programa.Codigo_SNIES}
                                            </span>
                                        )}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Derecha: acciones */}
                        <div className="flex shrink-0 items-center gap-2 pt-0.5">
                            {loadingVersion ? (
                                <span className="hidden items-center gap-1.5 rounded-lg border border-slate-400/30 bg-slate-500/20 px-3 py-1.5 text-[10px] font-bold tracking-wider text-slate-300 uppercase sm:flex">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" />
                                    Cargando...
                                </span>
                            ) : (
                                <VersionBadge
                                    currentVersionId={currentVersionId}
                                    versiones={versiones}
                                    onSelectVersion={handleSelectVersion}
                                    onOpenHistory={handleOpenHistory}
                                />
                            )}
                            <button
                                onClick={() => setShowGuideModal(true)}
                                className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-bold tracking-wider text-white/80 uppercase transition-all duration-200 hover:bg-white hover:text-[#00236f] focus-visible:ring-2 focus-visible:ring-white/60"
                                aria-label="Abrir guía de lectura de la malla"
                            >
                                <span
                                    className="material-symbols-outlined !text-[14px]"
                                    aria-hidden="true"
                                >
                                    help_outline
                                </span>
                                <span className="hidden sm:inline">
                                    ¿Cómo leer la malla?
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quick Stats bar — separador visual entre identidad y canvas */}
                <div className="mx-auto mt-3 max-w-[1800px] px-4 sm:px-8">
                    <div className="flex items-stretch gap-0 overflow-x-auto rounded-t-xl border border-b-0 border-white/10 bg-white/5 sm:w-fit sm:overflow-hidden [&::-webkit-scrollbar]:hidden">
                        {[
                            {
                                icon: 'stars',
                                label: 'Créditos',
                                value: programa.Creditos_Totales ?? '—',
                                unit: 'total',
                            },
                            {
                                icon: 'calendar_month',
                                label: 'Duración',
                                value: programa.Duracion_Semestres ?? '—',
                                unit: 'semestres',
                            },
                            {
                                icon: 'layers',
                                label: 'Nivel',
                                value: programa.Nivel_Formacion ?? 'Pregrado',
                                unit: null,
                                wide: true,
                            },
                        ].map((stat, i, arr) => (
                            <div
                                key={stat.label}
                                className={`flex shrink-0 items-center gap-2.5 px-4 py-2 ${i < arr.length - 1 ? 'border-r border-white/10' : ''}`}
                            >
                                <span
                                    className="material-symbols-outlined shrink-0 !text-[16px] text-blue-300/70"
                                    aria-hidden="true"
                                >
                                    {stat.icon}
                                </span>
                                <div>
                                    <span className="block text-[9px] font-bold tracking-[0.1em] text-blue-300/60 uppercase">
                                        {stat.label}
                                    </span>
                                    <span className="text-sm leading-tight font-black text-white">
                                        {stat.value}
                                        {stat.unit && (
                                            <span className="ml-1 text-[10px] font-medium text-blue-200/60">
                                                {stat.unit}
                                            </span>
                                        )}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                </header>
            </div>

            {/* 2. SEMESTER CANVAS */}
            <main
                className="flex-1 overflow-y-auto p-4"
            >
                {/* Mobile: semester navigation dots */}
                <div className="flex items-center justify-center gap-1.5 pb-2 sm:hidden" aria-hidden="true">
                    {listaSemestres.map((num) => (
                        <button
                            key={num}
                            onClick={() => scrollToSemestre(num)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                activeSemestre === num
                                    ? 'w-6 bg-[#00236f]'
                                    : 'w-1.5 bg-slate-300'
                            }`}
                            aria-label={`Ir al semestre ${ROMAN[num] || num}`}
                        />
                    ))}
                </div>

                <div
                    ref={semestreCarouselRef}
                    onScroll={handleCarouselScroll}
                    className="flex h-full gap-4 overflow-x-auto sm:grid sm:min-w-[720px] sm:overflow-visible snap-x snap-mandatory sm:snap-none [&::-webkit-scrollbar]:hidden"
                    style={{
                        gridTemplateColumns: `repeat(${numSemestres}, minmax(0, 1fr))`,
                    } as React.CSSProperties}
                >
                    {listaSemestres.map((num) => {
                        return (
                            <div
                                key={num}
                                className="flex h-full min-w-0 flex-col w-[88vw] shrink-0 snap-start sm:w-auto sm:shrink sm:snap-none"
                            >
                                <div className="mb-3 flex shrink-0 items-center justify-between px-1 sm:mb-1.5">
                                    <div className="flex items-center gap-1">
                                        <span className="truncate text-[9px] font-black tracking-[1px] text-slate-400 uppercase">
                                            Semestre
                                        </span>
                                    </div>
                                    <span className="text-lg leading-none font-black text-slate-600 italic">
                                        {ROMAN[num]}
                                    </span>
                                </div>

                                <div
                                    className="grid min-h-0 flex-1 gap-2 sm:gap-1.5"
                                    style={{
                                        gridTemplateRows: `repeat(${maxItemsPerSemestre}, minmax(0, 1fr))`,
                                    }}
                                >
                                    {(semestres[num] || []).map((item) => {
                                        // SLOT
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

                                            // Paleta alineada con el design system: slate base, acentos UNAL
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
                                                <div
                                                    key={`slot-${slot.ID_Slot}`}
                                                    role={
                                                        isLibre || isOptativa
                                                            ? 'button'
                                                            : undefined
                                                    }
                                                    tabIndex={
                                                        isLibre || isOptativa
                                                            ? 0
                                                            : undefined
                                                    }
                                                    aria-label={
                                                        isLibre
                                                            ? 'Ver catálogo de Libre Elección'
                                                            : isOptativa
                                                              ? `Ver optativas${slot.Nombre_Agrupacion ? ` de ${slot.Nombre_Agrupacion}` : ''}`
                                                              : undefined
                                                    }
                                                    className={`flex h-full flex-col items-center justify-center rounded-xl border border-dashed p-3 text-center transition-all duration-300 sm:p-2 ${isLibre || isOptativa ? 'cursor-pointer' : 'cursor-default'} ${slotTheme.wrapper} `}
                                                    onClick={
                                                        isLibre
                                                            ? () => {
                                                                  setShowElectivasModal(
                                                                      true,
                                                                  );
                                                                  fetchElectivas();
                                                              }
                                                            : isOptativa
                                                              ? () => {
                                                                    setSelectedOptativaSlot(
                                                                        slot,
                                                                    );
                                                                    setShowOptativasModal(
                                                                        true,
                                                                    );
                                                                    fetchOptativas(
                                                                        slot,
                                                                    );
                                                                }
                                                              : undefined
                                                    }
                                                    onKeyDown={
                                                        isLibre || isOptativa
                                                            ? (e) => {
                                                                  if (
                                                                      e.key ===
                                                                          'Enter' ||
                                                                      e.key ===
                                                                          ' '
                                                                  ) {
                                                                      e.preventDefault();

                                                                      if (
                                                                          isLibre
                                                                      ) {
                                                                          setShowElectivasModal(
                                                                              true,
                                                                          );
                                                                          fetchElectivas();
                                                                      } else {
                                                                          setSelectedOptativaSlot(
                                                                              slot,
                                                                          );
                                                                          setShowOptativasModal(
                                                                              true,
                                                                          );
                                                                          fetchOptativas(
                                                                              slot,
                                                                          );
                                                                      }
                                                                  }
                                                              }
                                                            : undefined
                                                    }
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
                                            );
                                        }

                                        // ASIGNATURA
                                        const asig = item as Asignatura & {
                                            isSlot: false;
                                            ID_Componente: number;
                                        };
                                        const isSelected =
                                            selectedAsig === asig.ID_Asignatura;
                                        const isPre = activeRelations.pre.has(
                                            asig.ID_Asignatura,
                                        );
                                        const isCo = activeRelations.co.has(
                                            asig.ID_Asignatura,
                                        );
                                        const isDimmed =
                                            selectedAsig !== null &&
                                            !isSelected &&
                                            !isPre &&
                                            !isCo;
                                        const style = getComponentColor(
                                            asig.ID_Componente || 0,
                                        );
                                        const oblig =
                                            asig.pivot.Tipo_Asignatura.toUpperCase().includes(
                                                'OBLI',
                                            );

                                        return (
                                            <div
                                                key={asig.ID_Asignatura}
                                                role="button"
                                                tabIndex={0}
                                                aria-pressed={isSelected}
                                                aria-label={`${asig.Nombre_Asignatura}, ${asig.Creditos_Asignatura} créditos${oblig ? ', obligatoria' : ', optativa'}`}
                                                onClick={() =>
                                                    setSelectedAsig(
                                                        isSelected
                                                            ? null
                                                            : asig.ID_Asignatura,
                                                    )
                                                }
                                                onKeyDown={(e) => {
                                                    if (
                                                        e.key === 'Enter' ||
                                                        e.key === ' '
                                                    ) {
                                                        e.preventDefault();
                                                        setSelectedAsig(
                                                            isSelected
                                                                ? null
                                                                : asig.ID_Asignatura,
                                                        );
                                                    }
                                                }}
                                                className={`group relative h-full cursor-pointer rounded-xl border-l-[5px] bg-white shadow-sm transition-all duration-300 ${style.border} flex flex-col justify-between overflow-hidden focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1 focus-visible:outline-none ${isSelected ? 'z-30 shadow-xl ring-2 ring-blue-600' : 'hover:-translate-y-0.5 hover:shadow-md'} ${isPre ? 'z-20 bg-rose-50 ring-2 ring-rose-500' : ''} ${isCo ? 'z-20 bg-amber-50 ring-2 ring-amber-400' : ''} ${isDimmed ? 'opacity-30 grayscale-[0.8]' : 'opacity-100'} `}
                                            >
                                                {/* Métricas Top */}
                                                <div
                                                    className={`${style.bg} flex shrink-0 justify-around border-b border-white/50 py-1 text-[9px] font-black text-slate-600 sm:py-0.5`}
                                                >
                                                    <span>
                                                        {
                                                            asig.Creditos_Asignatura
                                                        }{' '}
                                                        CR
                                                    </span>
                                                    <span>
                                                        {asig.Horas_Presencial}{' '}
                                                        HP
                                                    </span>
                                                    <span>
                                                        {asig.Horas_Estudiante}{' '}
                                                        HE
                                                    </span>
                                                </div>

                                                {/* Nombre Central */}
                                                <div className="flex min-h-0 flex-1 items-center justify-center px-3 py-2 text-center sm:px-2 sm:py-1">
                                                    <h4 className="line-clamp-3 text-[11px] leading-tight font-bold text-slate-800">
                                                        {asig.Nombre_Asignatura}
                                                    </h4>
                                                </div>

                                                {/* Footer Info: código + un único indicador de requisitos (evita saturación de íconos) */}
                                                <div className="flex shrink-0 items-center justify-between bg-slate-50/50 px-3 py-1.5 sm:px-2 sm:py-1">
                                                    <span className="truncate font-mono text-[9px] font-bold text-slate-500">
                                                        {asig.Codigo_Asignatura}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        {(() => {
                                                            const hasPre =
                                                                asig.requisitos?.some(
                                                                    (r) => {
                                                                        const t =
                                                                            (
                                                                                r.Tipo_Requisito ||
                                                                                ''
                                                                            ).toLowerCase();

                                                                        return (
                                                                            t.includes(
                                                                                'pre',
                                                                            ) ||
                                                                            t.includes(
                                                                                'obligatorio',
                                                                            ) ||
                                                                            t ===
                                                                                'opcional'
                                                                        );
                                                                    },
                                                                );
                                                            const hasCo =
                                                                asig.requisitos?.some(
                                                                    (r) =>
                                                                        (
                                                                            r.Tipo_Requisito ||
                                                                            ''
                                                                        )
                                                                            .toLowerCase()
                                                                            .includes(
                                                                                'co',
                                                                            ),
                                                                );
                                                            const reqCount =
                                                                getUniqueRequisitos(
                                                                    asig.requisitos,
                                                                ).length;

                                                            if (
                                                                reqCount === 0
                                                            ) {
                                                                return null;
                                                            }

                                                            const label = hasPre
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
                                                                    {reqCount}
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
                        className="fixed inset-0 z-[20025] bg-black/20 sm:pointer-events-none sm:bg-transparent"
                        onClick={() => setSelectedAsig(null)}
                        aria-hidden="true"
                    />
                    <div
                        role="dialog"
                        aria-label={`Detalle de ${selectedAsigData.Nombre_Asignatura}`}
                        className="fixed inset-x-0 bottom-0 z-[20030] max-h-[80vh] w-full overflow-y-auto rounded-t-[2rem] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.2)] duration-300 animate-in slide-in-from-bottom sm:inset-x-auto sm:right-8 sm:bottom-8 sm:max-h-[calc(100vh-4rem)] sm:w-80 sm:rounded-[2.5rem] sm:slide-in-from-right"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-[#00236f] p-6 text-white">
                            <div className="mb-4 flex items-start justify-between">
                                <span className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-[9px] font-black tracking-widest uppercase">
                                    Expediente Académico
                                </span>
                                <button
                                    onClick={() => setSelectedAsig(null)}
                                    aria-label="Cerrar detalle"
                                    className="rounded text-white/60 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white/60"
                                >
                                    <span
                                        className="material-symbols-outlined"
                                        aria-hidden="true"
                                    >
                                        close
                                    </span>
                                </button>
                            </div>
                            <h3 className="text-lg leading-tight font-black">
                                {selectedAsigData.Nombre_Asignatura}
                            </h3>
                            <p className="mt-1 font-mono text-xs tracking-widest text-blue-200">
                                #{selectedAsigData.Codigo_Asignatura}
                            </p>
                        </div>

                        <div className="space-y-6 p-8">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                                    <span className="mb-1 block text-[9px] font-black tracking-tighter text-slate-400 uppercase">
                                        Horas Directas
                                    </span>
                                    <span className="text-lg font-black text-slate-800">
                                        {selectedAsigData.Horas_Presencial}h{' '}
                                        <small className="text-[10px] font-medium text-slate-400">
                                            /sem
                                        </small>
                                    </span>
                                </div>
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                                    <span className="mb-1 block text-[9px] font-black tracking-tighter text-slate-400 uppercase">
                                        Trabajo Auto.
                                    </span>
                                    <span className="text-lg font-black text-slate-800">
                                        {selectedAsigData.Horas_Estudiante}h{' '}
                                        <small className="text-[10px] font-medium text-slate-400">
                                            /sem
                                        </small>
                                    </span>
                                </div>
                            </div>

                            <div>
                                <h5 className="mb-3 flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-500 uppercase">
                                    <span className="h-[1px] w-4 bg-slate-200" />{' '}
                                    Prerrequisitos de área
                                </h5>
                                {requisitosUnicos.length > 0 ? (
                                    <ul className="space-y-2">
                                        {requisitosUnicos.map(
                                            (r, i) => {
                                                const t = (
                                                    r.Tipo_Requisito ?? ''
                                                ).toLowerCase();
                                                const isPre =
                                                    t.includes('pre') ||
                                                    t.includes('obligatorio') ||
                                                    t === 'opcional';

                                                return (
                                                    <li
                                                        key={i}
                                                        className={`flex items-start gap-2 rounded-xl border p-3 text-xs font-bold ${isPre ? 'border-rose-100 bg-rose-50 text-rose-700' : 'border-amber-100 bg-amber-50 text-amber-700'}`}
                                                    >
                                                        <span className="material-symbols-outlined !text-sm">
                                                            {isPre
                                                                ? 'lock'
                                                                : 'sync_alt'}
                                                        </span>
                                                        {r.asignatura_requerida
                                                            ? `${r.asignatura_requerida.Nombre_Asignatura} (${r.asignatura_requerida.Codigo_Asignatura})`
                                                            : r.Descripcion_Requisito ||
                                                              (r.Valor_Creditos
                                                                  ? `${r.Valor_Creditos} créditos`
                                                                  : '—')}
                                                    </li>
                                                );
                                            },
                                        )}
                                    </ul>
                                ) : (
                                    <p className="py-4 text-center text-xs text-slate-400 italic">
                                        Materia de libre acceso sin
                                        prerrequisitos.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* 4. FOOTER — Panel de distribución de créditos + leyenda */}
            <div className="relative z-[20020] shrink-0">
                {/* PANEL EXPANDIDO DE COMPONENTE */}
                {activeComponentPanel &&
                    (() => {
                        const id = activeComponentPanel;
                        const info = COMPONENT_INFO[id];
                        const style = COMPONENT_STYLES[id];
                        const compData = creditosPorComponente[id];
                        const rows = compData?.agrupaciones ?? [];
                        const totalOblig = compData?.totalOblig ?? 0;
                        const totalOpt = compData?.totalOpt ?? 0;
                        // total = suma de Creditos_Requeridos normativos (fuente de verdad del plan)
                        const total = compData?.total ?? 0;
                        const totalGrid = compData?.totalGrid ?? 0;
                        const totalCreditosOptativos =
                            compData?.totalCreditosOptativos ?? 0;
                        const creditosTotalesProg =
                            programa.Creditos_Totales ?? 1;
                        const porcentaje =
                            creditosTotalesProg > 0
                                ? Math.round(
                                      (total / creditosTotalesProg) * 100,
                                  )
                                : 0;
                        // tieneOptativos = hay agrupaciones con asignaturas sin semestre en el grid
                        const tieneOptativos = rows.some(
                            (r) => r.creditosOptativos > 0,
                        );

                        return (
                            <div className="absolute right-0 bottom-full left-0 z-[20020] max-h-[58vh] overflow-y-auto border-t border-slate-100 bg-white/95 shadow-[0_-12px_40px_rgba(0,0,0,0.13)] backdrop-blur-md duration-300 animate-in slide-in-from-bottom">
                                <div className="mx-auto max-w-[1800px] px-5 py-5 sm:px-8">
                                    {/* Header del panel */}
                                    <div className="mb-5 flex items-start justify-between gap-4">
                                        <div className="flex flex-1 items-center gap-3">
                                            <div
                                                className={`h-9 w-9 rounded-xl ${style.bg} flex shrink-0 items-center justify-center border border-white shadow-sm`}
                                            >
                                                <span
                                                    className={`h-3 w-3 rounded-full ${style.dot}`}
                                                    aria-hidden="true"
                                                />
                                            </div>
                                            <div>
                                                <h3 className="text-sm leading-tight font-black text-slate-900">
                                                    {info?.nombre}
                                                </h3>
                                                <p className="mt-0.5 text-[10px] text-slate-400">
                                                    {total} créditos requeridos
                                                    · {porcentaje}% del plan
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() =>
                                                setActiveComponentPanel(null)
                                            }
                                            aria-label="Cerrar panel de componente"
                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-all hover:bg-slate-200 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-slate-400"
                                        >
                                            <span
                                                className="material-symbols-outlined !text-[16px]"
                                                aria-hidden="true"
                                            >
                                                close
                                            </span>
                                        </button>
                                    </div>

                                    {/* Distribución Obligatorios vs Optativos — Cards separadas */}
                                    <div className="mb-5 grid grid-cols-2 gap-3">
                                        {/* Tarjeta Obligatorios */}
                                        <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4">
                                            <div className="mb-3 flex items-center gap-2">
                                                <span className="material-symbols-outlined !text-[18px] text-rose-500">
                                                    verified
                                                </span>
                                                <span className="text-[10px] font-bold tracking-wider text-rose-600 uppercase">
                                                    Obligatorios
                                                </span>
                                            </div>
                                            <div className="mb-2">
                                                <span className="text-2xl font-black text-rose-600">
                                                    {Math.round(totalOblig)}
                                                </span>
                                                <span className="ml-1 text-[10px] font-medium text-rose-500">
                                                    créditos
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-rose-200/40">
                                                <div
                                                    className="h-1.5 rounded-full bg-rose-500 transition-all duration-500"
                                                    style={{
                                                        width:
                                                            creditosTotalesProg >
                                                            0
                                                                ? `${Math.min((totalOblig / creditosTotalesProg) * 100, 100)}%`
                                                                : '0%',
                                                    }}
                                                    role="progressbar"
                                                />
                                            </div>
                                        </div>

                                        {/* Tarjeta Optativos */}
                                        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                                            <div className="mb-3 flex items-center gap-2">
                                                <span className="material-symbols-outlined !text-[18px] text-blue-500">
                                                    star
                                                </span>
                                                <span className="text-[10px] font-bold tracking-wider text-blue-600 uppercase">
                                                    Optativos
                                                </span>
                                            </div>
                                            <div className="mb-2">
                                                <span className="text-2xl font-black text-blue-600">
                                                    {Math.round(totalOpt)}
                                                </span>
                                                <span className="ml-1 text-[10px] font-medium text-blue-500">
                                                    créditos
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-200/40">
                                                <div
                                                    className="h-1.5 rounded-full bg-blue-500 transition-all duration-500"
                                                    style={{
                                                        width:
                                                            creditosTotalesProg >
                                                            0
                                                                ? `${Math.min((totalOpt / creditosTotalesProg) * 100, 100)}%`
                                                                : '0%',
                                                    }}
                                                    role="progressbar"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Barra de peso global (sobre Creditos_Requeridos normativos) */}
                                    <div className="mb-6 border-b border-slate-100 pb-5">
                                        <div className="mb-2 flex justify-between text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                                            <span>
                                                Peso en el plan de estudios
                                            </span>
                                            <span className={style.text}>
                                                {total} / {creditosTotalesProg}{' '}
                                                cr.
                                            </span>
                                        </div>
                                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className={`h-2.5 rounded-full ${style.dot} transition-all duration-700`}
                                                style={{
                                                    width: `${Math.min(porcentaje, 100)}%`,
                                                }}
                                                role="progressbar"
                                                aria-valuenow={porcentaje}
                                                aria-valuemin={0}
                                                aria-valuemax={100}
                                            />
                                        </div>
                                    </div>

                                    {/* Layout 2 columnas: descripción + tabla de agrupaciones */}
                                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                        {/* Descripción */}
                                        <div>
                                            <p className="mb-2 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                                                Descripción del componente
                                            </p>
                                            <p className="text-xs leading-relaxed text-slate-600">
                                                {info?.descripcion}
                                            </p>
                                            {info?.nota && (
                                                <p className="mt-2 border-l-2 border-slate-200 pl-2 text-[10px] leading-relaxed text-slate-400 italic">
                                                    {info.nota}
                                                </p>
                                            )}
                                        </div>

                                        {/* Distribución por agrupación — separada en obligatorias y optativas */}
                                        {rows.length > 0 && (
                                            <div>
                                                <p className="mb-2 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                                                    Distribución por agrupación
                                                </p>
                                                {(() => {
                                                    // Separar filas en tres grupos:
                                                    // - obligatorias puras (sin optativos internos)
                                                    // - obligatorias con optativos internos (solo en sección mixta)
                                                    // - puramente optativas
                                                    const rowsObligPuras =
                                                        rows.filter(
                                                            (r) =>
                                                                (r.Es_Obligatoria ||
                                                                    r.Es_Mixta) &&
                                                                r.creditosOptativos ===
                                                                    0,
                                                        );
                                                    const rowsObligConOpt =
                                                        rows.filter(
                                                            (r) =>
                                                                (r.Es_Obligatoria ||
                                                                    r.Es_Mixta) &&
                                                                r.creditosOptativos >
                                                                    0,
                                                        );
                                                    const rowsOpt = rows.filter(
                                                        (r) =>
                                                            !r.Es_Obligatoria &&
                                                            !r.Es_Mixta,
                                                    );

                                                    const AgrupRow = ({
                                                        r,
                                                        i,
                                                        showAsOptativa,
                                                    }: {
                                                        r: ResumenAgrupacionRow;
                                                        i: number;
                                                        showAsOptativa?: boolean;
                                                    }) => {
                                                        const refCreditos =
                                                            r.Creditos_Requeridos ??
                                                            r.Total_Creditos;
                                                        const rowPct =
                                                            total > 0
                                                                ? Math.round(
                                                                      (refCreditos /
                                                                          total) *
                                                                          100,
                                                                  )
                                                                : 0;
                                                        const tieneOptRow =
                                                            r.creditosOptativos >
                                                            0;

                                                        // Para agrupaciones mixtas, desglosamos el Creditos_Requeridos
                                                        // en la parte obligatoria y la optativa que el estudiante debe cursar.
                                                        // creditosOptativos es lo disponible; lo requerido es el remanente.
                                                        const obligReq =
                                                            r.Es_Mixta
                                                                ? Math.max(
                                                                      0,
                                                                      refCreditos -
                                                                          r.creditosOptativos,
                                                                  )
                                                                : r.creditosEnGrid;
                                                        const optReq =
                                                            r.Es_Mixta
                                                                ? Math.min(
                                                                      r.creditosOptativos,
                                                                      refCreditos,
                                                                  )
                                                                : r.creditosOptativos;
                                                        const pctOblig =
                                                            refCreditos > 0
                                                                ? (obligReq /
                                                                      refCreditos) *
                                                                  100
                                                                : 0;
                                                        const pctOpt =
                                                            refCreditos > 0
                                                                ? (optReq /
                                                                      refCreditos) *
                                                                  100
                                                                : 0;

                                                        // Cuando showAsOptativa es true, mostramos solo el badge de créditos optativos
                                                        if (
                                                            showAsOptativa &&
                                                            tieneOptRow
                                                        ) {
                                                            return (
                                                                <div
                                                                    key={i}
                                                                    className="rounded-xl border border-blue-200 bg-white shadow-xs"
                                                                >
                                                                    <div className="flex items-center justify-between border-b border-blue-100 px-3 py-2.5">
                                                                        <span className="min-w-0 truncate pr-2 text-[11px] font-bold text-slate-700">
                                                                            {
                                                                                r.Nombre_Agrupacion
                                                                            }
                                                                        </span>
                                                                        <span className="shrink-0 text-[10px] font-bold text-blue-500 tabular-nums">
                                                                            {Math.round(
                                                                                optReq,
                                                                            )}{' '}
                                                                            <span className="text-[9px] font-medium text-blue-400">
                                                                                cr.
                                                                                opt.
                                                                            </span>
                                                                        </span>
                                                                    </div>
                                                                    <div className="px-3 py-2.5">
                                                                        <div
                                                                            className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
                                                                            title={`${Math.round(optReq)} créditos optativos`}
                                                                        >
                                                                            <div
                                                                                className="h-1.5 rounded-full bg-blue-400 transition-all duration-500"
                                                                                style={{
                                                                                    width: '100%',
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }

                                                        return (
                                                            <div
                                                                key={i}
                                                                className="rounded-xl border border-slate-200 bg-white shadow-xs transition-shadow hover:shadow-sm"
                                                            >
                                                                <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
                                                                    <span className="min-w-0 truncate pr-2 text-[11px] font-bold text-slate-700">
                                                                        {
                                                                            r.Nombre_Agrupacion
                                                                        }
                                                                    </span>
                                                                    <div className="shrink-0 text-right">
                                                                        <span
                                                                            className={`text-sm font-black tabular-nums ${style.text}`}
                                                                        >
                                                                            {
                                                                                refCreditos
                                                                            }
                                                                            <span className="ml-0.5 text-[10px] font-medium text-slate-400">
                                                                                cr.
                                                                            </span>
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className="px-3 py-2">
                                                                    {tieneOptRow && (
                                                                        <div className="mb-2">
                                                                            <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-100">
                                                                                {obligReq >
                                                                                    0 && (
                                                                                    <div
                                                                                        className="bg-rose-400 transition-all duration-500"
                                                                                        style={{
                                                                                            width: `${pctOblig}%`,
                                                                                        }}
                                                                                    />
                                                                                )}
                                                                                {optReq >
                                                                                    0 && (
                                                                                    <div
                                                                                        className={
                                                                                            r.Es_Mixta
                                                                                                ? 'bg-amber-300 transition-all duration-500'
                                                                                                : 'bg-blue-400 transition-all duration-500'
                                                                                        }
                                                                                        style={{
                                                                                            width: `${pctOpt}%`,
                                                                                        }}
                                                                                    />
                                                                                )}
                                                                            </div>
                                                                            <span className="mt-1 block text-[9px] font-bold tracking-tight text-slate-400 tabular-nums">
                                                                                {Math.round(
                                                                                    obligReq,
                                                                                )}{' '}
                                                                                oblig
                                                                                {optReq >
                                                                                    0 && (
                                                                                    <span>
                                                                                        {' '}
                                                                                        ·{' '}
                                                                                        {Math.round(
                                                                                            optReq,
                                                                                        )}{' '}
                                                                                        opt
                                                                                    </span>
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    <div
                                                                        className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
                                                                        title={`${rowPct}% del componente`}
                                                                    >
                                                                        <div
                                                                            className={`h-1.5 rounded-full ${style.dot} transition-all duration-500`}
                                                                            style={{
                                                                                width: `${Math.min(rowPct, 100)}%`,
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    {rowPct >
                                                                        0 && (
                                                                        <span className="mt-1 block text-right text-[8px] font-bold text-slate-300 tabular-nums">
                                                                            {
                                                                                rowPct
                                                                            }
                                                                            %
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    };

                                                    return (
                                                        <div className="space-y-3">
                                                            {/* Sección: Agrupaciones Obligatorias */}
                                                            {rowsObligPuras.length >
                                                                0 && (
                                                                <div>
                                                                    <div className="mb-2 flex items-center gap-2">
                                                                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-md border border-rose-200 bg-rose-50">
                                                                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                                                                        </span>
                                                                        <span className="text-[10px] font-black tracking-wider text-rose-600 uppercase">
                                                                            Agrupaciones
                                                                            Obligatorias
                                                                        </span>
                                                                        <span className="ml-auto rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-500 tabular-nums">
                                                                            {Math.round(
                                                                                totalOblig,
                                                                            )}{' '}
                                                                            cr.
                                                                        </span>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        {rowsObligPuras.map(
                                                                            (
                                                                                r,
                                                                                i,
                                                                            ) => (
                                                                                <AgrupRow
                                                                                    key={
                                                                                        i
                                                                                    }
                                                                                    r={
                                                                                        r
                                                                                    }
                                                                                    i={
                                                                                        i
                                                                                    }
                                                                                />
                                                                            ),
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Agrupaciones Obligatorias con Optativos internos */}
                                                            {rowsObligConOpt.length >
                                                                0 && (
                                                                <div>
                                                                    <div className="mb-2 flex items-center gap-2">
                                                                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-md border border-amber-200 bg-amber-50">
                                                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                                                                        </span>
                                                                        <span className="text-[10px] font-black tracking-wider text-amber-600 uppercase">
                                                                            Obligatorias
                                                                            con
                                                                            Optativos
                                                                        </span>
                                                                        <span className="ml-auto rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-500 tabular-nums">
                                                                            {Math.round(
                                                                                rowsObligConOpt.reduce(
                                                                                    (
                                                                                        s,
                                                                                        r,
                                                                                    ) =>
                                                                                        s +
                                                                                        (r.creditosOptativos ||
                                                                                            0),
                                                                                    0,
                                                                                ),
                                                                            )}{' '}
                                                                            cr.
                                                                            opt.
                                                                        </span>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        {rowsObligConOpt.map(
                                                                            (
                                                                                r,
                                                                                i,
                                                                            ) => (
                                                                                <AgrupRow
                                                                                    key={`obl-opt-${i}`}
                                                                                    r={
                                                                                        r
                                                                                    }
                                                                                    i={
                                                                                        i
                                                                                    }
                                                                                />
                                                                            ),
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Separador si hay ambos grupos obligatorios y optativos */}
                                                            {(rowsObligPuras.length >
                                                                0 ||
                                                                rowsObligConOpt.length >
                                                                    0) &&
                                                                rowsOpt.length >
                                                                    0 && (
                                                                    <div className="border-t border-dashed border-slate-200" />
                                                                )}

                                                            {/* Separador entre obligatorias puras y obligatorias con optativos internos (si ambos existen) */}
                                                            {rowsObligPuras.length >
                                                                0 &&
                                                                rowsObligConOpt.length >
                                                                    0 && (
                                                                    <div className="border-t border-dashed border-slate-200" />
                                                                )}

                                                            {/* Sección: Agrupaciones Optativas */}
                                                            {rowsOpt.length >
                                                                0 && (
                                                                <div>
                                                                    <div className="mb-2 flex items-center gap-2">
                                                                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-md border border-blue-200 bg-blue-50">
                                                                            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                                                                        </span>
                                                                        <span className="text-[10px] font-black tracking-wider text-blue-600 uppercase">
                                                                            Agrupaciones
                                                                            Optativas
                                                                        </span>
                                                                        <span className="ml-auto rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-500 tabular-nums">
                                                                            {Math.round(
                                                                                rowsOpt.reduce(
                                                                                    (
                                                                                        s,
                                                                                        r,
                                                                                    ) =>
                                                                                        s +
                                                                                        (r.creditosOptativos ||
                                                                                            0),
                                                                                    0,
                                                                                ),
                                                                            )}{' '}
                                                                            cr.
                                                                        </span>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        {rowsOpt.map(
                                                                            (
                                                                                r,
                                                                                i,
                                                                            ) => (
                                                                                <AgrupRow
                                                                                    key={
                                                                                        i
                                                                                    }
                                                                                    r={
                                                                                        r
                                                                                    }
                                                                                    i={
                                                                                        i
                                                                                    }
                                                                                />
                                                                            ),
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}

                                                {/* Fila totales del componente */}
                                                <div
                                                    className={`rounded-xl border ${style.bg} mt-2 flex items-center justify-between border-current/20 p-3 shadow-xs`}
                                                >
                                                    <span className="text-[10px] font-black tracking-wider text-slate-600 uppercase">
                                                        Total del componente
                                                    </span>
                                                    <div className="flex items-center gap-3 text-xs font-black tabular-nums">
                                                        {totalOblig > 0 && (
                                                            <span className="text-slate-500">
                                                                {Math.round(
                                                                    totalOblig,
                                                                )}{' '}
                                                                <span className="font-medium text-slate-400">
                                                                    oblig.
                                                                </span>
                                                            </span>
                                                        )}
                                                        {totalOpt > 0 && (
                                                            <span className="text-slate-500">
                                                                {Math.round(
                                                                    totalOpt,
                                                                )}{' '}
                                                                <span className="font-medium text-slate-400">
                                                                    optat.
                                                                </span>
                                                            </span>
                                                        )}
                                                        <span
                                                            className={`text-base ${style.text}`}
                                                        >
                                                            {total}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                {/* FOOTER BAR — Leyenda de componentes + créditos rápidos */}
                <footer className="border-t border-slate-100 bg-white/80 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] backdrop-blur-md">
                    <div className="mx-auto flex min-h-[44px] max-w-[1800px] items-stretch justify-between gap-2 px-4 py-0 sm:px-6">
                        {/* Botones de componentes — con crédito integrado */}
                        <div className="flex items-stretch gap-0 overflow-x-auto sm:overflow-visible [&::-webkit-scrollbar]:hidden">
                            {(
                                [
                                    { id: 1, label: 'Fundamentación' },
                                    { id: 2, label: 'Disciplinar' },
                                    { id: 3, label: 'Libre Elección' },
                                    { id: 4, label: 'Nivelatorio' },
                                    { id: 5, label: 'Idiomas' },
                                ] as const
                            ).map(({ id, label }) => {
                                const style = COMPONENT_STYLES[id];
                                const isActive = activeComponentPanel === id;
                                const compData = creditosPorComponente[id];
                                // Mostrar si el componente tiene al menos una agrupacion definida en la malla
                                const hasAgrupaciones =
                                    compData &&
                                    compData.agrupaciones.length > 0;

                                if (!hasAgrupaciones) {
                                    return null;
                                }

                                // Creditos normativos del componente (suma de Creditos_Requeridos de sus agrupaciones)
                                const total = compData.total;

                                return (
                                    <button
                                        key={id}
                                        onClick={() =>
                                            setActiveComponentPanel(
                                                isActive ? null : id,
                                            )
                                        }
                                        aria-pressed={isActive}
                                        aria-label={`Ver distribución de ${label}`}
                                        className={`group relative flex shrink-0 items-center gap-2 border-r border-slate-100 px-3 py-2 transition-all duration-200 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-inset ${isActive ? 'bg-slate-50' : ''} `}
                                    >
                                        {/* Indicador activo — borde superior */}
                                        <span
                                            className={`absolute inset-x-0 top-0 h-0.5 rounded-b-full transition-all duration-200 ${style.dot} ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}
                                            aria-hidden="true"
                                        />
                                        <span
                                            className={`h-2 w-2 rounded-full ${style.dot} shrink-0`}
                                            aria-hidden="true"
                                        />
                                        <span
                                            className={`text-[10px] font-bold tracking-tight whitespace-nowrap uppercase transition-colors sm:text-[11px] ${isActive ? 'text-slate-800' : 'text-slate-500 group-hover:text-slate-700'}`}
                                        >
                                            {label}
                                        </span>
                                        {total > 0 && (
                                            <span
                                                className={`text-[10px] font-black tabular-nums transition-colors ${isActive ? style.text : 'text-slate-400'}`}
                                            >
                                                {total}
                                            </span>
                                        )}
                                        <span
                                            className={`material-symbols-outlined !text-[13px] transition-all duration-200 ${isActive ? 'rotate-180 text-slate-500' : 'text-slate-300'}`}
                                            aria-hidden="true"
                                        >
                                            expand_less
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Marca / copyright */}
                        <div className="flex items-center gap-2 pl-3">
                            <span className="text-[10px] font-bold tracking-wider whitespace-nowrap text-slate-300">
                                SIA · UNAL — 2026
                            </span>
                        </div>
                    </div>
                </footer>
            </div>

            <InstitutionalFooter />

            {/* MODAL: ¿Cómo leer la malla? — Guía visual rediseñada con explicación de agrupaciones */}
            {showGuideModal && (
                <div
                    className="fixed inset-0 z-[400] flex items-center justify-center bg-black/50 px-4"
                    onClick={() => setShowGuideModal(false)}
                >
                    <div
                        className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                            <div>
                                <h2 className="text-base font-black tracking-tight text-slate-900 uppercase">
                                    ¿Cómo leer la malla curricular?
                                </h2>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    {programa.Nombre_Programa}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowGuideModal(false)}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-all hover:bg-slate-200"
                            >
                                <span className="material-symbols-outlined !text-sm">
                                    close
                                </span>
                            </button>
                        </div>
                        <div className="max-h-[75vh] overflow-y-auto">
                            {/* 1. Jerarquía del plan de estudios — Diagrama visual */}
                            <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white px-8 pt-6 pb-5">
                                <p className="mb-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                    Niveles del plan de estudios
                                </p>
                                <div className="space-y-2.5 text-xs">
                                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#00236f] text-[9px] font-black text-white">
                                            1
                                        </span>
                                        <div>
                                            <span className="font-bold text-slate-800">
                                                Programa Académico
                                            </span>
                                            <span className="ml-2 text-slate-400">
                                                {programa.Nombre_Programa}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="ml-3 border-l-2 border-dashed border-slate-200 pl-10">
                                        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f9a825] text-[9px] font-black text-white">
                                                2
                                            </span>
                                            <div>
                                                <span className="font-bold text-slate-800">
                                                    Componente de Formación
                                                </span>
                                                <span className="ml-2 text-slate-400">
                                                    ej: Disciplinar — 84
                                                    créditos
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="ml-6 border-l-2 border-dashed border-slate-200 pl-10">
                                        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#8bc34a] text-[9px] font-black text-white">
                                                3
                                            </span>
                                            <div>
                                                <span className="font-bold text-slate-800">
                                                    Agrupación
                                                </span>
                                                <span className="ml-2 text-slate-400">
                                                    ej: Finanzas — 14 créditos
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="ml-9 border-l-2 border-dashed border-slate-200 pl-10">
                                        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#4fc3f7] text-[9px] font-black text-white">
                                                4
                                            </span>
                                            <div>
                                                <span className="font-bold text-slate-800">
                                                    Asignatura
                                                </span>
                                                <span className="ml-2 text-slate-400">
                                                    cada curso individual en la
                                                    malla
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <p className="mt-3 text-[10px] leading-relaxed text-slate-400 italic">
                                    Cada nivel agrupa al siguiente. Una
                                    agrupación es un conjunto de asignaturas
                                    afines dentro de un mismo componente de
                                    formación.
                                </p>
                            </div>

                            {/* 2. Tipos de agrupación — Nuevo */}
                            <div className="border-b border-slate-100 px-8 pt-5 pb-4">
                                <p className="mb-3 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                    Tipos de agrupación
                                </p>
                                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                                    <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-3.5">
                                        <div className="mb-1.5 flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-rose-400" />
                                            <span className="text-[10px] font-black tracking-wider text-rose-600 uppercase">
                                                Obligatorias
                                            </span>
                                        </div>
                                        <p className="text-[11px] leading-relaxed text-slate-600">
                                            Todas las asignaturas son
                                            obligatorias. Debes cursarlas para
                                            completar el componente.
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3.5">
                                        <div className="mb-1.5 flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-amber-400" />
                                            <span className="text-[10px] font-black tracking-wider text-amber-600 uppercase">
                                                Mixtas
                                            </span>
                                        </div>
                                        <p className="text-[11px] leading-relaxed text-slate-600">
                                            Combinan asignaturas obligatorias y
                                            optativas. Las optativas aparecen
                                            como botón "Ver optativas de..." en
                                            la malla.
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3.5">
                                        <div className="mb-1.5 flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-blue-400" />
                                            <span className="text-[10px] font-black tracking-wider text-blue-600 uppercase">
                                                Optativas
                                            </span>
                                        </div>
                                        <p className="text-[11px] leading-relaxed text-slate-600">
                                            Agrupaciones donde tú eliges qué
                                            cursos tomar entre una oferta
                                            disponible.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 3. El panel de distribución de créditos — Nuevo */}
                            <div className="border-b border-slate-100 bg-slate-50/60 px-8 pt-5 pb-4">
                                <p className="mb-3 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                    Cómo leer la distribución de créditos
                                </p>
                                <div className="space-y-2.5 text-xs text-slate-600">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-rose-200 bg-rose-50">
                                            <span className="material-symbols-outlined !text-[12px] text-rose-500">
                                                verified
                                            </span>
                                        </div>
                                        <p>
                                            <span className="font-bold text-rose-600">
                                                Obligatorios
                                            </span>{' '}
                                            — créditos de asignaturas que todos
                                            los estudiantes deben cursar. Son la
                                            base del componente.
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-blue-200 bg-blue-50">
                                            <span className="material-symbols-outlined !text-[12px] text-blue-500">
                                                star
                                            </span>
                                        </div>
                                        <p>
                                            <span className="font-bold text-blue-600">
                                                Optativos
                                            </span>{' '}
                                            — créditos que eliges entre varias
                                            opciones. Aparecen desglosados por
                                            agrupación en el panel.
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-amber-200 bg-amber-50">
                                            <span className="material-symbols-outlined !text-[12px] text-amber-500">
                                                call_split
                                            </span>
                                        </div>
                                        <p>
                                            <span className="font-bold text-amber-600">
                                                Agrupaciones Mixtas
                                            </span>{' '}
                                            — en el panel de distribución, las
                                            agrupaciones con optativos muestran
                                            el desglose: créditos obligatorios y
                                            optativos separados por colores.
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white">
                                            <span className="material-symbols-outlined !text-[12px] text-slate-500">
                                                bar_chart
                                            </span>
                                        </div>
                                        <p>
                                            Las{' '}
                                            <span className="font-bold">
                                                barras de progreso
                                            </span>{' '}
                                            en cada agrupación muestran su peso
                                            dentro del componente. Las barras
                                            divididas (rosa + azul/gris) indican
                                            la proporción entre obligatorio y
                                            optativo.
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-violet-200 bg-violet-50">
                                            <span className="material-symbols-outlined !text-[12px] text-violet-500">
                                                calculate
                                            </span>
                                        </div>
                                        <p>
                                            En{' '}
                                            <span className="font-bold text-violet-600">
                                                agrupaciones mixtas
                                            </span>
                                            , el total de créditos requeridos se
                                            reparte: los{' '}
                                            <span className="font-bold">
                                                obligatorios
                                            </span>{' '}
                                            son el total menos los créditos
                                            optativos disponibles, y los{' '}
                                            <span className="font-bold">
                                                optativos
                                            </span>{' '}
                                            son lo que debes escoger del listado
                                            ofertado. Ambos suman el total de la
                                            agrupación.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 4. Ejemplo visual de tarjeta de asignatura */}
                            <div className="border-b border-slate-100 bg-white px-8 pt-5 pb-4">
                                <p className="mb-3 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                    Ejemplo de tarjeta de asignatura
                                </p>
                                <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-start sm:gap-8">
                                    <div className="w-full shrink-0 sm:w-44">
                                        <div className="overflow-hidden rounded-xl border-l-[5px] border-l-[#8bc34a] bg-white shadow-md">
                                            <div className="flex justify-around border-b border-white/50 bg-[#f1f8e9] py-1 text-[8px] font-black text-slate-500">
                                                <span>3 CR</span>
                                                <span>4 HP</span>
                                                <span>5 HE</span>
                                            </div>
                                            <div className="flex h-14 items-center justify-center px-3 py-3 text-center">
                                                <h4 className="text-[10px] leading-tight font-bold text-slate-800">
                                                    Bases de Datos I
                                                </h4>
                                            </div>
                                            <div className="flex items-center justify-between bg-slate-50/50 px-2 py-1">
                                                <span className="font-mono text-[8px] font-bold text-slate-400">
                                                    4100552
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 ring-2 ring-white">
                                                        <span className="text-[7px] font-bold text-white">
                                                            P
                                                        </span>
                                                    </div>
                                                    <span className="material-symbols-outlined !text-sm text-rose-500">
                                                        verified
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-2.5 text-xs text-slate-700">
                                        <div className="flex items-start gap-2.5">
                                            <div className="mt-0.5 h-5 w-5 shrink-0 rounded border-l-4 border-[#8bc34a] bg-[#f1f8e9]" />
                                            <p>
                                                <span className="font-bold">
                                                    Barra de color + fondo
                                                </span>{' '}
                                                — indica el{' '}
                                                <span className="font-bold">
                                                    componente de formación
                                                </span>
                                                . Cada componente tiene su
                                                propio color (ver footer).
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-2.5">
                                            <span className="mt-0.5 shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-black whitespace-nowrap">
                                                3 CR / 4 HP / 5 HE
                                            </span>
                                            <p>
                                                <span className="font-bold">
                                                    CR
                                                </span>{' '}
                                                = créditos ·{' '}
                                                <span className="font-bold">
                                                    HP
                                                </span>{' '}
                                                = horas presenciales/semana ·{' '}
                                                <span className="font-bold">
                                                    HE
                                                </span>{' '}
                                                = horas de trabajo
                                                autónomo/semana.
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-2.5">
                                            <span className="material-symbols-outlined shrink-0 !text-sm text-rose-500">
                                                verified
                                            </span>
                                            <p>
                                                <span className="font-bold text-rose-600">
                                                    Birrete rojo
                                                </span>{' '}
                                                = materia obligatoria ·{' '}
                                                <span className="font-bold text-blue-500">
                                                    Estrella azul
                                                </span>{' '}
                                                = materia optativa.
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-2.5">
                                            <div className="mt-0.5 flex shrink-0 gap-1">
                                                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500">
                                                    <span className="text-[7px] font-bold text-white">
                                                        P
                                                    </span>
                                                </div>
                                                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-400">
                                                    <span className="text-[7px] font-bold text-white">
                                                        C
                                                    </span>
                                                </div>
                                            </div>
                                            <p>
                                                Punto{' '}
                                                <span className="font-bold text-rose-600">
                                                    P
                                                </span>{' '}
                                                = tiene prerrequisitos · Punto{' '}
                                                <span className="font-bold text-amber-500">
                                                    C
                                                </span>{' '}
                                                = tiene correquisitos. Haz clic
                                                en la tarjeta para resaltarlos.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 5. Acordeones — contenido estático */}
                            <div className="divide-y divide-slate-100">
                                {[
                                    {
                                        key: 'plan',
                                        title: 'Plan de Estudios',
                                        content:
                                            'Un plan de estudios es un conjunto de actividades académicas, organizadas mediante asignaturas reunidas en componentes de formación que un estudiante debe cursar para alcanzar los propósitos de formación de un programa curricular. Tomado del Acuerdo 033 del CSU.',
                                    },
                                    {
                                        key: 'malla',
                                        title: '¿Qué es una Malla Curricular?',
                                        content:
                                            'La malla curricular es una propuesta de visualización de un plan de estudios donde se sugiere la inscripción de asignaturas por periodo académico diferenciándolas por componente de formación. Contiene información de prerrequisitos y correquisitos de cada asignatura y se puede conocer su código, número de créditos, intensidad horaria, horas de trabajo semanal fuera de clase y su respectivo contenido.',
                                    },
                                    {
                                        key: 'uso',
                                        title: '¿Para qué sirve?',
                                        content:
                                            'Las asignaturas se encuentran agrupadas en componentes de formación diferenciados por color. Al seleccionar cada asignatura se resaltan los prerrequisitos o correquisitos necesarios para cursarla. En los campos de Optativas o Libre Elección se listan las asignaturas ofertadas. Haz clic en los botones del footer para explorar la descripción y tabla de créditos de cada componente.',
                                    },
                                    {
                                        key: 'contacto',
                                        title: 'Información y contacto',
                                        content: `Si tienes inquietudes sobre este plan de estudios, puedes comunicarte con la Dirección del Programa Curricular de ${programa.Nombre_Programa} a través de los canales institucionales de la ${programa.Facultad}.`,
                                    },
                                ].map(({ key, title, content }) => (
                                    <div key={key}>
                                        <button
                                            className="flex w-full items-center justify-between px-8 py-4 text-left transition-colors hover:bg-slate-50"
                                            onClick={() =>
                                                setOpenAccordion(
                                                    openAccordion === key
                                                        ? null
                                                        : key,
                                                )
                                            }
                                        >
                                            <span className="text-sm font-black text-slate-800">
                                                {title}
                                            </span>
                                            <span
                                                className={`material-symbols-outlined !text-base text-slate-400 transition-transform duration-200 ${openAccordion === key ? 'rotate-180' : ''}`}
                                            >
                                                expand_more
                                            </span>
                                        </button>
                                        {openAccordion === key && (
                                            <div className="px-8 pb-5">
                                                <p className="text-sm leading-relaxed text-slate-600">
                                                    {content}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <SlotSelectorModal
                open={showElectivasModal}
                slot={null}
                items={electivas}
                loading={loadingElectivas}
                error={electivasErrorMsg}
                type="libre"
                onClose={() => setShowElectivasModal(false)}
            />

            <SlotSelectorModal
                open={showOptativasModal}
                slot={selectedOptativaSlot}
                items={flatOptativas}
                loading={loadingOptativas}
                error={optativasErrorMsg}
                type="optativa"
                onClose={() => {
                    setShowOptativasModal(false);
                    setSelectedOptativaSlot(null);
                }}
            />

            <MallaHistoryModal
                open={showHistoryModal}
                onClose={() => setShowHistoryModal(false)}
                versiones={versiones}
                currentVersionId={currentVersionId ?? 0}
                onSelectVersion={(id) => {
                    handleSelectVersion(id);
                    setShowHistoryModal(false);
                }}
                selectedForDiff={selectedForDiff}
                onToggleDiffSelection={handleToggleDiffSelection}
                onCompare={() => {
                    setShowHistoryModal(false);
                    handleCompare();
                }}
            />

            <MallaDiffView
                open={showDiffModal}
                onClose={() => {
                    setShowDiffModal(false);
                    setDiffData(null);
                    setHistorialRequisitos([]);
                }}
                diffData={diffData}
                loading={loadingDiff}
                historialRequisitos={historialRequisitos}
            />

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            `}</style>
        </div>
    );
}
