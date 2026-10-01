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

test('DELETE /api/v1/agrupaciones/{id} ya no está disponible y la plantilla permanece', function () {
    $programa = Programa::factory()->create();
    $componente = Componente::factory()->create();

    $agrupacion = PlantillaAgrupacion::factory()->create([
        'ID_Programa' => $programa->ID_Programa,
        'ID_Componente' => $componente->ID_Componente,
    ]);

    $response = $this->actingAs($this->usuario)
        ->deleteJson("/api/v1/agrupaciones/{$agrupacion->ID_Plantilla_Agrupacion}");

    // La ruta DELETE fue retirada: el método no está soportado para la URI.
    $response->assertStatus(405);

    // La plantilla no fue eliminada.
    expect(PlantillaAgrupacion::find($agrupacion->ID_Plantilla_Agrupacion))->not->toBeNull();
});

test('DELETE /api/v1/agrupaciones/{id} también responde 405 para IDs inexistentes', function () {
    $response = $this->actingAs($this->usuario)
        ->deleteJson('/api/v1/agrupaciones/99999');

    $response->assertStatus(405);
});

test('DELETE web /agrupaciones/{id} ya no está disponible', function () {
    $programa = Programa::factory()->create();
    $componente = Componente::factory()->create();

    $agrupacion = PlantillaAgrupacion::factory()->create([
        'ID_Programa' => $programa->ID_Programa,
        'ID_Componente' => $componente->ID_Componente,
    ]);

    $response = $this->actingAs($this->usuario)
        ->delete("/agrupaciones/{$agrupacion->ID_Plantilla_Agrupacion}");

    $response->assertStatus(405);

    expect(PlantillaAgrupacion::find($agrupacion->ID_Plantilla_Agrupacion))->not->toBeNull();
});

test('update modifica la plantilla conservando exactamente su ID_Plantilla_Agrupacion', function () {
    $programa = Programa::factory()->create();
    $componente = Componente::factory()->create();

    $agrupacion = PlantillaAgrupacion::factory()->create([
        'ID_Programa' => $programa->ID_Programa,
        'ID_Componente' => $componente->ID_Componente,
    ]);
    $originalId = $agrupacion->ID_Plantilla_Agrupacion;

    $response = $this->actingAs($this->usuario)
        ->putJson("/api/v1/agrupaciones/{$originalId}", [
            'Nombre_Agrupacion' => 'Nombre Editado Por Test',
            'Tipo_Agrupacion' => 'OPTATIVA',
            'Creditos_Requeridos' => 12,
            'Creditos_Maximos' => 24,
            'Es_Obligatoria' => false,
        ]);

    $response->assertStatus(200);

    // El registro sigue existiendo con exactamente el mismo ID.
    $actualizada = PlantillaAgrupacion::find($originalId);
    expect($actualizada)->not->toBeNull();
    expect($actualizada->ID_Plantilla_Agrupacion)->toBe($originalId);
    expect($actualizada->Nombre_Agrupacion)->toBe('Nombre Editado Por Test');
    expect($actualizada->Tipo_Agrupacion)->toBe('OPTATIVA');
    expect($actualizada->Creditos_Requeridos)->toBe(12);
    expect($actualizada->Creditos_Maximos)->toBe(24);

    // No se creó ningún registro nuevo que reemplace al original.
    expect(PlantillaAgrupacion::where('Nombre_Agrupacion', 'Nombre Editado Por Test')->count())->toBe(1);
});
