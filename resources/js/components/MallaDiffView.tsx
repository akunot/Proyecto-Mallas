import React, { useState, useMemo } from 'react';

interface MallaInfo {
    ID_Malla: number;
    Version_Numero: number;
    Estado: string;
    Fecha_Vigencia: string;
}

interface CambioItem {
    ID_Asignatura: number;
    Codigo_Asignatura: string;
    Nombre_Asignatura: string;
    Creditos_Asignatura: number;
    Semestre_Sugerido: number | null;
    Tipo_Asignatura: string;
    Nombre_Agrupacion: string;
    ID_Componente: number;
    Nombre_Componente: string;
}

interface CambioModificado {
    old: CambioItem;
    new: CambioItem;
}

interface RequisitoItem {
    ID_Requisito: number;
    ID_Asignatura: number;
    ID_Asignatura_Requerida: number | null;
    Tipo_Requisito: string;
    Descripcion_Requisito: string | null;
    asignatura_principal: {
        Codigo_Asignatura: string | null;
        Nombre_Asignatura: string | null;
    };
    asignatura_requerida: {
        Codigo_Asignatura: string | null;
        Nombre_Asignatura: string | null;
    };
}

interface DiffResponse {
    malla1: MallaInfo;
    malla2: MallaInfo;
    resumen: {
        agregadas: number;
        eliminadas: number;
        modificadas: number;
        sin_cambios: number;
        requisitos_agregados: number;
        requisitos_eliminados: number;
    };
    cambios: {
        agregadas: CambioItem[];
        eliminadas: CambioItem[];
        modificadas: CambioModificado[];
        sin_cambios: CambioItem[];
        requisitos_agregados: RequisitoItem[];
        requisitos_eliminados: RequisitoItem[];
    };
}

interface Props {
    open: boolean;
    onClose: () => void;
    diffData: DiffResponse | null;
    loading: boolean;
    historialRequisitos: Array<{
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
    }>;
}

const formatDate = (d: string): string => {
    try {
        return new Date(d).toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return d;
    }
};

function CambioCard({
    item,
    type,
}: {
    item: CambioItem;
    type: 'added' | 'removed';
}) {
    const isAdded = type === 'added';
    const accentColor = isAdded ? '#047857' : '#dc2626';
    const bgColor = isAdded ? '#f0fdf4' : '#fef2f2';
    const label = isAdded ? 'Agregada' : 'Eliminada';

    return (
        <div
            style={{
                borderLeft: `4px solid ${accentColor}`,
                backgroundColor: bgColor,
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                padding: '0.75rem',
            }}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span
                            style={{
                                backgroundColor: isAdded
                                    ? '#dcfce7'
                                    : '#fee2e2',
                                color: accentColor,
                                borderRadius: '0.25rem',
                                padding: '0.125rem 0.375rem',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                            }}
                        >
                            {label}
                        </span>
                        <span
                            style={{
                                fontSize: '0.9rem',
                                fontWeight: 500,
                                color: '#1e293b',
                            }}
                        >
                            {item.Codigo_Asignatura}
                        </span>
                    </div>
                    <p
                        style={{
                            margin: '0.25rem 0 0 0',
                            fontSize: '0.85rem',
                            color: '#475569',
                        }}
                    >
                        {item.Nombre_Asignatura}
                    </p>
                    <div
                        style={{
                            display: 'flex',
                            gap: '0.75rem',
                            marginTop: '0.375rem',
                            fontSize: '0.8rem',
                            color: '#64748b',
                        }}
                    >
                        <span>Sem {item.Semestre_Sugerido ?? '-'}</span>
                        <span>{item.Creditos_Asignatura} cr.</span>
                        <span>{item.Nombre_Agrupacion}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ModificadoCard({ cambio }: { cambio: CambioModificado }) {
    const hasSemChange =
        cambio.old.Semestre_Sugerido !== cambio.new.Semestre_Sugerido;
    const hasGroupChange =
        cambio.old.Nombre_Agrupacion !== cambio.new.Nombre_Agrupacion ||
        cambio.old.ID_Componente !== cambio.new.ID_Componente;
    const hasTypeChange =
        cambio.old.Tipo_Asignatura !== cambio.new.Tipo_Asignatura;

    return (
        <div
            style={{
                borderLeft: '4px solid #d97706',
                backgroundColor: '#fffbeb',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                padding: '0.75rem',
            }}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span
                            style={{
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                                borderRadius: '0.25rem',
                                padding: '0.125rem 0.375rem',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                            }}
                        >
                            Modificada
                        </span>
                        <span
                            style={{
                                fontSize: '0.9rem',
                                fontWeight: 500,
                                color: '#1e293b',
                            }}
                        >
                            {cambio.new.Codigo_Asignatura}
                        </span>
                    </div>
                    <p
                        style={{
                            margin: '0.25rem 0 0 0',
                            fontSize: '0.85rem',
                            color: '#475569',
                        }}
                    >
                        {cambio.new.Nombre_Asignatura}
                    </p>
                    <div
                        style={{
                            marginTop: '0.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.25rem',
                            fontSize: '0.8rem',
                        }}
                    >
                        {hasSemChange && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <span
                                    style={{
                                        width: '4rem',
                                        flexShrink: 0,
                                        color: '#94a3b8',
                                    }}
                                >
                                    Semestre:
                                </span>
                                <span
                                    style={{
                                        color: '#dc2626',
                                        textDecoration: 'line-through',
                                    }}
                                >
                                    {cambio.old.Semestre_Sugerido ?? '-'}
                                </span>
                                <span style={{ color: '#94a3b8' }}>&rarr;</span>
                                <span
                                    style={{
                                        fontWeight: 600,
                                        color: '#047857',
                                    }}
                                >
                                    {cambio.new.Semestre_Sugerido ?? '-'}
                                </span>
                            </div>
                        )}
                        {hasGroupChange && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <span
                                    style={{
                                        width: '4rem',
                                        flexShrink: 0,
                                        color: '#94a3b8',
                                    }}
                                >
                                    Grupo:
                                </span>
                                <span
                                    style={{
                                        color: '#dc2626',
                                        textDecoration: 'line-through',
                                    }}
                                >
                                    {cambio.old.Nombre_Agrupacion}
                                    {cambio.old.ID_Componente !==
                                        cambio.new.ID_Componente &&
                                        ` (${cambio.old.Nombre_Componente})`}
                                </span>
                                <span style={{ color: '#94a3b8' }}>&rarr;</span>
                                <span
                                    style={{
                                        fontWeight: 600,
                                        color: '#047857',
                                    }}
                                >
                                    {cambio.new.Nombre_Agrupacion}
                                    {cambio.old.ID_Componente !==
                                        cambio.new.ID_Componente &&
                                        ` (${cambio.new.Nombre_Componente})`}
                                </span>
                            </div>
                        )}
                        {hasTypeChange && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <span
                                    style={{
                                        width: '4rem',
                                        flexShrink: 0,
                                        color: '#94a3b8',
                                    }}
                                >
                                    Tipo:
                                </span>
                                <span
                                    style={{
                                        color: '#dc2626',
                                        textDecoration: 'line-through',
                                    }}
                                >
                                    {cambio.old.Tipo_Asignatura}
                                </span>
                                <span style={{ color: '#94a3b8' }}>&rarr;</span>
                                <span
                                    style={{
                                        fontWeight: 600,
                                        color: '#047857',
                                    }}
                                >
                                    {cambio.new.Tipo_Asignatura}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function RequisitoCard({
    item,
    type,
}: {
    item: RequisitoItem;
    type: 'added' | 'removed';
}) {
    const isAdded = type === 'added';
    const accentColor = isAdded ? '#047857' : '#dc2626';
    const bgColor = isAdded ? '#f0fdf4' : '#fef2f2';
    const label = isAdded ? 'Agregado' : 'Eliminado';

    return (
        <div
            style={{
                borderLeft: `4px solid ${accentColor}`,
                backgroundColor: bgColor,
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                padding: '0.75rem',
            }}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span
                            style={{
                                backgroundColor: isAdded
                                    ? '#dcfce7'
                                    : '#fee2e2',
                                color: accentColor,
                                borderRadius: '0.25rem',
                                padding: '0.125rem 0.375rem',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                            }}
                        >
                            {label}
                        </span>
                        <span
                            style={{
                                fontSize: '0.85rem',
                                fontWeight: 500,
                                color: '#1e293b',
                            }}
                        >
                            {item.Tipo_Requisito}
                        </span>
                    </div>
                    <p
                        style={{
                            margin: '0.25rem 0 0 0',
                            fontSize: '0.85rem',
                            color: '#475569',
                        }}
                    >
                        {item.asignatura_principal.Nombre_Asignatura ??
                            `#${item.ID_Asignatura}`}
                        {' → '}
                        {item.asignatura_requerida.Nombre_Asignatura ??
                            `#${item.ID_Asignatura_Requerida}`}
                    </p>
                </div>
            </div>
        </div>
    );
}

export type { DiffResponse, CambioItem, CambioModificado, RequisitoItem };

export default function MallaDiffView({
    open,
    onClose,
    diffData,
    loading,
    historialRequisitos,
}: Props) {
    const [search, setSearch] = useState('');
    const [showUnchanged, setShowUnchanged] = useState(false);

    if (!open) {
        return null;
    }

    const primaryColor = '#00236f';
    const primaryDark = '#001a54';

    const filteredModificadas = useMemo(() => {
        if (!diffData || !search.trim())
            return diffData?.cambios.modificadas ?? [];
        const q = search.toLowerCase();
        return diffData.cambios.modificadas.filter(
            (c) =>
                c.new.Codigo_Asignatura?.toLowerCase().includes(q) ||
                c.new.Nombre_Asignatura?.toLowerCase().includes(q) ||
                c.old.Codigo_Asignatura?.toLowerCase().includes(q) ||
                c.old.Nombre_Asignatura?.toLowerCase().includes(q),
        );
    }, [diffData, search]);

    const filteredAgregadas = useMemo(() => {
        if (!diffData || !search.trim())
            return diffData?.cambios.agregadas ?? [];
        const q = search.toLowerCase();
        return diffData.cambios.agregadas.filter(
            (item) =>
                item.Codigo_Asignatura?.toLowerCase().includes(q) ||
                item.Nombre_Asignatura?.toLowerCase().includes(q),
        );
    }, [diffData, search]);

    const filteredEliminadas = useMemo(() => {
        if (!diffData || !search.trim())
            return diffData?.cambios.eliminadas ?? [];
        const q = search.toLowerCase();
        return diffData.cambios.eliminadas.filter(
            (item) =>
                item.Codigo_Asignatura?.toLowerCase().includes(q) ||
                item.Nombre_Asignatura?.toLowerCase().includes(q),
        );
    }, [diffData, search]);

    const totalChanges =
        (diffData?.resumen.agregadas ?? 0) +
        (diffData?.resumen.eliminadas ?? 0) +
        (diffData?.resumen.modificadas ?? 0);

    return (
        <>
            <div className="modal-overlay" onClick={onClose}>
                <div
                    className="modal-container"
                    style={{ maxWidth: '900px', maxHeight: '90vh' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div
                        className="modal-header"
                        style={{
                            background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryDark} 100%)`,
                        }}
                    >
                        <div>
                            <h2>Comparar versiones</h2>
                            {diffData && (
                                <p>
                                    V{diffData.malla1.Version_Numero} &rarr; V
                                    {diffData.malla2.Version_Numero}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="modal-close-btn"
                            aria-label="Cerrar"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="modal-body">
                        {loading && (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '3rem 0',
                                }}
                            >
                                <div
                                    style={{
                                        width: '1.5rem',
                                        height: '1.5rem',
                                        border: '2px solid #e2e8f0',
                                        borderTopColor: primaryColor,
                                        borderRadius: '50%',
                                        animation: 'spin 0.8s linear infinite',
                                    }}
                                />
                                <span
                                    style={{
                                        marginLeft: '0.75rem',
                                        color: '#64748b',
                                        fontSize: '0.9rem',
                                    }}
                                >
                                    Comparando versiones...
                                </span>
                            </div>
                        )}

                        {!loading && !diffData && (
                            <p
                                style={{
                                    padding: '2rem 0',
                                    textAlign: 'center',
                                    color: '#94a3b8',
                                }}
                            >
                                No hay datos de comparacion disponibles.
                            </p>
                        )}

                        {!loading && diffData && (
                            <>
                                <div
                                    className="diff-version-bar"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '0.75rem',
                                        backgroundColor: '#f8fafc',
                                        padding: '0.75rem 1.5rem',
                                        marginBottom: '1.5rem',
                                    }}
                                >
                                    <div className="diff-version-col" style={{ textAlign: 'center' }}>
                                        <p
                                            style={{
                                                margin: 0,
                                                fontSize: '0.8rem',
                                                color: '#64748b',
                                            }}
                                        >
                                            Version anterior
                                        </p>
                                        <p
                                            style={{
                                                margin: '0.25rem 0 0 0',
                                                fontSize: '1.25rem',
                                                fontWeight: 700,
                                                color: '#1e293b',
                                            }}
                                        >
                                            V{diffData.malla1.Version_Numero}
                                        </p>
                                        <p
                                            style={{
                                                margin: '0.25rem 0 0 0',
                                                fontSize: '0.8rem',
                                                color: '#94a3b8',
                                            }}
                                        >
                                            {formatDate(
                                                diffData.malla1.Fecha_Vigencia,
                                            )}
                                        </p>
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '1.5rem',
                                            color: '#94a3b8',
                                        }}
                                    >
                                        &rarr;
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <p
                                            style={{
                                                margin: 0,
                                                fontSize: '0.8rem',
                                                color: '#64748b',
                                            }}
                                        >
                                            Version nueva
                                        </p>
                                        <p
                                            style={{
                                                margin: '0.25rem 0 0 0',
                                                fontSize: '1.25rem',
                                                fontWeight: 700,
                                                color: '#1e293b',
                                            }}
                                        >
                                            V{diffData.malla2.Version_Numero}
                                        </p>
                                        <p
                                            style={{
                                                margin: '0.25rem 0 0 0',
                                                fontSize: '0.8rem',
                                                color: '#94a3b8',
                                            }}
                                        >
                                            {formatDate(
                                                diffData.malla2.Fecha_Vigencia,
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <div
                                    className="diff-stats-grid"
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(4, 1fr)',
                                        gap: '0.75rem',
                                        marginBottom: '1.5rem',
                                    }}
                                >
                                    <div
                                        style={{
                                            border: '1px solid #bbf7d0',
                                            backgroundColor: '#f0fdf4',
                                            borderRadius: '0.5rem',
                                            padding: '0.75rem',
                                            textAlign: 'center',
                                        }}
                                    >
                                        <p
                                            style={{
                                                margin: 0,
                                                fontSize: '1.5rem',
                                                fontWeight: 700,
                                                color: '#047857',
                                            }}
                                        >
                                            +{diffData.resumen.agregadas}
                                        </p>
                                        <p
                                            style={{
                                                margin: '0.25rem 0 0 0',
                                                fontSize: '0.75rem',
                                                color: '#047857',
                                            }}
                                        >
                                            Agregadas
                                        </p>
                                    </div>
                                    <div
                                        style={{
                                            border: '1px solid #fecaca',
                                            backgroundColor: '#fef2f2',
                                            borderRadius: '0.5rem',
                                            padding: '0.75rem',
                                            textAlign: 'center',
                                        }}
                                    >
                                        <p
                                            style={{
                                                margin: 0,
                                                fontSize: '1.5rem',
                                                fontWeight: 700,
                                                color: '#dc2626',
                                            }}
                                        >
                                            -{diffData.resumen.eliminadas}
                                        </p>
                                        <p
                                            style={{
                                                margin: '0.25rem 0 0 0',
                                                fontSize: '0.75rem',
                                                color: '#dc2626',
                                            }}
                                        >
                                            Eliminadas
                                        </p>
                                    </div>
                                    <div
                                        style={{
                                            border: '1px solid #fde68a',
                                            backgroundColor: '#fffbeb',
                                            borderRadius: '0.5rem',
                                            padding: '0.75rem',
                                            textAlign: 'center',
                                        }}
                                    >
                                        <p
                                            style={{
                                                margin: 0,
                                                fontSize: '1.5rem',
                                                fontWeight: 700,
                                                color: '#d97706',
                                            }}
                                        >
                                            {diffData.resumen.modificadas}
                                        </p>
                                        <p
                                            style={{
                                                margin: '0.25rem 0 0 0',
                                                fontSize: '0.75rem',
                                                color: '#d97706',
                                            }}
                                        >
                                            Modificadas
                                        </p>
                                    </div>
                                    <div
                                        style={{
                                            border: '1px solid #e2e8f0',
                                            backgroundColor: '#f8fafc',
                                            borderRadius: '0.5rem',
                                            padding: '0.75rem',
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                        }}
                                        onClick={() =>
                                            setShowUnchanged(!showUnchanged)
                                        }
                                        title={
                                            showUnchanged
                                                ? 'Ocultar sin cambios'
                                                : 'Mostrar sin cambios'
                                        }
                                    >
                                        <p
                                            style={{
                                                margin: 0,
                                                fontSize: '1.5rem',
                                                fontWeight: 700,
                                                color: '#64748b',
                                            }}
                                        >
                                            {diffData.resumen.sin_cambios}
                                        </p>
                                        <p
                                            style={{
                                                margin: '0.25rem 0 0 0',
                                                fontSize: '0.75rem',
                                                color: '#64748b',
                                            }}
                                        >
                                            Sin cambios{' '}
                                            {showUnchanged ? '▲' : '▼'}
                                        </p>
                                    </div>
                                </div>

                                {totalChanges > 0 && (
                                    <div style={{ marginBottom: '1rem' }}>
                                        <input
                                            type="text"
                                            placeholder="Buscar asignatura por código o nombre..."
                                            value={search}
                                            onChange={(e) =>
                                                setSearch(e.target.value)
                                            }
                                            style={{
                                                width: '100%',
                                                padding: '0.5rem 0.75rem',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '0.5rem',
                                                fontSize: '0.85rem',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                            }}
                                        />
                                    </div>
                                )}

                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '1rem',
                                    }}
                                >
                                    {diffData.resumen.requisitos_agregados >
                                        0 && (
                                        <div>
                                            <h3
                                                style={{
                                                    margin: '0 0 0.5rem 0',
                                                    fontSize: '0.9rem',
                                                    fontWeight: 600,
                                                    color: '#047857',
                                                }}
                                            >
                                                Requisitos agregados (
                                                {
                                                    diffData.resumen
                                                        .requisitos_agregados
                                                }
                                                )
                                            </h3>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '0.5rem',
                                                }}
                                            >
                                                {diffData.cambios.requisitos_agregados.map(
                                                    (r) => (
                                                        <RequisitoCard
                                                            key={r.ID_Requisito}
                                                            item={r}
                                                            type="added"
                                                        />
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {diffData.resumen.requisitos_eliminados >
                                        0 && (
                                        <div>
                                            <h3
                                                style={{
                                                    margin: '0 0 0.5rem 0',
                                                    fontSize: '0.9rem',
                                                    fontWeight: 600,
                                                    color: '#dc2626',
                                                }}
                                            >
                                                Requisitos eliminados (
                                                {
                                                    diffData.resumen
                                                        .requisitos_eliminados
                                                }
                                                )
                                            </h3>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '0.5rem',
                                                }}
                                            >
                                                {diffData.cambios.requisitos_eliminados.map(
                                                    (r) => (
                                                        <RequisitoCard
                                                            key={r.ID_Requisito}
                                                            item={r}
                                                            type="removed"
                                                        />
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {historialRequisitos.length > 0 && (
                                        <div>
                                            <h3
                                                style={{
                                                    margin: '0 0 0.5rem 0',
                                                    fontSize: '0.9rem',
                                                    fontWeight: 600,
                                                    color: '#6366f1',
                                                }}
                                            >
                                                Historial de cambios de requisitos (
                                                {historialRequisitos.length})
                                            </h3>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '0.5rem',
                                                }}
                                            >
                                                {historialRequisitos.map(
                                                    (cambio, idx) => (
                                                        <div
                                                            key={idx}
                                                            style={{
                                                                border: '1px solid #e2e8f0',
                                                                borderRadius: '0.5rem',
                                                                padding: '0.75rem',
                                                                backgroundColor: '#f8fafc',
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                }}
                                                            >
                                                                <span
                                                                    style={{
                                                                        fontSize: '0.75rem',
                                                                        color: '#64748b',
                                                                    }}
                                                                >
                                                                    {new Date(
                                                                        cambio.fecha,
                                                                    ).toLocaleString()}
                                                                </span>
                                                                <span
                                                                    style={{
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 600,
                                                                        padding: '0.15rem 0.5rem',
                                                                        borderRadius: '9999px',
                                                                        backgroundColor:
                                                                            cambio.tipo_cambio ===
                                                                            'INSERT_REQUISITO'
                                                                                ? '#dcfce7'
                                                                                : cambio.tipo_cambio ===
                                                                                  'DELETE_REQUISITO_OBSOLETO'
                                                                                  ? '#fee2e2'
                                                                                  : '#fef9c3',
                                                                        color:
                                                                            cambio.tipo_cambio ===
                                                                            'INSERT_REQUISITO'
                                                                                ? '#166534'
                                                                                : cambio.tipo_cambio ===
                                                                                  'DELETE_REQUISITO_OBSOLETO'
                                                                                  ? '#991b1b'
                                                                                  : '#854d0e',
                                                                    }}
                                                                >
                                                                    {cambio.tipo_cambio.replace(
                                                                        /_/g,
                                                                        ' ',
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <p
                                                                style={{
                                                                    margin: '0.4rem 0 0',
                                                                    fontSize: '0.85rem',
                                                                    color: '#1e293b',
                                                                }}
                                                            >
                                                                {cambio.asignatura_afectada?.Nombre_Asignatura ? (
                                                                    <>
                                                                        <strong>
                                                                            {cambio.asignatura_afectada.Nombre_Asignatura}
                                                                        </strong>
                                                                        {cambio.asignatura_afectada.Codigo_Asignatura ? (
                                                                            <span
                                                                style={{
                                                                    marginLeft: '0.4rem',
                                                                    color: '#64748b',
                                                                }}
                                                            >
                                                                ({cambio.asignatura_afectada.Codigo_Asignatura})
                                                            </span>
                                                        ) : null}
                                                        <br />
                                                        {cambio.resumen}
                                                    </>
                                                ) : (
                                                    cambio.resumen
                                                )}
                                                            </p>
                                                            {cambio.normativa ? (
                                                                <p
                                                                    style={{
                                                                        margin: '0.35rem 0 0',
                                                                        fontSize: '0.75rem',
                                                                        color: '#64748b',
                                                                    }}
                                                                >
                                                                    Normativa{' '}
                                                                    {cambio.normativa.Tipo_Normativa}{' '}
                                                                    N°{cambio.normativa.Numero_Normativa}
                                                                    {cambio.normativa.Anio_Normativa
                                                                        ? ` (${cambio.normativa.Anio_Normativa})`
                                                                        : null}
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {filteredAgregadas.length > 0 && (
                                        <div>
                                            <h3
                                                style={{
                                                    margin: '0 0 0.5rem 0',
                                                    fontSize: '0.9rem',
                                                    fontWeight: 600,
                                                    color: '#047857',
                                                }}
                                            >
                                                Asignaturas agregadas (
                                                {filteredAgregadas.length})
                                            </h3>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '0.5rem',
                                                }}
                                            >
                                                {filteredAgregadas.map(
                                                    (item) => (
                                                        <CambioCard
                                                            key={
                                                                item.ID_Asignatura
                                                            }
                                                            item={item}
                                                            type="added"
                                                        />
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {filteredEliminadas.length > 0 && (
                                        <div>
                                            <h3
                                                style={{
                                                    margin: '0 0 0.5rem 0',
                                                    fontSize: '0.9rem',
                                                    fontWeight: 600,
                                                    color: '#dc2626',
                                                }}
                                            >
                                                Asignaturas eliminadas (
                                                {filteredEliminadas.length})
                                            </h3>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '0.5rem',
                                                }}
                                            >
                                                {filteredEliminadas.map(
                                                    (item) => (
                                                        <CambioCard
                                                            key={
                                                                item.ID_Asignatura
                                                            }
                                                            item={item}
                                                            type="removed"
                                                        />
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {filteredModificadas.length > 0 && (
                                        <div>
                                            <h3
                                                style={{
                                                    margin: '0 0 0.5rem 0',
                                                    fontSize: '0.9rem',
                                                    fontWeight: 600,
                                                    color: '#d97706',
                                                }}
                                            >
                                                Asignaturas modificadas (
                                                {filteredModificadas.length})
                                            </h3>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '0.5rem',
                                                }}
                                            >
                                                {filteredModificadas.map(
                                                    (cambio, idx) => (
                                                        <ModificadoCard
                                                            key={idx}
                                                            cambio={cambio}
                                                        />
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {showUnchanged &&
                                        diffData.cambios.sin_cambios.length >
                                            0 && (
                                            <div>
                                                <h3
                                                    style={{
                                                        margin: '0 0 0.5rem 0',
                                                        fontSize: '0.9rem',
                                                        fontWeight: 600,
                                                        color: '#64748b',
                                                    }}
                                                >
                                                    Sin cambios (
                                                    {
                                                        diffData.cambios
                                                            .sin_cambios.length
                                                    }
                                                    )
                                                </h3>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '0.5rem',
                                                    }}
                                                >
                                                    {diffData.cambios.sin_cambios.map(
                                                        (item) => (
                                                            <div
                                                                key={
                                                                    item.ID_Asignatura
                                                                }
                                                                style={{
                                                                    border: '1px solid #e2e8f0',
                                                                    borderRadius:
                                                                        '0.5rem',
                                                                    padding:
                                                                        '0.75rem',
                                                                    backgroundColor:
                                                                        '#f8fafc',
                                                                }}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <span
                                                                        style={{
                                                                            fontSize:
                                                                                '0.85rem',
                                                                            fontWeight: 500,
                                                                            color: '#64748b',
                                                                        }}
                                                                    >
                                                                        {
                                                                            item.Codigo_Asignatura
                                                                        }
                                                                    </span>
                                                                    <span
                                                                        style={{
                                                                            fontSize:
                                                                                '0.8rem',
                                                                            color: '#94a3b8',
                                                                        }}
                                                                    >
                                                                        {
                                                                            item.Nombre_Asignatura
                                                                        }
                                                                    </span>
                                                                </div>
                                                                <div
                                                                    style={{
                                                                        display:
                                                                            'flex',
                                                                        gap: '0.75rem',
                                                                        marginTop:
                                                                            '0.25rem',
                                                                        fontSize:
                                                                            '0.75rem',
                                                                        color: '#94a3b8',
                                                                    }}
                                                                >
                                                                    <span>
                                                                        Sem{' '}
                                                                        {item.Semestre_Sugerido ??
                                                                            '-'}
                                                                    </span>
                                                                    <span>
                                                                        {
                                                                            item.Creditos_Asignatura
                                                                        }{' '}
                                                                        cr.
                                                                    </span>
                                                                    <span>
                                                                        {
                                                                            item.Nombre_Agrupacion
                                                                        }
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                    {totalChanges === 0 && (
                                        <p
                                            style={{
                                                padding: '1rem 0',
                                                textAlign: 'center',
                                                color: '#94a3b8',
                                            }}
                                        >
                                            No hay cambios entre estas
                                            versiones.
                                        </p>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    <div
                        className="modal-footer"
                        style={{
                            backgroundColor: '#f8fafc',
                            padding: '1rem 1.5rem',
                            borderRadius: '0 0 0.75rem 0.75rem',
                        }}
                    >
                        <button
                            onClick={onClose}
                            className="modal-btn-secondary"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @media (max-width: 639px) {
                    .modal-overlay {
                        padding: 0 !important;
                        align-items: flex-end !important;
                    }
                    .modal-container {
                        max-height: 90vh !important;
                        border-radius: 1rem 1rem 0 0 !important;
                        width: 100% !important;
                    }
                    .modal-header {
                        padding: 1rem !important;
                    }
                    .modal-body {
                        padding: 1rem !important;
                    }
                    .modal-footer {
                        padding: 0.75rem 1rem !important;
                    }
                    .diff-stats-grid {
                        grid-template-columns: repeat(2, 1fr) !important;
                    }
                    .diff-stats-grid > div {
                        padding: 0.5rem !important;
                    }
                    .diff-stats-grid p:first-child {
                        font-size: 1.25rem !important;
                    }
                    .diff-version-bar {
                        padding: 0.5rem 0.75rem !important;
                        flex-wrap: wrap !important;
                        gap: 0.5rem !important;
                        justify-content: center !important;
                    }
                    .diff-version-col p:first-of-type {
                        font-size: 0.7rem !important;
                    }
                    .diff-version-col p:nth-of-type(2) {
                        font-size: 1rem !important;
                    }
                    .diff-version-bar > div:nth-child(2) {
                        font-size: 1.25rem !important;
                        order: -1;
                        width: 100%;
                        text-align: center;
                    }
                }
            `}</style>
        </>
    );
}
