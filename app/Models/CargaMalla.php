<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CargaMalla extends Model
{
    protected $table = 'cargas_mallas';
    protected $primaryKey = 'ID_Carga';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'ID_Archivo_Asignaturas',
        'ID_Archivo_Electivas',
        'ID_Archivo_Malla',
        'ID_Malla',
        'ID_Malla_Base',
        'ID_Usuario',
        'ID_Programa',
        'ID_Normativa',
        'tipo_carga',
        'Estado_Carga',
        'Comentario_Carga',
        'Comentario_Revisor',
        'ID_Usuario_Revisor',
        'Fecha_Revision',
    ];

    protected $casts = [
        'Fecha_Revision' => 'datetime',
    ];

    public function archivo(): BelongsTo
    {
        return $this->belongsTo(ArchivoExcel::class, 'ID_Archivo_Malla', 'ID_Archivo');
    }

    public function archivoAsignaturas(): BelongsTo
    {
        return $this->belongsTo(ArchivoExcel::class, 'ID_Archivo_Asignaturas', 'ID_Archivo');
    }

    public function archivoElectivas(): BelongsTo
    {
        return $this->belongsTo(ArchivoExcel::class, 'ID_Archivo_Electivas', 'ID_Archivo');
    }

    public function archivoMalla(): BelongsTo
    {
        return $this->belongsTo(ArchivoExcel::class, 'ID_Archivo_Malla', 'ID_Archivo');
    }

    public function malla(): BelongsTo
    {
        return $this->belongsTo(MallaCurricular::class, 'ID_Malla', 'ID_Malla');
    }

    public function normativa(): BelongsTo
    {
        return $this->belongsTo(Normativa::class, 'ID_Normativa', 'ID_Normativa');
    }

    public function programa(): BelongsTo
    {
        return $this->belongsTo(Programa::class, 'ID_Programa', 'ID_Programa');
    }

    public function mallaBase(): BelongsTo
    {
        return $this->belongsTo(MallaCurricular::class, 'ID_Malla_Base', 'ID_Malla');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'ID_Usuario', 'ID_Usuario');
    }

    public function usuarioRevisor(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'ID_Usuario_Revisor', 'ID_Usuario');
    }

    public function errores(): HasMany
    {
        return $this->hasMany(ErrorCarga::class, 'ID_Carga', 'ID_Carga');
    }

    public function diffs(): HasMany
    {
        return $this->hasMany(DiffMalla::class, 'ID_Carga', 'ID_Carga');
    }
}
