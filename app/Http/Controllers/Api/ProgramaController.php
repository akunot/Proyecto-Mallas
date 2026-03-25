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
            'ID_Programa',
            'ID_Facultad',
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
            'Activo_Programa',
        ];
    }

    protected function getActiveField(): string
    {
        return 'Activo_Programa';
    }

    protected function getRelatedData(): array
    {
        return [
            'facultades' => Facultad::select('ID_Facultad', 'Nombre_Facultad')->get()->toArray(),
        ];
    }
}
