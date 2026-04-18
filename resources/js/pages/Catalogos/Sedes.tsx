import { useState } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import MainLayout from '@/Layout/MainLayout';
import DataTable from '@/components/DataTable';

interface Sede {
    ID_Sede: number;
    Nombre_Sede: string;
    Ciudad_Sede: string;
    Direccion_Sede: string | null;
    Conmutador_Sede: string | null;
    Campus_Sede: string | null;
    Url_Sede: string | null;
}

interface Props {
    sedes: {
        data: Sede[];
        meta: {
            current_page: number;
            total: number;
            per_page: number;
            last_page: number;
        };
    };
}

export default function Sedes({ sedes: initialSedes }: Props) {
    // Usar datos iniciales si existen, sino array vacío
    const initialData = initialSedes?.data || [];
    const initialMeta = initialSedes?.meta || {
        current_page: 1,
        total: 0,
        per_page: 20,
        last_page: 1,
    };

    const [data, setData] = useState<Sede[]>(initialData);
    const [meta, setMeta] = useState(initialMeta);
    const [loading, setLoading] = useState(false);

    const columns = [
        { key: 'Codigo_Sede', label: 'Código', sortable: true },
        { key: 'ID_Sede', label: 'ID', sortable: true },
        { key: 'Nombre_Sede', label: 'Nombre', sortable: true },
        { key: 'Ciudad_Sede', label: 'Ciudad', sortable: true },
        { key: 'Direccion_Sede', label: 'Dirección' },
        { key: 'Conmutador_Sede', label: 'Conmutador' },
        {
            key: 'Campus_Sede',
            label: 'Campus',
            render: (value: string | null) => value || '-',
        },
    ];

    // Los datos se cargan desde el servidor via Inertia props
    // No se necesitan llamadas API adicionales
    const handleSearch = async (search: string, page: number = 1) => {
        // TODO: Implementar búsqueda server-side si es necesario
        // Por ahora, filtramos localmente
        setLoading(true);
        try {
            if (!search) {
                setData(initialData);
                setMeta(initialMeta);
            } else {
                const filtered = initialData.filter(
                    (sede) =>
                        sede.Nombre_Sede.toLowerCase().includes(
                            search.toLowerCase(),
                        ) ||
                        sede.Ciudad_Sede?.toLowerCase().includes(
                            search.toLowerCase(),
                        ),
                );
                setData(filtered);
                setMeta({ ...meta, total: filtered.length });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        // Recargar la página para obtener datos actualizados del servidor
        window.location.reload();
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Está seguro de eliminar esta sede?')) return;

        try {
            const response = await fetch(`/sedes/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                credentials: 'same-origin',
            });

            if (response.ok) {
                handleRefresh();
            }
        } catch (error) {
            console.error('Error deleting sede:', error);
        }
    };

    const actions = (row: Sede) => (
        <div className="action-buttons">
            <button
                className="btn-edit"
                onClick={() => router.visit(`/sedes/${row.ID_Sede}/edit`)}
                title="Editar"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
            </button>
            <button
                className="btn-delete"
                onClick={() => handleDelete(row.ID_Sede)}
                title="Eliminar"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
            </button>
        </div>
    );

    return (
        <MainLayout>
            <Head title="Sedes - Mallas UNAL" />

            <div className="page-header">
                <div className="page-title">
                    <h1>Gestión de Sedes</h1>
                    <p className="page-subtitle">
                        Administra las sedes de la Universidad Nacional de
                        Colombia
                    </p>
                </div>
                <div className="page-actions">
                    <button
                        className="btn-primary"
                        onClick={() => router.visit('/sedes/create')}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Nueva Sede
                    </button>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={data}
                meta={meta}
                loading={loading}
                searchPlaceholder="Buscar por nombre o ciudad..."
                onSearch={handleSearch}
                onRefresh={handleRefresh}
                actions={actions}
                emptyMessage="No hay sedes registradas"
            />
        </MainLayout>
    );
}
