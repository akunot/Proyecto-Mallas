<?php

namespace App\Http\Controllers\Api;

use App\Models\Asignatura;

class AsignaturaController extends CatalogoController
{
    protected \Illuminate\Database\Eloquent\Model $model;
    protected string $routeName = 'asignatura';

    public function __construct()
    {
        $this->model = new Asignatura();
        $this->fillable = [
            'ID_Asignatura',
            'Codigo_Asignatura',
            'Nombre_Asignatura',
            'Creditos_Asignatura',
            'Horas_Presencial',
            'Horas_Estudiante',
            'Descripcion_Asignatura',
        ];
    }

    protected function getActiveField(): string
    {
        // Las asignaturas no tienen campo activo
        return 'id';
    }
}
