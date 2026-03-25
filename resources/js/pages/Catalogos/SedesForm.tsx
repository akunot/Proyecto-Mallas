import { useState } from 'react';
import { Head } from '@inertiajs/react';
import MainLayout from '@/Layout/MainLayout';

interface Props {
  sede?: {
    ID_Sede: number;
    Nombre_Sede: string;
    Ciudad_Sede: string;
    Direccion_Sede: string | null;
    Conmutador_Sede: string | null;
    Campus_Sede: string | null;
    Url_Sede: string | null;
  };
  errors?: Record<string, string>;
}

export default function SedesForm({ sede, errors: initialErrors }: Props) {
  const isEditing = !!sede;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>(initialErrors || {});
  
  const [formData, setFormData] = useState({
    Nombre_Sede: sede?.Nombre_Sede || '',
    Ciudad_Sede: sede?.Ciudad_Sede || '',
    Direccion_Sede: sede?.Direccion_Sede || '',
    Conmutador_Sede: sede?.Conmutador_Sede || '',
    Campus_Sede: sede?.Campus_Sede || '',
    Url_Sede: sede?.Url_Sede || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when field is modified
    if (errors[name]) {
      setErrors(prev => {
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
      const token = localStorage.getItem('token');
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing 
        ? `/api/v1/sedes/${sede.ID_Sede}` 
        : '/api/v1/sedes';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(formData),
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

      // Success - redirect to list
      window.location.href = '/sedes';
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ general: 'Error de conexión. Intente nuevamente.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <Head title={isEditing ? 'Editar Sede' : 'Nueva Sede'} />
      
      <div className="page-header">
        <div className="page-title">
          <h1>{isEditing ? 'Editar Sede' : 'Nueva Sede'}</h1>
          <p className="page-subtitle">
            {isEditing ? 'Modifica los datos de la sede' : 'Registra una nueva sede'}
          </p>
        </div>
      </div>

      {errors.general && (
        <div className="alert alert-error">
          {errors.general}
        </div>
      )}

      <div className="form-container">
        <form onSubmit={handleSubmit} className="form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="Nombre_Sede">Nombre de la Sede *</label>
              <input
                type="text"
                id="Nombre_Sede"
                name="Nombre_Sede"
                value={formData.Nombre_Sede}
                onChange={handleChange}
                className={errors.Nombre_Sede ? 'input-error' : ''}
                required
              />
              {errors.Nombre_Sede && <span className="error-message">{errors.Nombre_Sede}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="Ciudad_Sede">Ciudad *</label>
              <input
                type="text"
                id="Ciudad_Sede"
                name="Ciudad_Sede"
                value={formData.Ciudad_Sede}
                onChange={handleChange}
                className={errors.Ciudad_Sede ? 'input-error' : ''}
                required
              />
              {errors.Ciudad_Sede && <span className="error-message">{errors.Ciudad_Sede}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="Direccion_Sede">Dirección</label>
              <input
                type="text"
                id="Direccion_Sede"
                name="Direccion_Sede"
                value={formData.Direccion_Sede}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="Conmutador_Sede">Conmutador</label>
              <input
                type="text"
                id="Conmutador_Sede"
                name="Conmutador_Sede"
                value={formData.Conmutador_Sede}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="Campus_Sede">Campus</label>
              <input
                type="text"
                id="Campus_Sede"
                name="Campus_Sede"
                value={formData.Campus_Sede}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="Url_Sede">URL</label>
              <input
                type="url"
                id="Url_Sede"
                name="Url_Sede"
                value={formData.Url_Sede}
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
              {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
