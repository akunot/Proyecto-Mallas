import { Head, router, usePage } from '@inertiajs/react';
import MainLayout from '@/Layout/MainLayout';
import { useState, useEffect } from 'react';

interface Agrupacion {
    ID_Plantilla_Agrupacion?: number;
    ID_Programa: number;
    ID_Componente: number;
    Nombre_Agrupacion: string;
    Tipo_Agrupacion: string;
    Creditos_Requeridos: number | null;
    Creditos_Maximos: number | null;
    Es_Obligatoria: boolean;
}

interface Props {
    agrupacion?: Agrupacion;
    programas: Array<{
        ID_Programa: number;
        Nombre_Programa: string;
    }>;
    componentes: Array<{
        ID_Componente: number;
        Nombre_Componente: string;
    }>;
}

export default function AgrupacionesForm({ agrupacion, programas, componentes }: Props) {
    const { url } = usePage();
    const isEditing = !!agrupacion?.ID_Plantilla_Agrupacion;
    
    const [formData, setFormData] = useState<Agrupacion>({
        ID_Programa: agrupacion?.ID_Programa || 0,
        ID_Componente: agrupacion?.ID_Componente || 0,
        Nombre_Agrupacion: agrupacion?.Nombre_Agrupacion || '',
        Tipo_Agrupacion: agrupacion?.Tipo_Agrupacion || '',
        Creditos_Requeridos: agrupacion?.Creditos_Requeridos || null,
        Creditos_Maximos: agrupacion?.Creditos_Maximos || null,
        Es_Obligatoria: agrupacion?.Es_Obligatoria || false,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        // Actualizar créditos requeridos cuando cambia Es_Obligatoria
        if (formData.Es_Obligatoria && formData.Creditos_Requeridos === null) {
            setFormData(prev => ({ ...prev, Creditos_Requeridos: 0 }));
        }
    }, [formData.Es_Obligatoria, formData.Creditos_Requeridos]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else if (type === 'number') {
            const numValue = value === '' ? null : Number(value);
            setFormData(prev => ({ ...prev, [name]: numValue }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
        
        // Limpiar error del campo
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        const url = isEditing 
            ? `/api/v1/agrupaciones/${agrupacion?.ID_Plantilla_Agrupacion}`
            : '/api/v1/agrupaciones';
        
        const method = isEditing ? 'PUT' : 'POST';

        router[method.toLowerCase() === 'put' ? 'put' : 'post'](url, formData as Record<string, any>, {
            onSuccess: () => {
                router.visit('/agrupaciones');
            },
            onError: (errors: any) => {
                setErrors(errors as Record<string, string>);
            },
            onFinish: () => {
                setIsSubmitting(false);
            },
        });
    };

    const handleCancel = () => {
        router.visit('/agrupaciones');
    };

    return (
        <>
            <Head title={isEditing ? 'Editar Agrupación' : 'Nueva Agrupación'} />
            
            <MainLayout>
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">
                            {isEditing ? 'Editar Agrupación' : 'Nueva Agrupación'}
                        </h1>
                        <p className="mt-2 text-gray-600">
                            {isEditing 
                                ? 'Modifica los datos de la plantilla de agrupación curricular'
                                : 'Crea una nueva plantilla de agrupación curricular'
                            }
                        </p>
                    </div>

                    {/* Form */}
                    <div className="bg-white shadow-sm rounded-lg">
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Programa */}
                                <div>
                                    <label htmlFor="ID_Programa" className="block text-sm font-medium text-gray-700 mb-2">
                                        Programa *
                                    </label>
                                    <select
                                        id="ID_Programa"
                                        name="ID_Programa"
                                        value={formData.ID_Programa}
                                        onChange={handleInputChange}
                                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                            errors.ID_Programa ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        required
                                    >
                                        <option value="">Seleccionar programa</option>
                                        {programas.map((programa) => (
                                            <option key={programa.ID_Programa} value={programa.ID_Programa}>
                                                {programa.Nombre_Programa}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.ID_Programa && (
                                        <p className="mt-1 text-sm text-red-600">{errors.ID_Programa}</p>
                                    )}
                                </div>

                                {/* Componente */}
                                <div>
                                    <label htmlFor="ID_Componente" className="block text-sm font-medium text-gray-700 mb-2">
                                        Componente *
                                    </label>
                                    <select
                                        id="ID_Componente"
                                        name="ID_Componente"
                                        value={formData.ID_Componente}
                                        onChange={handleInputChange}
                                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                            errors.ID_Componente ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        required
                                    >
                                        <option value="">Seleccionar componente</option>
                                        {componentes.map((componente) => (
                                            <option key={componente.ID_Componente} value={componente.ID_Componente}>
                                                {componente.Nombre_Componente}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.ID_Componente && (
                                        <p className="mt-1 text-sm text-red-600">{errors.ID_Componente}</p>
                                    )}
                                </div>

                                {/* Nombre Agrupación */}
                                <div>
                                    <label htmlFor="Nombre_Agrupacion" className="block text-sm font-medium text-gray-700 mb-2">
                                        Nombre Agrupación *
                                    </label>
                                    <input
                                        type="text"
                                        id="Nombre_Agrupacion"
                                        name="Nombre_Agrupacion"
                                        value={formData.Nombre_Agrupacion}
                                        onChange={handleInputChange}
                                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                            errors.Nombre_Agrupacion ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        placeholder="Ej: Fundamentación Obligatoria"
                                        required
                                    />
                                    {errors.Nombre_Agrupacion && (
                                        <p className="mt-1 text-sm text-red-600">{errors.Nombre_Agrupacion}</p>
                                    )}
                                </div>

                                {/* Tipo Agrupación */}
                                <div>
                                    <label htmlFor="Tipo_Agrupacion" className="block text-sm font-medium text-gray-700 mb-2">
                                        Tipo Agrupación *
                                    </label>
                                    <input
                                        type="text"
                                        id="Tipo_Agrupacion"
                                        name="Tipo_Agrupacion"
                                        value={formData.Tipo_Agrupacion}
                                        onChange={handleInputChange}
                                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                            errors.Tipo_Agrupacion ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        placeholder="Ej: Obligatoria, Optativa, Electiva"
                                        required
                                    />
                                    {errors.Tipo_Agrupacion && (
                                        <p className="mt-1 text-sm text-red-600">{errors.Tipo_Agrupacion}</p>
                                    )}
                                </div>

                                {/* Créditos Requeridos */}
                                <div>
                                    <label htmlFor="Creditos_Requeridos" className="block text-sm font-medium text-gray-700 mb-2">
                                        Créditos Requeridos {formData.Es_Obligatoria && '*'}
                                    </label>
                                    <input
                                        type="number"
                                        id="Creditos_Requeridos"
                                        name="Creditos_Requeridos"
                                        value={formData.Creditos_Requeridos === null ? '' : formData.Creditos_Requeridos}
                                        onChange={handleInputChange}
                                        min="0"
                                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                            errors.Creditos_Requeridos ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        placeholder="0"
                                        required={formData.Es_Obligatoria}
                                    />
                                    {errors.Creditos_Requeridos && (
                                        <p className="mt-1 text-sm text-red-600">{errors.Creditos_Requeridos}</p>
                                    )}
                                </div>

                                {/* Créditos Máximos */}
                                <div>
                                    <label htmlFor="Creditos_Maximos" className="block text-sm font-medium text-gray-700 mb-2">
                                        Créditos Máximos
                                    </label>
                                    <input
                                        type="number"
                                        id="Creditos_Maximos"
                                        name="Creditos_Maximos"
                                        value={formData.Creditos_Maximos === null ? '' : formData.Creditos_Maximos}
                                        onChange={handleInputChange}
                                        min="0"
                                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                            errors.Creditos_Maximos ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        placeholder="Opcional"
                                    />
                                    {errors.Creditos_Maximos && (
                                        <p className="mt-1 text-sm text-red-600">{errors.Creditos_Maximos}</p>
                                    )}
                                </div>
                            </div>

                            {/* Es Obligatoria */}
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="Es_Obligatoria"
                                    name="Es_Obligatoria"
                                    checked={formData.Es_Obligatoria}
                                    onChange={handleInputChange}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="Es_Obligatoria" className="ml-2 block text-sm text-gray-700">
                                    Es obligatoria
                                </label>
                            </div>
                            {errors.Es_Obligatoria && (
                                <p className="mt-1 text-sm text-red-600">{errors.Es_Obligatoria}</p>
                            )}

                            {/* Botones */}
                            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </MainLayout>
        </>
    );
}
