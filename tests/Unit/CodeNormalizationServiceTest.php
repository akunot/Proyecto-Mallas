<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Services\CodeNormalizationService;

class CodeNormalizationServiceTest extends TestCase
{
    /**
     * @dataProvider codigoProvider
     */
    public function test_normalize_elimina_sufijos_y_formatea_correctamente($input, $expected)
    {
        $result = CodeNormalizationService::normalize($input);
        $this->assertSame($expected, $result);
    }

    public function codigoProvider(): array
    {
        return [
            // Floats de Excel → string sin decimales
            ['4200713.0', '4200713'],
            [4200713.0, '4200713'],

            // Códigos con sufijo '-Z'
            ['1123456-Z', '1123456'],

            // Códigos ya limpios
            ['4200155', '4200155'],

            // Códigos alfanuméricos con letras al final
            ['ABC-123-X', 'ABC'],
        ];
    }
}
