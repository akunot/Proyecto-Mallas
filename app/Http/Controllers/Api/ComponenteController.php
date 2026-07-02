<?php

namespace App\Http\Controllers\Api;

use App\Models\Componente;

class ComponenteController extends CatalogoController
{
    protected string $routeName = 'componente';

    public function __construct()
    {
        $this->model = new Componente;
        $this->fillable = [
            'Nombre_Componente',
            'Descripcion_Componente',
        ];
    }

    protected function getActiveField(string $model): ?string
    {
        // Los componentes no tienen campo activo en la BD actual
        return null;
    }
}
