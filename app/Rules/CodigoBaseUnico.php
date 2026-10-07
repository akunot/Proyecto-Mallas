<?php

namespace App\Rules;

use App\Models\Asignatura;
use App\Services\CodeNormalizationService;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * `Codigo_Base` es UNIQUE y es la clave con la que el importador de mallas
 * localiza cada asignatura ("WHERE Codigo_Base = normalize(codigo)"): dos
 * códigos distintos no pueden normalizar a la misma base ("111111" y
 * "111111-Z" son excluyentes).
 */
class CodigoBaseUnico implements ValidationRule
{
    public function __construct(private ?int $ignorarId = null) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (is_int($value) || is_float($value)) {
            $value = (string) $value;
        }

        if (! is_string($value) || trim($value) === '') {
            return;
        }

        try {
            $base = CodeNormalizationService::normalize($value);
        } catch (\InvalidArgumentException) {
            return;
        }

        $query = Asignatura::query()->where('Codigo_Base', $base);

        if ($this->ignorarId !== null) {
            $query->where('ID_Asignatura', '!=', $this->ignorarId);
        }

        $duplicada = $query->first(['ID_Asignatura', 'Codigo_Asignatura']);

        if ($duplicada === null) {
            return;
        }

        if ($duplicada->Codigo_Asignatura === $value) {
            $fail("Ya existe una asignatura con el código '{$value}' (ID {$duplicada->ID_Asignatura}).");

            return;
        }

        $fail("El código '{$value}' comparte la base '{$base}' con la asignatura '{$duplicada->Codigo_Asignatura}' (ID {$duplicada->ID_Asignatura}); no pueden coexistir.");
    }
}
