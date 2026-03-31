import { useState } from 'react';
import { Head } from '@inertiajs/react';
import MainLayout from '@/Layout/MainLayout';

interface Normativa {
  ID_Normativa: number;
  ID_Programa: number;
  Tipo_Normativa: string;
  Numero_Normativa: string;
  Anio_Normativa: number;
  Instancia: string;
  Descripcion_Normativa: string | null;
  Url_Normativa: string | null;
  Esta_Activo: number;
}

interface Programa {
  ID_Programa: number;
  Nombre_Programa: string;
}

interface Props {
  normativa?: Normativa;
  programas: Programa[];
  errors?: Record<string, string>;
}

export default function NormativasForm({ normativa, programas, errors: initialErrors }: Props) {
  const isEditing = !!normativa;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>(initialErrors || {});
  
  const [formData, setFormData] = useState({
    ID_Programa: normativa?.ID_Programa?.toString() || (programas[0]?.ID_Programa?.toString() || ''),
    Tipo_Normativa: normativa?.Tipo_Normativa || 'Acuerdo',
    Numero_Normativa: normativa?.Numero_Normativa || '',
    Anio_Normativa: normativa?.Anio_Normativa?.toString() || new Date().getFullYear().toString(),
    Instancia: normativa?.Instancia || '',
    Descripcion_Normativa: normativa?.Descripcion_Normativa || '',
    Url_Normativa: normativa?.Url_Normativa || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
        ? `/api/v1/normativas/${normativa.ID_Normativa}` 
        : '/api/v1/normativas';

      const payload = {
        ...formData,
        ID_Programa: parseInt(formData.ID_Programa),
        Anio_Normativa: parseInt(formData.Anio_Normativa),
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

      window.location.href = '/normativas';
    } catch (error) {
      setErrors({ general: 'Error de conexión.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <Head title={isEditing ? 'Editar Normativa' : 'Nueva Normativa'} />
      
      <div className="page-header">
        <div className="page-title">
          <h1>{isEditing ? 'Editar Normativa' : 'Nueva Normativa'}</h1>
          <p className="page-subtitle">{isEditing ? 'Modifica la normativa' : 'Registra una nueva normativa'}</p>
        </div>
      </div>

      {errors.general && <div className="alert alert-error">{errors.general}</div>}

      <div className="form-container">
        <form onSubmit={handleSubmit} className="form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="ID_Programa">Programa *</label>
              <select id="ID_Programa" name="ID_Programa" value={formData.ID_Programa} onChange={handleChange} required>
                <option value="">Seleccionar programa...</option>
                {programas.map(p => (
                  <option key={p.ID_Programa} value={p.ID_Programa}>{p.Nombre_Programa}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="Tipo_Normativa">Tipo *</label>
              <select id="Tipo_Normativa" name="Tipo_Normativa" value={formData.Tipo_Normativa} onChange={handleChange}>
                <option value="Acuerdo">Acuerdo</option>
                <option value="Resolución">Resolución</option>
                <option value="Decreto">Decreto</option>
                <option value="Circular">Circular</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="Numero_Normativa">Número *</label>
              <input type="text" id="Numero_Normativa" name="Numero_Normativa" value={formData.Numero_Normativa} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label htmlFor="Anio_Normativa">Año *</label>
              <input type="number" id="Anio_Normativa" name="Anio_Normativa" value={formData.Anio_Normativa} onChange={handleChange} min="1900" max="2100" required />
            </div>

            <div className="form-group">
              <label htmlFor="Instancia">Instancia *</label>
              <input type="text" id="Instancia" name="Instancia" value={formData.Instancia} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label htmlFor="Url_Normativa">URL</label>
              <input type="url" id="Url_Normativa" name="Url_Normativa" value={formData.Url_Normativa} onChange={handleChange} placeholder="https://..." />
            </div>

            <div className="form-group full-width">
              <label htmlFor="Descripcion_Normativa">Descripción</label>
              <textarea id="Descripcion_Normativa" name="Descripcion_Normativa" value={formData.Descripcion_Normativa} onChange={handleChange} rows={3} />
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
