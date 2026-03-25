<?php

namespace App\Http\Controllers\Api;

use App\Models\Normativa;
use App\Models\Programa;
use Illuminate\Database\Eloquent\Model;

class NormativaController extends CatalogoController
{
    protected Model $model;
    protected string $routeName = 'normativa';

    public function __construct()
    {
        $this->model = new Normativa();
        $this->fillable = [
            'ID_Normativa',
            'ID_Programa',
            'Tipo_Normativa',
            'Numero_Normativa',
            'Anio_Normativa',
            'Instancia',
            'Descripcion_Normativa',
            'Url_Normativa',
            'Esta_Activo',
        ];
    }

    protected function getActiveField(): string
    {
        return 'Esta_Activo';
    }

    protected function getRelatedData(): array
    {
        return [
            'programas' => Programa::select('ID_Programa', 'Nombre_Programa')->get()->toArray(),
        ];
    }
}
