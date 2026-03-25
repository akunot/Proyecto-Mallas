<?php

namespace App\Http\Controllers\Api;

use App\Models\Sede;
use Illuminate\Database\Eloquent\Model;

class SedeController extends CatalogoController
{
    protected \Illuminate\Database\Eloquent\Model $model;
    protected string $routeName = 'sede';

    public function __construct()
    {
        $this->model = new Sede();
        $this->fillable = [
            'ID_Sede',
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
            'sedes' => Sede::select('ID_Sede', 'Nombre_Sede')->get()->toArray(),
        ];
    }
}
