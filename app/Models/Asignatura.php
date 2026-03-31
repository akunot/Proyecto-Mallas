<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Asignatura extends Model
{
    protected $table = 'asignaturas';
    protected $primaryKey = 'ID_Asignatura';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'Codigo_Asignatura',
        'Nombre_Asignatura',
        'Creditos_Asignatura',
        'Horas_Presencial',
        'Horas_Estudiante',
        'Descripcion_Asignatura',
    ];

    public function agrupaciones(): HasMany
    {
        return $this->hasMany(AgrupacionAsignatura::class, 'ID_Asignatura', 'ID_Asignatura');
    }
}
