<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LogActividad extends Model
{
    protected $table = 'logs_actividad';
    protected $primaryKey = 'ID_Log';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'ID_Usuario',
        'Accion_Log',
        'Entidad_Log',
        'Entidad_ID_Log',
        'Detalle_Log',
        'IP_Origen_Log',
    ];

    protected $casts = [
        'Detalle_Log' => 'array',
    ];

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'ID_Usuario', 'ID_Usuario');
    }
}
