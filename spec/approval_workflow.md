# Spec: Flujo de Aprobación de Mallas

> RFs cubiertos: RF-AP-01 al RF-AP-06, RN-01, RN-03, RN-04, RN-05, RN-06, RNF-07
> Leer `_glosario.md` antes de esta spec.

---

## 1. Responsabilidades y límites

| Clase | Responsabilidad |
|-------|----------------|
| `MallaAprobacionService` | Ejecuta las transiciones de estado y la transacción atómica de aprobación. |
| `DiffCalculatorService` | Calcula diferencias entre malla nueva y malla base. Genera registros `diff_malla`. |
| `LogService` / Observers | Registra en `log_actividad` cada acción significativa. |

**Lo que NO hace esta spec:**
- No define el parseo del Excel (ver `excel_parser.md`).
- No define la visualización del diff en el frontend (ver `malla_visualization.md`).

---

## 2. Máquina de estados de `carga_malla`

```
                    ┌─────────────┐
     Job inicia     │             │
  ┌─────────────────►  validando  │
  │                 │             │
  │                 └──────┬──────┘
  │                        │
  │          ┌─────────────┼──────────────┐
  │          │             │              │
  │    sin errores    con errores        fallo
  │    bloqueantes    de severidad      total
  │          │        'error'          del Job
  │          ▼             │              │
  │      ┌───────┐         ▼              ▼
  │      │borrador│    ┌────────────┐  ┌────────────┐
  │      └───┬───┘    │ con_errores│  │ con_errores│
  │          │        └────────────┘  └────────────┘
  │    solo creador
  │    puede enviar
  │          ▼
  │  ┌──────────────────────┐
  │  │ pendiente_aprobacion │
  │  └──────────┬───────────┘
  │             │
  │    ┌────────┴────────┐
  │    │                 │
  │  aprobar          rechazar
  │ (administrador)  (administrador)
  │    │                 │
  │    ▼                 ▼
  │ ┌──────────┐    ┌──────────┐
  │ │ aprobado │    │rechazado │
  │ └──────────┘    └──────────┘
  │
┌─┘
│ iniciado  ←── estado inicial al crear carga_malla
└───────────
```

### 2.1 Transiciones permitidas

| Transición | Desde | Hacia | Actor | Validación |
|------------|-------|-------|-------|------------|
| T-01 | `iniciado` | `validando` | Sistema (Job inicia) | Automático al despachar Job |
| T-02 | `validando` | `borrador` | Sistema (Job completa sin errores bloqueantes) | — |
| T-03 | `validando` | `con_errores` | Sistema (Job completa con errores bloqueantes) | — |
| T-04 | `validando` | `con_errores` | Sistema (Job falla 3 veces) | — |
| T-05 | `borrador` | `pendiente_aprobacion` | Usuario creador de la carga | Ver §3 |
| T-06 | `pendiente_aprobacion` | `aprobado` | administrador | Ver §4 |
| T-07 | `pendiente_aprobacion` | `rechazado` | administrador | Ver §5 |

**Ninguna otra transición está permitida.** Intentar una transición no listada devuelve `422`.

---

## 3. Envío a revisión — T-05

### 3.1 Endpoint

```
PATCH /api/cargas/{id}/enviar-revision
Authorization: Bearer {token}
Body: (vacío)
```

### 3.2 Validaciones en orden

```
1. Carga existe y pertenece al sistema → si no: 404
2. Usuario autenticado === carga.ID_Usuario → si no: 403
   Mensaje: "Solo el usuario que cargó puede enviar a revisión."
3. carga.Estado === 'borrador' → si no: 422
   Mensaje: "Solo se puede enviar a revisión una carga en estado borrador. Estado actual: {estado}"
```

### 3.3 Acción si todas las validaciones pasan

```
carga_malla.Estado = 'pendiente_aprobacion'
log_actividad: Accion_Log = 'ENVIAR_REVISION', Entidad_Log = 'carga_malla', Entidad_ID_Log = carga.ID_Carga
```

### 3.4 Respuesta

```json
// 200 OK
{
  "data": {
    "carga_id": 5,
    "estado": "pendiente_aprobacion"
  },
  "message": "Carga enviada a revisión correctamente."
}
```

---

## 4. Aprobación — T-06

### 4.1 Endpoint

```
PATCH /api/cargas/{id}/revisar
Authorization: Bearer {token}
Body:
{
  "accion": "aprobar",
  "comentario": "string|null"   ← opcional al aprobar
}
```

### 4.2 Validaciones en orden

```
1. Carga existe → si no: 404
2. carga.Estado === 'pendiente_aprobacion' → si no: 422
3. Usuario autenticado !== carga.ID_Usuario → si no: 403
   Mensaje: "El mismo usuario que cargó no puede revisar la carga." (RN-04)
```

### 4.3 Transacción atómica de aprobación (RF-AP-04, RN-01, RN-03, RNF-07)

**Todo lo siguiente ocurre dentro de un único `DB::transaction()`. Si cualquier paso falla, se hace rollback completo.**

```
PASO 1: carga_malla.Estado = 'aprobado'
        carga_malla.ID_Usuario_administrador = usuario_actual.ID_Usuario
        carga_malla.Comentario_administrador = comentario (puede ser null)
        carga_malla.Fecha_Revision = now()

PASO 2: malla_curricular (asociada a esta carga):
        .Estado = 'activa'
        .Es_Vigente = 1
        .Fecha_Vigencia = today() (si no tiene valor ya)

PASO 3: Buscar malla anterior del mismo programa:
        SELECT * FROM malla_curricular
        WHERE ID_Programa = malla_nueva.ID_Programa
          AND Es_Vigente = 1
          AND ID_Malla != malla_nueva.ID_Malla

        Si existe:
          .Estado = 'archivada'
          .Es_Vigente = 0
          .Fecha_Fin_Vigencia = today()

PASO 4 (verificación de invariante antes de commit):
        COUNT(Es_Vigente = 1 WHERE ID_Programa = X) debe ser exactamente 1.
        Si no → lanzar excepción → rollback → 500 con mensaje descriptivo.

PASO 5: log_actividad:
        Accion_Log = 'APROBAR_MALLA'
        Entidad_Log = 'malla_curricular'
        Entidad_ID_Log = malla_nueva.ID_Malla
        Detalle_Log = { "malla_archivada_id": N }  ← si hubo malla archivada
```

### 4.4 Respuesta

```json
// 200 OK
{
  "data": {
    "carga_id": 5,
    "estado": "aprobado",
    "malla_id": 3,
    "malla_archivada_id": 2   // null si era la primera versión
  },
  "message": "Malla aprobada y activada correctamente."
}
```

---

## 5. Rechazo — T-07

### 5.1 Endpoint

```
PATCH /api/cargas/{id}/revisar
Body:
{
  "accion": "rechazar",
  "comentario": "string"   ← OBLIGATORIO al rechazar (FormRequest)
}
```

### 5.2 Validaciones en orden

```
(Las mismas 1, 2, 3 de §4.2)
4. comentario no está vacío → si no: 422
   Mensaje: "El comentario es obligatorio al rechazar una carga."
```

### 5.3 Acciones

```
carga_malla.Estado = 'rechazado'
carga_malla.ID_Usuario_administrador = usuario_actual.ID_Usuario
carga_malla.Comentario_administrador = comentario
carga_malla.Fecha_Revision = now()

malla_curricular.Estado = 'rechazada'
malla_curricular.Es_Vigente = 0  ← ya debería ser 0, pero se confirma

log_actividad:
  Accion_Log = 'RECHAZAR_MALLA'
  Entidad_Log = 'carga_malla'
  Entidad_ID_Log = carga.ID_Carga
  Detalle_Log = { "comentario": "..." }
```

### 5.4 Respuesta

```json
// 200 OK
{
  "data": {
    "carga_id": 5,
    "estado": "rechazado"
  },
  "message": "Carga rechazada. La malla no fue activada."
}
```

---

## 6. DiffCalculatorService (RF-AP-06, RF-CE-09)

### 6.1 Cuándo se ejecuta

El diff se calcula **al finalizar el parseo del Excel**, dentro del mismo `ProcesarExcelJob`, antes de actualizar el estado de la carga a `borrador`. Se usa la `malla_base_id` que el usuario seleccionó al cargar (puede ser null si es la primera versión).

### 6.2 Lógica de comparación

```
Si malla_base_id == null:
  → Todos los registros de la malla nueva se registran como INSERT.
  → No hay UPDATE ni DELETE.

Si malla_base_id tiene valor:
  Comparar por entidad:

  ASIGNATURAS:
    INSERT: Codigo_Asignatura existe en nueva pero no en base
    DELETE: Codigo_Asignatura existe en base pero no en nueva
    UPDATE: mismo Codigo_Asignatura pero algún campo difiere
            (Nombre, Créditos, Horas_Presencial, Horas_Estudiante)

  AGRUPACIONES:
    INSERT: Componente + Nombre_Agrupacion existe en nueva pero no en base
    DELETE: existe en base pero no en nueva
    UPDATE: mismo Componente + Nombre pero Creditos_Requeridos o Creditos_Maximos difieren

  ASIGNACIONES (agrupacion_asignatura):
    INSERT: combinación ID_Agrupacion + ID_Asignatura es nueva
    DELETE: combinación existía en base pero no en nueva
    UPDATE: misma combinación pero Tipo_Asignatura o Semestre_Sugerido difieren

  REQUISITOS:
    INSERT: requisito nuevo para una asignatura
    DELETE: requisito eliminado
    UPDATE: mismo requisito pero Tipo o descripción cambiaron
```

### 6.3 Estructura de `diff_malla`

```sql
INSERT INTO diff_malla (
  ID_Carga,
  Entidad_Afectada,   -- 'asignatura' | 'agrupacion' | 'agrupacion_asignatura' | 'requisito'
  Tipo_Cambio,        -- 'INSERT' | 'UPDATE' | 'DELETE'
  ID_Registro,        -- ID del registro en la malla NUEVA (null si DELETE puro)
  Valor_Anterior,     -- JSON con estado completo antes (null si INSERT)
  Valor_Nuevo         -- JSON con estado completo después (null si DELETE)
)
```

### 6.4 Endpoint para consultar el diff (RF-AP-06)

```
GET /api/cargas/{id}/diff
Authorization: Bearer {token}

Respuesta 200:
{
  "data": {
    "total_inserts": 12,
    "total_updates": 3,
    "total_deletes": 1,
    "por_entidad": {
      "asignatura": [
        {
          "tipo": "INSERT",
          "id_registro": 45,
          "valor_anterior": null,
          "valor_nuevo": { "Codigo_Asignatura": "1234", "Nombre_Asignatura": "...", "Creditos": 3 }
        },
        ...
      ],
      "agrupacion": [ ... ],
      "agrupacion_asignatura": [ ... ],
      "requisito": [ ... ]
    }
  },
  "message": ""
}
```

---

## 7. Registro de cambios CRUD directos sobre mallas (RN-05, RN-06)

### 7.1 Regla general

Cualquier cambio directo por CRUD (endpoints de §7.4 del requerimiento) sobre `agrupacion`, `agrupacion_asignatura` o `requisito` debe:

1. **Verificar que la malla NO esté en estado `activa`** (RN-06). Si lo está → 422.
   ```json
   { "message": "No se puede editar una malla activa directamente. Inicia una nueva carga." }
   ```

2. Registrar en `diff_malla` el cambio (Valor_Anterior y Valor_Nuevo en JSON).

3. Registrar en `log_actividad`.

### 7.2 Implementación sugerida: Eloquent Observers

```php
// app/Observers/AgrupacionObserver.php
public function updated(Agrupacion $agrupacion): void
{
    // Registrar en diff_malla si hay una carga activa asociada
    // Registrar en log_actividad siempre
}
```

Registrar el Observer en `AppServiceProvider::boot()`.

---

## 8. Criterios de aceptación completos

### CA-AP-01: Transición inválida
```
Given: carga en estado 'con_errores'
When: usuario creador llama PATCH /api/cargas/{id}/enviar-revision
Then: respuesta 422, mensaje incluye el estado actual
  AND: carga_malla.Estado sigue siendo 'con_errores'
```

### CA-AP-02: Aprobación archiva malla anterior (RN-01, RN-03)
```
Given: programa X con malla_curricular ID=2 en estado 'activa', Es_Vigente=1
  AND: nueva carga ID=5 con malla_curricular ID=3 en 'pendiente_aprobacion'
When: administrador B aprueba la carga ID=5
Then: (todo en la misma transacción)
  carga_malla ID=5: Estado = 'aprobado'
  malla_curricular ID=3: Estado = 'activa', Es_Vigente = 1
  malla_curricular ID=2: Estado = 'archivada', Es_Vigente = 0, Fecha_Fin_Vigencia = hoy
  COUNT(Es_Vigente=1 WHERE ID_Programa=X) = 1
```

### CA-AP-03: Primera versión sin malla anterior
```
Given: programa Y sin ninguna malla curricular previa
When: administrador aprueba la primera carga
Then: malla_curricular nueva: Estado = 'activa', Es_Vigente = 1
  AND: no hay UPDATE en ninguna otra malla_curricular
  AND: respuesta incluye malla_archivada_id: null
```

### CA-AP-04: Rechazo requiere comentario
```
Given: carga en 'pendiente_aprobacion'
When: administrador llama PATCH /api/cargas/{id}/revisar con { accion: 'rechazar' } sin comentario
Then: respuesta 422, campo 'comentario' en errors
  AND: carga_malla.Estado sigue siendo 'pendiente_aprobacion'
```

### CA-AP-05: Rechazo no altera malla anterior
```
Given: programa X con malla activa ID=2
  AND: carga ID=5 en 'pendiente_aprobacion' con malla ID=3
When: administrador rechaza la carga ID=5
Then: malla_curricular ID=3: Estado = 'rechazada', Es_Vigente = 0
  AND: malla_curricular ID=2: Estado sigue 'activa', Es_Vigente sigue 1
```

### CA-AP-06: Diff de primera versión
```
Given: malla_base_id = null al subir el Excel
When: DiffCalculatorService procesa
Then: todos los registros de la malla nueva aparecen como INSERT en diff_malla
  AND: no hay registros UPDATE ni DELETE
```

### CA-AP-07: Edición directa bloqueada en malla activa (RN-06)
```
Given: agrupacion ID=10 perteneciente a malla en estado 'activa'
When: cualquier usuario llama PUT /api/agrupaciones/10
Then: respuesta 422
  Mensaje: "No se puede editar una malla activa directamente. Inicia una nueva carga."
```

---

## 9. Estructura de archivos Laravel esperada

```
app/
  Http/
    Controllers/Api/
      CargaController.php           → enviarRevision(), revisar()
    Requests/
      EnviarRevisionRequest.php     → valida estado borrador
      RevisarCargaRequest.php       → valida accion (aprobar|rechazar), comentario obligatorio si rechazar
  Services/
    MallaAprobacionService.php      → enviarARevision(), aprobar(), rechazar()
    DiffCalculatorService.php       → calcularDiff(MallaCurricular $nueva, ?int $mallaBaseId)
    LogService.php                  → registrar(string $accion, string $entidad, int $id, array $detalle)
  Observers/
    AgrupacionObserver.php
    AgrupacionAsignaturaObserver.php
    RequisitoObserver.php
  Models/
    CargaMalla.php
    MallaCurricular.php
    DiffMalla.php
    LogActividad.php
```

---

## 10. Nota sobre el FormRequest de revisión

El `RevisarCargaRequest` tiene una regla condicional:

```php
public function rules(): array
{
    return [
        'accion'     => ['required', 'in:aprobar,rechazar'],
        'comentario' => [
            Rule::requiredIf(fn() => $this->input('accion') === 'rechazar'),
            'nullable',
            'string',
            'max:1000',
        ],
    ];
}
```

La validación de **quién puede revisar** (RN-04) se hace en `MallaAprobacionService`, no en el FormRequest, porque requiere acceso al modelo de la carga.