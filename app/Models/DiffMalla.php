<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DiffMalla extends Model
{
    protected $table = 'diffs_mallas';
    protected $primaryKey = 'ID_Diff';

    protected $fillable = [
        'ID_Carga',
        'Entidad_Afectada',
        'Tipo_Cambio',
        'ID_Registro',
        'Valor_Anterior',
        'Valor_Nuevo',
    ];

    protected $casts = [
        'Valor_Anterior' => 'array',
        'Valor_Nuevo' => 'array',
    ];

    public function carga(): BelongsTo
    {
        return $this->belongsTo(CargaMalla::class, 'ID_Carga', 'ID_Carga');
    }
}
