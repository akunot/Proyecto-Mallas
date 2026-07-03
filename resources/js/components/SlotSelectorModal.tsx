import React, { useState, useMemo, useCallback, useEffect } from 'react';

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

interface Electiva {
    ID_Asignatura: number;
    Codigo_Asignatura: string;
    Nombre_Asignatura: string;
    Creditos_Asignatura: number;
    Horas_Presencial?: number;
    Horas_Estudiante?: number;
    requisitos?: Requisito[];
}

interface Slot {
    ID_Slot: number;
    Nombre_Slot: string;
    Tipo_Slot: 'optativa' | 'libre' | 'nivelatorio';
    Semestre: number | null;
    Nombre_Agrupacion?: string;
}

interface SlotSelectorModalProps {
    open: boolean;
    slot: Slot | null;
    items: Electiva[];
    loading?: boolean;
    error?: string | null;
    onClose: () => void;
    onSelect?: (item: Electiva) => Promise<void>;
    type?: 'optativa' | 'libre';
}

type SortBy = 'nombre' | 'codigo' | 'creditos';

/**
 * SlotSelectorModal - Modal mejorado para seleccionar asignaturas en slots
 *
 * Características:
 * - Búsqueda en tiempo real
 * - Sorting por nombre, código, créditos
 * - Información completa visible (créditos, horas, requisitos)
 * - Requisitos con badges semánticos
 * - Hover effects claros
 * - Contexto visual (nombre del slot + semestre)
 * - Accesibilidad (ARIA labels)
 */
export default function SlotSelectorModal({
    open,
    slot,
    items,
    loading = false,
    error = null,
    onClose,
    type = 'optativa',
}: SlotSelectorModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortBy>('nombre');
    const [selectedItem, setSelectedItem] = useState<Electiva | null>(null);
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    // Filtrar y ordenar items
    const filteredAndSorted = useMemo(() => {
        let filtered = items.filter(
            (item) =>
                item.Nombre_Asignatura.toLowerCase().includes(
                    searchQuery.toLowerCase(),
                ) ||
                item.Codigo_Asignatura.toLowerCase().includes(
                    searchQuery.toLowerCase(),
                ),
        );

        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'codigo':
                    return a.Codigo_Asignatura.localeCompare(
                        b.Codigo_Asignatura,
                    );
                case 'creditos':
                    return (
                        (b.Creditos_Asignatura || 0) -
                        (a.Creditos_Asignatura || 0)
                    );
                case 'nombre':
                default:
                    return a.Nombre_Asignatura.localeCompare(
                        b.Nombre_Asignatura,
                    );
            }
        });

        return filtered;
    }, [items, searchQuery, sortBy]);

    // Toggle requisitos expandidos
    const toggleRowExpanded = useCallback(
        (id: number) => {
            const newExpanded = new Set(expandedRows);
            if (newExpanded.has(id)) {
                newExpanded.delete(id);
            } else {
                newExpanded.add(id);
            }
            setExpandedRows(newExpanded);
        },
        [expandedRows],
    );

    // Limpiar estado cuando se cierra
    useEffect(() => {
        if (!open) {
            setSelectedItem(null);
            setSearchQuery('');
            setExpandedRows(new Set());
        }
    }, [open]);

    if (!open) return null;

    const headerColor = type === 'optativa' ? '#fff8e1' : '#e1f5fe';
    const headerDark = type === 'optativa' ? '#ffecb3' : '#b3e5fc';
    const headerTextColor = type === 'optativa' ? '#3d1a00' : '#001a4b';
    const accentColor = type === 'optativa' ? '#f9a825' : '#4fc3f7';

    return (
        <>
            <div className="modal-overlay" onClick={onClose}>
                <div
                    className="modal-container"
                    style={{
                        maxWidth: '800px',
                        maxHeight: '90vh',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div
                        className="modal-header"
                        style={{
                            background: `linear-gradient(135deg, ${headerColor} 0%, ${headerDark} 100%)`,
                            color: headerTextColor,
                            borderBottom: `3px solid ${accentColor}`,
                        }}
                    >
                        <div>
                            <h2
                                style={{
                                    margin: 0,
                                    fontSize: '1.25rem',
                                    fontWeight: 600,
                                    color: headerTextColor,
                                }}
                            >
                                {type === 'optativa'
                                    ? 'Catálogo de Optativas'
                                    : 'Catálogo de Libre Elección'}
                            </h2>
                            {slot?.Nombre_Agrupacion && (
                                <p
                                    style={{
                                        margin: '0.5rem 0 0 0',
                                        fontSize: '0.875rem',
                                        opacity: 0.9,
                                        color: headerTextColor,
                                    }}
                                >
                                    Agrupación:{' '}
                                    <strong>{slot.Nombre_Agrupacion}</strong>
                                </p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="modal-close-btn"
                            style={{
                                color: headerTextColor,
                                transition: 'color 200ms',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = accentColor;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = headerTextColor;
                            }}
                            aria-label="Cerrar"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Content */}
                    <div className="modal-body">
                        {/* Error */}
                        {error && (
                            <div
                                style={{
                                    backgroundColor: '#fee2e2',
                                    border: '1px solid #fca5a5',
                                    borderRadius: '0.5rem',
                                    padding: '1rem',
                                    color: '#991b1b',
                                    fontSize: '0.875rem',
                                    marginBottom: '1.5rem',
                                }}
                            >
                                {error}
                            </div>
                        )}

                        {/* Search & Sort */}
                        <div
                            style={{
                                display: 'flex',
                                gap: '1rem',
                                marginBottom: '1.5rem',
                            }}
                        >
                            {/* Search Input */}
                            <div style={{ flex: 1 }}>
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre o código..."
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.9rem',
                                        fontFamily: 'inherit',
                                        color: '#1e293b',
                                        transition: 'all 200ms',
                                        boxShadow:
                                            '0 1px 2px rgba(0, 0, 0, 0.05)',
                                    }}
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor =
                                            headerColor;
                                        e.currentTarget.style.boxShadow = `0 0 0 3px ${headerColor}20`;
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor =
                                            '#e2e8f0';
                                        e.currentTarget.style.boxShadow =
                                            '0 1px 2px rgba(0, 0, 0, 0.05)';
                                    }}
                                    aria-label="Buscar asignatura"
                                />
                            </div>

                            {/* Sort Select */}
                            <div>
                                <select
                                    value={sortBy}
                                    onChange={(e) =>
                                        setSortBy(e.target.value as SortBy)
                                    }
                                    style={{
                                        padding: '0.75rem',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.9rem',
                                        fontFamily: 'inherit',
                                        color: '#1e293b',
                                        cursor: 'pointer',
                                        backgroundColor: 'white',
                                    }}
                                    aria-label="Ordenar por"
                                >
                                    <option value="nombre">Nombre A-Z</option>
                                    <option value="codigo">Código A-Z</option>
                                    <option value="creditos">
                                        Créditos (desc)
                                    </option>
                                </select>
                            </div>
                        </div>

                        {/* Search Count */}
                        {searchQuery && (
                            <div
                                style={{
                                    fontSize: '0.875rem',
                                    color: '#64748b',
                                }}
                            >
                                {filteredAndSorted.length} resultado(s)
                                encontrado(s)
                            </div>
                        )}

                        {/* Loading State */}
                        {loading && (
                            <div
                                style={{ textAlign: 'center', padding: '2rem' }}
                            >
                                <div
                                    style={{
                                        display: 'inline-block',
                                        width: '2rem',
                                        height: '2rem',
                                        border: '3px solid #e2e8f0',
                                        borderTopColor: headerColor,
                                        borderRadius: '50%',
                                        animation: 'spin 0.8s linear infinite',
                                    }}
                                />
                            </div>
                        )}

                        {/* Empty State */}
                        {!loading && filteredAndSorted.length === 0 && (
                            <div
                                style={{
                                    textAlign: 'center',
                                    padding: '2rem',
                                    color: '#64748b',
                                }}
                            >
                                <p style={{ margin: 0, fontSize: '0.95rem' }}>
                                    {searchQuery
                                        ? 'No hay resultados para tu búsqueda'
                                        : 'No hay asignaturas disponibles'}
                                </p>
                            </div>
                        )}

                        {/* Table */}
                        {!loading && filteredAndSorted.length > 0 && (
                            <div
                                style={{
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '0.5rem',
                                }}
                            >
                                <table
                                    style={{
                                        width: '100%',
                                        borderCollapse: 'collapse',
                                        fontSize: '0.9rem',
                                    }}
                                >
                                    <thead>
                                        <tr
                                            style={{
                                                backgroundColor: '#f8fafc',
                                                borderBottom:
                                                    '2px solid #e2e8f0',
                                            }}
                                        >
                                            <th
                                                style={{
                                                    padding: '0.75rem',
                                                    textAlign: 'left',
                                                    fontWeight: 600,
                                                    color: '#64748b',
                                                    fontSize: '0.75rem',
                                                    textTransform: 'uppercase',
                                                    width: '70px',
                                                }}
                                            >
                                                Código
                                            </th>
                                            <th
                                                style={{
                                                    padding: '0.75rem',
                                                    textAlign: 'left',
                                                    fontWeight: 600,
                                                    color: '#64748b',
                                                    fontSize: '0.75rem',
                                                    textTransform: 'uppercase',
                                                    flex: 1,
                                                }}
                                            >
                                                Nombre
                                            </th>
                                            <th
                                                style={{
                                                    padding: '0.75rem',
                                                    textAlign: 'center',
                                                    fontWeight: 600,
                                                    color: '#64748b',
                                                    fontSize: '0.75rem',
                                                    textTransform: 'uppercase',
                                                    width: '50px',
                                                }}
                                            >
                                                Cr.
                                            </th>
                                            <th
                                                style={{
                                                    padding: '0.75rem',
                                                    textAlign: 'center',
                                                    fontWeight: 600,
                                                    color: '#64748b',
                                                    fontSize: '0.75rem',
                                                    textTransform: 'uppercase',
                                                    width: '60px',
                                                }}
                                            >
                                                Horas
                                            </th>
                                            <th
                                                style={{
                                                    padding: '0.75rem',
                                                    textAlign: 'center',
                                                    fontWeight: 600,
                                                    color: '#64748b',
                                                    fontSize: '0.75rem',
                                                    textTransform: 'uppercase',
                                                    width: '30px',
                                                }}
                                            >
                                                Req
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAndSorted.map((item) => {
                                            const isExpanded = expandedRows.has(
                                                item.ID_Asignatura,
                                            );
                                            const hasRequisitos =
                                                item.requisitos &&
                                                item.requisitos.length > 0;

                                            return (
                                                <React.Fragment
                                                    key={item.ID_Asignatura}
                                                >
                                                    {/* Main Row */}
                                                    <tr
                                                        style={{
                                                            backgroundColor:
                                                                selectedItem?.ID_Asignatura ===
                                                                item.ID_Asignatura
                                                                    ? '#f0f9ff'
                                                                    : 'white',
                                                            borderBottom:
                                                                '1px solid #e2e8f0',
                                                            cursor: 'pointer',
                                                            transition:
                                                                'background 200ms',
                                                        }}
                                                        onClick={() =>
                                                            setSelectedItem(
                                                                item,
                                                            )
                                                        }
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor =
                                                                '#f0f9ff';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor =
                                                                selectedItem?.ID_Asignatura ===
                                                                item.ID_Asignatura
                                                                    ? '#f0f9ff'
                                                                    : 'white';
                                                        }}
                                                        role="button"
                                                        tabIndex={0}
                                                        aria-selected={
                                                            selectedItem?.ID_Asignatura ===
                                                            item.ID_Asignatura
                                                        }
                                                    >
                                                        <td
                                                            style={{
                                                                padding:
                                                                    '0.75rem',
                                                                fontFamily:
                                                                    'Monaco, monospace',
                                                                fontSize:
                                                                    '0.85rem',
                                                                color: '#64748b',
                                                                fontWeight: 500,
                                                            }}
                                                        >
                                                            {
                                                                item.Codigo_Asignatura
                                                            }
                                                        </td>
                                                        <td
                                                            style={{
                                                                padding:
                                                                    '0.75rem',
                                                                color: '#1e293b',
                                                            }}
                                                        >
                                                            {
                                                                item.Nombre_Asignatura
                                                            }
                                                        </td>
                                                        <td
                                                            style={{
                                                                padding:
                                                                    '0.75rem',
                                                                textAlign:
                                                                    'center',
                                                                color: '#1e293b',
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            {
                                                                item.Creditos_Asignatura
                                                            }
                                                        </td>
                                                        <td
                                                            style={{
                                                                padding:
                                                                    '0.75rem',
                                                                textAlign:
                                                                    'center',
                                                                fontSize:
                                                                    '0.85rem',
                                                                color: '#64748b',
                                                            }}
                                                        >
                                                            {item.Horas_Presencial &&
                                                            item.Horas_Estudiante
                                                                ? `${item.Horas_Presencial}-${item.Horas_Estudiante}`
                                                                : '—'}
                                                        </td>
                                                        <td
                                                            style={{
                                                                padding:
                                                                    '0.75rem',
                                                                textAlign:
                                                                    'center',
                                                            }}
                                                        >
                                                            {hasRequisitos && (
                                                                <button
                                                                    onClick={(
                                                                        e,
                                                                    ) => {
                                                                        e.stopPropagation();
                                                                        toggleRowExpanded(
                                                                            item.ID_Asignatura,
                                                                        );
                                                                    }}
                                                                    style={{
                                                                        background:
                                                                            'none',
                                                                        border: 'none',
                                                                        cursor: 'pointer',
                                                                        fontSize:
                                                                            '1.1rem',
                                                                        padding: 0,
                                                                        display:
                                                                            'flex',
                                                                        alignItems:
                                                                            'center',
                                                                        justifyContent:
                                                                            'center',
                                                                        width: '24px',
                                                                        height: '24px',
                                                                        transform:
                                                                            isExpanded
                                                                                ? 'rotate(180deg)'
                                                                                : 'rotate(0deg)',
                                                                        transition:
                                                                            'transform 200ms',
                                                                    }}
                                                                    aria-label="Mostrar requisitos"
                                                                >
                                                                    ▼
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>

                                                    {/* Requisitos Row */}
                                                    {isExpanded &&
                                                        hasRequisitos && (
                                                            <tr
                                                                style={{
                                                                    backgroundColor:
                                                                        '#f8fafc',
                                                                    borderBottom:
                                                                        '1px solid #e2e8f0',
                                                                }}
                                                            >
                                                                <td
                                                                    colSpan={5}
                                                                    style={{
                                                                        padding:
                                                                            '1rem',
                                                                    }}
                                                                >
                                                                    <div>
                                                                        <p
                                                                            style={{
                                                                                margin: '0 0 0.75rem 0',
                                                                                fontSize:
                                                                                    '0.75rem',
                                                                                fontWeight: 700,
                                                                                textTransform:
                                                                                    'uppercase',
                                                                                color: '#64748b',
                                                                            }}
                                                                        >
                                                                            Requisitos
                                                                        </p>
                                                                        <div
                                                                            style={{
                                                                                display:
                                                                                    'flex',
                                                                                flexWrap:
                                                                                    'wrap',
                                                                                gap: '0.5rem',
                                                                            }}
                                                                        >
                                                                            {item.requisitos?.map(
                                                                                (
                                                                                    req,
                                                                                    idx,
                                                                                ) => {
                                                                                    const reqType =
                                                                                        (
                                                                                            req.Tipo_Requisito ||
                                                                                            ''
                                                                                        ).toLowerCase();

                                                                                    let bgColor =
                                                                                        '#f3f4f6';
                                                                                    let textColor =
                                                                                        '#6b7280';

                                                                                    if (
                                                                                        reqType.includes(
                                                                                            'pre',
                                                                                        )
                                                                                    ) {
                                                                                        bgColor =
                                                                                            '#fee2e2';
                                                                                        textColor =
                                                                                            '#991b1b';
                                                                                    } else if (
                                                                                        reqType.includes(
                                                                                            'co',
                                                                                        )
                                                                                    ) {
                                                                                        bgColor =
                                                                                            '#fef3c7';
                                                                                        textColor =
                                                                                            '#92400e';
                                                                                    } else if (
                                                                                        reqType.toLowerCase() ===
                                                                                        'opcional'
                                                                                    ) {
                                                                                        bgColor =
                                                                                            '#dbeafe';
                                                                                        textColor =
                                                                                            '#0c4a6e';
                                                                                    }

                                                                                    const displayText =
                                                                                        req.asignatura_requerida
                                                                                            ? `${req.asignatura_requerida.Nombre_Asignatura} (${req.asignatura_requerida.Codigo_Asignatura})`
                                                                                            : req.Descripcion_Requisito ||
                                                                                              (req.Valor_Creditos
                                                                                                  ? `${req.Valor_Creditos} cr.`
                                                                                                  : '—');

                                                                                    return (
                                                                                        <div
                                                                                            key={
                                                                                                idx
                                                                                            }
                                                                                            style={{
                                                                                                display:
                                                                                                    'inline-flex',
                                                                                                alignItems:
                                                                                                    'center',
                                                                                                gap: '0.5rem',
                                                                                                backgroundColor:
                                                                                                    bgColor,
                                                                                                color: textColor,
                                                                                                padding:
                                                                                                    '0.375rem 0.75rem',
                                                                                                borderRadius:
                                                                                                    '9999px',
                                                                                                fontSize:
                                                                                                    '0.8rem',
                                                                                                fontWeight:
                                                                                                    '500',
                                                                                            }}
                                                                                        >
                                                                                            <span
                                                                                                style={{
                                                                                                    fontSize:
                                                                                                        '0.7rem',
                                                                                                    fontWeight:
                                                                                                        '700',
                                                                                                    opacity: 0.8,
                                                                                                }}
                                                                                            >
                                                                                                {reqType.includes(
                                                                                                    'pre',
                                                                                                )
                                                                                                    ? 'Pre'
                                                                                                    : reqType.includes(
                                                                                                            'co',
                                                                                                        )
                                                                                                      ? 'Co'
                                                                                                      : 'Opt'}
                                                                                            </span>
                                                                                            {
                                                                                                displayText
                                                                                            }
                                                                                        </div>
                                                                                    );
                                                                                },
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div
                        className="modal-footer"
                        style={{
                            justifyContent: 'space-between',
                        }}
                    >
                        <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                            {!loading && filteredAndSorted.length > 0 && (
                                <>
                                    {searchQuery
                                        ? `${filteredAndSorted.length} de ${items.length}`
                                        : items.length}{' '}
                                    asignatura{items.length !== 1 ? 's' : ''}
                                </>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                onClick={onClose}
                                className="modal-btn-primary"
                                style={{
                                    backgroundColor: accentColor,
                                    fontSize: '0.95rem',
                                }}
                                aria-label="Cerrar catálogo"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Spinner animation */}
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </>
    );
}
