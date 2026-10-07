<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Formato único de `Codigo_Asignatura` para todos los canales de escritura HTTP.
 *
 * El catálogo real contiene códigos numéricos ("1000001"), de sección
 * ("1000057-Z") y legados alfanuméricos ("OPTATIVA1"): letras y dígitos con un
 * sufijo opcional separado por un solo guion, máximo 20 caracteres.
 * Los espacios internos y los puntos quedan fuera porque producen claves de
 * búsqueda ambiguas en `Codigo_Base` (ver CodeNormalizationService).
 */
class CodigoAsignatura implements ValidationRule
{
    public const MAX_LONGITUD = 20;

    public const PATRON = '/\A[A-Za-z0-9]+(?:-[A-Za-z0-9]+)?\z/';

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (is_int($value) || is_float($value)) {
            $value = (string) $value;
        }

        if (! is_string($value)) {
            $fail('El código de asignatura debe ser un texto.');

            return;
        }

        if (mb_strlen($value) > self::MAX_LONGITUD) {
            $fail('El código de asignatura no puede superar los '.self::MAX_LONGITUD.' caracteres.');

            return;
        }

        if (preg_match(self::PATRON, $value) !== 1) {
            $fail('El código de asignatura solo admite letras, dígitos y un sufijo opcional con guion (ej.: 1000001, 1000057-Z); sin espacios ni puntos.');
        }
    }
}
