# Sistema de Gestión de Mallas Académicas

Universidad Nacional de Colombia - Sede Manizales

## Descripción

Sistema web para la gestión centralizada de mallas curriculares de los programas académicos de la UNAL Sede Manizales. Permite cargar archivos Excel con la estructura de mallas, validar datos, comparar cambios contra versiones anteriores, sometarlas a un flujo de aprobación, y activar las versiones vigentes. Todo el historial de cambios queda registrado.

## Stack Técnico

| Capa | Tecnología | Versión |
|------|------------|---------|
| Base de datos | MySQL | 8.0+ |
| Backend | Laravel | 12.x |
| Autenticación | Laravel Sanctum | 4.x |
| Frontend | React | 19.x |
| Build tool | Vite | 6.x |
| Routing | React Router / Inertia | 7.x |
| HTTP Client | Axios | 1.x |

## Estado del Proyecto

### Fase 1: Configuración Base ✅
- [x] Migraciones de base de datos (16 tablas)
- [x] Modelos Eloquent con relaciones
- [x] Seeders iniciales (sede, facultades, admin)
- [x] Sistema de autenticación OTP
- [x] Rutas API REST
- [x] Frontend con Inertia + React
- [x] Página de login (2 pasos OTP)
- [x] Layout principal

### Fase 2: Catálogos CRUD ✅ COMPLETA
- [x] API Resources
- [x] Form Requests
- [x] Controllers de API
- [x] Componente DataTable
- [x] Página de Sedes
- [x] Formularios de creación/edición
- [x] Páginas de Facultades, Programas, Normativas, Componentes, Asignaturas, Usuarios
- [x] Rutas web con Inertia para todos los catálogos

### Fase 3: Carga de Excel y Aprobación 📋 (Pendiente)
- [ ] ExcelParserService
- [ ] ExcelUploadService
- [ ] Job de procesamiento
- [ ] DiffCalculatorService
- [ ] Flujo de aprobación
- [ ] Frontend de cargas

### Fase 4: Visualización y Auditoría 📊 (Pendiente)
- [ ] Vista de mallas por componente
- [ ] Historial de versiones
- [ ] Sistema de auditoría
- [ ] Logs de actividad

## Estructura del Proyecto

```
mallas/
├── app/
│   ├── Http/
│   │   ├── Controllers/Api/    # Controladores API
│   │   ├── Requests/           # Form Requests
│   │   ├── Resources/         # API Resources
│   │   └── Middleware/         # Middleware personalizado
│   ├── Models/                  # Modelos Eloquent
│   └── Services/               # Lógica de negocio
├── database/
│   ├── migrations/             # Migraciones de BD
│   └── seeders/                # Datos iniciales
├── resources/
│   ├── js/
│   │   ├── components/         # Componentes React
│   │   ├── pages/              # Páginas Inertia
│   │   │   ├── Auth/           # Autenticación
│   │   │   ├── Catalogos/      # CRUD Catálogos
│   │   │   └── Layout/         # Layouts
│   │   └── types/               # Tipos TypeScript
│   └── views/
├── routes/
│   ├── api.php                 # Rutas API REST
│   └── web.php                 # Rutas web Inertia
└── package.json                # Dependencias frontend
```

## Características

### Autenticación
- Autenticación de dos pasos con OTP de 6 dígitos
- Código válido por 10 minutos
- Tokens de sesión con Laravel Sanctum
- Rate limiting para seguridad

### Catálogos
- CRUD completo de: Sedes, Facultades, Programas, Normativas, Componentes, Asignaturas, Usuarios
- Búsqueda y paginación
- Activación/desactivación lógica
- Validaciones de servidor

### Carga de Mallas (Fase 3)
- Subida de archivos Excel (.xlsx)
- Validación de estructura
- Detección de duplicados por SHA-256
- Procesamiento asincrónico con Jobs
- Generación automática de diffs

### Flujo de Aprobación (Fase 3)
- Estados: iniciado → validando → borrador → pendiente_aprobacion → aprobado|rechazado
- Revisión por usuario diferente al creador
- Activación automática de malla vigente
- Archivo de versión anterior

## Requisitos del Sistema

- PHP 8.3.8+
- MySQL 8.0+
- Node.js 18+ (desarrollo)
- Composer 2.x
- Apache 2.4+ (producción)

## Instalación

```bash
# Clonar repositorio
cd mallas

# Instalar dependencias PHP
composer install

# Instalar dependencias Node
npm install

# Configurar entorno
cp .env.example .env
# Editar .env con credenciales de BD

# Generar clave de aplicación
php artisan key:generate

# Ejecutar migraciones
php artisan migrate

# Ejecutar seeders (opcional)
php artisan db:seed

# Iniciar servidor de desarrollo
npm run dev
php artisan serve
```

## Configuración

### Variables de Entorno (.env)

```env
APP_NAME="Mallas UNAL"
APP_ENV=local
APP_KEY=base64:...
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=mallas_unal
DB_USERNAME=root
DB_PASSWORD=

SANCTUM_STATEFUL_DOMAINS=localhost:5173
SESSION_DOMAIN=localhost
MAIL_MAILER=log
```

### Endpoints de API

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/auth/request-otp | Solicitar código OTP |
| POST | /api/auth/verify-otp | Verificar OTP y obtener token |
| POST | /api/auth/logout | Cerrar sesión |
| GET | /api/me | Datos del usuario |
| GET/POST/PUT/PATCH | /api/v1/sedes | CRUD Sedes |
| GET/POST/PUT/PATCH | /api/v1/facultades | CRUD Facultades |
| GET/POST/PUT/PATCH | /api/v1/programas | CRUD Programas |
| GET/POST/PUT/PATCH | /api/v1/normativas | CRUD Normativas |
| GET/POST/PUT/PATCH | /api/v1/componentes | CRUD Componentes |
| GET/POST/PUT/PATCH | /api/v1/asignaturas | CRUD Asignaturas |
| GET/POST/PUT/PATCH | /api/v1/usuarios | CRUD Usuarios |

## Rutas Web

| Ruta | Página |
|------|--------|
| /login | Login con OTP |
| /dashboard | Panel principal |
| /sedes | Gestión de Sedes |
| /facultades | Gestión de Facultades |
| /programas | Gestión de Programas |
| /mallas | Listado de Mallas |
| /cargas | Gestión de Cargas |

## Tecnologías Utilizadas

- **Backend**: Laravel 12, PHP 8.3
- **Frontend**: React 19, TypeScript, Inertia.js
- **Estilos**: TailwindCSS 3
- **Build**: Vite 6
- **Base de datos**: MySQL 8, Eloquent ORM
- **Autenticación**: Laravel Sanctum

## Licencia

Este proyecto es propiedad de la Universidad Nacional de Colombia - Sede Manizales.

### Autenticación
- Login en dos pasos con OTP de 6 dígitos por correo electrónico
- Token de acceso via Laravel Sanctum
- Token almacenado en memoria (no localStorage)
- Vigencia del código OTP: 10 minutos

### Gestión de Catálogos (Fase 2)
- CRUD completo de: Sedes, Facultades, Programas, Normativas, Componentes, Asignaturas, Usuarios
- Búsqueda y paginación en listados
- Activación/desactivación de registros

### Carga de Mallas (Fase 3)
- Subida de archivos Excel (.xlsx)
- Validación automática de datos
- Generación de diffs contra versión anterior
- Procesamiento asincrónico con Jobs

### Flujo de Aprobación (Fase 4)
- Estados: borrador → en_revision → pendiente_aprobacion → aprobado/rechazado
- Diferentes usuarios para carga y revisión
- Registro completo de diffs

### Auditoría
- Log de todas las acciones de usuario
- Registro de IP de origen
- Trazabilidad completa de cambios

## Requisitos Funcionales Principales

- RF-AU-01: Autenticación OTP de dos pasos
- RF-CA-01 al RF-CA-07: CRUD de catálogos
- RF-CE-01 al RF-CE-12: Carga y procesamiento Excel
- RF-AP-01 al RF-AP-06: Flujo de aprobación
- RF-VI-01 al RF-VI-04: Visualización de mallas

## Instalación

### Requisitos Previos
- PHP 8.3+
- Node.js 18+
- MySQL 8.0+
- Composer

### Pasos de Instalación

1. **Clonar el proyecto**
2. **Instalar dependencias PHP**
   ```bash
   composer install
   ```
3. **Instalar dependencias frontend**
   ```bash
   npm install
   ```
4. **Configurar entorno**
   ```bash
   cp .env.example .env
   # Editar .env con credenciales de BD
   ```
5. **Generar clave de aplicación**
   ```bash
   php artisan key:generate
   ```
6. **Ejecutar migraciones**
   ```bash
   php artisan migrate
   ```
7. **Ejecutar seeders**
   ```bash
   php artisan db:seed
   ```
8. **Iniciar servidor de desarrollo**
   ```bash
   php artisan serve
   npm run dev
   ```

## Usuarios de Prueba

| Rol | Correo | Contraseña |
|-----|--------|------------|
| Administrador | admin@unal.edu.co | N/A (usa OTP) |
| Revisor | revisor@unal.edu.co | N/A (usa OTP) |

## API Endpoints

### Autenticación
- `POST /api/auth/request-otp` - Solicitar código OTP
- `POST /api/auth/verify-otp` - Verificar código y obtener token
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/me` - Datos del usuario actual

### Catálogos (Fase 2)
- `GET /api/sedes` - Listar sedes
- `POST /api/sedes` - Crear sede
- `GET /api/sedes/{id}` - Ver sede
- `PUT /api/sedes/{id}` - Actualizar sede
- `PATCH /api/sedes/{id}/toggle` - Activar/desactivar

*(Patrón similar para facultades, programas, normativas, componentes, asignaturas, usuarios)*

### Mallas y Cargas (Fase 3+)
- `GET /api/programas/{id}/malla-vigente` - Ver malla actual
- `GET /api/programas/{id}/mallas` - Historial de versiones
- `POST /api/cargas` - Subir archivo Excel
- `GET /api/cargas/{id}` - Detalle de carga
- `PATCH /api/cargas/{id}/enviar-revision` - Enviar a revisión
- `PATCH /api/cargas/{id}/revisar` - Aprobar/rechazar

## Reglas de Negocio

- RN-01: Solo una malla vigente por programa
- RN-02: Asignatura sin código = error bloqueante
- RN-03: Al aprobar, la malla anterior se archiva automáticamente
- RN-04: El mismo usuario no puede cargar y revisar
- RN-05: Cambios directos se registran en diff y log
- RN-06: Mallas activas no se pueden editar directamente

## Desarrollo por Fases

### Fase 1: Fundación y Autenticación ✅
- Proyecto configurado
- Base de datos creada
- Login OTP funcionando

### Fase 2: Catálogos (EN PROGRESO)
- CRUD completo de entidades
- API REST + Frontend

### Fase 3: Carga Excel
- Parsing de archivos Excel
- Validaciones
- Jobs asincrónicos

### Fase 4: Flujo de Aprobación
- Diffs visuales
- Aprobación con transacción atómica

### Fase 5: Visualización
- Árbol de componentes
- Comparación de versiones

## Contribución

Para contribuir al proyecto:
1. Crear un branch para la feature
2. Desarrollar siguiendo las convenciones del código
3. Crear tests para nuevas funcionalidades
4. Enviar pull request para revisión

## Licencia

Este proyecto es propiedad de la Universidad Nacional de Colombia - Sede Manizales.

---

*Para más información, consulta el documento de requerimientos en `requerimientos_mallas_unal_v3.md`*
