<?php

use App\Models\Asignatura;
use App\Models\Usuario;
use App\Services\CodeNormalizationService;

/**
 * Contrato HTTP de `Codigo_Asignatura` (App\Rules\CodigoAsignatura y
 * App\Rules\CodigoBaseUnico): el CRUD debe aceptar exactamente los mismos
 * códigos que produce el importador de mallas (numéricos, de sección "-Z" y
 * legados alfanuméricos) y rechazar los que rompen la clave de búsqueda
 * `Codigo_Base`.
 */
function codigoLibreParaValidacion(string $prefijo = ''): string
{
    do {
        $codigo = $prefijo.(string) fake()->numberBetween(100000, 999999);
        $base = CodeNormalizationService::normalize($codigo);
    } while (
        Asignatura::where('Codigo_Asignatura', $codigo)->exists()
        || Asignatura::where('Codigo_Base', $base)->exists()
    );

    return $codigo;
}

function asignaturaParaValidacion(string $codigo): Asignatura
{
    return Asignatura::create([
        'Codigo_Asignatura' => $codigo,
        'Nombre_Asignatura' => 'Asignatura de validacion',
        'Creditos_Asignatura' => 3,
    ]);
}

beforeEach(function () {
    $this->usuario = Usuario::factory()->create();
});

test('store acepta código numérico', function () {
    $codigo = codigoLibreParaValidacion();

    $response = $this->actingAs($this->usuario)->postJson('/api/v1/asignaturas', [
        'Codigo_Asignatura' => $codigo,
        'Nombre_Asignatura' => 'Cálculo Diferencial',
        'Creditos_Asignatura' => 4,
    ]);

    $response->assertStatus(201);
    expect($response->json('data.Codigo_Asignatura'))->toBe($codigo)
        ->and($response->json('data.Codigo_Base'))->toBe($codigo);
});

test('store acepta código numérico enviado como número JSON', function () {
    $codigo = (int) codigoLibreParaValidacion();

    $response = $this->actingAs($this->usuario)->postJson('/api/v1/asignaturas', [
        'Codigo_Asignatura' => $codigo,
        'Nombre_Asignatura' => 'Introducción a la Ingeniería',
        'Creditos_Asignatura' => 3,
    ]);

    $response->assertStatus(201);

    $guardada = Asignatura::where('Codigo_Base', (string) $codigo)->first();
    expect($guardada)->not->toBeNull()
        ->and($guardada->Codigo_Asignatura)->toBe((string) $codigo);
});

test('store acepta código de sección con guion', function () {
    $codigo = codigoLibreParaValidacion().'-Z';

    $response = $this->actingAs($this->usuario)->postJson('/api/v1/asignaturas', [
        'Codigo_Asignatura' => $codigo,
        'Nombre_Asignatura' => 'Inglés I',
        'Creditos_Asignatura' => 2,
    ]);

    $response->assertStatus(201);
    expect($response->json('data.Codigo_Asignatura'))->toBe($codigo)
        ->and($response->json('data.Codigo_Base'))->toBe(explode('-', $codigo)[0]);
});

test('store acepta código alfanumérico legado', function () {
    $codigo = codigoLibreParaValidacion('MAT');

    $response = $this->actingAs($this->usuario)->postJson('/api/v1/asignaturas', [
        'Codigo_Asignatura' => $codigo,
        'Nombre_Asignatura' => 'Asignatura alfanumérica',
        'Creditos_Asignatura' => 2,
    ]);

    $response->assertStatus(201);
    expect($response->json('data.Codigo_Base'))->toBe($codigo);
});

test('store rechaza códigos con formato inválido', function (string $codigo) {
    $response = $this->actingAs($this->usuario)->postJson('/api/v1/asignaturas', [
        'Codigo_Asignatura' => $codigo,
        'Nombre_Asignatura' => 'Asignatura inválida',
        'Creditos_Asignatura' => 3,
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['Codigo_Asignatura']);
})->with([
    'espacio interno' => ['111 111'],
    'punto decimal' => ['111.111'],
    'dos guiones' => ['1000057-Z-ABC'],
    'guion final' => ['1000057-'],
    'guion inicial' => ['-1000057'],
    'guion bajo' => ['ABC_123'],
    'letra acentuada' => ['MATEMÁTICA1'],
    'más de 20 caracteres' => ['123456789012345678901'],
    'vacío' => [''],
]);

test('store exige Codigo_Asignatura', function () {
    $response = $this->actingAs($this->usuario)->postJson('/api/v1/asignaturas', [
        'Nombre_Asignatura' => 'Sin código',
        'Creditos_Asignatura' => 3,
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['Codigo_Asignatura']);
});

test('store rechaza un código ya existente', function () {
    $codigo = codigoLibreParaValidacion();
    asignaturaParaValidacion($codigo);

    $response = $this->actingAs($this->usuario)->postJson('/api/v1/asignaturas', [
        'Codigo_Asignatura' => $codigo,
        'Nombre_Asignatura' => 'Duplicada',
        'Creditos_Asignatura' => 3,
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['Codigo_Asignatura']);

    expect($response->json('errors.Codigo_Asignatura.0'))->toContain($codigo);
});

test('store rechaza un código que colisiona en Codigo_Base', function () {
    $base = codigoLibreParaValidacion();
    asignaturaParaValidacion($base);

    $response = $this->actingAs($this->usuario)->postJson('/api/v1/asignaturas', [
        'Codigo_Asignatura' => $base.'-Z',
        'Nombre_Asignatura' => 'Sección que colisiona',
        'Creditos_Asignatura' => 3,
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['Codigo_Asignatura']);

    expect($response->json('errors.Codigo_Asignatura.0'))
        ->toContain('comparte la base');
});

test('store ignora un Codigo_Base enviado por el cliente', function () {
    $codigo = codigoLibreParaValidacion();

    $response = $this->actingAs($this->usuario)->postJson('/api/v1/asignaturas', [
        'Codigo_Asignatura' => $codigo,
        'Codigo_Base' => 'BASE_INYECTADA',
        'Nombre_Asignatura' => 'Intento de inyección',
        'Creditos_Asignatura' => 3,
    ]);

    $response->assertStatus(201);

    $guardada = Asignatura::find($response->json('data.ID_Asignatura'));
    expect($guardada->Codigo_Base)->toBe($codigo);
});

test('update permite conservar el código de sección sin chocar consigo mismo', function () {
    $codigo = codigoLibreParaValidacion().'-Z';
    $asignatura = asignaturaParaValidacion($codigo);

    $response = $this->actingAs($this->usuario)
        ->putJson("/api/v1/asignaturas/{$asignatura->ID_Asignatura}", [
            'Codigo_Asignatura' => $codigo,
            'Nombre_Asignatura' => 'Nombre actualizado',
        ]);

    $response->assertStatus(200);
    expect($asignatura->fresh()->Nombre_Asignatura)->toBe('Nombre actualizado')
        ->and($asignatura->fresh()->Codigo_Base)->toBe(explode('-', $codigo)[0]);
});

test('update permite cambiar el código por otro válido', function () {
    $asignatura = asignaturaParaValidacion(codigoLibreParaValidacion());
    $nuevoCodigo = codigoLibreParaValidacion().'-A';

    $response = $this->actingAs($this->usuario)
        ->putJson("/api/v1/asignaturas/{$asignatura->ID_Asignatura}", [
            'Codigo_Asignatura' => $nuevoCodigo,
        ]);

    $response->assertStatus(200);
    expect($asignatura->fresh()->Codigo_Asignatura)->toBe($nuevoCodigo)
        ->and($asignatura->fresh()->Codigo_Base)->toBe(explode('-', $nuevoCodigo)[0]);
});

test('update rechaza un código que colisiona en Codigo_Base con otra asignatura', function () {
    $base = codigoLibreParaValidacion();
    asignaturaParaValidacion($base);

    $asignatura = asignaturaParaValidacion(codigoLibreParaValidacion());

    $response = $this->actingAs($this->usuario)
        ->putJson("/api/v1/asignaturas/{$asignatura->ID_Asignatura}", [
            'Codigo_Asignatura' => $base.'-Z',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['Codigo_Asignatura']);

    expect($asignatura->fresh()->Codigo_Asignatura)->not->toBe($base.'-Z');
});

test('update rechaza un código con formato inválido', function () {
    $asignatura = asignaturaParaValidacion(codigoLibreParaValidacion());

    $response = $this->actingAs($this->usuario)
        ->putJson("/api/v1/asignaturas/{$asignatura->ID_Asignatura}", [
            'Codigo_Asignatura' => '111111 Z',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['Codigo_Asignatura']);
});

test('update sin código conserva el valor actual', function () {
    $codigo = codigoLibreParaValidacion();
    $asignatura = asignaturaParaValidacion($codigo);

    $response = $this->actingAs($this->usuario)
        ->putJson("/api/v1/asignaturas/{$asignatura->ID_Asignatura}", [
            'Nombre_Asignatura' => 'Solo cambia el nombre',
        ]);

    $response->assertStatus(200);
    expect($asignatura->fresh()->Codigo_Asignatura)->toBe($codigo)
        ->and($asignatura->fresh()->Codigo_Base)->toBe($codigo);
});
