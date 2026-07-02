<?php

use App\Models\Usuario;

beforeEach(function () {
    $this->usuario = Usuario::factory()->create();
});

test('store requiere autenticación', function () {
    $response = $this->postJson('/api/v1/usuarios', [
        'Nombre_Usuario' => 'Test',
        'Email_Usuario' => 'test@unal.edu.co',
    ]);

    $response->assertStatus(401);
});

test('store crea usuario correctamente', function () {
    $response = $this->actingAs($this->usuario)
        ->postJson('/api/v1/usuarios', [
            'Nombre_Usuario' => 'Nuevo Usuario',
            'Email_Usuario' => 'nuevo@unal.edu.co',
            'ID_Rol' => 2,
        ]);

    $response->assertStatus(201);
});

test('show retorna usuario', function () {
    $usuario = Usuario::factory()->create();

    $response = $this->actingAs($this->usuario)
        ->getJson("/api/v1/usuarios/{$usuario->ID_Usuario}");

    $response->assertStatus(200)
        ->assertJsonPath('data.ID_Usuario', $usuario->ID_Usuario);
});

test('show 404 para usuario inexistente', function () {
    $response = $this->actingAs($this->usuario)
        ->getJson('/api/v1/usuarios/99999');

    $response->assertStatus(404);
});

test('update modifica usuario', function () {
    $usuario = Usuario::factory()->create();

    $response = $this->actingAs($this->usuario)
        ->putJson("/api/v1/usuarios/{$usuario->ID_Usuario}", [
            'Nombre_Usuario' => 'Nombre Actualizado',
        ]);

    $response->assertStatus(200);
    expect($usuario->fresh()->Nombre_Usuario)->toBe('Nombre Actualizado');
});

test('toggle activa/desactiva usuario', function () {
    $usuario = Usuario::factory()->create(['Activo_Usuario' => true]);

    $response = $this->actingAs($this->usuario)
        ->patchJson("/api/v1/usuarios/{$usuario->ID_Usuario}/toggle");

    $response->assertStatus(200);
    expect($usuario->fresh()->Activo_Usuario)->toBeFalse();
});

test('store falla con email duplicado', function () {
    Usuario::factory()->create(['Email_Usuario' => 'duplicado@unal.edu.co']);

    $response = $this->actingAs($this->usuario)
        ->postJson('/api/v1/usuarios', [
            'Nombre_Usuario' => 'Duplicado',
            'Email_Usuario' => 'duplicado@unal.edu.co',
        ]);

    $response->assertStatus(422);
});
