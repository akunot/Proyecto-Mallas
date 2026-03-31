import { useState } from 'react';
import { Head } from '@inertiajs/react';
import MainLayout from '@/Layout/MainLayout';

interface Usuario {
  ID_Usuario: number;
  Nombre_Usuario: string;
  Email_Usuario: string;
  Activo_Usuario: number;
}

interface Props {
  usuario?: Usuario;
  errors?: Record<string, string>;
}

export default function UsuariosForm({ usuario, errors: initialErrors }: Props) {
  const isEditing = !!usuario;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>(initialErrors || {});
  
  const [formData, setFormData] = useState({
    Nombre_Usuario: usuario?.Nombre_Usuario || '',
    Email_Usuario: usuario?.Email_Usuario || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        ? `/api/v1/usuarios/${usuario.ID_Usuario}` 
        : '/api/v1/usuarios';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'same-origin', // Incluir cookies de sesión
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.errors) setErrors(result.errors);
        else if (result.message) setErrors({ general: result.message });
        setLoading(false);
        return;
      }

      window.location.href = '/usuarios';
    } catch (error) {
      setErrors({ general: 'Error de conexión.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <Head title={isEditing ? 'Editar Usuario' : 'Nuevo Usuario'} />
      
      <div className="page-header">
        <div className="page-title">
          <h1>{isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}</h1>
          <p className="page-subtitle">{isEditing ? 'Modifica el usuario' : 'Registra un nuevo usuario'}</p>
        </div>
      </div>

      {errors.general && <div className="alert alert-error">{errors.general}</div>}

      <div className="form-container">
        <form onSubmit={handleSubmit} className="form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="Nombre_Usuario">Nombre Completo *</label>
              <input
                type="text"
                id="Nombre_Usuario"
                name="Nombre_Usuario"
                value={formData.Nombre_Usuario}
                onChange={handleChange}
                className={errors.Nombre_Usuario ? 'input-error' : ''}
                required
              />
              {errors.Nombre_Usuario && <span className="error-message">{errors.Nombre_Usuario}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="Email_Usuario">Correo Electrónico *</label>
              <input
                type="email"
                id="Email_Usuario"
                name="Email_Usuario"
                value={formData.Email_Usuario}
                onChange={handleChange}
                className={errors.Email_Usuario ? 'input-error' : ''}
                required
              />
              {errors.Email_Usuario && <span className="error-message">{errors.Email_Usuario}</span>}
            </div>

            {!isEditing && (
              <div className="form-group full-width">
                <div className="alert alert-info">
                  <strong>Nota:</strong> El usuario recibirá un correo para establecer su contraseña inicial mediante OTP.
                </div>
              </div>
            )}
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
