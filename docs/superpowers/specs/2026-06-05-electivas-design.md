# Spec: Catálogo de Libre Elección (Electivas) por Programa

**Fecha:** 2026-06-05  
**Estado:** Aprobado  
**Enfoque elegido:** A — Mínimo cambio al flujo existente

---

## Contexto

El sistema de mallas curriculares maneja tres tipos de carga desde Excel: `asignaturas`, `electivas` y `malla`. El tipo `electivas` ya existe en el código pero actualmente solo inserta asignaturas en la tabla global `asignaturas` sin vincularlas a ningún programa específico.

Las materias de **Libre Elección** (componente ID 3, color azul en el visualizador) aparecen en la malla como slots placeholders (`LIBRE1`, `LIBRE2`, etc.) en la tabla `slots_agrupacion`. En el visualizador actual, estos slots no se renderizan porque solo se iteran `agrupacion.asignaturas`.

**Objetivo:** Permitir cargar un catálogo de electivas (libre elección) por programa y que el visualizador de mallas muestre ese catálogo al hacer clic en cualquier caja de Libre Elección.

---

## Alcance

1. Nueva tabla `programa_electivas` para la relación programa ↔ asignatura electiva
2. Flujo de upload: agregar selector de programa al modal cuando tipo = `electivas`
3. Parser: `parseElectivasFile` pobla `programa_electivas` además de `asignaturas`
4. Nuevo endpoint `GET /api/v1/programas/{programa}/electivas`
5. Visualizador: renderizar slots + modal centrado al hacer clic en Libre Elección

---

## 1. Base de Datos

### Nueva tabla: `programa_electivas`

```sql
CREATE TABLE programa_electivas (
    ID_Prog_Electiva  BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    ID_Programa       BIGINT UNSIGNED NOT NULL,
    ID_Asignatura     BIGINT UNSIGNED NOT NULL,
    created_at        TIMESTAMP NULL,
    updated_at        TIMESTAMP NULL,
    FOREIGN KEY (ID_Programa)  REFERENCES programas(ID_Programa)  ON DELETE CASCADE,
    FOREIGN KEY (ID_Asignatura) REFERENCES asignaturas(ID_Asignatura) ON DELETE CASCADE,
    UNIQUE KEY uq_prog_asig (ID_Programa, ID_Asignatura)
);
```

- Se crea una nueva migración para esta tabla.
- No se modifica ninguna tabla existente.
- El `UNIQUE` evita duplicados si se sube el mismo catálogo dos veces.

---

## 2. Backend

### 2.1 `ExcelUploadService::createCarga()`

**Cambio:** Aceptar `?int $programaId` como parámetro adicional. Cuando `$tipoCarga === 'electivas'` y no viene `$normativaId`, usar `$programaId` directamente para asignar `ID_Programa` en `cargas_mallas`.

```php
public function createCarga(
    ?int $normativaId,
    ?int $mallaBaseId,
    int  $userId,
    string $tipoCarga,
    ?int $programaId = null   // NUEVO
): array
```

Regla: si `tipoCarga === 'electivas'` y `$programaId` es null y `$normativaId` es null → error 422 "Se requiere programa_id para cargas de tipo electivas".

### 2.2 `CargaController::store()`

Agrega `programa_id` como campo validado opcionalmente en el request:

```php
'programa_id' => 'nullable|integer|exists:programas,ID_Programa',
```

Pasa `programa_id` a `createCarga()`.

### 2.3 `ExcelParserService::parseElectivasFile()`

Al final del procesamiento, después de `bulkInsertAsignaturas($batch)`, se agrega un paso:

1. Recargar el cache de asignaturas para los códigos recién insertados.
2. Construir un array de `[ID_Programa, ID_Asignatura]` para todos los códigos procesados.
3. `DB::table('programa_electivas')->upsert(...)` con `unique by [ID_Programa, ID_Asignatura]`.

El `ID_Programa` se obtiene de `$this->carga->ID_Programa`.

Si `$this->carga->ID_Programa` es null al procesar una carga de tipo electivas → registrar error bloqueante y abortar.

### 2.4 Nuevo modelo `ProgramaElectiva`

```php
// app/Models/ProgramaElectiva.php
class ProgramaElectiva extends Model
{
    protected $table = 'programa_electivas';
    protected $primaryKey = 'ID_Prog_Electiva';

    public function programa()  { return $this->belongsTo(Programa::class, 'ID_Programa'); }
    public function asignatura(){ return $this->belongsTo(Asignatura::class, 'ID_Asignatura'); }
}
```

Agregar a `Programa`:
```php
public function electivas()
{
    return $this->belongsToMany(Asignatura::class, 'programa_electivas', 'ID_Programa', 'ID_Asignatura');
}
```

### 2.5 Nuevo endpoint

**Ruta:** `GET /api/v1/programas/{programa}/electivas`  
**Controlador:** nuevo método `electivas()` en `ProgramaController` (o controlador nuevo `ProgramaElectivaController`).

```php
public function electivas(Programa $programa)
{
    $electivas = $programa->electivas()
        ->select('ID_Asignatura', 'Codigo_Asignatura', 'Nombre_Asignatura', 'Creditos_Asignatura')
        ->orderBy('Nombre_Asignatura')
        ->paginate(200);

    return response()->json(['data' => $electivas]);
}
```

Registrar en `routes/api.php`:
```php
Route::get('programas/{programa}/electivas', [ProgramaController::class, 'electivas']);
```

### 2.6 `MallaController::grafica()`

Agregar `slots` al eager load de agrupaciones:

```php
->with(['agrupaciones.asignaturas.requisitos', 'agrupaciones.slots', 'programa', 'normativa'])
```

Incluir `ID_Programa` en los datos pasados a Inertia:

```php
Inertia::render('Mallas/Visualizer', [
    'malla' => $malla,   // ya incluye malla->programa->ID_Programa
]);
```

---

## 3. Frontend

### 3.1 `Cargas.tsx` — Modal de subida

**Nuevo estado:** `selectedPrograma: number | null`

Cuando `selectedTipo === 'electivas'`, mostrar un `<select>` adicional "Programa" que se puebla con `GET /api/v1/programas`. El campo es obligatorio para poder habilitar el botón "Subir".

El body del `POST /api/v1/cargas` pasa a ser:
```json
{
    "tipo_carga": "electivas",
    "programa_id": 4021
}
```

Al limpiar el modal (`handleCloseModal`), resetear también `selectedPrograma`.

### 3.2 `Visualizer.tsx` — Slots en el grid

**Nuevo tipo `Slot`:**
```typescript
interface Slot {
    ID_Slot: number;
    Nombre_Slot: string;
    Tipo_Slot: 'optativa' | 'libre' | 'nivelatorio';
    Semestre: number | null;
}
```

Agregar `slots: Slot[]` a la interfaz `Agrupacion`.

En la construcción del grid (`semestres`), después de iterar `agrupacion.asignaturas`, iterar también `agrupacion.slots` e insertar un objeto "slot" en el semestre correspondiente. Los slots se distinguen con un flag `isSlot: true`.

**Render de slot:**
- Mismo ancho/alto que una caja normal (h-[120px])
- Borde punteado (`border-dashed`)
- Color según tipo: azul para `libre`, naranja pálido para `optativa`, amarillo para `nivelatorio`
- Texto centrado: "LIBRE ELECCIÓN", "OPTATIVA", o "NIVELATORIO"
- Cursor pointer solo para tipo `libre`

### 3.3 `Visualizer.tsx` — Modal de electivas

**Nuevo estado:**
```typescript
const [showElectivasModal, setShowElectivasModal] = useState(false);
const [electivas, setElectivas] = useState<Electiva[]>([]);
const [loadingElectivas, setLoadingElectivas] = useState(false);
```

**Trigger:** Clic en cualquier caja con `Tipo_Slot === 'libre'` O en cualquier asignatura con `ID_Componente === 3`.

**Fetch:**
```typescript
const fetchElectivas = async () => {
    setLoadingElectivas(true);
    const res = await fetch(`/api/v1/programas/${malla.programa.ID_Programa}/electivas`);
    const data = await res.json();
    setElectivas(data.data?.data ?? []);
    setLoadingElectivas(false);
};
```

**Modal centrado:** overlay negro semitransparente, tarjeta blanca `max-w-2xl`, tabla con columnas Código / Nombre / Créditos, scroll interno `max-h-[60vh]`. Botón "Cerrar" en el pie. Si no hay electivas, mostrar mensaje "No hay electivas registradas para este programa."

---

## 4. Manejo de errores

| Caso | Comportamiento |
|------|---------------|
| Upload electivas sin `programa_id` | Controller devuelve 422 con mensaje claro |
| Programa no existe | `findOrFail` → 404 |
| Electiva ya vinculada al programa | `upsert` la ignora; no genera error |
| Fetch de electivas falla en visualizador | Modal muestra "No se pudieron cargar las electivas" |
| Programa sin electivas cargadas | Modal muestra "No hay electivas registradas para este programa" |
| `ID_Programa` null en parser de electivas | Error bloqueante registrado en `errores_carga`, carga queda en `con_errores` |

---

## 5. Archivos a crear / modificar

### Crear
- `database/migrations/XXXX_create_programa_electivas_table.php`
- `app/Models/ProgramaElectiva.php`

### Modificar
- `app/Services/ExcelUploadService.php` — `createCarga()` acepta `$programaId`
- `app/Services/ExcelParserService.php` — `parseElectivasFile()` pobla `programa_electivas`
- `app/Http/Controllers/Api/CargaController.php` — validar y pasar `programa_id`
- `app/Http/Controllers/Api/ProgramaController.php` — nuevo método `electivas()`
- `app/Models/Programa.php` — relación `electivas()` via `programa_electivas`
- `app/Models/Agrupacion.php` — agregar relación `slots(): HasMany` hacia `SlotAgrupacion`
- `routes/api.php` — nueva ruta GET programas/{programa}/electivas
- `app/Http/Controllers/MallaController.php` — eager load `agrupaciones.slots` en método `grafica()`
- `resources/js/pages/Cargas/Cargas.tsx` — selector de programa en modal cuando tipo=electivas
- `resources/js/pages/Mallas/Visualizer.tsx` — interfaz `malla.programa` agrega `ID_Programa`; grid incluye slots; modal de electivas

### Nota de tipado (Visualizer.tsx)
La interfaz `Props` debe actualizar `malla.programa`:
```typescript
programa: {
    Nombre_Programa: string;
    ID_Programa: number;   // AGREGAR
};
```

### Nota de respuesta paginada
El endpoint devuelve la estructura Laravel estándar. El fetch en el frontend accede así:
```typescript
const data = await res.json();
setElectivas(data.data ?? []);   // data.data es el array de items dentro de paginate()
```
