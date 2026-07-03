<?php

use App\Models\Agrupacion;
use App\Models\AgrupacionAsignatura;
use App\Models\Asignatura;
use App\Models\Componente;
use App\Models\MallaCurricular;
use App\Models\Normativa;
use App\Models\Programa;
use App\Models\SlotAgrupacion;
use App\Models\Usuario;

beforeEach(function () {
    $this->usuario = Usuario::factory()->create();

    $this->programa = Programa::factory()->create();
    $this->normativa = Normativa::factory()->create([
        'Codigo_Programa' => $this->programa->Codigo_Programa,
    ]);

    $this->malla = MallaCurricular::factory()->create([
        'ID_Normativa' => $this->normativa->ID_Normativa,
        'ID_Programa' => $this->programa->ID_Programa,
        'Version_Numero' => 1,
        'Codigo_Plan' => 'PLAN-001',
        'Estado' => 'borrador',
        'Es_Vigente' => null,
    ]);
});

test('crea malla completa con agrupaciones, asignaturas y slots', function () {
    $componente = Componente::factory()->create();

    // Crear agrupaciones
    $agrupacion1 = Agrupacion::create([
        'ID_Malla' => $this->malla->ID_Malla,
        'ID_Programa' => $this->programa->ID_Programa,
        'ID_Componente' => $componente->ID_Componente,
        'Nombre_Agrupacion' => 'Ciclo Basico',
        'Creditos_Requeridos' => 20,
        'Es_Obligatoria' => true,
    ]);

    $agrupacion2 = Agrupacion::create([
        'ID_Malla' => $this->malla->ID_Malla,
        'ID_Programa' => $this->programa->ID_Programa,
        'ID_Componente' => $componente->ID_Componente,
        'Nombre_Agrupacion' => 'Ciclo Profesional',
        'Creditos_Requeridos' => 30,
        'Es_Obligatoria' => true,
    ]);

    // Crear asignaturas y vincularlas
    $asignatura1 = Asignatura::factory()->create(['Creditos_Asignatura' => 4]);
    $asignatura2 = Asignatura::factory()->create(['Creditos_Asignatura' => 3]);
    $asignatura3 = Asignatura::factory()->create(['Creditos_Asignatura' => 5]);

    AgrupacionAsignatura::create([
        'ID_Agrupacion' => $agrupacion1->ID_Agrupacion,
        'ID_Asignatura' => $asignatura1->ID_Asignatura,
        'ID_Malla' => $this->malla->ID_Malla,
        'Tipo_Asignatura' => 'obligatoria',
        'Semestre_Sugerido' => 1,
        'Orden' => 1,
    ]);

    AgrupacionAsignatura::create([
        'ID_Agrupacion' => $agrupacion1->ID_Agrupacion,
        'ID_Asignatura' => $asignatura2->ID_Asignatura,
        'ID_Malla' => $this->malla->ID_Malla,
        'Tipo_Asignatura' => 'obligatoria',
        'Semestre_Sugerido' => 1,
        'Orden' => 2,
    ]);

    AgrupacionAsignatura::create([
        'ID_Agrupacion' => $agrupacion2->ID_Agrupacion,
        'ID_Asignatura' => $asignatura3->ID_Asignatura,
        'ID_Malla' => $this->malla->ID_Malla,
        'Tipo_Asignatura' => 'obligatoria',
        'Semestre_Sugerido' => 2,
        'Orden' => 1,
    ]);

    // Crear slot optativo
    SlotAgrupacion::create([
        'ID_Agrupacion' => $agrupacion2->ID_Agrupacion,
        'Nombre_Slot' => 'Optativa I',
        'Tipo_Slot' => 'optativa',
        'Semestre' => 2,
        'Orden' => 2,
    ]);

    // Verificar datos en BD (no existe endpoint GET /api/v1/mallas/{id})
    expect(MallaCurricular::find($this->malla->ID_Malla))->not->toBeNull();
    expect(Agrupacion::where('ID_Malla', $this->malla->ID_Malla)->count())->toBe(2);
    expect(AgrupacionAsignatura::where('ID_Malla', $this->malla->ID_Malla)->count())->toBe(3);
    expect(SlotAgrupacion::where('ID_Agrupacion', $agrupacion2->ID_Agrupacion)->count())->toBe(1);
});

test('reordena asignaturas dentro de una malla', function () {
    $componente = Componente::factory()->create();

    $agrupacion = Agrupacion::create([
        'ID_Malla' => $this->malla->ID_Malla,
        'ID_Programa' => $this->programa->ID_Programa,
        'ID_Componente' => $componente->ID_Componente,
        'Nombre_Agrupacion' => 'Ciclo Inicial',
    ]);

    $asignatura1 = Asignatura::factory()->create();
    $asignatura2 = Asignatura::factory()->create();

    $pivot1 = AgrupacionAsignatura::create([
        'ID_Agrupacion' => $agrupacion->ID_Agrupacion,
        'ID_Asignatura' => $asignatura1->ID_Asignatura,
        'ID_Malla' => $this->malla->ID_Malla,
        'Tipo_Asignatura' => 'obligatoria',
        'Semestre_Sugerido' => 1,
        'Orden' => 1,
    ]);

    $pivot2 = AgrupacionAsignatura::create([
        'ID_Agrupacion' => $agrupacion->ID_Agrupacion,
        'ID_Asignatura' => $asignatura2->ID_Asignatura,
        'ID_Malla' => $this->malla->ID_Malla,
        'Tipo_Asignatura' => 'obligatoria',
        'Semestre_Sugerido' => 1,
        'Orden' => 2,
    ]);

    // Reordenar: intercambiar orden y semestre
    $response = $this->actingAs($this->usuario)
        ->patchJson("/api/v1/mallas/{$this->malla->ID_Malla}/reordenar", [
            'cambios' => [
                [
                    'ID_Asignatura' => $asignatura1->ID_Asignatura,
                    'Semestre_Sugerido' => 2,
                    'Orden' => 3,
                ],
                [
                    'ID_Asignatura' => $asignatura2->ID_Asignatura,
                    'Semestre_Sugerido' => 1,
                    'Orden' => 1,
                ],
            ],
        ]);

    $response->assertStatus(200);

    // Verificar cambios en BD
    expect($pivot1->fresh()->Semestre_Sugerido)->toBe(2);
    expect($pivot1->fresh()->Orden)->toBe(3);
    expect($pivot2->fresh()->Semestre_Sugerido)->toBe(1);
    expect($pivot2->fresh()->Orden)->toBe(1);
});

test('reordena slots de agrupacion', function () {
    $componente = Componente::factory()->create();

    $agrupacion = Agrupacion::create([
        'ID_Malla' => $this->malla->ID_Malla,
        'ID_Programa' => $this->programa->ID_Programa,
        'ID_Componente' => $componente->ID_Componente,
        'Nombre_Agrupacion' => 'Ciclo Inicial',
    ]);

    $slot1 = SlotAgrupacion::create([
        'ID_Agrupacion' => $agrupacion->ID_Agrupacion,
        'Nombre_Slot' => 'Optativa I',
        'Tipo_Slot' => 'optativa',
        'Semestre' => 3,
        'Orden' => 1,
    ]);

    $slot2 = SlotAgrupacion::create([
        'ID_Agrupacion' => $agrupacion->ID_Agrupacion,
        'Nombre_Slot' => 'Optativa II',
        'Tipo_Slot' => 'optativa',
        'Semestre' => 4,
        'Orden' => 2,
    ]);

    $response = $this->actingAs($this->usuario)
        ->patchJson("/api/v1/mallas/{$this->malla->ID_Malla}/reordenar", [
            'cambios_slots' => [
                [
                    'ID_Slot' => $slot1->ID_Slot,
                    'Semestre' => 5,
                    'Orden' => 3,
                ],
                [
                    'ID_Slot' => $slot2->ID_Slot,
                    'Semestre' => 6,
                    'Orden' => 4,
                ],
            ],
        ]);

    $response->assertStatus(200);

    expect($slot1->fresh()->Semestre)->toBe(5);
    expect($slot1->fresh()->Orden)->toBe(3);
    expect($slot2->fresh()->Semestre)->toBe(6);
    expect($slot2->fresh()->Orden)->toBe(4);
});

test('activa malla y verifica visualizacion publica', function () {
    $componente = Componente::factory()->create();

    $agrupacion = Agrupacion::create([
        'ID_Malla' => $this->malla->ID_Malla,
        'ID_Programa' => $this->programa->ID_Programa,
        'ID_Componente' => $componente->ID_Componente,
        'Nombre_Agrupacion' => 'Area Principal',
        'Creditos_Requeridos' => 10,
        'Es_Obligatoria' => true,
    ]);

    $asignatura = Asignatura::factory()->create();
    AgrupacionAsignatura::create([
        'ID_Agrupacion' => $agrupacion->ID_Agrupacion,
        'ID_Asignatura' => $asignatura->ID_Asignatura,
        'ID_Malla' => $this->malla->ID_Malla,
        'Tipo_Asignatura' => 'obligatoria',
        'Semestre_Sugerido' => 1,
    ]);

    // Activar malla
    $this->malla->update([
        'Estado' => 'activa',
        'Es_Vigente' => 1,
    ]);

    // Verificar visualizador publico
    $response = $this->getJson(
        "/api/v1/public/programas/{$this->programa->ID_Programa}/malla-visualizador"
    );

    $response->assertStatus(200);

    $payload = $response->json();
    expect($payload)->toHaveKey('ID_Malla');
    expect($payload)->toHaveKey('agrupaciones');
    expect($payload['agrupaciones'])->toBeArray();
    expect($payload['agrupaciones'][0])->toHaveKeys([
        'ID_Agrupacion', 'Nombre_Agrupacion', 'Creditos_Requeridos',
        'Es_Obligatoria', 'componente', 'asignaturas',
    ]);
    expect($payload['agrupaciones'][0]['asignaturas'][0])->toHaveKeys([
        'ID_Asignatura', 'Nombre_Asignatura', 'Creditos_Asignatura',
        'requisitos', 'pivot',
    ]);
    expect($payload['agrupaciones'][0]['asignaturas'][0]['pivot'])->toHaveKeys([
        'Semestre_Sugerido', 'Tipo_Asignatura', 'Orden',
    ]);
});

test('activa malla y la muestra como vigente archivando la anterior', function () {
    $componente = Componente::factory()->create();
    $programaId = $this->programa->ID_Programa;

    // Crear malla activa anterior
    $mallaAnterior = MallaCurricular::factory()->activa()->create([
        'ID_Normativa' => $this->normativa->ID_Normativa,
        'ID_Programa' => $programaId,
    ]);

    // Crear agrupacion en malla anterior
    $agrupacionAnterior = Agrupacion::create([
        'ID_Malla' => $mallaAnterior->ID_Malla,
        'ID_Programa' => $programaId,
        'ID_Componente' => $componente->ID_Componente,
        'Nombre_Agrupacion' => 'Area Anterior',
    ]);

    $asignatura = Asignatura::factory()->create();
    AgrupacionAsignatura::create([
        'ID_Agrupacion' => $agrupacionAnterior->ID_Agrupacion,
        'ID_Asignatura' => $asignatura->ID_Asignatura,
        'ID_Malla' => $mallaAnterior->ID_Malla,
        'Tipo_Asignatura' => 'obligatoria',
        'Semestre_Sugerido' => 1,
    ]);

    // Crear nueva version
    $mallaNueva = MallaCurricular::factory()->create([
        'ID_Normativa' => $this->normativa->ID_Normativa,
        'ID_Programa' => $programaId,
        'Version_Numero' => 2,
        'Estado' => 'borrador',
    ]);

    $agrupacionNueva = Agrupacion::create([
        'ID_Malla' => $mallaNueva->ID_Malla,
        'ID_Programa' => $programaId,
        'ID_Componente' => $componente->ID_Componente,
        'Nombre_Agrupacion' => 'Area Nueva',
    ]);

    AgrupacionAsignatura::create([
        'ID_Agrupacion' => $agrupacionNueva->ID_Agrupacion,
        'ID_Asignatura' => $asignatura->ID_Asignatura,
        'ID_Malla' => $mallaNueva->ID_Malla,
        'Tipo_Asignatura' => 'obligatoria',
        'Semestre_Sugerido' => 1,
    ]);

    // Archivar la anterior primero, luego activar la nueva (evitar violación unique_vigente_programa)
    $mallaAnterior->update(['Estado' => 'archivada', 'Es_Vigente' => null]);
    $mallaNueva->update(['Estado' => 'activa', 'Es_Vigente' => 1]);

    // Verificar visualizador publico muestra la NUEVA
    $response = $this->getJson(
        "/api/v1/public/programas/{$programaId}/malla-visualizador"
    );

    $response->assertStatus(200);
    expect($response->json('ID_Malla'))->toBe($mallaNueva->ID_Malla);
    expect($response->json('agrupaciones.0.Nombre_Agrupacion'))->toBe('Area Nueva');

    // Verificar que la version especifica de la anterior aun es accesible
    $responseAnterior = $this->getJson(
        "/api/v1/public/mallas/{$mallaAnterior->ID_Malla}"
    );

    $responseAnterior->assertStatus(200);
    expect($responseAnterior->json('ID_Malla'))->toBe($mallaAnterior->ID_Malla);
});

test('public visualizer retorna 404 para programa sin malla activa', function () {
    $programaSinMalla = Programa::factory()->create();

    $response = $this->getJson(
        "/api/v1/public/programas/{$programaSinMalla->ID_Programa}/malla-visualizador"
    );

    $response->assertStatus(404);
});
