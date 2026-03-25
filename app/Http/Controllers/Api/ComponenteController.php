<?php

namespace App\Http\Controllers\Api;

use App\Models\Componente;
use Illuminate\Database\Eloquent\Model;

class ComponenteController extends CatalogoController
{
    protected \Illuminate\Database\Eloquent\Model $model;
    protected string $routeName = 'componente';

    public function __construct()
    {
        $this->model = new Componente();
        $this->fillable = [
            'ID_Componente',
            'Nombre_Componente',
            'Descripcion_Componente',
        ];
    }

    protected function getActiveField(): string
    {
        // Los componentes no tienen campo activo
        return 'id';
    }
}
