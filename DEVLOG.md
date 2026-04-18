# DEVLOG - Sistema de Gestión de Mallas Académicas UNAL Manizales

## Registro de Desarrollo

### Fase 1: Configuración Base del Proyecto ✅ COMPLETA

### Fase 2: Catálogos CRUD ✅ COMPLETA

### Fase 3: Carga de Excel y Flujo de Aprobación (Pendiente)

---

## Registro Detallado

### Fase 1: Configuración Base del Proyecto ✅ COMPLETA (Marzo 2026)

#### 1.1 Setup Inicial del Proyecto
- [x] Crear proyecto Laravel 12 con React 19
- [x] Configurar Inertia.js para integración React + Laravel
- [x] Configurar Vite para build del frontend

#### 1.2 Base de Datos - Migraciones
- [x] Crear las 16 tablas del sistema:
  - `sede` - Sedes de la UNAL
  - `facultad` - Facultades por sede
  - `programa` - Programas académicos
  - `normativa` - Normativas de cada programa
  - `componente` - Catálogo de componentes curriculares
  - `asignatura` - Catálogo de asignaturas
  - `malla_curricular` - Versiones de mallas
  - `agrupacion` - Agrupaciones dentro de una malla
  - `agrupacion_asignatura` - Relación asignación-agrupación
  - `requisito` - Prerrequisitos y correquisitos
  - `archivo_excel` - Archivos subidos (LONGBLOB)
  - `carga_malla` - Control de cargas
  - `error_carga` - Errores de procesamiento
  - `diff_malla` - Historial de cambios
  - `log_actividad` - Auditoría

#### 1.3 Modelos Eloquent
- [x] Crear modelos con relaciones:
  - `Sede` - belongsToMany → Facultad
  - `Facultad` - belongsTo → Sede, hasMany → Programa
  - `Programa` - belongsTo → Facultad, hasMany → Normativa
  - `Normativa` - belongsTo → Programa
  - `Componente` - hasMany → Agrupacion
  - `Asignatura` - hasMany → AgrupacionAsignatura
  - `MallaCurricular` - belongsTo → Programa, hasMany → Agrupacion
  - `Agrupacion` - belongsTo → MallaCurricular, Componente
  - `AgrupacionAsignatura` - belongsTo → Agrupacion, Asignatura
  - `Requisito` - belongsTo → AgrupacionAsignatura
  - `Usuario` - hasMany → CargaMalla
  - `ArchivoExcel` - belongsTo → Usuario
  - `CargaMalla` - belongsTo → Usuario, ArchivoExcel, MallaCurricular
  - `ErrorCarga` - belongsTo → CargaMalla
  - `DiffMalla` - belongsTo → CargaMalla
  - `LogActividad` - belongsTo → Usuario

#### 1.4 Seeders Iniciales
- [x] `DatabaseSeeder` - Ejecuta todos los seeders
- [x] `SedeSeeder` - Crea la Sede UNAL Manizales
- [x] `FacultadSeeder` - Crea las 4 facultades principales
- [x] `UsuarioSeeder` - Crea usuario administrador inicial

#### 1.5 Autenticación OTP con Laravel Sanctum
- [x] Crear tabla `users` con campos OTP (Otp_Code, Otp_Expires_At)
- [x] Implementar sistema de autenticación de dos pasos:
  - Paso 1: Solicitar OTP por correo electrónico
  - Paso 2: Verificar código OTP y generar token Sanctum
- [x] Middleware de autenticación `auth:sanctum`
- [x] Rutas de autenticación:
  - `POST /api/auth/request-otp`
  - `POST /api/auth/verify-otp`
  - `POST /api/auth/logout`
  - `GET /api/me`

#### 1.6 Frontend - Autenticación
- [x] Página de Login con Inertia
- [x] Formulario de dos pasos OTP
- [x] Almacenamiento de token en memoria (no localStorage)
- [x] Layout principal con navegación
- [x] Protección de rutas con middleware

#### 1.7 Rutas Web con Inertia
- [x] `routes/web.php` con rutas SPA:
  - `/login` - Página de login
  - `/dashboard` - Panel principal
  - `/sedes`, `/facultades`, `/programas` - Catálogos

---

### Fase 2: Catálogos CRUD ✅ COMPLETA

#### 2.1 API Resources (Transformadores JSON)
- [x] `SedeResource` - Transformador de sede
- [x] `FacultadResource` - Transformador de facultad
- [x] `ProgramaResource` - Transformador de programa
- [x] `NormativaResource` - Transformador de normativa
- [x] `ComponenteResource` - Transformador de componente
- [x] `AsignaturaResource` - Transformador de asignatura
- [x] `UsuarioResource` - Transformador de usuario

#### 2.2 Form Requests (Validaciones)
- [x] `StoreSedeRequest` - Validación para crear sede
- [x] `UpdateSedeRequest` - Validación para actualizar sede
- [x] `StoreFacultadRequest` - Validación para crear facultad
- [x] `UpdateFacultadRequest` - Validación para actualizar facultad
- [x] `StoreProgramaRequest` - Validación para crear programa
- [x] `UpdateProgramaRequest` - Validación para actualizar programa
- [x] `StoreNormativaRequest` - Validación para crear normativa
- [x] `UpdateNormativaRequest` - Validación para actualizar normativa
- [x] `StoreComponenteRequest` - Validación para crear componente
- [x] `UpdateComponenteRequest` - Validación para actualizar componente
- [x] `StoreAsignaturaRequest` - Validación para crear asignatura
- [x] `UpdateAsignaturaRequest` - Validación para actualizar asignatura
- [x] `StoreUsuarioRequest` - Validación para crear usuario
- [x] `UpdateUsuarioRequest` - Validación para actualizar usuario

#### 2.3 Controllers de API
- [x] `CatalogoController` - Controlador genérico base con:
  - `index()` - Lista paginada con búsqueda
  - `show()` - Ver registro específico
  - `store()` - Crear registro
  - `update()` - Actualizar registro
  - `toggle()` - Activar/desactivar registro
- [x] `SedeController` - Extiende CatalogoController
- [x] `FacultadController` - Extiende CatalogoController
- [x] `ProgramaController` - Extiende CatalogoController
- [x] `NormativaController` - Extiende CatalogoController
- [x] `ComponenteController` - Extiende CatalogoController
- [x] `AsignaturaController` - Extiende CatalogoController
- [x] `UsuarioController` - Extiende CatalogoController

#### 2.4 Rutas API
- [x] `routes/api.php` con rutas v1:
  - `/api/v1/sedes` - CRUD completo
  - `/api/v1/facultades` - CRUD completo
  - `/api/v1/programas` - CRUD completo
  - `/api/v1/normativas` - CRUD completo
  - `/api/v1/componentes` - CRUD completo
  - `/api/v1/asignaturas` - CRUD completo
  - `/api/v1/usuarios` - CRUD completo

#### 2.5 Frontend - Componentes CRUD
- [x] `DataTable.tsx` - Componente reutilizable de tabla con:
  - Paginación
  - Búsqueda con debounce
  - Columnas configurables
  - Renderizado personalizado
  - Acciones por fila
- [x] `Catalogos/Sedes.tsx` - Página de lista de sedes
- [x] `Catalogos/Facultades.tsx` - Página de lista de facultades
- [x] `Catalogos/Programas.tsx` - Página de lista de programas
- [x] `Catalogos/Normativas.tsx` - Página de lista de normativas
- [x] `Catalogos/Componentes.tsx` - Página de lista de componentes
- [x] `Catalogos/Asignaturas.tsx` - Página de lista de asignaturas
- [x] `Catalogos/Usuarios.tsx` - Página de lista de usuarios
- [x] Rutas web actualizadas para todos los catálogos

#### 2.6 Frontend - Formularios CRUD
- [x] `Catalogos/SedesForm.tsx` - Formulario de creación/edición de sedes
- [x] `Catalogos/FacultadesForm.tsx` - Formulario de creación/edición de facultades
- [x] `Catalogos/ProgramasForm.tsx` - Formulario de creación/edición de programas
- [x] `Catalogos/NormativasForm.tsx` - Formulario de creación/edición de normativas
- [x] `Catalogos/ComponentesForm.tsx` - Formulario de creación/edición de componentes
- [x] `Catalogos/AsignaturasForm.tsx` - Formulario de creación/edición de asignaturas
- [x] `Catalogos/UsuariosForm.tsx` - Formulario de creación/edición de usuarios
- [x] Controladores actualizados con método edit() para cargar datos relacionados

#### 2.6 Estilos CSS
- [x] `resources/css/app.css` con estilos completos:
  - Estilos generales
  - Componente DataTable
  - Paginación
  - Formularios
  - Badges y estados
  - Responsive design

---

### Fase 3: Carga de Excel y Flujo de Aprobación (Pendiente)

#### 3.1 Carga de Excel
- [x] Implementar creación de carga sin archivo en estado `esperando_archivos`
- [x] Añadir endpoint `POST /api/cargas/{id}/archivo` para subir archivos tipados
- [x] Añadir endpoint `POST /api/cargas/{id}/procesar` para lanzar el job
- [ ] Servicio de parseo de Excel (Laravel Excel)
- [ ] Validación de estructura del archivo
- [ ] Detección de duplicados por hash SHA-256
- [ ] Procesamiento en Jobs asincrónicos
- [ ] Manejo de errores por fila
- [ ] Generación automática de diffs

#### 3.2 Flujo de Aprobación
- [ ] Estados de carga: iniciado → validando → borrador → pendiente_aprobacion → aprobado|rechazado
- [ ] Envío a revisión por creador
- [ ] Revisión por usuario diferente
- [ ] Aprobación: activa malla, archiva anterior
- [ ] Rechazo: registra comentarios
- [ ] Visualización de diff completo

#### 3.3 Frontend - Carga
- [ ] Página de cargas con listado
- [ ] Formulario de subida de Excel
- [ ] Visualización de errores
- [ ] Polling de estado de procesamiento
- [ ] Comparación visual de diffs

---

### Fase 4: Visualización de Mallas (Pendiente)
### Fase 3: Carga de Excel y Flujo de Aprobación (Pendiente)

#### 3.1 Procesamiento de Excel
- [ ] `ExcelParserService` - Parser de archivos .xlsx
- [ ] `ExcelUploadService` - Servicio de carga
- [ ] Job `ProcesarExcelJob` - Procesamiento asincrónico
- [ ] Validación de estructura Excel
- [ ] Detección de duplicados por SHA-256

#### 3.2 Diff de Mallas
- [ ] `DiffCalculatorService` - Calculador de diferencias
- [ ] Generación automática de diffs
- [ ] Historial de versiones

#### 3.3 Flujo de Aprobación
- [ ] Estados: iniciado → validando → borrador → pendiente_aprobacion → aprobado|rechazado
- [ ] Envío a revisión
- [ ] Aprobación/rechazo con comentarios
- [ ] Activación de malla vigente
- [ ] Archivo automático de malla anterior

#### 3.4 Frontend - Carga de Mallas
- [ ] Página de carga de archivos
- [ ] Visor de estado de carga (polling)
- [ ] Visualización de errores
- [ ] Comparador de diffs

---

### Fase 4: Visualización de Mallas y Auditoría (Pendiente)

#### 4.1 Visualización de Mallas
- [ ] Vista de malla por componente/agrupación
- [ ] Ver prerrequisitos y correquisitos
- [ ] Historial de versiones
- [ ] Totales de créditos

#### 4.2 Auditoría
- [ ] Registro automático en `log_actividad`
- [ ] Consultas de logs por fecha, usuario, acción
- [ ] Solo lectura para usuarios

---

## Configuración del Entorno

### Requisitos
- PHP 8.3.8+
- MySQL 8.0+
- Node.js 18+ (desarrollo)
- Composer 2.x

### Variables de Entorno (.env)
```
APP_NAME="Mallas UNAL"
APP_ENV=local
APP_KEY=base64:...
APP_DEBUG=true
APP_URL=http://localhost

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=mallas_unal
DB_USERNAME=root
DB_PASSWORD=

SANCTUM_STATEFUL_DOMAINS=localhost:5173
SESSION_DOMAIN=localhost
```

### Comandos de Desarrollo
```bash
# Instalar dependencias
composer install
npm install

# Migraciones
php artisan migrate

# Seeders
php artisan db:seed

# Desarrollo
npm run dev
php artisan serve
```

---

## Notas Técnicas

### Arquitectura
- API REST con Laravel 12
- Frontend SPA con React 19 + Inertia
- Autenticación con Laravel Sanctum + OTP

### Patrones Implementados
- Controller genérico para catálogos
- API Resources para transformación JSON
- Form Requests para validación
- Servicios para lógica de negocio

### Consideraciones de Seguridad
- Tokens almacenados en memoria (no localStorage)
- Rate limiting en rutas de autenticación
- Validación en backend con Form Requests
- Headers de seguridad configurados
