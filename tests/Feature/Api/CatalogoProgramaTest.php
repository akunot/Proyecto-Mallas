<?php

use App\Models\Facultad;
use App\Models\Programa;
use App\Models\Usuario;

beforeEach(function () {
    $this->usuario = Usuario::factory()->create();
});

test('store requiere autenticación', function () {
    $response = $this->postJson('/api/v1/programas', [
        'Codigo_Programa' => 1,
        'Nombre_Programa' => 'Test',
    ]);

    $response->assertStatus(401);
});

test('store crea programa correctamente', function () {
    $facultad = Facultad::factory()->create();

    $response = $this->actingAs($this->usuario)
        ->postJson('/api/v1/programas', [
            'Codigo_Programa' => 999,
            'Nombre_Programa' => 'Ingeniería de Sistemas',
            'Codigo_Facultad' => $facultad->Codigo_Facultad,
            'Codigo_SNIES' => 12345,
            'Nivel_Formacion' => 'Pregrado',
            'Titulo_Otorgado' => 'Ingeniero',
        ]);

    $response->assertStatus(201);
});

test('show retorna programa', function () {
    $programa = Programa::factory()->create();

    $response = $this->actingAs($this->usuario)
        ->getJson("/api/v1/programas/{$programa->ID_Programa}");

    $response->assertStatus(200)
        ->assertJsonPath('data.ID_Programa', $programa->ID_Programa);
});

test('show 404 para programa inexistente', function () {
    $response = $this->actingAs($this->usuario)
        ->getJson('/api/v1/programas/99999');

    $response->assertStatus(404);
});

test('update modifica programa', function () {
    $programa = Programa::factory()->create();

    $response = $this->actingAs($this->usuario)
        ->putJson("/api/v1/programas/{$programa->ID_Programa}", [
            'Nombre_Programa' => 'Nombre Actualizado',
        ]);

    $response->assertStatus(200);
    expect($programa->fresh()->Nombre_Programa)->toBe('Nombre Actualizado');
});

test('toggle activa/desactiva programa', function () {
    $programa = Programa::factory()->create(['Esta_Activo' => true]);

    $response = $this->actingAs($this->usuario)
        ->patchJson("/api/v1/programas/{$programa->ID_Programa}/toggle");

    $response->assertStatus(200);
    expect($programa->fresh()->Esta_Activo)->toBe(0);
});

test('store falla con código duplicado', function () {
    $facultad = Facultad::factory()->create();
    Programa::factory()->create(['Codigo_Programa' => 777, 'Codigo_Facultad' => $facultad->Codigo_Facultad]);

    $response = $this->actingAs($this->usuario)
        ->postJson('/api/v1/programas', [
            'Codigo_Programa' => 777,
            'Nombre_Programa' => 'Duplicado',
            'Codigo_Facultad' => $facultad->Codigo_Facultad,
        ]);

    $response->assertStatus(422);
});

test('lista programas públicos por facultad', function () {
    $facultad = Facultad::factory()->create();
    Programa::factory()->count(2)->create(['Codigo_Facultad' => $facultad->Codigo_Facultad]);

    $response = $this->getJson("/api/v1/public/facultades/{$facultad->ID_Facultad}/programas");

    $response->assertStatus(200);
});
