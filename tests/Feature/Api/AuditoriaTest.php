<?php

use App\Models\LogActividad;
use App\Models\Usuario;

beforeEach(function () {
    $this->usuario = Usuario::factory()->create();
});

test('lista logs de auditoría', function () {
    LogActividad::factory()->count(3)->create([
        'ID_Usuario' => $this->usuario->ID_Usuario,
    ]);

    $response = $this->actingAs($this->usuario)
        ->getJson('/api/v1/auditoria/logs');

    $response->assertStatus(200);
});

test('acciones disponibles retorna lista', function () {
    $response = $this->actingAs($this->usuario)
        ->getJson('/api/v1/auditoria/acciones-disponibles');

    $response->assertStatus(200);
});

test('entidades disponibles retorna lista', function () {
    $response = $this->actingAs($this->usuario)
        ->getJson('/api/v1/auditoria/entidades-disponibles');

    $response->assertStatus(200);
});

test('estadísticas retorna datos', function () {
    LogActividad::factory()->count(5)->create([
        'ID_Usuario' => $this->usuario->ID_Usuario,
    ]);

    $response = $this->actingAs($this->usuario)
        ->getJson('/api/v1/auditoria/estadisticas');

    $response->assertStatus(200);
});

test('logs requiere autenticación', function () {
    $response = $this->getJson('/api/v1/auditoria/logs');

    $response->assertStatus(401);
});
