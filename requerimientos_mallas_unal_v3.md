# UNIVERSIDAD NACIONAL DE COLOMBIA
## Sede Manizales

**Documento de Requerimientos del Sistema**

Sistema de Gestión de Mallas Académicas — UNAL Manizales

*Documento preparado para procesamiento por agente de desarrollo*

Versión 1.0 | Marzo 2026

---

| **Campo** | **Valor** |
|---|---|
| Proyecto | Sistema de Gestión de Mallas Académicas |
| Cliente | Universidad Nacional de Colombia - Sede Manizales |
| Stack | Laravel 12 + React 19 + MySQL 8 + Apache 2.4 |
| Arquitectura | API REST (Laravel) + SPA (React) + Vite |
| Autenticación | Laravel Sanctum con OTP de 6 dígitos por correo (sin contraseña) |
| Tipo de sistema | Panel administrativo cerrado, usuarios contados |
| Documento versión | 1.0 — Marzo 2026 |

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

- Sede → Facultad → Programa → Normativa → MallaCurricular
- MallaCurricular → Agrupación → AgrupacionAsignatura → Requisito
- Componente (catálogo transversal usado por Agrupación)
- Asignatura (catálogo compartido entre programas)
- Usuario, ArchivoExcel, CargaMalla, ErrorCarga, DiffMalla, LogActividad (gestión y auditoría)

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

> *El frontend React se compila localmente con Vite y se despliega como archivos estáticos en el servidor Apache. Node.js solo es necesario en la máquina de desarrollo, no en el servidor de producción.*

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

Motor: InnoDB. Charset: utf8mb4. Collation: utf8mb4_unicode_ci. Todas las PKs son INT UNSIGNED AUTO_INCREMENT. Todas las FKs tienen ON DELETE RESTRICT ON UPDATE CASCADE salvo indicación contraria.

### 3.1. Tabla: sede

| **Columna** | **Tipo MySQL** | **NN** | **Default** | **Notas** |
|---|---|---|---|---|
| ID_Sede | INT UNSIGNED AUTO_INCREMENT | Sí | - | PK |
| Nombre_Sede | VARCHAR(100) | Sí | - | |
| Ciudad_Sede | VARCHAR(100) | Sí | - | |
| Dirección_Sede | VARCHAR(200) | No | NULL | |
| Conmutador_Sede | VARCHAR(30) | No | NULL | |
| Campus_Sede | VARCHAR(100) | No | NULL | |
| Url_Sede | VARCHAR(300) | No | NULL | |

### 3.2. Tabla: facultad

| **Columna** | **Tipo MySQL** | **NN** | **Default** | **Notas** |
|---|---|---|---|---|
| ID_Facultad | INT UNSIGNED AUTO_INCREMENT | Sí | - | PK |
| ID_Sede | INT UNSIGNED | Sí | - | FK -> sede |
| Nombre_Facultad | VARCHAR(150) | Sí | - | |
| Conmutador_Facultad | VARCHAR(30) | No | NULL | |
| Extension_Facultad | VARCHAR(10) | No | NULL | |
| Campus_Facultad | VARCHAR(100) | No | NULL | |
| Url_Facultad | VARCHAR(300) | No | NULL | |

### 3.3. Tabla: programa

| **Columna** | **Tipo MySQL** | **NN** | **Default** | **Notas** |
|---|---|---|---|---|
| ID_Programa | INT UNSIGNED AUTO_INCREMENT | Sí | - | PK |
| ID_Facultad | INT UNSIGNED | Sí | - | FK -> facultad |
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

### 3.4. Tabla: normativa

| **Columna** | **Tipo MySQL** | **NN** | **Default** | **Notas** |
|---|---|---|---|---|
| ID_Normativa | INT UNSIGNED AUTO_INCREMENT | Sí | - | PK |
| ID_Programa | INT UNSIGNED | Sí | - | FK -> programa |
| Tipo_Normativa | VARCHAR(50) | Sí | - | Acuerdo\|Resolución\|Decreto\|Circular |
| Numero_Normativa | VARCHAR(50) | Sí | - | |
| Anio_Normativa | INT | Sí | - | |
| Instancia | VARCHAR(150) | Sí | - | Entidad que expide el acto |
| Descripcion_Normativa | TEXT | No | NULL | |
| Url_Normativa | VARCHAR(500) | No | NULL | |
| Esta_Activo | TINYINT(1) | Sí | 1 | |

### 3.5. Tabla: componente

| **Columna** | **Tipo MySQL** | **NN** | **Default** | **Notas** |
|---|---|---|---|---|
| ID_Componente | INT UNSIGNED AUTO_INCREMENT | Sí | - | PK |
| Nombre_Componente | VARCHAR(150) | Sí | - | UNIQUE |
| Descripcion_Componente | TEXT | No | NULL | |

### 3.6. Tabla: asignatura

| **Columna** | **Tipo MySQL** | **NN** | **Default** | **Notas** |
|---|---|---|---|---|
| ID_Asignatura | INT UNSIGNED AUTO_INCREMENT | Sí | - | PK |
| Codigo_Asignatura | VARCHAR(20) | Sí | - | UNIQUE. NULL bloqueante en carga Excel |
| Nombre_Asignatura | VARCHAR(200) | Sí | - | |
| Creditos_Asignatura | INT UNSIGNED | Sí | - | |
| Horas_Presencial | INT UNSIGNED | No | NULL | |
| Horas_Estudiante | INT UNSIGNED | No | NULL | |
| Descripcion_Asignatura | TEXT | No | NULL | |

### 3.7. Tabla: malla_curricular

> *Restricción especial: solo UNA malla por programa puede tener Es_Vigente = 1 simultáneamente. Se implementa con columna generada virtual + UNIQUE INDEX (workaround MySQL por ausencia de partial indexes).*

| **Columna** | **Tipo MySQL** | **NN** | **Default** | **Notas** |
|---|---|---|---|---|
| ID_Malla | INT UNSIGNED AUTO_INCREMENT | Sí | - | PK |
| ID_Normativa | INT UNSIGNED | Sí | - | FK -> normativa |
| ID_Programa | INT UNSIGNED | Sí | - | FK -> programa |
| Version_Numero | INT UNSIGNED | Sí | - | Incremental por programa |
| Version_Etiqueta | VARCHAR(50) | No | NULL | Ej: Plan 2025 |
| Fecha_Vigencia | DATE | Sí | - | |
| Fecha_Fin_Vigencia | DATE | No | NULL | NULL si aún vigente |
| Estado | VARCHAR(20) | Sí | - | borrador\|en_revision\|activa\|archivada\|rechazada |
| Es_Vigente | TINYINT(1) | Sí | 0 | |
| Created_at | TIMESTAMP | Sí | CURRENT_TIMESTAMP | |
| Vigente_Prog_ID | INT UNSIGNED GENERATED VIRTUAL | No | - | UNIQUE. IF(Es_Vigente=1, ID_Programa, NULL) |

### 3.8. Tabla: agrupacion

| **Columna** | **Tipo MySQL** | **NN** | **Default** | **Notas** |
|---|---|---|---|---|
| ID_Agrupacion | INT UNSIGNED AUTO_INCREMENT | Sí | - | PK |
| ID_Malla | INT UNSIGNED | Sí | - | FK -> malla_curricular |
| ID_Componente | INT UNSIGNED | Sí | - | FK -> componente |
| Nombre_Agrupacion | VARCHAR(150) | Sí | - | |
| Creditos_Requeridos | INT UNSIGNED | No | NULL | |
| Creditos_Maximos | INT UNSIGNED | No | NULL | |
| Es_Obligatoria | TINYINT(1) | Sí | 0 | |

### 3.9. Tabla: agrupacion_asignatura

| **Columna** | **Tipo MySQL** | **NN** | **Default** | **Notas** |
|---|---|---|---|---|
| ID_Agrup_Asig | INT UNSIGNED AUTO_INCREMENT | Sí | - | PK |
| ID_Agrupacion | INT UNSIGNED | Sí | - | FK -> agrupacion |
| ID_Asignatura | INT UNSIGNED | No | NULL | FK -> asignatura. NULL si libre_eleccion |
| Tipo_Asignatura | VARCHAR(30) | Sí | - | obligatoria\|optativa\|libre_eleccion |
| Semestre_Sugerido | INT UNSIGNED | No | NULL | 1-20 |

### 3.10. Tabla: requisito

| **Columna** | **Tipo MySQL** | **NN** | **Default** | **Notas** |
|---|---|---|---|---|
| ID_Requisito | INT UNSIGNED AUTO_INCREMENT | Sí | - | PK |
| ID_Agrup_Asig | INT UNSIGNED | Sí | - | FK -> agrupacion_asignatura (quien exige) |
| ID_Agrup_Asig_Requerida | INT UNSIGNED | No | NULL | FK -> agrupacion_asignatura (requerida). NULL si creditos_minimos |
| Tipo_Requisito | VARCHAR(30) | Sí | - | prerequisito\|correquisito\|creditos_minimos |
| Creditos_Minimos | INT UNSIGNED | No | NULL | Solo si tipo = creditos_minimos |
| Descripcion_Requisito | TEXT | No | NULL | Texto libre para requisitos no estructurados |

### 3.11. Tabla: usuario

| **Columna** | **Tipo MySQL** | **NN** | **Default** | **Notas** |
|---|---|---|---|---|
| ID_Usuario | INT UNSIGNED AUTO_INCREMENT | Sí | - | PK |
| Nombre_Usuario | VARCHAR(200) | Sí | - | |
| Email_Usuario | VARCHAR(200) | Sí | - | UNIQUE |
| Otp_Code | VARCHAR(255) | No | NULL | |
| Otp_Expires_At | TIMESTAMP | No | NULL | Expiración del OTP. NULL si no hay OTP activo |
| Activo_Usuario | TINYINT(1) | Sí | 1 | |
| Creacion_Usuario | TIMESTAMP | Sí | CURRENT_TIMESTAMP | |

### 3.12. Tabla: archivo_excel

| **Columna** | **Tipo MySQL** | **NN** | **Default** | **Notas** |
|---|---|---|---|---|
| ID_Archivo | INT UNSIGNED AUTO_INCREMENT | Sí | - | PK |
| ID_Usuario | INT UNSIGNED | Sí | - | FK -> usuario |
| Nombre_Archivo | VARCHAR(300) | Sí | - | Nombre original del archivo |
| Contenido_Archivo | LONGBLOB | Sí | - | Binario del .xlsx. max_allowed_packet >= 64M |
| Tamanio_Bytes | BIGINT UNSIGNED | Sí | - | |
| Hash_Sha256 | CHAR(64) | Sí | - | Para detectar duplicados |
| Estado_Procesamiento | VARCHAR(30) | Sí | - | pendiente\|procesando\|exitoso\|fallido |
| Fecha_Subido | TIMESTAMP | Sí | CURRENT_TIMESTAMP | |

### 3.13. Tabla: carga_malla

| **Columna** | **Tipo MySQL** | **NN** | **Default** | **Notas** |
|---|---|---|---|---|
| ID_Carga | INT UNSIGNED AUTO_INCREMENT | Sí | - | PK |
| ID_Archivo | INT UNSIGNED | Sí | - | FK -> archivo_excel |
| ID_Malla | INT UNSIGNED | No | NULL | FK -> malla_curricular. NULL si falló |
| ID_Malla_Base | INT UNSIGNED | No | NULL | FK -> malla_curricular. Malla anterior base del diff |
| ID_Usuario | INT UNSIGNED | Sí | - | FK -> usuario (quien cargó) |
| Estado_Carga | VARCHAR(30) | Sí | - | iniciado\|validando\|con_errores\|borrador\|pendiente_aprobacion\|aprobado\|rechazado |
| Comentario_Carga | TEXT | No | NULL | Justificación del cambio |
| Comentario_Revisor | TEXT | No | NULL | Observaciones del revisor |
| ID_Usuario_Revisor | INT UNSIGNED | No | NULL | FK -> usuario (quien aprobó/rechazó) |
| Fecha_Revision | TIMESTAMP | No | NULL | |
| Creacion_Carga | TIMESTAMP | Sí | CURRENT_TIMESTAMP | |
| Finalizacion_Carga | TIMESTAMP | No | NULL | |

### 3.14. Tabla: error_carga

| **Columna** | **Tipo MySQL** | **NN** | **Default** | **Notas** |
|---|---|---|---|---|
| ID_Error | INT UNSIGNED AUTO_INCREMENT | Sí | - | PK |
| ID_Carga | INT UNSIGNED | Sí | - | FK -> carga_malla |
| Fila_Error | INT UNSIGNED | No | NULL | Fila del Excel |
| Columna_Error | VARCHAR(50) | No | NULL | Nombre de la columna |
| Mensaje_Error | TEXT | Sí | - | |
| Valor_Recibido | VARCHAR(500) | No | NULL | |
| Severidad_Error | VARCHAR(20) | Sí | - | error\|advertencia |

### 3.15. Tabla: diff_malla

| **Columna** | **Tipo MySQL** | **NN** | **Default** | **Notas** |
|---|---|---|---|---|
| ID_Diff | INT UNSIGNED AUTO_INCREMENT | Sí | - | PK |
| ID_Carga | INT UNSIGNED | Sí | - | FK -> carga_malla |
| Entidad_Afectada | VARCHAR(50) | Sí | - | asignatura\|requisito\|agrupacion\|... |
| Tipo_Cambio | VARCHAR(20) | Sí | - | INSERT\|UPDATE\|DELETE |
| ID_Registro | INT UNSIGNED | No | NULL | ID del registro afectado |
| Valor_Anterior | JSON | No | NULL | Estado completo antes del cambio |
| Valor_Nuevo | JSON | No | NULL | Estado completo después del cambio |
| Creado_Diff | TIMESTAMP | Sí | CURRENT_TIMESTAMP | |

### 3.16. Tabla: log_actividad

| **Columna** | **Tipo MySQL** | **NN** | **Default** | **Notas** |
|---|---|---|---|---|
| ID_Log | INT UNSIGNED AUTO_INCREMENT | Sí | - | PK |
| ID_Usuario | INT UNSIGNED | No | NULL | FK -> usuario. NULL si acción del sistema |
| Accion_Log | VARCHAR(100) | Sí | - | UPLOAD_EXCEL\|APPROVE_MALLA\|LOGIN\|... |
| Entidad_Log | VARCHAR(50) | No | NULL | Tabla afectada |
| Entidad_ID_Log | BIGINT UNSIGNED | No | NULL | ID del registro afectado |
| Detalle_Log | JSON | No | NULL | Contexto adicional |
| IP_Origen_Log | VARCHAR(45) | No | NULL | IPv4 o IPv6 |
| Creacion_Log | TIMESTAMP | Sí | CURRENT_TIMESTAMP | |

---

## 4. Requerimientos Funcionales

> *Convención de IDs: RF-XX-YY donde XX es el módulo y YY es el número del requerimiento. Prioridades: Alta (debe estar en Fase 1), Media (Fase 2), Baja (Fase 3).*

### 4.1. Módulo de Autenticación (RF-AU)

| **ID** | **Requerimiento** | **Prioridad** |
|---|---|---|
| RF-AU-01 | El sistema debe permitir el inicio de sesión en dos pasos mediante OTP: (1) el usuario ingresa su correo electrónico, el sistema verifica que exista y esté activo, y envía un código de 6 dígitos al correo con validez de 10 minutos; (2) el usuario ingresa el código y, si es válido, Laravel Sanctum genera y devuelve un token de acceso que el frontend almacena en memoria (no en localStorage). El código se guarda hasheado con bcrypt y se elimina tras el primer uso exitoso. | Alta |
| RF-AU-02 | El sistema debe cerrar la sesión del usuario invalidando el token en el servidor mediante el endpoint POST /api/auth/logout. | Alta |
| RF-AU-03 | Todas las rutas de la API excepto POST /api/auth/request-otp y POST /api/auth/verify-otp deben estar protegidas por el middleware auth:sanctum. | Alta |
| RF-AU-04 | El OTP generado tiene una vigencia máxima de 10 minutos. Transcurrido ese tiempo, el código expira y el usuario debe solicitar uno nuevo. El sistema no permitirá el ingreso con un OTP expirado aunque el código sea correcto. | Media |

### 4.2. Módulo de Catálogos CRUD (RF-CA)

Los catálogos son las entidades base que se gestionan antes de cargar mallas. Cada uno tiene CRUD completo.

| **ID** | **Requerimiento** | **Prioridad** |
|---|---|---|
| RF-CA-01 | CRUD completo de Sede: crear, listar, editar y desactivar. Los campos obligatorios son Nombre_Sede y Ciudad_Sede. | Alta |
| RF-CA-02 | CRUD completo de Facultad: crear, listar, editar y desactivar. Debe asociarse a una Sede existente. | Alta |
| RF-CA-03 | CRUD completo de Programa: crear, listar, editar y activar/desactivar. Debe asociarse a una Facultad existente. Codigo_Programa debe ser único. | Alta |
| RF-CA-04 | CRUD completo de Normativa: crear, listar, editar y activar/desactivar. Debe asociarse a un Programa existente. | Alta |
| RF-CA-05 | CRUD completo de Componente: crear, listar, editar. Nombre_Componente debe ser único. | Alta |
| RF-CA-06 | CRUD completo de Asignatura: crear, listar, editar. Codigo_Asignatura debe ser único. | Alta |
| RF-CA-07 | CRUD completo de Usuario: crear, listar, editar y activar/desactivar. Solo los usuarios activos pueden iniciar sesión. | Alta |
| RF-CA-08 | Los listados de catálogos deben soportar búsqueda por nombre y paginación de 20 registros por página. | Media |

### 4.3. Módulo de Carga de Excel (RF-CE)

| **ID** | **Requerimiento** | **Prioridad** |
|---|---|---|
| RF-CE-01 | El sistema debe aceptar la subida de archivos .xlsx mediante el endpoint POST /api/cargas. El archivo se almacena en LONGBLOB en archivo_excel con su hash SHA-256. | Alta |
| RF-CE-02 | Antes de procesar, el sistema debe verificar si ya existe un archivo con el mismo Hash_Sha256 para el mismo programa y rechazarlo con un mensaje claro si es un duplicado exacto. | Alta |
| RF-CE-03 | El sistema debe leer las hojas MALLA y ELECTIVAS del Excel. Las demás hojas se ignoran. | Alta |
| RF-CE-04 | El parser debe limpiar todos los valores de texto antes de procesarlos: trim(), eliminar saltos de línea internos y normalizar espacios múltiples. | Alta |
| RF-CE-05 | Si una fila de la hoja MALLA no tiene Codigo_Asignatura, se debe registrar un error de severidad 'error' en error_carga y esa fila no se procesa. Esto no detiene el procesamiento de las demás filas. | Alta |
| RF-CE-06 | Si el Codigo_Asignatura ya existe en la BD pero el nombre en el Excel difiere, se debe registrar una advertencia en error_carga y usar la asignatura existente sin modificarla. | Alta |
| RF-CE-07 | El orden de inserción por fila es: (1) asignatura, (2) agrupación, (3) agrupacion_asignatura, (4) requisito. La agrupación se crea solo si no existe con el mismo Componente + Nombre para esa malla. | Alta |
| RF-CE-08 | Antes de procesar filas, el sistema crea: archivo_excel, carga_malla (estado: iniciado), malla_curricular (estado: borrador). Si el procesamiento falla, la malla queda en estado borrador y carga_malla en con_errores. | Alta |
| RF-CE-09 | El sistema debe soportar la selección de una malla base para calcular el diff. Si no se selecciona, se asume que es la primera versión. | Media |
| RF-CE-10 | El procesamiento de la carga debe ejecutarse en un Job de Laravel (cola) para no bloquear la respuesta HTTP. El frontend consulta el estado via polling al endpoint GET /api/cargas/{id}/estado. | Media |
| RF-CE-11 | El parser debe mapear el campo "Obligatoria" del Excel (valores SI/NO) al enum de la BD: SI → obligatoria, NO → optativa. Las asignaturas de tipo libre_eleccion provienen exclusivamente de la hoja ELECTIVAS. Este mapeo se ejecuta en ExcelParserService antes de persistir cada fila. | Alta |
| RF-CE-12 | El parser debe detectar requisitos expresados como texto libre en el campo Tipo_Requisito del Excel (ej: "Haber aprobado 70 créditos del componente disciplinar o profesional"). Cuando el valor no sea prerequisito, correquisito ni un entero, se deriva al campo Descripcion_Requisito (TEXT) de la tabla requisito sin generar error. Los campos ID_Agrup_Asig_Requerida y Creditos_Minimos quedan en NULL. | Alta |

### 4.4. Módulo de Flujo de Aprobación (RF-AP)

| **ID** | **Requerimiento** | **Prioridad** |
|---|---|---|
| RF-AP-01 | El flujo de estados de carga_malla es estrictamente: iniciado -> validando -> borrador -> pendiente_aprobacion -> aprobado\|rechazado. El estado con_errores puede aparecer desde validando. | Alta |
| RF-AP-02 | Solo el usuario que cargó la malla puede enviarla a revisión (cambiar a pendiente_aprobacion) mediante el endpoint PATCH /api/cargas/{id}/enviar-revision. | Alta |
| RF-AP-03 | Solo un usuario diferente al que cargó puede aprobar o rechazar. El endpoint es PATCH /api/cargas/{id}/revisar con body {accion: 'aprobar'\|'rechazar', comentario: '...'}. | Alta |
| RF-AP-04 | Al aprobar una malla: (1) malla_curricular pasa a estado activa, (2) Es_Vigente se pone en 1, (3) la malla anterior del mismo programa (si existe) pasa a archivada con Es_Vigente = 0, (4) se registra Fecha_Fin_Vigencia en la malla anterior. Todo en una transacción atómica. | Alta |
| RF-AP-05 | Al rechazar: carga_malla pasa a rechazado, malla_curricular pasa a rechazada, se guarda Comentario_Revisor. | Alta |
| RF-AP-06 | El sistema debe mostrar el diff completo de cambios entre la malla nueva y la malla base antes de que el revisor tome una decisión, listando INSERT, UPDATE y DELETE por entidad. | Alta |

### 4.5. Módulo de Visualización de Mallas (RF-VI)

| **ID** | **Requerimiento** | **Prioridad** |
|---|---|---|
| RF-VI-01 | El sistema debe mostrar la malla vigente de cada programa organizada por componente y agrupación, con todas las asignaturas, sus créditos, semestre sugerido y tipo. | Alta |
| RF-VI-02 | El sistema debe mostrar los prerequisitos y correquisitos de cada asignatura dentro de la malla. | Alta |
| RF-VI-03 | El sistema debe permitir navegar el historial de versiones de una malla, seleccionar dos versiones y ver el diff entre ellas. | Media |
| RF-VI-04 | El sistema debe mostrar el total de créditos por componente, por agrupación y el total de la malla. | Media |

### 4.6. Módulo de Auditoría (RF-AU2)

| **ID** | **Requerimiento** | **Prioridad** |
|---|---|---|
| RF-AU2-01 | Toda acción de usuario (login, logout, CRUD, carga, aprobación) debe quedar registrada en log_actividad con el ID del usuario, la acción, la entidad afectada y la IP de origen. | Alta |
| RF-AU2-02 | El log de actividad debe ser consultable por rango de fechas, por usuario y por tipo de acción, con paginación. | Media |
| RF-AU2-03 | Los registros de log_actividad son de solo lectura: ningún usuario puede modificarlos ni eliminarlos. | Alta |

---

## 5. Requerimientos No Funcionales

| **ID** | **Categoría** | **Requerimiento** | **Criterio de aceptación** |
|---|---|---|---|
| RNF-01 | Seguridad | Los códigos OTP se almacenan con hash bcrypt (cost factor >= 12) y se eliminan de la base de datos inmediatamente después del primer uso exitoso. Nunca se almacenan en texto plano. | Verificable en la columna Otp_Code de la tabla usuario |
| RNF-02 | Seguridad | La API debe implementar rate limiting: máximo 60 requests por minuto por IP en rutas generales y 10 intentos por minuto en /api/auth/request-otp y /api/auth/verify-otp. | Configurable en Laravel con throttle middleware |
| RNF-03 | Seguridad | Todos los inputs recibidos por la API deben ser validados con Form Requests de Laravel antes de ser procesados. Nunca confiar en datos del cliente. | Revisión de código: toda ruta tiene su FormRequest |
| RNF-04 | Seguridad | La API debe incluir headers de seguridad: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options. | Verificable con herramientas como securityheaders.com |
| RNF-05 | Rendimiento | Las respuestas de la API para listados de catálogos deben tardar menos de 500ms con hasta 1000 registros. | Medible con Laravel Debugbar o Telescope en desarrollo |
| RNF-06 | Rendimiento | El procesamiento de un archivo Excel de hasta 500 filas debe completarse en menos de 30 segundos en el Job asincrónico. | Medible en producción con jobs de Laravel |
| RNF-07 | Confiabilidad | Las operaciones críticas (aprobación de malla, activación de vigencia) deben ejecutarse dentro de transacciones de base de datos con DB::transaction(). | Revisión de código en el servicio de aprobación |
| RNF-08 | Confiabilidad | Si el Job de procesamiento de Excel falla, debe reintentarse automáticamente hasta 3 veces con backoff exponencial antes de marcarse como fallido. | Configurable en el Job con $tries y $backoff |
| RNF-09 | Mantenibilidad | La lógica de negocio (parseo de Excel, cálculo de diffs, activación de mallas) debe vivir en clases Service, no en Controllers. | Revisión de estructura de directorios |
| RNF-10 | Mantenibilidad | El código debe seguir PSR-12 en PHP y el estándar de ESLint recomendado en React. | Verificable con PHP CS Fixer y ESLint en el pipeline |
| RNF-11 | Usabilidad | El frontend debe ser responsivo y funcionar correctamente en pantallas desde 1024px de ancho (mínimo escritorio). | Prueba manual en Chrome y Firefox |
| RNF-12 | Compatibilidad | La API debe responder siempre en formato JSON con la estructura {data, message, errors} estandarizada. | Revisión de todos los API Resources |
| RNF-13 | Charset | MySQL debe configurarse con utf8mb4 y collation utf8mb4_unicode_ci para soportar tildes y eñes. | Verificable en la configuración del servidor |

---

## 6. Reglas de Negocio Críticas

> *Estas reglas deben implementarse como validaciones en el backend. El frontend puede mostrarlas pero nunca es la única línea de defensa.*

| **ID** | **Regla** | **Donde se implementa** |
|---|---|---|
| RN-01 | Solo puede existir UNA malla con Es_Vigente = 1 por programa en cualquier momento. Se garantiza a nivel de BD con el UNIQUE index sobre la columna generada. | MySQL UNIQUE + Service de aprobación |
| RN-02 | Una asignatura sin Codigo_Asignatura en el Excel es un error bloqueante para esa fila. No se puede crear una asignatura sin código. | ExcelParserService |
| RN-03 | Al aprobar una malla, la malla anterior vigente del mismo programa se archiva automáticamente en la misma transacción. | MallaAprobacionService con DB::transaction() |
| RN-04 | El mismo usuario que cargó la malla NO puede ser el revisor. El sistema debe rechazar la solicitud de revisión si ID_Usuario == ID_Usuario_Revisor. | Validación en el FormRequest de revisión |
| RN-05 | Los cambios directos por CRUD (sin carga Excel) sobre agrupación, agrupacion_asignatura o requisito deben registrarse en diff_malla y log_actividad. | Observer de Eloquent o Service layer |
| RN-06 | Una malla en estado activa no puede ser editada directamente. Para modificarla se debe iniciar una nueva carga. | Validación en todos los endpoints que afecten mallas activas |
| RN-07 | Si el hash SHA-256 de un archivo Excel coincide con uno ya cargado para el mismo programa, se rechaza la carga con mensaje descriptivo. | ExcelUploadService |
| RN-08 | Los registros de sede, facultad, programa, normativa, componente y asignatura nunca se eliminan físicamente. Solo se desactivan (soft delete lógico). | Validación en los Controllers de CRUD |

---

## 7. Endpoints de la API REST

Base URL: `/api`. Todas las rutas requieren header `Authorization: Bearer {token}` excepto `POST /api/auth/request-otp` y `POST /api/auth/verify-otp`.

### 7.1. Autenticación

| **Método** | **Ruta** | **Descripción** | **Body / Params** |
|---|---|---|---|
| POST | /api/auth/request-otp | Paso 1: recibe el correo, verifica que exista en el sistema y envía el OTP de 6 dígitos al correo. | {email} |
| POST | /api/auth/verify-otp | Paso 2: valida el OTP ingresado por el usuario. Si es correcto y no expiró, devuelve token Sanctum. | {email, code} |
| POST | /api/auth/logout | Cierra sesión. Invalida el token actual. | - |
| GET | /api/me | Devuelve datos del usuario autenticado. | - |

### 7.2. Catálogos (patrón repetido para cada entidad)

| **Método** | **Ruta** | **Descripción** |
|---|---|---|
| GET | /api/{entidad} | Lista paginada con búsqueda opcional ?search= y ?page= |
| POST | /api/{entidad} | Crea un nuevo registro. Valida con FormRequest. |
| GET | /api/{entidad}/{id} | Muestra un registro específico. |
| PUT | /api/{entidad}/{id} | Actualiza un registro. Valida con FormRequest. |
| PATCH | /api/{entidad}/{id}/toggle | Activa o desactiva (Activo_* = !Activo_*). |

Entidades con este patrón: sedes, facultades, programas, normativas, componentes, asignaturas, usuarios.

### 7.3. Mallas y cargas

| **Método** | **Ruta** | **Descripción** |
|---|---|---|
| GET | /api/programas/{id}/malla-vigente | Retorna la malla activa del programa con todos sus componentes, agrupaciones y asignaturas. |
| GET | /api/programas/{id}/mallas | Lista el historial de versiones de mallas de un programa. |
| POST | /api/cargas | Recibe el archivo Excel (multipart/form-data) e inicia el Job de procesamiento. |
| GET | /api/cargas | Lista todas las cargas con su estado. Soporta ?estado= y ?programa_id= |
| GET | /api/cargas/{id} | Detalle de una carga: errores, diff, estado actual. |
| GET | /api/cargas/{id}/estado | Estado actual de la carga (para polling del frontend). |
| GET | /api/cargas/{id}/diff | Lista completa de diffs de una carga agrupados por entidad. |
| PATCH | /api/cargas/{id}/enviar-revision | Cambia estado a pendiente_aprobacion. |
| PATCH | /api/cargas/{id}/revisar | Aprueba o rechaza. Body: {accion, comentario}. |

### 7.4. CRUD directo sobre malla (cambios ligeros)

| **Método** | **Ruta** | **Descripción** |
|---|---|---|
| POST | /api/mallas/{id}/agrupaciones | Agrega una agrupación a la malla (solo si no está activa). |
| PUT | /api/agrupaciones/{id} | Edita una agrupación. Registra diff y log automáticamente. |
| DELETE | /api/agrupaciones/{id} | Elimina una agrupación. Registra diff y log. |
| PUT | /api/requisitos/{id} | Edita un requisito. Registra diff y log. |

### 7.5. Auditoría

| **Método** | **Ruta** | **Descripción** |
|---|---|---|
| GET | /api/logs | Lista log_actividad. Filtros: ?usuario_id=, ?accion=, ?desde=, ?hasta=, ?page= |

---

## 8. Estructura del Archivo Excel de Carga

El parser de Laravel solo procesa las hojas **MALLA** y **ELECTIVAS**. Las demás hojas (Sedes, Facultad, Programa, etc.) son ignoradas.

### 8.1. Hoja MALLA — Columnas esperadas

| **Columna Excel** | **Campo destino BD** | **Obligatorio** | **Regla de negocio** |
|---|---|---|---|
| Normativa | Busca ID_Normativa en BD | Sí | Debe existir en la tabla normativa |
| Componente | Busca o crea Componente | Sí | Si no existe, se crea automáticamente |
| Agrupación | Nombre_Agrupacion | Sí | Si componente+nombre no existe para la malla, se crea |
| Código Asignatura | Codigo_Asignatura | Sí | Sin código = error bloqueante para esa fila |
| Nombre Asignatura | Nombre_Asignatura | Sí | Si código existe con nombre diferente = advertencia |
| Créditos | Creditos_Asignatura | Sí | Entero positivo |
| Tipo | Tipo_Asignatura | Sí | obligatoria\|optativa\|libre_eleccion |
| Semestre | Semestre_Sugerido | No | Entero 1-20 |
| Tipo Requisito | Tipo_Requisito en requisito | No | prerequisito\|correquisito\|creditos_minimos |
| Código o Valor Requisito | ID_Agrup_Asig_Requerida o Creditos_Minimos | No | Código si es asignatura, número si es créditos |

### 8.2. Hoja ELECTIVAS — Columnas esperadas

| **Columna Excel** | **Campo destino BD** | **Obligatorio** | **Notas** |
|---|---|---|---|
| Código | Codigo_Asignatura | Sí | Mismo comportamiento que en MALLA |
| Nombre | Nombre_Asignatura | Sí | |
| Créditos | Creditos_Asignatura | Sí | |
| Horas Presencial | Horas_Presencial | No | |
| Horas Estudiante | Horas_Estudiante | No | |

---

## 9. Plan de Fases de Desarrollo

> *Cada fase produce un entregable funcional y desplegable de forma independiente. Una fase no debe comenzar hasta que la anterior esté completada y probada.*

### Fase 1 — Fundación y Autenticación

Objetivo: tener el proyecto configurado, la base de datos creada y el login funcionando end-to-end.

| **#** | **Tarea** | **Capa** | **Criterio de aceptación** |
|---|---|---|---|
| 1.1 | Crear proyecto Laravel 12 y configurar conexión MySQL | Backend | php artisan migrate ejecuta sin errores |
| 1.2 | Crear todas las migraciones del modelo de datos (16 tablas) | Backend | Todas las tablas existen con tipos y FK correctas |
| 1.3 | Crear seeders iniciales: sede UNAL Manizales, facultades, admin usuario | Backend | php artisan db:seed crea los registros base |
| 1.4 | Instalar y configurar Laravel Sanctum para autenticación OTP por correo. Crear migración para columnas Otp_Code y Otp_Expires_At en la tabla usuario. Crear AuthController con métodos requestOtp y verifyOtp. Crear OtpCodeMail y vista Blade del correo. | Backend | POST /api/auth/request-otp envía correo y POST /api/auth/verify-otp devuelve token válido |
| 1.5 | Crear proyecto React 19 + Vite con React Router y Axios configurado | Frontend | npm run dev levanta sin errores, ruta / funciona |
| 1.6 | Implementar pantalla de Login en dos pasos: (1) formulario de correo que llama a POST /api/auth/request-otp; (2) formulario de código OTP de 6 dígitos que llama a POST /api/auth/verify-otp | Frontend | OTP recibido por correo, ingresado en la pantalla y token guardado en memoria; redirige al dashboard |
| 1.7 | Implementar logout y protección de rutas privadas en React Router | Frontend | Ruta /dashboard sin token redirige a /login |

### Fase 2 — Catálogos

Objetivo: CRUD completo de todas las entidades del dominio académico con sus validaciones.

| **#** | **Tarea** | **Capa** | **Criterio de aceptación** |
|---|---|---|---|
| 2.1 | Crear modelos Eloquent con relaciones para todas las entidades | Backend | Relaciones funcionan en tinker |
| 2.2 | Crear API Resources para todas las entidades (formato de respuesta estándar) | Backend | Respuestas con estructura {data, message} |
| 2.3 | Crear Form Requests con validaciones para cada entidad | Backend | POST con datos inválidos devuelve 422 con errores |
| 2.4 | Implementar Controllers de API para los 7 catálogos (sede, facultad, programa, normativa, componente, asignatura, usuario) | Backend | Todos los endpoints de la sección 7.2 responden correctamente |
| 2.5 | Implementar vistas React para cada catálogo: lista con búsqueda + formulario crear/editar + toggle activo | Frontend | CRUD completo operativo desde el navegador |
| 2.6 | Implementar componente de tabla reutilizable con paginación y búsqueda | Frontend | Usado en los 7 catálogos sin duplicación de código |

### Fase 3 — Carga de Excel y Procesamiento

Objetivo: el flujo completo de subida, parseo, validación y creación de malla en estado borrador.

| **#** | **Tarea** | **Capa** | **Criterio de aceptación** |
|---|---|---|---|
| 3.1 | Implementar ExcelUploadService: recibir archivo, calcular hash, guardar en archivo_excel, crear carga_malla inicial | Backend | Archivo guardado en BD, carga en estado iniciado |
| 3.2 | Implementar ExcelParserService: leer hojas MALLA y ELECTIVAS, limpiar strings, ejecutar orden de inserción | Backend | Excel de prueba (Ingeniería Civil) se procesa sin errores críticos |
| 3.3 | Implementar lógica de validación de asignaturas: sin código = error, nombre diferente = advertencia | Backend | error_carga registra los casos correctamente |
| 3.4 | Empaquetar el parseo en un Laravel Job con reintentos automáticos | Backend | Job procesable con php artisan queue:work |
| 3.5 | Implementar endpoint GET /api/cargas/{id}/estado para polling | Backend | Devuelve estado actual y porcentaje de progreso |
| 3.6 | Implementar vista React de subida de Excel: selección de archivo, selección de normativa, barra de progreso vía polling, lista de errores por fila | Frontend | Flujo completo operativo end-to-end con el Excel de prueba |

### Fase 4 — Flujo de Aprobación y Diff

Objetivo: flujo completo de revisión y aprobación con visualización de diffs.

| **#** | **Tarea** | **Capa** | **Criterio de aceptación** |
|---|---|---|---|
| 4.1 | Implementar DiffService: compara malla nueva con malla base y genera registros en diff_malla | Backend | diff_malla contiene INSERT/UPDATE/DELETE correctos |
| 4.2 | Implementar MallaAprobacionService: transacción atómica de activación, archivado de malla anterior, actualización de Es_Vigente | Backend | Solo una malla vigente por programa en todos los escenarios |
| 4.3 | Implementar endpoints enviar-revision y revisar con sus validaciones (no puede revisar el mismo usuario que cargó) | Backend | RN-04 se cumple, estados transicionan correctamente |
| 4.4 | Implementar LogService y Eloquent Observers para registrar en log_actividad y diff_malla en cambios directos CRUD | Backend | Todo cambio queda registrado automáticamente |
| 4.5 | Implementar vista React de detalle de carga: estado actual, lista de errores, diff agrupado por entidad con colores INSERT/UPDATE/DELETE | Frontend | Revisor puede ver claramente qué cambió antes de aprobar |
| 4.6 | Implementar vista React del flujo de revisión: botones aprobar/rechazar con campo de comentario obligatorio al rechazar | Frontend | Flujo completo de aprobación operativo end-to-end |

### Fase 5 — Visualización de Mallas

Objetivo: interfaz de consulta de la malla vigente e historial de versiones.

| **#** | **Tarea** | **Capa** | **Criterio de aceptación** |
|---|---|---|---|
| 5.1 | Implementar endpoint GET /api/programas/{id}/malla-vigente con todos los componentes, agrupaciones, asignaturas y requisitos anidados | Backend | Respuesta JSON bien estructurada con todos los datos de la malla |
| 5.2 | Implementar endpoint GET /api/programas/{id}/mallas para el historial de versiones | Backend | Lista de versiones con fecha, estado y etiqueta |
| 5.3 | Implementar vista React de visualización de malla: árbol Componente -> Agrupación -> AsignaturaCard con créditos, semestre y badge de tipo | Frontend | Malla de Ingeniería Civil se muestra correctamente |
| 5.4 | Implementar cálculo y display de totales de créditos por componente y total de la malla | Frontend | Totales coinciden con los del Excel fuente |
| 5.5 | Implementar vista de comparación entre dos versiones con el diff visual | Frontend | Cambios entre versiones son identificables visualmente |

---

## 10. Convenciones de Código

### 10.1. Backend Laravel

- Nombres de clases: PascalCase. Métodos y variables: camelCase. Columnas de BD: Snake_Case_Con_Mayusculas según el modelo definido.
- Cada entidad tiene: Model, Migration, Controller (en `app/Http/Controllers/Api/`), Resource (en `app/Http/Resources/`), FormRequest de creación y de actualización.
- La lógica de negocio compleja (parseo Excel, diffs, aprobación) vive en Services en `app/Services/`.
- Los Jobs están en `app/Jobs/`. Ejemplo: `ProcessExcelUploadJob`.
- Los Observers están en `app/Observers/` y se registran en `AppServiceProvider`.
- Todas las rutas de la API están en `routes/api.php` agrupadas por módulo con prefijo de versión: `Route::prefix('v1')`.
- Las respuestas de error deben tener estructura: `{message: string, errors: {campo: [mensajes]}}`.

### 10.2. Frontend React

- Componentes: PascalCase en archivos `.jsx`. Hooks: camelCase con prefijo `use`.
- Estructura por feature: `src/pages/Catalogos/`, `src/pages/Cargas/`, `src/pages/Mallas/`.
- Las llamadas a la API se centralizan en `src/api/`: un archivo por recurso (`auth.js`, `catalogos.js`, `cargas.js`, `mallas.js`).
- El token de Sanctum se guarda en una variable de estado en un Context global (`AuthContext`), nunca en localStorage ni sessionStorage.
- Los estados de carga (loading, error, data) se manejan con un custom hook `useApi()` que envuelve axios.
- El polling del estado de carga usa `useEffect` con `setInterval` y se limpia en el cleanup.

### 10.3. Respuesta estándar de la API

```json
// Respuesta exitosa
{ "data": { ... }, "message": "Operación exitosa" }

// Respuesta de lista paginada
{ "data": [...], "meta": { "current_page": 1, "total": 50, "per_page": 20 }, "message": "" }

// Respuesta de error de validación (422)
{ "message": "Los datos proporcionados no son válidos.", "errors": { "Email_Usuario": ["El correo ya existe."] } }

// Respuesta de error genérico (500)
{ "message": "Error interno del servidor.", "data": null }
```

---

## 11. Instrucciones Directas para el Agente de Desarrollo

> *Esta sección es un resumen operativo para que el agente comience el desarrollo sin ambigüedades. Leer antes de generar cualquier código.*

### 11.1. Restricciones no negociables

- El backend es Laravel 12. No usar otro framework PHP.
- El frontend es React 19 con Vite. No usar otro framework JavaScript.
- La base de datos es MySQL 8. No usar PostgreSQL ni SQLite.
- No usar Inertia.js. La comunicación es estrictamente API REST + SPA separados.
- No usar localStorage para el token. Usar Context API de React en memoria.
- No eliminar registros físicamente. Solo desactivar con campo `Activo_*` o `Esta_Activo`.
- No poner lógica de negocio en Controllers. Usar Services.

### 11.2. Orden de desarrollo recomendado

1. Clonar estructura de directorios (`backend/` y `frontend/` separados).
2. Ejecutar Fase 1 completa: proyecto, migraciones, seeders, auth.
3. Verificar que `POST /api/auth/request-otp` envía el correo y `POST /api/auth/verify-otp` devuelve token antes de continuar.
4. Ejecutar Fase 2: catálogos. Primero backend completo, luego frontend.
5. Cargar datos reales de UNAL Manizales usando los seeders o el CRUD.
6. Ejecutar Fase 3 con el Excel de prueba: `Plan_Ingenieri_a_Civil_2.xlsx`.
7. Ejecutar Fase 4. Probar el flujo completo con dos usuarios diferentes.
8. Ejecutar Fase 5. Verificar que los totales de créditos son correctos.

### 11.3. Datos de prueba disponibles

- Archivo Excel de referencia: `Plan_Ingenieri_a_Civil_2.xlsx` (Programa: Ingeniería Civil, Normativa: Acuerdo 15 de 2025).
- El Excel tiene las hojas: BD, Sedes, Facultad, Programa, Normativa, MALLA, Asignaturas, Electivas.
- El parser solo lee MALLA y ELECTIVAS. Las demás son de referencia.

**Problemas conocidos del Excel de prueba** (identificados en análisis del archivo real):

- **4 asignaturas sin Codigo_Asignatura** (errores bloqueantes RF-CE-05): INGENIERIA ECONOMICA, PROGRAMACION Y PRESUPUESTO OBRA, FORMULACION Y EVALUACION DE PROYECTOS, QUIMICA PARA INGENIERIA CIVIL. Cada una genera un registro de severidad 'error' en error_carga y su fila no se procesa.
- **4 registros con saltos de línea internos (`\n`)** en nombre o código: APLICACIONES DE ELEMENTOS FINITOS, PROGRAMACION DE COMPUTADORES, ESTATICA y otro. El parser resuelve esto con `trim()` y limpieza de `\n` (RF-CE-04).
- **2 asignaturas con requisito de texto libre** no estructurado (TRABAJO DE GRADO y CURSOS EN POSGRADO): su requisito es "Haber aprobado 70 créditos del componente disciplinar o profesional (80% del total)". El parser debe derivar este texto a Descripcion_Requisito (RF-CE-12).
- La columna 'Obligatoria' usa SI/NO en lugar del enum obligatoria|optativa|libre_eleccion. El parser aplica el mapeo SI → obligatoria, NO → optativa (RF-CE-11).
- El Excel suma 227 créditos pero el programa tiene 179 créditos oficiales. La diferencia se debe a 19 asignaturas que aparecen en más de una agrupación. El sistema debe contar créditos únicos por asignatura (por Codigo_Asignatura), no por fila.

### 11.4. Configuración del servidor de producción

| **Parámetro** | **Valor** | **Donde configurar** |
|---|---|---|
| Servidor web | Apache 2.4.62 | Ya instalado en FreeBSD |
| PHP | 8.3.8 | Ya instalado en FreeBSD |
| MySQL | 8.0+ requerido | Verificar versión instalada |
| max_allowed_packet | 64M mínimo | my.cnf — para soportar archivos Excel grandes en LONGBLOB |
| character-set-server | utf8mb4 | my.cnf |
| collation-server | utf8mb4_unicode_ci | my.cnf |
| default-time-zone | +00:00 | my.cnf |
| Apache mod_rewrite | Habilitado | Necesario para las rutas de Laravel |
| Apache AllowOverride | All | .htaccess de Laravel debe funcionar |
| PHP extension: pdo_mysql | Habilitada | Requerida por Laravel |
| PHP extension: fileinfo | Habilitada | Requerida por Laravel Excel |
| PHP extension: zip | Habilitada | Requerida por Laravel Excel para .xlsx |
