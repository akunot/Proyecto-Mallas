<?php

use App\Models\Facultad;
use App\Models\MallaCurricular;
use App\Models\Programa;

test('vista pública retorna malla por ID', function () {
    $malla = MallaCurricular::factory()->activa()->create();

    $response = $this->getJson("/api/v1/public/mallas/{$malla->ID_Malla}");

    $response->assertStatus(200);
});

test('vista pública retorna 404 para malla inexistente', function () {
    $response = $this->getJson('/api/v1/public/mallas/99999');

    $response->assertStatus(404);
});

test('endpoint vigente retorna SOLO la malla vigente de un programa', function () {
    $programa = Programa::factory()->create();
    $mallaAnterior = MallaCurricular::factory()->create([
        'ID_Programa' => $programa->ID_Programa,
        'Es_Vigente' => 0,
        'Estado' => 'archivada',
    ]);
    $mallaVigente = MallaCurricular::factory()->create([
        'ID_Programa' => $programa->ID_Programa,
        'Es_Vigente' => 1,
        'Estado' => 'activa',
    ]);

    $response = $this->getJson("/api/v1/public/programas/{$programa->ID_Programa}/vigente");

    $response->assertStatus(200);
    $response->assertJsonPath('data.ID_Malla', $mallaVigente->ID_Malla);
});

test('endpoint vigente retorna 404 si no hay malla vigente', function () {
    $programa = Programa::factory()->create();
    MallaCurricular::factory()->create([
        'ID_Programa' => $programa->ID_Programa,
        'Es_Vigente' => 0,
    ]);

    $response = $this->getJson("/api/v1/public/programas/{$programa->ID_Programa}/vigente");

    $response->assertStatus(404);
});

test('historial público retorna versiones activas y archivadas', function () {
    $programa = Programa::factory()->create();
    $mallaArchivada = MallaCurricular::factory()->create([
        'ID_Programa' => $programa->ID_Programa,
        'Es_Vigente' => 0,
        'Estado' => 'archivada',
    ]);
    $mallaVigente = MallaCurricular::factory()->activa()->create(['ID_Programa' => $programa->ID_Programa]);

    $response = $this->getJson("/api/v1/public/programas/{$programa->ID_Programa}/historial");

    $response->assertStatus(200);
    $response->assertJsonCount(2, 'data');
});

test('historial público retorna 404 para programa inexistente', function () {
    $response = $this->getJson('/api/v1/public/programas/99999/historial');

    $response->assertStatus(404);
});

test('diff público compara dos versiones de malla', function () {
    $programa = Programa::factory()->create();
    $malla1 = MallaCurricular::factory()->create(['ID_Programa' => $programa->ID_Programa, 'Es_Vigente' => 0]);
    $malla2 = MallaCurricular::factory()->activa()->create(['ID_Programa' => $programa->ID_Programa]);

    $response = $this->getJson("/api/v1/public/mallas/{$malla1->ID_Malla}/diff/{$malla2->ID_Malla}");

    $response->assertStatus(200);
});

test('historial público numera de forma densa sin huecos', function () {
    $programa = Programa::factory()->create();

    // Simula el escenario real: números internos quemados por cargas que
    // nunca se publicaron (borrador v2, rechazada v3).
    $v1 = MallaCurricular::factory()->version(1)->create([
        'ID_Programa' => $programa->ID_Programa,
        'Estado' => 'archivada',
        'Es_Vigente' => null,
    ]);
    MallaCurricular::factory()->version(2)->create([
        'ID_Programa' => $programa->ID_Programa,
        'Estado' => 'borrador',
        'Es_Vigente' => null,
    ]);
    MallaCurricular::factory()->version(3)->create([
        'ID_Programa' => $programa->ID_Programa,
        'Estado' => 'rechazada',
        'Es_Vigente' => null,
    ]);
    $v4 = MallaCurricular::factory()->version(4)->create([
        'ID_Programa' => $programa->ID_Programa,
        'Estado' => 'archivada',
        'Es_Vigente' => null,
    ]);
    $v5 = MallaCurricular::factory()->version(5)->activa()->create([
        'ID_Programa' => $programa->ID_Programa,
    ]);

    $response = $this->getJson(
        "/api/v1/public/programas/{$programa->ID_Programa}/historial",
    );

    $response->assertStatus(200)->assertJsonCount(3, 'data');

    // Ordenado por Version_Numero desc: v5, v4, v1. El ordinal público es
    // denso (3, 2, 1) aunque los números internos sean 5, 4 y 1.
    $data = $response->json('data');

    expect($data[0]['ID_Malla'])->toBe($v5->ID_Malla)
        ->and($data[0]['Version_Numero'])->toBe(5)
        ->and($data[0]['Version_Publicada'])->toBe(3)
        ->and($data[1]['ID_Malla'])->toBe($v4->ID_Malla)
        ->and($data[1]['Version_Publicada'])->toBe(2)
        ->and($data[2]['ID_Malla'])->toBe($v1->ID_Malla)
        ->and($data[2]['Version_Publicada'])->toBe(1);
});

test('diff público expone el ordinal público de cada versión', function () {
    $programa = Programa::factory()->create();
    $malla1 = MallaCurricular::factory()->version(1)->create([
        'ID_Programa' => $programa->ID_Programa,
        'Estado' => 'archivada',
        'Es_Vigente' => null,
    ]);
    $malla2 = MallaCurricular::factory()->version(2)->activa()->create([
        'ID_Programa' => $programa->ID_Programa,
    ]);

    $response = $this->getJson(
        "/api/v1/public/mallas/{$malla1->ID_Malla}/diff/{$malla2->ID_Malla}",
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.malla1.Version_Publicada', 1)
        ->assertJsonPath('data.malla2.Version_Publicada', 2);
});

test('visualizador público retorna malla de programa', function () {
    $facultad = Facultad::factory()->create();
    $programa = Programa::factory()->create(['Codigo_Facultad' => $facultad->Codigo_Facultad]);
    MallaCurricular::factory()->activa()->create(['ID_Programa' => $programa->ID_Programa]);

    $response = $this->getJson("/api/v1/public/programas/{$programa->ID_Programa}/malla-visualizador");

    $response->assertStatus(200);
});
