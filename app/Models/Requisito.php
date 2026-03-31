<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Requisito extends Model
{
    protected $table = 'requisitos';
    protected $primaryKey = 'ID_Requisito';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'ID_Agrup_Asig',
        'ID_Agrup_Asig_Requerida',
        'Tipo_Requisito',
        'Creditos_Minimos',
        'Descripcion_Requisito',
    ];

    public function agrupacionAsignatura(): BelongsTo
    {
        return $this->belongsTo(AgrupacionAsignatura::class, 'ID_Agrup_Asig', 'ID_Agrup_Asig');
    }

    public function agrupacionAsignaturaRequerida(): BelongsTo
    {
        return $this->belongsTo(AgrupacionAsignatura::class, 'ID_Agrup_Asig_Requerida', 'ID_Agrup_Asig');
    }
}
