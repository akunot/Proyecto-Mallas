<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProgramaElectiva extends Model
{
    protected $table      = 'programa_electivas';
    protected $primaryKey = 'ID_Prog_Electiva';

    protected $fillable = [
        'ID_Programa',
        'ID_Asignatura',
    ];

    public function programa(): BelongsTo
    {
        return $this->belongsTo(Programa::class, 'ID_Programa', 'ID_Programa');
    }

    public function asignatura(): BelongsTo
    {
        return $this->belongsTo(Asignatura::class, 'ID_Asignatura', 'ID_Asignatura');
    }
}
