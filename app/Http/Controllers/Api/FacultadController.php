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
            'Codigo_Sede',
            'Codigo_Facultad',
            'Nombre_Facultad',
            'Conmutador_Facultad',
            'Extension_Facultad',
            'Campus_Facultad',
            'Url_Facultad',
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
            'sedes' => Sede::select('Codigo_Sede', 'Nombre_Sede')->get()->toArray(),
        ];
    }
}
