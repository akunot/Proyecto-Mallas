import React, { useState, useMemo } from 'react';

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

interface CambioResumen {
    agregadas: number;
    removidas: number;
    modificadas: number;
}

interface VersionHistoryModalMejoradoProps {
    open: boolean;
    versiones: MallaVersion[];
    currentVersionId: number;
    selectedForDiff: Set<number>;
    onClose: () => void;
    onSelectVersion: (versionId: number) => void;
    onToggleDiffSelection: (versionId: number) => void;
    onCompare: () => void;
    loading?: boolean;
    cambiosPorVersion?: Record<number, CambioResumen>;
}

export default function VersionHistoryModalMejorado({
    open,
    versiones,
    currentVersionId,
    selectedForDiff,
    onClose,
    onSelectVersion,
    onToggleDiffSelection,
    onCompare,
    loading = false,
    cambiosPorVersion = {},
}: VersionHistoryModalMejoradoProps) {
    const [compareMode, setCompareMode] = useState(false);

    const canCompare = selectedForDiff.size === 2;

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('es-CO', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }).format(date);
    };

    if (!open) return null;

    const sortedVersiones = [...versiones].sort(
        (a, b) => b.Version_Numero - a.Version_Numero,
    );

    const primaryColor = '#00236f';
    const primaryDark = '#001a54';

    return (
        <>
            <div className="modal-overlay" onClick={onClose}>
                <div
                    className="modal-container"
                    style={{
                        maxWidth: '700px',
                        maxHeight: '90vh',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div
                        className="modal-header"
                        style={{
                            background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryDark} 100%)`,
                        }}
                    >
                        <div>
                            <h2>Historial de Versiones</h2>
                            <p>Gestiona y compara versiones de la malla</p>
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
                        <div
                            style={{
                                display: 'flex',
                                gap: '0.5rem',
                                borderBottom: '2px solid #e2e8f0',
                                paddingBottom: '1rem',
                                marginBottom: '1.5rem',
                            }}
                        >
                            <button
                                onClick={() => setCompareMode(false)}
                                style={{
                                    padding: '0.625rem 1rem',
                                    backgroundColor: !compareMode
                                        ? primaryColor
                                        : 'transparent',
                                    color: !compareMode ? 'white' : '#64748b',
                                    border: 'none',
                                    borderRadius: '0.375rem',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    transition: 'all 200ms',
                                }}
                            >
                                Versiones
                            </button>
                            <button
                                onClick={() => setCompareMode(true)}
                                style={{
                                    padding: '0.625rem 1rem',
                                    backgroundColor: compareMode
                                        ? primaryColor
                                        : 'transparent',
                                    color: compareMode ? 'white' : '#64748b',
                                    border: 'none',
                                    borderRadius: '0.375rem',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    transition: 'all 200ms',
                                }}
                            >
                                Comparar ({selectedForDiff.size}/2)
                            </button>
                        </div>

                        {/* Version cards - always visible */}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem',
                            }}
                        >
                            {sortedVersiones.map((version) => {
                                const isCurrentVersion =
                                    version.ID_Malla === currentVersionId;
                                const isVigente = !!version.Es_Vigente;
                                const cambios =
                                    cambiosPorVersion[version.Version_Numero] ||
                                    {};

                                return (
                                    <div
                                        key={version.ID_Malla}
                                        onClick={() =>
                                            !compareMode &&
                                            onSelectVersion(version.ID_Malla)
                                        }
                                        style={{
                                            border: isCurrentVersion
                                                ? `2px solid ${primaryColor}`
                                                : '1px solid #e2e8f0',
                                            borderRadius: '0.75rem',
                                            padding: '1.25rem',
                                            cursor: compareMode
                                                ? 'default'
                                                : 'pointer',
                                            transition: 'all 200ms',
                                            backgroundColor: isCurrentVersion
                                                ? '#eef2ff'
                                                : 'white',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (
                                                !isCurrentVersion &&
                                                !compareMode
                                            ) {
                                                e.currentTarget.style.borderColor =
                                                    primaryColor;
                                                e.currentTarget.style.backgroundColor =
                                                    '#f8fafc';
                                                e.currentTarget.style.boxShadow =
                                                    '0 4px 6px rgba(0, 35, 111, 0.08)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (
                                                !isCurrentVersion &&
                                                !compareMode
                                            ) {
                                                e.currentTarget.style.borderColor =
                                                    '#e2e8f0';
                                                e.currentTarget.style.backgroundColor =
                                                    'white';
                                                e.currentTarget.style.boxShadow =
                                                    'none';
                                            }
                                        }}
                                        role="button"
                                        tabIndex={0}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'flex-start',
                                                marginBottom: '1rem',
                                            }}
                                        >
                                            <div>
                                                <h3
                                                    style={{
                                                        margin: 0,
                                                        fontSize: '1.1rem',
                                                        fontWeight: 600,
                                                        color: '#1e293b',
                                                    }}
                                                >
                                                    v{version.Version_Numero}.
                                                    {version.Version_Etiqueta ||
                                                        '0'}
                                                </h3>
                                                {version.Version_Etiqueta && (
                                                    <p
                                                        style={{
                                                            margin: '0.25rem 0 0 0',
                                                            fontSize: '0.85rem',
                                                            color: '#64748b',
                                                        }}
                                                    >
                                                        {
                                                            version.Version_Etiqueta
                                                        }
                                                    </p>
                                                )}
                                            </div>

                                            <div
                                                style={{
                                                    display: 'flex',
                                                    gap: '0.5rem',
                                                }}
                                            >
                                                {isCurrentVersion && (
                                                    <div
                                                        style={{
                                                            backgroundColor:
                                                                '#dcfce7',
                                                            color: '#166534',
                                                            padding:
                                                                '0.375rem 0.75rem',
                                                            borderRadius:
                                                                '9999px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 700,
                                                            whiteSpace:
                                                                'nowrap',
                                                        }}
                                                    >
                                                        Actual
                                                    </div>
                                                )}
                                                {isVigente &&
                                                    !isCurrentVersion && (
                                                        <div
                                                            style={{
                                                                backgroundColor:
                                                                    '#dbeafe',
                                                                color: '#0c4a6e',
                                                                padding:
                                                                    '0.375rem 0.75rem',
                                                                borderRadius:
                                                                    '9999px',
                                                                fontSize:
                                                                    '0.75rem',
                                                                fontWeight: 700,
                                                                whiteSpace:
                                                                    'nowrap',
                                                            }}
                                                        >
                                                            Vigente
                                                        </div>
                                                    )}
                                                {!isVigente && (
                                                    <div
                                                        style={{
                                                            backgroundColor:
                                                                '#f3f4f6',
                                                            color: '#6b7280',
                                                            padding:
                                                                '0.375rem 0.75rem',
                                                            borderRadius:
                                                                '9999px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 700,
                                                            whiteSpace:
                                                                'nowrap',
                                                        }}
                                                    >
                                                        Vencida
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr',
                                                gap: '1rem',
                                                marginBottom: '1rem',
                                                fontSize: '0.85rem',
                                            }}
                                        >
                                            <div>
                                                <p
                                                    style={{
                                                        margin: 0,
                                                        color: '#64748b',
                                                        fontSize: '0.7rem',
                                                        fontWeight: 700,
                                                        textTransform:
                                                            'uppercase',
                                                        marginBottom: '0.25rem',
                                                    }}
                                                >
                                                    Vigencia
                                                </p>
                                                <p
                                                    style={{
                                                        margin: 0,
                                                        color: '#1e293b',
                                                        fontWeight: 500,
                                                    }}
                                                >
                                                    {formatDate(
                                                        version.Fecha_Vigencia,
                                                    )}
                                                </p>
                                            </div>
                                            {version.Fecha_Fin_Vigencia && (
                                                <div>
                                                    <p
                                                        style={{
                                                            margin: 0,
                                                            color: '#64748b',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 700,
                                                            textTransform:
                                                                'uppercase',
                                                            marginBottom:
                                                                '0.25rem',
                                                        }}
                                                    >
                                                        Fin Vigencia
                                                    </p>
                                                    <p
                                                        style={{
                                                            margin: 0,
                                                            color: '#1e293b',
                                                            fontWeight: 500,
                                                        }}
                                                    >
                                                        {formatDate(
                                                            version.Fecha_Fin_Vigencia,
                                                        )}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {Object.keys(cambios).length > 0 && (
                                            <div
                                                style={{
                                                    backgroundColor: '#f9fafb',
                                                    padding: '0.75rem',
                                                    borderRadius: '0.5rem',
                                                    marginBottom: '1rem',
                                                }}
                                            >
                                                <p
                                                    style={{
                                                        margin: 0,
                                                        fontSize: '0.7rem',
                                                        fontWeight: 700,
                                                        color: '#64748b',
                                                        textTransform:
                                                            'uppercase',
                                                        marginBottom: '0.5rem',
                                                    }}
                                                >
                                                    Cambios
                                                </p>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        gap: '1rem',
                                                        fontSize: '0.85rem',
                                                    }}
                                                >
                                                    {cambios.agregadas && (
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                alignItems:
                                                                    'center',
                                                                gap: '0.5rem',
                                                                color: '#16a34a',
                                                            }}
                                                        >
                                                            <span>+</span>
                                                            <span>
                                                                {
                                                                    cambios.agregadas
                                                                }{' '}
                                                                asig.
                                                            </span>
                                                        </div>
                                                    )}
                                                    {cambios.removidas && (
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                alignItems:
                                                                    'center',
                                                                gap: '0.5rem',
                                                                color: '#dc2626',
                                                            }}
                                                        >
                                                            <span>-</span>
                                                            <span>
                                                                {
                                                                    cambios.removidas
                                                                }{' '}
                                                                asig.
                                                            </span>
                                                        </div>
                                                    )}
                                                    {cambios.modificadas && (
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                alignItems:
                                                                    'center',
                                                                gap: '0.5rem',
                                                                color: '#d97706',
                                                            }}
                                                        >
                                                            <span>~</span>
                                                            <span>
                                                                {
                                                                    cambios.modificadas
                                                                }{' '}
                                                                mod.
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {compareMode && (
                                            <div
                                                style={{
                                                    marginTop: '1rem',
                                                    paddingTop: '1rem',
                                                    borderTop:
                                                        '1px solid #e2e8f0',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.75rem',
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedForDiff.has(
                                                        version.ID_Malla,
                                                    )}
                                                    onChange={() =>
                                                        onToggleDiffSelection(
                                                            version.ID_Malla,
                                                        )
                                                    }
                                                    style={{
                                                        cursor: 'pointer',
                                                        width: '1.125rem',
                                                        height: '1.125rem',
                                                    }}
                                                    aria-label={`Seleccionar versión ${version.Version_Numero} para comparar`}
                                                />
                                                <span
                                                    style={{
                                                        fontSize: '0.85rem',
                                                        color: '#64748b',
                                                    }}
                                                >
                                                    Seleccionar para comparar
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Compare mode summary */}
                        {compareMode && selectedForDiff.size > 0 && (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1rem',
                                    marginTop: '1.5rem',
                                    paddingTop: '1.5rem',
                                    borderTop: '2px solid #e2e8f0',
                                }}
                            >
                                <p
                                    style={{
                                        margin: 0,
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        color: '#64748b',
                                        letterSpacing: '0.05em',
                                    }}
                                >
                                    Seleccionadas ({selectedForDiff.size}/2)
                                </p>
                                {Array.from(selectedForDiff).map(
                                    (versionId) => {
                                        const version = versiones.find(
                                            (v) => v.ID_Malla === versionId,
                                        );
                                        if (!version) return null;

                                        return (
                                            <div
                                                key={versionId}
                                                style={{
                                                    border: `2px solid ${primaryColor}`,
                                                    borderRadius: '0.75rem',
                                                    padding: '1.25rem',
                                                    backgroundColor: '#eef2ff',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent:
                                                            'space-between',
                                                        alignItems: 'center',
                                                    }}
                                                >
                                                    <div>
                                                        <h4
                                                            style={{
                                                                margin: 0,
                                                                color: '#1e293b',
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            v
                                                            {
                                                                version.Version_Numero
                                                            }
                                                            .
                                                            {version.Version_Etiqueta ||
                                                                '0'}
                                                        </h4>
                                                    </div>
                                                    <button
                                                        onClick={() =>
                                                            onToggleDiffSelection(
                                                                version.ID_Malla,
                                                            )
                                                        }
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: primaryColor,
                                                            cursor: 'pointer',
                                                            fontSize: '1.25rem',
                                                            padding: 0,
                                                        }}
                                                        aria-label="Deseleccionar"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    },
                                )}
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button
                            onClick={onClose}
                            className="modal-btn-secondary"
                        >
                            Cerrar
                        </button>
                        {compareMode && (
                            <button
                                onClick={() => {
                                    onCompare();
                                    setCompareMode(false);
                                }}
                                disabled={!canCompare || loading}
                                className="modal-btn-primary"
                                style={{
                                    backgroundColor: canCompare
                                        ? primaryColor
                                        : '#cbd5e1',
                                    opacity: canCompare ? 1 : 0.6,
                                }}
                                aria-label="Comparar versiones seleccionadas"
                            >
                                {loading ? 'Cargando...' : 'Comparar'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
