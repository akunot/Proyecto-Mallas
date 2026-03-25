<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ArchivoExcel extends Model
{
    protected $table = 'archivos_excel';
    protected $primaryKey = 'ID_Archivo';

    protected $fillable = [
        'ID_Usuario',
        'Nombre_Archivo',
        'Contenido_Archivo',
        'Tamanio_Bytes',
        'Hash_Sha256',
        'Estado_Procesamiento',
    ];

    protected $casts = [
        'Contenido_Archivo' => 'encrypted:256',
    ];

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'ID_Usuario', 'ID_Usuario');
    }

    public function cargas(): HasMany
    {
        return $this->hasMany(CargaMalla::class, 'ID_Archivo', 'ID_Archivo');
    }
}
