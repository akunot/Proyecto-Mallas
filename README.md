# Sistema de Gestión de Mallas Académicas — UNAL Manizales

> **Nota:** El documento de especificación completo del sistema se encuentra en `requerimientos_mallas_unal_v5.md`. Este README es una referencia rápida para el desarrollo.

---

## Metadatos del proyecto

| **Campo** | **Valor** |
|---|---|
| Proyecto | Sistema de Gestión de Mallas Académicas |
| Cliente | Universidad Nacional de Colombia - Sede Manizales |
| Stack | Laravel 12 + React 19 + MySQL 8 + Apache 2.4 |
| Arquitectura | API REST (Laravel) + SPA (React) + Vite |
| Autenticación | Laravel Sanctum con OTP de 6 dígitos por correo (sin contraseña) |
| Tipo de sistema | Panel administrativo cerrado, usuarios contados |
| Versión actual | 5.0 — Abril 2026 |

---

## Historial de cambios

| Versión | Fecha | Resumen |
|---|---|---|
| 1.0 | Marzo 2026 | Versión inicial |
| 4.0 | Abril 2026 | `agrupacion` pasa de `ID_Malla` a `ID_Programa`; `agrupacion_asignatura` recibe `ID_Malla`; se añade `Codigo_Facultad` a `facultad`; se añade `Tipo_Agrupacion` a `agrupacion`; nuevas restricciones UNIQUE |
| 5.0 | Abril 2026 | Carga masiva dividida en tres archivos separados; `carga_malla` reemplaza `ID_Archivo` único por tres FKs; flujo de subida en dos fases (subida progresiva + lanzamiento); nuevos estados `esperando_archivos` y `listo_para_procesar`; API de cargas dividida en tres endpoints |

---

## Stack técnico

| **Capa** | **Tecnología** | **Versión** |
|---|---|---|
| Base de datos | MySQL | 8.0+ |
| Backend | Laravel | 12.x |
| Autenticación | Laravel Sanctum | 4.x |
| Lectura Excel | Laravel Excel (Maatwebsite) | 3.x |
| Frontend | React | 19.2 |
| Build tool | Vite | 6.x |
| Routing frontend | React Router | 7.x |
| HTTP client | Axios | 1.x |
| Servidor web | Apache | 2.4.62 (FreeBSD) |
| PHP | PHP | 8.3.8 (FreeBSD) |

---

## Estructura del repositorio

```
mallas-unal/
  backend/                        # Proyecto Laravel 12
    app/
      Http/Controllers/Api/       # Controladores de la API REST
      Http/Resources/             # API Resources (transformadores JSON)
      Http/Requests/              # Form Requests (validación)
      Models/                     # Modelos Eloquent
      Services/                   # Lógica de negocio
      Jobs/                       # Procesamiento asincrónico de cargas
    database/
      migrations/                 # Migraciones de todas las tablas
      seeders/                    # Datos iniciales
    routes/api.php                # Todas las rutas de la API
  frontend/                       # Proyecto React 19 + Vite
    src/
      components/                 # Componentes reutilizables
      pages/                      # Vistas por ruta
      api/                        # Funciones de llamada a la API
      hooks/                      # Custom hooks
      store/                      # Estado global (Context API)
```

---

## Cambios críticos de modelo de BD (v4 + v5)

Antes de implementar, revisar estos cambios en el documento de requerimientos (sección 3.17):

| **Tabla** | **Cambio** |
|---|---|
| `agrupacion` | `ID_Malla` → `ID_Programa` + nuevo campo `Tipo_Agrupacion` |
| `agrupacion_asignatura` | Nuevo campo `ID_Malla FK` + restricción UNIQUE |
| `facultad` | Nuevo campo `Codigo_Facultad VARCHAR(20) UNIQUE` |
| `archivo_excel` | Nuevo campo `Tipo_Archivo VARCHAR(20)` |
| `carga_malla` | `ID_Archivo` reemplazado por tres FKs + nuevos campos `ID_Programa`, `ID_Normativa` |

---

## Flujo de carga masiva (v5)

La carga de una malla ahora requiere **tres archivos separados** y una subida en dos fases:

```
POST /api/cargas              → crea la carga (estado: esperando_archivos)
POST /api/cargas/{id}/archivo → sube archivo tipo: asignaturas
POST /api/cargas/{id}/archivo → sube archivo tipo: electivas
POST /api/cargas/{id}/archivo → sube archivo tipo: malla
                              → estado cambia automáticamente a: listo_para_procesar
POST /api/cargas/{id}/procesar → lanza el Job de procesamiento
```

El Job procesa en orden estricto: **asignaturas → electivas → malla**. Ver sección 4.3 y 4.4 del documento de requerimientos para el flujo completo y diagramas.

---

## Datos de prueba

- **Archivo Excel:** `Plan_Ingenieri_a_Civil_2.xlsx`
- **Hojas relevantes:** Asignaturas, Electivas, MALLA
- **Para Fase 3:** separar el Excel en tres archivos individuales (uno por hoja)
- **Créditos totales reales del programa:** 179 (el Excel reporta 227 por asignaturas repetidas en múltiples agrupaciones)

---

## Referencia rápida de restricciones

- No eliminar registros físicamente (solo desactivar).
- No poner lógica de negocio en Controllers (usar Services).
- Las agrupaciones pertenecen al **Programa**, no a la malla.
- `POST /api/cargas` **no recibe archivos**. Solo `POST /api/cargas/{id}/archivo`.
- El Job solo se lanza si `Estado_Carga = listo_para_procesar`.

---

*Para el detalle completo del modelo de BD, requerimientos funcionales, endpoints, plan de fases y convenciones de código, ver `requerimientos_mallas_unal_v5.md`.*
