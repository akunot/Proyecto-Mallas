<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Programa extends Model
{
    protected $table = 'programas';
    protected $primaryKey = 'ID_Programa';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'Codigo_Facultad',
        'Codigo_Programa',
        'Nombre_Programa',
        'Titulo_Otorgado',
        'Nivel_Formacion',
        'Creditos_Totales',
        'Duracion_Semestres',
        'Codigo_SNIES',
        'Url_Programa',
        'Campus_Programa',
        'Conmutador',
        'Extension',
        'Correo',
        'Area_Curricular',
        'Esta_Activo',
    ];

    public function facultad(): BelongsTo
    {
        return $this->belongsTo(Facultad::class, 'Codigo_Facultad', 'Codigo_Facultad');
    }

    public function normativas(): HasMany
    {
        return $this->hasMany(Normativa::class, 'Codigo_Programa', 'Codigo_Programa');
    }

    public function mallaVigente()
    {
        return $this->hasOne(MallaCurricular::class, 'ID_Programa', 'ID_Programa')
            ->where('Es_Vigente', 1);
    }
}
