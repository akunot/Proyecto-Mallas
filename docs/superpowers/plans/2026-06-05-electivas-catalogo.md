# Catálogo de Libre Elección (Optativas) por Programa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un cuarto tipo de carga (`optativa`) que lea el archivo FORMATO DE CARGA - OPTATIVA.xlsx, vincule las asignaturas a sus programas, y muestre ese catálogo en un modal al hacer clic en un cuadro azul (Libre Elección) del visualizador de mallas.

**Architecture:** Nueva tabla `programa_electivas` como pivote programa↔asignatura. El parser lee programa ID de la columna 0 de cada fila (múltiples programas por archivo). El visualizador incluye los `slots_agrupacion` en el grid y abre un modal al hacer clic en slots de tipo `libre`.

**Tech Stack:** Laravel 13 (PHP 8.3), Eloquent, React 19 + TypeScript, Inertia.js, Tailwind CSS 4

---

## Estructura del archivo OPTATIVA.xlsx

```
Fila 1 (header): PROGRAMA CURRICULAR | COMPONENTE | AGRUPACIÓN | CÓDIGO | NOMBRE | CRÉDITOS | OBLIGATORIA
Fila 2+:         4021               | 1          | 3          | 1000020| Física… | 4        | NO
                 4021               | 1          | 4          | (null) | (null)  | (null)   | (null)  ← fila vacía, ignorar
                 4035               | 1          | 18         | 1000007| Ecuac…  | 4        | NO
```

- **Col 0:** ID_Programa (presente en cada fila, múltiples programas por archivo)
- **Col 3:** Código asignatura (null en filas vacías → skip)
- **Col 4:** Nombre asignatura
- **Col 5:** Créditos
- **Filas con col 3 null:** representan "dos requisitos alternativos" en el Excel → simplemente se omiten

---

## File Map

| Archivo | Acción | Responsabilidad |
|---------|--------|----------------|
| `database/migrations/2026_06_05_000001_create_programa_electivas_table.php` | Crear | Nueva tabla pivote |
| `app/Models/ProgramaElectiva.php` | Crear | Modelo Eloquent para la tabla pivote |
| `app/Models/Agrupacion.php` | Modificar | Agregar relación `slots(): HasMany` |
| `app/Models/Programa.php` | Modificar | Agregar relación `electivas(): BelongsToMany` |
| `app/Http/Requests/StoreCargaRequest.php` | Modificar | Agregar 'optativa' al Rule::in |
| `app/Services/ExcelUploadService.php` | Modificar | Mapear 'optativa' → `ID_Archivo_Electivas` |
| `app/Services/ExcelParserService.php` | Modificar | Agregar rama `optativa` + método `parseOptativaFile()` |
| `app/Http/Controllers/Api/ProgramaController.php` | Modificar | Nuevo método `electivas()` |
| `routes/api.php` | Modificar | Nueva ruta `GET /programas/{id}/electivas` |
| `routes/web.php` | Modificar | Eager load `agrupaciones.slots` en ruta grafica |
| `resources/js/pages/Cargas/Cargas.tsx` | Modificar | Agregar botón tipo 'optativa' (sin selector de programa) |
| `resources/js/pages/Mallas/Visualizer.tsx` | Modificar | Slots en grid + modal de electivas |

---

## Task 1: Migración y modelo `programa_electivas`

**Files:**
- Create: `database/migrations/2026_06_05_000001_create_programa_electivas_table.php`
- Create: `app/Models/ProgramaElectiva.php`

- [ ] **Step 1: Crear la migración**

Crear `database/migrations/2026_06_05_000001_create_programa_electivas_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('programa_electivas', function (Blueprint $table) {
            $table->id('ID_Prog_Electiva');
            $table->unsignedBigInteger('ID_Programa');
            $table->unsignedBigInteger('ID_Asignatura');
            $table->timestamps();

            $table->foreign('ID_Programa')
                  ->references('ID_Programa')->on('programas')->onDelete('cascade');
            $table->foreign('ID_Asignatura')
                  ->references('ID_Asignatura')->on('asignaturas')->onDelete('cascade');
            $table->unique(['ID_Programa', 'ID_Asignatura'], 'uq_prog_asig');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('programa_electivas');
    }
};
```

- [ ] **Step 2: Ejecutar la migración**

```bash
php artisan migrate
```

Resultado esperado: línea `Migrated: 2026_06_05_000001_create_programa_electivas_table`.

- [ ] **Step 3: Crear el modelo `ProgramaElectiva`**

Crear `app/Models/ProgramaElectiva.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProgramaElectiva extends Model
{
    protected $table      = 'programa_electivas';
    protected $primaryKey = 'ID_Prog_Electiva';

    protected $fillable = [
        'ID_Programa',
        'ID_Asignatura',
    ];

    public function programa(): BelongsTo
    {
        return $this->belongsTo(Programa::class, 'ID_Programa', 'ID_Programa');
    }

    public function asignatura(): BelongsTo
    {
        return $this->belongsTo(Asignatura::class, 'ID_Asignatura', 'ID_Asignatura');
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add database/migrations/2026_06_05_000001_create_programa_electivas_table.php app/Models/ProgramaElectiva.php
git commit -m "feat: add programa_electivas migration and model"
```

---

## Task 2: Relaciones en modelos existentes

**Files:**
- Modify: `app/Models/Agrupacion.php`
- Modify: `app/Models/Programa.php`

- [ ] **Step 1: Agregar `slots()` a `Agrupacion`**

Editar `app/Models/Agrupacion.php`. Agregar el import de `SlotAgrupacion` junto a los imports existentes:

```php
use App\Models\SlotAgrupacion;
```

Agregar el método al final de la clase (antes del cierre `}`):

```php
public function slots(): HasMany
{
    return $this->hasMany(SlotAgrupacion::class, 'ID_Agrupacion', 'ID_Agrupacion');
}
```

- [ ] **Step 2: Agregar `electivas()` a `Programa`**

Editar `app/Models/Programa.php`. Agregar el método al final de la clase (antes del cierre `}`):

```php
public function electivas(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
{
    return $this->belongsToMany(
        Asignatura::class,
        'programa_electivas',
        'ID_Programa',
        'ID_Asignatura'
    );
}
```

- [ ] **Step 3: Verificar relaciones en tinker**

```bash
php artisan tinker
```

```php
$p = App\Models\Programa::first();
$p->electivas()->count(); // 0 (tabla vacía aún)

$a = App\Models\Agrupacion::first();
$a->slots()->count();     // número >= 0
```

- [ ] **Step 4: Commit**

```bash
git add app/Models/Agrupacion.php app/Models/Programa.php
git commit -m "feat: add slots() to Agrupacion and electivas() to Programa"
```

---

## Task 3: Soporte para `tipo_carga = 'optativa'` en upload

**Files:**
- Modify: `app/Http/Requests/StoreCargaRequest.php`
- Modify: `app/Services/ExcelUploadService.php`

- [ ] **Step 1: Agregar 'optativa' al Rule::in de `StoreCargaRequest`**

Editar `app/Http/Requests/StoreCargaRequest.php`. Reemplazar la línea del `tipo_carga` en `rules()`:

```php
'tipo_carga' => ['required', 'string', Rule::in(['asignaturas', 'electivas', 'malla', 'optativa'])],
```

Agregar el mensaje correspondiente en `messages()`:

```php
'tipo_carga.in' => 'El tipo de carga debe ser asignaturas, electivas, malla u optativa.',
```

- [ ] **Step 2: Mapear 'optativa' al campo `ID_Archivo_Electivas`**

Editar `app/Services/ExcelUploadService.php`. Localizar el método `getArchivoFieldByTipo()` y reemplazarlo completo:

```php
private function getArchivoFieldByTipo(string $tipoArchivo): string
{
    return match ($tipoArchivo) {
        'asignaturas' => 'ID_Archivo_Asignaturas',
        'electivas'   => 'ID_Archivo_Electivas',
        'optativa'    => 'ID_Archivo_Electivas',
        default       => 'ID_Archivo_Malla',
    };
}
```

Localizar el bloque que determina `$isReadyToProcess` (alrededor de la línea 97-101) y agregar 'optativa':

```php
if ($carga->tipo_carga === 'malla') {
    $isReadyToProcess = $carga->ID_Archivo_Malla !== null;
} elseif ($carga->tipo_carga === 'asignaturas') {
    $isReadyToProcess = $field === 'ID_Archivo_Asignaturas';
} elseif ($carga->tipo_carga === 'electivas' || $carga->tipo_carga === 'optativa') {
    $isReadyToProcess = $field === 'ID_Archivo_Electivas';
} else {
    $isReadyToProcess = false;
}
```

- [ ] **Step 3: Commit**

```bash
git add app/Http/Requests/StoreCargaRequest.php app/Services/ExcelUploadService.php
git commit -m "feat: add optativa tipo_carga support in upload service"
```

---

## Task 4: Parser `parseOptativaFile()` que pobla `programa_electivas`

**Files:**
- Modify: `app/Services/ExcelParserService.php`

- [ ] **Step 1: Agregar import de `ProgramaElectiva`**

Editar `app/Services/ExcelParserService.php`. En el bloque de imports, agregar:

```php
use App\Models\ProgramaElectiva;
```

- [ ] **Step 2: Agregar rama `optativa` en el método `procesar()`**

Localizar el bloque de validación inicial (alrededor de la línea 99) donde están las ramas `if ($tipoCarga === 'malla')` y `elseif ($tipoCarga === 'electivas')`. Agregar al final de ese bloque de validación (después del `elseif ($tipoCarga === 'electivas')` y antes del `ErrorCarga::where...`):

```php
} elseif ($tipoCarga === 'optativa') {
    if (!$this->carga->ID_Archivo_Electivas) {
        $this->recordError(0, 'Carga', 'Falta el archivo de optativas.', null, 'error');
        $this->carga->update(['Estado_Carga' => 'con_errores']);
        return [
            'success'        => false,
            'errors_count'   => count($this->errors),
            'warnings_count' => count($this->warnings),
            'processed_rows' => $this->processedRows,
            'total_rows'     => $this->totalRows,
        ];
    }
}
```

Localizar el bloque de ejecución (alrededor de la línea 151) donde están las ramas `elseif ($tipoCarga === 'electivas')`. Agregar después de esa rama:

```php
} elseif ($tipoCarga === 'optativa') {
    $this->preloadAsignaturasCache();
    $optativaSpreadsheet = $this->loadSpreadsheetFromField('archivoElectivas');
    $this->parseOptativaFile($optativaSpreadsheet);
    $result = true;
}
```

- [ ] **Step 3: Agregar el método `parseOptativaFile()` y el helper `vincularElectivasAPrograma()`**

Agregar los dos métodos a continuación del método `parseElectivasFile()` (alrededor de la línea 378):

```php
/**
 * Procesa FORMATO DE CARGA - OPTATIVA.xlsx.
 *
 * Estructura por fila (a partir de fila 2):
 *   Col 0: ID_Programa  Col 1: ID_Componente  Col 2: ID_Agrupacion
 *   Col 3: Codigo       Col 4: Nombre         Col 5: Creditos      Col 6: Obligatoria
 *
 * Filas con Col 3 null representan separadores y se omiten.
 * El mismo archivo puede contener múltiples programas.
 */
private function parseOptativaFile(Spreadsheet $spreadsheet): void
{
    $sheet = $spreadsheet->getSheet(0);
    if (!$sheet) {
        $this->recordError(0, 'Optativa', 'Hoja de optativas no encontrada.', null, 'error');
        return;
    }

    $rows = $sheet->toArray();
    if (count($rows) < 2) {
        return;
    }

    $batch             = [];   // Filas para bulk insert en asignaturas
    $codigosPorPrograma = [];  // [ID_Programa => [codigoBase, ...]]
    $codigosProcesados = [];   // [codigoBase => fila] para detectar duplicados globales

    for ($i = 1; $i < count($rows); $i++) {
        $data = $rows[$i];

        $programaId     = !empty($data[0]) ? (int)$data[0] : null;
        $codigoOriginal = $this->cleanCodeCell($data[3] ?? null);
        $nombre         = $this->cleanCell($data[4] ?? '');
        $creditos       = !empty($data[5]) ? (int)$data[5] : 0;

        // Filas sin código son separadores ("dos requisitos alternativos") → ignorar
        if (empty($codigoOriginal) || empty($nombre)) {
            continue;
        }

        if (!$programaId) {
            $this->recordError($i + 1, 'Optativa', 'Fila sin ID de programa.', $codigoOriginal, 'advertencia');
            continue;
        }

        $codigoBase = $this->normalizeCodigo($codigoOriginal);

        // Duplicado dentro del archivo
        if (isset($codigosProcesados[$codigoBase])) {
            // misma asignatura puede aparecer en varios programas → solo duplicar es error
            // si el programa es distinto, es válido
            $key = $programaId . '|' . $codigoBase;
            if (isset($codigosProcesados[$key])) {
                $this->recordError(
                    $i + 1,
                    'Optativa',
                    "Código '{$codigoBase}' duplicado para el programa {$programaId} (fila anterior: {$codigosProcesados[$key]}).",
                    $codigoOriginal,
                    'advertencia'
                );
                continue;
            }
            $codigosProcesados[$key] = $i + 1;
        } else {
            $codigosProcesados[$codigoBase] = $i + 1;
            $key = $programaId . '|' . $codigoBase;
            $codigosProcesados[$key] = $i + 1;
        }

        // Registrar para vínculo programa → asignatura
        if (!isset($codigosPorPrograma[$programaId])) {
            $codigosPorPrograma[$programaId] = [];
        }
        $codigosPorPrograma[$programaId][] = $codigoBase;

        // Ya existe en BD → solo vincular, no reinsertar
        if (isset($this->asignaturasCache[$codigoBase])) {
            continue;
        }

        $batch[] = [
            'Codigo_Asignatura'  => $codigoOriginal,
            'Codigo_Base'        => $codigoBase,
            'Nombre_Asignatura'  => $nombre,
            'Creditos_Asignatura'=> $creditos,
            'Horas_Presencial'   => null,
            'Horas_Estudiante'   => null,
            'created_at'         => now(),
            'updated_at'         => now(),
        ];

        $this->asignaturasCache[$codigoBase] = 'PENDING_' . count($batch);
    }

    $this->bulkInsertAsignaturas($batch);

    // Vincular cada programa a sus asignaturas
    foreach ($codigosPorPrograma as $programaId => $codigos) {
        $this->vincularElectivasAPrograma($programaId, $codigos);
    }
}

/**
 * Upsert en programa_electivas para los códigos dados y un programa.
 */
private function vincularElectivasAPrograma(int $programaId, array $codigosBase): void
{
    if (empty($codigosBase)) {
        return;
    }

    $ids = \App\Models\Asignatura::whereIn('Codigo_Base', $codigosBase)
        ->pluck('ID_Asignatura')
        ->all();

    if (empty($ids)) {
        return;
    }

    $now  = now();
    $lote = array_map(fn($id) => [
        'ID_Programa'   => $programaId,
        'ID_Asignatura' => $id,
        'created_at'    => $now,
        'updated_at'    => $now,
    ], $ids);

    foreach (array_chunk($lote, self::BATCH_SIZE) as $chunk) {
        DB::table('programa_electivas')->upsert(
            $chunk,
            ['ID_Programa', 'ID_Asignatura'],
            ['updated_at']
        );
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add app/Services/ExcelParserService.php
git commit -m "feat: add parseOptativaFile() and vincularElectivasAPrograma()"
```

---

## Task 5: Endpoint `GET /api/v1/programas/{id}/electivas`

**Files:**
- Modify: `app/Http/Controllers/Api/ProgramaController.php`
- Modify: `routes/api.php`

- [ ] **Step 1: Agregar método `electivas()` en `ProgramaController`**

Editar `app/Http/Controllers/Api/ProgramaController.php`. Agregar el método dentro de la clase:

```php
public function electivas(int $id): \Illuminate\Http\JsonResponse
{
    $programa  = Programa::findOrFail($id);
    $electivas = $programa->electivas()
        ->select('asignaturas.ID_Asignatura', 'Codigo_Asignatura', 'Nombre_Asignatura', 'Creditos_Asignatura')
        ->orderBy('Nombre_Asignatura')
        ->paginate(200);

    return response()->json([
        'data' => $electivas->items(),
        'meta' => [
            'total'        => $electivas->total(),
            'current_page' => $electivas->currentPage(),
            'last_page'    => $electivas->lastPage(),
        ],
    ]);
}
```

- [ ] **Step 2: Registrar la ruta**

Editar `routes/api.php`. Dentro del bloque de Programas (líneas ~105-110), agregar al final del grupo:

```php
Route::get('/programas/{id}/electivas', [ProgramaController::class, 'electivas']);
```

- [ ] **Step 3: Verificar que la ruta existe**

```bash
php artisan route:list | grep electivas
```

Resultado esperado: `GET|HEAD  api/v1/programas/{id}/electivas`.

- [ ] **Step 4: Commit**

```bash
git add app/Http/Controllers/Api/ProgramaController.php routes/api.php
git commit -m "feat: add GET /programas/{id}/electivas endpoint"
```

---

## Task 6: Eager load de slots en la ruta del visualizador

**Files:**
- Modify: `routes/web.php`

- [ ] **Step 1: Agregar `agrupaciones.slots` al eager load**

Editar `routes/web.php`. Localizar la ruta `/mallas/{id}/grafica` (alrededor de la línea 420). Reemplazar el bloque completo:

```php
Route::get('/mallas/{id}/grafica', function ($id) {
    $malla = \App\Models\MallaCurricular::with([
        'programa',
        'agrupaciones.asignaturas.requisitos.asignaturaRequerida',
        'agrupaciones.componente',
        'agrupaciones.slots',
    ])->findOrFail($id);

    return Inertia::render('Mallas/Visualizer', [
        'malla' => $malla,
    ]);
})->name('mallas.visualizer');
```

- [ ] **Step 2: Verificar en tinker**

```bash
php artisan tinker
```

```php
$malla = App\Models\MallaCurricular::with([
    'agrupaciones.slots',
])->first();

$totalSlots = $malla->agrupaciones->sum(fn($a) => $a->slots->count());
echo "Slots totales: $totalSlots\n"; // Debe ser > 0 si hay mallas cargadas
```

- [ ] **Step 3: Commit**

```bash
git add routes/web.php
git commit -m "feat: eager load agrupaciones.slots in malla grafica route"
```

---

## Task 7: Frontend — agregar tipo 'optativa' en modal de cargas

**Files:**
- Modify: `resources/js/pages/Cargas/Cargas.tsx`

- [ ] **Step 1: Agregar 'optativa' a los tipos y etiquetas**

Editar `resources/js/pages/Cargas/Cargas.tsx`.

Reemplazar la línea del type `TipoCarga`:
```typescript
type TipoCarga = 'asignaturas' | 'electivas' | 'malla' | 'optativa' | '';
```

Agregar la entrada en `TIPO_LABELS` (después de la de `malla`):
```typescript
optativa: { label: 'Optativas', bg: 'bg-purple-100', text: 'text-purple-800' },
```

Agregar la entrada en `ESTADOS_CATALOGO` (optativa se trata igual que electivas — es una carga de catálogo):
```typescript
// ESTADOS_CATALOGO ya maneja todos los estados de catálogo.
// No se requiere cambio adicional aquí porque el badge usa:
// const esCatalogo = tipo === 'asignaturas' || tipo === 'electivas';
// Actualizar esa condición:
```

Localizar la función `getEstadoBadge` y reemplazar la línea `esCatalogo`:
```typescript
const esCatalogo = tipo === 'asignaturas' || tipo === 'electivas' || tipo === 'optativa';
```

- [ ] **Step 2: Agregar el botón 'Optativas' en el modal**

Localizar el array `(['asignaturas', 'electivas', 'malla'] as const).map(...)` en el JSX del modal y reemplazarlo:

```tsx
{(['asignaturas', 'electivas', 'malla', 'optativa'] as const).map((tipo) => {
    const t = TIPO_LABELS[tipo];
    const selected = selectedTipo === tipo;
    return (
        <button
            key={tipo}
            type="button"
            onClick={() => setSelectedTipo(tipo)}
            className={`rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-all ${
                selected
                    ? 'border-green-600 bg-green-50 text-green-800'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
        >
            {t.label}
        </button>
    );
})}
```

El grid ahora tiene 4 columnas — cambiar `grid-cols-3` a `grid-cols-2 sm:grid-cols-4`:

```tsx
<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
```

Agregar una nota informativa debajo del selector cuando el tipo es 'optativa':

```tsx
{selectedTipo === 'optativa' && (
    <p className="text-xs text-purple-700 bg-purple-50 rounded-lg px-3 py-2">
        El programa se detecta automáticamente desde el archivo.
    </p>
)}
```

- [ ] **Step 3: Verificar en el navegador**

1. Abrir `/cargas` y hacer clic en "Subir archivo"
2. Verificar que aparecen 4 botones: Asignaturas, Electivas, Malla, Optativas
3. Seleccionar "Optativas" y verificar que aparece la nota informativa
4. Verificar que el botón "Subir" se habilita solo con archivo seleccionado (sin dropdown de programa)

- [ ] **Step 4: Commit**

```bash
git add resources/js/pages/Cargas/Cargas.tsx
git commit -m "feat: add optativa type to upload modal in Cargas"
```

---

## Task 8: Frontend — slots en el visualizador + modal de electivas

**Files:**
- Modify: `resources/js/pages/Mallas/Visualizer.tsx`

- [ ] **Step 1: Agregar tipos `Slot` y `Electiva`, actualizar interfaces**

En `Visualizer.tsx`, después de la interfaz `Asignatura`, agregar:

```typescript
interface Slot {
    ID_Slot: number;
    Nombre_Slot: string;
    Tipo_Slot: 'optativa' | 'libre' | 'nivelatorio';
    Semestre: number | null;
}

interface Electiva {
    ID_Asignatura: number;
    Codigo_Asignatura: string;
    Nombre_Asignatura: string;
    Creditos_Asignatura: number;
}
```

Modificar `Agrupacion` para incluir `slots`:

```typescript
interface Agrupacion {
    ID_Agrupacion: number;
    Nombre_Agrupacion: string;
    ID_Componente: number;
    componente?: { Nombre_Componente: string };
    asignaturas: Asignatura[];
    slots: Slot[];
}
```

Modificar `Props` para incluir `ID_Programa`:

```typescript
interface Props {
    malla: {
        ID_Malla: number;
        programa: {
            Nombre_Programa: string;
            ID_Programa: number;
        };
        agrupaciones: Agrupacion[];
    };
}
```

- [ ] **Step 2: Agregar estados para el modal de electivas**

Dentro de `MallaGrafica`, después del estado `selectedAsig`, agregar:

```typescript
const [showElectivasModal, setShowElectivasModal] = useState(false);
const [electivas, setElectivas]                   = useState<Electiva[]>([]);
const [loadingElectivas, setLoadingElectivas]     = useState(false);
const [errorElectivas, setErrorElectivas]         = useState(false);
```

- [ ] **Step 3: Agregar función `fetchElectivas`**

Después de los estados, agregar:

```typescript
const fetchElectivas = async () => {
    setLoadingElectivas(true);
    setErrorElectivas(false);
    setElectivas([]);
    try {
        const res = await fetch(`/api/v1/programas/${malla.programa.ID_Programa}/electivas`);
        if (res.ok) {
            const data = await res.json();
            setElectivas(data.data ?? []);
        } else {
            setErrorElectivas(true);
        }
    } catch {
        setErrorElectivas(true);
    } finally {
        setLoadingElectivas(false);
    }
};
```

- [ ] **Step 4: Reemplazar el `useMemo` de `semestres` para incluir slots**

Reemplazar el useMemo completo de `semestres`:

```typescript
type GridItem =
    | (Asignatura & { isSlot: false; ID_Componente: number })
    | (Slot      & { isSlot: true;  ID_Componente: number });

const semestres = useMemo(() => {
    const grid: Record<number, GridItem[]> = {};

    malla.agrupaciones.forEach(agrup => {
        agrup.asignaturas.forEach(asig => {
            const item: GridItem = { ...asig, ID_Componente: agrup.ID_Componente, isSlot: false };
            const sem = asig.pivot.Semestre_Sugerido || 0;
            if (!grid[sem]) grid[sem] = [];
            if (!grid[sem].find(a => !a.isSlot && (a as Asignatura).ID_Asignatura === asig.ID_Asignatura)) {
                grid[sem].push(item);
            }
        });

        (agrup.slots || []).forEach(slot => {
            const sem = slot.Semestre || 0;
            if (!grid[sem]) grid[sem] = [];
            grid[sem].push({ ...slot, isSlot: true, ID_Componente: agrup.ID_Componente });
        });
    });

    Object.keys(grid).forEach(sem => {
        grid[Number(sem)].sort((a, b) => {
            const oa = a.isSlot ? 999 : ((a as Asignatura).pivot.Orden || 0);
            const ob = b.isSlot ? 999 : ((b as Asignatura).pivot.Orden || 0);
            return oa - ob;
        });
    });

    return grid;
}, [malla]);
```

- [ ] **Step 5: Reemplazar el render de cajas para manejar slots y asignaturas**

Localizar el bloque `{semestres[sem]?.map(asig => {` y reemplazarlo completo:

```tsx
{semestres[sem]?.map((item, idx) => {
    if (item.isSlot) {
        const slot = item as Slot & { isSlot: true; ID_Componente: number };
        const isLibre = slot.Tipo_Slot === 'libre';
        return (
            <div
                key={`slot-${slot.ID_Slot}`}
                onClick={isLibre ? () => { setShowElectivasModal(true); fetchElectivas(); } : undefined}
                className={[
                    'border-dashed border-2 p-2 h-[120px] flex flex-col items-center justify-center',
                    'text-[11px] font-semibold text-center leading-tight transition-all duration-200',
                    isLibre
                        ? 'border-blue-400 bg-blue-50 text-blue-700 cursor-pointer hover:bg-blue-100 hover:shadow-md'
                        : slot.Tipo_Slot === 'optativa'
                            ? 'border-orange-400 bg-orange-50 text-orange-700 cursor-default'
                            : 'border-yellow-400 bg-yellow-50 text-yellow-700 cursor-default',
                ].join(' ')}
            >
                <span className="uppercase tracking-wide">
                    {slot.Tipo_Slot === 'libre' ? 'Libre Elección' : slot.Tipo_Slot === 'optativa' ? 'Optativa' : 'Nivelatorio'}
                </span>
                {isLibre && (
                    <span className="mt-1 text-[9px] text-blue-500">clic para ver catálogo</span>
                )}
            </div>
        );
    }

    const asig   = item as Asignatura & { isSlot: false; ID_Componente: number };
    const active  = selectedAsig === asig.ID_Asignatura;
    const isPre   = isRelated(asig.ID_Asignatura, 'pre');
    const isCo    = isRelated(asig.ID_Asignatura, 'co');
    const related = isPre || isCo;

    return (
        <div
            key={asig.ID_Asignatura}
            onClick={() => setSelectedAsig(asig.ID_Asignatura === selectedAsig ? null : asig.ID_Asignatura)}
            className={[
                getComponentColor(asig.ID_Componente || 0),
                'border-l-4 p-2 shadow-sm cursor-pointer transition-all duration-200',
                'hover:shadow-md h-[120px] flex flex-col justify-between relative',
                active  ? 'ring-4 ring-blue-600 scale-105 z-20 shadow-xl' : '',
                selectedAsig && !active && !related ? 'opacity-30' : 'opacity-100',
                isPre ? 'ring-4 ring-red-500 z-10' : '',
                isCo  ? 'ring-4 ring-yellow-500 z-10' : '',
            ].join(' ')}
        >
            <div className="flex justify-between text-[10px] font-bold text-gray-600">
                <span>{asig.Creditos_Asignatura}</span>
                <span>{asig.Horas_Presencial || 0}</span>
                <span>{asig.Horas_Estudiante || 0}</span>
            </div>
            <div className="text-center text-[11px] font-semibold leading-tight flex-grow flex items-center justify-center py-1">
                {asig.Nombre_Asignatura}
            </div>
            <div className="flex justify-between items-center mt-1 border-t border-gray-200 pt-1">
                <span className="text-[10px] text-gray-500">{asig.Codigo_Asignatura}</span>
                <div className="flex gap-1">
                    {asig.requisitos?.some(r => r.Tipo_Requisito?.toLowerCase().includes('pre')) && (
                        <div className="w-3 h-3 bg-red-400 rounded-full flex items-center justify-center" title="Tiene prerrequisitos">
                            <span className="text-[8px] text-white">P</span>
                        </div>
                    )}
                    {asig.requisitos?.some(r => r.Tipo_Requisito?.toLowerCase().includes('co')) && (
                        <div className="w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center" title="Tiene correquisitos">
                            <span className="text-[8px] text-white font-bold">C</span>
                        </div>
                    )}
                    {asig.requisitos?.some(r => r.Tipo_Requisito?.toLowerCase().includes('credito')) && (
                        <div className="w-3 h-3 bg-blue-400 rounded-full flex items-center justify-center" title="Tiene requisitos de créditos">
                            <span className="text-[8px] text-white font-bold">Cr</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
})}
```

- [ ] **Step 6: Agregar el modal de electivas al JSX**

Justo antes del cierre `</Layout>`, agregar:

```tsx
{showElectivasModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
        <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
                <div>
                    <h2 className="text-base font-semibold text-gray-900">Catálogo de Libre Elección</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{malla.programa.Nombre_Programa}</p>
                </div>
                <button
                    onClick={() => setShowElectivasModal(false)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="overflow-y-auto px-6 py-4 flex-1">
                {loadingElectivas ? (
                    <div className="flex items-center justify-center gap-3 py-12 text-gray-400">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                        <span className="text-sm">Cargando catálogo…</span>
                    </div>
                ) : errorElectivas ? (
                    <p className="py-10 text-center text-sm text-red-500">
                        No se pudieron cargar las electivas. Intenta de nuevo.
                    </p>
                ) : electivas.length === 0 ? (
                    <p className="py-10 text-center text-sm text-gray-500">
                        No hay electivas registradas para este programa.
                    </p>
                ) : (
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-100">
                                <th className="pb-3 pr-4">Código</th>
                                <th className="pb-3 pr-4">Nombre</th>
                                <th className="pb-3 text-center">Créditos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {electivas.map((e) => (
                                <tr key={e.ID_Asignatura} className="hover:bg-gray-50">
                                    <td className="py-2 pr-4 font-mono text-xs text-gray-500">{e.Codigo_Asignatura}</td>
                                    <td className="py-2 pr-4 text-gray-800">{e.Nombre_Asignatura}</td>
                                    <td className="py-2 text-center text-gray-600">{e.Creditos_Asignatura}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 shrink-0">
                {!loadingElectivas && !errorElectivas && electivas.length > 0 && (
                    <span className="text-xs text-gray-400">{electivas.length} materias disponibles</span>
                )}
                <button
                    onClick={() => setShowElectivasModal(false)}
                    className="ml-auto rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    Cerrar
                </button>
            </div>
        </div>
    </div>
)}
```

- [ ] **Step 7: Verificar en el navegador**

1. Abrir el visualizador de una malla con slots de tipo `libre`
2. Verificar que los cuadros azules punteados aparecen en los semestres correctos con texto "Libre Elección"
3. Hacer clic en uno → se abre el modal con tabla de electivas (o mensaje si no hay cargadas aún)
4. Los slots tipo `optativa` y `nivelatorio` NO abren el modal
5. Las asignaturas reales siguen funcionando: clic selecciona, requisitos se resaltan

- [ ] **Step 8: Commit**

```bash
git add resources/js/pages/Mallas/Visualizer.tsx
git commit -m "feat: render slots in grid and show electivas modal on libre click"
```

---

## Self-Review

**Spec coverage:**
- [x] Nueva tabla `programa_electivas` → Task 1
- [x] Relación `slots()` en `Agrupacion` → Task 2
- [x] Relación `electivas()` en `Programa` → Task 2
- [x] `tipo_carga = 'optativa'` validado → Task 3
- [x] 'optativa' mapea a `ID_Archivo_Electivas` → Task 3
- [x] Parser lee ID_Programa de col 0 por fila → Task 4
- [x] Filas con código null ignoradas → Task 4
- [x] Múltiples programas por archivo → Task 4 (`codigosPorPrograma`)
- [x] Inserta asignaturas + víncula programa_electivas → Task 4
- [x] Endpoint `GET /programas/{id}/electivas` → Task 5
- [x] Eager load de slots en ruta grafica → Task 6
- [x] Botón 'Optativas' en modal sin selector de programa → Task 7
- [x] Slots renderizados en grid del visualizador → Task 8
- [x] Modal centrado al clic en slot tipo `libre` → Task 8
- [x] Error handling: sin archivo → Task 4 (validación inicial)
- [x] Error handling: fetch falla → Task 8 (`errorElectivas`)
- [x] Error handling: sin electivas → Task 8 (mensaje vacío)

**Placeholder scan:** Sin TBDs, TODOs, ni "implementar después".

**Type consistency:**
- `Slot.Tipo_Slot: 'optativa' | 'libre' | 'nivelatorio'` coincide con `SlotAgrupacion::TIPO_*`
- `GridItem` unifica `Asignatura & { isSlot: false }` y `Slot & { isSlot: true }`
- `Electiva` fields (`ID_Asignatura`, `Codigo_Asignatura`, `Nombre_Asignatura`, `Creditos_Asignatura`) coinciden exactamente con el `select()` del endpoint
- `fetchElectivas` usa `data.data` que coincide con `$electivas->items()` del controlador
