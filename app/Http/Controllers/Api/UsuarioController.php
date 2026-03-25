<?php

namespace App\Http\Controllers\Api;

use App\Models\Usuario;

class UsuarioController extends CatalogoController
{
    protected \Illuminate\Database\Eloquent\Model $model;
    protected string $routeName = 'usuario';

    public function __construct()
    {
        $this->model = new Usuario();
        $this->fillable = [
            'ID_Usuario',
            'Nombre_Usuario',
            'Email_Usuario',
            'Activo_Usuario',
        ];
    }

    protected function getActiveField(): string
    {
        return 'Activo_Usuario';
    }
}
