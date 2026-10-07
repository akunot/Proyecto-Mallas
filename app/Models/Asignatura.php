<?php

namespace App\Models;

use App\Services\CodeNormalizationService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Asignatura extends Model
{
    use HasFactory;

    protected $table = 'asignaturas';

    protected $primaryKey = 'ID_Asignatura';

    public $incrementing = true;

    protected $keyType = 'int';

    protected $casts = [
        'es_electiva_libre' => 'boolean',
    ];

    protected $fillable = [
        'Codigo_Asignatura',
        'Codigo_Base',
        'Nombre_Asignatura',
        'Creditos_Asignatura',
        'Horas_Presencial',
        'Horas_Estudiante',
        'Descripcion_Asignatura',
        'es_electiva_libre',
    ];

    /**
     * Codigo_Base es la clave de busqueda del catalogo: el importador de mallas
     * resuelve cada asignatura con "WHERE Codigo_Base = normalize(codigo)".
     * Se deriva aqui para que toda escritura Eloquent (CRUD, tinker, seeds)
     * deje la misma clave que calcula el importador y la migracion de backfill.
     */
    protected static function booted(): void
    {
        static::saving(function (Asignatura $asignatura): void {
            $codigo = $asignatura->Codigo_Asignatura;

            if ($codigo === null || trim((string) $codigo) === '') {
                return;
            }

            $codigoBase = $asignatura->Codigo_Base;

            if ($codigoBase === null || $codigoBase === '') {
                $asignatura->Codigo_Base = CodeNormalizationService::normalize($codigo);

                return;
            }

            // Si el codigo cambia y no se indico una base explicita en la misma
            // escritura, la base debe recalcularse para no quedar desincronizada.
            if ($asignatura->isDirty('Codigo_Asignatura') && ! $asignatura->isDirty('Codigo_Base')) {
                $asignatura->Codigo_Base = CodeNormalizationService::normalize($codigo);
            }
        });
    }

    public function agrupaciones(): HasMany
    {
        return $this->hasMany(AgrupacionAsignatura::class, 'ID_Asignatura', 'ID_Asignatura');
    }

    public function requisitos(): HasMany
    {
        return $this->hasMany(Requisito::class, 'ID_Asignatura', 'ID_Asignatura');
    }

    public function esRequisitoDe(): HasMany
    {
        return $this->hasMany(Requisito::class, 'ID_Asignatura_Requerida', 'ID_Asignatura');
    }
}
