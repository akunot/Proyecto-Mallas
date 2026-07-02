<?php

use App\Services\CodeNormalizationService;

test('normaliza código float con decimal .0', function () {
    expect(CodeNormalizationService::normalize('4200713.0'))->toBe('4200713');
});

test('normaliza código float numérico con decimal .0', function () {
    expect(CodeNormalizationService::normalize(4200713.0))->toBe('4200713');
});

test('normaliza código con guión sección', function () {
    expect(CodeNormalizationService::normalize('1123456-Z'))->toBe('1123456');
});

test('normaliza código con guión letra', function () {
    expect(CodeNormalizationService::normalize('1123456-A'))->toBe('1123456');
});

test('normaliza código con prefijo no-numérico y guión', function () {
    expect(CodeNormalizationService::normalize('ABC-123-X'))->toBe('ABC');
});

test('normaliza código numérico puro', function () {
    expect(CodeNormalizationService::normalize('4200155'))->toBe('4200155');
});

test('normaliza código con espacios', function () {
    expect(CodeNormalizationService::normalize('  MAT101  '))->toBe('MAT101');
});

test('normaliza código alfanumérico', function () {
    expect(CodeNormalizationService::normalize('MAT101'))->toBe('MAT101');
});

test('lanza excepción para código vacío', function () {
    CodeNormalizationService::normalize('');
})->throws(\InvalidArgumentException::class, 'El código de asignatura no puede estar vacío.');

test('lanza excepción para código con solo espacios', function () {
    CodeNormalizationService::normalize('   ');
})->throws(\InvalidArgumentException::class);

test('extrae parte numérica', function () {
    expect(CodeNormalizationService::numericPart('1123456-Z'))->toBe('1123456');
});

test('extrae parte numérica de código alfanumérico', function () {
    expect(CodeNormalizationService::numericPart('MAT101'))->toBe('101');
});

test('detecta sufijo de sección con guión', function () {
    expect(CodeNormalizationService::tieneSufijoSeccion('1123456-Z'))->toBeTrue();
});

test('detecta sufijo de sección con float', function () {
    expect(CodeNormalizationService::tieneSufijoSeccion('4200713.0'))->toBeTrue();
});

test('no detecta sufijo para código simple', function () {
    expect(CodeNormalizationService::tieneSufijoSeccion('4200155'))->toBeFalse();
});
