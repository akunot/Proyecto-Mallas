<?php

use App\Models\Facultad;
use App\Models\Sede;
use App\Models\Usuario;

beforeEach(function () {
    $this->usuario = Usuario::factory()->create();
});

test('index público retorna facultades', function () {
    Facultad::factory()->count(3)->create();

    $response = $this->getJson('/api/v1/public/facultades');

    $response->assertStatus(200);
});

test('store requiere autenticación', function () {
    $response = $this->postJson('/api/v1/facultades', [
        'Codigo_Facultad' => 1,
        'Nombre_Facultad' => 'Test',
    ]);

    $response->assertStatus(401);
});

test('store crea facultad correctamente', function () {
    $sede = Sede::factory()->create();

    $response = $this->actingAs($this->usuario)
        ->postJson('/api/v1/facultades', [
            'Codigo_Facultad' => 99,
            'Nombre_Facultad' => 'Facultad de Ciencias',
            'Codigo_Sede' => $sede->Codigo_Sede,
        ]);

    $response->assertStatus(201);
});

test('show retorna facultad', function () {
    $facultad = Facultad::factory()->create();

    $response = $this->actingAs($this->usuario)
        ->getJson("/api/v1/facultades/{$facultad->ID_Facultad}");

    $response->assertStatus(200)
        ->assertJsonPath('data.ID_Facultad', $facultad->ID_Facultad);
});

test('show 404 para facultad inexistente', function () {
    $response = $this->actingAs($this->usuario)
        ->getJson('/api/v1/facultades/99999');

    $response->assertStatus(404);
});

test('update modifica facultad', function () {
    $facultad = Facultad::factory()->create();

    $response = $this->actingAs($this->usuario)
        ->putJson("/api/v1/facultades/{$facultad->ID_Facultad}", [
            'Nombre_Facultad' => 'Nombre Actualizado',
        ]);

    $response->assertStatus(200);
    expect($facultad->fresh()->Nombre_Facultad)->toBe('Nombre Actualizado');
});

test('toggle activa/desactiva facultad', function () {
    $facultad = Facultad::factory()->create(['Esta_Activo' => 1]);

    $response = $this->actingAs($this->usuario)
        ->patchJson("/api/v1/facultades/{$facultad->ID_Facultad}/toggle");

    $response->assertStatus(200);
    expect($facultad->fresh()->Esta_Activo)->toBe(0);
});

test('store falla con código duplicado', function () {
    $sede = Sede::factory()->create();

    $facultad = Facultad::factory()->create(['Codigo_Facultad' => 555, 'Codigo_Sede' => $sede->Codigo_Sede]);

    $response = $this->actingAs($this->usuario)
        ->postJson('/api/v1/facultades', [
            'Codigo_Facultad' => 555,
            'Nombre_Facultad' => 'Duplicada',
            'Codigo_Sede' => $sede->Codigo_Sede,
        ]);

    $response->assertStatus(422);
});
