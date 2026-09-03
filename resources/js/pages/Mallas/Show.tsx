import { Head, Link } from '@inertiajs/react';
import { useMemo } from 'react';
import Layout from '@/Layout/MainLayout';

interface Asignatura {
    ID_Asignatura: number;
    Nombre_Asignatura: string;
    Codigo_Asignatura: string;
    Creditos_Asignatura: number;
    pivot: {
        Semestre_Sugerido: number;
        Tipo_Asignatura: string;
    };
}

interface Agrupacion {
    ID_Agrupacion: number;
    Nombre_Agrupacion: string;
    asignaturas: Asignatura[];
}

interface Props {
    malla: {
        ID_Malla: number;
        Codigo_Plan: string;
        programa: {
            Nombre_Programa: string;
        };
        agrupaciones: Agrupacion[];
    };
}

const getTipoBadge = (tipo: string) => {
    const config: Record<string, { bg: string; text: string }> = {
        obligatoria: { bg: 'bg-gray-100', text: 'text-gray-700' },
        optativa: { bg: 'bg-gray-50', text: 'text-gray-600' },
        electiva: { bg: 'bg-gray-50', text: 'text-gray-600' },
        libre: { bg: 'bg-gray-50', text: 'text-gray-600' },
    };
    const c = config[tipo.toLowerCase()] ?? {
        bg: 'bg-gray-50',
        text: 'text-gray-600',
    };

    return (
        <span
            className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${c.bg} ${c.text}`}
        >
            {tipo}
        </span>
    );
};

const StatusPill = ({ tipo }: { tipo: string }) => {
    const config: Record<string, string> = {
        obligatoria: 'bg-blue-50 text-blue-700 border-blue-100',
        optativa: 'bg-amber-50 text-amber-700 border-amber-100',
        electiva: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        libre: 'bg-slate-100 text-slate-600 border-slate-200',
    };
    const style = config[tipo.toLowerCase()] || config.libre;

    return <span className={`type-pill ${style}`}>{tipo}</span>;
};

export default function MallaShow({ malla }: Props) {
    // Cálculo de estadísticas globales para el Dashboard.
    // Importante: dedupe por ID_Asignatura porque la misma asignatura puede
    // aparecer en varias agrupaciones (p.ej. una optativa listada en su
    // agrupación de origen Y en Libre Elección). Sin dedupe, sus créditos
    // se contarían dos veces — mismo patrón aplicado en
    // resources/js/pages/Mallas/DetallePublico.tsx (creditosPorComponente).
    const stats = useMemo(() => {
        const seenAsignaturas = new Set<number>();
        let totalCreditos = 0;
        let totalMaterias = 0;
        malla.agrupaciones.forEach((ag) => {
            ag.asignaturas.forEach((as) => {
                if (seenAsignaturas.has(as.ID_Asignatura)) {
                    return;
                }
                seenAsignaturas.add(as.ID_Asignatura);
                totalMaterias += 1;
                totalCreditos += as.Creditos_Asignatura;
            });
        });

        return { totalCreditos, totalMaterias };
    }, [malla]);

    return (
        <Layout>
            <Head
                title={`${malla.programa.Nombre_Programa}${malla.Codigo_Plan ? ` - Plan ${malla.Codigo_Plan}` : ''}`}
            />

            <div className="mx-auto max-w-[1400px] space-y-8 pb-12">
                {/* 1. Header & Navigation */}
                <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/mallas"
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition-all hover:border-[#00236f] hover:text-[#00236f] active:scale-90"
                        >
                            <span className="material-symbols-outlined">
                                arrow_back
                            </span>
                        </Link>
                        <div>
                            <div className="mb-1 flex items-center gap-2">
                                <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-black tracking-widest text-[#00236f] uppercase">
                                    Plan {malla.Codigo_Plan}
                                </span>
                                <span className="text-xs text-slate-300">
                                    |
                                </span>
                                <span className="text-xs font-medium text-slate-500">
                                    Sede Manizales
                                </span>
                            </div>
                            <h1 className="text-3xl leading-none font-black tracking-tight text-slate-900">
                                {malla.programa.Nombre_Programa}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href={`/mallas/${malla.ID_Malla}/optativas-asignacion`}
                            className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-6 py-3 font-bold text-amber-700 transition-all hover:scale-[1.02] hover:bg-amber-100 active:scale-95"
                        >
                            <span className="material-symbols-outlined !text-xl">
                                playlist_add_check
                            </span>
                            Asignar Optativas
                        </Link>
                        <Link
                            href={`/mallas/${malla.ID_Malla}/grafica`}
                            className="flex items-center gap-2 rounded-xl bg-[#00236f] px-6 py-3 font-bold text-white shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-95"
                        >
                            <span className="material-symbols-outlined !text-xl">
                                account_tree
                            </span>
                            Visualizar Gráfica Malla
                        </Link>
                    </div>
                </div>

                {/* 2. Stats Dashboard (Resumen de Malla) */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <span className="material-symbols-outlined !text-3xl">
                                school
                            </span>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                                Total Créditos
                            </p>
                            <p className="text-2xl font-black text-slate-900">
                                {stats.totalCreditos}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <span className="material-symbols-outlined !text-3xl">
                                auto_stories
                            </span>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                                Asignaturas
                            </p>
                            <p className="text-2xl font-black text-slate-900">
                                {stats.totalMaterias}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 3. Estructura de la Malla (Cards por Agrupación) */}
                <div className="space-y-8">
                    {malla.agrupaciones
                        .filter((agrup) => agrup.asignaturas.length > 0)
                        .map((agrup) => {
                            // Dedupe por ID_Asignatura dentro de la agrupación
                            // para evitar contar dos veces créditos si la misma
                            // materia aparece repetida en esta agrupación.
                            const seenInAgrup = new Set<number>();
                            const areaCreditos = agrup.asignaturas.reduce(
                                (s, a) => {
                                    if (seenInAgrup.has(a.ID_Asignatura)) {
                                        return s;
                                    }
                                    seenInAgrup.add(a.ID_Asignatura);

                                    return s + a.Creditos_Asignatura;
                                },
                                0,
                            );

                            return (
                                <section
                                    key={agrup.ID_Agrupacion}
                                    className="component-card"
                                >
                                    {/* Cabecera del Componente */}
                                    <div className="flex flex-col justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-2 rounded-full bg-[#00236f]" />
                                            <h2 className="text-lg font-black tracking-tight text-slate-800 uppercase">
                                                {agrup.Nombre_Agrupacion}
                                            </h2>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-[9px] leading-none font-black tracking-widest text-slate-400 uppercase">
                                                    Subtotal Créditos
                                                </p>
                                                <p className="mt-1 text-lg leading-none font-black text-[#00236f]">
                                                    {areaCreditos}
                                                </p>
                                            </div>
                                            <div className="hidden h-8 w-[1px] bg-slate-200 sm:block" />
                                            <div className="text-right">
                                                <p className="text-[9px] leading-none font-black tracking-widest text-slate-400 uppercase">
                                                    Materias
                                                </p>
                                                <p className="mt-1 text-lg leading-none font-black text-slate-700">
                                                    {agrup.asignaturas.length}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tabla de Asignaturas */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-slate-100 bg-white">
                                                    <th className="px-8 py-3 text-[10px] font-black tracking-[2px] text-slate-400 uppercase">
                                                        Código
                                                    </th>
                                                    <th className="px-8 py-3 text-[10px] font-black tracking-[2px] text-slate-400 uppercase">
                                                        Asignatura
                                                    </th>
                                                    <th className="px-8 py-3 text-center text-[10px] font-black tracking-[2px] text-slate-400 uppercase">
                                                        Créditos
                                                    </th>
                                                    <th className="px-8 py-3 text-[10px] font-black tracking-[2px] text-slate-400 uppercase">
                                                        Naturaleza
                                                    </th>
                                                    <th className="px-8 py-3 text-right text-[10px] font-black tracking-[2px] text-slate-400 uppercase">
                                                        Semestre Sugerido
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {agrup.asignaturas.map(
                                                    (asig) => (
                                                        <tr
                                                            key={
                                                                asig.ID_Asignatura
                                                            }
                                                            className="asig-row group"
                                                        >
                                                            <td className="px-8 py-4">
                                                                <span className="font-mono text-sm font-medium text-slate-400 group-hover:text-blue-600">
                                                                    {
                                                                        asig.Codigo_Asignatura
                                                                    }
                                                                </span>
                                                            </td>
                                                            <td className="px-8 py-4">
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-bold text-slate-800">
                                                                        {
                                                                            asig.Nombre_Asignatura
                                                                        }
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-4 text-center">
                                                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-black text-slate-700 ring-1 ring-slate-200">
                                                                    {
                                                                        asig.Creditos_Asignatura
                                                                    }
                                                                </span>
                                                            </td>
                                                            <td className="px-8 py-4">
                                                                <StatusPill
                                                                    tipo={
                                                                        asig
                                                                            .pivot
                                                                            .Tipo_Asignatura
                                                                    }
                                                                />
                                                            </td>
                                                            <td className="px-8 py-4 text-right">
                                                                <span className="rounded-full border border-slate-100 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-500">
                                                                    Semestre{' '}
                                                                    {
                                                                        asig
                                                                            .pivot
                                                                            .Semestre_Sugerido
                                                                    }
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ),
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                            );
                        })}
                </div>
            </div>
        </Layout>
    );
}
