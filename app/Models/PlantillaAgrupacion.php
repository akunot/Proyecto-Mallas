<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PlantillaAgrupacion extends Model
{
    use HasFactory;

    protected $table = 'plantillas_agrupacion';
    protected $primaryKey = 'ID_Plantilla_Agrupacion';

    protected $fillable = [
        'ID_Plantilla_Agrupacion',
        'ID_Programa',
        'ID_Componente',
        'Indice_Agrupacion_Excel',
        'Nombre_Agrupacion',
        'Tipo_Agrupacion',
        'Creditos_Requeridos',
        'Creditos_Maximos',
        'Es_Obligatoria',
    ];

    protected $casts = [
        'Es_Obligatoria' => 'boolean',
        'Creditos_Requeridos' => 'integer',
        'Creditos_Maximos' => 'integer',
        'Indice_Agrupacion_Excel' => 'integer',
    ];

    public $timestamps = true;

    // Relaciones
    public function programa()
    {
        return $this->belongsTo(Programa::class, 'ID_Programa', 'ID_Programa');
    }

    public function componente()
    {
        return $this->belongsTo(Componente::class, 'ID_Componente', 'ID_Componente');
    }

    // Scope para buscar por programa
    public function scopePorPrograma($query, $programaId)
    {
        return $query->where('ID_Programa', $programaId);
    }

    // Scope para buscar por componente
    public function scopePorComponente($query, $componenteId)
    {
        return $query->where('ID_Componente', $componenteId);
    }

    // Método para generar agrupación real a partir de plantilla
    public function generarAgrupacion($idMalla)
    {
        return Agrupacion::create([
            'ID_Malla' => $idMalla,
            'ID_Programa' => $this->ID_Programa,
            'ID_Componente' => $this->ID_Componente,
            'Nombre_Agrupacion' => $this->Nombre_Agrupacion,
            'Tipo_Agrupacion' => $this->Tipo_Agrupacion,
            'Creditos_Requeridos' => $this->Creditos_Requeridos,
            'Creditos_Maximos' => $this->Creditos_Maximos,
            'Es_Obligatoria' => $this->Es_Obligatoria,
        ]);
    }
}
