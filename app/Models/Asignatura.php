<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Asignatura extends Model
{
    use HasFactory;

    protected $table = 'asignaturas';

    protected $primaryKey = 'ID_Asignatura';

    public $incrementing = true;

    protected $keyType = 'int';

    protected $casts = [
        'es_electiva_libre' => 'boolean',
    ];

    protected $fillable = [
        'Codigo_Asignatura',
        'Codigo_Base',
        'Nombre_Asignatura',
        'Creditos_Asignatura',
        'Horas_Presencial',
        'Horas_Estudiante',
        'Descripcion_Asignatura',
        'es_electiva_libre',
    ];

    public function agrupaciones(): HasMany
    {
        return $this->hasMany(AgrupacionAsignatura::class, 'ID_Asignatura', 'ID_Asignatura');
    }

    public function requisitos(): HasMany
    {
        return $this->hasMany(Requisito::class, 'ID_Asignatura', 'ID_Asignatura');
    }

    public function esRequisitoDe(): HasMany
    {
        return $this->hasMany(Requisito::class, 'ID_Asignatura_Requerida', 'ID_Asignatura');
    }
}
