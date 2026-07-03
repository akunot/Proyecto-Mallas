<?php

use App\Models\Agrupacion;
use App\Models\AgrupacionAsignatura;
use App\Models\Asignatura;
use App\Models\Componente;
use App\Models\MallaCurricular;
use App\Models\Normativa;
use App\Models\Programa;
use App\Models\ProgramaElectiva;
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
        'Estado' => 'borrador',
    ]);

    $this->componente = Componente::factory()->create();
});

test('asigna optativa a agrupacion y la consulta publicamente', function () {
    $agrupacion = Agrupacion::create([
        'ID_Malla' => $this->malla->ID_Malla,
        'ID_Programa' => $this->programa->ID_Programa,
        'ID_Componente' => $this->componente->ID_Componente,
        'Nombre_Agrupacion' => 'Optativas Profesionales',
        'Creditos_Requeridos' => 12,
        'Es_Obligatoria' => false,
    ]);

    $asignatura = Asignatura::factory()->create();

    // Registrar como electiva del programa
    ProgramaElectiva::create([
        'ID_Programa' => $this->programa->ID_Programa,
        'ID_Asignatura' => $asignatura->ID_Asignatura,
    ]);

    // Asignar optativa a agrupacion
    $response = $this->actingAs($this->usuario)
        ->postJson("/api/v1/mallas/{$this->malla->ID_Malla}/optativas/asignar", [
            'ID_Agrupacion' => $agrupacion->ID_Agrupacion,
            'ID_Asignatura' => $asignatura->ID_Asignatura,
        ]);

    $response->assertStatus(200);
    expect($response->json('ok'))->toBeTrue();

    // Verificar en BD
    expect(
        AgrupacionAsignatura::where('ID_Malla', $this->malla->ID_Malla)
            ->where('ID_Agrupacion', $agrupacion->ID_Agrupacion)
            ->where('ID_Asignatura', $asignatura->ID_Asignatura)
            ->exists()
    )->toBeTrue();

    // Consultar optativas por slot publicamente
    $slot = SlotAgrupacion::create([
        'ID_Agrupacion' => $agrupacion->ID_Agrupacion,
        'Nombre_Slot' => 'Optativa Profesional I',
        'Tipo_Slot' => 'optativa',
        'Semestre' => 4,
    ]);

    $responseOpt = $this->getJson(
        "/api/v1/public/mallas/{$this->malla->ID_Malla}/optativas?slot_id={$slot->ID_Slot}"
    );

    $responseOpt->assertStatus(200);
    expect($responseOpt->json('data'))->toBeArray();
});

test('asigna multiples optativas en lote y las lista por agrupacion', function () {
    $agrupacion = Agrupacion::create([
        'ID_Malla' => $this->malla->ID_Malla,
        'ID_Programa' => $this->programa->ID_Programa,
        'ID_Componente' => $this->componente->ID_Componente,
        'Nombre_Agrupacion' => 'Electivas Complementarias',
        'Es_Obligatoria' => false,
    ]);

    $asignatura1 = Asignatura::factory()->create(['Creditos_Asignatura' => 3]);
    $asignatura2 = Asignatura::factory()->create(['Creditos_Asignatura' => 4]);
    $asignatura3 = Asignatura::factory()->create(['Creditos_Asignatura' => 2]);

    foreach ([$asignatura1, $asignatura2, $asignatura3] as $asig) {
        ProgramaElectiva::create([
            'ID_Programa' => $this->programa->ID_Programa,
            'ID_Asignatura' => $asig->ID_Asignatura,
        ]);
    }

    // Asignacion masiva
    $response = $this->actingAs($this->usuario)
        ->postJson("/api/v1/mallas/{$this->malla->ID_Malla}/optativas/asignar-batch", [
            'ID_Agrupacion' => $agrupacion->ID_Agrupacion,
            'ID_Asignaturas' => [
                $asignatura1->ID_Asignatura,
                $asignatura2->ID_Asignatura,
                $asignatura3->ID_Asignatura,
            ],
        ]);

    $response->assertStatus(200);

    // Verificar todas asignadas
    expect(
        AgrupacionAsignatura::where('ID_Malla', $this->malla->ID_Malla)
            ->where('ID_Agrupacion', $agrupacion->ID_Agrupacion)
            ->count()
    )->toBe(3);

    // Listar optativas por agrupacion (admin)
    $responseList = $this->actingAs($this->usuario)
        ->getJson("/api/v1/mallas/{$this->malla->ID_Malla}/optativas-por-agrupacion");

    $responseList->assertStatus(200);
    expect($responseList->json('data'))->toBeArray();
});

test('remueve optativa de agrupacion', function () {
    $agrupacion = Agrupacion::create([
        'ID_Malla' => $this->malla->ID_Malla,
        'ID_Programa' => $this->programa->ID_Programa,
        'ID_Componente' => $this->componente->ID_Componente,
        'Nombre_Agrupacion' => 'Optativas Removibles',
        'Es_Obligatoria' => false,
    ]);

    $asignatura = Asignatura::factory()->create();

    ProgramaElectiva::create([
        'ID_Programa' => $this->programa->ID_Programa,
        'ID_Asignatura' => $asignatura->ID_Asignatura,
    ]);

    // Asignar primero
    $this->actingAs($this->usuario)
        ->postJson("/api/v1/mallas/{$this->malla->ID_Malla}/optativas/asignar", [
            'ID_Agrupacion' => $agrupacion->ID_Agrupacion,
            'ID_Asignatura' => $asignatura->ID_Asignatura,
        ]);

    // Remover
    $response = $this->actingAs($this->usuario)
        ->postJson("/api/v1/mallas/{$this->malla->ID_Malla}/optativas/remover", [
            'ID_Agrupacion' => $agrupacion->ID_Agrupacion,
            'ID_Asignatura' => $asignatura->ID_Asignatura,
        ]);

    $response->assertStatus(200);
    expect($response->json('ok'))->toBeTrue();

    // Verificar removida
    expect(
        AgrupacionAsignatura::where('ID_Malla', $this->malla->ID_Malla)
            ->where('ID_Agrupacion', $agrupacion->ID_Agrupacion)
            ->where('ID_Asignatura', $asignatura->ID_Asignatura)
            ->exists()
    )->toBeFalse();
});

test('remueve multiples optativas en lote', function () {
    $agrupacion = Agrupacion::create([
        'ID_Malla' => $this->malla->ID_Malla,
        'ID_Programa' => $this->programa->ID_Programa,
        'ID_Componente' => $this->componente->ID_Componente,
        'Nombre_Agrupacion' => 'Optativas Batch',
        'Es_Obligatoria' => false,
    ]);

    $asignatura1 = Asignatura::factory()->create();
    $asignatura2 = Asignatura::factory()->create();

    foreach ([$asignatura1, $asignatura2] as $asig) {
        ProgramaElectiva::create([
            'ID_Programa' => $this->programa->ID_Programa,
            'ID_Asignatura' => $asig->ID_Asignatura,
        ]);
    }

    // Asignar ambas
    $this->actingAs($this->usuario)
        ->postJson("/api/v1/mallas/{$this->malla->ID_Malla}/optativas/asignar-batch", [
            'ID_Agrupacion' => $agrupacion->ID_Agrupacion,
            'ID_Asignaturas' => [$asignatura1->ID_Asignatura, $asignatura2->ID_Asignatura],
        ]);

    // Remover ambas en lote
    $response = $this->actingAs($this->usuario)
        ->postJson("/api/v1/mallas/{$this->malla->ID_Malla}/optativas/remover-batch", [
            'ID_Agrupacion' => $agrupacion->ID_Agrupacion,
            'ID_Asignaturas' => [$asignatura1->ID_Asignatura, $asignatura2->ID_Asignatura],
        ]);

    $response->assertStatus(200);
    expect($response->json('ok'))->toBeTrue();
});

test('rechaza asignar optativa no registrada en el programa', function () {
    $agrupacion = Agrupacion::create([
        'ID_Malla' => $this->malla->ID_Malla,
        'ID_Programa' => $this->programa->ID_Programa,
        'ID_Componente' => $this->componente->ID_Componente,
        'Nombre_Agrupacion' => 'Optativas Restringidas',
    ]);

    $asignatura = Asignatura::factory()->create();
    // NO registrar como electiva

    $response = $this->actingAs($this->usuario)
        ->postJson("/api/v1/mallas/{$this->malla->ID_Malla}/optativas/asignar", [
            'ID_Agrupacion' => $agrupacion->ID_Agrupacion,
            'ID_Asignatura' => $asignatura->ID_Asignatura,
        ]);

    $response->assertStatus(422);
});

test('lista optativas sin agrupacion asignada', function () {
    $asignatura = Asignatura::factory()->create();
    ProgramaElectiva::create([
        'ID_Programa' => $this->programa->ID_Programa,
        'ID_Asignatura' => $asignatura->ID_Asignatura,
    ]);

    $response = $this->actingAs($this->usuario)
        ->getJson("/api/v1/mallas/{$this->malla->ID_Malla}/optativas-sin-agrupacion");

    $response->assertStatus(200);
});

test('lista agrupaciones de programa para selector admin', function () {
    $response = $this->actingAs($this->usuario)
        ->getJson("/api/v1/mallas/{$this->malla->ID_Malla}/agrupaciones");

    $response->assertStatus(200);
});
