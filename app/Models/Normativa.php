<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Normativa extends Model
{
    protected $table = 'normativas';
    protected $primaryKey = 'ID_Normativa';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'ID_Programa',
        'Tipo_Normativa',
        'Numero_Normativa',
        'Anio_Normativa',
        'Instancia',
        'Descripcion_Normativa',
        'Url_Normativa',
        'Esta_Activo',
    ];

    public function programa(): BelongsTo
    {
        return $this->belongsTo(Programa::class, 'ID_Programa', 'ID_Programa');
    }

    public function mallasCurriculares(): HasMany
    {
        return $this->hasMany(MallaCurricular::class, 'ID_Normativa', 'ID_Normativa');
    }
}
