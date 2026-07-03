# Sistema de Gestión de Mallas Académicas — UNAL Manizales

> **Nota:** La documentación técnica completa del sistema se encuentra en `documentacion_tecnica.md`. Este README es una referencia rápida para el desarrollo.

---

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/akunot/Proyecto-Mallas)

## Metadatos del proyecto

| **Campo**       | **Valor**                                                        |
| --------------- | ---------------------------------------------------------------- |
| Proyecto        | Sistema de Gestión de Mallas Académicas                          |
| Cliente         | Universidad Nacional de Colombia - Sede Manizales                |
| Stack           | Laravel 12 + React 19 + MySQL 8 + Inertia.js 2.0                 |
| Arquitectura    | Monolito modular (Laravel + Inertia + React)                     |
| Autenticación   | Laravel Sanctum con OTP de 6 dígitos por correo (sin contraseña) |
| Tipo de sistema | Panel administrativo cerrado, usuarios contados                  |
| Versión actual  | 5.4 — Julio 2026                                                 |

---

## Historial de cambios

| Versión | Fecha      | Resumen                                                                                                                                                                                                                                                                          |
| ------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | Marzo 2026 | Versión inicial                                                                                                                                                                                                                                                                  |
| 4.0     | Abril 2026 | `agrupacion` pasa de `ID_Malla` a `ID_Programa`; `agrupacion_asignatura` recibe `ID_Malla`; se añade `Codigo_Facultad` a `facultad`; se añade `Tipo_Agrupacion` a `agrupacion`; nuevas restricciones UNIQUE                                                                      |
| 5.0     | Abril 2026 | Carga masiva dividida en tres archivos separados; `carga_malla` reemplaza `ID_Archivo` único por tres FKs; flujo de subida en dos fases (subida progresiva + lanzamiento); nuevos estados `esperando_archivos` y `listo_para_procesar`; API de cargas dividida en tres endpoints |
| 5.2     | Abril 2026 | Integración de archivo OPTATIVA como cuarto paso opcional del Job                                                                                                                                                                                                                |
| 5.3     | Junio 2026 | Migración a Inertia.js 2.0; catálogos CRUD migrados a vistas Inertia; endpoint público de visualización; mejoras en validación y parser de Excel                                                                                                                                 |
| 5.4     | Julio 2026 | Refactor visualizador a `MallaVisualizerService` con cache; `MallaPublicaController` extraído; tests E2E de carga, errores humanos, lifecycle y optativas (145 tests, 285 assertions); Docker + supervisor + queue worker                                                        |

---

## Stack técnico

| **Capa**         | **Tecnología**              | **Versión**      |
| ---------------- | --------------------------- | ---------------- |
| Base de datos    | MySQL                       | 8.0+             |
| Backend          | Laravel                     | 12.x             |
| Autenticación    | Laravel Sanctum             | 4.x              |
| Lectura Excel    | Laravel Excel (Maatwebsite) | 3.x              |
| Frontend         | React                       | 19.2             |
| Integration      | Inertia.js                  | 2.0              |
| Build tool       | Vite                        | 6.x              |
| Routing frontend | React Router                | 7.x              |
| HTTP client      | Axios                       | 1.x              |
| Servidor web     | Apache                      | 2.4.62 (FreeBSD) |
| PHP              | PHP                         | 8.3.8 (FreeBSD)  |

---

## Estructura del repositorio

```
mallas/
  app/                        # Backend Laravel 12
    Http/Controllers/         # Api/* (API REST), MallaPublicaController (Inertia)
    Http/Resources/           # API Resources
    Http/Requests/            # Form Requests
    Models/                   # Modelos Eloquent
    Services/                 # Lógica de negocio
    Jobs/                     # Procesamiento asincrónico (ProcesarExcelJob)
  database/
    migrations/               # Migraciones de todas las tablas
    seeders/                  # Datos iniciales
  routes/
    api.php                   # Rutas API REST
    web.php                   # Rutas web (Inertia)
  resources/js/               # Frontend React 19 + Vite + Inertia
    components/
    pages/
    api/
    hooks/
    store/
  tests/                      # Tests Pest/PHPUnit
    Feature/Api/              # Tests E2E de API
    Unit/                     # Tests unitarios
  docker/                     # Config Docker (nginx, php-fpm, supervisor)
  docker-compose.yml          # Orquestación (mysql + app)
  Dockerfile                  # Imagen multi-etapa
```

---

## Cambios críticos de modelo de BD (v4 + v5)

Antes de implementar, revisar estos cambios en el documento de requerimientos (sección 3.17):

| **Tabla**               | **Cambio**                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------- |
| `agrupacion`            | `ID_Malla` → `ID_Programa` + nuevo campo `Tipo_Agrupacion`                          |
| `agrupacion_asignatura` | Nuevo campo `ID_Malla FK` + restricción UNIQUE                                      |
| `facultad`              | Nuevo campo `Codigo_Facultad VARCHAR(20) UNIQUE`                                    |
| `archivo_excel`         | Nuevo campo `Tipo_Archivo VARCHAR(20)`                                              |
| `carga_malla`           | `ID_Archivo` reemplazado por tres FKs + nuevos campos `ID_Programa`, `ID_Normativa` |

---

## Despliegue con Docker

```bash
docker-compose up -d     # Inicia MySQL + app con nginx + php-fpm + queue worker
docker-compose down      # Detiene todo
```

El queue worker corre automáticamente via supervisor dentro del contenedor `app`.

### Entorno local

Si no usas Docker, necesitas:

1. Servidor web apuntando a `public/`
2. MySQL 8 corriendo
3. `php artisan migrate`
4. `npm run dev` para el frontend
5. **`php artisan queue:work --queue=default`** para procesar cargas Excel

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

## Tests

145 tests (285 assertions) — Pest PHP v4 con MySQL real.

```bash
php artisan test
```

## Datos de prueba

Archivos Excel en `files_tests/`:

- `FORMATO - SEDES.xlsx` (1 registro)
- `FORMATO - FACULTADES.xlsx` (4 registros)
- `FORMATO - PROGRAMAS.xlsx` (15 programas)
- `FORMATO - AGRUPACIONES ING. CIVIL_.xlsx` (18 agrupaciones)
- `FORMATO - NORMATIVA.xlsx` (11 normativas)
- `FORMATO DE CARGA - ASIGNATURAS.xlsx` (2464 asignaturas)
- `FORMATO DE CARGA - ELECTIVAS.xlsx` (1000 electivas)
- `FORMATO DE CARGA - ING. CIVIL .xlsx` (75 filas de malla)
- `FORMATO DE CARGA - OPTATIVA.xlsx` (archivo complementario)

**Créditos totales reales del programa:** 179 (el Excel reporta 227 por asignaturas repetidas en múltiples agrupaciones)

---

## Referencia rápida de restricciones

- No eliminar registros físicamente (solo desactivar).
- No poner lógica de negocio en Controllers (usar Services).
- Las agrupaciones pertenecen al **Programa**, no a la malla.
- `POST /api/cargas` **no recibe archivos**. Solo `POST /api/cargas/{id}/archivo`.
- El Job solo se lanza si `Estado_Carga = listo_para_procesar`.

---

_Para el detalle completo del modelo de BD, requerimientos funcionales, endpoints, plan de fases y convenciones de código, ver `requerimientos_mallas_unal_v5.md`._
