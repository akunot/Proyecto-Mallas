<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Facultad extends Model
{
    protected $table = 'facultades';
    protected $primaryKey = 'ID_Facultad';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'ID_Sede',
        'Codigo_Facultad',
        'Nombre_Facultad',
        'Conmutador_Facultad',
        'Extension_Facultad',
        'Campus_Facultad',
        'Url_Facultad',
        'Esta_Activo',
    ];

    public function sede(): BelongsTo
    {
        return $this->belongsTo(Sede::class, 'ID_Sede', 'ID_Sede');
    }

    public function programas(): HasMany
    {
        return $this->hasMany(Programa::class, 'ID_Facultad', 'ID_Facultad');
    }
}
