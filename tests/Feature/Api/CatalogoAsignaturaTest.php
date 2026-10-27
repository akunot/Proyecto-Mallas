<?php

use App\Models\Asignatura;
use App\Models\Usuario;

beforeEach(function () {
    $this->usuario = Usuario::factory()->create();
});

test('store requiere autenticación', function () {
    $response = $this->postJson('/api/v1/asignaturas', [
        'Codigo_Asignatura' => 'ABC123',
        'Nombre_Asignatura' => 'Test',
    ]);

    $response->assertStatus(401);
});

test('store crea asignatura correctamente', function () {
    $response = $this->actingAs($this->usuario)
        ->postJson('/api/v1/asignaturas', [
            'Codigo_Asignatura' => 201101,
            'Nombre_Asignatura' => 'Introducción a la Ingeniería',
            'Creditos_Asignatura' => 3,
        ]);

    $response->assertStatus(201);
});

test('show retorna asignatura', function () {
    $asignatura = Asignatura::factory()->create();

    $response = $this->actingAs($this->usuario)
        ->getJson("/api/v1/asignaturas/{$asignatura->ID_Asignatura}");

    $response->assertStatus(200)
        ->assertJsonPath('data.ID_Asignatura', $asignatura->ID_Asignatura);
});

test('show 404 para asignatura inexistente', function () {
    $response = $this->actingAs($this->usuario)
        ->getJson('/api/v1/asignaturas/99999');

    $response->assertStatus(404);
});

test('update modifica asignatura', function () {
    $asignatura = Asignatura::factory()->create();

    $response = $this->actingAs($this->usuario)
        ->putJson("/api/v1/asignaturas/{$asignatura->ID_Asignatura}", [
            'Nombre_Asignatura' => 'Nombre Actualizado',
        ]);

    $response->assertStatus(200);
    expect($asignatura->fresh()->Nombre_Asignatura)->toBe('Nombre Actualizado');
});

test('update desde el formulario vuelve a la misma página del listado', function () {
    $asignatura = Asignatura::factory()->create();

    $response = $this->actingAs($this->usuario)
        ->put("/asignaturas/{$asignatura->ID_Asignatura}?page=28&search=calculo&sort_by=Nombre_Asignatura&sort_order=desc", [
            'Nombre_Asignatura' => 'Cálculo Corregido',
        ]);

    $response->assertRedirect('/asignaturas?page=28&search=calculo&sort_by=Nombre_Asignatura&sort_order=desc');
    expect($asignatura->fresh()->Nombre_Asignatura)->toBe('Cálculo Corregido');
});

test('update desde el formulario sin query vuelve al listado', function () {
    $asignatura = Asignatura::factory()->create();

    $this->actingAs($this->usuario)
        ->put("/asignaturas/{$asignatura->ID_Asignatura}", ['Nombre_Asignatura' => 'Otro'])
        ->assertRedirect('/asignaturas');
});

test('toggle no soportado para asignatura retorna 422', function () {
    $asignatura = Asignatura::factory()->create();

    $response = $this->actingAs($this->usuario)
        ->patchJson("/api/v1/asignaturas/{$asignatura->ID_Asignatura}/toggle");

    $response->assertStatus(422);
});

test('catálogo público de electivas retorna asignaturas', function () {
    Asignatura::factory()->electiva()->create();
    Asignatura::factory()->count(2)->create();

    $response = $this->getJson('/api/v1/public/electivas');

    $response->assertStatus(200);
});
