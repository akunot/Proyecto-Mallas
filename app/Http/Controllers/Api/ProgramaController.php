<?php

namespace App\Http\Controllers\Api;

use App\Models\Programa;
use App\Models\Facultad;
use Illuminate\Database\Eloquent\Model;

class ProgramaController extends CatalogoController
{
    protected \Illuminate\Database\Eloquent\Model $model;
    protected string $routeName = 'programa';

    public function __construct()
    {
        $this->model = new Programa();
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
}
