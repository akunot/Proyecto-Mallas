import { Head, Link } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import Layout from '@/Layout/MainLayout';

interface Asignatura {
    ID_Asignatura: number;
    Codigo_Asignatura: string;
    Nombre_Asignatura: string;
    Creditos_Asignatura: number;
}

interface OptativaCatalogo extends Asignatura {
    ID_Agrupacion: number | null;
    Nombre_Agrupacion: string;
}

interface AgrupacionOptativa {
    ID_Agrupacion: number;
    Nombre_Agrupacion: string;
    ID_Componente: number;
    asignaturas: Asignatura[];
}

interface AgrupacionDestino {
    ID_Agrupacion: number;
    Nombre_Agrupacion: string;
    ID_Componente: number;
}

interface Props {
    malla: {
        ID_Malla: number;
        Codigo_Plan: string;
        programa: {
            ID_Programa: number;
            Nombre_Programa: string;
        };
    };
}

// ─── Componente de barra de acción flotante ───────────────────────────────────
function ActionBar({
    count,
    agrupaciones,
    onAssign,
    onClear,
    loading,
}: {
    count: number;
    agrupaciones: AgrupacionDestino[];
    onAssign: (agrupacionId: number) => void;
    onClear: () => void;
    loading: boolean;
}) {
    const [agrupacionId, setAgrupacionId] = useState<number | ''>('');

    if (count === 0) {
return null;
}

    return (
        <div className="sticky bottom-4 z-20 mx-2">
            <div className="bg-[#00236f] text-white rounded-2xl shadow-2xl shadow-[#00236f]/30 px-4 py-3 flex items-center gap-3">
                <span className="bg-white/20 text-white text-xs font-black px-2.5 py-1 rounded-lg tabular-nums">
                    {count} seleccionada{count !== 1 ? 's' : ''}
                </span>
                <select
                    value={agrupacionId}
                    onChange={e => setAgrupacionId(Number(e.target.value) || '')}
                    className="flex-1 bg-white/10 border border-white/20 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-white/60 min-w-0"
                >
                    <option value="" className="text-slate-800">Elegir agrupación destino…</option>
                    {agrupaciones.map(ag => (
                        <option key={ag.ID_Agrupacion} value={ag.ID_Agrupacion} className="text-slate-800">
                            {ag.Nombre_Agrupacion}
                        </option>
                    ))}
                </select>
                <button
                    onClick={() => agrupacionId && onAssign(Number(agrupacionId))}
                    disabled={!agrupacionId || loading}
                    className="px-4 py-2 bg-white text-[#00236f] text-sm font-black rounded-xl hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
                >
                    {loading ? 'Asignando…' : 'Asignar'}
                </button>
                <button
                    onClick={onClear}
                    className="p-2 text-white/60 hover:text-white transition-colors shrink-0"
                    title="Cancelar selección"
                >
                    <span className="material-symbols-outlined !text-lg">close</span>
                </button>
            </div>
        </div>
    );
}

// ─── Barra de remoción masiva ─────────────────────────────────────────────────
function RemoveBar({
    count,
    onConfirm,
    onClear,
    loading,
}: {
    count: number;
    onConfirm: () => void;
    onClear: () => void;
    loading: boolean;
}) {
    if (count === 0) {
return null;
}

    return (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 mb-3">
            <span className="text-xs font-black text-rose-700 tabular-nums">
                {count} seleccionada{count !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-rose-500 flex-1">para remover</span>
            <button
                onClick={onConfirm}
                disabled={loading}
                className="px-3 py-1 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 disabled:opacity-40 transition-colors"
            >
                {loading ? 'Removiendo…' : 'Confirmar remoción'}
            </button>
            <button onClick={onClear} className="text-rose-400 hover:text-rose-600 transition-colors">
                <span className="material-symbols-outlined !text-sm">close</span>
            </button>
        </div>
    );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function OptativasAsignacion({ malla }: Props) {
    const [agrupaciones, setAgrupaciones] = useState<AgrupacionOptativa[]>([]);
    const [todasAgrupaciones, setTodasAgrupaciones] = useState<AgrupacionDestino[]>([]);
    const [catalogoOptativas, setCatalogoOptativas] = useState<OptativaCatalogo[]>([]);
    const [optativasLibres, setOptativasLibres] = useState<Asignatura[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Selección para asignación masiva (panel izquierdo)
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    // Selección para remoción masiva por agrupación (panel derecho)
    // Map de ID_Agrupacion → Set de IDs a remover
    const [removeSelections, setRemoveSelections] = useState<Map<number, Set<number>>>(new Map());

    // Búsqueda
    const [searchLeft, setSearchLeft] = useState('');
    const [searchRight, setSearchRight] = useState('');

    // Asignación individual
    const [selectedAsignatura, setSelectedAsignatura] = useState<number | null>(null);
    const [selectedAgrupacion, setSelectedAgrupacion] = useState<number | null>(null);

    const apiBase = `/api/v1/mallas/${malla.ID_Malla}`;

    const fetchData = async () => {
        setLoading(true);
        setError(null);

        try {
            const [agrupacionesRes, catalogoRes, sinAgrupacionRes, todasAgrupacionesRes] = await Promise.all([
                fetch(`${apiBase}/optativas-por-agrupacion`, {
                    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                    credentials: 'same-origin',
                }),
                fetch(`${apiBase}/optativas`, {
                    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                    credentials: 'same-origin',
                }),
                fetch(`${apiBase}/optativas-sin-agrupacion`, {
                    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                    credentials: 'same-origin',
                }),
                fetch(`${apiBase}/agrupaciones`, {
                    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                    credentials: 'same-origin',
                }),
            ]);

            if (agrupacionesRes.ok) {
                const data = await agrupacionesRes.json();
                setAgrupaciones(data.data ?? []);
            }

            if (catalogoRes.ok) {
                const data = await catalogoRes.json();
                const catalogo = (data.data ?? []).flatMap((group: { ID_Agrupacion: number | null; Nombre_Agrupacion: string; asignaturas: Asignatura[] }) =>
                    (group.asignaturas ?? [])
                        .map((asig) => {
                            const id = Number(asig.ID_Asignatura);

                            if (!Number.isFinite(id) || id <= 0) {
return null;
}

                            return {
                                ...asig,
                                ID_Asignatura: id,
                                ID_Agrupacion: group.ID_Agrupacion != null ? Number(group.ID_Agrupacion) : null,
                                Nombre_Agrupacion: group.Nombre_Agrupacion || 'Optativas',
                            };
                        })
                        .filter((item): item is OptativaCatalogo => item !== null)
                );
                setCatalogoOptativas(catalogo);
            }

            if (sinAgrupacionRes.ok) {
                const data = await sinAgrupacionRes.json();
                setOptativasLibres(
                    (data.data ?? [])
                        .map((asig: Asignatura) => {
                            const id = Number(asig.ID_Asignatura);

                            return Number.isFinite(id) && id > 0 ? { ...asig, ID_Asignatura: id } : null;
                        })
                        .filter((item: Asignatura | null): item is Asignatura => item !== null)
                );
            }

            if (todasAgrupacionesRes.ok) {
                const data = await todasAgrupacionesRes.json();
                setTodasAgrupaciones(data.data ?? []);
            }
        } catch {
            setError('Error de conexión al cargar datos.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
 fetchData(); 
}, []);

    // ── Helpers de selección ──────────────────────────────────────────────────
    const toggleLeft = (id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);

            return next;
        });
    };

    const toggleAllLeft = (ids: number[]) => {
        setSelectedIds(prev =>
            prev.size === ids.length ? new Set() : new Set(ids)
        );
    };

    const toggleRemove = (agrupacionId: number, asignaturaId: number) => {
        setRemoveSelections(prev => {
            const next = new Map(prev);
            const set = new Set(next.get(agrupacionId) ?? []);
            set.has(asignaturaId) ? set.delete(asignaturaId) : set.add(asignaturaId);

            if (set.size === 0) {
next.delete(agrupacionId);
} else {
next.set(agrupacionId, set);
}

            return next;
        });
    };

    const toggleAllRemove = (agrupacionId: number, ids: number[]) => {
        setRemoveSelections(prev => {
            const next = new Map(prev);
            const current = next.get(agrupacionId);

            if (current && current.size === ids.length) {
next.delete(agrupacionId);
} else {
next.set(agrupacionId, new Set(ids));
}

            return next;
        });
    };

    const clearRemove = (agrupacionId: number) => {
        setRemoveSelections(prev => {
            const next = new Map(prev);
            next.delete(agrupacionId);

            return next;
        });
    };

    // ── Acciones API ──────────────────────────────────────────────────────────
    const showSuccess = (msg: string) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(null), 4000);
    };

    const handleAsignar = async () => {
        if (!selectedAgrupacion || !selectedAsignatura) {
return;
}

        setActionLoading(true);
        setError(null);

        try {
            const res = await fetch(`${apiBase}/optativas/asignar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
                body: JSON.stringify({ ID_Agrupacion: Number(selectedAgrupacion), ID_Asignatura: Number(selectedAsignatura) }),
            });

            if (res.ok) {
                showSuccess('Optativa asignada correctamente.');
                setSelectedAsignatura(null);
                fetchData();
            } else {
                const err = await res.json();
                setError(err.message || 'Error al asignar.');
            }
        } catch {
 setError('Error de conexión.'); 
} finally {
 setActionLoading(false); 
}
    };

    const handleAsignarBatch = async (agrupacionId: number) => {
        const ids = Array.from(selectedIds).filter(id => Number.isFinite(id) && id > 0);

        if (!agrupacionId || ids.length === 0) {
return;
}

        setActionLoading(true);
        setError(null);

        try {
            const res = await fetch(`${apiBase}/optativas/asignar-batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
                body: JSON.stringify({ ID_Agrupacion: agrupacionId, ID_Asignaturas: ids }),
            });

            if (res.ok) {
                const data = await res.json();
                showSuccess(data.message || `${ids.length} optativas asignadas.`);
                setSelectedIds(new Set());
                fetchData();
            } else {
                const err = await res.json();
                setError(err.message || 'Error al asignar en lote.');
            }
        } catch {
 setError('Error de conexión.'); 
} finally {
 setActionLoading(false); 
}
    };

    const handleRemover = async (agrupacionId: number, asignaturaId: number) => {
        if (!confirm('¿Remover esta optativa de la agrupación?')) {
return;
}

        setActionLoading(true);
        setError(null);

        try {
            const res = await fetch(`${apiBase}/optativas/remover`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
                body: JSON.stringify({ ID_Agrupacion: agrupacionId, ID_Asignatura: asignaturaId }),
            });

            if (res.ok) {
 showSuccess('Optativa removida.'); fetchData(); 
} else {
 const err = await res.json(); setError(err.message || 'Error al remover.'); 
}
        } catch {
 setError('Error de conexión.'); 
} finally {
 setActionLoading(false); 
}
    };

    const handleRemoverBatch = async (agrupacionId: number) => {
        const ids = Array.from(removeSelections.get(agrupacionId) ?? []);

        if (ids.length === 0) {
return;
}

        if (!confirm(`¿Remover ${ids.length} optativa${ids.length !== 1 ? 's' : ''} de esta agrupación?`)) {
return;
}

        setActionLoading(true);
        setError(null);

        try {
            const res = await fetch(`${apiBase}/optativas/remover-batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
                body: JSON.stringify({ ID_Agrupacion: agrupacionId, ID_Asignaturas: ids }),
            });

            if (res.ok) {
                const data = await res.json();
                showSuccess(data.message || `${ids.length} optativas removidas.`);
                clearRemove(agrupacionId);
                fetchData();
            } else {
 const err = await res.json(); setError(err.message || 'Error al remover lote.'); 
}
        } catch {
 setError('Error de conexión.'); 
} finally {
 setActionLoading(false); 
}
    };

    // ── Filtrado ──────────────────────────────────────────────────────────────
    const filteredLibres = optativasLibres.filter(a =>
        !searchLeft ||
        a.Nombre_Asignatura.toLowerCase().includes(searchLeft.toLowerCase()) ||
        a.Codigo_Asignatura.toLowerCase().includes(searchLeft.toLowerCase())
    );

    const filteredAgrupaciones = agrupaciones.map(ag => ({
        ...ag,
        asignaturas: !searchRight ? ag.asignaturas : ag.asignaturas.filter(a =>
            a.Nombre_Asignatura.toLowerCase().includes(searchRight.toLowerCase()) ||
            a.Codigo_Asignatura.toLowerCase().includes(searchRight.toLowerCase())
        ),
    })).filter(ag => !searchRight || ag.asignaturas.length > 0);

    const totalAsignadas = agrupaciones.reduce((sum, ag) => sum + ag.asignaturas.length, 0);

    return (
        <Layout>
            <Head title={`Asignación de Optativas - ${malla.programa.Nombre_Programa}`} />

            <div className="max-w-[1440px] mx-auto space-y-6 pb-10">

                {/* ── Header ── */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-400 text-[11px] font-bold uppercase tracking-widest">
                            <Link href="/mallas" className="hover:text-[#00236f] transition-colors">Mallas</Link>
                            <span className="material-symbols-outlined !text-xs">chevron_right</span>
                            <Link href={`/mallas/${malla.ID_Malla}`} className="hover:text-[#00236f] transition-colors">
                                {malla.programa.Nombre_Programa}
                            </Link>
                            <span className="material-symbols-outlined !text-xs">chevron_right</span>
                            <span className="text-[#00236f]">Optativas</span>
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                            Asignación de Optativas
                        </h1>
                        <p className="text-slate-500 text-sm">
                            Plan <strong className="text-slate-700">{malla.Codigo_Plan}</strong>
                            {' · '}
                            <span>{optativasLibres.length} sin asignar</span>
                            {' · '}
                            <span>{totalAsignadas} asignadas</span>
                        </p>
                    </div>
                </div>

                {/* ── Mensajes ── */}
                {error && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 px-5 py-3.5 rounded-2xl text-sm font-medium flex items-center gap-3">
                        <span className="material-symbols-outlined !text-lg shrink-0">error_outline</span>
                        <span className="flex-1">{error}</span>
                        <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600 shrink-0">
                            <span className="material-symbols-outlined !text-lg">close</span>
                        </button>
                    </div>
                )}
                {successMsg && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-5 py-3.5 rounded-2xl text-sm font-medium flex items-center gap-3">
                        <span className="material-symbols-outlined !text-lg shrink-0">check_circle</span>
                        <span className="flex-1">{successMsg}</span>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-24 text-slate-400">
                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600 mr-3" />
                        <span className="text-sm">Cargando datos…</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

                        {/* ══════════════════════════════════════════════════════
                            PANEL IZQUIERDO — Optativas sin agrupación
                        ══════════════════════════════════════════════════════ */}
                        <div className="lg:col-span-2 flex flex-col gap-4">

                            {/* Tabla principal */}
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">

                                {/* Cabecera */}
                                <div className="px-5 pt-5 pb-3 border-b border-slate-100">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                                                <span className="material-symbols-outlined !text-base text-amber-600">inbox</span>
                                            </div>
                                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Sin agrupación</h3>
                                        </div>
                                        <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                                            {optativasLibres.length} optativas
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined !text-base text-slate-400">search</span>
                                        <input
                                            type="text"
                                            placeholder="Buscar por nombre o código…"
                                            value={searchLeft}
                                            onChange={e => setSearchLeft(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#00236f]/50 focus:bg-white transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Tabla */}
                                <div className="overflow-y-auto" style={{ maxHeight: '420px' }}>
                                    {filteredLibres.length === 0 ? (
                                        <div className="p-10 text-center">
                                            <span className="material-symbols-outlined !text-4xl text-slate-300 block mb-2">
                                                {optativasLibres.length === 0 ? 'check_circle' : 'search_off'}
                                            </span>
                                            <p className="text-sm text-slate-400">
                                                {optativasLibres.length === 0
                                                    ? 'Todas las optativas están asignadas'
                                                    : 'Sin resultados para esa búsqueda'}
                                            </p>
                                        </div>
                                    ) : (
                                        <table className="w-full text-left">
                                            <thead className="sticky top-0 bg-white z-10 border-b border-slate-100">
                                                <tr>
                                                    <th className="px-4 py-2.5 w-10">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.size === filteredLibres.length && filteredLibres.length > 0}
                                                            onChange={() => toggleAllLeft(filteredLibres.map(a => a.ID_Asignatura))}
                                                            className="rounded border-slate-300 text-amber-500 focus:ring-amber-400 cursor-pointer"
                                                        />
                                                    </th>
                                                    <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Código</th>
                                                    <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Nombre</th>
                                                    <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Cr.</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredLibres.map((asig, i) => (
                                                    <tr
                                                        key={asig.ID_Asignatura}
                                                        onClick={() => toggleLeft(asig.ID_Asignatura)}
                                                        className={`cursor-pointer transition-colors border-b border-slate-50 last:border-0
                                                            ${selectedIds.has(asig.ID_Asignatura)
                                                                ? 'bg-amber-50 hover:bg-amber-50/80'
                                                                : i % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-100/50'
                                                            }`}
                                                    >
                                                        <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedIds.has(asig.ID_Asignatura)}
                                                                onChange={() => toggleLeft(asig.ID_Asignatura)}
                                                                className="rounded border-slate-300 text-amber-500 focus:ring-amber-400 cursor-pointer"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">{asig.Codigo_Asignatura}</td>
                                                        <td className="px-3 py-2.5 text-sm text-slate-800 font-medium">{asig.Nombre_Asignatura}</td>
                                                        <td className="px-3 py-2.5 text-center text-sm text-slate-500 tabular-nums">{asig.Creditos_Asignatura}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>

                                {/* Barra de acción flotante */}
                                <ActionBar
                                    count={selectedIds.size}
                                    agrupaciones={todasAgrupaciones}
                                    onAssign={handleAsignarBatch}
                                    onClear={() => setSelectedIds(new Set())}
                                    loading={actionLoading}
                                />
                            </div>

                            {/* Asignación individual */}
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-3">
                                <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                    <span className="material-symbols-outlined !text-sm">add_circle_outline</span>
                                    Asignación individual
                                </h4>
                                <div className="space-y-2">
                                    <select
                                        value={selectedAsignatura ?? ''}
                                        onChange={e => setSelectedAsignatura(Number(e.target.value) || null)}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#00236f]/50 focus:bg-white transition-all"
                                    >
                                        <option value="">Seleccionar materia…</option>
                                        {catalogoOptativas.map(asig => (
                                            <option key={asig.ID_Asignatura} value={asig.ID_Asignatura}>
                                                {asig.Codigo_Asignatura} — {asig.Nombre_Asignatura}
                                                {asig.ID_Agrupacion ? ` · ${asig.Nombre_Agrupacion}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={selectedAgrupacion ?? ''}
                                        onChange={e => setSelectedAgrupacion(Number(e.target.value) || null)}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#00236f]/50 focus:bg-white transition-all"
                                    >
                                        <option value="">Elegir agrupación destino…</option>
                                        {todasAgrupaciones.map(ag => (
                                            <option key={ag.ID_Agrupacion} value={ag.ID_Agrupacion}>{ag.Nombre_Agrupacion}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={handleAsignar}
                                        disabled={!selectedAgrupacion || !selectedAsignatura || actionLoading}
                                        className="w-full px-4 py-2.5 bg-[#00236f] text-white rounded-xl text-sm font-bold hover:bg-[#002d8a] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                    >
                                        {actionLoading ? 'Asignando…' : 'Asignar materia'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ══════════════════════════════════════════════════════
                            PANEL DERECHO — Optativas por agrupación
                        ══════════════════════════════════════════════════════ */}
                        <div className="lg:col-span-3">
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">

                                {/* Cabecera */}
                                <div className="px-5 pt-5 pb-3 border-b border-slate-100">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                                                <span className="material-symbols-outlined !text-base text-[#00236f]">account_tree</span>
                                            </div>
                                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Por agrupación</h3>
                                        </div>
                                        <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                                            {totalAsignadas} en {agrupaciones.length} agrupaciones
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined !text-base text-slate-400">search</span>
                                        <input
                                            type="text"
                                            placeholder="Filtrar materias en agrupaciones…"
                                            value={searchRight}
                                            onChange={e => setSearchRight(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#00236f]/50 focus:bg-white transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Lista de agrupaciones */}
                                <div className="overflow-y-auto divide-y divide-slate-100" style={{ maxHeight: '680px' }}>
                                    {filteredAgrupaciones.length === 0 ? (
                                        <div className="p-12 text-center">
                                            <span className="material-symbols-outlined !text-4xl text-slate-300 block mb-2">
                                                {agrupaciones.length === 0 ? 'category' : 'search_off'}
                                            </span>
                                            <p className="text-sm text-slate-400">
                                                {agrupaciones.length === 0
                                                    ? 'No hay optativas asignadas a ninguna agrupación'
                                                    : 'Sin resultados para esa búsqueda'}
                                            </p>
                                        </div>
                                    ) : (
                                        filteredAgrupaciones.map(ag => {
                                            const removeSet = removeSelections.get(ag.ID_Agrupacion) ?? new Set<number>();
                                            const removeCount = removeSet.size;
                                            const allIds = ag.asignaturas.map(a => a.ID_Asignatura);

                                            return (
                                                <div key={ag.ID_Agrupacion} className="p-5">
                                                    {/* Encabezado de agrupación */}
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-sm font-black text-slate-800">{ag.Nombre_Agrupacion}</h4>
                                                            <span className="px-2 py-0.5 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 tabular-nums">
                                                                {ag.asignaturas.length}
                                                            </span>
                                                        </div>
                                                        {ag.asignaturas.length > 0 && (
                                                            <button
                                                                onClick={() => toggleAllRemove(ag.ID_Agrupacion, allIds)}
                                                                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                                                                    removeCount === allIds.length && allIds.length > 0
                                                                        ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                                                                        : 'bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600'
                                                                }`}
                                                            >
                                                                {removeCount === allIds.length && allIds.length > 0
                                                                    ? 'Deseleccionar todas'
                                                                    : 'Seleccionar todas'}
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Barra de remoción */}
                                                    <RemoveBar
                                                        count={removeCount}
                                                        onConfirm={() => handleRemoverBatch(ag.ID_Agrupacion)}
                                                        onClear={() => clearRemove(ag.ID_Agrupacion)}
                                                        loading={actionLoading}
                                                    />

                                                    {/* Tabla de materias */}
                                                    {ag.asignaturas.length === 0 ? (
                                                        <p className="text-xs text-slate-400 italic">Sin optativas asignadas</p>
                                                    ) : (
                                                        <table className="w-full text-left">
                                                            <thead>
                                                                <tr className="border-b border-slate-100">
                                                                    <th className="px-3 py-2 w-10">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={removeCount === allIds.length && allIds.length > 0}
                                                                            onChange={() => toggleAllRemove(ag.ID_Agrupacion, allIds)}
                                                                            className="rounded border-slate-300 text-rose-500 focus:ring-rose-400 cursor-pointer"
                                                                        />
                                                                    </th>
                                                                    <th className="px-2 py-2 text-[9px] font-black text-slate-400 uppercase">Código</th>
                                                                    <th className="px-2 py-2 text-[9px] font-black text-slate-400 uppercase">Nombre</th>
                                                                    <th className="px-2 py-2 text-[9px] font-black text-slate-400 uppercase text-center">Cr.</th>
                                                                    <th className="px-2 py-2 w-8"></th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {ag.asignaturas.map((asig, i) => (
                                                                    <tr
                                                                        key={asig.ID_Asignatura}
                                                                        onClick={() => toggleRemove(ag.ID_Agrupacion, asig.ID_Asignatura)}
                                                                        className={`cursor-pointer transition-colors border-b border-slate-50 last:border-0
                                                                            ${removeSet.has(asig.ID_Asignatura)
                                                                                ? 'bg-rose-50/60 hover:bg-rose-50'
                                                                                : i % 2 === 0 ? 'hover:bg-slate-50' : 'bg-slate-50/40 hover:bg-slate-100/50'
                                                                            }`}
                                                                    >
                                                                        <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={removeSet.has(asig.ID_Asignatura)}
                                                                                onChange={() => toggleRemove(ag.ID_Agrupacion, asig.ID_Asignatura)}
                                                                                className="rounded border-slate-300 text-rose-500 focus:ring-rose-400 cursor-pointer"
                                                                            />
                                                                        </td>
                                                                        <td className="px-2 py-2 font-mono text-[11px] text-slate-500 whitespace-nowrap">{asig.Codigo_Asignatura}</td>
                                                                        <td className="px-2 py-2 text-sm text-slate-800 font-medium">{asig.Nombre_Asignatura}</td>
                                                                        <td className="px-2 py-2 text-center text-sm text-slate-500 tabular-nums">{asig.Creditos_Asignatura}</td>
                                                                        <td className="px-2 py-2 text-right" onClick={e => e.stopPropagation()}>
                                                                            <button
                                                                                onClick={() => handleRemover(ag.ID_Agrupacion, asig.ID_Asignatura)}
                                                                                disabled={actionLoading}
                                                                                title="Remover de esta agrupación"
                                                                                className="p-1 text-slate-300 hover:text-rose-500 transition-colors disabled:opacity-40"
                                                                            >
                                                                                <span className="material-symbols-outlined !text-base">remove_circle_outline</span>
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </Layout>
    );
}