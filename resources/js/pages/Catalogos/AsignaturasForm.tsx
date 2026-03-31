import { useState } from 'react';
import { Head } from '@inertiajs/react';
import MainLayout from '@/Layout/MainLayout';

interface Asignatura {
  ID_Asignatura: number;
  Codigo_Asignatura: string;
  Nombre_Asignatura: string;
  Creditos_Asignatura: number;
  Horas_Presencial: number | null;
  Horas_Estudiante: number | null;
  Descripcion_Asignatura: string | null;
}

interface Props {
  asignatura?: Asignatura;
  errors?: Record<string, string>;
}

export default function AsignaturasForm({ asignatura, errors: initialErrors }: Props) {
  const isEditing = !!asignatura;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>(initialErrors || {});
  
  const [formData, setFormData] = useState({
    Codigo_Asignatura: asignatura?.Codigo_Asignatura || '',
    Nombre_Asignatura: asignatura?.Nombre_Asignatura || '',
    Creditos_Asignatura: asignatura?.Creditos_Asignatura?.toString() || '',
    Horas_Presencial: asignatura?.Horas_Presencial?.toString() || '',
    Horas_Estudiante: asignatura?.Horas_Estudiante?.toString() || '',
    Descripcion_Asignatura: asignatura?.Descripcion_Asignatura || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing 
        ? `/api/v1/asignaturas/${asignatura.ID_Asignatura}` 
        : '/api/v1/asignaturas';

      const payload = {
        ...formData,
        Creditos_Asignatura: parseInt(formData.Creditos_Asignatura),
        Horas_Presencial: formData.Horas_Presencial ? parseInt(formData.Horas_Presencial) : null,
        Horas_Estudiante: formData.Horas_Estudiante ? parseInt(formData.Horas_Estudiante) : null,
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'same-origin', // Incluir cookies de sesión
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.errors) setErrors(result.errors);
        else if (result.message) setErrors({ general: result.message });
        setLoading(false);
        return;
      }

      window.location.href = '/asignaturas';
    } catch (error) {
      setErrors({ general: 'Error de conexión.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <Head title={isEditing ? 'Editar Asignatura' : 'Nueva Asignatura'} />
      
      <div className="page-header">
        <div className="page-title">
          <h1>{isEditing ? 'Editar Asignatura' : 'Nueva Asignatura'}</h1>
          <p className="page-subtitle">{isEditing ? 'Modifica la asignatura' : 'Registra una nueva asignatura'}</p>
        </div>
      </div>

      {errors.general && <div className="alert alert-error">{errors.general}</div>}

      <div className="form-container">
        <form onSubmit={handleSubmit} className="form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="Codigo_Asignatura">Código *</label>
              <input
                type="text"
                id="Codigo_Asignatura"
                name="Codigo_Asignatura"
                value={formData.Codigo_Asignatura}
                onChange={handleChange}
                className={errors.Codigo_Asignatura ? 'input-error' : ''}
                required
              />
              {errors.Codigo_Asignatura && <span className="error-message">{errors.Codigo_Asignatura}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="Nombre_Asignatura">Nombre *</label>
              <input
                type="text"
                id="Nombre_Asignatura"
                name="Nombre_Asignatura"
                value={formData.Nombre_Asignatura}
                onChange={handleChange}
                className={errors.Nombre_Asignatura ? 'input-error' : ''}
                required
              />
              {errors.Nombre_Asignatura && <span className="error-message">{errors.Nombre_Asignatura}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="Creditos_Asignatura">Créditos *</label>
              <input
                type="number"
                id="Creditos_Asignatura"
                name="Creditos_Asignatura"
                value={formData.Creditos_Asignatura}
                onChange={handleChange}
                className={errors.Creditos_Asignatura ? 'input-error' : ''}
                min="1"
                required
              />
              {errors.Creditos_Asignatura && <span className="error-message">{errors.Creditos_Asignatura}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="Horas_Presencial">Horas Presenciales</label>
              <input
                type="number"
                id="Horas_Presencial"
                name="Horas_Presencial"
                value={formData.Horas_Presencial}
                onChange={handleChange}
                min="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="Horas_Estudiante">Horas de Estudio</label>
              <input
                type="number"
                id="Horas_Estudiante"
                name="Horas_Estudiante"
                value={formData.Horas_Estudiante}
                onChange={handleChange}
                min="0"
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="Descripcion_Asignatura">Descripción</label>
              <textarea
                id="Descripcion_Asignatura"
                name="Descripcion_Asignatura"
                value={formData.Descripcion_Asignatura}
                onChange={handleChange}
                rows={3}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => window.history.back()}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
