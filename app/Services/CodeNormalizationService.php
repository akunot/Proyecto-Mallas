<?php

namespace App\Services;

class CodeNormalizationService
{
    /**
     * Normaliza un código de asignatura a su forma base.
     *
     * Reglas de normalización (en orden de aplicación):
     * 1. Si es un número flotante (ej: 4200713.0 o "4200713.0") → trunca decimales: "4200713"
     * 2. Si contiene guión (ej: "1123456-Z") → extrae la parte anterior al primer guión: "1123456"
     * 3. Si es solo número (ej: "4200155") → lo deja como está
     * 4. En otros casos, devuelve el string limpio (sin espacios)
     *
     * @param string|int|float $codigo Código de asignatura (puede venir de Excel como float)
     * @return string Código normalizado
     *
     * Ejemplos:
     * - "4200713.0"     → "4200713"
     * - 4200713.0       → "4200713"
     * - "1123456-Z"     → "1123456"
     * - "1123456-A"     → "1123456"
     * - "ABC-123-X"     → "ABC"  (conserva prefijo no-numérico)
     * - "4200155"       → "4200155"
     * - " MAT101 "      → "MAT101" (trim)
     */
    public static function normalize($codigo): string
    {
        // 1. Convertir a string y limpiar espacios
        $codigo = trim((string)$codigo);

        if ($codigo === '') {
            throw new \InvalidArgumentException('El código de asignatura no puede estar vacío.');
        }

        // 2. Caso float de Excel: si es numérico y contiene punto decimal
        if (is_numeric($codigo) && str_contains($codigo, '.')) {
            // Truncar parte decimal (floor para redondear hacia abajo)
            return (string)(int)floatval($codigo);
        }

        // 3. Caso guión: "1123456-Z" → "1123456"
        if (str_contains($codigo, '-')) {
            $partes = explode('-', $codigo, 2);
            $principal = $partes[0];

            // Extraer solo caracteres alfanuméricos de la parte principal
            $limpio = preg_replace('/[^a-zA-Z0-9]/', '', $principal);

            // Si tras limpiar queda vacío (ej: "-Z"), devolver la parte original
            return $limpio !== '' ? $limpio : $principal;
        }

        // 4. Caso simple: código puro (numérico o alfanumérico)
        return $codigo;
    }

    /**
     * Extrae únicamente la parte numérica del código normalizado.
     * Útil para búsquedas o comparaciones que solo necesitan dígitos.
     *
     * @param string $codigo Código ya normalizado o por normalizar
     * @return string Solo dígitos (ej: "4200155")
     */
    public static function numericPart(string $codigo): string
    {
        $normalizado = self::normalize($codigo);
        return preg_replace('/[^0-9]/', '', $normalizado);
    }

    /**
     * Valida si un código es potencialmente una sección (contiene guión o sufijo).
     * Para detectar cuando hay múltiples variantes del mismo código base.
     *
     * @param string $codigo
     * @return bool
     */
    public static function tieneSufijoSeccion(string $codigo): bool
    {
        $codigo = trim($codigo);
        // Si contiene guión o punto decimal (Excel float)
        return str_contains($codigo, '-') || (is_numeric($codigo) && str_contains($codigo, '.'));
    }
}
