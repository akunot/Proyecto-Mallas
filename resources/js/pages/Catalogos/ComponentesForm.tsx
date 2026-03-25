import { useState } from 'react';
import { Head } from '@inertiajs/react';
import MainLayout from '@/Layout/MainLayout';

interface Componente {
  ID_Componente: number;
  Nombre_Componente: string;
  Descripcion_Componente: string | null;
}

interface Props {
  componente?: Componente;
  errors?: Record<string, string>;
}

export default function ComponentesForm({ componente, errors: initialErrors }: Props) {
  const isEditing = !!componente;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>(initialErrors || {});
  
  const [formData, setFormData] = useState({
    Nombre_Componente: componente?.Nombre_Componente || '',
    Descripcion_Componente: componente?.Descripcion_Componente || '',
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
      const token = localStorage.getItem('token');
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing 
        ? `/api/v1/componentes/${componente.ID_Componente}` 
        : '/api/v1/componentes';

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
        if (result.errors) setErrors(result.errors);
        else if (result.message) setErrors({ general: result.message });
        setLoading(false);
        return;
      }

      window.location.href = '/componentes';
    } catch (error) {
      setErrors({ general: 'Error de conexión.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <Head title={isEditing ? 'Editar Componente' : 'Nuevo Componente'} />
      
      <div className="page-header">
        <div className="page-title">
          <h1>{isEditing ? 'Editar Componente' : 'Nuevo Componente'}</h1>
          <p className="page-subtitle">{isEditing ? 'Modifica el componente' : 'Registra un nuevo componente'}</p>
        </div>
      </div>

      {errors.general && <div className="alert alert-error">{errors.general}</div>}

      <div className="form-container">
        <form onSubmit={handleSubmit} className="form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="Nombre_Componente">Nombre del Componente *</label>
              <input
                type="text"
                id="Nombre_Componente"
                name="Nombre_Componente"
                value={formData.Nombre_Componente}
                onChange={handleChange}
                className={errors.Nombre_Componente ? 'input-error' : ''}
                required
              />
              {errors.Nombre_Componente && <span className="error-message">{errors.Nombre_Componente}</span>}
            </div>

            <div className="form-group full-width">
              <label htmlFor="Descripcion_Componente">Descripción</label>
              <textarea
                id="Descripcion_Componente"
                name="Descripcion_Componente"
                value={formData.Descripcion_Componente}
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
