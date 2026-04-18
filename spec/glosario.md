# Glosario de Specs — Sistema de Mallas UNAL Manizales

> Este archivo es la fuente de verdad para términos y definiciones compartidas entre todas las specs.
> Antes de escribir o leer cualquier otra spec, leer este archivo primero.

---

## Actores

| Actor | Descripción |
|-------|-------------|
| **Administrador** | Carga archivos Excel, gestiona catálogos, inicia el proceso de aprobación enviando una carga a revisión. Puede aprobar o rechazar cargas en estado `pendiente_aprobacion`.
| **Sistema** | Ejecuta validaciones, genera diffs y actualiza estados automáticamente (Jobs, Observers). |

---

## Estados de `carga_malla.Estado`

| Estado | Significado |
|--------|-------------|
| `iniciado` | El archivo fue recibido y guardado. El Job aún no comenzó. |
| `validando` | El Job está procesando el archivo. |
| `borrador` | Procesamiento completado sin errores bloqueantes. Listo para enviar a revisión. |
| `con_errores` | Procesamiento completado pero con errores de severidad `error`. No puede enviarse a revisión hasta corregir. |
| `pendiente_aprobacion` | El creador lo envió a revisión. Esperando acción de un administrador. |
| `aprobado` | Un administrador aprobó la carga.
| `rechazado` | Un administrador rechazó la carga. La malla_curricular asociada está `rechazada`. |

---

## Estados de `malla_curricular.Estado`

| Estado | Significado |
|--------|-------------|
| `borrador` | Creada por el parser, aún no aprobada. |
| `activa` | Malla vigente del programa. Solo puede haber una por programa. |
| `archivada` | Fue vigente pero una nueva malla fue aprobada. |
| `rechazada` | La carga asociada fue rechazada por el administrador. |

---

## Severidad de errores en `error_carga`

| Severidad | Comportamiento |
|-----------|----------------|
| `error` | La fila **no se procesa**. El resto del archivo sigue. La carga queda en estado `con_errores`. |
| `advertencia` | La fila **sí se procesa** usando la lógica de fallback definida. La carga puede quedar en `borrador`. |

---

## Tipos de requisito

| Valor en BD | Significado |
|-------------|-------------|
| `prerequisito` | Asignatura que debe aprobarse antes. |
| `correquisito` | Asignatura que debe cursarse simultáneamente. |
| `creditos_minimos` | El estudiante debe tener N créditos aprobados. |
| *(texto libre)* | Se almacena en `Descripcion_Requisito`. Los campos de FK y créditos quedan en NULL. |

---

## Tipos de asignatura

| Valor en BD | Origen |
|-------------|--------|
| `obligatoria` | Hoja MALLA, columna Obligatoria = `SI` |
| `optativa` | Hoja MALLA, columna Obligatoria = `NO` |
| `libre_eleccion` | Hoja ELECTIVAS (sin excepción) |

---

## Invariantes de sistema (deben cumplirse siempre)

- **INV-01**: `COUNT(malla_curricular WHERE ID_Programa = X AND Es_Vigente = 1) <= 1` para todo programa X.
  Garantizado por el UNIQUE INDEX sobre la columna generada `Vigente_Prog_ID`.

- **INV-02**: Si `carga_malla.Estado = 'aprobado'` entonces su `malla_curricular.Estado = 'activa'` y `Es_Vigente = 1`.

- **INV-03**: Ningún registro de `sede`, `facultad`, `programa`, `normativa`, `componente` o `asignatura` se elimina físicamente. Solo se desactiva.

- **INV-04**: Ningún registro de `log_actividad` puede ser modificado o eliminado por ningún usuario.

---

## Convención de respuestas de la API

```json
// Éxito con recurso
{ "data": { ... }, "message": "Operación exitosa" }

// Éxito con lista paginada
{ "data": [...], "meta": { "current_page": 1, "total": 50, "per_page": 20 }, "message": "" }

// Error de validación (422)
{ "message": "Los datos proporcionados no son válidos.", "errors": { "campo": ["mensaje"] } }

// Error de negocio (403, 409, etc.)
{ "message": "Descripción del error.", "data": null }

// Error interno (500)
{ "message": "Error interno del servidor.", "data": null }
```