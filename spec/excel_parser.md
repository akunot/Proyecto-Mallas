# Spec: Carga y Parseo de Excel

> RFs cubiertos: RF-CE-01 al RF-CE-12, RN-02, RN-07, RNF-06, RNF-08
> Leer `_glosario.md` antes de esta spec.
>
> **v2 — Actualizada con análisis de archivos reales:**
> `Plan_Ingeniería_Civil.xlsx`, `Asignaturas.xlsx`, `Electivas.xlsx`

---

## 1. Responsabilidades y límites

### 1.1 Arquitectura de importación — tres fuentes de datos

Los archivos reales revelaron que la carga no es un solo Excel sino un conjunto de tres archivos complementarios. El sistema los procesa en **dos etapas distintas**:

#### Etapa A — Pre-importación del catálogo (Seeder / importación manual, una sola vez)

Estos dos archivos son el catálogo base de la sede. Se importan una vez como seeders o mediante un endpoint admin separado, **antes** de que el flujo de carga de mallas exista.

| Archivo | Hoja | Destino en BD | Acción |
|---------|------|---------------|--------|
| `Asignaturas.xlsx` | Hoja1 | `asignatura` | Importar las 2.043 asignaturas únicas del catálogo UNAL Manizales |
| `Electivas.xlsx` | Hoja1 | `asignatura` | Importar las 357 electivas (misma tabla, sin campo especial de tipo) |

Esta etapa la cubre **`AsignaturaCatalogSeeder`** (ver §9).

#### Etapa B — Carga de malla (flujo normal, por Excel de programa)

El archivo `Plan_Ingeniería_Civil.xlsx` contiene **múltiples hojas** que representan el contexto completo de un programa. El parser lee cada hoja en este orden:

| Hoja | Destino | Comportamiento |
|------|---------|----------------|
| `Sede` | `sede` | findOrCreate por nombre |
| `Facultades` | `facultad` | findOrCreate por ID externo o nombre |
| `Programas` | `programa` | findOrCreate por ID externo o código SNIES |
| `Normativas` | `normativa` | findOrCreate por tipo+número+año+programa |
| `Agrupacion {Programa}` | `agrupacion` | findOrCreate con Creditos_Requeridos y Es_Obligatoria |
| `MALLA {Programa}` | `asignatura` + `agrupacion_asignatura` + `requisito` | lógica principal de §4 |

> Si las hojas de contexto (Sede, Facultades, etc.) no existen en el Excel → el parser usa los valores de la BD o falla con error descriptivo.

### 1.2 Clases involucradas

| Clase | Responsabilidad |
|-------|----------------|
| `ExcelUploadService` | Recibe el archivo HTTP, valida duplicados, guarda en BD, despacha el Job. |
| `ExcelParserService` | Lee el Excel hoja por hoja, limpia datos, valida filas, persiste en el orden correcto. |
| `ProcesarExcelJob` | Envuelve al `ExcelParserService` para ejecución asincrónica con reintentos. |
| `AsignaturaCatalogSeeder` | Importa `Asignaturas.xlsx` y `Electivas.xlsx` al catálogo base (Etapa A). |

**Lo que NO hacen estas clases:**
- No calculan diffs (eso es `DiffCalculatorService`).
- No manejan el flujo de aprobación (eso es `MallaAprobacionService`).
- No modifican mallas en estado `activa`.

---

## 2. ExcelUploadService

### 2.1 Flujo de entrada

```
POST /api/cargas
  multipart/form-data:
    - archivo: file (.xlsx)
    - normativa_id: integer
    - malla_base_id: integer|null  (para calcular diff; si null = primera versión)
```

### 2.2 Pasos en orden

1. Validar que el archivo sea `.xlsx` (FormRequest).
2. Calcular `Hash_Sha256` del binario del archivo.
3. Verificar duplicado (RN-07): si existe un `archivo_excel` con el mismo `Hash_Sha256` para el mismo `ID_Programa` derivado de la normativa → **rechazar**.
4. Insertar en `archivo_excel` (LONGBLOB + hash + nombre + tamaño + usuario).
5. Insertar `malla_curricular` con `Estado = 'borrador'`, `Es_Vigente = 0`.
6. Insertar `carga_malla` con `Estado = 'iniciado'`, `ID_Malla_Base = malla_base_id`.
7. Despachar `ProcesarExcelJob` con el `ID_Carga`.
8. Responder `202 Accepted` con `{ data: { carga_id, estado: 'iniciado' }, message: '...' }`.

### 2.3 Respuesta de duplicado

```json
// 409 Conflict
{
  "message": "Este archivo ya fue cargado anteriormente para este programa.",
  "data": { "carga_id_original": 12, "fecha_carga_original": "2025-03-01T10:00:00Z" }
}
```

---

## 3. ProcesarExcelJob

### 3.1 Configuración del Job

```php
public int $tries = 3;
public array $backoff = [30, 60, 120]; // segundos entre reintentos (backoff exponencial)
public int $timeout = 120; // segundos máximos de ejecución
```

### 3.2 Flujo del Job

```
1. Actualizar carga_malla.Estado = 'validando'
2. Llamar ExcelParserService::procesar($carga)
3. Si completa sin excepción no recuperable:
     - Si error_carga tiene registros con severidad 'error':
         carga_malla.Estado = 'con_errores'
         malla_curricular.Estado = 'borrador'  ← la malla SÍ se crea aunque haya advertencias
     - Si no hay errores de severidad 'error':
         carga_malla.Estado = 'borrador'
         malla_curricular.Estado = 'borrador'
4. Si el Job falla (excepción no recuperable tras los 3 reintentos):
     carga_malla.Estado = 'con_errores'
     Registrar el error en log_actividad
```

> **Importante**: una carga con errores de severidad `advertencia` solamente termina en estado `borrador`, no en `con_errores`.

---

## 4. ExcelParserService — Hoja MALLA {Programa}

### 4.1 Hojas que lee el parser principal

| Hoja | Se procesa | Notas |
|------|------------|-------|
| `MALLA {Nombre}` | ✅ Sí | Fuente principal de asignaciones y requisitos |
| `Agrupacion {Nombre}` | ✅ Sí | Metadatos de agrupaciones (créditos, obligatoriedad) |
| `Sede`, `Facultades`, `Programas`, `Normativas` | ✅ Sí | Contexto: findOrCreate en sus tablas respectivas |
| `Asignaturas`, `Electivas` | ❌ No | Estas hojas están vacías en el Excel real; el catálogo viene de la Etapa A |
| `BD {Nombre}` | ❌ No | Hoja de referencia humana, no se parsea |

> **Hallazgo real**: las hojas `Asignaturas` y `Electivas` dentro del Plan_Ingeniería_Civil.xlsx están **vacías** (solo tienen encabezados). El catálogo de asignaturas proviene de los archivos separados `Asignaturas.xlsx` y `Electivas.xlsx` (Etapa A).

### 4.2 Columnas reales de la hoja MALLA {Programa}

| Columna (índice) | Nombre en Excel | Campo destino | Tipo real observado |
|-----------------|-----------------|---------------|---------------------|
| 0 | `Normativa` | `normativa.ID_Normativa` | **Entero** (ID directo, ej: 1.0) |
| 1 | `Componente` | `componente.Nombre_Componente` | String |
| 2 | `Agrupación` | `agrupacion.Nombre_Agrupacion` | String |
| 3 | `Código Asignatura` | `asignatura.Codigo_Asignatura` | Float/String (puede tener `\n`) |
| 4 | `Nombre Asignatura` | `asignatura.Nombre_Asignatura` | String (puede tener `\n`) |
| 5 | `Créditos` | `asignatura.Creditos_Asignatura` | Float → int |
| 6 | `Obligatoria` | `agrupacion_asignatura.Tipo_Asignatura` | `'SI'` / `'NO'` |
| 7 | `Tipo requisito` | `requisito.Tipo_Requisito` o `Descripcion_Requisito` | String o NULL |
| 8 | `Codigo asignatura o valor` | `requisito.ID_Agrup_Asig_Requerida` o `Creditos_Minimos` | Float/String/NULL |

> ⚠️ **Diferencia crítica respecto a la spec original**: la columna `Normativa` contiene el **ID entero** del registro en `normativa`, NO el nombre del acuerdo. El parser debe hacer `WHERE ID_Normativa = valor` en lugar de buscar por texto.

### 4.3 Columnas reales de la hoja Agrupacion {Programa}

| Columna | Nombre | Campo destino |
|---------|--------|---------------|
| 0 | `COMPONENTE` | `componente.Nombre_Componente` |
| 1 | `TIPO AGRUPACIÓN` | `agrupacion.Es_Obligatoria` (OBLIGATORIA→1, OPTATIVA→0) |
| 2 | `AGRUPACIÓN` | `agrupacion.Nombre_Agrupacion` |
| 3 | `CRÉDITOS EXIGIDOS` | `agrupacion.Creditos_Requeridos` |

> El parser lee esta hoja ANTES de procesar MALLA para poder crear/actualizar agrupaciones con sus créditos requeridos.
>
> La última fila de la hoja contiene solo un número (el total de créditos, ej: `143`). El parser debe ignorar filas donde `COMPONENTE` o `AGRUPACIÓN` estén vacíos.

### 4.4 Limpieza de celdas — casos reales encontrados

La función `cleanCell()` definida en §4.2 del documento original aplica, pero con estos casos adicionales confirmados en los datos reales:

```
Casos confirmados en MALLA Ing. Civil:

1. Nombre con \n al final:
   'APLICACIONES DE ELEMENTOS FINITOS\n'  →  'APLICACIONES DE ELEMENTOS FINITOS'
   'PROGRAMACIÓN DE COMPUTADORES APLICADOS A LA INGENIERIA CIVIL\n'  →  limpio

2. Código con \n embebido:
   '4201074\n'  →  '4201074'
   '\n4201065\n'  →  '4201065'

3. Nombre con \n al inicio y al final:
   '\nESTÁTICA\n'  →  'ESTÁTICA'

4. Código como float de Excel:
   1000004.0  →  cleanCodeCell()  →  '1000004'
```

**`cleanCodeCell(valor)`** — función específica para celdas de código:

```
1. Aplicar cleanCell(valor)
2. Si el resultado contiene '.', cortar en el punto y quedarse con la parte entera
   ('4201074.0' → '4201074')
3. Convertir a string limpio sin decimales
4. Si el resultado es vacío → retornar null (disparará el error de código faltante)
```

### 4.5 Comportamiento de findOrCreate para asignaturas

> **Cambio respecto a spec original**: el sistema crea las asignaturas que no existen en BD, en lugar de solo advertir.

```
PASO 2 — Asignatura (lógica actualizada):

  codigo = cleanCodeCell(row[3])

  Si codigo == null o vacío:
    → SKIP: registrar error bloqueante (§4.7)

  buscar = SELECT * FROM asignatura WHERE Codigo_Asignatura = codigo

  Si NO existe en BD:
    → INSERT asignatura con datos de la fila del Excel
    → (Los créditos y nombre vienen del Excel; Horas_Presencial y Horas_Estudiante = NULL si no hay datos)
    → Continuar con PASO 3

  Si SÍ existe y nombre difiere:
    → ADVERTENCIA en error_carga
    → Usar asignatura existente sin modificarla
    → Continuar con PASO 3

  Si SÍ existe y nombre igual:
    → Usar existente, continuar
```

> **Caso real**: los códigos `1000003` al `1000020` (asignaturas del Ciclo Básico UNAL como CÁLCULO DIFERENCIAL, ÁLGEBRA LINEAL, etc.) **no están en el catálogo `Asignaturas.xlsx`**. El parser los crea desde los datos de la hoja MALLA sin generar error.

### 4.6 Mapeo del campo "Obligatoria" (sin cambios)

```
cleanCell(valor) == 'SI'  →  Tipo_Asignatura = 'obligatoria'
cleanCell(valor) == 'NO'  →  Tipo_Asignatura = 'optativa'
Cualquier otro valor      →  Tipo_Asignatura = 'optativa' + advertencia en error_carga
```

> Las electivas no provienen de la hoja MALLA sino del `AsignaturaCatalogSeeder`. Su `Tipo_Asignatura = 'libre_eleccion'` se asigna en el seeder al vincularlas con la agrupación de libre elección.

### 4.7 Validaciones de fila y registro de errores

#### Error bloqueante — fila se salta (sin cambios en comportamiento)

```
Condición: cleanCodeCell(row[3]) == null o vacío

Casos reales confirmados:
  Fila 18: 'INGENIERÍA ECONÓMICA' — sin código
  Fila 19: 'PROGRAMACIÓN Y PRESUPUESTO OBRA' — sin código
  Fila 20: 'FORMULACIÓN Y EVALUACIÓN DE PROYECTOS' — sin código
  Fila 23: 'QUÍMICA PARA INGENIERÍA CIVIL' — sin código

Acción: INSERT error_carga con Severidad = 'error', continuar con siguiente fila.
```

#### Advertencia — fila se procesa con fallback

```
Condición: código existe en BD pero nombre difiere (después de cleanCell)

Acción: INSERT error_carga con Severidad = 'advertencia', usar asignatura existente.
```

### 4.8 Procesamiento de requisitos — casos reales

El campo `Codigo asignatura o valor` (columna 8) puede contener:

| Tipo de valor | Ejemplo real | Acción |
|--------------|-------------|--------|
| Float de código numérico | `1000004.0` | `cleanCodeCell()` → buscar `agrupacion_asignatura` por ese código en la misma malla |
| String de código con `\n` | `'\n4201065\n'` | `cleanCodeCell()` → limpiar y buscar |
| String de nombre de asignatura | `'QUÍMICA PARA INGENIERÍA CIVIL'` | Buscar `agrupacion_asignatura` por nombre de asignatura en la misma malla |
| Nulo | `None` | No crear registro en `requisito` |

**Resolución de prerrequisito por nombre de asignatura** (caso nuevo):

```
Si cleanCodeCell(valor) no es numérico → intentar como nombre:
  SELECT aa.ID_Agrup_Asig
  FROM agrupacion_asignatura aa
  JOIN agrupacion a ON aa.ID_Agrupacion = a.ID_Agrupacion
  JOIN asignatura s ON aa.ID_Asignatura = s.ID_Asignatura
  WHERE a.ID_Malla = $malla_id
    AND LOWER(s.Nombre_Asignatura) = LOWER(cleanCell(valor))
  LIMIT 1

Si encuentra resultado → ID_Agrup_Asig_Requerida = resultado
Si NO encuentra → Descripcion_Requisito = valor limpio, FKs = NULL (sin error)
```

**Casos reales de prereq por nombre** (asignaturas sin código):
- `'QUÍMICA PARA INGENIERÍA CIVIL'` referenciada desde HIDROLOGÍA, SANEAMIENTO AMBIENTAL, MATERIALES PARA LA CONSTRUCCIÓN

**Casos de texto libre en Tipo_Requisito** (sin cambios de comportamiento):
- Filas 69-70: `'Haber aprobado 70 créditos del componente disciplinar o profesional...'`
  → `Descripcion_Requisito` = texto completo, FKs = NULL, sin error

### 4.9 Orden de inserción completo por fila

```
Para cada fila de la hoja MALLA (saltando filas completamente vacías):

  PASO 0 — Verificar que la fila no esté completamente vacía → SKIP si lo está

  PASO 1 — Validar código (§4.7). Si falla → registrar error → SKIP fila.

  PASO 2 — Asignatura: findOrCreate por Codigo_Asignatura (§4.5)

  PASO 3 — Componente: findOrCreate por Nombre_Componente
    (el componente ya debe existir si se procesó la hoja de Agrupaciones antes)

  PASO 4 — Agrupación: findOrCreate por (ID_Malla + ID_Componente + Nombre_Agrupacion)

  PASO 5 — AgrupacionAsignatura:
    INSERT con (ID_Agrupacion, ID_Asignatura, Tipo_Asignatura, Semestre_Sugerido=NULL)

  PASO 6 — Requisito (solo si row[7] tiene valor):
    Determinar tipo según §4.8 → INSERT en requisito
```

> ⚠️ **Caso especial — misma asignatura en múltiples agrupaciones**:
> El parser puede encontrar la misma asignatura (mismo código) en filas diferentes con distintas agrupaciones. Esto es válido: se crean múltiples registros en `agrupacion_asignatura`. El paso 2 simplemente retorna el `ID_Asignatura` ya existente.
>
> Este es el origen de los 227 créditos aparentes vs 179 reales: múltiples filas, misma asignatura.

### 4.10 Cálculo de créditos únicos (sin cambios)

```
Total créditos malla = SUM(Creditos_Asignatura) GROUP BY Codigo_Asignatura DISTINCT
Resultado esperado para Ing. Civil: 179 créditos
```

---

## 5. Endpoint de polling (sin cambios)

```
GET /api/cargas/{id}/estado
Authorization: Bearer {token}

Respuesta 200:
{
  "data": {
    "carga_id": 5,
    "estado": "validando",
    "errores_count": 4,
    "advertencias_count": 1,
    "porcentaje": 60
  },
  "message": ""
}
```

El frontend hace polling cada **3 segundos** mientras el estado sea `iniciado` o `validando`.

---

## 6. Criterios de aceptación actualizados

### CA-01: Archivo duplicado (sin cambios)
```
Given: existe archivo con Hash_Sha256 = 'abc123' para el programa X
When: se sube el mismo archivo
Then: 409, no se crea ningún registro nuevo
```

### CA-02: Fila sin código (actualizado con filas reales)
```
Given: hoja MALLA con filas 18, 19, 20, 23 sin Código Asignatura
When: Job procesa el archivo de Ing. Civil
Then: 4 registros en error_carga con Severidad = 'error'
  AND: 'INGENIERÍA ECONÓMICA', 'PROGRAMACIÓN Y PRESUPUESTO OBRA',
       'FORMULACIÓN Y EVALUACIÓN DE PROYECTOS', 'QUÍMICA PARA INGENIERÍA CIVIL'
       no tienen asignatura ni agrupacion_asignatura creadas
  AND: las demás 66 filas válidas sí se procesaron
  AND: carga_malla.Estado = 'con_errores'
```

### CA-03: Código no existe en BD → se crea (comportamiento nuevo)
```
Given: hoja MALLA con código 1000004 ('CÁLCULO DIFERENCIAL')
  AND: ese código NO existe en la tabla asignatura
When: Job procesa la fila
Then: se INSERT la asignatura con Codigo_Asignatura = '1000004', Nombre = 'CÁLCULO DIFERECIAL', Creditos = 4
  AND: NO se genera registro en error_carga por este motivo
  AND: la agrupacion_asignatura y el requisito se crean normalmente
```

### CA-04: Código existe pero nombre difiere → advertencia y usa existente
```
Given: asignatura con código '1000004' en BD con nombre 'CÁLCULO DIFERENCIAL'
  AND: Excel tiene mismo código con nombre 'CALCULO DIFERENCIAL' (sin tilde)
When: Job procesa la fila
Then: advertencia en error_carga indicando la diferencia
  AND: asignatura de BD NO fue modificada
  AND: agrupacion_asignatura creada correctamente
```

### CA-05: Limpieza de \n en código y nombre (datos reales)
```
Given: celda Código = '\n4201065\n', celda Nombre = '\nESTÁTICA\n'
When: cleanCodeCell() y cleanCell() se aplican
Then: Codigo_Asignatura = '4201065', Nombre = 'ESTÁTICA'
  AND: procesada sin error_carga
```

### CA-06: Columna Normativa usa ID entero
```
Given: hoja MALLA con valor 1.0 en columna Normativa
When: parser resuelve la normativa
Then: busca normativa WHERE ID_Normativa = 1
  AND: usa esa normativa para crear malla_curricular
  AND: NO busca por nombre de texto
```

### CA-07: Prereq referenciado por nombre de asignatura
```
Given: fila HIDROLOGÍA con Tipo_Requisito = 'Prerrequisito'
       y Codigo_asignatura = 'QUÍMICA PARA INGENIERÍA CIVIL' (nombre, no código)
When: parser procesa el requisito
Then: busca agrupacion_asignatura WHERE asignatura.Nombre_Asignatura LIKE 'QUÍMICA PARA...'
       en la misma malla
  AND: si lo encuentra → ID_Agrup_Asig_Requerida = ese ID
  AND: si no lo encuentra (asignatura sin código no fue creada) →
       Descripcion_Requisito = 'QUÍMICA PARA INGENIERÍA CIVIL', FKs = NULL
  AND: NO genera error_carga en ningún caso
```

### CA-08: Texto libre en Tipo_Requisito (sin cambios)
```
Given: fila TRABAJO DE GRADO con Tipo_Requisito = 'Haber aprobado 70 créditos...'
When: Job procesa
Then: requisito creado con Descripcion_Requisito = texto completo, FKs = NULL
  AND: sin error_carga
```

### CA-09: Filas vacías al final del Excel
```
Given: hoja MALLA con 70 filas de datos seguidas de ~900 filas completamente vacías
When: parser itera la hoja
Then: el parser se detiene al encontrar filas vacías consecutivas (o filtra por any(cell != null))
  AND: solo procesa las 70 filas con datos
  AND: no genera error_carga por filas vacías
```

### CA-10: Agrupacion Ing. Civil — última fila ignorada
```
Given: hoja 'Agrupacion Ing. Civil' con última fila conteniendo solo el número 143
When: parser lee la hoja de agrupaciones
Then: esa fila se ignora (COMPONENTE o AGRUPACIÓN vacíos → SKIP)
  AND: 15 agrupaciones se crean/actualizan correctamente
```

### CA-11: Créditos únicos
```
Given: Excel Ing. Civil con 70 filas MALLA (algunas asignaturas repetidas en varias agrupaciones)
When: Job completa el procesamiento
Then: total créditos únicos = 179 (no 227)
```

### CA-12: Reintentos del Job
```
Given: Job falla en primera ejecución
Then: reintenta hasta 3 veces con backoff 30s, 60s, 120s
  AND: si los 3 fallan: carga_malla.Estado = 'con_errores', log_actividad registrado
```

---

## 7. AsignaturaCatalogSeeder (Etapa A)

### 7.1 Fuentes

| Archivo | Hoja | Columnas a leer |
|---------|------|-----------------|
| `Asignaturas.xlsx` | Hoja1 | `COD_ASIGNATURA` (col 5), `ASIGNATURA` (col 6), `CREDITOS` (col 7), `HORAS_PRESENCIALES` (col 11), `HORAS_INDEPENDIENTES` (col 12) |
| `Electivas.xlsx` | Hoja1 | `COD_ASIGNATURA` (col 0), `ASIGNATURA` (col 1) |

### 7.2 Comportamiento

```
Para cada fila de Asignaturas.xlsx (fila de encabezado ignorada):
  codigo = cleanCodeCell(COD_ASIGNATURA)
  Si codigo == null → SKIP
  
  INSERT INTO asignatura ... ON DUPLICATE KEY UPDATE
    Nombre_Asignatura = VALUES(Nombre_Asignatura)  ← actualiza si cambia
  
  (Los duplicados en Asignaturas.xlsx son normales: una asignatura aparece
   una vez por cada subtipo de estudio. El upsert los colapsa.)

Para cada fila de Electivas.xlsx:
  Mismo comportamiento de upsert por Codigo_Asignatura.
  No se asigna tipo aquí; el tipo se asigna al vincular en agrupacion_asignatura.
```

### 7.3 Volumen esperado

- `Asignaturas.xlsx`: 2.680 filas brutas → 2.043 asignaturas únicas (el resto son duplicados por subtipo)
- `Electivas.xlsx`: 358 filas brutas → ~357 asignaturas únicas

---

## 8. Estructura de archivos Laravel esperada

```
app/
  Http/
    Controllers/Api/
      CargaController.php
    Requests/
      StoreCargaRequest.php
  Services/
    ExcelUploadService.php
    ExcelParserService.php
      ├── parseContextSheets()    ← Sede, Facultades, Programas, Normativas
      ├── parseAgrupaciones()     ← hoja Agrupacion {Nombre}
      ├── parseMalla()            ← hoja MALLA {Nombre}
      ├── cleanCell()
      ├── cleanCodeCell()
      ├── resolvePrerequisito()   ← por código numérico o por nombre
      └── calcularCreditosUnicos()
  Jobs/
    ProcesarExcelJob.php
  Models/
    CargaMalla.php  ArchivoExcel.php  ErrorCarga.php
database/
  seeders/
    AsignaturaCatalogSeeder.php   ← importa Asignaturas.xlsx y Electivas.xlsx
```