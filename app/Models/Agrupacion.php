<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Agrupacion extends Model
{
    protected $table = 'agrupaciones';
    protected $primaryKey = 'ID_Agrupacion';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'ID_Malla',
        'ID_Componente',
        'Nombre_Agrupacion',
        'Creditos_Requeridos',
        'Creditos_Maximos',
        'Es_Obligatoria',
    ];

    protected $casts = [
        'Es_Obligatoria' => 'boolean',
    ];

    public function malla(): BelongsTo
    {
        return $this->belongsTo(MallaCurricular::class, 'ID_Malla', 'ID_Malla');
    }

    public function componente(): BelongsTo
    {
        return $this->belongsTo(Componente::class, 'ID_Componente', 'ID_Componente');
    }

    public function agrupacionAsignaturas(): HasMany
    {
        return $this->hasMany(AgrupacionAsignatura::class, 'ID_Agrupacion', 'ID_Agrupacion');
    }
}
