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

test('historial público retorna versiones de programa', function () {
    $programa = Programa::factory()->create();
    MallaCurricular::factory()->create(['ID_Programa' => $programa->ID_Programa, 'Es_Vigente' => 0]);
    MallaCurricular::factory()->activa()->create(['ID_Programa' => $programa->ID_Programa]);

    $response = $this->getJson("/api/v1/public/programas/{$programa->ID_Programa}/historial");

    $response->assertStatus(200);
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

test('visualizador público retorna malla de programa', function () {
    $facultad = Facultad::factory()->create();
    $programa = Programa::factory()->create(['Codigo_Facultad' => $facultad->Codigo_Facultad]);
    MallaCurricular::factory()->activa()->create(['ID_Programa' => $programa->ID_Programa]);

    $response = $this->getJson("/api/v1/public/programas/{$programa->ID_Programa}/malla-visualizador");

    $response->assertStatus(200);
});
