<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Componente extends Model
{
    protected $table = 'componentes';
    protected $primaryKey = 'ID_Componente';

    protected $fillable = [
        'Nombre_Componente',
        'Descripcion_Componente',
    ];

    public function agrupaciones(): HasMany
    {
        return $this->hasMany(Agrupacion::class, 'ID_Componente', 'ID_Componente');
    }
}
