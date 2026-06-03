<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Requisito extends Model
{
    protected $table = "requisitos";
    protected $primaryKey = "ID_Requisito";
    public $incrementing = true;
    protected $keyType = "int";

    protected $fillable = [
        "ID_Asignatura",
        "ID_Programa",
        "ID_Asignatura_Requerida",
        "Tipo_Requisito",
        "Creditos_Minimos",
        "Valor_Creditos",
        "Descripcion_Requisito",
    ];

    public function asignatura(): BelongsTo
    {
        return $this->belongsTo(Asignatura::class, "ID_Asignatura", "ID_Asignatura");
    }

    public function programa(): BelongsTo
    {
        return $this->belongsTo(Programa::class, "ID_Programa", "ID_Programa");
    }

    public function asignaturaRequerida(): BelongsTo
    {
        return $this->belongsTo(Asignatura::class, "ID_Asignatura_Requerida", "ID_Asignatura");
    }
}