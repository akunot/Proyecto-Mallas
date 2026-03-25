<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MallaCurricular extends Model
{
    protected $table = 'mallas_curriculares';
    protected $primaryKey = 'ID_Malla';

    protected $fillable = [
        'ID_Normativa',
        'ID_Programa',
        'Version_Numero',
        'Version_Etiqueta',
        'Fecha_Vigencia',
        'Fecha_Fin_Vigencia',
        'Estado',
        'Es_Vigente',
    ];

    protected $casts = [
        'Fecha_Vigencia' => 'date',
        'Fecha_Fin_Vigencia' => 'date',
        'Es_Vigente' => 'boolean',
    ];

    public function normativa(): BelongsTo
    {
        return $this->belongsTo(Normativa::class, 'ID_Normativa', 'ID_Normativa');
    }

    public function programa(): BelongsTo
    {
        return $this->belongsTo(Programa::class, 'ID_Programa', 'ID_Programa');
    }

    public function agrupaciones(): HasMany
    {
        return $this->hasMany(Agrupacion::class, 'ID_Malla', 'ID_Malla');
    }

    public function cargas(): HasMany
    {
        return $this->hasMany(CargaMalla::class, 'ID_Malla', 'ID_Malla');
    }
}
