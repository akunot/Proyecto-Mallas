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

    if (count === 0) return null;

    return (
        <div className="sticky bottom-4 z-20 mx-2 transition-all">
            <div className="flex items-center gap-3 rounded-xl border border-brick/15 bg-white px-4 py-3 shadow-lg shadow-brick/8">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-brick px-2.5 py-1 text-xs font-bold text-white tabular-nums">
                    <span className="material-symbols-outlined !text-sm">
                        checklist
                    </span>
                    {count}
                </span>
                <select
                    value={agrupacionId}
                    onChange={(e) =>
                        setAgrupacionId(Number(e.target.value) || '')
                    }
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition-colors focus:border-brick/50 focus:bg-white focus:outline-none"
                >
                    <option value="" className="text-slate-500">
                        Elegir agrupación destino…
                    </option>
                    {agrupaciones.map((ag) => (
                        <option
                            key={ag.ID_Agrupacion}
                            value={ag.ID_Agrupacion}
                            className="text-slate-800"
                        >
                            {ag.Nombre_Agrupacion}
                        </option>
                    ))}
                </select>
                <button
                    onClick={() =>
                        agrupacionId && onAssign(Number(agrupacionId))
                    }
                    disabled={!agrupacionId || loading}
                    className="shrink-0 rounded-lg bg-brick px-4 py-2 text-sm font-bold text-white transition-all hover:bg-brick/90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {loading ? 'Asignando…' : 'Asignar'}
                </button>
                <button
                    onClick={onClear}
                    className="shrink-0 p-1.5 text-slate-400 transition-colors hover:text-slate-600"
                    title="Cancelar selección"
                >
                    <span className="material-symbols-outlined !text-lg">
                        close
                    </span>
                </button>
            </div>
        </div>
    );
}

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
    if (count === 0) return null;

    return (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-brick/20 bg-brick-light/60 px-3 py-2">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-brick tabular-nums">
                <span className="material-symbols-outlined !text-sm">
                    remove_circle
                </span>
                {count}
            </span>
            <span className="flex-1 text-xs text-brick/70">
                seleccionada{count !== 1 ? 's' : ''} para remover
            </span>
            <button
                onClick={onConfirm}
                disabled={loading}
                className="rounded-lg bg-brick px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-brick/90 disabled:opacity-40"
            >
                {loading ? 'Removiendo…' : 'Confirmar remoción'}
            </button>
            <button
                onClick={onClear}
                className="text-brick/50 transition-colors hover:text-brick"
            >
                <span className="material-symbols-outlined !text-sm">
                    close
                </span>
            </button>
        </div>
    );
}

function EmptyState({
    icon,
    message,
    submessage,
}: {
    icon: string;
    message: string;
    submessage?: string;
}) {
    return (
        <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <span className="material-symbols-outlined mb-3 block !text-5xl text-slate-300">
                {icon}
            </span>
            <p className="text-sm font-medium text-slate-500">{message}</p>
            {submessage && (
                <p className="mt-1 text-xs text-slate-400">{submessage}</p>
            )}
        </div>
    );
}

export default function OptativasAsignacion({ malla }: Props) {
    const [agrupaciones, setAgrupaciones] = useState<AgrupacionOptativa[]>([]);
    const [todasAgrupaciones, setTodasAgrupaciones] = useState<
        AgrupacionDestino[]
    >([]);
    const [catalogoOptativas, setCatalogoOptativas] = useState<
        OptativaCatalogo[]
    >([]);
    const [optativasLibres, setOptativasLibres] = useState<Asignatura[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [removeSelections, setRemoveSelections] = useState<
        Map<number, Set<number>>
    >(new Map());

    const [searchLeft, setSearchLeft] = useState('');
    const [searchRight, setSearchRight] = useState('');

    const [selectedAsignatura, setSelectedAsignatura] = useState<number | null>(
        null,
    );
    const [selectedAgrupacion, setSelectedAgrupacion] = useState<number | null>(
        null,
    );

    const apiBase = `/api/v1/mallas/${malla.ID_Malla}`;

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            await refreshData();
        } catch {
            setError('Error de conexión al cargar datos.');
        } finally {
            setLoading(false);
        }
    };

    const refreshData = async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        try {
            const [
                agrupacionesRes,
                catalogoRes,
                sinAgrupacionRes,
                todasAgrupacionesRes,
            ] = await Promise.all([
                fetch(`${apiBase}/optativas-por-agrupacion`, {
                    signal: controller.signal,
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'same-origin',
                }),
                fetch(`${apiBase}/optativas`, {
                    signal: controller.signal,
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'same-origin',
                }),
                fetch(`${apiBase}/optativas-sin-agrupacion`, {
                    signal: controller.signal,
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'same-origin',
                }),
                fetch(`${apiBase}/agrupaciones`, {
                    signal: controller.signal,
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'same-origin',
                }),
            ]);

            if (agrupacionesRes.ok) {
                const data = await agrupacionesRes.json();
                setAgrupaciones(data.data ?? []);
            }
            if (catalogoRes.ok) {
                const data = await catalogoRes.json();
                const catalogo = (data.data ?? []).flatMap(
                    (group: {
                        ID_Agrupacion: number | null;
                        Nombre_Agrupacion: string;
                        asignaturas: Asignatura[];
                    }) =>
                        (group.asignaturas ?? [])
                            .map((asig) => {
                                const id = Number(asig.ID_Asignatura);
                                if (!Number.isFinite(id) || id <= 0)
                                    return null;
                                return {
                                    ...asig,
                                    ID_Asignatura: id,
                                    ID_Agrupacion:
                                        group.ID_Agrupacion != null
                                            ? Number(group.ID_Agrupacion)
                                            : null,
                                    Nombre_Agrupacion:
                                        group.Nombre_Agrupacion || 'Optativas',
                                };
                            })
                            .filter(
                                (item): item is OptativaCatalogo =>
                                    item !== null,
                            ),
                );
                setCatalogoOptativas(catalogo);
            }
            if (sinAgrupacionRes.ok) {
                const data = await sinAgrupacionRes.json();
                setOptativasLibres(
                    (data.data ?? [])
                        .map((asig: Asignatura) => {
                            const id = Number(asig.ID_Asignatura);
                            return Number.isFinite(id) && id > 0
                                ? { ...asig, ID_Asignatura: id }
                                : null;
                        })
                        .filter(
                            (item: Asignatura | null): item is Asignatura =>
                                item !== null,
                        ),
                );
            }
            if (todasAgrupacionesRes.ok) {
                const data = await todasAgrupacionesRes.json();
                setTodasAgrupaciones(data.data ?? []);
            }
        } catch {
            setError('Error de conexión al cargar datos.');
        } finally {
            clearTimeout(timeout);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const toggleLeft = (id: number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAllLeft = (ids: number[]) => {
        setSelectedIds((prev) =>
            prev.size === ids.length ? new Set() : new Set(ids),
        );
    };

    const toggleRemove = (agrupacionId: number, asignaturaId: number) => {
        setRemoveSelections((prev) => {
            const next = new Map(prev);
            const set = new Set(next.get(agrupacionId) ?? []);
            set.has(asignaturaId)
                ? set.delete(asignaturaId)
                : set.add(asignaturaId);
            if (set.size === 0) next.delete(agrupacionId);
            else next.set(agrupacionId, set);
            return next;
        });
    };

    const toggleAllRemove = (agrupacionId: number, ids: number[]) => {
        setRemoveSelections((prev) => {
            const next = new Map(prev);
            const current = next.get(agrupacionId);
            if (current && current.size === ids.length)
                next.delete(agrupacionId);
            else next.set(agrupacionId, new Set(ids));
            return next;
        });
    };

    const clearRemove = (agrupacionId: number) => {
        setRemoveSelections((prev) => {
            const next = new Map(prev);
            next.delete(agrupacionId);
            return next;
        });
    };

    const showSuccess = (msg: string) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(null), 4000);
    };

    const handleAsignar = async () => {
        if (!selectedAgrupacion || !selectedAsignatura) return;
        setActionLoading(true);
        setError(null);
        try {
            const res = await fetch(`${apiBase}/optativas/asignar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    ID_Agrupacion: Number(selectedAgrupacion),
                    ID_Asignatura: Number(selectedAsignatura),
                }),
            });
            if (res.ok) {
                showSuccess('Optativa asignada correctamente.');
                setSelectedAsignatura(null);
                refreshData();
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
        const ids = Array.from(selectedIds).filter(
            (id) => Number.isFinite(id) && id > 0,
        );
        if (!agrupacionId || ids.length === 0) return;
        setActionLoading(true);
        setError(null);
        try {
            const res = await fetch(`${apiBase}/optativas/asignar-batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    ID_Agrupacion: agrupacionId,
                    ID_Asignaturas: ids,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                showSuccess(
                    data.message || `${ids.length} optativas asignadas.`,
                );
                setSelectedIds(new Set());
                refreshData();
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

    const [confirmRemove, setConfirmRemove] = useState<{
        agrupacionId: number;
        asignaturaId: number;
    } | null>(null);
    const [confirmRemoveBatch, setConfirmRemoveBatch] = useState<{
        agrupacionId: number;
        count: number;
    } | null>(null);

    const handleRemover = async (
        agrupacionId: number,
        asignaturaId: number,
    ) => {
        setActionLoading(true);
        setError(null);
        try {
            const res = await fetch(`${apiBase}/optativas/remover`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    ID_Agrupacion: agrupacionId,
                    ID_Asignatura: asignaturaId,
                }),
            });
            if (res.ok) {
                showSuccess('Optativa removida.');
                refreshData();
            } else {
                const err = await res.json();
                setError(err.message || 'Error al remover.');
            }
        } catch {
            setError('Error de conexión.');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoverBatch = async (agrupacionId: number) => {
        const ids = Array.from(removeSelections.get(agrupacionId) ?? []);
        if (ids.length === 0) return;
        setActionLoading(true);
        setError(null);
        try {
            const res = await fetch(`${apiBase}/optativas/remover-batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    ID_Agrupacion: agrupacionId,
                    ID_Asignaturas: ids,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                showSuccess(
                    data.message || `${ids.length} optativas removidas.`,
                );
                clearRemove(agrupacionId);
                refreshData();
            } else {
                const err = await res.json();
                setError(err.message || 'Error al remover lote.');
            }
        } catch {
            setError('Error de conexión.');
        } finally {
            setActionLoading(false);
            setConfirmRemoveBatch(null);
        }
    };

    const filteredLibres = optativasLibres.filter(
        (a) =>
            !searchLeft ||
            a.Nombre_Asignatura.toLowerCase().includes(
                searchLeft.toLowerCase(),
            ) ||
            a.Codigo_Asignatura.toLowerCase().includes(
                searchLeft.toLowerCase(),
            ),
    );

    const filteredAgrupaciones = agrupaciones
        .map((ag) => ({
            ...ag,
            asignaturas: !searchRight
                ? ag.asignaturas
                : ag.asignaturas.filter(
                      (a) =>
                          a.Nombre_Asignatura.toLowerCase().includes(
                              searchRight.toLowerCase(),
                          ) ||
                          a.Codigo_Asignatura.toLowerCase().includes(
                              searchRight.toLowerCase(),
                          ),
                  ),
        }))
        .filter((ag) => !searchRight || ag.asignaturas.length > 0);

    const totalAsignadas = agrupaciones.reduce(
        (sum, ag) => sum + ag.asignaturas.length,
        0,
    );

    return (
        <Layout>
            <Head
                title={`Asignación de Optativas · ${malla.programa.Nombre_Programa}`}
            />

            <div className="mx-auto max-w-[1440px] pb-12">
                {/* ── Header ── */}
                <div className="mb-7 flex flex-col items-start justify-between gap-4 border-b border-slate-100 pb-6 lg:flex-row lg:items-end">
                    <div className="space-y-2">
                        <nav className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                            <Link
                                href="/mallas"
                                className="transition-colors hover:text-slate-600"
                            >
                                Mallas
                            </Link>
                            <span className="material-symbols-outlined !text-sm text-slate-300">
                                chevron_right
                            </span>
                            <Link
                                href={`/mallas/${malla.ID_Malla}`}
                                className="transition-colors hover:text-slate-600"
                            >
                                {malla.programa.Nombre_Programa}
                            </Link>
                            <span className="material-symbols-outlined !text-sm text-slate-300">
                                chevron_right
                            </span>
                            <span className="font-semibold text-slate-700">
                                Optativas
                            </span>
                        </nav>
                        <h1 className="text-4xl leading-tight font-bold tracking-tight text-slate-900">
                            Asignación de Optativas
                        </h1>
                        <div className="flex items-center gap-3 text-sm text-slate-500">
                            <span>
                                Plan{' '}
                                <span className="font-semibold text-slate-700">
                                    {malla.Codigo_Plan}
                                </span>
                            </span>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span className="inline-flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-brick" />
                                {optativasLibres.length} sin asignar
                            </span>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span className="inline-flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full text-transparent">
                                    -
                                </span>
                                {totalAsignadas} asignadas
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Messages ── */}
                {error && (
                    <div className="mb-5 flex items-center gap-3 rounded-lg border border-brick/20 bg-brick-light/70 px-4 py-3 text-sm font-medium text-brick">
                        <span className="material-symbols-outlined shrink-0 !text-lg">
                            error_outline
                        </span>
                        <span className="flex-1">{error}</span>
                        <button
                            onClick={() => setError(null)}
                            className="shrink-0 text-brick/50 hover:text-brick"
                        >
                            <span className="material-symbols-outlined !text-lg">
                                close
                            </span>
                        </button>
                    </div>
                )}
                {successMsg && (
                    <div className="mb-5 flex items-center gap-3 rounded-lg border border-pine/20 bg-pine-light/70 px-4 py-3 text-sm font-medium text-pine">
                        <span className="material-symbols-outlined shrink-0 !text-lg">
                            check_circle
                        </span>
                        <span className="flex-1">{successMsg}</span>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center gap-3 py-28 text-slate-400">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500" />
                        <span className="text-sm">Cargando datos…</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-5">
                        {/* ══════════════════════════════════════════════════════
                            PANEL IZQUIERDO — Disponibles
                        ══════════════════════════════════════════════════════ */}
                        <div className="flex flex-col gap-6 lg:col-span-2">
                            {/* ── Tabla de disponibles ── */}
                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                <div className="border-l-4 border-brick">
                                    <div className="border-b border-slate-100 px-5 pt-4 pb-3">
                                        <div className="mb-3 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined !text-lg text-brick">
                                                    inbox
                                                </span>
                                                <h2 className="text-sm font-bold tracking-tight text-slate-800">
                                                    Disponibles
                                                </h2>
                                            </div>
                                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500 tabular-nums">
                                                {optativasLibres.length}
                                            </span>
                                        </div>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute top-1/2 left-3 -translate-y-1/2 !text-base text-slate-400">
                                                search
                                            </span>
                                            <input
                                                type="text"
                                                placeholder="Buscar por nombre o código…"
                                                value={searchLeft}
                                                onChange={(e) =>
                                                    setSearchLeft(
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-sm transition-all focus:border-brick/40 focus:bg-white focus:ring-2 focus:ring-brick/8 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div
                                    className="overflow-y-auto"
                                    style={{ maxHeight: '420px' }}
                                >
                                    {filteredLibres.length === 0 ? (
                                        <EmptyState
                                            icon={
                                                optativasLibres.length === 0
                                                    ? 'check_circle'
                                                    : 'search_off'
                                            }
                                            message={
                                                optativasLibres.length === 0
                                                    ? 'Todas las optativas están asignadas'
                                                    : 'Sin resultados para esa búsqueda'
                                            }
                                            submessage={
                                                optativasLibres.length === 0
                                                    ? 'Prueba agregando más optativas al plan de estudios'
                                                    : undefined
                                            }
                                        />
                                    ) : (
                                        <table className="w-full text-left">
                                            <thead className="sticky top-0 z-10 border-b border-slate-100 bg-white">
                                                <tr>
                                                    <th className="w-10 px-4 py-2.5">
                                                        <input
                                                            type="checkbox"
                                                            checked={
                                                                selectedIds.size ===
                                                                    filteredLibres.length &&
                                                                filteredLibres.length >
                                                                    0
                                                            }
                                                            onChange={() =>
                                                                toggleAllLeft(
                                                                    filteredLibres.map(
                                                                        (a) =>
                                                                            a.ID_Asignatura,
                                                                    ),
                                                                )
                                                            }
                                                            className="cursor-pointer rounded border-slate-300 text-brick focus:ring-brick/30"
                                                        />
                                                    </th>
                                                    <th className="px-3 py-2.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                                                        Código
                                                    </th>
                                                    <th className="px-3 py-2.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                                                        Nombre
                                                    </th>
                                                    <th className="px-3 py-2.5 text-center text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                                                        Cr.
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredLibres.map(
                                                    (asig, i) => {
                                                        const isSelected =
                                                            selectedIds.has(
                                                                asig.ID_Asignatura,
                                                            );
                                                        return (
                                                            <tr
                                                                key={
                                                                    asig.ID_Asignatura
                                                                }
                                                                onClick={() =>
                                                                    toggleLeft(
                                                                        asig.ID_Asignatura,
                                                                    )
                                                                }
                                                                className={`cursor-pointer border-b border-slate-50 transition-colors last:border-0 ${
                                                                    isSelected
                                                                        ? 'bg-brick-light/40'
                                                                        : i %
                                                                                2 ===
                                                                            0
                                                                          ? 'hover:bg-slate-50'
                                                                          : 'bg-slate-50/40 hover:bg-slate-100/50'
                                                                }`}
                                                            >
                                                                <td
                                                                    className="px-4 py-2.5"
                                                                    onClick={(
                                                                        e,
                                                                    ) =>
                                                                        e.stopPropagation()
                                                                    }
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={
                                                                            isSelected
                                                                        }
                                                                        onChange={() =>
                                                                            toggleLeft(
                                                                                asig.ID_Asignatura,
                                                                            )
                                                                        }
                                                                        className="cursor-pointer rounded border-slate-300 text-brick focus:ring-brick/30"
                                                                    />
                                                                </td>
                                                                <td className="px-3 py-2.5 text-[11px] whitespace-nowrap text-slate-500">
                                                                    {
                                                                        asig.Codigo_Asignatura
                                                                    }
                                                                </td>
                                                                <td className="px-3 py-2.5 text-sm font-medium text-slate-800">
                                                                    {
                                                                        asig.Nombre_Asignatura
                                                                    }
                                                                </td>
                                                                <td className="px-3 py-2.5 text-center text-sm text-slate-500 tabular-nums">
                                                                    {
                                                                        asig.Creditos_Asignatura
                                                                    }
                                                                </td>
                                                            </tr>
                                                        );
                                                    },
                                                )}
                                            </tbody>
                                        </table>
                                    )}
                                </div>

                                <ActionBar
                                    count={selectedIds.size}
                                    agrupaciones={todasAgrupaciones}
                                    onAssign={handleAsignarBatch}
                                    onClear={() => setSelectedIds(new Set())}
                                    loading={actionLoading}
                                />
                            </div>

                            {/* ── Asignación individual ── */}
                            <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                                <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold tracking-wide text-slate-500 uppercase">
                                    <span className="material-symbols-outlined !text-base">
                                        add_circle_outline
                                    </span>
                                    Asignación individual
                                </h3>
                                <div className="space-y-2">
                                    <select
                                        value={selectedAsignatura ?? ''}
                                        onChange={(e) =>
                                            setSelectedAsignatura(
                                                Number(e.target.value) || null,
                                            )
                                        }
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm transition-all focus:border-brick/40 focus:bg-white focus:ring-2 focus:ring-brick/8 focus:outline-none"
                                    >
                                        <option value="">
                                            Seleccionar materia…
                                        </option>
                                        {catalogoOptativas.map((asig) => (
                                            <option
                                                key={asig.ID_Asignatura}
                                                value={asig.ID_Asignatura}
                                            >
                                                {asig.Codigo_Asignatura} —{' '}
                                                {asig.Nombre_Asignatura}
                                                {asig.ID_Agrupacion
                                                    ? ` · ${asig.Nombre_Agrupacion}`
                                                    : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={selectedAgrupacion ?? ''}
                                        onChange={(e) =>
                                            setSelectedAgrupacion(
                                                Number(e.target.value) || null,
                                            )
                                        }
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm transition-all focus:border-brick/40 focus:bg-white focus:ring-2 focus:ring-brick/8 focus:outline-none"
                                    >
                                        <option value="">
                                            Elegir agrupación destino…
                                        </option>
                                        {todasAgrupaciones.map((ag) => (
                                            <option
                                                key={ag.ID_Agrupacion}
                                                value={ag.ID_Agrupacion}
                                            >
                                                {ag.Nombre_Agrupacion}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={handleAsignar}
                                        disabled={
                                            !selectedAgrupacion ||
                                            !selectedAsignatura ||
                                            actionLoading
                                        }
                                        className="w-full rounded-lg bg-navy px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        {actionLoading
                                            ? 'Asignando…'
                                            : 'Asignar materia'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ══════════════════════════════════════════════════════
                            PANEL DERECHO — Por agrupación
                        ══════════════════════════════════════════════════════ */}
                        <div className="lg:col-span-3">
                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                <div className="border-l-4 border-navy">
                                    <div className="border-b border-slate-100 px-5 pt-4 pb-3">
                                        <div className="mb-3 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined !text-lg text-navy">
                                                    account_tree
                                                </span>
                                                <h2 className="text-sm font-bold tracking-tight text-slate-800">
                                                    Por agrupación
                                                </h2>
                                            </div>
                                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500 tabular-nums">
                                                {totalAsignadas} en{' '}
                                                {agrupaciones.length} grupo
                                                {agrupaciones.length !== 1
                                                    ? 's'
                                                    : ''}
                                            </span>
                                        </div>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute top-1/2 left-3 -translate-y-1/2 !text-base text-slate-400">
                                                search
                                            </span>
                                            <input
                                                type="text"
                                                placeholder="Filtrar materias en agrupaciones…"
                                                value={searchRight}
                                                onChange={(e) =>
                                                    setSearchRight(
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-sm transition-all focus:border-navy/40 focus:bg-white focus:ring-2 focus:ring-navy/8 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div
                                    className="divide-y divide-slate-100 overflow-y-auto"
                                    style={{ maxHeight: '680px' }}
                                >
                                    {filteredAgrupaciones.length === 0 ? (
                                        <EmptyState
                                            icon={
                                                agrupaciones.length === 0
                                                    ? 'category'
                                                    : 'search_off'
                                            }
                                            message={
                                                agrupaciones.length === 0
                                                    ? 'No hay optativas asignadas a ninguna agrupación'
                                                    : 'Sin resultados para esa búsqueda'
                                            }
                                            submessage={
                                                agrupaciones.length === 0
                                                    ? 'Usa el panel de la izquierda para asignar optativas'
                                                    : undefined
                                            }
                                        />
                                    ) : (
                                        filteredAgrupaciones.map((ag) => {
                                            const removeSet =
                                                removeSelections.get(
                                                    ag.ID_Agrupacion,
                                                ) ?? new Set<number>();
                                            const removeCount = removeSet.size;
                                            const allIds = ag.asignaturas.map(
                                                (a) => a.ID_Asignatura,
                                            );

                                            return (
                                                <div
                                                    key={ag.ID_Agrupacion}
                                                    className="px-5 py-4"
                                                >
                                                    {/* Encabezado de agrupación */}
                                                    <div className="mb-3 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex h-6 w-1 rounded-full bg-brick/60" />
                                                            <h3 className="text-sm font-bold text-slate-800">
                                                                {
                                                                    ag.Nombre_Agrupacion
                                                                }
                                                            </h3>
                                                            <span className="inline-flex items-center justify-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 tabular-nums">
                                                                {
                                                                    ag
                                                                        .asignaturas
                                                                        .length
                                                                }
                                                            </span>
                                                        </div>
                                                        {ag.asignaturas.length >
                                                            0 && (
                                                            <button
                                                                onClick={() =>
                                                                    toggleAllRemove(
                                                                        ag.ID_Agrupacion,
                                                                        allIds,
                                                                    )
                                                                }
                                                                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                                                                    removeCount ===
                                                                        allIds.length &&
                                                                    allIds.length >
                                                                        0
                                                                        ? 'bg-brick-light/80 text-brick'
                                                                        : 'bg-slate-100 text-slate-500 hover:bg-brick-light/50 hover:text-brick'
                                                                }`}
                                                            >
                                                                {removeCount ===
                                                                    allIds.length &&
                                                                allIds.length >
                                                                    0
                                                                    ? 'Deseleccionar todas'
                                                                    : 'Seleccionar todas'}
                                                            </button>
                                                        )}
                                                    </div>

                                                    <RemoveBar
                                                        count={removeCount}
                                                        onConfirm={() =>
                                                            setConfirmRemoveBatch(
                                                                {
                                                                    agrupacionId:
                                                                        ag.ID_Agrupacion,
                                                                    count: removeCount,
                                                                },
                                                            )
                                                        }
                                                        onClear={() =>
                                                            clearRemove(
                                                                ag.ID_Agrupacion,
                                                            )
                                                        }
                                                        loading={actionLoading}
                                                    />

                                                    {ag.asignaturas.length ===
                                                    0 ? (
                                                        <p className="py-3 text-xs text-slate-400 italic">
                                                            Sin optativas
                                                            asignadas a esta
                                                            agrupación
                                                        </p>
                                                    ) : (
                                                        <table className="w-full text-left">
                                                            <thead>
                                                                <tr className="border-b border-slate-100">
                                                                    <th className="w-10 px-3 py-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={
                                                                                removeCount ===
                                                                                    allIds.length &&
                                                                                allIds.length >
                                                                                    0
                                                                            }
                                                                            onChange={() =>
                                                                                toggleAllRemove(
                                                                                    ag.ID_Agrupacion,
                                                                                    allIds,
                                                                                )
                                                                            }
                                                                            className="cursor-pointer rounded border-slate-300 text-brick focus:ring-brick/30"
                                                                        />
                                                                    </th>
                                                                    <th className="px-2 py-2 text-[9px] font-bold tracking-wider text-slate-400 uppercase">
                                                                        Código
                                                                    </th>
                                                                    <th className="px-2 py-2 text-[9px] font-bold tracking-wider text-slate-400 uppercase">
                                                                        Nombre
                                                                    </th>
                                                                    <th className="px-2 py-2 text-center text-[9px] font-bold tracking-wider text-slate-400 uppercase">
                                                                        Cr.
                                                                    </th>
                                                                    <th className="w-8 px-2 py-2" />
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {ag.asignaturas.map(
                                                                    (
                                                                        asig,
                                                                        i,
                                                                    ) => {
                                                                        const isSelected =
                                                                            removeSet.has(
                                                                                asig.ID_Asignatura,
                                                                            );
                                                                        return (
                                                                            <tr
                                                                                key={
                                                                                    asig.ID_Asignatura
                                                                                }
                                                                                onClick={() =>
                                                                                    toggleRemove(
                                                                                        ag.ID_Agrupacion,
                                                                                        asig.ID_Asignatura,
                                                                                    )
                                                                                }
                                                                                className={`cursor-pointer border-b border-slate-50 transition-colors last:border-0 ${
                                                                                    isSelected
                                                                                        ? 'bg-brick-light/30'
                                                                                        : i %
                                                                                                2 ===
                                                                                            0
                                                                                          ? 'hover:bg-slate-50'
                                                                                          : 'bg-slate-50/40 hover:bg-slate-100/50'
                                                                                }`}
                                                                            >
                                                                                <td
                                                                                    className="px-3 py-2"
                                                                                    onClick={(
                                                                                        e,
                                                                                    ) =>
                                                                                        e.stopPropagation()
                                                                                    }
                                                                                >
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={
                                                                                            isSelected
                                                                                        }
                                                                                        onChange={() =>
                                                                                            toggleRemove(
                                                                                                ag.ID_Agrupacion,
                                                                                                asig.ID_Asignatura,
                                                                                            )
                                                                                        }
                                                                                        className="cursor-pointer rounded border-slate-300 text-brick focus:ring-brick/30"
                                                                                    />
                                                                                </td>
                                                                                <td className="px-2 py-2 text-[11px] whitespace-nowrap text-slate-500">
                                                                                    {
                                                                                        asig.Codigo_Asignatura
                                                                                    }
                                                                                </td>
                                                                                <td className="px-2 py-2 text-sm font-medium text-slate-800">
                                                                                    {
                                                                                        asig.Nombre_Asignatura
                                                                                    }
                                                                                </td>
                                                                                <td className="px-2 py-2 text-center text-sm text-slate-500 tabular-nums">
                                                                                    {
                                                                                        asig.Creditos_Asignatura
                                                                                    }
                                                                                </td>
                                                                                <td
                                                                                    className="px-2 py-2 text-right"
                                                                                    onClick={(
                                                                                        e,
                                                                                    ) =>
                                                                                        e.stopPropagation()
                                                                                    }
                                                                                >
                                                                                    <button
                                                                                        onClick={() =>
                                                                                            setConfirmRemove(
                                                                                                {
                                                                                                    agrupacionId:
                                                                                                        ag.ID_Agrupacion,
                                                                                                    asignaturaId:
                                                                                                        asig.ID_Asignatura,
                                                                                                },
                                                                                            )
                                                                                        }
                                                                                        disabled={
                                                                                            actionLoading
                                                                                        }
                                                                                        title="Remover de esta agrupación"
                                                                                        className="p-1 text-slate-300 transition-colors hover:text-brick disabled:opacity-40"
                                                                                    >
                                                                                        <span className="material-symbols-outlined !text-base">
                                                                                            remove_circle_outline
                                                                                        </span>
                                                                                    </button>
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    },
                                                                )}
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

                {/* ── Confirmar remoción individual ── */}
                {confirmRemove && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
                            <div className="flex items-start gap-4">
                                <span className="material-symbols-outlined !text-3xl text-brick">
                                    warning
                                </span>
                                <div className="flex-1">
                                    <h3 className="text-base font-bold text-slate-900">
                                        ¿Remover optativa?
                                    </h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Esta optativa será desasignada de la
                                        agrupación.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-5 flex justify-end gap-2">
                                <button
                                    onClick={() => setConfirmRemove(null)}
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => {
                                        handleRemover(
                                            confirmRemove.agrupacionId,
                                            confirmRemove.asignaturaId,
                                        );
                                    }}
                                    disabled={actionLoading}
                                    className="rounded-lg bg-brick px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brick/90 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {actionLoading ? 'Removiendo…' : 'Remover'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Confirmar remoción masiva ── */}
                {confirmRemoveBatch && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
                            <div className="flex items-start gap-4">
                                <span className="material-symbols-outlined !text-3xl text-brick">
                                    warning
                                </span>
                                <div className="flex-1">
                                    <h3 className="text-base font-bold text-slate-900">
                                        ¿Remover {confirmRemoveBatch.count}{' '}
                                        optativa
                                        {confirmRemoveBatch.count !== 1
                                            ? 's'
                                            : ''}
                                        ?
                                    </h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Estas optativas serán desasignadas de la
                                        agrupación.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-5 flex justify-end gap-2">
                                <button
                                    onClick={() => setConfirmRemoveBatch(null)}
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => {
                                        handleRemoverBatch(
                                            confirmRemoveBatch.agrupacionId,
                                        );
                                    }}
                                    disabled={actionLoading}
                                    className="rounded-lg bg-brick px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brick/90 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {actionLoading ? 'Removiendo…' : 'Remover'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
