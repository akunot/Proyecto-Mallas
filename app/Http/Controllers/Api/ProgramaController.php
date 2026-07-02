<?php

namespace App\Http\Controllers\Api;

use App\Models\Facultad;
use App\Models\Programa;

class ProgramaController extends CatalogoController
{
    protected string $routeName = 'programa';

    public function __construct()
    {
        $this->model = new Programa;
        $this->fillable = [
            'Codigo_Facultad',
            'Codigo_Programa',
            'Nombre_Programa',
            'Titulo_Otorgado',
            'Nivel_Formacion',
            'Creditos_Totales',
            'Duracion_Semestres',
            'Codigo_SNIES',
            'Url_Programa',
            'Campus_Programa',
            'Conmutador',
            'Extension',
            'Correo',
            'Area_Curricular',
            'Esta_Activo',
        ];
    }

    protected function getActiveField(string $model): ?string
    {
        return 'Esta_Activo';
    }

    protected function getRelatedData(): array
    {
        return [
            'facultades' => Facultad::select('Codigo_Facultad', 'Nombre_Facultad')->get()->toArray(),
        ];
    }

    public function electivas(int $id): JsonResponse
    {
        $programa = Programa::findOrFail($id);
        $electivas = $programa->electivas()
            ->select('asignaturas.ID_Asignatura', 'Codigo_Asignatura', 'Nombre_Asignatura', 'Creditos_Asignatura')
            ->with(['requisitos.asignaturaRequerida'])
            ->orderBy('Nombre_Asignatura')
            ->paginate(200);

        return response()->json([
            'data' => $electivas->items(),
            'meta' => [
                'total' => $electivas->total(),
                'current_page' => $electivas->currentPage(),
                'last_page' => $electivas->lastPage(),
            ],
        ]);
    }
}
