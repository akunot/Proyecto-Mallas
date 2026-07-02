<?php

use App\Models\Normativa;
use App\Models\Programa;
use App\Models\Usuario;

beforeEach(function () {
    $this->usuario = Usuario::factory()->create();
});

test('store requiere autenticación', function () {
    $response = $this->postJson('/api/v1/normativas', [
        'Descripcion_Normativa' => 'Test',
    ]);

    $response->assertStatus(401);
});

test('store crea normativa correctamente', function () {
    $programa = Programa::factory()->create();

    $response = $this->actingAs($this->usuario)
        ->postJson('/api/v1/normativas', [
            'Descripcion_Normativa' => 'Acuerdo 001 de 2024',
            'Tipo_Normativa' => 'Acuerdo',
            'Numero_Normativa' => '1',
            'Anio_Normativa' => '2024',
            'Instancia' => 'Consejo Superior',
            'Codigo_Programa' => $programa->Codigo_Programa,
        ]);

    $response->assertStatus(201);
});

test('show retorna normativa', function () {
    $normativa = Normativa::factory()->create();

    $response = $this->actingAs($this->usuario)
        ->getJson("/api/v1/normativas/{$normativa->ID_Normativa}");

    $response->assertStatus(200)
        ->assertJsonPath('data.ID_Normativa', $normativa->ID_Normativa);
});

test('show 404 para normativa inexistente', function () {
    $response = $this->actingAs($this->usuario)
        ->getJson('/api/v1/normativas/99999');

    $response->assertStatus(404);
});

test('update modifica normativa', function () {
    $normativa = Normativa::factory()->create();

    $response = $this->actingAs($this->usuario)
        ->putJson("/api/v1/normativas/{$normativa->ID_Normativa}", [
            'Descripcion_Normativa' => 'Descripción actualizada',
        ]);

    $response->assertStatus(200);
    expect($normativa->fresh()->Descripcion_Normativa)->toBe('Descripción actualizada');
});

test('toggle activa/desactiva normativa', function () {
    $normativa = Normativa::factory()->create(['Esta_Activo' => true]);

    $response = $this->actingAs($this->usuario)
        ->patchJson("/api/v1/normativas/{$normativa->ID_Normativa}/toggle");

    $response->assertStatus(200);
    expect($normativa->fresh()->Esta_Activo)->toBe(0);
});

test('index retorna normativas', function () {
    Normativa::factory()->count(3)->create();

    $response = $this->actingAs($this->usuario)->getJson('/api/v1/normativas');

    $response->assertStatus(200);
});
