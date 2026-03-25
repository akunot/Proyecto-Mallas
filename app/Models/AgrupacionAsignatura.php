<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AgrupacionAsignatura extends Model
{
    protected $table = 'agrupacion_asignatura';
    protected $primaryKey = 'ID_Agrup_Asig';

    protected $fillable = [
        'ID_Agrupacion',
        'ID_Asignatura',
        'Tipo_Asignatura',
        'Semestre_Sugerido',
    ];

    public function agrupacion(): BelongsTo
    {
        return $this->belongsTo(Agrupacion::class, 'ID_Agrupacion', 'ID_Agrupacion');
    }

    public function asignatura(): BelongsTo
    {
        return $this->belongsTo(Asignatura::class, 'ID_Asignatura', 'ID_Asignatura');
    }

    public function requisitos(): HasMany
    {
        return $this->hasMany(Requisito::class, 'ID_Agrup_Asig', 'ID_Agrup_Asig');
    }

    public function requisitosRequeridos(): HasMany
    {
        return $this->hasMany(Requisito::class, 'ID_Agrup_Asig_Requerida', 'ID_Agrup_Asig');
    }
}
