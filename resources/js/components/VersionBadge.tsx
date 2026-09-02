import React, { useState } from 'react';

interface MallaVersion {
    ID_Malla: number;
    Version_Numero: number;
    Version_Etiqueta: string | null;
    Estado: string;
    Es_Vigente: number | null;
    Fecha_Vigencia: string;
    Fecha_Fin_Vigencia: string | null;
}

interface VersionBadgeProps {
    currentVersionId: number | null;
    versiones: MallaVersion[];
    onSelectVersion: (id: number) => void;
    onOpenHistory: () => void;
}

function EstadoIndicator({
    estado,
    esVigente,
}: {
    estado: string;
    esVigente: number | null;
}) {
    // Única fuente de verdad: Es_Vigente = 1 (no mezclar con Estado)
    const isActive = esVigente === 1;
    const isArchived = estado === 'archivada';

    return (
        <span
            style={{
                display: 'inline-block',
                width: '0.5rem',
                height: '0.5rem',
                borderRadius: '50%',
                backgroundColor: isActive
                    ? '#047857'
                    : isArchived
                      ? '#64748b'
                      : '#94a3b8',
            }}
            aria-label={
                isActive ? 'Vigente' : isArchived ? 'Archivada' : 'Borrador'
            }
        />
    );
}

export default function VersionBadge({
    currentVersionId,
    versiones,
    onSelectVersion,
    onOpenHistory,
}: VersionBadgeProps) {
    const [showDropdown, setShowDropdown] = useState(false);

    const current = versiones.find((v) => v.ID_Malla === currentVersionId);
    const isHistoric = current && !current.Es_Vigente;

    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm">
                <span
                    style={{
                        fontSize: '0.75rem',
                        color: '#00236f',
                        fontWeight: 700,
                    }}
                >
                    V{current?.Version_Numero ?? '?'}
                </span>
                {current?.Version_Etiqueta && (
                    <span
                        style={{
                            fontSize: '0.75rem',
                            color: '#64748b',
                            fontFamily: 'Monaco, monospace',
                        }}
                    >
                        .{current.Version_Etiqueta}
                    </span>
                )}
                {isHistoric && (
                    <span
                        style={{
                            marginLeft: '0.25rem',
                            backgroundColor: '#fef3c7',
                            color: '#92400e',
                            borderRadius: '0.25rem',
                            padding: '0.125rem 0.375rem',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                        }}
                    >
                        Historica
                    </span>
                )}
            </div>

            {versiones.length > 1 && (
                <div className="flex gap-1">
                    <button
                        onClick={onOpenHistory}
                        style={{
                            borderRadius: '0.5rem',
                            border: '1px solid #e2e8f0',
                            backgroundColor: 'white',
                            padding: '0.375rem 0.75rem',
                            fontSize: '0.8rem',
                            color: '#00236f',
                            cursor: 'pointer',
                            fontWeight: 600,
                            transition: 'all 200ms',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#eef2ff';
                            e.currentTarget.style.borderColor = '#00236f';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'white';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                        }}
                    >
                        Historial
                    </button>

                    <div className="relative" style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowDropdown(!showDropdown)}
                            style={{
                                borderRadius: '0.5rem',
                                border: '1px solid #e2e8f0',
                                backgroundColor: 'white',
                                padding: '0.375rem 0.5rem',
                                fontSize: '0.75rem',
                                color: '#64748b',
                                cursor: 'pointer',
                                transition: 'all 200ms',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                    '#f8fafc';
                                e.currentTarget.style.borderColor = '#cbd5e1';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'white';
                                e.currentTarget.style.borderColor = '#e2e8f0';
                            }}
                            aria-label="Cambiar de version"
                        >
                            ▼
                        </button>
                        {showDropdown && (
                            <>
                                <div
                                    onClick={() => setShowDropdown(false)}
                                    style={{
                                        position: 'fixed',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        zIndex: 49,
                                    }}
                                />
                                <div
                                    style={{
                                        position: 'absolute',
                                        right: 0,
                                        top: '100%',
                                        marginTop: '0.25rem',
                                        width: '16rem',
                                        backgroundColor: 'white',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '0.5rem',
                                        boxShadow:
                                            '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                        zIndex: 50,
                                    }}
                                >
                                    <div
                                        style={{
                                            borderBottom: '1px solid #e2e8f0',
                                            padding: '0.5rem 0.75rem',
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                                color: '#64748b',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            Versiones disponibles
                                        </span>
                                    </div>
                                    {versiones.map((v) => (
                                        <button
                                            key={v.ID_Malla}
                                            onClick={() => {
                                                setShowDropdown(false);
                                                onSelectVersion(v.ID_Malla);
                                            }}
                                            style={{
                                                display: 'flex',
                                                width: '100%',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                padding: '0.5rem 0.75rem',
                                                textAlign: 'left',
                                                fontSize: '0.85rem',
                                                border: 'none',
                                                background:
                                                    v.ID_Malla ===
                                                    currentVersionId
                                                        ? '#eef2ff'
                                                        : 'white',
                                                color: '#1e293b',
                                                cursor: 'pointer',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor =
                                                    '#f8fafc';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor =
                                                    v.ID_Malla ===
                                                    currentVersionId
                                                        ? '#eef2ff'
                                                        : 'white';
                                            }}
                                        >
                                            <EstadoIndicator
                                                estado={v.Estado}
                                                esVigente={v.Es_Vigente}
                                            />
                                            <span>
                                                Version {v.Version_Numero}
                                            </span>
                                            {v.Es_Vigente ? (
                                                <span
                                                    style={{
                                                        marginLeft: 'auto',
                                                        backgroundColor:
                                                            '#dcfce7',
                                                        color: '#166534',
                                                        borderRadius: '0.25rem',
                                                        padding:
                                                            '0.125rem 0.375rem',
                                                        fontSize: '0.7rem',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    Actual
                                                </span>
                                            ) : (
                                                <span
                                                    style={{
                                                        marginLeft: 'auto',
                                                        fontSize: '0.75rem',
                                                        color: '#94a3b8',
                                                    }}
                                                >
                                                    {v.Fecha_Vigencia
                                                        ? new Date(
                                                              v.Fecha_Vigencia,
                                                          ).toLocaleDateString(
                                                              'es-CO',
                                                          )
                                                        : ''}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
