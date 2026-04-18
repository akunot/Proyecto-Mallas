# UNIVERSIDAD NACIONAL DE COLOMBIA
## Sede Manizales

**Documento de Requerimientos del Sistema**

Sistema de Gestión de Mallas Académicas — UNAL Manizales

*Documento preparado para procesamiento por agente de desarrollo*

Versión 5.0 | Abril 2026

---

| **Campo** | **Valor** |
|---|---|
| Proyecto | Sistema de Gestión de Mallas Académicas |
| Cliente | Universidad Nacional de Colombia - Sede Manizales |
| Stack | Laravel 12 + React 19 + MySQL 8 + Apache 2.4 |
| Arquitectura | API REST (Laravel) + SPA (React) + Vite |
| Autenticación | Laravel Sanctum con OTP de 6 dígitos por correo (sin contraseña) |
| Tipo de sistema | Panel administrativo cerrado, usuarios contados |
| Documento versión | 5.0 — Abril 2026 |

### Historial de cambios

| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | Marzo 2026 | Versión inicial |
| 4.0 | Abril 2026 | Auditoría de BD: `agrupacion` pasa de `ID_Malla` a `ID_Programa`; `agrupacion_asignatura` recibe `ID_Malla`; se añade `Codigo_Facultad` a `facultad`; se añade `Tipo_Agrupacion` a `agrupacion`; nuevas restricciones UNIQUE; flujo de carga masiva documentado; RF-CA-08 para CRUD de Agrupaciones; RN-09, RN-10 |
| 5.0 | Abril 2026 | Carga masiva dividida en tres archivos separados (asignaturas, electivas, malla); `carga_malla` reemplaza `ID_Archivo` único por tres FKs; `carga_malla` recibe `ID_Programa` e `ID_Normativa`; `archivo_excel` recibe `Tipo_Archivo`; flujo de subida en dos fases (subida progresiva + lanzamiento); nuevos estados `esperando_archivos` y `listo_para_procesar`; API de cargas dividida en tres endpoints; reemplazo automático si se sube el mismo tipo de archivo dos veces; módulo RF-CM; RN-11, RN-12, RN-13; sección 4 con flujo del modelo de datos |

---

## 1. Contexto del Proyecto

El sistema de Mallas Académicas de la UNAL Sede Manizales gestiona los planes de estudio de todos los programas académicos de la universidad. Actualmente no existe un sistema centralizado para actualizar, versionar y aprobar cambios en las mallas curriculares. Las actualizaciones se hacen manualmente y no hay trazabilidad de los cambios históricos.

El nuevo sistema permite a los administradores cargar archivos Excel con la estructura de una malla, validar los datos, comparar los cambios contra la versión anterior, someter la nueva malla a un flujo de aprobación, y activarla como vigente una vez aprobada. Todo el historial queda registrado.

### 1.1. Actores del sistema

| **Actor** | **Descripción** | **Nivel de acceso** |
|---|---|---|
| Administrador | Carga archivos Excel, gestiona CRUD de catálogos, inicia proceso de aprobación | Total |
| Revisor | Revisa diffs de mallas cargadas, aprueba o rechaza con comentarios | Revisión y aprobación |
| Sistema (automático) | Ejecuta validaciones, genera diffs, actualiza estados de carga | Interno |

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

| **Capa** | **Tecnología** | **Versión** | **Rol** |
|---|---|---|---|
| Base de datos | MySQL | 8.0+ | Almacenamiento principal |
| Backend | Laravel | 12.x | API REST, lógica de negocio, ORM |
| Autenticación | Laravel Sanctum | 4.x | Tokens de sesión para SPA. Autenticación OTP sin contraseña |
| Lectura Excel | Laravel Excel (Maatwebsite) | 3.x | Parseo de archivos .xlsx |
| Frontend | React | 19.2 | SPA — interfaz de usuario |
| Build tool | Vite | 6.x | Bundler y servidor de desarrollo |
| Routing frontend | React Router | 7.x | Navegación entre vistas |
| HTTP client | Axios | 1.x | Llamadas a la API REST |
| Servidor web | Apache | 2.4.62 | Producción (ya en el servidor) |
| PHP | PHP | 8.3.8 | Runtime del backend (ya en el servidor) |
| OS | FreeBSD | - | Sistema operativo del servidor |

> El frontend React se compila localmente con Vite y se despliega como archivos estáticos en el servidor Apache. Node.js solo es necesario en la máquina de desarrollo, no en el servidor de producción.

### 2.1. Estructura de directorios del proyecto

```
mallas-unal/
  backend/                        # Proyecto Laravel 12
    app/
      Http/
        Controllers/Api/          # Controladores de la API REST
        Resources/                # API Resources (transformadores JSON)
        Requests/                 # Form Requests (validación)
      Models/                     # Modelos Eloquent
      Services/                   # Lógica de negocio
      Jobs/                       # Procesamiento asincrónico de cargas
    database/
      migrations/                 # Migraciones de todas las tablas
      seeders/                    # Datos iniciales (sede, facultad, etc.)
    routes/
      api.php                     # Todas las rutas de la API
  frontend/                       # Proyecto React 19 + Vite
    src/
      components/                 # Componentes reutilizables
      pages/                      # Vistas por ruta
      api/                        # Funciones de llamada a la API
      hooks/                      # Custom hooks
      store/                      # Estado global (Context API)
```

---

## 3. Modelo de Base de Datos (MySQL 8)

Motor: InnoDB. Charset: utf8mb4. Collation: utf8mb4_unicode_ci. Todas las PKs son `INT UNSIGNED AUTO_INCREMENT`. Todas las FKs tienen `ON DELETE RESTRICT ON UPDATE CASCADE` salvo indicación contraria.

### Diagrama de relaciones clave (v5)

```
sede
 └── facultad (ID_Sede FK)
      └── programa (ID_Facultad FK)
           ├── normativa (ID_Programa FK)
           │    └── malla_curricular (ID_Normativa FK, ID_Programa FK)
           │         └── agrupacion_asignatura (ID_Malla FK)  ← v4
           │              ├── asignatura (ID_Asignatura FK)
           │              └── requisito (ID_Agrup_Asig FK)
           └── agrupacion (ID_Programa FK)  ← v4: antes era ID_Malla
                └── agrupacion_asignatura (ID_Agrupacion FK)

carga_malla
 ├── ID_Archivo_Asignaturas FK → archivo_excel  ← NUEVO v5
 ├── ID_Archivo_Electivas    FK → archivo_excel  ← NUEVO v5
 └── ID_Archivo_Malla        FK → archivo_excel  ← NUEVO v5
      (reemplaza el antiguo ID_Archivo único)

archivo_excel
 └── Tipo_Archivo VARCHAR(20)  ← NUEVO v5: asignaturas|electivas|malla
```

> **Principio clave (v4):** Las agrupaciones son estructuras estables del **programa**. Lo que varía entre versiones de malla es qué asignaturas se asignan a cada agrupación, registrado en `agrupacion_asignatura` con su `ID_Malla`.

> **Principio clave (v5):** La carga de una malla requiere exactamente tres archivos. `carga_malla` los referencia con tres FKs independientes (nullable hasta que se suban). El procesamiento solo se puede lanzar cuando los tres están presentes.

---

### 3.1. Tabla: `sede`

| **Columna** | **Tipo MySQL** | **NN** | **Default** | **Notas** |
|---|---|---|---|---|
| ID_Sede | INT UNSIGNED AUTO_INCREMENT | Sí | - | PK |
| Nombre_Sede | VARCHAR(100) | Sí | - | |
| Ciudad_Sede | VARCHAR(100) | Sí | - | |
| Direccion_Sede | VARCHAR(200) | No | NULL | |
| Conmutador_Sede | VARCHAR(30) | No | NULL | |
| Campus_Sede | VARCHAR(100) | No | NULL | |
| Url_Sede | VARCHAR(300) | No | NULL | |

---

### 3.2. Tabla: `facultad` ⚠️ MODIFICADA v4

> **CAMBIO v4:** Se agrega `Codigo_Facultad`. Campo identificado como clave de búsqueda y referencia institucional.

| **Columna** | **Tipo MySQL** | **NN** | **Default** | **Notas** |
|---|---|---|---|---|
| ID_Facultad | INT UNSIGNED AUTO_INCREMENT | Sí | - | PK |
| ID_Sede | INT UNSIGNED | Sí | - | FK → sede |
| Codigo_Facultad | VARCHAR(20) | Sí | - | **NUEVO v4.** UNIQUE. Código institucional de la facultad |
| Nombre_Facultad | VARCHAR(150) | Sí | - | |
| Conmutador_Facultad | VARCHAR(30) | No | NULL | |
| Extension_Facultad | VARCHAR(10) | No | NULL | |
| Campus_Facultad | VARCHAR(100) | No | NULL | |
| Url_Facultad | VARCHAR(300) | No | NULL | |

**Migración Laravel:**
```php
$table->string('Codigo_Facultad', 20)->unique()->after('ID_Sede');
```

---

### 3.3. Tabla: `programa`

| **Columna** | **Tipo MySQL** | **NN** | **Default** | **Notas** |
|---|---|---|---|---|
| ID_Programa | INT UNSIGNED AUTO_INCREMENT | Sí | - | PK |
| ID_Facultad | INT UNSIGNED | Sí | - | FK → facultad |
| Codigo_Programa | VARCHAR(20) | Sí | - | UNIQUE |
| Nombre_Programa | VARCHAR(200) | Sí | - | |
| Titulo_Otorgado | VARCHAR(200) | No | NULL | |
| Nivel_Formacion | VARCHAR(50) | No | NULL | pregrado\|especializacion\|maestria\|doctorado |
| Creditos_Totales | INT UNSIGNED | No | NULL | |
| Duracion_Semestres | INT UNSIGNED | No | NULL | Valor fijo del programa |
| Codigo_SNIES | VARCHAR(20) | No | NULL | |
| Url_Programa | VARCHAR(300) | No | NULL | |
| Campus_Programa | VARCHAR(100) | No | NULL | |
| Conmutador | VARCHAR(30) | No | NULL | |
| Extension | VARCHAR(10) | No | NULL | |
| Correo | VARCHAR(200) | No | NULL | |
| Area_Curricular | VARCHAR(100) | No | NULL | |
| Activo_Programa | TINYINT(1) | Sí | 1 | |

---

### 3.4. Tabla: `normativa`

| **Columna** | **Tipo MySQL** | **NN** | **Default** | **Notas** |
|---|---|---|---|---|
| ID_Normativa | INT UNSIGNED AUTO_INCREMENT | Sí | - | PK |
| ID_Programa | INT UNSIGNED | Sí | - | FK → programa |
| Tipo_Normativa | VARCHAR(50) | Sí | - | Acuerdo\|Resolución\|Decreto\|Circular |
| Numero_Normativa | VARCHAR(50) | Sí | - | |
| Anio_Normativa | INT | Sí | - | |
| Instancia | VARCHAR(150) | Sí | - | Entidad que expide el acto |
| Descripcion_Normativa | TEXT | No | NULL | |
| Url_Normativa | VARCHAR(500) | No | NULL | |
| Esta_Activo | TINYINT(1) | Sí | 1 | |

---

### 3.5. Tabla: `componente`

Catálogo transversal. Los componentes son categorías institucionales de la UNAL (ej: Fundamentación, Disciplinar).

| **Columna** | **Tipo MySQL** | **NN** | **Default** | **Notas** |
|---|---|---|---|---|
| ID_Componente | INT UNSIGNED AUTO_INCREMENT | Sí | - | PK |
| Nombre_Componente | VARCHAR(150) | Sí | - | UNIQUE |
| Descripcion_Componente | TEXT | No | NULL | |

---

### 3.6. Tabla: `asignatura`

Catálogo global compartido entre todos los programas. Una asignatura puede pertenecer a múltiples agrupaciones de múltiples programas.

| **Columna** | **Tipo MySQL** | **NN** | **Default** | **Notas** |
|---|---|---|---|---|
| ID_Asignatura | INT UNSIGNED AUTO_INCREMENT | Sí | - | PK |
| Codigo_Asignatura | VARCHAR(20) | Sí | - | UNIQUE. NULL es bloqueante en carga Excel |
| Nombre_Asignatura | VARCHAR(200) | Sí | - | |
| Creditos_Asignatura | INT UNSIGNED | Sí | - | |
| Horas_Presencial | INT UNSIGNED | No | NULL | |
| Horas_Estudiante | INT UNSIGNED | No | NULL | |
| Descripcion_Asignatura | TEXT | No | NULL | |

---

### 3.7. Tabla: `malla_curricular`

Representa una versión específica del plan de estudios de un programa.

> **Restricción especial:** Solo UNA malla por programa puede tener `Es_Vigente = 1` simultáneamente. Se implementa con columna generada virtual + UNIQUE INDEX (workaround MySQL por ausencia de partial indexes nativos).

| **Columna** | **Tipo MySQL** | **NN** | **Default** | **Notas** |
|---|---|---|---|---|
| ID_Malla | INT UNSIGNED AUTO_INCREMENT | Sí | - | PK |
| ID_Normativa | INT UNSIGNED | Sí | - | FK → normativa |
| ID_Programa | INT UNSIGNED | Sí | - | FK → programa |
| Version_Numero | INT UNSIGNED | Sí | - | Incremental por programa |
| Version_Etiqueta | VARCHAR(50) | No | NULL | Ej: Plan 2025 |
| Fecha_Vigencia | DATE | Sí | - | |
| Fecha_Fin_Vigencia | DATE | No | NULL | NULL si aún vigente |
| Estado | VARCHAR(20) | Sí | - | borrador\|en_revision\|activa\|archivada\|rechazada |
| Es_Vigente | TINYINT(1) | Sí | 0 | |
| Created_at | TIMESTAMP | Sí | CURRENT_TIMESTAMP | |
| Vigente_Prog_ID | INT UNSIGNED GENERATED VIRTUAL | No | - | UNIQUE. `IF(Es_Vigente=1, ID_Programa, NULL)` |

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

### 3.8. Tabla: `agrupacion` ⚠️ MODIFICADA v4

> **CAMBIO CRÍTICO v4:** `ID_Malla` → `ID_Programa`. Las agrupaciones son estructuras estables del programa, no de una versión de malla. Esto evita duplicar agrupaciones en cada nueva versión y permite que el diff entre versiones sea a nivel de asignaciones (`agrupacion_asignatura`), no de agrupaciones.
>
> **CAMBIO v4:** Se agrega `Tipo_Agrupacion` con los valores definidos por la UNAL.

| **Columna** | **Tipo MySQL** | **NN** | **Default** | **Notas** |
|---|---|---|---|---|
| ID_Agrupacion | INT UNSIGNED AUTO_INCREMENT | Sí | - | PK |
| ID_Programa | INT UNSIGNED | Sí | - | **CAMBIA v4.** FK → programa (antes era FK → malla_curricular) |
| ID_Componente | INT UNSIGNED | Sí | - | FK → componente |
| Tipo_Agrupacion | VARCHAR(30) | Sí | - | **NUEVO v4.** fundamentacion\|disciplinar_profesional\|libre_eleccion\|nivelatorio |
| Nombre_Agrupacion | VARCHAR(150) | Sí | - | |
| Creditos_Requeridos | INT UNSIGNED | No | NULL | Créditos mínimos exigidos en esta agrupación |
| Creditos_Maximos | INT UNSIGNED | No | NULL | |
| Es_Obligatoria | TINYINT(1) | Sí | 0 | |

**Restricción UNIQUE:**
```sql
UNIQUE KEY uq_agrupacion_programa (ID_Programa, ID_Componente, Nombre_Agrupacion)
```
Garantiza que un programa no tenga dos agrupaciones con el mismo nombre dentro del mismo componente.

**Migración Laravel:**
```php
$table->unsignedInteger('ID_Programa');          // reemplaza ID_Malla
$table->string('Tipo_Agrupacion', 30);           // nuevo campo
$table->foreign('ID_Programa')->references('ID_Programa')->on('programa');
$table->unique(['ID_Programa', 'ID_Componente', 'Nombre_Agrupacion'], 'uq_agrupacion_programa');
```

---

### 3.9. Tabla: `agrupacion_asignatura` ⚠️ MODIFICADA v4

> **CAMBIO CRÍTICO v4:** Se agrega `ID_Malla`. Esta tabla es ahora el punto de unión entre una versión de malla y las agrupaciones del programa. Permite saber exactamente qué asignaturas tenía cada agrupación en cada versión sin duplicar la definición de la agrupación.
>
> **Lógica resultante:** Para saber las asignaturas de la malla vigente de un programa, se consulta `agrupacion_asignatura` filtrando por el `ID_Malla` de la malla vigente.

| **Columna** | **Tipo MySQL** | **NN** | **Default** | **Notas** |
|---|---|---|---|---|
| ID_Agrup_Asig | INT UNSIGNED AUTO_INCREMENT | Sí | - | PK |
| ID_Agrupacion | INT UNSIGNED | Sí | - | FK → agrupacion |
| ID_Malla | INT UNSIGNED | Sí | - | **NUEVO v4.** FK → malla_curricular |
| ID_Asignatura | INT UNSIGNED | No | NULL | FK → asignatura. NULL si libre_eleccion |
| Tipo_Asignatura | VARCHAR(30) | Sí | - | obligatoria\|optativa\|libre_eleccion |
| Semestre_Sugerido | INT UNSIGNED | No | NULL | 1-20 |

**Restricción UNIQUE:**
```sql
UNIQUE KEY uq_agrup_asig_malla (ID_Agrupacion, ID_Asignatura, ID_Malla)
```
Garantiza que una asignatura no aparezca dos veces en la misma agrupación dentro de la misma versión de malla.

**Migración Laravel:**
```php
$table->unsignedInteger('ID_Malla');             // nuevo campo
$table->foreign('ID_Malla')->references('ID_Malla')->on('malla_curricular');
$table->unique(['ID_Agrupacion', 'ID_Asignatura', 'ID_Malla'], 'uq_agrup_asig_malla');
```

> **Nota para el agente:** La consulta de la malla vigente de un programa cambia de:
> `malla → agrupacion → agrupacion_asignatura`
> a:
> `programa → agrupacion` + `malla_vigente → agrupacion_asignatura (filtrado por ID_Malla)`

---

### 3.10. Tabla: `requisito`

| **Columna** | **Tipo MySQL** | **NN** | **Default** | **Notas** |
|---|---|---|---|---|
| ID_Requisito | INT UNSIGNED AUTO_INCREMENT | Sí | - | PK |
| ID_Agrup_Asig | INT UNSIGNED | Sí | - | FK → agrupacion_asignatura (quien exige) |
| ID_Agrup_Asig_Requerida | INT UNSIGNED | No | NULL | FK → agrupacion_asignatura (requerida). NULL si creditos_minimos |
| Tipo_Requisito | VARCHAR(30) | Sí | - | prerequisito\|correquisito\|creditos_minimos |
| Creditos_Minimos | INT UNSIGNED | No | NULL | Solo si tipo = creditos_minimos |
| Descripcion_Requisito | TEXT | No | NULL | Texto libre para requisitos no estructurados (ej: Trabajo de Grado) |

---

### 3.11. Tabla: `usuario`

| **Columna** | **Tipo MySQL** | **NN** | **Default** | **Notas** |
|---|---|---|---|---|
| ID_Usuario | INT UNSIGNED AUTO_INCREMENT | Sí | - | PK |
| Nombre_Usuario | VARCHAR(200) | Sí | - | |
| Email_Usuario | VARCHAR(200) | Sí | - | UNIQUE |
| Otp_Code | VARCHAR(255) | No | NULL | Hash bcrypt del OTP. Se elimina tras uso exitoso |
| Otp_Expires_At | TIMESTAMP | No | NULL | Expiración del OTP. NULL si no hay OTP activo |
| Activo_Usuario | TINYINT(1) | Sí | 1 | |
| Creacion_Usuario | TIMESTAMP | Sí | CURRENT_TIMESTAMP | |

---

### 3.12. Tabla: `archivo_excel` ⚠️ MODIFICADA v5

> **CAMBIO v5:** Se agrega `Tipo_Archivo` para distinguir el rol de cada archivo dentro de una carga. Los tres archivos de una misma carga son registros independientes en esta tabla, referenciados por las tres FKs de `carga_malla`.

| **Columna** | **Tipo MySQL** | **NN** | **Default** | **Notas** |
|---|---|---|---|---|
| ID_Archivo | INT UNSIGNED AUTO_INCREMENT | Sí | - | PK |
| ID_Usuario | INT UNSIGNED | Sí | - | FK → usuario |
| Tipo_Archivo | VARCHAR(20) | Sí | - | **NUEVO v5.** asignaturas\|electivas\|malla |
| Nombre_Archivo | VARCHAR(300) | Sí | - | Nombre original del archivo |
| Contenido_Archivo | LONGBLOB | Sí | - | Binario del .xlsx. Requiere `max_allowed_packet >= 64M` |
| Tamanio_Bytes | BIGINT UNSIGNED | Sí | - | |
| Hash_Sha256 | CHAR(64) | Sí | - | Para detectar duplicados exactos |
| Estado_Procesamiento | VARCHAR(30) | Sí | - | pendiente\|procesando\|exitoso\|fallido |
| Fecha_Subido | TIMESTAMP | Sí | CURRENT_TIMESTAMP | |

**Migración Laravel:**
```php
$table->string('Tipo_Archivo', 20)->after('ID_Usuario');
// Valores permitidos: asignaturas | electivas | malla
```

---

### 3.13. Tabla: `carga_malla` ⚠️ MODIFICADA v5

> **CAMBIO CRÍTICO v5:** Se reemplaza el campo `ID_Archivo` único por tres FKs independientes: `ID_Archivo_Asignaturas`, `ID_Archivo_Electivas`, `ID_Archivo_Malla`. Cada FK es nullable hasta que el usuario suba el archivo correspondiente.
>
> **CAMBIO v5:** Se agregan los campos `ID_Programa` e `ID_Normativa` (antes solo en `malla_curricular`), necesarios desde el momento de creación de la carga, antes de subir cualquier archivo.
>
> **CAMBIO v5:** Se añaden dos nuevos estados al ciclo de vida: `esperando_archivos` (estado inicial al crear la carga) y `listo_para_procesar` (cuando los tres archivos están subidos, antes de lanzar el Job).

| **Columna** | **Tipo MySQL** | **NN** | **Default** | **Notas** |
|---|---|---|---|---|
| ID_Carga | INT UNSIGNED AUTO_INCREMENT | Sí | - | PK |
| ID_Archivo_Asignaturas | INT UNSIGNED | No | NULL | **NUEVO v5.** FK → archivo_excel. NULL hasta subir ese archivo |
| ID_Archivo_Electivas | INT UNSIGNED | No | NULL | **NUEVO v5.** FK → archivo_excel. NULL hasta subir ese archivo |
| ID_Archivo_Malla | INT UNSIGNED | No | NULL | **NUEVO v5.** FK → archivo_excel. NULL hasta subir ese archivo |
| ID_Malla | INT UNSIGNED | No | NULL | FK → malla_curricular. NULL hasta que el Job la crea |
| ID_Malla_Base | INT UNSIGNED | No | NULL | FK → malla_curricular. Malla anterior base del diff |
| ID_Usuario | INT UNSIGNED | Sí | - | FK → usuario (quien inició la carga) |
| ID_Programa | INT UNSIGNED | Sí | - | **NUEVO v5.** FK → programa. Necesario para validar duplicados antes de subir archivos |
| ID_Normativa | INT UNSIGNED | Sí | - | **NUEVO v5.** FK → normativa |
| Estado_Carga | VARCHAR(30) | Sí | - | esperando_archivos\|listo_para_procesar\|iniciado\|validando\|con_errores\|borrador\|pendiente_aprobacion\|aprobado\|rechazado |
| Comentario_Carga | TEXT | No | NULL | Justificación del cambio |
| Comentario_Revisor | TEXT | No | NULL | Observaciones del revisor |
| ID_Usuario_Revisor | INT UNSIGNED | No | NULL | FK → usuario (quien aprobó/rechazó) |
| Fecha_Revision | TIMESTAMP | No | NULL | |
| Creacion_Carga | TIMESTAMP | Sí | CURRENT_TIMESTAMP | |
| Finalizacion_Carga | TIMESTAMP | No | NULL | |

**Migración Laravel:**
```php
// Reemplaza: $table->unsignedInteger('ID_Archivo');
$table->unsignedInteger('ID_Archivo_Asignaturas')->nullable();
$table->unsignedInteger('ID_Archivo_Electivas')->nullable();
$table->unsignedInteger('ID_Archivo_Malla')->nullable();
$table->unsignedInteger('ID_Programa');   // nuevo: necesario desde la creación de la carga
$table->unsignedInteger('ID_Normativa');  // nuevo: necesario desde la creación de la carga
$table->foreign('ID_Archivo_Asignaturas')->references('ID_Archivo')->on('archivo_excel')->nullOnDelete();
$table->foreign('ID_Archivo_Electivas')->references('ID_Archivo')->on('archivo_excel')->nullOnDelete();
$table->foreign('ID_Archivo_Malla')->references('ID_Archivo')->on('archivo_excel')->nullOnDelete();
$table->foreign('ID_Programa')->references('ID_Programa')->on('programa');
$table->foreign('ID_Normativa')->references('ID_Normativa')->on('normativa');
```

---

### 3.14. Tabla: `error_carga`

| **Columna** | **Tipo MySQL** | **NN** | **Default** | **Notas** |
|---|---|---|---|---|
| ID_Error | INT UNSIGNED AUTO_INCREMENT | Sí | - | PK |
| ID_Carga | INT UNSIGNED | Sí | - | FK → carga_malla |
| Fila_Error | INT UNSIGNED | No | NULL | Fila del Excel |
| Columna_Error | VARCHAR(50) | No | NULL | Nombre de la columna |
| Mensaje_Error | TEXT | Sí | - | |
| Valor_Recibido | VARCHAR(500) | No | NULL | |
| Severidad_Error | VARCHAR(20) | Sí | - | error\|advertencia |

---

### 3.15. Tabla: `diff_malla`

| **Columna** | **Tipo MySQL** | **NN** | **Default** | **Notas** |
|---|---|---|---|---|
| ID_Diff | INT UNSIGNED AUTO_INCREMENT | Sí | - | PK |
| ID_Carga | INT UNSIGNED | Sí | - | FK → carga_malla |
| Entidad_Afectada | VARCHAR(50) | Sí | - | agrupacion_asignatura\|requisito\|agrupacion\|... |
| Tipo_Cambio | VARCHAR(20) | Sí | - | INSERT\|UPDATE\|DELETE |
| ID_Registro | INT UNSIGNED | No | NULL | ID del registro afectado |
| Valor_Anterior | JSON | No | NULL | Estado completo antes del cambio |
| Valor_Nuevo | JSON | No | NULL | Estado completo después del cambio |
| Creado_Diff | TIMESTAMP | Sí | CURRENT_TIMESTAMP | |

---

### 3.16. Tabla: `log_actividad`

| **Columna** | **Tipo MySQL** | **NN** | **Default** | **Notas** |
|---|---|---|---|---|
| ID_Log | INT UNSIGNED AUTO_INCREMENT | Sí | - | PK |
| ID_Usuario | INT UNSIGNED | No | NULL | FK → usuario. NULL si acción del sistema |
| Accion_Log | VARCHAR(100) | Sí | - | UPLOAD_EXCEL\|APPROVE_MALLA\|LOGIN\|... |
| Entidad_Log | VARCHAR(50) | No | NULL | Tabla afectada |
| Entidad_ID_Log | BIGINT UNSIGNED | No | NULL | ID del registro afectado |
| Detalle_Log | JSON | No | NULL | Contexto adicional |
| IP_Origen_Log | VARCHAR(45) | No | NULL | IPv4 o IPv6 |
| Creacion_Log | TIMESTAMP | Sí | CURRENT_TIMESTAMP | |

---

### 3.17. Resumen de cambios al modelo de BD (acumulado v4 + v5)

| **#** | **Versión** | **Severidad** | **Tabla** | **Cambio** |
|---|---|---|---|---|
| 1 | v4 | 🔴 Crítico | `agrupacion` | `ID_Malla` reemplazado por `ID_Programa`. Las agrupaciones pertenecen al programa, no a la versión de malla |
| 2 | v4 | 🔴 Crítico | `agrupacion_asignatura` | Se agrega `ID_Malla INT UNSIGNED FK`. Es el vínculo entre una versión de malla y las asignaciones |
| 3 | v4 | 🟡 Alto | `facultad` | Se agrega `Codigo_Facultad VARCHAR(20) UNIQUE` |
| 4 | v4 | 🟡 Alto | `agrupacion` | Se agrega `Tipo_Agrupacion VARCHAR(30)` |
| 5 | v4 | 🟡 Medio | `agrupacion` | Nueva restricción `UNIQUE (ID_Programa, ID_Componente, Nombre_Agrupacion)` |
| 6 | v4 | 🟠 Medio | `agrupacion_asignatura` | Nueva restricción `UNIQUE (ID_Agrupacion, ID_Asignatura, ID_Malla)` |
| 7 | v5 | 🔴 Crítico | `carga_malla` | `ID_Archivo` único reemplazado por `ID_Archivo_Asignaturas`, `ID_Archivo_Electivas`, `ID_Archivo_Malla` (tres FKs nullable) |
| 8 | v5 | 🔴 Crítico | `carga_malla` | Nuevos campos `ID_Programa` e `ID_Normativa` (se capturan al crear la carga, antes de subir archivos) |
| 9 | v5 | 🟡 Alto | `carga_malla` | Nuevos estados: `esperando_archivos` y `listo_para_procesar` en `Estado_Carga` |
| 10 | v5 | 🟡 Alto | `archivo_excel` | Se agrega `Tipo_Archivo VARCHAR(20)`: `asignaturas\|electivas\|malla` |

---

## 4. Flujo del Modelo de Datos

### 4.1. Configuración inicial (una sola vez por programa)

```
1. CRUD: Sede → Facultad (con Codigo_Facultad) → Programa → Normativa
2. CRUD: Componente (catálogo global: Fundamentación, Disciplinar, etc.)
3. CRUD: Agrupacion por Programa
   - Se definen las agrupaciones estables: cuántas hay, qué tipo, cuántos créditos exige cada una
   - Ejemplo Ingeniería Civil:
       • Fundamentación Matemática y Ciencias Básicas (fundamentacion, 42 créditos)
       • Disciplinar o Profesional (disciplinar_profesional, 96 créditos)
       • Libre Elección (libre_eleccion, 32 créditos)
```

### 4.2. Por cada nueva versión de malla

```
1. Crear carga (POST /api/cargas) → carga en estado esperando_archivos
2. Subir tres archivos (POST /api/cargas/{id}/archivo × 3) → al terminar, estado listo_para_procesar
3. Lanzar Job (POST /api/cargas/{id}/procesar) → estado iniciado → validando
4. Job procesa en orden: asignaturas → electivas → malla
5. Se crea malla_curricular (estado: borrador), con agrupacion_asignatura vinculadas por ID_Malla
6. Se generan diff_malla comparando agrupacion_asignatura de la malla nueva vs malla base
7. Flujo de aprobación → si se aprueba, malla pasa a activa y Es_Vigente = 1
```

### 4.3. Flujo de carga en dos fases (v5)

La carga de una nueva malla se divide en una fase de **subida progresiva** y una fase de **procesamiento**. El usuario puede subir los tres archivos en cualquier orden y momento. El Job no se lanza hasta que el usuario lo indique explícitamente.

#### Estados de `carga_malla` en el flujo de dos fases

```
esperando_archivos   ← estado inicial al crear la carga (POST /api/cargas)
       │
       │  (se sube cada archivo con POST /api/cargas/{id}/archivo)
       │
listo_para_procesar  ← se alcanza automáticamente cuando los 3 archivos están presentes
       │
       │  (el usuario presiona "Procesar" → POST /api/cargas/{id}/procesar)
       │
    iniciado         ← Job encolado
       │
   validando         ← Job en ejecución
       │
  ┌────┴────┐
con_errores        borrador     ← Job terminó
                      │
              pendiente_aprobacion
                      │
              ┌───────┴───────┐
           aprobado        rechazado
```

#### Comportamiento al subir el mismo tipo de archivo dos veces

Si el usuario sube un archivo de tipo `asignaturas` cuando ya existe uno registrado para esa carga, el sistema **reemplaza automáticamente** el archivo anterior:

1. Se inserta el nuevo registro en `archivo_excel`.
2. Se actualiza la FK correspondiente en `carga_malla` apuntando al nuevo `ID_Archivo`.
3. El registro anterior en `archivo_excel` **no se elimina físicamente**; queda huérfano (sin FK que lo apunte). Esto preserva el log de subidas.
4. Se responde con el nuevo `archivo_id` y el estado actual de la carga.

### 4.4. Orden de procesamiento del Job (v5)

El `ProcessExcelUploadJob` recibe tres archivos y los procesa en orden estricto:

```
Paso 1 — Procesar archivo_asignaturas
  └── Lee hoja de asignaturas
  └── Inserta o actualiza registros en tabla `asignatura`
  └── Si hay errores bloqueantes → registra en error_carga, continúa con advertencia

Paso 2 — Procesar archivo_electivas
  └── Lee hoja ELECTIVAS
  └── Inserta o actualiza registros en tabla `asignatura` (mismo catálogo)
  └── Si hay errores bloqueantes → registra en error_carga, continúa con advertencia

Paso 3 — Procesar archivo_malla
  └── Depende de que Pasos 1 y 2 hayan completado sin errores bloqueantes
  └── Si Pasos 1 o 2 tuvieron errores que impiden la creación de asignaturas:
        → carga pasa a estado con_errores, no se continúa
  └── Si Pasos 1 y 2 OK:
        → Crea malla_curricular (estado: borrador)
        → Por cada fila: busca agrupacion del programa, crea agrupacion_asignatura con ID_Malla
        → Genera diff_malla vs malla base
        → carga pasa a estado borrador
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

> *Convención de IDs: `RF-XX-YY` donde XX es el módulo y YY es el número del requerimiento. Prioridades: Alta (debe estar en Fase 1-3), Media (Fase 4-5).*

### 5.1. Módulo de Autenticación (RF-AU)

| **ID** | **Requerimiento** | **Prioridad** |
|---|---|---|
| RF-AU-01 | El sistema debe permitir el inicio de sesión en dos pasos mediante OTP: (1) el usuario ingresa su correo electrónico, el sistema verifica que exista y esté activo, y envía un código de 6 dígitos al correo con validez de 10 minutos; (2) el usuario ingresa el código y, si es válido, Laravel Sanctum genera y devuelve un token de acceso que el frontend almacena en memoria (no en localStorage). El código se guarda hasheado con bcrypt y se elimina tras el primer uso exitoso. | Alta |
| RF-AU-02 | El sistema debe cerrar la sesión del usuario invalidando el token en el servidor mediante el endpoint `POST /api/auth/logout`. | Alta |
| RF-AU-03 | Todas las rutas de la API excepto `POST /api/auth/request-otp` y `POST /api/auth/verify-otp` deben estar protegidas por el middleware `auth:sanctum`. | Alta |
| RF-AU-04 | El OTP generado tiene una vigencia máxima de 10 minutos. Transcurrido ese tiempo, el código expira y el usuario debe solicitar uno nuevo. | Media |

### 5.2. Módulo de Catálogos CRUD (RF-CA)

Los catálogos son las entidades base que se gestionan antes de cargar mallas. Cada uno tiene CRUD completo.

| **ID** | **Requerimiento** | **Prioridad** |
|---|---|---|
| RF-CA-01 | CRUD completo de Sede: crear, listar, editar y desactivar. Los campos obligatorios son `Nombre_Sede` y `Ciudad_Sede`. | Alta |
| RF-CA-02 | CRUD completo de Facultad: crear, listar, editar y desactivar. Campos obligatorios: `Codigo_Facultad` (único), `Nombre_Facultad`, `ID_Sede`. | Alta |
| RF-CA-03 | CRUD completo de Programa: crear, listar, editar y activar/desactivar. Debe asociarse a una Facultad existente. `Codigo_Programa` debe ser único. | Alta |
| RF-CA-04 | CRUD completo de Normativa: crear, listar, editar y activar/desactivar. Debe asociarse a un Programa existente. | Alta |
| RF-CA-05 | CRUD completo de Componente: crear, listar, editar. `Nombre_Componente` debe ser único. | Alta |
| RF-CA-06 | CRUD completo de Asignatura: crear, listar, editar. `Codigo_Asignatura` debe ser único. | Alta |
| RF-CA-07 | CRUD completo de Usuario: crear, listar, editar y activar/desactivar. Solo los usuarios activos pueden iniciar sesión. | Alta |
| RF-CA-08 | CRUD completo de Agrupacion por Programa. Al crear: seleccionar Programa, Componente, `Tipo_Agrupacion`, nombre y créditos exigidos. La combinación Programa + Componente + Nombre debe ser única. | Alta |
| RF-CA-09 | Los listados de catálogos deben soportar búsqueda por nombre y paginación de 20 registros por página. | Media |

### 5.3. Módulo de Carga Masiva (RF-CM)

| **ID** | **Requerimiento** | **Prioridad** |
|---|---|---|
| RF-CM-01 | El sistema debe permitir carga masiva de Asignaturas desde el archivo de asignaturas. Campos: Código, Nombre, Créditos, Horas Presencial, Horas Estudiante. Si el código ya existe, se reutiliza la asignatura existente. | Alta |
| RF-CM-02 | El sistema debe permitir carga masiva de asignaturas de Libre Elección desde el archivo de electivas. Campos: Código, Nombre, Créditos. Flujo de UI separado del resto. | Alta |
| RF-CM-03 | El sistema debe aceptar la subida de tres archivos `.xlsx` como parte de una misma carga: uno de asignaturas, uno de electivas y uno de malla. Los archivos se suben de forma progresiva mediante `POST /api/cargas/{id}/archivo`. Cada archivo se almacena en LONGBLOB en `archivo_excel` con su hash SHA-256 y su `Tipo_Archivo`. | Alta |
| RF-CM-04 | Si el usuario sube un archivo de un tipo que ya tiene registrado en la carga actual, el sistema debe reemplazar automáticamente el anterior, actualizando la FK correspondiente en `carga_malla`. El archivo anterior no se elimina físicamente. | Alta |
| RF-CM-05 | El estado de `carga_malla` debe cambiar automáticamente a `listo_para_procesar` en el momento en que los tres archivos estén presentes (las tres FKs son no-null). Este cambio de estado no requiere acción explícita del usuario. | Alta |
| RF-CM-06 | El procesamiento del Job solo puede iniciarse si el estado de la carga es `listo_para_procesar`. El endpoint `POST /api/cargas/{id}/procesar` debe rechazar la solicitud con error 409 si el estado no es el correcto. | Alta |

### 5.4. Módulo de Procesamiento de Excel (RF-CE)

| **ID** | **Requerimiento** | **Prioridad** |
|---|---|---|
| RF-CE-01 | Antes de procesar, verificar si ya existe un archivo con el mismo `Hash_Sha256` para el mismo programa. Rechazarlo con mensaje claro si es duplicado. La verificación se hace individualmente por cada uno de los tres archivos al momento de la subida. | Alta |
| RF-CE-02 | El sistema debe leer el archivo de asignaturas y el archivo de electivas antes de procesar el archivo de malla. Las demás hojas se ignoran. | Alta |
| RF-CE-03 | El parser debe limpiar todos los valores de texto antes de procesarlos: `trim()`, eliminar saltos de línea internos y normalizar espacios múltiples. | Alta |
| RF-CE-04 | Si una fila del archivo de malla no tiene `Codigo_Asignatura`, se debe registrar un error de severidad `'error'` en `error_carga` y esa fila no se procesa. Esto no detiene el procesamiento de las demás filas. | Alta |
| RF-CE-05 | Si el `Codigo_Asignatura` ya existe en la BD pero el nombre en el Excel difiere, se debe registrar una advertencia en `error_carga` y usar la asignatura existente sin modificarla. | Alta |
| RF-CE-06 | El orden de inserción por fila es: (1) asignatura, (2) agrupación (si no existe para ese programa con ese componente y nombre), (3) agrupacion_asignatura con `ID_Malla`, (4) requisito. | Alta |
| RF-CE-07 | Antes de procesar filas del archivo de malla, el sistema crea `malla_curricular` (estado: borrador). Si el procesamiento falla, la malla queda en estado borrador y `carga_malla` en `con_errores`. | Alta |
| RF-CE-08 | El sistema debe soportar la selección de una malla base para calcular el diff. Si no se selecciona, se asume que es la primera versión. | Media |
| RF-CE-09 | El procesamiento de la carga debe ejecutarse en un Job de Laravel (cola) para no bloquear la respuesta HTTP. El frontend consulta el estado via polling al endpoint `GET /api/cargas/{id}/estado`. | Media |
| RF-CE-10 | El parser debe mapear el campo "Obligatoria" del Excel (valores SI/NO) al enum de la BD: SI → obligatoria, NO → optativa. Las asignaturas de tipo `libre_eleccion` provienen exclusivamente del archivo de electivas. | Alta |
| RF-CE-11 | El parser debe detectar requisitos expresados como texto libre. Cuando el valor no sea `prerequisito`, `correquisito` ni un entero, se deriva al campo `Descripcion_Requisito` de la tabla `requisito` sin generar error. `ID_Agrup_Asig_Requerida` y `Creditos_Minimos` quedan en NULL. | Alta |
| RF-CE-12 | El Job debe procesar los archivos en orden estricto: (1) asignaturas, (2) electivas, (3) malla. Si el procesamiento de los archivos 1 o 2 produce errores bloqueantes que impiden la creación de asignaturas, el paso 3 no se ejecuta y la carga pasa a `con_errores`. | Alta |

### 5.5. Módulo de Flujo de Aprobación (RF-AP)

| **ID** | **Requerimiento** | **Prioridad** |
|---|---|---|
| RF-AP-01 | El flujo de estados de `carga_malla` es estrictamente: `esperando_archivos → listo_para_procesar → iniciado → validando → borrador → pendiente_aprobacion → aprobado\|rechazado`. El estado `con_errores` puede aparecer desde `validando`. | Alta |
| RF-AP-02 | Solo el usuario que cargó la malla puede enviarla a revisión (cambiar a `pendiente_aprobacion`) mediante el endpoint `PATCH /api/cargas/{id}/enviar-revision`. | Alta |
| RF-AP-03 | Solo un usuario diferente al que cargó puede aprobar o rechazar. El endpoint es `PATCH /api/cargas/{id}/revisar` con body `{accion: 'aprobar'\|'rechazar', comentario: '...'}`. | Alta |
| RF-AP-04 | Al aprobar una malla: (1) `malla_curricular` pasa a estado `activa`, (2) `Es_Vigente` se pone en 1, (3) la malla anterior del mismo programa pasa a `archivada` con `Es_Vigente = 0`, (4) se registra `Fecha_Fin_Vigencia` en la malla anterior. Todo en una transacción atómica. | Alta |
| RF-AP-05 | Al rechazar: `carga_malla` pasa a `rechazado`, `malla_curricular` pasa a `rechazada`, se guarda `Comentario_Revisor`. | Alta |
| RF-AP-06 | El sistema debe mostrar el diff completo de cambios en `agrupacion_asignatura` entre la malla nueva y la malla base, agrupado por entidad con etiquetas INSERT / UPDATE / DELETE. | Alta |

### 5.6. Módulo de Visualización de Mallas (RF-VI)

| **ID** | **Requerimiento** | **Prioridad** |
|---|---|---|
| RF-VI-01 | El sistema debe mostrar la malla vigente de cada programa organizada por `Tipo_Agrupacion` → `Nombre_Agrupacion` → asignaturas, con créditos, semestre sugerido y tipo. | Alta |
| RF-VI-02 | El sistema debe mostrar los prerequisitos y correquisitos de cada asignatura dentro de la malla. | Alta |
| RF-VI-03 | El sistema debe permitir navegar el historial de versiones de una malla, seleccionar dos versiones y ver el diff entre ellas. | Media |
| RF-VI-04 | El sistema debe mostrar el total de créditos por agrupación, por tipo de agrupación y el total de la malla. Los créditos se cuentan por `Codigo_Asignatura` único (una asignatura en varias agrupaciones cuenta una sola vez para el total). | Media |

### 5.7. Módulo de Auditoría (RF-AU2)

| **ID** | **Requerimiento** | **Prioridad** |
|---|---|---|
| RF-AU2-01 | Toda acción de usuario (login, logout, CRUD, carga, aprobación) debe quedar registrada en `log_actividad` con el ID del usuario, la acción, la entidad afectada y la IP de origen. | Alta |
| RF-AU2-02 | El log de actividad debe ser consultable por rango de fechas, por usuario y por tipo de acción, con paginación. | Media |
| RF-AU2-03 | Los registros de `log_actividad` son de solo lectura: ningún usuario puede modificarlos ni eliminarlos. | Alta |

---

## 6. Requerimientos No Funcionales

| **ID** | **Categoría** | **Requerimiento** | **Criterio de aceptación** |
|---|---|---|---|
| RNF-01 | Seguridad | Los códigos OTP se almacenan con hash bcrypt (cost factor >= 12) y se eliminan de la base de datos inmediatamente después del primer uso exitoso. Nunca se almacenan en texto plano. | Verificable en la columna `Otp_Code` de la tabla usuario |
| RNF-02 | Seguridad | La API debe implementar rate limiting: máximo 60 requests por minuto por IP en rutas generales y 10 intentos por minuto en `/api/auth/request-otp` y `/api/auth/verify-otp`. | Configurable en Laravel con throttle middleware |
| RNF-03 | Seguridad | Todos los inputs recibidos por la API deben ser validados con Form Requests de Laravel antes de ser procesados. Nunca confiar en datos del cliente. | Revisión de código: toda ruta tiene su FormRequest |
| RNF-04 | Seguridad | La API debe incluir headers de seguridad: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options. | Verificable con herramientas como securityheaders.com |
| RNF-05 | Rendimiento | Las respuestas de la API para listados de catálogos deben tardar menos de 500ms con hasta 1000 registros. | Medible con Laravel Telescope en desarrollo |
| RNF-06 | Rendimiento | El procesamiento de un archivo Excel de hasta 500 filas debe completarse en menos de 30 segundos en el Job asincrónico. | Medible en producción con jobs de Laravel |
| RNF-07 | Confiabilidad | Las operaciones críticas (aprobación de malla, activación de vigencia) deben ejecutarse dentro de transacciones de base de datos con `DB::transaction()`. | Revisión de código en el servicio de aprobación |
| RNF-08 | Confiabilidad | Si el Job de procesamiento de Excel falla, debe reintentarse automáticamente hasta 3 veces con backoff exponencial antes de marcarse como fallido. | Configurable en el Job con `$tries` y `$backoff` |
| RNF-09 | Mantenibilidad | La lógica de negocio (parseo Excel, cálculo de diffs, activación de mallas) debe vivir en clases Service, no en Controllers. | Revisión de estructura de directorios |
| RNF-10 | Mantenibilidad | El código debe seguir PSR-12 en PHP y el estándar de ESLint recomendado en React. | Verificable con PHP CS Fixer y ESLint en el pipeline |
| RNF-11 | Usabilidad | El frontend debe ser responsivo y funcionar correctamente en pantallas desde 1024px de ancho (mínimo escritorio). | Prueba manual en Chrome y Firefox |
| RNF-12 | Compatibilidad | La API debe responder siempre en formato JSON con la estructura `{data, message, errors}` estandarizada. | Revisión de todos los API Resources |
| RNF-13 | Charset | MySQL debe configurarse con `utf8mb4` y collation `utf8mb4_unicode_ci` para soportar tildes y eñes. | Verificable en la configuración del servidor |

---

## 7. Reglas de Negocio Críticas

> *Estas reglas deben implementarse como validaciones en el backend. El frontend puede mostrarlas pero nunca es la única línea de defensa.*

| **ID** | **Regla** | **Donde se implementa** |
|---|---|---|
| RN-01 | Solo puede existir UNA malla con `Es_Vigente = 1` por programa en cualquier momento. Se garantiza a nivel de BD con el UNIQUE index sobre la columna generada. | MySQL UNIQUE + Service de aprobación |
| RN-02 | Una asignatura sin `Codigo_Asignatura` en el Excel es un error bloqueante para esa fila. No se puede crear una asignatura sin código. | ExcelParserService |
| RN-03 | Al aprobar una malla, la malla anterior vigente del mismo programa se archiva automáticamente en la misma transacción. | MallaAprobacionService con DB::transaction() |
| RN-04 | El mismo usuario que cargó la malla NO puede ser el revisor. El sistema debe rechazar la solicitud si `ID_Usuario == ID_Usuario_Revisor`. | Validación en el FormRequest de revisión |
| RN-05 | Los cambios directos por CRUD (sin carga Excel) sobre `agrupacion`, `agrupacion_asignatura` o `requisito` deben registrarse en `diff_malla` y `log_actividad`. | Observer de Eloquent o Service layer |
| RN-06 | Una malla en estado `activa` no puede ser editada directamente. Para modificarla se debe iniciar una nueva carga. | Validación en todos los endpoints que afecten mallas activas |
| RN-07 | Si el hash SHA-256 de un archivo Excel coincide con uno ya cargado para el mismo programa, se rechaza la subida de ese archivo con mensaje descriptivo. La verificación se realiza por cada archivo al momento de la subida. | ExcelUploadService |
| RN-08 | Los registros de sede, facultad, programa, normativa, componente y asignatura nunca se eliminan físicamente. Solo se desactivan (soft delete lógico). | Validación en los Controllers de CRUD |
| RN-09 | Una agrupación solo puede existir una vez por programa, componente y nombre. Garantizado por UNIQUE KEY en `agrupacion`. | MySQL UNIQUE + validación en Service |
| RN-10 | Una asignatura no puede aparecer dos veces en la misma agrupación dentro de la misma versión de malla. Garantizado por UNIQUE KEY en `agrupacion_asignatura`. | MySQL UNIQUE + validación en ExcelParserService |
| RN-11 | El endpoint `POST /api/cargas/{id}/procesar` solo acepta cargas en estado `listo_para_procesar`. Cualquier otro estado devuelve 409 Conflict. | Validación en CargaController |
| RN-12 | Si el usuario sube un archivo de un tipo ya registrado en la carga, el sistema reemplaza automáticamente sin solicitar confirmación. El archivo anterior queda huérfano en `archivo_excel` (no se elimina físicamente). | ExcelUploadService |
| RN-13 | El Job procesa los archivos en orden estricto: asignaturas → electivas → malla. Si los pasos 1 o 2 producen errores que impiden crear asignaturas, el paso 3 no se ejecuta. | ProcessExcelUploadJob |

---

## 8. Endpoints de la API REST

Base URL: `/api`. Todas las rutas requieren header `Authorization: Bearer {token}` excepto `POST /api/auth/request-otp` y `POST /api/auth/verify-otp`.

### 8.1. Autenticación

| **Método** | **Ruta** | **Descripción** | **Body / Params** |
|---|---|---|---|
| POST | /api/auth/request-otp | Paso 1: recibe el correo, verifica que exista y esté activo y envía el OTP de 6 dígitos. | `{email}` |
| POST | /api/auth/verify-otp | Paso 2: valida el OTP. Si es correcto y no expiró, devuelve token Sanctum. | `{email, code}` |
| POST | /api/auth/logout | Cierra sesión. Invalida el token actual. | - |
| GET | /api/me | Devuelve datos del usuario autenticado. | - |

### 8.2. Catálogos (patrón repetido para cada entidad)

| **Método** | **Ruta** | **Descripción** |
|---|---|---|
| GET | /api/{entidad} | Lista paginada con búsqueda opcional `?search=` y `?page=` |
| POST | /api/{entidad} | Crea un nuevo registro. Valida con FormRequest. |
| GET | /api/{entidad}/{id} | Muestra un registro específico. |
| PUT | /api/{entidad}/{id} | Actualiza un registro. Valida con FormRequest. |
| PATCH | /api/{entidad}/{id}/toggle | Activa o desactiva (`Activo_* = !Activo_*`). |

Entidades con este patrón: `sedes`, `facultades`, `programas`, `normativas`, `componentes`, `asignaturas`, `usuarios`.

### 8.3. Agrupaciones (por programa)

| **Método** | **Ruta** | **Descripción** |
|---|---|---|
| GET | /api/programas/{id}/agrupaciones | Lista agrupaciones del programa |
| POST | /api/programas/{id}/agrupaciones | Crea una agrupación en el programa |
| PUT | /api/agrupaciones/{id} | Edita una agrupación. Registra diff y log automáticamente. |
| DELETE | /api/agrupaciones/{id} | Elimina agrupación (solo si no tiene mallas activas). |

### 8.4. Mallas y cargas ⚠️ MODIFICADA v5

> **CAMBIO v5:** `POST /api/cargas` ya no recibe archivos. Solo crea la carga con los datos del programa. Los archivos se suben por separado con `POST /api/cargas/{id}/archivo`. El procesamiento se lanza con `POST /api/cargas/{id}/procesar`.

| **Método** | **Ruta** | **Descripción** | **Body / Notas** |
|---|---|---|---|
| GET | /api/programas/{id}/malla-vigente | Retorna la malla activa del programa con agrupaciones, asignaturas y requisitos. | - |
| GET | /api/programas/{id}/mallas | Lista el historial de versiones de mallas de un programa. | - |
| POST | /api/cargas | Crea una nueva carga. No recibe archivos. Estado inicial: `esperando_archivos`. | `{programa_id, normativa_id, malla_base_id?}` → devuelve `{carga_id}` |
| GET | /api/cargas | Lista todas las cargas con su estado. Soporta `?estado=` y `?programa_id=` | - |
| GET | /api/cargas/{id} | Detalle de una carga: estado, archivos subidos por tipo, errores, diff. | - |
| GET | /api/cargas/{id}/estado | Estado actual de la carga (para polling del frontend). | - |
| GET | /api/cargas/{id}/diff | Lista completa de diffs de una carga agrupados por entidad. | - |
| POST | /api/cargas/{id}/archivo | Sube uno de los tres archivos. Si el tipo ya existe, lo reemplaza automáticamente. | `multipart/form-data: {archivo: File, tipo: asignaturas\|electivas\|malla}` → devuelve `{archivo_id, estado_carga_actual}` |
| POST | /api/cargas/{id}/procesar | Lanza el Job. Solo válido si `Estado_Carga = listo_para_procesar`. | - → 409 si estado incorrecto |
| PATCH | /api/cargas/{id}/enviar-revision | Cambia estado a `pendiente_aprobacion`. | - |
| PATCH | /api/cargas/{id}/revisar | Aprueba o rechaza. | `{accion: aprobado\|rechazado, comentario}` |

### 8.5. CRUD directo sobre malla (cambios ligeros)

| **Método** | **Ruta** | **Descripción** |
|---|---|---|
| PUT | /api/agrupaciones/{id} | Edita una agrupación. Registra diff y log. |
| PUT | /api/requisitos/{id} | Edita un requisito. Registra diff y log. |

### 8.6. Auditoría

| **Método** | **Ruta** | **Descripción** |
|---|---|---|
| GET | /api/logs | Lista `log_actividad`. Filtros: `?usuario_id=`, `?accion=`, `?desde=`, `?hasta=`, `?page=` |

---

## 9. Estructura de los Archivos Excel de Carga

La carga masiva se compone de tres archivos independientes. El parser procesa cada uno por separado.

### 9.1. Archivo de Asignaturas

Contiene el catálogo de asignaturas del programa. Se procesa primero.

| **Columna Excel** | **Campo destino BD** | **Obligatorio** | **Regla** |
|---|---|---|---|
| Código | `Codigo_Asignatura` | Sí | Sin código = error bloqueante para esa fila |
| Nombre | `Nombre_Asignatura` | Sí | Si código existe con nombre diferente = advertencia |
| Créditos | `Creditos_Asignatura` | Sí | Entero positivo |
| Horas Presencial | `Horas_Presencial` | No | |
| Horas Estudiante | `Horas_Estudiante` | No | |

### 9.2. Archivo de Electivas

Contiene las asignaturas de libre elección. Se procesa segundo.

| **Columna Excel** | **Campo destino BD** | **Obligatorio** |
|---|---|---|
| Código | `Codigo_Asignatura` | Sí |
| Nombre | `Nombre_Asignatura` | Sí |
| Créditos | `Creditos_Asignatura` | Sí |
| Horas Presencial | `Horas_Presencial` | No |
| Horas Estudiante | `Horas_Estudiante` | No |

### 9.3. Archivo de Malla

Define la estructura del plan de estudios. Se procesa tercero, solo si los dos anteriores completaron sin errores bloqueantes.

| **Columna Excel** | **Campo destino BD** | **Obligatorio** | **Regla** |
|---|---|---|---|
| Normativa | Busca `ID_Normativa` en BD | Sí | Debe existir en la tabla normativa |
| Componente | Busca o crea `Componente` | Sí | Si no existe, se crea automáticamente |
| Agrupación | `Nombre_Agrupacion` | Sí | Si componente+nombre no existe para el **programa**, se crea |
| Código Asignatura | `Codigo_Asignatura` | Sí | Sin código = error bloqueante para esa fila |
| Nombre Asignatura | `Nombre_Asignatura` | Sí | Si código existe con nombre diferente = advertencia |
| Créditos | `Creditos_Asignatura` | Sí | Entero positivo |
| Obligatoria | `Tipo_Asignatura` | Sí | SI → obligatoria, NO → optativa |
| Semestre | `Semestre_Sugerido` | No | Entero 1-20 |
| Tipo Requisito | `Tipo_Requisito` | No | prerequisito\|correquisito\|creditos_minimos\|texto libre |
| Código o Valor Requisito | `ID_Agrup_Asig_Requerida` o `Creditos_Minimos` o `Descripcion_Requisito` | No | Código si es asignatura, número si es créditos, texto libre a `Descripcion_Requisito` |

---

## 10. Plan de Fases de Desarrollo

> *Cada fase produce un entregable funcional y desplegable de forma independiente. Una fase no debe comenzar hasta que la anterior esté completada y probada.*

### Fase 1 — Fundación y Autenticación

Objetivo: tener el proyecto configurado, la base de datos creada y el login funcionando end-to-end.

| **#** | **Tarea** | **Capa** | **Criterio de aceptación** |
|---|---|---|---|
| 1.1 | Crear proyecto Laravel 12 y configurar conexión MySQL | Backend | `php artisan migrate` ejecuta sin errores |
| 1.2 | Crear todas las migraciones del modelo de datos (16 tablas con los cambios v4 y v5) | Backend | Todas las tablas existen con tipos, FK y UNIQUE correctos |
| 1.3 | Crear seeders iniciales: sede UNAL Manizales, facultades, admin usuario | Backend | `php artisan db:seed` crea los registros base |
| 1.4 | Instalar y configurar Laravel Sanctum para autenticación OTP por correo. Crear migración para columnas `Otp_Code` y `Otp_Expires_At` en la tabla usuario. Crear `AuthController` con métodos `requestOtp` y `verifyOtp`. Crear `OtpCodeMail` y vista Blade del correo. | Backend | `POST /api/auth/request-otp` envía correo y `POST /api/auth/verify-otp` devuelve token válido |
| 1.5 | Crear proyecto React 19 + Vite con React Router y Axios configurado | Frontend | `npm run dev` levanta sin errores, ruta `/` funciona |
| 1.6 | Implementar pantalla de Login en dos pasos: (1) formulario de correo que llama a `POST /api/auth/request-otp`; (2) formulario de código OTP de 6 dígitos que llama a `POST /api/auth/verify-otp` | Frontend | OTP recibido por correo, ingresado en la pantalla y token guardado en memoria; redirige al dashboard |
| 1.7 | Implementar logout y protección de rutas privadas en React Router | Frontend | Ruta `/dashboard` sin token redirige a `/login` |

### Fase 2 — Catálogos

Objetivo: CRUD completo de todas las entidades del dominio académico con sus validaciones.

| **#** | **Tarea** | **Capa** | **Criterio de aceptación** |
|---|---|---|---|
| 2.1 | Crear modelos Eloquent con relaciones para todas las entidades | Backend | Relaciones funcionan en tinker |
| 2.2 | Crear API Resources para todas las entidades (formato de respuesta estándar) | Backend | Respuestas con estructura `{data, message}` |
| 2.3 | Crear Form Requests con validaciones para cada entidad | Backend | POST con datos inválidos devuelve 422 con errores |
| 2.4 | Implementar Controllers de API para los 7 catálogos (sede, facultad, programa, normativa, componente, asignatura, usuario) + Agrupaciones por Programa | Backend | Todos los endpoints de las secciones 8.2 y 8.3 responden correctamente |
| 2.5 | Implementar vistas React para cada catálogo: lista con búsqueda + formulario crear/editar + toggle activo | Frontend | CRUD completo operativo desde el navegador |
| 2.6 | Implementar vista React para gestión de Agrupaciones por Programa (con `Tipo_Agrupacion`, créditos requeridos) | Frontend | Se pueden crear, editar y ver agrupaciones por programa |
| 2.7 | Implementar componente de tabla reutilizable con paginación y búsqueda | Frontend | Usado en todos los catálogos sin duplicación de código |

### Fase 3 — Carga Masiva y Procesamiento de Excel

Objetivo: el flujo completo de subida en dos fases, parseo, validación y creación de malla en estado borrador.

| **#** | **Tarea** | **Capa** | **Criterio de aceptación** |
|---|---|---|---|
| 3.1 | Implementar `ExcelUploadService`: recibir archivo, calcular hash, verificar duplicado, guardar en `archivo_excel` con `Tipo_Archivo`, actualizar FK correspondiente en `carga_malla`, detectar transición a `listo_para_procesar` | Backend | Cada archivo se guarda con su tipo; al subir el tercero el estado cambia automáticamente |
| 3.2 | Implementar endpoint `POST /api/cargas` (crea la carga con programa/normativa, estado `esperando_archivos`) y `POST /api/cargas/{id}/archivo` (subida individual con reemplazo automático si el tipo ya existe) | Backend | Se puede crear una carga y subir los tres archivos por separado; el estado evoluciona correctamente |
| 3.3 | Implementar endpoint `POST /api/cargas/{id}/procesar` con validación de estado | Backend | 409 si estado no es `listo_para_procesar`; Job encolado si estado correcto |
| 3.4 | Implementar `ExcelParserService`: procesamiento en tres pasos ordenados (asignaturas → electivas → malla), insertar `agrupacion_asignatura` con `ID_Malla`, limpiar strings con `trim()` y `\n` | Backend | Excel de prueba se procesa sin errores críticos |
| 3.5 | Implementar lógica de validación: sin código = error, nombre diferente = advertencia, asignatura duplicada en misma agrupación+malla = error | Backend | `error_carga` registra los casos correctamente |
| 3.6 | Empaquetar parseo en Laravel Job con reintentos automáticos y orden de pasos | Backend | Job procesable con `php artisan queue:work`; paso 3 se omite si pasos 1-2 fallan |
| 3.7 | Endpoint `GET /api/cargas/{id}/estado` para polling | Backend | Devuelve estado actual y porcentaje de progreso |
| 3.8 | Vista React de subida de tres archivos: creación de carga, tres zonas de drop independientes con indicador por tipo, barra de progreso del estado de carga, botón "Procesar" que se activa solo cuando los tres archivos están listos (`listo_para_procesar`), lista de errores por fila | Frontend | Flujo completo operativo end-to-end con los tres archivos de prueba |

### Fase 4 — Flujo de Aprobación y Diff

Objetivo: flujo completo de revisión y aprobación con visualización de diffs.

| **#** | **Tarea** | **Capa** | **Criterio de aceptación** |
|---|---|---|---|
| 4.1 | Implementar `DiffService`: compara `agrupacion_asignatura` de la malla nueva vs malla base y genera registros en `diff_malla` | Backend | `diff_malla` contiene INSERT/UPDATE/DELETE correctos por asignación |
| 4.2 | Implementar `MallaAprobacionService`: transacción atómica de activación, archivado de malla anterior, actualización de `Es_Vigente` | Backend | Solo una malla vigente por programa en todos los escenarios |
| 4.3 | Endpoints `enviar-revision` y `revisar` con validaciones (RN-04) | Backend | Estados transicionan correctamente |
| 4.4 | `LogService` y Eloquent Observers para `diff_malla` y `log_actividad` en cambios CRUD directos | Backend | Todo cambio queda registrado automáticamente |
| 4.5 | Vista React de detalle de carga: estado, archivos subidos por tipo, errores, diff agrupado por entidad con colores INSERT/UPDATE/DELETE | Frontend | Revisor puede ver claramente qué cambió antes de aprobar |
| 4.6 | Vista React del flujo de revisión: botones aprobar/rechazar con campo de comentario | Frontend | Flujo completo de aprobación operativo end-to-end |

### Fase 5 — Visualización de Mallas

Objetivo: interfaz de consulta de la malla vigente e historial de versiones.

| **#** | **Tarea** | **Capa** | **Criterio de aceptación** |
|---|---|---|---|
| 5.1 | Endpoint `GET /api/programas/{id}/malla-vigente`: join de `malla_curricular` → `agrupacion_asignatura` → `agrupacion` → `asignatura` → `requisito` | Backend | Respuesta JSON estructurada con todos los datos |
| 5.2 | Endpoint `GET /api/programas/{id}/mallas` para el historial | Backend | Lista de versiones con fecha, estado y etiqueta |
| 5.3 | Vista React de malla: árbol `Tipo_Agrupacion` → `Nombre_Agrupacion` → `AsignaturaCard` con créditos, semestre y badge de tipo | Frontend | Malla de Ingeniería Civil se muestra correctamente |
| 5.4 | Cálculo de totales de créditos por agrupación y total (créditos únicos por `Codigo_Asignatura`) | Frontend | Totales coinciden con los datos oficiales del programa (179 créditos para Ingeniería Civil) |
| 5.5 | Vista de comparación entre dos versiones con diff visual | Frontend | Cambios entre versiones son identificables visualmente |

---

## 11. Convenciones de Código

### 11.1. Backend Laravel

- Nombres de clases: PascalCase. Métodos y variables: camelCase. Columnas de BD: Snake_Case según el modelo definido.
- Cada entidad tiene: Model, Migration, Controller (`app/Http/Controllers/Api/`), Resource (`app/Http/Resources/`), FormRequest de creación y de actualización.
- La lógica de negocio compleja vive en Services (`app/Services/`): `ExcelUploadService`, `ExcelParserService`, `DiffService`, `MallaAprobacionService`, `LogService`.
- Los Jobs están en `app/Jobs/`. Ejemplo: `ProcessExcelUploadJob`.
- Los Observers en `app/Observers/`, registrados en `AppServiceProvider`.
- Todas las rutas en `routes/api.php` agrupadas con prefijo `v1`.
- Respuestas de error: `{message: string, errors: {campo: [mensajes]}}`.

### 11.2. Frontend React

- Componentes: PascalCase en archivos `.jsx`. Hooks: camelCase con prefijo `use`.
- Estructura por feature: `src/pages/Catalogos/`, `src/pages/Cargas/`, `src/pages/Mallas/`.
- Llamadas a la API centralizadas en `src/api/`: `auth.js`, `catalogos.js`, `agrupaciones.js`, `cargas.js`, `mallas.js`.
- El token de Sanctum se guarda en Context global (`AuthContext`), nunca en localStorage ni sessionStorage.
- Estados de carga (loading, error, data) en un custom hook `useApi()` que envuelve axios.
- El polling del estado de carga usa `useEffect` con `setInterval` y se limpia en el cleanup.
- La vista de subida de archivos debe manejar **tres zonas de drop independientes** con estado visual por tipo (`asignaturas`, `electivas`, `malla`). El botón "Procesar" se activa únicamente cuando el `Estado_Carga` de la API devuelve `listo_para_procesar`.

### 11.3. Respuesta estándar de la API

```json
// Respuesta exitosa
{ "data": { ... }, "message": "Operación exitosa" }

// Respuesta de lista paginada
{ "data": [...], "meta": { "current_page": 1, "total": 50, "per_page": 20 }, "message": "" }

// Respuesta de error de validación (422)
{ "message": "Los datos proporcionados no son válidos.", "errors": { "Codigo_Facultad": ["El código ya existe."] } }

// Respuesta de error de estado incorrecto (409)
{ "message": "La carga no está en estado listo_para_procesar.", "data": null }

// Respuesta de error genérico (500)
{ "message": "Error interno del servidor.", "data": null }
```

---

## 12. Instrucciones Directas para el Agente de Desarrollo

> Leer esta sección antes de generar cualquier código.

### 12.1. Restricciones no negociables

- Backend: Laravel 12. No usar otro framework PHP.
- Frontend: React 19 con Vite. No usar otro framework JavaScript.
- Base de datos: MySQL 8. No usar PostgreSQL ni SQLite.
- Usar Inertia.js
- No usar localStorage para el token. Usar Context API de React en memoria.
- No eliminar registros físicamente. Solo desactivar con campo `Activo_*` o `Esta_Activo`.
- No poner lógica de negocio en Controllers. Usar Services.
- Las agrupaciones pertenecen al **Programa** (`ID_Programa`), no a la malla. El vínculo con la versión de malla va en `agrupacion_asignatura` mediante `ID_Malla`.
- La carga masiva requiere **tres archivos separados**. `POST /api/cargas` no recibe archivos. Los archivos se suben con `POST /api/cargas/{id}/archivo`. El Job solo se lanza con `POST /api/cargas/{id}/procesar` cuando los tres están listos.
- El Job procesa los archivos en orden estricto: **asignaturas → electivas → malla**. El tercer paso no se ejecuta si los dos primeros tuvieron errores bloqueantes.

### 12.2. Orden de desarrollo recomendado

1. Clonar estructura de directorios (`backend/` y `frontend/` separados).
2. Ejecutar Fase 1: proyecto, migraciones **con cambios v4 y v5**, seeders, auth OTP.
3. Verificar que `POST /api/auth/request-otp` envía correo y `POST /api/auth/verify-otp` devuelve token antes de continuar.
4. Ejecutar Fase 2: catálogos. Primero backend completo, luego frontend. Incluir CRUD de Agrupaciones por Programa.
5. Cargar datos reales de UNAL Manizales usando seeders o CRUD.
6. Ejecutar Fase 3 con los tres archivos de prueba separados del Excel `Plan_Ingenieri_a_Civil_2.xlsx`.
7. Ejecutar Fase 4. Probar el flujo completo con dos usuarios diferentes.
8. Ejecutar Fase 5. Verificar que los totales de créditos son correctos.

### 12.3. Datos de prueba disponibles

- Archivo Excel de referencia: `Plan_Ingenieri_a_Civil_2.xlsx` (Programa: Ingeniería Civil, Normativa: Acuerdo 15 de 2025).
- El Excel tiene las hojas: BD, Sedes, Facultad, Programa, Normativa, MALLA, Asignaturas, Electivas.
- Para las pruebas de Fase 3, el Excel debe dividirse en tres archivos: uno con la hoja Asignaturas, uno con la hoja Electivas, y uno con la hoja MALLA.

**Problemas conocidos del Excel de prueba:**

- **4 asignaturas sin `Codigo_Asignatura`** (errores bloqueantes RF-CE-04): INGENIERIA ECONOMICA, PROGRAMACION Y PRESUPUESTO OBRA, FORMULACION Y EVALUACION DE PROYECTOS, QUIMICA PARA INGENIERIA CIVIL. Cada una genera un registro de severidad `'error'` en `error_carga` y su fila no se procesa.
- **4 registros con saltos de línea internos (`\n`)** en nombre o código. El parser debe aplicar `trim()` y limpiar `\n` (RF-CE-03).
- **2 asignaturas con requisito de texto libre** (TRABAJO DE GRADO y CURSOS EN POSGRADO). Derivar a `Descripcion_Requisito` (RF-CE-11).
- La columna 'Obligatoria' usa SI/NO. Mapear a `obligatoria`/`optativa` (RF-CE-10).
- El Excel suma 227 créditos pero el programa tiene 179 créditos oficiales. La diferencia se debe a 19 asignaturas que aparecen en más de una agrupación. Contar créditos únicos por `Codigo_Asignatura` (RF-VI-04).

### 12.4. Configuración del servidor de producción

| **Parámetro** | **Valor** | **Donde configurar** |
|---|---|---|
| Servidor web | Apache 2.4.62 | Ya instalado en FreeBSD |
| PHP | 8.3.8 | Ya instalado en FreeBSD |
| MySQL | 8.0+ requerido | Verificar versión instalada |
| max_allowed_packet | 64M mínimo | my.cnf |
| character-set-server | utf8mb4 | my.cnf |
| collation-server | utf8mb4_unicode_ci | my.cnf |
| default-time-zone | +00:00 | my.cnf |
| Apache mod_rewrite | Habilitado | Necesario para las rutas de Laravel |
| Apache AllowOverride | All | .htaccess de Laravel debe funcionar |
| PHP extension: pdo_mysql | Habilitada | Requerida por Laravel |
| PHP extension: fileinfo | Habilitada | Requerida por Laravel Excel |
| PHP extension: zip | Habilitada | Requerida por Laravel Excel para .xlsx |
