<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ErrorCarga extends Model
{
    protected $table = 'errores_carga';
    protected $primaryKey = 'ID_Error';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'ID_Carga',
        'Fila_Error',
        'Columna_Error',
        'Mensaje_Error',
        'Valor_Recibido',
        'Severidad_Error',
    ];

    public function carga(): BelongsTo
    {
        return $this->belongsTo(CargaMalla::class, 'ID_Carga', 'ID_Carga');
    }
}
