<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SlotAgrupacion extends Model
{
    use HasFactory;

    protected $table = 'slots_agrupacion';
    protected $primaryKey = 'ID_Slot';

    protected $fillable = [
        'ID_Agrupacion',
        'Nombre_Slot',
        'Tipo_Slot',
        'Semestre',
        'Orden',
    ];

    protected $casts = [
        'Semestre' => 'integer',
        'Orden'    => 'integer',
    ];

    public $timestamps = true;

    // Relaciones
    public function agrupacion()
    {
        return $this->belongsTo(Agrupacion::class, 'ID_Agrupacion', 'ID_Agrupacion');
    }

    // Scope para buscar por tipo
    public function scopePorTipo($query, $tipo)
    {
        return $query->where('Tipo_Slot', $tipo);
    }

    // Scope para buscar por agrupación
    public function scopePorAgrupacion($query, $agrupacionId)
    {
        return $query->where('ID_Agrupacion', $agrupacionId);
    }

    // Tipos de slots válidos
    const TIPO_OPTATIVA = 'optativa';
    const TIPO_LIBRE = 'libre';
    const TIPO_NIVELATORIO = 'nivelatorio';

    /**
     * Crear un slot a partir de un placeholder del Excel
     */
    public static function crearDesdePlaceholder($idAgrupacion, $nombrePlaceholder, $semestre = null)
    {
        $tipo = self::determinarTipoDesdeNombre($nombrePlaceholder);

        return self::create([
            'ID_Agrupacion' => $idAgrupacion,
            'Nombre_Slot' => $nombrePlaceholder,
            'Tipo_Slot' => $tipo,
            'Semestre' => $semestre,
        ]);
    }

    /**
     * Determinar el tipo de slot basado en el nombre
     */
    private static function determinarTipoDesdeNombre($nombre)
    {
        $nombreUpper = strtoupper($nombre);

        if (str_contains($nombreUpper, 'OPTATIVA')) {
            return self::TIPO_OPTATIVA;
        }

        if (str_contains($nombreUpper, 'LIBRE')) {
            return self::TIPO_LIBRE;
        }

        if (str_contains($nombreUpper, 'NIVELATORIO')) {
            return self::TIPO_NIVELATORIO;
        }

        // Por defecto, si no se puede determinar
        return self::TIPO_LIBRE;
    }
}
