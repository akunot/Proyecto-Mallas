# UNIVERSIDAD NACIONAL DE COLOMBIA

## Sede Manizales

**Documentación Técnica del Sistema**

Sistema de Gestión de Mallas Académicas — UNAL Manizales

_Documento técnico para desarrollo y mantenimiento_

Versión 5.4 | Julio 2026

---

| **Campo**         | **Valor**                                                           |
| ----------------- | ------------------------------------------------------------------- |
| Proyecto          | Sistema de Gestión de Mallas Académicas                             |
| Cliente           | Universidad Nacional de Colombia - Sede Manizales                   |
| Stack             | Laravel 12 + React 19 + MySQL 8 + Apache 2.4/nginx + Inertia.js 2.0 |
| Arquitectura      | Monolito modular (Laravel + Inertia + React) + MySQL 8              |
| Autenticación     | Laravel Sanctum con OTP de 6 dígitos por correo (sin contraseña)    |
| Tipo de sistema   | Panel administrativo cerrado, usuarios contados                     |
| Documento versión | 5.4 — Julio 2026                                                    |

### Historial de cambios

| Versión | Fecha      | Cambios                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | Marzo 2026 | Versión inicial                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 4.0     | Abril 2026 | Auditoría de BD: `agrupacion` pasa de `ID_Malla` a `ID_Programa`; `agrupacion_asignatura` recibe `ID_Malla`; se añade `Codigo_Facultad` a `facultad`; se añade `Tipo_Agrupacion` a `agrupacion`; nuevas restricciones UNIQUE; flujo de carga masiva documentado; RF-CA-08 para CRUD de Agrupaciones; RN-09, RN-10                                                                                                                                                                                                                                                                                           |
| 5.0     | Abril 2026 | Carga masiva dividida en tres archivos separados (asignaturas, electivas, malla); `carga_malla` reemplaza `ID_Archivo` único por tres FKs; `carga_malla` recibe `ID_Programa` e `ID_Normativa`; `archivo_excel` recibe `Tipo_Archivo`; flujo de subida en dos fases (subida progresiva + lanzamiento); nuevos estados `esperando_archivos` y `listo_para_procesar`; API de cargas dividida en tres endpoints; reemplazo automático si se sube el mismo tipo de archivo dos veces; módulo RF-CM; RN-11, RN-12, RN-13; sección 4 con flujo del modelo de datos                                                |
| 5.1     | Abril 2026 | Alineación del modelo de BD con la BD real implementada: FKs basadas en códigos institucionales (`Codigo_Sede`, `Codigo_Facultad`, `Codigo_Programa`) en lugar de IDs auto_increment; se agrega `Codigo_Sede` a tabla `sede`; se documenta mapeo de Excel de agrupaciones (columna COMPONENTE → `Tipo_Agrupacion`, columna TIPO AGRUPACIÓN → `Es_Obligatoria`); se actualiza estructura del Excel de malla (IDs numéricos como identificadores cruzados); se documenta archivo OPTATIVA; se corrige afirmación de asignaturas en múltiples agrupaciones; se agrega nota sobre limpieza de floats en códigos |
| 5.2     | Abril 2026 | Se integra el archivo OPTATIVA como cuarto paso opcional del Job de procesamiento. `carga_malla` recibe `ID_Archivo_Optativas` (nullable). Nuevo RF-CE-13 y RF-CM-07. El OPTATIVA se procesa después de la malla, extrayendo solo filas del programa en carga, creando `agrupacion_asignatura` adicionales y sus requisitos. Actualización del §8.4 con tipo `optativas`                                                                                                                                                                                                                                    |
| 5.3     | Junio 2026 | Migración a Inertia.js 2.0 para integración frontend-backend. Catálogos CRUD migrados a vistas Inertia. Endpoint público de visualización de mallas. Mejoras en validación y manejo de errores. Optimización del parser de Excel para optativas.                                                                                                                                                                                                                                                                                                                                                            |
| 5.4     | Julio 2026 | Refactor: `MallaVisualizerService` extraído de `MallaController` con cache de 24h y métodos `forPrograma()`/`byVersion()`/`forgetAll()`. Nuevo `MallaPublicaController` extraído de closure de ruta. Cache invalidado automáticamente en mutaciones (reordenar, asignar/remover optativas). Tests E2E: `CargaE2ETest`, `CargaErroresHumanosE2ETest`, `MallaLifecycleE2ETest`, `OptativasE2ETest`. 145 tests totales (285 assertions). Contenedor Docker con nginx + php-fpm + supervisor + queue worker.                                                                                                    |

---

## 1. Contexto del Proyecto

El sistema de Mallas Académicas de la UNAL Sede Manizales gestiona los planes de estudio de todos los programas académicos de la universidad. Actualmente no existe un sistema centralizado para actualizar, versionar y aprobar cambios en las mallas curriculares. Las actualizaciones se hacen manualmente y no hay trazabilidad de los cambios históricos.

El nuevo sistema permite a los administradores cargar archivos Excel con la estructura de una malla, validar los datos, comparar los cambios contra la versión anterior, someter la nueva malla a un flujo de aprobación, y activarla como vigente una vez aprobada. Todo el historial queda registrado.

### 1.1. Actores del sistema

| **Actor**            | **Descripción**                                                                | **Nivel de acceso** |
| -------------------- | ------------------------------------------------------------------------------ | ------------------- |
| Administrador        | Carga archivos Excel, gestiona CRUD de catálogos, inicia proceso de aprobación | Total               |
| Sistema (automático) | Ejecuta validaciones, genera diffs, actualiza estados de carga                 | Interno             |

### 1.2. Entidades del dominio

Las entidades principales del dominio, de mayor a menor jerarquía, son:

- `Sede` → `Facultad` → `Programa` → `Normativa` → `MallaCurricular`
- `Programa` → `Agrupacion` (las agrupaciones son estructuras estables del programa, no de una versión de malla)
- `Agrupacion` + `MallaCurricular` → `AgrupacionAsignatura` → `Requisito`
- `Componente` (catálogo transversal usado por Agrupacion)
- `Asignatura` (catálogo global compartido entre todos los programas)
- `Usuario`, `ArchivoExcel`, `CargaMalla`, `ErrorCarga`, `DiffMalla`, `LogActividad` (gestión y auditoría)

> **CAMBIO v4:** Las agrupaciones pertenecen al **Programa** (`ID_Programa`), no a la versión de malla. Lo que cambia entre versiones es qué asignaturas están en cada agrupación (`AgrupacionAsignatura`), registrado mediante `ID_Malla`. Ver sección 3.8 para detalle completo.

> **CAMBIO v5:** La carga masiva se divide en tres archivos independientes: `asignaturas`, `electivas` y `malla`. La subida es progresiva (se pueden subir en cualquier orden) y el procesamiento se lanza manualmente cuando los tres están listos. Ver sección 4.3 para el flujo completo.

---

## 2. Stack Técnico Definitivo

| **Capa**         | **Tecnología**              | **Versión** | **Rol**                                                     |
| ---------------- | --------------------------- | ----------- | ----------------------------------------------------------- |
| Base de datos    | MySQL                       | 8.0+        | Almacenamiento principal                                    |
| Backend          | Laravel                     | 12.x        | API REST, lógica de negocio, ORM                            |
| Autenticación    | Laravel Sanctum             | 4.x         | Tokens de sesión para SPA. Autenticación OTP sin contraseña |
| Lectura Excel    | Laravel Excel (Maatwebsite) | 3.x         | Parseo de archivos .xlsx                                    |
| Frontend         | React                       | 19.2        | Inertiajs — interfaz de usuario                             |
| Build tool       | Vite                        | 6.x         | Bundler y servidor de desarrollo                            |
| Routing frontend | React Router                | 7.x         | Navegación entre vistas                                     |
| HTTP client      | Axios                       | 1.x         | Llamadas a la API REST                                      |
| Servidor web     | nginx (contenedor)          | Alpine      | Contenedor Docker con supervisor                            |
| PHP              | PHP-FPM                     | 8.3         | Contenedor Docker                                           |
| OS               | Alpine Linux                | -           | contenedor base                                             |
| Orquestación     | Docker Compose              | 3.8         | mysql + app                                                 |
| Queue worker     | Supervisor                  | -           | Ejecuta `php artisan queue:work` automáticamente            |

> El frontend React se compila dentro del Dockerfile multi-etapa con Vite y se sirve como archivos estáticos desde nginx. En desarrollo local se usa `npm run dev` con Vite.

### 2.1. Estructura de directorios del proyecto

```
mallas/
  app/                          # Backend Laravel
    Http/
      Controllers/              # Api/* (API REST), MallaPublicaController (Inertia)
      Resources/                # API Resources (transformadores JSON)
      Requests/                 # Form Requests (validación)
    Models/                     # Modelos Eloquent
    Services/                   # Lógica de negocio (ExcelUpload, ExcelParser, MallaVisualizer, etc.)
    Jobs/                       # Procesamiento asincrónico (ProcesarExcelJob)
  database/
    migrations/                 # Migraciones de todas las tablas
    seeders/                    # Datos iniciales
  routes/
    api.php                     # Todas las rutas de la API
    web.php                     # Rutas web (Inertia)
  resources/                    # Frontend React + Inertia + vistas Blade
    js/
      components/               # Componentes reutilizables
      pages/                    # Vistas por ruta
      api/                      # Funciones de llamada a la API
      hooks/                    # Custom hooks
      store/                    # Estado global (Context API)
  tests/                        # Tests Pest/PHPUnit
    Feature/Api/                # Tests E2E de API
    Unit/                       # Tests unitarios
  docker/                       # Configuración Docker (nginx, php-fpm, supervisor)
    nginx.conf
    php-fpm.conf
    supervisord.conf
  docker-compose.yml            # Orquestación Docker (mysql + app)
  Dockerfile                    # Imagen Docker multi-etapa
  docker-entrypoint.sh          # Script de entrada con migraciones y cache
```

---

## 3. Modelo de Base de Datos (MySQL 8)

Motor: InnoDB. Charset: utf8mb4. Collation: utf8mb4_unicode_ci. Todas las PKs son `INT UNSIGNED AUTO_INCREMENT`. Todas las FKs tienen `ON DELETE RESTRICT ON UPDATE CASCADE` salvo indicación contraria.

> **Nota de diseño v5.1 (FKs basadas en códigos):** Las relaciones entre las tablas `sede`, `facultad`, `programa` y `normativa` utilizan **códigos institucionales** (`Codigo_Sede`, `Codigo_Facultad`, `Codigo_Programa`) como claves foráneas, en lugar de los IDs auto*increment. Esto se debe a que los datos fuente (archivos Excel institucionales) identifican las entidades por sus códigos institucionales, no por IDs internos del sistema. Los IDs auto_increment se mantienen como PK para uso interno del ORM, pero las FKs entre estas tablas apuntan a los campos `Codigo*\*`.

### Diagrama de relaciones clave (v5.1)

```
sede (Codigo_Sede UNIQUE)
 └── facultad (Codigo_Sede FK -> sede.Codigo_Sede)
      └── programa (Codigo_Facultad FK -> facultades.Codigo_Facultad)
           ├── normativa (Codigo_Programa FK -> programas.Codigo_Programa)
           │    └── malla_curricular (ID_Normativa FK, ID_Programa FK)
           │         └── agrupacion_asignatura (ID_Malla FK)
           │              ├── asignatura (ID_Asignatura FK)
           │              └── requisito (ID_Agrup_Asig FK)
           └── agrupacion (ID_Programa FK)
                └── agrupacion_asignatura (ID_Agrupacion FK)

carga_malla
 ├── ID_Archivo_Asignaturas FK -> archivo_excel
 ├── ID_Archivo_Electivas    FK -> archivo_excel
 └── ID_Archivo_Malla        FK -> archivo_excel

archivo_excel
 └── Tipo_Archivo VARCHAR(20): asignaturas|electivas|malla
```

> **Principio clave (v4):** Las agrupaciones son estructuras estables del **programa**. Lo que varía entre versiones de malla es qué asignaturas se asignan a cada agrupación, registrado en `agrupacion_asignatura` con su `ID_Malla`.

> **Principio clave (v5):** La carga de una malla requiere exactamente tres archivos. `carga_malla` los referencia con tres FKs independientes (nullable hasta que se suban). El procesamiento solo se puede lanzar cuando los tres están presentes.

---

### 3.1. Tabla: `sede`

| **Columna**     | **Tipo MySQL**              | **NN** | **Default** | **Notas**                                                                                      |
| --------------- | --------------------------- | ------ | ----------- | ---------------------------------------------------------------------------------------------- |
| ID_Sede         | INT UNSIGNED AUTO_INCREMENT | Sí     | -           | PK                                                                                             |
| Codigo_Sede     | BIGINT UNSIGNED             | Sí     | -           | UNIQUE. Código institucional de la sede (ej: 1103 para Manizales). Usado como FK en `facultad` |
| Nombre_Sede     | VARCHAR(100)                | Sí     | -           |                                                                                                |
| Ciudad_Sede     | VARCHAR(100)                | Sí     | -           |                                                                                                |
| Direccion_Sede  | VARCHAR(200)                | No     | NULL        |                                                                                                |
| Conmutador_Sede | VARCHAR(30)                 | No     | NULL        |                                                                                                |
| Campus_Sede     | VARCHAR(100)                | No     | NULL        |                                                                                                |
| Url_Sede        | VARCHAR(300)                | No     | NULL        |                                                                                                |

---

### 3.2. Tabla: `facultad`

> **Nota:** La FK hacia `sede` utiliza `Codigo_Sede` (no `ID_Sede`), alineado con los datos de los archivos Excel institucionales.

| **Columna**         | **Tipo MySQL**              | **NN** | **Default** | **Notas**                                                                                     |
| ------------------- | --------------------------- | ------ | ----------- | --------------------------------------------------------------------------------------------- |
| ID_Facultad         | INT UNSIGNED AUTO_INCREMENT | Sí     | -           | PK                                                                                            |
| Codigo_Facultad     | BIGINT UNSIGNED             | Sí     | -           | UNIQUE. Código institucional (ej: 4036 para Ing. y Arquitectura). Usado como FK en `programa` |
| Codigo_Sede         | BIGINT UNSIGNED             | Sí     | -           | FK → sede.Codigo_Sede                                                                         |
| Nombre_Facultad     | VARCHAR(150)                | Sí     | -           |                                                                                               |
| Conmutador_Facultad | VARCHAR(30)                 | No     | NULL        |                                                                                               |
| Extension_Facultad  | VARCHAR(80)                 | No     | NULL        |                                                                                               |
| Campus_Facultad     | VARCHAR(100)                | No     | NULL        |                                                                                               |
| Url_Facultad        | VARCHAR(300)                | No     | NULL        |                                                                                               |
| Esta_Activo         | TINYINT(1)                  | Sí     | 1           |                                                                                               |

---

### 3.3. Tabla: `programa`

> **Nota:** La FK hacia `facultad` utiliza `Codigo_Facultad` (no `ID_Facultad`). El campo de activación se llama `Esta_Activo` (consistente con otras tablas).

| **Columna**        | **Tipo MySQL**              | **NN** | **Default** | **Notas**                                                            |
| ------------------ | --------------------------- | ------ | ----------- | -------------------------------------------------------------------- |
| ID_Programa        | INT UNSIGNED AUTO_INCREMENT | Sí     | -           | PK                                                                   |
| Codigo_Facultad    | BIGINT UNSIGNED             | Sí     | -           | FK → facultades.Codigo_Facultad                                      |
| Codigo_Programa    | BIGINT UNSIGNED             | Sí     | -           | UNIQUE. Código institucional del programa (ej: 4021 para Ing. Civil) |
| Nombre_Programa    | VARCHAR(200)                | Sí     | -           |                                                                      |
| Titulo_Otorgado    | VARCHAR(200)                | No     | NULL        | Extensión del modelo original                                        |
| Nivel_Formacion    | VARCHAR(50)                 | No     | NULL        | Extensión del modelo original                                        |
| Creditos_Totales   | INT UNSIGNED                | No     | NULL        | Puede ser NULL si no se conoce                                       |
| Duracion_Semestres | INT UNSIGNED                | No     | NULL        | Valor fijo del programa                                              |
| Codigo_SNIES       | VARCHAR(20)                 | No     | NULL        |                                                                      |
| Url_Programa       | VARCHAR(300)                | No     | NULL        |                                                                      |
| Campus_Programa    | VARCHAR(100)                | No     | NULL        |                                                                      |
| Conmutador         | VARCHAR(30)                 | No     | NULL        |                                                                      |
| Extension          | VARCHAR(80)                 | No     | NULL        |                                                                      |
| Correo             | VARCHAR(200)                | No     | NULL        |                                                                      |
| Area_Curricular    | VARCHAR(100)                | No     | NULL        | Extensión del modelo original                                        |
| Esta_Activo        | TINYINT(1)                  | Sí     | 1           |                                                                      |

---

### 3.4. Tabla: `normativa`

> **Nota:** La FK hacia `programa` utiliza `Codigo_Programa` (no `ID_Programa`).

| **Columna**           | **Tipo MySQL**              | **NN** | **Default** | **Notas**                              |
| --------------------- | --------------------------- | ------ | ----------- | -------------------------------------- |
| ID_Normativa          | INT UNSIGNED AUTO_INCREMENT | Sí     | -           | PK                                     |
| Codigo_Programa       | BIGINT UNSIGNED             | Sí     | -           | FK → programas.Codigo_Programa         |
| Tipo_Normativa        | VARCHAR(50)                 | Sí     | -           | Acuerdo\|Resolución\|Decreto\|Circular |
| Numero_Normativa      | VARCHAR(50)                 | Sí     | -           |                                        |
| Anio_Normativa        | INT                         | Sí     | -           |                                        |
| Instancia             | VARCHAR(150)                | Sí     | -           | Entidad que expide el acto             |
| Descripcion_Normativa | TEXT                        | No     | NULL        |                                        |
| Url_Normativa         | VARCHAR(500)                | No     | NULL        |                                        |
| Esta_Activo           | TINYINT(1)                  | Sí     | 1           |                                        |

---

### 3.5. Tabla: `componente`

Catálogo transversal. Los componentes son categorías institucionales de la UNAL (ej: Fundamentación, Disciplinar).

| **Columna**            | **Tipo MySQL**              | **NN** | **Default** | **Notas** |
| ---------------------- | --------------------------- | ------ | ----------- | --------- |
| ID_Componente          | INT UNSIGNED AUTO_INCREMENT | Sí     | -           | PK        |
| Nombre_Componente      | VARCHAR(150)                | Sí     | -           | UNIQUE    |
| Descripcion_Componente | TEXT                        | No     | NULL        |           |

---

### 3.6. Tabla: `asignatura`

Catálogo global compartido entre todos los programas. Una asignatura puede pertenecer a múltiples agrupaciones de múltiples programas.

| **Columna**            | **Tipo MySQL**              | **NN** | **Default** | **Notas**                                                                                         |
| ---------------------- | --------------------------- | ------ | ----------- | ------------------------------------------------------------------------------------------------- |
| ID_Asignatura          | INT UNSIGNED AUTO_INCREMENT | Sí     | -           | PK                                                                                                |
| Codigo_Asignatura      | VARCHAR(20)                 | Sí     | -           | UNIQUE. NULL es bloqueante en carga Excel                                                         |
| Codigo_Base            | VARCHAR(20)                 | No     | NULL        | UNIQUE. Código normalizado (solo dígitos). Generado automáticamente a partir de Codigo_Asignatura |
| Nombre_Asignatura      | VARCHAR(200)                | Sí     | -           |                                                                                                   |
| Creditos_Asignatura    | INT UNSIGNED                | Sí     | -           |                                                                                                   |
| Horas_Presencial       | INT UNSIGNED                | No     | NULL        |                                                                                                   |
| Horas_Estudiante       | INT UNSIGNED                | No     | NULL        |                                                                                                   |
| Descripcion_Asignatura | TEXT                        | No     | NULL        |                                                                                                   |

---

### 3.7. Tabla: `malla_curricular`

Representa una versión específica del plan de estudios de un programa.

> **Restricción especial:** Solo UNA malla por programa puede tener `Es_Vigente = 1` simultáneamente. Se implementa con columna generada virtual + UNIQUE INDEX (workaround MySQL por ausencia de partial indexes nativos).

| **Columna**        | **Tipo MySQL**                 | **NN** | **Default**       | **Notas**                                           |
| ------------------ | ------------------------------ | ------ | ----------------- | --------------------------------------------------- |
| ID_Malla           | INT UNSIGNED AUTO_INCREMENT    | Sí     | -                 | PK                                                  |
| ID_Normativa       | INT UNSIGNED                   | Sí     | -                 | FK → normativa                                      |
| ID_Programa        | INT UNSIGNED                   | Sí     | -                 | FK → programa                                       |
| Version_Numero     | INT UNSIGNED                   | Sí     | -                 | Incremental por programa                            |
| Version_Etiqueta   | VARCHAR(50)                    | No     | NULL              | Ej: Plan 2025                                       |
| Fecha_Vigencia     | DATE                           | Sí     | -                 |                                                     |
| Fecha_Fin_Vigencia | DATE                           | No     | NULL              | NULL si aún vigente                                 |
| Estado             | VARCHAR(20)                    | Sí     | -                 | borrador\|en_revision\|activa\|archivada\|rechazada |
| Es_Vigente         | TINYINT(1)                     | Sí     | 0                 |                                                     |
| Created_at         | TIMESTAMP                      | Sí     | CURRENT_TIMESTAMP |                                                     |
| Vigente_Prog_ID    | INT UNSIGNED GENERATED VIRTUAL | No     | -                 | UNIQUE. `IF(Es_Vigente=1, ID_Programa, NULL)`       |

**Migración de la columna generada (SQL raw requerido):**

```php
DB::statement("
    ALTER TABLE malla_curricular
    ADD COLUMN Vigente_Prog_ID INT UNSIGNED
        GENERATED ALWAYS AS (IF(Es_Vigente = 1, ID_Programa, NULL)) VIRTUAL,
    ADD UNIQUE INDEX idx_una_malla_vigente (Vigente_Prog_ID)
");
```

---

### 3.8. Tabla: `agrupacion`

> **CAMBIO CRÍTICO v4:** `ID_Malla` → `ID_Programa`. Las agrupaciones son estructuras estables del programa, no de una versión de malla.
>
> **Mapeo de `Tipo_Agrupacion` desde Excel:** El archivo Excel de agrupaciones tiene dos columnas relevantes: `COMPONENTE` y `TIPO AGRUPACIÓN`. La columna `COMPONENTE` del Excel alimenta el campo `Tipo_Agrupacion` de la BD (no la columna `TIPO AGRUPACIÓN`). La columna `TIPO AGRUPACIÓN` del Excel alimenta `Es_Obligatoria`.
>
> **Tabla de mapeo `COMPONENTE` Excel → `Tipo_Agrupacion` BD:**
>
> | Valor Excel               | Valor BD                                              |
> | ------------------------- | ----------------------------------------------------- |
> | FUNDAMENTACIÓN            | fundamentacion                                        |
> | DISCIPLINAR O PROFESIONAL | disciplinar_profesional                               |
> | LIBRE ELECCIÓN            | libre_eleccion                                        |
> | NIVELATORIO               | nivelatorio                                           |
> | LENGUA EXTRANJERA         | libre_eleccion (o nuevo valor si se extiende el enum) |
>
> **Tabla de mapeo `TIPO AGRUPACIÓN` Excel → `Es_Obligatoria` BD:**
>
> | Valor Excel    | Valor BD |
> | -------------- | -------- |
> | OBLIGATORIA    | 1        |
> | OPTATIVA       | 0        |
> | LIBRE ELECCIÓN | 0        |
> | NIVELATORIO    | 0        |
> | INGLES         | 0        |

| **Columna**         | **Tipo MySQL**              | **NN** | **Default** | **Notas**                                                                                                        |
| ------------------- | --------------------------- | ------ | ----------- | ---------------------------------------------------------------------------------------------------------------- |
| ID_Agrupacion       | INT UNSIGNED AUTO_INCREMENT | Sí     | -           | PK                                                                                                               |
| ID_Programa         | INT UNSIGNED                | Sí     | -           | **CAMBIA v4.** FK → programa (antes era FK → malla_curricular)                                                   |
| ID_Componente       | INT UNSIGNED                | Sí     | -           | FK → componente                                                                                                  |
| Tipo_Agrupacion     | VARCHAR(30)                 | Sí     | -           | fundamentacion\|disciplinar_profesional\|libre_eleccion\|nivelatorio. Mapeado desde columna COMPONENTE del Excel |
| Nombre_Agrupacion   | VARCHAR(150)                | Sí     | -           |                                                                                                                  |
| Creditos_Requeridos | INT UNSIGNED                | No     | NULL        | Créditos mínimos exigidos en esta agrupación                                                                     |
| Creditos_Maximos    | INT UNSIGNED                | No     | NULL        |                                                                                                                  |
| Es_Obligatoria      | TINYINT(1)                  | Sí     | 0           | Mapeado desde columna TIPO AGRUPACIÓN del Excel                                                                  |

**Restricción UNIQUE:**

```sql
UNIQUE KEY uq_agrupacion_programa (ID_Programa, ID_Componente, Nombre_Agrupacion)
```

---

### 3.9. Tabla: `agrupacion_asignatura`

> **CAMBIO CRÍTICO v4:** Se agrega `ID_Malla`. Esta tabla es el punto de unión entre una versión de malla y las agrupaciones del programa.

| **Columna**       | **Tipo MySQL**              | **NN** | **Default** | **Notas**                                                                                                         |
| ----------------- | --------------------------- | ------ | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| ID_Agrup_Asig     | INT UNSIGNED AUTO_INCREMENT | Sí     | -           | PK                                                                                                                |
| ID_Agrupacion     | INT UNSIGNED                | Sí     | -           | FK → agrupacion                                                                                                   |
| ID_Malla          | INT UNSIGNED                | Sí     | -           | FK → malla_curricular                                                                                             |
| ID_Asignatura     | INT UNSIGNED                | No     | NULL        | FK → asignatura. NULL si libre_eleccion                                                                           |
| Tipo_Asignatura   | VARCHAR(30)                 | Sí     | -           | obligatoria\|optativa\|libre_eleccion. Mapeado desde columna "Obligatoria" del Excel: SI→obligatoria, NO→optativa |
| Semestre_Sugerido | INT UNSIGNED                | No     | NULL        | 1-20                                                                                                              |

**Restricción UNIQUE:**

```sql
UNIQUE KEY uq_agrup_asig_malla (ID_Agrupacion, ID_Asignatura, ID_Malla)
```

---

### 3.10. Tabla: `requisito`

| **Columna**             | **Tipo MySQL**              | **NN** | **Default** | **Notas**                                                                      |
| ----------------------- | --------------------------- | ------ | ----------- | ------------------------------------------------------------------------------ |
| ID_Requisito            | INT UNSIGNED AUTO_INCREMENT | Sí     | -           | PK                                                                             |
| ID_Agrup_Asig           | INT UNSIGNED                | Sí     | -           | FK → agrupacion_asignatura (quien exige)                                       |
| ID_Agrup_Asig_Requerida | INT UNSIGNED                | No     | NULL        | FK → agrupacion_asignatura (requerida). NULL si creditos_minimos o texto libre |
| Tipo_Requisito          | VARCHAR(30)                 | Sí     | -           | prerequisito\|correquisito\|creditos_minimos                                   |
| Valor_Creditos          | INT                         | No     | NULL        | Valor de créditos (columna adicional en BD)                                    |
| Creditos_Minimos        | INT UNSIGNED                | No     | NULL        | Solo si tipo = creditos_minimos                                                |
| Descripcion_Requisito   | TEXT                        | No     | NULL        | Texto libre para requisitos no estructurados                                   |

---

### 3.11. Tabla: `usuario`

| **Columna**      | **Tipo MySQL**              | **NN** | **Default**       | **Notas**                                        |
| ---------------- | --------------------------- | ------ | ----------------- | ------------------------------------------------ |
| ID_Usuario       | INT UNSIGNED AUTO_INCREMENT | Sí     | -                 | PK                                               |
| Nombre_Usuario   | VARCHAR(200)                | Sí     | -                 |                                                  |
| Email_Usuario    | VARCHAR(200)                | Sí     | -                 | UNIQUE                                           |
| Otp_Code         | VARCHAR(255)                | No     | NULL              | Hash bcrypt del OTP. Se elimina tras uso exitoso |
| Otp_Expires_At   | TIMESTAMP                   | No     | NULL              | Expiración del OTP. NULL si no hay OTP activo    |
| Activo_Usuario   | TINYINT(1)                  | Sí     | 1                 |                                                  |
| Creacion_Usuario | TIMESTAMP                   | Sí     | CURRENT_TIMESTAMP |                                                  |

---

### 3.12. Tabla: `archivo_excel`

| **Columna**          | **Tipo MySQL**              | **NN** | **Default**       | **Notas**                                               |
| -------------------- | --------------------------- | ------ | ----------------- | ------------------------------------------------------- |
| ID_Archivo           | INT UNSIGNED AUTO_INCREMENT | Sí     | -                 | PK                                                      |
| ID_Usuario           | INT UNSIGNED                | Sí     | -                 | FK → usuario                                            |
| Tipo_Archivo         | VARCHAR(20)                 | Sí     | -                 | asignaturas\|electivas\|malla                           |
| Nombre_Archivo       | VARCHAR(300)                | Sí     | -                 | Nombre original del archivo                             |
| Contenido_Archivo    | LONGBLOB                    | Sí     | -                 | Binario del .xlsx. Requiere `max_allowed_packet >= 64M` |
| Tamanio_Bytes        | BIGINT UNSIGNED             | Sí     | -                 |                                                         |
| Hash_Sha256          | CHAR(64)                    | Sí     | -                 | Para detectar duplicados exactos                        |
| Estado_Procesamiento | VARCHAR(30)                 | Sí     | -                 | pendiente\|procesando\|exitoso\|fallido                 |
| Fecha_Subido         | TIMESTAMP                   | Sí     | CURRENT_TIMESTAMP |                                                         |

---

### 3.13. Tabla: `carga_malla`

| **Columna**            | **Tipo MySQL**              | **NN** | **Default**       | **Notas**                                                                                                                      |
| ---------------------- | --------------------------- | ------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| ID_Carga               | INT UNSIGNED AUTO_INCREMENT | Sí     | -                 | PK                                                                                                                             |
| ID_Archivo_Asignaturas | INT UNSIGNED                | No     | NULL              | FK → archivo_excel                                                                                                             |
| ID_Archivo_Electivas   | INT UNSIGNED                | No     | NULL              | FK → archivo_excel                                                                                                             |
| ID_Archivo_Malla       | INT UNSIGNED                | No     | NULL              | FK → archivo_excel                                                                                                             |
| ID_Archivo_Optativas   | INT UNSIGNED                | No     | NULL              | **NUEVO v5.2.** FK → archivo_excel. Archivo opcional de optativas. NULL si no se sube                                          |
| ID_Malla               | INT UNSIGNED                | No     | NULL              | FK → malla_curricular                                                                                                          |
| ID_Malla_Base          | INT UNSIGNED                | No     | NULL              | FK → malla_curricular                                                                                                          |
| ID_Usuario             | INT UNSIGNED                | Sí     | -                 | FK → usuario                                                                                                                   |
| ID_Programa            | INT UNSIGNED                | No     | NULL              | FK → programa                                                                                                                  |
| ID_Normativa           | INT UNSIGNED                | No     | NULL              | FK → normativa                                                                                                                 |
| Estado_Carga           | VARCHAR(30)                 | Sí     | -                 | esperando_archivos\|listo_para_procesar\|iniciado\|validando\|con_errores\|borrador\|pendiente_aprobacion\|aprobado\|rechazado |
| Comentario_Carga       | TEXT                        | No     | NULL              |                                                                                                                                |
| Comentario_Revisor     | TEXT                        | No     | NULL              |                                                                                                                                |
| ID_Usuario_Revisor     | INT UNSIGNED                | No     | NULL              | FK → usuario                                                                                                                   |
| Fecha_Revision         | TIMESTAMP                   | No     | NULL              |                                                                                                                                |
| Creacion_Carga         | TIMESTAMP                   | Sí     | CURRENT_TIMESTAMP |                                                                                                                                |
| Finalizacion_Carga     | TIMESTAMP                   | No     | NULL              |                                                                                                                                |

---

### 3.14. Tabla: `error_carga`

| **Columna**     | **Tipo MySQL**              | **NN** | **Default** | **Notas**            |
| --------------- | --------------------------- | ------ | ----------- | -------------------- |
| ID_Error        | INT UNSIGNED AUTO_INCREMENT | Sí     | -           | PK                   |
| ID_Carga        | INT UNSIGNED                | Sí     | -           | FK → carga_malla     |
| Fila_Error      | INT UNSIGNED                | No     | NULL        | Fila del Excel       |
| Columna_Error   | VARCHAR(50)                 | No     | NULL        | Nombre de la columna |
| Mensaje_Error   | TEXT                        | Sí     | -           |                      |
| Valor_Recibido  | VARCHAR(500)                | No     | NULL        |                      |
| Severidad_Error | VARCHAR(20)                 | Sí     | -           | error\|advertencia   |

---

### 3.15. Tabla: `diff_malla`

| **Columna**      | **Tipo MySQL**              | **NN** | **Default**       | **Notas**                                         |
| ---------------- | --------------------------- | ------ | ----------------- | ------------------------------------------------- |
| ID_Diff          | INT UNSIGNED AUTO_INCREMENT | Sí     | -                 | PK                                                |
| ID_Carga         | INT UNSIGNED                | Sí     | -                 | FK → carga_malla                                  |
| Entidad_Afectada | VARCHAR(50)                 | Sí     | -                 | agrupacion_asignatura\|requisito\|agrupacion\|... |
| Tipo_Cambio      | VARCHAR(20)                 | Sí     | -                 | INSERT\|UPDATE\|DELETE                            |
| ID_Registro      | INT UNSIGNED                | No     | NULL              | ID del registro afectado                          |
| Valor_Anterior   | JSON                        | No     | NULL              |                                                   |
| Valor_Nuevo      | JSON                        | No     | NULL              |                                                   |
| Creado_Diff      | TIMESTAMP                   | Sí     | CURRENT_TIMESTAMP |                                                   |

---

### 3.16. Tabla: `log_actividad`

| **Columna**    | **Tipo MySQL**              | **NN** | **Default**       | **Notas**                                |
| -------------- | --------------------------- | ------ | ----------------- | ---------------------------------------- |
| ID_Log         | INT UNSIGNED AUTO_INCREMENT | Sí     | -                 | PK                                       |
| ID_Usuario     | INT UNSIGNED                | No     | NULL              | FK → usuario. NULL si acción del sistema |
| Accion_Log     | VARCHAR(100)                | Sí     | -                 | UPLOAD_EXCEL\|APPROVE_MALLA\|LOGIN\|...  |
| Entidad_Log    | VARCHAR(50)                 | No     | NULL              | Tabla afectada                           |
| Entidad_ID_Log | BIGINT UNSIGNED             | No     | NULL              | ID del registro afectado                 |
| Detalle_Log    | JSON                        | No     | NULL              |                                          |
| IP_Origen_Log  | VARCHAR(45)                 | No     | NULL              | IPv4 o IPv6                              |
| Creacion_Log   | TIMESTAMP                   | Sí     | CURRENT_TIMESTAMP |                                          |

---

## 4. Flujo del Modelo de Datos

### 4.1. Configuración inicial (una sola vez por programa)

```
1. CRUD: Sede -> Facultad (con Codigo_Facultad) -> Programa -> Normativa
2. CRUD: Componente (catálogo global: Fundamentación, Disciplinar, etc.)
3. CRUD: Agrupacion por Programa
   - Se definen las agrupaciones estables: cuántas hay, qué tipo, cuántos créditos exige cada una
   - Tipo_Agrupacion se deriva de la columna COMPONENTE del Excel de agrupaciones
   - Es_Obligatoria se deriva de la columna TIPO AGRUPACIÓN del Excel
```

### 4.2. Por cada nueva versión de malla

```
1. Crear carga (POST /api/cargas) -> carga en estado esperando_archivos
2. Subir tres archivos (POST /api/cargas/{id}/archivo x 3) -> al terminar, estado listo_para_procesar
3. Lanzar Job (POST /api/cargas/{id}/procesar) -> estado iniciado -> validando
4. Job procesa en orden: asignaturas -> electivas -> malla
5. Se crea malla_curricular (estado: borrador)
6. Se generan diff_malla
7. Flujo de aprobación -> si se aprueba, malla pasa a activa y Es_Vigente = 1
```

### 4.3. Flujo de carga en dos fases (v5)

```
esperando_archivos   <- estado inicial al crear la carga
       |
       |  (se sube cada archivo)
       |
listo_para_procesar  <- automáticamente cuando los 3 archivos están presentes
       |
       |  (usuario presiona "Procesar")
       |
    iniciado         <- Job encolado
       |
   validando         <- Job en ejecución
       |
  +---------+
con_errores        borrador     <- Job terminó
                      |
              pendiente_aprobacion
                      |
              +-------+-------+
           aprobado        rechazado
```

### 4.4. Orden de procesamiento del Job (v5.2)

```
Paso 0 - Pre-procesamiento: Construir mapa de lookup
  -> Leer "FORMATO - AGRUPACIONES ING. CIVIL_.xlsx"
  -> Mapa: ID_Excel -> (Nombre_Agrupacion, Nombre_Componente, Tipo_Agrupacion, Es_Obligatoria)
  -> Este mapa se usa en Pasos 3 y 4 para resolver IDs numéricos del Excel de malla

Paso 1 - Procesar archivo_asignaturas
  -> Lee hoja de asignaturas
  -> Inserta o actualiza registros en tabla `asignatura`
  -> Aplica limpieza: trim(), limpiar \n, convertir floats a int para códigos

Paso 2 - Procesar archivo_electivas
  -> Lee hoja ELECTIVAS
  -> Inserta o actualiza registros en tabla `asignatura` (mismo catálogo)

Paso 3 - Procesar archivo_malla
  -> Depende de que Pasos 1 y 2 hayan completado sin errores bloqueantes
  -> Crea malla_curricular (estado: borrador)
  -> Para cada fila (solo filas con datos, filtrar vacías):
     1. Resuelve Normativa por su ID numérico (lookup en normativas del programa)
     2. Resuelve Componente por su ID numérico (lookup en mapa del Paso 0)
     3. Resuelve Agrupación por su ID numérico (lookup en mapa del Paso 0)
     4. Resuelve Asignatura por código (lookup/crear en tabla asignatura)
     5. Crea agrupacion_asignatura con ID_Malla
     6. Procesa requisitos de la misma fila (prerequisito/correquisito/texto libre)
  -> Genera diff_malla vs malla base

Paso 4 (OPCIONAL) - Procesar archivo_optativas
  -> Solo se ejecuta si ID_Archivo_Optativas no es NULL
  -> Filtra filas del programa en carga (usando PROGRAMA CURRICULAR o heredando del contexto)
  -> Para cada fila con datos del programa (filtrar vacías):
     1. Resuelve Agrupación por ID numérico o nombre de texto (lookup en mapa del Paso 0)
     2. Resuelve Asignatura por código (lookup/crear en tabla asignatura)
     3. Crea agrupacion_asignatura con ID_Malla
     4. Procesa requisitos de la misma fila
  -> Las filas sin código de asignatura son solo requisitos de filas anteriores
```

### 4.5. Consulta de la malla vigente de un programa

```sql
SELECT
    ag.Nombre_Agrupacion,
    ag.Tipo_Agrupacion,
    c.Nombre_Componente,
    a.Codigo_Asignatura,
    a.Nombre_Asignatura,
    aa.Tipo_Asignatura,
    aa.Semestre_Sugerido
FROM malla_curricular mc
JOIN agrupacion_asignatura aa ON aa.ID_Malla = mc.ID_Malla
JOIN agrupacion ag ON ag.ID_Agrupacion = aa.ID_Agrupacion
JOIN componente c ON c.ID_Componente = ag.ID_Componente
LEFT JOIN asignatura a ON a.ID_Asignatura = aa.ID_Asignatura
WHERE mc.ID_Programa = 5
  AND mc.Es_Vigente = 1
ORDER BY ag.Tipo_Agrupacion, ag.Nombre_Agrupacion, aa.Semestre_Sugerido;
```

---

## 5. Requerimientos Funcionales

> _Convención de IDs: `RF-XX-YY` donde XX es el módulo y YY es el número del requerimiento._

### 5.1. Módulo de Autenticación (RF-AU)

| **ID**   | **Requerimiento**                                                              | **Prioridad** |
| -------- | ------------------------------------------------------------------------------ | ------------- |
| RF-AU-01 | Login en dos pasos OTP: correo -> código 6 dígitos -> token Sanctum en memoria | Alta          |
| RF-AU-02 | Logout invalidando token via `POST /api/auth/logout`                           | Alta          |
| RF-AU-03 | Todas las rutas protegidas excepto request-otp y verify-otp                    | Alta          |
| RF-AU-04 | OTP vigente 10 minutos                                                         | Media         |

### 5.2. Módulo de Catálogos CRUD (RF-CA)

| **ID**   | **Requerimiento**                                                                                 | **Prioridad** |
| -------- | ------------------------------------------------------------------------------------------------- | ------------- |
| RF-CA-01 | CRUD Sede. Obligatorios: `Nombre_Sede`, `Ciudad_Sede`                                             | Alta          |
| RF-CA-02 | CRUD Facultad. Obligatorios: `Codigo_Facultad` (único), `Nombre_Facultad`, `Codigo_Sede` (FK)     | Alta          |
| RF-CA-03 | CRUD Programa. Obligatorios: `Codigo_Programa` (único), `Nombre_Programa`, `Codigo_Facultad` (FK) | Alta          |
| RF-CA-04 | CRUD Normativa. Asociada a Programa existente                                                     | Alta          |
| RF-CA-05 | CRUD Componente. `Nombre_Componente` único                                                        | Alta          |
| RF-CA-06 | CRUD Asignatura. `Codigo_Asignatura` único                                                        | Alta          |
| RF-CA-07 | CRUD Usuario. Solo activos pueden iniciar sesión                                                  | Alta          |
| RF-CA-08 | CRUD Agrupación por Programa. UNIQUE(Programa + Componente + Nombre)                              | Alta          |
| RF-CA-09 | Listados con búsqueda y paginación de 20                                                          | Media         |

### 5.3. Módulo de Carga Masiva (RF-CM)

| **ID**   | **Requerimiento**                                                                                                               | **Prioridad** |
| -------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| RF-CM-01 | Carga masiva de Asignaturas. Si código existe, reutilizar                                                                       | Alta          |
| RF-CM-02 | Carga masiva de Electivas. Flujo UI separado                                                                                    | Alta          |
| RF-CM-03 | Subida de tres archivos .xlsx progresiva con LONGBLOB y SHA-256                                                                 | Alta          |
| RF-CM-04 | Reemplazo automático si sube mismo tipo de archivo                                                                              | Alta          |
| RF-CM-05 | Estado cambia a `listo_para_procesar` automáticamente                                                                           | Alta          |
| RF-CM-06 | Procesar solo si estado es `listo_para_procesar` (409 si no)                                                                    | Alta          |
| RF-CM-07 | Subida opcional de cuarto archivo tipo `optativas` en `POST /api/cargas/{id}/archivo`. Se procesa después de la malla principal | Alta          |

### 5.4. Módulo de Procesamiento de Excel (RF-CE)

| **ID**   | **Requerimiento**                                                                                                                                                                                                             | **Prioridad** |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| RF-CE-01 | Verificar hash SHA-256 duplicado por programa                                                                                                                                                                                 | Alta          |
| RF-CE-02 | Leer asignaturas y electivas antes que malla                                                                                                                                                                                  | Alta          |
| RF-CE-03 | Limpiar texto: trim(), eliminar \n, normalizar espacios                                                                                                                                                                       | Alta          |
| RF-CE-04 | Sin código = error bloqueante en `error_carga`                                                                                                                                                                                | Alta          |
| RF-CE-05 | Código existe con nombre diferente = advertencia                                                                                                                                                                              | Alta          |
| RF-CE-06 | Orden: asignatura -> agrupación -> agrupacion_asignatura -> requisito                                                                                                                                                         | Alta          |
| RF-CE-07 | Crear malla_curricular (borrador) antes de procesar filas                                                                                                                                                                     | Alta          |
| RF-CE-08 | Soportar malla base para diff                                                                                                                                                                                                 | Media         |
| RF-CE-09 | Procesamiento en Job asincrónico con polling                                                                                                                                                                                  | Media         |
| RF-CE-10 | Mapear "Obligatoria" SI/NO -> obligatoria/optativa                                                                                                                                                                            | Alta          |
| RF-CE-11 | Requisitos de texto libre -> `Descripcion_Requisito`                                                                                                                                                                          | Alta          |
| RF-CE-12 | Orden estricto: asignaturas -> electivas -> malla                                                                                                                                                                             | Alta          |
| RF-CE-13 | Procesamiento opcional del archivo OPTATIVA como cuarto paso, extrayendo solo filas del programa en carga. Crear `agrupacion_asignatura` adicionales y sus requisitos. Las filas sin código son dependencias de prerrequisito | Alta          |

**Nota sobre limpieza de códigos (v5.1):** openpyxl lee códigos numéricos como float (ej: 4200713.0). El parser DEBE aplicar `str(int(value))` para enteros y `value.strip()` para strings antes de buscar o insertar en BD. Los códigos con `\n` internos deben limpiarse con `strip()`.

### 5.5. Módulo de Flujo de Aprobación (RF-AP)

| **ID**   | **Requerimiento**                                          | **Prioridad** |
| -------- | ---------------------------------------------------------- | ------------- |
| RF-AP-01 | Flujo estricto de estados                                  | Alta          |
| RF-AP-02 | Solo el cargador puede enviar a revisión                   | Alta          |
| RF-AP-03 | Solo usuario diferente puede aprobar/rechazar              | Alta          |
| RF-AP-04 | Aprobación: activa malla, archiva anterior, en transacción | Alta          |
| RF-AP-05 | Rechazo: guarda comentarios                                | Alta          |
| RF-AP-06 | Mostrar diff completo con INSERT/UPDATE/DELETE             | Alta          |

### 5.6. Módulo de Visualización de Mallas (RF-VI)

| **ID**   | **Requerimiento**                                                          | **Prioridad** |
| -------- | -------------------------------------------------------------------------- | ------------- |
| RF-VI-01 | Mostrar malla vigente por Tipo_Agrupacion -> Nombre_Agrupacion             | Alta          |
| RF-VI-02 | Mostrar prerequisitos y correquisitos                                      | Alta          |
| RF-VI-03 | Navegar historial y comparar versiones                                     | Media         |
| RF-VI-04 | Totales de créditos por agrupación (créditos únicos por Codigo_Asignatura) | Media         |

### 5.7. Módulo de Auditoría (RF-AU2)

| **ID**    | **Requerimiento**                        | **Prioridad** |
| --------- | ---------------------------------------- | ------------- |
| RF-AU2-01 | Registrar toda acción en `log_actividad` | Alta          |
| RF-AU2-02 | Consultar logs con filtros y paginación  | Media         |
| RF-AU2-03 | Logs de solo lectura                     | Alta          |

---

## 6. Requerimientos No Funcionales

| **ID** | **Categoría**  | **Requerimiento**                               | **Criterio de aceptación**          |
| ------ | -------------- | ----------------------------------------------- | ----------------------------------- |
| RNF-01 | Seguridad      | OTP con bcrypt (cost >= 12), eliminar tras uso  | Verificable en BD                   |
| RNF-02 | Seguridad      | Rate limiting: 60/min general, 10/min auth      | Configurable en Laravel             |
| RNF-03 | Seguridad      | Validación con Form Requests                    | Toda ruta tiene FormRequest         |
| RNF-04 | Seguridad      | Headers de seguridad                            | Verificable con securityheaders.com |
| RNF-05 | Rendimiento    | Listados < 500ms con 1000 registros             | Medible con Telescope               |
| RNF-06 | Rendimiento    | Excel de 500 filas < 30s en Job                 | Medible en producción               |
| RNF-07 | Confiabilidad  | Transacciones en operaciones críticas           | DB::transaction()                   |
| RNF-08 | Confiabilidad  | Job reintentos: 3 veces con backoff exponencial | $tries y $backoff                   |
| RNF-09 | Mantenibilidad | Lógica de negocio en Services                   | No en Controllers                   |
| RNF-10 | Mantenibilidad | PSR-12 PHP, ESLint React                        | Pipeline CI                         |
| RNF-11 | Usabilidad     | Responsivo desde 1024px                         | Prueba manual                       |
| RNF-12 | Compatibilidad | API JSON con {data, message, errors}            | API Resources                       |
| RNF-13 | Charset        | utf8mb4_unicode_ci                              | my.cnf                              |

---

## 7. Reglas de Negocio Críticas

| **ID** | **Regla**                                         | **Implementación**                         |
| ------ | ------------------------------------------------- | ------------------------------------------ |
| RN-01  | Solo UNA malla vigente por programa               | UNIQUE sobre columna generada              |
| RN-02  | Asignatura sin código = error bloqueante          | ExcelParserService                         |
| RN-03  | Aprobar archiva malla anterior automáticamente    | MallaAprobacionService + DB::transaction() |
| RN-04  | Cambios CRUD en malla se registran en diff y log  | Eloquent Observer                          |
| RN-05  | Malla activa no se edita directamente             | Validación en endpoints                    |
| RN-06  | Hash duplicado por programa = rechazo             | ExcelUploadService                         |
| RN-07  | Nunca eliminar físicamente, solo desactivar       | Controllers                                |
| RN-08  | Agrupación única por programa+componente+nombre   | UNIQUE KEY                                 |
| RN-09  | Asignatura única por agrupación+malla             | UNIQUE KEY                                 |
| RN-10  | Procesar solo si listo_para_procesar (409)        | CargaController                            |
| RN-11  | Reemplazo automático de archivo del mismo tipo    | ExcelUploadService                         |
| RN-12  | Orden estricto: asignaturas -> electivas -> malla | ProcessExcelUploadJob                      |

---

## 8. Endpoints de la API REST

Base URL: `/api`. Todas las rutas requieren `Authorization: Bearer {token}` excepto auth.

### 8.0. Rutas web (Inertia)

| **Método** | **Ruta**                     | **Controlador**             | **Descripción**                |
| ---------- | ---------------------------- | --------------------------- | ------------------------------ |
| GET        | /malla-publica/{id_programa} | MallaPublicaController@show | Visualización pública de malla |

### 8.1. Autenticación

| **Método** | **Ruta**              | **Descripción**               | **Body**        |
| ---------- | --------------------- | ----------------------------- | --------------- |
| POST       | /api/auth/request-otp | Enviar OTP al correo          | `{email}`       |
| POST       | /api/auth/verify-otp  | Verificar OTP, devolver token | `{email, code}` |
| POST       | /api/auth/logout      | Cerrar sesión                 | -               |
| GET        | /api/me               | Datos del usuario autenticado | -               |

### 8.2. Catálogos

| **Método** | **Ruta**                   | **Descripción**                          |
| ---------- | -------------------------- | ---------------------------------------- |
| GET        | /api/{entidad}             | Lista paginada con `?search=` y `?page=` |
| POST       | /api/{entidad}             | Crear. FormRequest validation            |
| GET        | /api/{entidad}/{id}        | Mostrar registro                         |
| PUT        | /api/{entidad}/{id}        | Actualizar                               |
| PATCH      | /api/{entidad}/{id}/toggle | Activar/desactivar                       |

Entidades: sedes, facultades, programas, normativas, componentes, asignaturas, usuarios.

### 8.3. Agrupaciones

| **Método** | **Ruta**                         | **Descripción**                    |
| ---------- | -------------------------------- | ---------------------------------- |
| GET        | /api/programas/{id}/agrupaciones | Lista del programa                 |
| POST       | /api/programas/{id}/agrupaciones | Crear en el programa               |
| PUT        | /api/agrupaciones/{id}           | Editar (registra diff + log)       |
| DELETE     | /api/agrupaciones/{id}           | Eliminar (solo sin mallas activas) |

### 8.4. Mallas y Cargas

| **Método** | **Ruta**                          | **Descripción**                           | **Body**                                                    |
| ---------- | --------------------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| GET        | /api/programas/{id}/malla-vigente | Malla activa completa                     | -                                                           |
| GET        | /api/programas/{id}/mallas        | Historial de versiones                    | -                                                           |
| POST       | /api/cargas                       | Crear carga (sin archivos)                | `{programa_id, normativa_id, malla_base_id?}`               |
| GET        | /api/cargas                       | Lista cargas con estado                   | `?estado=&programa_id=`                                     |
| GET        | /api/cargas/{id}                  | Detalle de carga                          | -                                                           |
| GET        | /api/cargas/{id}/estado           | Estado para polling                       | -                                                           |
| GET        | /api/cargas/{id}/diff             | Diffs agrupados                           | -                                                           |
| POST       | /api/cargas/{id}/archivo          | Subir archivo tipado (opcional optativas) | `{archivo, tipo: asignaturas\|electivas\|malla\|optativas}` |
| POST       | /api/cargas/{id}/procesar         | Lanzar Job                                | - (409 si estado incorrecto)                                |
| PATCH      | /api/cargas/{id}/enviar-revision  | Enviar a revisión                         | -                                                           |
| PATCH      | /api/cargas/{id}/revisar          | Aprobar/rechazar                          | `{accion, comentario}`                                      |

### 8.5. Auditoría

| **Método** | **Ruta**  | **Descripción**                                     |
| ---------- | --------- | --------------------------------------------------- |
| GET        | /api/logs | Filtros: `?usuario_id=&accion=&desde=&hasta=&page=` |

---

## 9. Estructura de los Archivos Excel

### 9.1. Archivo de Asignaturas (`FORMATO DE CARGA - ASIGNATURAS.xlsx`)

~2464 registros. Catálogo global de asignaturas.

| **Columna Excel** | **Campo BD**          | **Obligatorio** | **Regla de transformación**                       |
| ----------------- | --------------------- | --------------- | ------------------------------------------------- |
| CODIGO            | `Codigo_Asignatura`   | Sí              | `str(int(value))` para floats. Sin código = error |
| NOMBRE            | `Nombre_Asignatura`   | Sí              | `value.strip()`, limpiar `\n`                     |
| CREDITOS          | `Creditos_Asignatura` | Sí              | `int(value)`                                      |
| HORA_PRESENCIAL   | `Horas_Presencial`    | No              | `int(value)`                                      |
| HORA_ESTUDIANTE   | `Horas_Estudiante`    | No              | `int(value)`                                      |

### 9.2. Archivo de Electivas (`FORMATO DE CARGA - ELECTIVAS.xlsx`)

~1000 registros. Asignaturas de libre elección.

| **Columna Excel** | **Campo BD**          | **Obligatorio** |
| ----------------- | --------------------- | --------------- |
| CODIGO            | `Codigo_Asignatura`   | Sí              |
| NOMBRE            | `Nombre_Asignatura`   | Sí              |
| CREDITOS          | `Creditos_Asignatura` | Sí              |

### 9.3. Archivo de Malla (`FORMATO DE CARGA - ING. CIVIL .xlsx`)

~75 registros reales (el resto son filas vacías). Estructura del plan de estudios.

> **Nota importante:** Este archivo usa **IDs numéricos de referencia** para Normativa, Componente y Agrupación. El parser debe construir un mapa de lookup a partir del archivo de agrupaciones antes de procesar la malla.

| **Columna Excel**                   | **Campo BD**        | **Obligatorio** | **Regla de transformación**                                                                                         |
| ----------------------------------- | ------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------- |
| Normativa                           | `ID_Normativa`      | Sí              | `int(value)` → Buscar normativa del programa por posición/orden                                                     |
| Componente (Se usará identificador) | `ID_Componente`     | Sí              | `int(value)` → Lookup en mapa de agrupaciones del Excel. Resolver a `componentes.ID_Componente` y `Tipo_Agrupacion` |
| Agrupación (Se usará identificador) | `ID_Agrupacion`     | Sí              | `int(value)` → Lookup en mapa de agrupaciones del Excel. Obtener `Nombre_Agrupacion` y `ID_Agrupacion` real de BD   |
| Código Asignatura                   | `Codigo_Asignatura` | Sí              | `str(int(value)) if isinstance(v, float) else value.strip()`. Sin código = error                                    |
| Obligatoria                         | `Tipo_Asignatura`   | Sí              | SI → "obligatoria", NO → "optativa"                                                                                 |
| Semestre                            | `Semestre_Sugerido` | No              | `int(value)`, rango 1-20                                                                                            |
| Tipo requisito                      | `Tipo_Requisito`    | No              | `value.strip().lower()`: "Prerrequisito" → "prerequisito", "Correquisito" → "correquisito"                          |
| Codigo asignatura o valor           | Varies              | No              | Ver reglas de requisitos abajo                                                                                      |

**Reglas de la columna "Codigo asignatura o valor":**

- Si es `None` → Sin requisito, omitir
- Si es float/entero → Es un código de asignatura. Buscar `agrupacion_asignatura` de esa asignatura → `ID_Agrup_Asig_Requerida`
- Si es string numérico con `\n` → Limpiar con `strip()` y tratar como código
- Si es texto libre (ej: "Haber aprobado 70 créditos...") → `Descripcion_Requisito`

### 9.4. Archivo de Optativas (`FORMATO DE CARGA - OPTATIVA.xlsx`) — NUEVO v5.2

> **Procesamiento como cuarto paso opcional del Job (decisión v5.2).** Contiene ~208 registros con datos de asignaturas optativas de **8 programas diferentes**. Solo ~212 filas tienen datos reales; las 786 restantes están vacías y deben ignorarse.

El archivo se procesa **después** del archivo de malla (Paso 4), extrayendo **solo las filas del programa que se está cargando**. Las asignaturas y requisitos se agregan a la malla en borrador creada en el Paso 3.

**Reglas de procesamiento:**

1. **Filtrar por programa:** Solo procesar filas cuya columna `PROGRAMA CURRICULAR` coincida con el `Codigo_Programa` de la carga, o filas sin programa heredando del grupo anterior.
2. **Filtrar filas vacías:** Ignorar filas donde `CÓDIGO` es None. Las filas sin código pero con `Código prerrequisito` son "filas de dependencia" que indican un requisito para la asignatura anterior.
3. **Resolver agrupación:** Usar columna `AGRUPACIÓN (CAMBIAR POR CODIGO)` — si es numérico, lookup en mapa del Paso 0; si es texto, buscar `Nombre_Agrupacion` en BD.
4. **Crear asignatura:** Usar `CÓDIGO`, `NOMBRE`, `CRÉDITOS` para lookup/crear en tabla `asignatura`.
5. **Crear `agrupacion_asignatura`:** Usando `ID_Malla` de la malla creada en Paso 3.
6. **Crear requisitos:** Usar `Código prerrequisito`, `ASIGNATURA PREREQUISITO`, `TIPO DE REQUISITO`.
7. **El campo `OBLIGATORIA`** es siempre "NO" → `Tipo_Asignatura = "optativa"`.

| **Columna Excel**               | **Campo BD**                   | **Obligatorio** | **Regla**                                                                        |
| ------------------------------- | ------------------------------ | --------------- | -------------------------------------------------------------------------------- |
| PROGRAMA CURRICULAR             | Filtro                         | No              | Filtrar filas del programa en carga. Solo primera fila del grupo tiene valor     |
| COMPONENTE                      | Lookup                         | Sí              | IDs numéricos (1, 2) o nombres textuales. Resolver a `componentes.ID_Componente` |
| AGRUPACIÓN (CAMBIAR POR CODIGO) | `ID_Agrupacion`                | Sí              | IDs numéricos o nombres. Lookup en mapa de agrupaciones                          |
| CÓDIGO                          | `Codigo_Asignatura`            | Condicional     | Si es None, es fila de prerrequisito (no crear asignatura)                       |
| NOMBRE                          | `Nombre_Asignatura`            | Condicional     | Solo si CÓDIGO no es None                                                        |
| CRÉDITOS                        | `Creditos_Asignatura`          | Condicional     | Solo si CÓDIGO no es None                                                        |
| OBLIGATORIA                     | `Tipo_Asignatura`              | Sí              | Siempre "NO" → "optativa"                                                        |
| Código prerrequisito            | Código de asignatura requerida | No              | float→int→buscar `agrupacion_asignatura`. "-" = sin prerrequisito                |
| ASIGNATURA PREREQUISITO         | (referencial)                  | No              | Nombre de la asignatura requerida (solo para documentación)                      |
| TIPO DE REQUISITO               | `Tipo_Requisito`               | No              | "Prerrequisito"→prerequisito, "Correquisito"→correquisito, "-"→omitir            |

---

## 10. Plan de Fases de Desarrollo

### Fase 1 — Fundación y Autenticación

| **#** | **Tarea**                        | **Capa** | **Criterio de aceptación**              |
| ----- | -------------------------------- | -------- | --------------------------------------- |
| 1.1   | Proyecto Laravel 12 + MySQL      | Backend  | migrate sin errores                     |
| 1.2   | Migraciones de todas las tablas  | Backend  | Tablas con tipos, FK y UNIQUE correctos |
| 1.3   | Seeders: sede, facultades, admin | Backend  | db:seed crea registros base             |
| 1.4   | Auth OTP con Sanctum             | Backend  | OTP enviado y token devuelto            |
| 1.5   | Proyecto React 19 + Vite         | Frontend | npm run dev funciona                    |
| 1.6   | Login OTP en frontend            | Frontend | Flujo completo end-to-end               |
| 1.7   | Logout y protección de rutas     | Frontend | Redirección sin token                   |

### Fase 2 — Catálogos

| **#** | **Tarea**                                | **Capa** | **Criterio de aceptación** |
| ----- | ---------------------------------------- | -------- | -------------------------- |
| 2.1   | Modelos Eloquent con relaciones          | Backend  | Relaciones en tinker       |
| 2.2   | API Resources                            | Backend  | {data, message}            |
| 2.3   | Form Requests                            | Backend  | 422 con errores            |
| 2.4   | Controllers (7 catálogos + agrupaciones) | Backend  | Endpoints funcionan        |
| 2.5   | Vistas React de catálogos                | Frontend | CRUD operativo             |
| 2.6   | Vista de Agrupaciones por Programa       | Frontend | CRUD agrupaciones          |
| 2.7   | Componente DataTable reutilizable        | Frontend | Usado en todos             |

### Fase 3 — Carga Masiva y Procesamiento

| **#** | **Tarea**                             | **Capa** | **Criterio de aceptación**         |
| ----- | ------------------------------------- | -------- | ---------------------------------- |
| 3.1   | ExcelUploadService                    | Backend  | Archivos guardados con tipo        |
| 3.2   | Endpoints crear carga y subir archivo | Backend  | Estado evoluciona correctamente    |
| 3.3   | Endpoint procesar con validación      | Backend  | 409 si estado incorrecto           |
| 3.4   | ExcelParserService (3 pasos)          | Backend  | Excel de prueba procesado          |
| 3.5   | Validaciones por fila                 | Backend  | error_carga registra correctamente |
| 3.6   | ProcessExcelUploadJob                 | Backend  | Job con reintentos y orden         |
| 3.7   | Polling de estado                     | Backend  | Devuelve progreso                  |
| 3.8   | Vista React de carga                  | Frontend | Tres zonas de drop, botón Procesar |

### Fase 4 — Aprobación y Diff

| **#** | **Tarea**              | **Capa** | **Criterio de aceptación** |
| ----- | ---------------------- | -------- | -------------------------- |
| 4.1   | DiffService            | Backend  | diffs correctos            |
| 4.2   | MallaAprobacionService | Backend  | Transacción atómica        |
| 4.3   | Endpoints revisar      | Backend  | Estados transicionan       |
| 4.4   | LogService + Observers | Backend  | Auditoría automática       |
| 4.5   | Vista detalle de carga | Frontend | Diff visible               |
| 4.6   | Vista revisión         | Frontend | Aprobar/rechazar funcional |

### Fase 5 — Visualización de Mallas

| **#** | **Tarea**               | **Capa** | **Criterio de aceptación**   |
| ----- | ----------------------- | -------- | ---------------------------- |
| 5.1   | Endpoint malla-vigente  | Backend  | JSON completo                |
| 5.2   | Endpoint historial      | Backend  | Lista de versiones           |
| 5.3   | Vista malla             | Frontend | Árbol por agrupación         |
| 5.4   | Totales de créditos     | Frontend | 179 créditos para Ing. Civil |
| 5.5   | Comparador de versiones | Frontend | Diff visual                  |

---

## 11. Convenciones de Código

### 11.1. Backend Laravel

- PascalCase clases, camelCase métodos, Snake_Case columnas BD
- Cada entidad: Model, Migration, Controller, Resource, FormRequest
- Services: `ExcelUploadService`, `ExcelParserService`, `DiffService` (MallaDiffService), `MallaAprobacionService`, `LogService` (LogActividadService), `MallaVisualizerService`, `CodeNormalizationService`
- Jobs en `app/Jobs/`. Observers en `app/Observers/`
- Rutas en `routes/api.php` con prefijo `v1`
- Respuestas: `{data, message, errors}`

### 11.2. Frontend React

- PascalCase componentes, camelCase hooks con prefijo `use`
- Estructura: `src/pages/Catalogos/`, `src/pages/Cargas/`, `src/pages/Mallas/`
- API centralizada en `src/api/`
- Token en Context API, nunca en localStorage
- Polling con `useEffect` + `setInterval`

---

## 12. Instrucciones Directas para el Agente de Desarrollo

### 12.1. Restricciones no negociables

- Laravel 12, React 19, MySQL 8, Inertia.js
- Token en memoria (Context API)
- Nunca eliminar físicamente, solo desactivar
- Lógica de negocio en Services, no Controllers
- Agrupaciones pertenecen al Programa, no a la malla
- Tres archivos obligatorios + uno opcional (optativas) para carga masiva
- Job en orden estricto: asignaturas -> electivas -> malla -> (optativas si existe)

### 12.2. Orden de desarrollo recomendado

1. Estructura de directorios
2. Fase 1: proyecto, migraciones, seeders, auth OTP
3. Verificar auth end-to-end
4. Fase 2: catálogos backend + frontend
5. Cargar datos reales de UNAL Manizales
6. Fase 3: carga masiva con archivos de prueba
7. Fase 4: aprobación con dos usuarios
8. Fase 5: visualización y verificación de créditos

### 12.3. Datos de prueba disponibles

- Archivos Excel en `files_tests/`:
    - **FORMATO - SEDES.xlsx** (1 registro)
    - **FORMATO - FACULTADES.xlsx** (4 registros)
    - **FORMATO - PROGRAMAS.xlsx** (15 programas de Manizales)
    - **FORMATO - AGRUPACIONES ING. CIVIL\_.xlsx** (18 agrupaciones)
    - **FORMATO - NORMATIVA.xlsx** (11 normativas)
    - **FORMATO DE CARGA - ASIGNATURAS.xlsx** (2464 asignaturas)
    - **FORMATO DE CARGA - ELECTIVAS.xlsx** (1000 electivas)
    - **FORMATO DE CARGA - ING. CIVIL .xlsx** (75 filas de malla)
    - **FORMATO DE CARGA - OPTATIVA.xlsx** (archivo complementario, ver §9.4)

**Problemas conocidos del Excel de prueba:**

- **4 asignaturas sin código** en la malla (errores bloqueantes RF-CE-04)
- **Registros con saltos de línea (`\n`)** en código y nombre (RF-CE-03)
- **Requisitos de texto libre** (condiciones de crédito, no solo "Trabajo de Grado")
- **Códigos leídos como float** por openpyxl: aplicar `str(int(value))` antes de procesar
- **Filas vacías** en malla (~930 de 1005): filtrar antes de procesar
- **Columna "Obligatoria"** usa SI/NO: mapear a obligatoria/optativa (RF-CE-10)
- **Tipo requisito** con mayúsculas ("Prerrequisito"): normalizar a minúsculas

### 12.4. Configuración del servidor de producción

| **Parámetro**            | **Valor**          | **Donde configurar** |
| ------------------------ | ------------------ | -------------------- |
| Servidor web             | Apache 2.4.62      | FreeBSD              |
| PHP                      | 8.3.8              | FreeBSD              |
| MySQL                    | 8.0+               | Verificar versión    |
| max_allowed_packet       | 64M mínimo         | my.cnf               |
| character-set-server     | utf8mb4            | my.cnf               |
| collation-server         | utf8mb4_unicode_ci | my.cnf               |
| default-time-zone        | +00:00             | my.cnf               |
| Apache mod_rewrite       | Habilitado         | .htaccess            |
| Apache AllowOverride     | All                | .htaccess            |
| PHP extension: pdo_mysql | Habilitada         | Laravel              |
| PHP extension: fileinfo  | Habilitada         | Laravel Excel        |
| PHP extension: zip       | Habilitada         | Laravel Excel        |
| PHP extension: pcntl     | Habilitada         | queue worker         |

### 12.5. Queue worker

La aplicación usa `QUEUE_CONNECTION=database` para procesamiento asincrónico de cargas Excel.
**El worker debe estar corriendo para que las cargas se procesen.**

En **producción (Docker):** supervisor ejecuta automáticamente:

```ini
[program:queue-worker]
command=php /var/www/html/artisan queue:work --sleep=3 --tries=3 --max-time=3600
user=app
autostart=true
autorestart=true
```

En **local:** ejecutar manualmente:

```bash
php artisan queue:work --queue=default
```

En **testing:** `QUEUE_CONNECTION=sync` en `phpunit.xml` para ejecución síncrona.|
