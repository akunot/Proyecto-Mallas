import { useState } from 'react';
import { Head } from '@inertiajs/react';
import MainLayout from '@/Layout/MainLayout';

interface Programa {
  ID_Programa: number;
  ID_Facultad: number;
  Codigo_Programa: string;
  Nombre_Programa: string;
  Titulo_Otorgado: string | null;
  Nivel_Formacion: string | null;
  Creditos_Totales: number | null;
  Duracion_Semestres: number | null;
  Codigo_SNIES: string | null;
  Url_Programa: string | null;
  Campus_Programa: string | null;
  Conmutador: string | null;
  Extension: string | null;
  Correo: string | null;
  Area_Curricular: string | null;
  Activo_Programa: number;
}

interface Facultad {
  ID_Facultad: number;
  Nombre_Facultad: string;
}

interface Props {
  programa?: Programa;
  facultades: Facultad[];
  errors?: Record<string, string>;
}

export default function ProgramasForm({ programa, facultades, errors: initialErrors }: Props) {
  const isEditing = !!programa;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>(initialErrors || {});
  
  const [formData, setFormData] = useState({
    ID_Facultad: programa?.ID_Facultad?.toString() || (facultades[0]?.ID_Facultad?.toString() || ''),
    Codigo_Programa: programa?.Codigo_Programa || '',
    Nombre_Programa: programa?.Nombre_Programa || '',
    Titulo_Otorgado: programa?.Titulo_Otorgado || '',
    Nivel_Formacion: programa?.Nivel_Formacion || '',
    Creditos_Totales: programa?.Creditos_Totales?.toString() || '',
    Duracion_Semestres: programa?.Duracion_Semestres?.toString() || '',
    Codigo_SNIES: programa?.Codigo_SNIES || '',
    Url_Programa: programa?.Url_Programa || '',
    Campus_Programa: programa?.Campus_Programa || '',
    Conmutador: programa?.Conmutador || '',
    Extension: programa?.Extension || '',
    Correo: programa?.Correo || '',
    Area_Curricular: programa?.Area_Curricular || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
        ? `/api/v1/programas/${programa.ID_Programa}` 
        : '/api/v1/programas';

      const payload = {
        ...formData,
        ID_Facultad: parseInt(formData.ID_Facultad),
        Creditos_Totales: formData.Creditos_Totales ? parseInt(formData.Creditos_Totales) : null,
        Duracion_Semestres: formData.Duracion_Semestres ? parseInt(formData.Duracion_Semestres) : null,
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
        if (result.errors) {
          setErrors(result.errors);
        } else if (result.message) {
          setErrors({ general: result.message });
        }
        setLoading(false);
        return;
      }

      window.location.href = '/programas';
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ general: 'Error de conexión. Intente nuevamente.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <Head title={isEditing ? 'Editar Programa' : 'Nuevo Programa'} />
      
      <div className="page-header">
        <div className="page-title">
          <h1>{isEditing ? 'Editar Programa' : 'Nuevo Programa'}</h1>
          <p className="page-subtitle">
            {isEditing ? 'Modifica los datos del programa' : 'Registra un nuevo programa'}
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
              <label htmlFor="ID_Facultad">Facultad *</label>
              <select
                id="ID_Facultad"
                name="ID_Facultad"
                value={formData.ID_Facultad}
                onChange={handleChange}
                className={errors.ID_Facultad ? 'input-error' : ''}
                required
              >
                <option value="">Seleccionar facultad...</option>
                {facultades.map(fac => (
                  <option key={fac.ID_Facultad} value={fac.ID_Facultad}>
                    {fac.Nombre_Facultad}
                  </option>
                ))}
              </select>
              {errors.ID_Facultad && <span className="error-message">{errors.ID_Facultad}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="Codigo_Programa">Código *</label>
              <input
                type="text"
                id="Codigo_Programa"
                name="Codigo_Programa"
                value={formData.Codigo_Programa}
                onChange={handleChange}
                className={errors.Codigo_Programa ? 'input-error' : ''}
                required
              />
              {errors.Codigo_Programa && <span className="error-message">{errors.Codigo_Programa}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="Nombre_Programa">Nombre del Programa *</label>
              <input
                type="text"
                id="Nombre_Programa"
                name="Nombre_Programa"
                value={formData.Nombre_Programa}
                onChange={handleChange}
                className={errors.Nombre_Programa ? 'input-error' : ''}
                required
              />
              {errors.Nombre_Programa && <span className="error-message">{errors.Nombre_Programa}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="Titulo_Otorgado">Título Otorgado</label>
              <input
                type="text"
                id="Titulo_Otorgado"
                name="Titulo_Otorgado"
                value={formData.Titulo_Otorgado}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="Nivel_Formacion">Nivel de Formación</label>
              <select
                id="Nivel_Formacion"
                name="Nivel_Formacion"
                value={formData.Nivel_Formacion}
                onChange={handleChange}
              >
                <option value="">Seleccionar...</option>
                <option value="pregrado">Pregrado</option>
                <option value="especializacion">Especialización</option>
                <option value="maestria">Maestría</option>
                <option value="doctorado">Doctorado</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="Creditos_Totales">Créditos Totales</label>
              <input
                type="number"
                id="Creditos_Totales"
                name="Creditos_Totales"
                value={formData.Creditos_Totales}
                onChange={handleChange}
                min="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="Duracion_Semestres">Duración (Semestres)</label>
              <input
                type="number"
                id="Duracion_Semestres"
                name="Duracion_Semestres"
                value={formData.Duracion_Semestres}
                onChange={handleChange}
                min="1"
                max="20"
              />
            </div>

            <div className="form-group">
              <label htmlFor="Codigo_SNIES">Código SNIES</label>
              <input
                type="text"
                id="Codigo_SNIES"
                name="Codigo_SNIES"
                value={formData.Codigo_SNIES}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="Campus_Programa">Campus</label>
              <input
                type="text"
                id="Campus_Programa"
                name="Campus_Programa"
                value={formData.Campus_Programa}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="Conmutador">Conmutador</label>
              <input
                type="text"
                id="Conmutador"
                name="Conmutador"
                value={formData.Conmutador}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="Extension">Extensión</label>
              <input
                type="text"
                id="Extension"
                name="Extension"
                value={formData.Extension}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="Correo">Correo</label>
              <input
                type="email"
                id="Correo"
                name="Correo"
                value={formData.Correo}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="Area_Curricular">Área Curricular</label>
              <input
                type="text"
                id="Area_Curricular"
                name="Area_Curricular"
                value={formData.Area_Curricular}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="Url_Programa">URL del Programa</label>
              <input
                type="url"
                id="Url_Programa"
                name="Url_Programa"
                value={formData.Url_Programa}
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
