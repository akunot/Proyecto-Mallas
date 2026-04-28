<?php

namespace App\Http\Controllers\Api;

use App\Models\Asignatura;
use Illuminate\Http\Request;

class AsignaturaController extends CatalogoController
{
    protected \Illuminate\Database\Eloquent\Model $model;
    protected string $routeName = 'asignatura';

    public function __construct()
    {
        $this->model = new Asignatura();
        $this->fillable = [
            'Codigo_Asignatura',
            'Nombre_Asignatura',
            'Creditos_Asignatura',
            'Horas_Presencial',
            'Horas_Estudiante',
            'Descripcion_Asignatura',
        ];
    }

    /**
     * Lista paginada con búsqueda y filtrado por tipo contextual
     */
    public function index(Request $request)
    {
        $query = $this->model->query();

        // Búsqueda por nombre
        if ($request->has('search') && $request->search) {
            $searchField = $this->fillable[1] ?? 'Nombre_' . ucfirst($this->routeName);
            $query->where($searchField, 'like', '%' . $request->search . '%');
        }

        // Filtrado por tipo de asignatura (ahora contextual)
        if ($request->has('tipo') && $request->tipo) {
            if ($request->tipo === 'regular') {
                $query->whereHas('agrupaciones', function($q) {
                    $q->where('Tipo_Asignatura', 'regular');
                });
            } elseif ($request->tipo === 'electiva') {
                $query->whereHas('agrupaciones', function($q) {
                    $q->where('Tipo_Asignatura', 'electiva');
                });
            }
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

    protected function getActiveField(string $model): ?string
    {
        // Las asignaturas no tienen campo activo
        return null;
    }
}
