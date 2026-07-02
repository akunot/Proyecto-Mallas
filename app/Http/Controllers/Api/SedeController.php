<?php

namespace App\Http\Controllers\Api;

use App\Models\Sede;

class SedeController extends CatalogoController
{
    protected string $routeName = 'sede';

    public function __construct()
    {
        $this->model = new Sede;
        $this->fillable = [
            'Codigo_Sede',
            'Nombre_Sede',
            'Ciudad_Sede',
            'Direccion_Sede',
            'Conmutador_Sede',
            'Campus_Sede',
            'Url_Sede',
        ];
    }

    protected function getRelatedData(): array
    {
        return [
            'sedes' => Sede::select('Codigo_Sede', 'Nombre_Sede')->get()->toArray(),
        ];
    }

    protected function getActiveField(string $model): ?string
    {
        // Las sedes no tienen campo activo en la BD actual
        return null;
    }
}
