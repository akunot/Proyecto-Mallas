<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sede extends Model
{
    protected $table = 'sedes';
    protected $primaryKey = 'ID_Sede';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'Codigo_Sede',
        'Nombre_Sede',
        'Ciudad_Sede',
        'Direccion_Sede',
        'Conmutador_Sede',
        'Campus_Sede',
        'Url_Sede',
    ];

    public function facultades(): HasMany
    {
        return $this->hasMany(Facultad::class, 'ID_Sede', 'ID_Sede');
    }
}
