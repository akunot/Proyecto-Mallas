<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Model;

class CatalogoController extends Controller
{
    /**
     * Modelo de la entidad
     */
    protected Model $model;

    /**
     * Nombre de la ruta para mensajes
     */
    protected string $routeName;

    /**
     * Campos fillable del modelo
     */
    protected array $fillable = [];

    /**
     * Lista paginada con búsqueda
     */
    public function index(Request $request)
    {
        $query = $this->model->query();

        // Búsqueda por nombre
        if ($request->has('search') && $request->search) {
            $searchField = $this->fillable[1] ?? 'Nombre_' . ucfirst($this->routeName);
            $query->where($searchField, 'like', '%' . $request->search . '%');
        }

        // Ordenamiento
        $sortField = $request->sort_by ?? $this->fillable[1] ?? 'id';
        $sortOrder = $request->sort_order ?? 'asc';
        $query->orderBy($sortField, $sortOrder);

        // Paginación
        $perPage = $request->per_page ?? 20;
        $results = $query->paginate($perPage);

        // Limpieza eficiente de UTF-8 usando json_encode/json_decode (nativo en C)
        $cleanItems = json_decode(json_encode($results->items(), JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_IGNORE), true);

        return response()->json([
            'data' => $cleanItems,
            'meta' => [
                'current_page' => $results->currentPage(),
                'total' => $results->total(),
                'per_page' => $results->perPage(),
                'last_page' => $results->lastPage(),
            ],
            'message' => '',
        ]);
    }

    /**
     * Ver un registro específico
     */
    public function show(int $id)
    {
        $record = $this->model->findOrFail($id);

        // Limpieza eficiente de UTF-8
        $cleanRecord = json_decode(json_encode($record, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_IGNORE), true);

        return response()->json([
            'data' => $cleanRecord,
            'message' => '',
        ]);
    }

    /**
     * Crear un nuevo registro
     */
    public function store(Request $request)
    {
        $validated = $request->validate($this->getValidationRules('create'));

        $record = $this->model->create($validated);

        // Limpieza eficiente de UTF-8
        $cleanRecord = json_decode(json_encode($record, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_IGNORE), true);

        return response()->json([
            'data' => $cleanRecord,
            'message' => ucfirst($this->routeName) . ' creado exitosamente.',
        ], 201);
    }

    /**
     * Actualizar un registro
     */
    public function update(Request $request, int $id)
    {
        $record = $this->model->findOrFail($id);

        $validated = $request->validate($this->getValidationRules('update'));

        $record->update($validated);

        // Limpieza eficiente de UTF-8
        $cleanRecord = json_decode(json_encode($record, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_IGNORE), true);

        return response()->json([
            'data' => $cleanRecord,
            'message' => ucfirst($this->routeName) . ' actualizado exitosamente.',
        ]);
    }

    /**
     * Activar/desactivar un registro
     */
    public function toggle(int $id)
    {
        $record = $this->model->findOrFail($id);

        // Determinar el campo de activo
        $modelName = class_basename($this->model);
        $activeField = $this->getActiveField($modelName);

        // Si no hay campo activo, retornar error
        if (!$activeField) {
            return response()->json([
                'data' => null,
                'message' => 'Este catálogo no soporta activación/desactivación.',
            ], 422);
        }

        $newStatus = !$record->{$activeField};

        $record->update([$activeField => $newStatus]);

        $statusText = $newStatus ? 'activado' : 'desactivado';

        // Limpieza eficiente de UTF-8
        $cleanRecord = json_decode(json_encode($record, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_IGNORE), true);

        return response()->json([
            'data' => $cleanRecord,
            'message' => ucfirst($this->routeName) . ' ' . $statusText . ' exitosamente.',
        ]);
    }

    /**
     * Eliminar un registro
     */
    public function destroy(int $id)
    {
        $record = $this->model->findOrFail($id);
        $record->delete();

        return response()->json([
            'data' => null,
            'message' => ucfirst($this->routeName) . ' eliminado exitosamente.',
        ]);
    }

    /**
     * Editar un registro - devuelve página de Inertia
     */
    public function edit(int $id)
    {
        $record = $this->model->findOrFail($id);
        
        // Obtener datos relacionados según el controlador
        $relatedData = $this->getRelatedData();
        
        return inertia($this->getInertiaComponent(), array_merge(
            [strtolower($this->routeName) => $record->toArray()],
            $relatedData
        ));
    }

    /**
     * Obtener datos relacionados para el formulario
     */
    protected function getRelatedData(): array
    {
        return [];
    }

    /**
     * Obtener nombre del componente de Inertia
     */
    protected function getInertiaComponent(): string
    {
        return 'Catalogos/' . ucfirst($this->routeName) . 'sForm';
    }

    /**
     * Obtener reglas de validación basadas en el modelo
     */
    protected function getValidationRules(string $type): array
    {
        // Definir reglas según el tipo de request
        $rules = [];

        foreach ($this->fillable as $field) {
            if (str_contains($field, 'Nombre') || str_contains($field, 'nombre')) {
                $rules[$field] = 'required|string|max:150';
            } elseif (str_contains($field, 'Ciudad') || str_contains($field, 'Ciudad')) {
                $rules[$field] = 'required|string|max:100';
            } elseif (str_contains($field, 'Codigo') || str_contains($field, 'codigo')) {
                $rules[$field] = 'required|string|max:20';
            } elseif (str_contains($field, 'Email')) {
                $rules[$field] = 'required|email';
            } elseif (str_contains($field, 'Creditos') || str_contains($field, 'Duracion')) {
                $rules[$field] = 'nullable|integer|min:0';
            } elseif (str_contains($field, 'ID_')) {
                $rules[$field] = 'required|integer';
            } else {
                $rules[$field] = 'nullable|string';
            }
        }

        // Para update, hacer campos opcionales
        if ($type === 'update') {
            foreach ($rules as $key => $rule) {
                $rules[$key] = str_replace('required|', 'nullable|', $rule);
            }
        }

        return $rules;
    }

    /**
     * Obtener el campo de activo del modelo
     */
    private function getActiveField(string $model): ?string
    {
        $map = [
            'Sede'       => 'Activo_Sede',
            'Facultad'   => 'Activo_Facultad',
            'Programa'   => 'Activo_Programa',
            'Normativa'  => 'Activo_Normativa',
            'Componente' => 'Activo_Componente',
            'Asignatura' => 'Activo_Asignatura',
            'Usuario'    => 'Esta_Activo',
        ];
        return $map[$model] ?? null;
    }
}
