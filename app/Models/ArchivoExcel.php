<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ArchivoExcel extends Model
{
    protected $table = 'archivos_excel';
    protected $primaryKey = 'ID_Archivo';
    public $incrementing = true;
    protected $keyType = 'int';

    // ✅ AÑADIR ESTO: nunca exponer el binario en JSON/arrays
    protected $hidden = ['Contenido_Archivo'];

    protected $fillable = [
        'ID_Usuario',
        'Tipo_Archivo',
        'Nombre_Archivo',
        'Contenido_Archivo',   // fillable para escritura, pero hidden para lectura JSON
        'Tamanio_Bytes',
        'Hash_Sha256',
        'Estado_Procesamiento',
        'Fecha_Subido',
    ];

    protected $casts = [
        // El contenido se almacena como dato binario y no se expone en JSON
    ];

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'ID_Usuario', 'ID_Usuario');
    }

    public function cargasAsignaturas(): HasMany
    {
        return $this->hasMany(CargaMalla::class, 'ID_Archivo_Asignaturas', 'ID_Archivo');
    }

    public function cargasElectivas(): HasMany
    {
        return $this->hasMany(CargaMalla::class, 'ID_Archivo_Electivas', 'ID_Archivo');
    }

    public function cargasMalla(): HasMany
    {
        return $this->hasMany(CargaMalla::class, 'ID_Archivo_Malla', 'ID_Archivo');
    }
}
