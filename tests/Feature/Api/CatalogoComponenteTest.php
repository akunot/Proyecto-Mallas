<?php

use App\Models\Componente;
use App\Models\Usuario;

beforeEach(function () {
    $this->usuario = Usuario::factory()->create();
});

test('store requiere autenticación', function () {
    $response = $this->postJson('/api/v1/componentes', [
        'Nombre_Componente' => 'Test',
    ]);

    $response->assertStatus(401);
});

test('store crea componente correctamente', function () {
    $response = $this->actingAs($this->usuario)
        ->postJson('/api/v1/componentes', [
            'Nombre_Componente' => 'Componente de Prueba',
        ]);

    $response->assertStatus(201);
});

test('show retorna componente', function () {
    $componente = Componente::factory()->create();

    $response = $this->actingAs($this->usuario)
        ->getJson("/api/v1/componentes/{$componente->ID_Componente}");

    $response->assertStatus(200)
        ->assertJsonPath('data.ID_Componente', $componente->ID_Componente);
});

test('show 404 para componente inexistente', function () {
    $response = $this->actingAs($this->usuario)
        ->getJson('/api/v1/componentes/99999');

    $response->assertStatus(404);
});

test('update modifica componente', function () {
    $componente = Componente::factory()->create();

    $response = $this->actingAs($this->usuario)
        ->putJson("/api/v1/componentes/{$componente->ID_Componente}", [
            'Nombre_Componente' => 'Nombre Actualizado',
        ]);

    $response->assertStatus(200);
    expect($componente->fresh()->Nombre_Componente)->toBe('Nombre Actualizado');
});

test('toggle no soportado para componente retorna 422', function () {
    $componente = Componente::factory()->create();

    $response = $this->actingAs($this->usuario)
        ->patchJson("/api/v1/componentes/{$componente->ID_Componente}/toggle");

    $response->assertStatus(422);
});

test('store falla con nombre duplicado', function () {
    Componente::factory()->create(['Nombre_Componente' => 'Único']);

    $response = $this->actingAs($this->usuario)
        ->postJson('/api/v1/componentes', [
            'Nombre_Componente' => 'Único',
        ]);

    $response->assertStatus(422);
});
