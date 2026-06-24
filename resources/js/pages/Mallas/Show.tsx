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
        optativa:    { bg: 'bg-gray-50',  text: 'text-gray-600' },
        electiva:    { bg: 'bg-gray-50',  text: 'text-gray-600' },
        libre:       { bg: 'bg-gray-50',  text: 'text-gray-600' },
    };
    const c = config[tipo.toLowerCase()] ?? { bg: 'bg-gray-50', text: 'text-gray-600' };

    return (
        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${c.bg} ${c.text}`}>
            {tipo}
        </span>
    );
};

const StatusPill = ({ tipo }: { tipo: string }) => {
    const config: Record<string, string> = {
        obligatoria: "bg-blue-50 text-blue-700 border-blue-100",
        optativa: "bg-amber-50 text-amber-700 border-amber-100",
        electiva: "bg-emerald-50 text-emerald-700 border-emerald-100",
        libre: "bg-slate-100 text-slate-600 border-slate-200",
    };
    const style = config[tipo.toLowerCase()] || config.libre;

    return <span className={`type-pill ${style}`}>{tipo}</span>;
};

export default function MallaShow({ malla }: Props) {
    // Cálculo de estadísticas globales para el Dashboard
    const stats = useMemo(() => {
        let totalCreditos = 0;
        let totalMaterias = 0;
        malla.agrupaciones.forEach(ag => {
            totalMaterias += ag.asignaturas.length;
            ag.asignaturas.forEach(as => totalCreditos += as.Creditos_Asignatura);
        });

        return { totalCreditos, totalMaterias };
    }, [malla]);

    return (
        <Layout>
            <Head title={`Plan ${malla.Codigo_Plan} - ${malla.programa.Nombre_Programa}`} />

            <div className="max-w-[1400px] mx-auto space-y-8 pb-12">
                
                {/* 1. Header & Navigation */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/mallas"
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-[#00236f] hover:border-[#00236f] transition-all shadow-sm active:scale-90"
                        >
                            <span className="material-symbols-outlined">arrow_back</span>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="bg-blue-100 text-[#00236f] text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">
                                    Plan {malla.Codigo_Plan}
                                </span>
                                <span className="text-slate-300 text-xs">|</span>
                                <span className="text-slate-500 text-xs font-medium">Sede Manizales</span>
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
                                {malla.programa.Nombre_Programa}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href={`/mallas/${malla.ID_Malla}/optativas-asignacion`}
                            className="flex items-center gap-2 px-6 py-3 bg-amber-50 text-amber-700 rounded-xl font-bold hover:bg-amber-100 hover:scale-[1.02] active:scale-95 transition-all border border-amber-200"
                        >
                            <span className="material-symbols-outlined !text-xl">playlist_add_check</span>
                            Asignar Optativas
                        </Link>
                        <Link
                            href={`/mallas/${malla.ID_Malla}/grafica`}
                            className="flex items-center gap-2 px-6 py-3 bg-[#00236f] text-white rounded-xl font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-blue-900/20"
                        >
                            <span className="material-symbols-outlined !text-xl">account_tree</span>
                            Visualizar Gráfica Malla
                        </Link>
                    </div>
                </div>

                {/* 2. Stats Dashboard (Resumen de Malla) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <span className="material-symbols-outlined !text-3xl">school</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Créditos</p>
                            <p className="text-2xl font-black text-slate-900">{stats.totalCreditos}</p>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <span className="material-symbols-outlined !text-3xl">auto_stories</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Asignaturas</p>
                            <p className="text-2xl font-black text-slate-900">{stats.totalMaterias}</p>
                        </div>
                    </div>
                </div>

                {/* 3. Estructura de la Malla (Cards por Agrupación) */}
                <div className="space-y-8">
                    {malla.agrupaciones
                        .filter((agrup) => agrup.asignaturas.length > 0)
                        .map((agrup) => {
                            const areaCreditos = agrup.asignaturas.reduce((s, a) => s + a.Creditos_Asignatura, 0);

                            return (
                                <section key={agrup.ID_Agrupacion} className="component-card">
                                    {/* Cabecera del Componente */}
                                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-8 bg-[#00236f] rounded-full" />
                                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                                                {agrup.Nombre_Agrupacion}
                                            </h2>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Subtotal Créditos</p>
                                                <p className="text-lg font-black text-[#00236f] leading-none mt-1">{areaCreditos}</p>
                                            </div>
                                            <div className="h-8 w-[1px] bg-slate-200 hidden sm:block" />
                                            <div className="text-right">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Materias</p>
                                                <p className="text-lg font-black text-slate-700 leading-none mt-1">{agrup.asignaturas.length}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tabla de Asignaturas */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-slate-100 bg-white">
                                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-[2px]">Código</th>
                                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-[2px]">Asignatura</th>
                                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-[2px] text-center">Créditos</th>
                                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-[2px]">Naturaleza</th>
                                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-[2px] text-right">Semestre Sugerido</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {agrup.asignaturas.map((asig) => (
                                                    <tr key={asig.ID_Asignatura} className="asig-row group">
                                                        <td className="px-8 py-4">
                                                            <span className="font-mono text-sm text-slate-400 font-medium group-hover:text-blue-600">
                                                                {asig.Codigo_Asignatura}
                                                            </span>
                                                        </td>
                                                        <td className="px-8 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-bold text-slate-800">
                                                                    {asig.Nombre_Asignatura}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-4 text-center">
                                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-700 text-xs font-black ring-1 ring-slate-200">
                                                                {asig.Creditos_Asignatura}
                                                            </span>
                                                        </td>
                                                        <td className="px-8 py-4">
                                                            <StatusPill tipo={asig.pivot.Tipo_Asignatura} />
                                                        </td>
                                                        <td className="px-8 py-4 text-right">
                                                            <span className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                                                                Semestre {asig.pivot.Semestre_Sugerido}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
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