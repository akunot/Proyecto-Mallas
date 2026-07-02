<?php

use App\Models\Sede;
use App\Models\Usuario;

beforeEach(function () {
    $this->usuario = Usuario::factory()->create();
});

test('index público retorna sedes', function () {
    Sede::factory()->count(3)->create();

    $response = $this->getJson('/api/v1/public/sedes');

    $response->assertStatus(200);
});

test('store requiere autenticación', function () {
    $response = $this->postJson('/api/v1/sedes', [
        'Codigo_Sede' => 12345,
        'Nombre_Sede' => 'Test Sede',
        'Ciudad_Sede' => 'Test City',
    ]);

    $response->assertStatus(401);
});

test('store crea sede correctamente', function () {
    $response = $this->actingAs($this->usuario)
        ->postJson('/api/v1/sedes', [
            'Codigo_Sede' => 99999,
            'Nombre_Sede' => 'Nueva Sede',
            'Ciudad_Sede' => 'Manizales',
        ]);

    $response->assertStatus(201);
});

test('show retorna sede', function () {
    $sede = Sede::factory()->create();

    $response = $this->actingAs($this->usuario)
        ->getJson("/api/v1/sedes/{$sede->ID_Sede}");

    $response->assertStatus(200)
        ->assertJsonPath('data.ID_Sede', $sede->ID_Sede);
});

test('show 404 para sede inexistente', function () {
    $response = $this->actingAs($this->usuario)
        ->getJson('/api/v1/sedes/99999');

    $response->assertStatus(404);
});

test('update modifica sede', function () {
    $sede = Sede::factory()->create();

    $response = $this->actingAs($this->usuario)
        ->putJson("/api/v1/sedes/{$sede->ID_Sede}", [
            'Nombre_Sede' => 'Nombre Actualizado',
        ]);

    $response->assertStatus(200);
    expect($sede->fresh()->Nombre_Sede)->toBe('Nombre Actualizado');
});

test('toggle no soportado para sede retorna 422', function () {
    $sede = Sede::factory()->create();

    $response = $this->actingAs($this->usuario)
        ->patchJson("/api/v1/sedes/{$sede->ID_Sede}/toggle");

    $response->assertStatus(422);
});

test('store falla con código duplicado', function () {
    Sede::factory()->create(['Codigo_Sede' => 11111]);

    $response = $this->actingAs($this->usuario)
        ->postJson('/api/v1/sedes', [
            'Codigo_Sede' => 11111,
            'Nombre_Sede' => 'Duplicada',
            'Ciudad_Sede' => 'City',
        ]);

    $response->assertStatus(422);
});
