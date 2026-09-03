<?php

use App\Models\LogActividad;
use App\Models\MallaCurricular;
use App\Models\Programa;
use App\Models\Usuario;
use Illuminate\Support\Facades\Cache;

beforeEach(function () {
    Cache::flush();
    $this->usuario = Usuario::factory()->create();
});

test('cambio de visibilidad requiere autenticación', function () {
    $malla = MallaCurricular::factory()->create([
        'Estado' => 'archivada',
        'Es_Vigente' => 0,
    ]);

    $response = $this->patchJson(
        "/api/v1/mallas/{$malla->ID_Malla}/visibilidad-historial",
        ['Visible_Historial' => false],
    );

    $response->assertStatus(401);
});

test('oculta una malla archivada del historial público', function () {
    $programa = Programa::factory()->create();
    $mallaArchivada = MallaCurricular::factory()->create([
        'ID_Programa' => $programa->ID_Programa,
        'Es_Vigente' => 0,
        'Estado' => 'archivada',
    ]);

    $response = $this->actingAs($this->usuario)->patchJson(
        "/api/v1/mallas/{$mallaArchivada->ID_Malla}/visibilidad-historial",
        ['Visible_Historial' => false],
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.Visible_Historial', false);

    expect($mallaArchivada->fresh()->Visible_Historial)->toBeFalse();

    // Ya no aparece en el historial público
    $historial = $this->getJson(
        "/api/v1/public/programas/{$programa->ID_Programa}/historial",
    );

    $historial->assertStatus(200)
        ->assertJsonCount(0, 'data');
});

test('historial público incluye mallas archivadas visibles por defecto', function () {
    $programa = Programa::factory()->create();
    MallaCurricular::factory()->create([
        'ID_Programa' => $programa->ID_Programa,
        'Es_Vigente' => 0,
        'Estado' => 'archivada',
    ]);
    MallaCurricular::factory()->activa()->create([
        'ID_Programa' => $programa->ID_Programa,
    ]);

    $response = $this->getJson(
        "/api/v1/public/programas/{$programa->ID_Programa}/historial",
    );

    $response->assertStatus(200)
        ->assertJsonCount(2, 'data');
});

test('re-muestra una malla archivada previamente ocultada', function () {
    $programa = Programa::factory()->create();
    $mallaArchivada = MallaCurricular::factory()->create([
        'ID_Programa' => $programa->ID_Programa,
        'Es_Vigente' => 0,
        'Estado' => 'archivada',
        'Visible_Historial' => false,
    ]);

    $response = $this->actingAs($this->usuario)->patchJson(
        "/api/v1/mallas/{$mallaArchivada->ID_Malla}/visibilidad-historial",
        ['Visible_Historial' => true],
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.Visible_Historial', true);

    expect($mallaArchivada->fresh()->Visible_Historial)->toBeTrue();

    $this->getJson(
        "/api/v1/public/programas/{$programa->ID_Programa}/historial",
    )->assertStatus(200)->assertJsonCount(1, 'data');
});

test('la malla activa no puede ocultarse del historial', function () {
    $programa = Programa::factory()->create();
    $mallaActiva = MallaCurricular::factory()->activa()->create([
        'ID_Programa' => $programa->ID_Programa,
    ]);

    $response = $this->actingAs($this->usuario)->patchJson(
        "/api/v1/mallas/{$mallaActiva->ID_Malla}/visibilidad-historial",
        ['Visible_Historial' => false],
    );

    $response->assertStatus(422);

    // La activa sigue visible en el historial público
    $this->getJson(
        "/api/v1/public/programas/{$programa->ID_Programa}/historial",
    )->assertStatus(200)->assertJsonCount(1, 'data');
});

test('versión archivada ocultada no accesible por URL directa', function () {
    $programa = Programa::factory()->create();
    $mallaArchivada = MallaCurricular::factory()->create([
        'ID_Programa' => $programa->ID_Programa,
        'Es_Vigente' => 0,
        'Estado' => 'archivada',
    ]);

    // Visible por defecto: accesible
    $this->getJson("/api/v1/public/mallas/{$mallaArchivada->ID_Malla}")
        ->assertStatus(200);

    $this->actingAs($this->usuario)->patchJson(
        "/api/v1/mallas/{$mallaArchivada->ID_Malla}/visibilidad-historial",
        ['Visible_Historial' => false],
    )->assertStatus(200);

    // Tras ocultarla: 404 incluso por acceso directo
    $this->getJson("/api/v1/public/mallas/{$mallaArchivada->ID_Malla}")
        ->assertStatus(404);

    // La malla activa del mismo programa sigue accesible
    $mallaActiva = MallaCurricular::factory()->activa()->create([
        'ID_Programa' => $programa->ID_Programa,
        'Version_Numero' => 2,
    ]);

    $this->getJson("/api/v1/public/mallas/{$mallaActiva->ID_Malla}")
        ->assertStatus(200);
});

test('validación requiere el campo Visible_Historial', function () {
    $malla = MallaCurricular::factory()->create([
        'Estado' => 'archivada',
        'Es_Vigente' => 0,
    ]);

    $this->actingAs($this->usuario)
        ->patchJson("/api/v1/mallas/{$malla->ID_Malla}/visibilidad-historial", [])
        ->assertStatus(422);
});

test('retorna 404 para malla inexistente', function () {
    $this->actingAs($this->usuario)
        ->patchJson('/api/v1/mallas/99999/visibilidad-historial', [
            'Visible_Historial' => false,
        ])
        ->assertStatus(404);
});

test('registra auditoría del cambio de visibilidad', function () {
    $malla = MallaCurricular::factory()->create([
        'Estado' => 'archivada',
        'Es_Vigente' => 0,
    ]);

    $this->actingAs($this->usuario)->patchJson(
        "/api/v1/mallas/{$malla->ID_Malla}/visibilidad-historial",
        ['Visible_Historial' => false],
    )->assertStatus(200);

    expect(
        LogActividad::where('Accion_Log', 'UPDATE_VISIBILIDAD_HISTORIAL')
            ->where('Entidad_Log', 'malla_curricular')
            ->where('Entidad_ID_Log', $malla->ID_Malla)
            ->exists()
    )->toBeTrue();
});
