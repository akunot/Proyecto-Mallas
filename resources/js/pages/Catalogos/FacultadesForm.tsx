import { useState } from 'react';
import { Head } from '@inertiajs/react';
import MainLayout from '@/Layout/MainLayout';

interface Facultad {
    ID_Facultad: number;
    ID_Sede: number;
    Codigo_Facultad: string | null;
    Nombre_Facultad: string;
    Conmutador_Facultad: string | null;
    Extension_Facultad: string | null;
    Campus_Facultad: string | null;
    Url_Facultad: string | null;
    Esta_Activo?: number;
}

interface Sede {
    ID_Sede: number;
    Nombre_Sede: string;
}

interface Props {
    facultad?: Facultad;
    sedes: Sede[];
    errors?: Record<string, string>;
}

export default function FacultadesForm({
    facultad,
    sedes,
    errors: initialErrors,
}: Props) {
    const isEditing = !!facultad;
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>(
        initialErrors || {},
    );

    const [formData, setFormData] = useState({
        Codigo_Facultad: facultad?.Codigo_Facultad || '',
        ID_Sede:
            facultad?.ID_Sede?.toString() ||
            sedes[0]?.ID_Sede?.toString() ||
            '',
        Nombre_Facultad: facultad?.Nombre_Facultad || '',
        Conmutador_Facultad: facultad?.Conmutador_Facultad || '',
        Extension_Facultad: facultad?.Extension_Facultad || '',
        Campus_Facultad: facultad?.Campus_Facultad || '',
        Url_Facultad: facultad?.Url_Facultad || '',
    });

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        try {
            const method = isEditing ? 'PUT' : 'POST';
            const url = isEditing
                ? `/api/v1/facultades/${facultad.ID_Facultad}`
                : '/api/v1/facultades';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                credentials: 'same-origin', // Incluir cookies de sesión
                body: JSON.stringify({
                    ...formData,
                    ID_Sede: parseInt(formData.ID_Sede),
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                if (result.errors) {
                    setErrors(result.errors);
                } else if (result.message) {
                    setErrors({ general: result.message });
                }
                setLoading(false);
                return;
            }

            window.location.href = '/facultades';
        } catch (error) {
            console.error('Error submitting form:', error);
            setErrors({ general: 'Error de conexión. Intente nuevamente.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <MainLayout>
            <Head title={isEditing ? 'Editar Facultad' : 'Nueva Facultad'} />

            <div className="page-header">
                <div className="page-title">
                    <h1>{isEditing ? 'Editar Facultad' : 'Nueva Facultad'}</h1>
                    <p className="page-subtitle">
                        {isEditing
                            ? 'Modifica los datos de la facultad'
                            : 'Registra una nueva facultad'}
                    </p>
                </div>
            </div>

            {errors.general && (
                <div className="alert alert-error">{errors.general}</div>
            )}

            <div className="form-container">
                <form onSubmit={handleSubmit} className="form">
                    <div className="form-grid">
                        <div className="form-group">
                            <label htmlFor="Codigo_Facultad">
                                Código de Facultad
                            </label>
                            <input
                                type="text"
                                id="Codigo_Facultad"
                                name="Codigo_Facultad"
                                value={formData.Codigo_Facultad}
                                onChange={handleChange}
                                placeholder="Ej: 1"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="ID_Sede">Sede *</label>
                            <select
                                id="ID_Sede"
                                name="ID_Sede"
                                value={formData.ID_Sede}
                                onChange={handleChange}
                                className={errors.ID_Sede ? 'input-error' : ''}
                                required
                            >
                                <option value="">Seleccionar sede...</option>
                                {sedes.map((sede) => (
                                    <option
                                        key={sede.ID_Sede}
                                        value={sede.ID_Sede}
                                    >
                                        {sede.Nombre_Sede}
                                    </option>
                                ))}
                            </select>
                            {errors.ID_Sede && (
                                <span className="error-message">
                                    {errors.ID_Sede}
                                </span>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="Nombre_Facultad">
                                Nombre de la Facultad *
                            </label>
                            <input
                                type="text"
                                id="Nombre_Facultad"
                                name="Nombre_Facultad"
                                value={formData.Nombre_Facultad}
                                onChange={handleChange}
                                className={
                                    errors.Nombre_Facultad ? 'input-error' : ''
                                }
                                required
                            />
                            {errors.Nombre_Facultad && (
                                <span className="error-message">
                                    {errors.Nombre_Facultad}
                                </span>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="Conmutador_Facultad">
                                Conmutador
                            </label>
                            <input
                                type="text"
                                id="Conmutador_Facultad"
                                name="Conmutador_Facultad"
                                value={formData.Conmutador_Facultad}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="Extension_Facultad">
                                Extensión
                            </label>
                            <input
                                type="text"
                                id="Extension_Facultad"
                                name="Extension_Facultad"
                                value={formData.Extension_Facultad}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="Campus_Facultad">Campus</label>
                            <input
                                type="text"
                                id="Campus_Facultad"
                                name="Campus_Facultad"
                                value={formData.Campus_Facultad}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="Url_Facultad">URL</label>
                            <input
                                type="url"
                                id="Url_Facultad"
                                name="Url_Facultad"
                                value={formData.Url_Facultad}
                                onChange={handleChange}
                                placeholder="https://..."
                            />
                        </div>
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => window.history.back()}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                        >
                            {loading
                                ? 'Guardando...'
                                : isEditing
                                  ? 'Actualizar'
                                  : 'Crear'}
                        </button>
                    </div>
                </form>
            </div>
        </MainLayout>
    );
}
