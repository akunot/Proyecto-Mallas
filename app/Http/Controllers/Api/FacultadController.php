<?php

namespace App\Http\Controllers\Api;

use App\Models\Facultad;
use App\Models\Sede;
use Illuminate\Database\Eloquent\Model;

class FacultadController extends CatalogoController
{
    protected \Illuminate\Database\Eloquent\Model $model;
    protected string $routeName = 'facultad';

    public function __construct()
    {
        $this->model = new Facultad();
        $this->fillable = [
            'ID_Facultad',
            'ID_Sede',
            'Nombre_Facultad',
            'Conmutador_Facultad',
            'Extension_Facultad',
            'Campus_Facultad',
            'Url_Facultad',
        ];
    }

    protected function getActiveField(): string
    {
        // Las facultades no tienen campo activo, siempre están activas
        return 'id';
    }

    protected function getRelatedData(): array
    {
        return [
            'sedes' => Sede::select('ID_Sede', 'Nombre_Sede')->get()->toArray(),
        ];
    }
}
