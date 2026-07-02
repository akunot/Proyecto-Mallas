<?php

use App\Models\Componente;
use App\Models\PlantillaAgrupacion;
use App\Models\Programa;
use App\Models\Usuario;

beforeEach(function () {
    $this->usuario = Usuario::factory()->create();
});

test('store requiere autenticación', function () {
    $response = $this->postJson('/api/v1/agrupaciones', [
        'Nombre_Agrupacion' => 'Test',
    ]);

    $response->assertStatus(401);
});

test('store crea agrupación correctamente', function () {
    $programa = Programa::factory()->create();
    $componente = Componente::factory()->create();

    $response = $this->actingAs($this->usuario)
        ->postJson('/api/v1/agrupaciones', [
            'Nombre_Agrupacion' => 'Semestre I',
            'ID_Programa' => $programa->ID_Programa,
            'ID_Componente' => $componente->ID_Componente,
            'Tipo_Agrupacion' => 'Semestral',
        ]);

    $response->assertStatus(201);
});

test('show retorna agrupación', function () {
    $programa = Programa::factory()->create();
    $componente = Componente::factory()->create();

    $agrupacion = PlantillaAgrupacion::factory()->create([
        'ID_Programa' => $programa->ID_Programa,
        'ID_Componente' => $componente->ID_Componente,
    ]);

    $response = $this->actingAs($this->usuario)
        ->getJson("/api/v1/agrupaciones/{$agrupacion->ID_Plantilla_Agrupacion}");

    $response->assertStatus(200)
        ->assertJsonPath('data.ID_Plantilla_Agrupacion', $agrupacion->ID_Plantilla_Agrupacion);
});

test('show 404 para agrupación inexistente', function () {
    $response = $this->actingAs($this->usuario)
        ->getJson('/api/v1/agrupaciones/99999');

    $response->assertStatus(404);
});

test('update modifica agrupación', function () {
    $programa = Programa::factory()->create();
    $componente = Componente::factory()->create();

    $agrupacion = PlantillaAgrupacion::factory()->create([
        'ID_Programa' => $programa->ID_Programa,
        'ID_Componente' => $componente->ID_Componente,
    ]);

    $response = $this->actingAs($this->usuario)
        ->putJson("/api/v1/agrupaciones/{$agrupacion->ID_Plantilla_Agrupacion}", [
            'Nombre_Agrupacion' => 'Nombre Actualizado',
        ]);

    $response->assertStatus(200);
    expect($agrupacion->fresh()->Nombre_Agrupacion)->toBe('Nombre Actualizado');
});

test('destroy elimina agrupación', function () {
    $programa = Programa::factory()->create();
    $componente = Componente::factory()->create();

    $agrupacion = PlantillaAgrupacion::factory()->create([
        'ID_Programa' => $programa->ID_Programa,
        'ID_Componente' => $componente->ID_Componente,
    ]);

    $response = $this->actingAs($this->usuario)
        ->deleteJson("/api/v1/agrupaciones/{$agrupacion->ID_Plantilla_Agrupacion}");

    $response->assertStatus(200);
    expect(PlantillaAgrupacion::find($agrupacion->ID_Plantilla_Agrupacion))->toBeNull();
});

test('destroy 404 para agrupación inexistente', function () {
    $response = $this->actingAs($this->usuario)
        ->deleteJson('/api/v1/agrupaciones/99999');

    $response->assertStatus(404);
});
