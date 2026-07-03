<?php

use App\Models\CargaMalla;
use App\Models\ErrorCarga;
use App\Models\MallaCurricular;
use App\Models\Normativa;
use App\Models\Programa;
use App\Models\Usuario;

beforeEach(function () {
    $this->creador = Usuario::factory()->create();
    $this->revisor = Usuario::factory()->create();

    $this->programa = Programa::factory()->create();
    $this->normativa = Normativa::factory()->create([
        'Codigo_Programa' => $this->programa->Codigo_Programa,
    ]);
});

test('crea carga de malla y envia a revision', function () {
    $malla = MallaCurricular::factory()->create([
        'ID_Normativa' => $this->normativa->ID_Normativa,
        'ID_Programa' => $this->programa->ID_Programa,
        'Estado' => 'borrador',
    ]);

    // Crear carga via API
    $response = $this->actingAs($this->creador)
        ->postJson('/api/v1/cargas', [
            'normativa_id' => $this->normativa->ID_Normativa,
            'programa_id' => $this->programa->ID_Programa,
            'tipo_carga' => 'malla',
        ]);

    $response->assertStatus(201);
    expect($response->json('data'))->toHaveKey('carga_id');

    $cargaId = $response->json('data.carga_id');

    // Verificar carga creada en BD
    $carga = CargaMalla::find($cargaId);
    expect($carga)->not->toBeNull();
    expect($carga->Estado_Carga)->toBe('esperando_archivos');

    // Actualizar carga con malla asociada
    $carga->update([
        'ID_Malla' => $malla->ID_Malla,
        'Estado_Carga' => 'borrador',
    ]);

    // Enviar a revision
    $response = $this->actingAs($this->creador)
        ->postJson("/api/v1/aprobacion/cargas/{$cargaId}/enviar-revision");

    $response->assertStatus(200);
    expect($carga->fresh()->Estado_Carga)->toBe('pendiente_aprobacion');
    expect($malla->fresh()->Estado)->toBe('en_revision');
});

test('ciclo completo: rechazar y reenviar carga', function () {
    $malla = MallaCurricular::factory()->create([
        'ID_Normativa' => $this->normativa->ID_Normativa,
        'ID_Programa' => $this->programa->ID_Programa,
        'Estado' => 'borrador',
    ]);

    $carga = CargaMalla::factory()->create([
        'ID_Usuario' => $this->creador->ID_Usuario,
        'ID_Malla' => $malla->ID_Malla,
        'ID_Programa' => $this->programa->ID_Programa,
        'ID_Normativa' => $this->normativa->ID_Normativa,
        'tipo_carga' => 'malla',
        'Estado_Carga' => 'pendiente_aprobacion',
    ]);

    $malla->update(['Estado' => 'en_revision']);

    // Revisor rechaza
    $responseRechazar = $this->actingAs($this->revisor)
        ->patchJson("/api/v1/aprobacion/cargas/{$carga->ID_Carga}/revisar", [
            'accion' => 'rechazar',
            'comentario' => 'Faltan creditos en componente basico',
        ]);

    $responseRechazar->assertStatus(200);
    expect($carga->fresh()->Estado_Carga)->toBe('rechazado');
    expect($carga->fresh()->Comentario_Revisor)->toBe('Faltan creditos en componente basico');
    expect($malla->fresh()->Estado)->toBe('rechazada');

    // Creador reenvía después de corregir
    $responseReenviar = $this->actingAs($this->creador)
        ->postJson("/api/v1/aprobacion/cargas/{$carga->ID_Carga}/enviar-revision");

    $responseReenviar->assertStatus(200);
    expect($carga->fresh()->Estado_Carga)->toBe('pendiente_aprobacion');
    expect($carga->fresh()->Comentario_Revisor)->toBeNull();
    expect($malla->fresh()->Estado)->toBe('en_revision');
});

test('ciclo completo: crear, enviar, aprobar y ver malla activa', function () {
    $malla = MallaCurricular::factory()->create([
        'ID_Normativa' => $this->normativa->ID_Normativa,
        'ID_Programa' => $this->programa->ID_Programa,
        'Estado' => 'borrador',
    ]);

    $carga = CargaMalla::factory()->create([
        'ID_Usuario' => $this->creador->ID_Usuario,
        'ID_Malla' => $malla->ID_Malla,
        'ID_Programa' => $this->programa->ID_Programa,
        'ID_Normativa' => $this->normativa->ID_Normativa,
        'tipo_carga' => 'malla',
        'Estado_Carga' => 'pendiente_aprobacion',
    ]);

    $malla->update(['Estado' => 'en_revision']);

    // Aprobar
    $responseAprobar = $this->actingAs($this->revisor)
        ->patchJson("/api/v1/aprobacion/cargas/{$carga->ID_Carga}/revisar", [
            'accion' => 'aprobar',
            'comentario' => 'Malla aprobada',
        ]);

    $responseAprobar->assertStatus(200);
    expect($carga->fresh()->Estado_Carga)->toBe('aprobado');
    expect($malla->fresh()->Estado)->toBe('activa');
    expect($malla->fresh()->Es_Vigente)->toBeTrue();
});

test('archiva malla anterior al aprobar nueva version', function () {
    $mallaAnterior = MallaCurricular::factory()->activa()->create([
        'ID_Normativa' => $this->normativa->ID_Normativa,
        'ID_Programa' => $this->programa->ID_Programa,
        'Es_Vigente' => 1,
    ]);

    $mallaNueva = MallaCurricular::factory()->create([
        'ID_Normativa' => $this->normativa->ID_Normativa,
        'ID_Programa' => $this->programa->ID_Programa,
        'Version_Numero' => 2,
        'Estado' => 'en_revision',
    ]);

    $carga = CargaMalla::factory()->create([
        'ID_Usuario' => $this->creador->ID_Usuario,
        'ID_Malla' => $mallaNueva->ID_Malla,
        'ID_Programa' => $this->programa->ID_Programa,
        'ID_Normativa' => $this->normativa->ID_Normativa,
        'tipo_carga' => 'malla',
        'Estado_Carga' => 'pendiente_aprobacion',
    ]);

    $response = $this->actingAs($this->revisor)
        ->patchJson("/api/v1/aprobacion/cargas/{$carga->ID_Carga}/revisar", [
            'accion' => 'aprobar',
        ]);

    $response->assertStatus(200);

    // La anterior debe archivarse
    $mallaAnterior->refresh();
    expect($mallaAnterior->Estado)->toBe('archivada');
    expect($mallaAnterior->Es_Vigente)->toBeNull();

    // La nueva debe estar activa
    $mallaNueva->refresh();
    expect($mallaNueva->Estado)->toBe('activa');
    expect($mallaNueva->Es_Vigente)->toBeTrue();
});

test('lista cargas pendientes y mis cargas', function () {
    MallaCurricular::factory()->create([
        'ID_Normativa' => $this->normativa->ID_Normativa,
        'ID_Programa' => $this->programa->ID_Programa,
    ]);

    CargaMalla::factory()->count(3)->create([
        'ID_Usuario' => $this->creador->ID_Usuario,
        'ID_Programa' => $this->programa->ID_Programa,
        'ID_Normativa' => $this->normativa->ID_Normativa,
        'tipo_carga' => 'malla',
        'Estado_Carga' => 'pendiente_aprobacion',
    ]);

    // Mis cargas
    $misCargas = $this->actingAs($this->creador)
        ->getJson('/api/v1/aprobacion/mis-cargas');

    $misCargas->assertStatus(200);
    expect($misCargas->json('meta.total'))->toBe(3);

    // Pendientes (como revisor)
    $pendientes = $this->actingAs($this->revisor)
        ->getJson('/api/v1/aprobacion/pendientes');

    $pendientes->assertStatus(200);
});

test('rechaza enviar revision desde estado invalido', function () {
    $malla = MallaCurricular::factory()->create([
        'ID_Normativa' => $this->normativa->ID_Normativa,
        'ID_Programa' => $this->programa->ID_Programa,
    ]);

    $carga = CargaMalla::factory()->create([
        'ID_Usuario' => $this->creador->ID_Usuario,
        'ID_Malla' => $malla->ID_Malla,
        'ID_Programa' => $this->programa->ID_Programa,
        'ID_Normativa' => $this->normativa->ID_Normativa,
        'tipo_carga' => 'malla',
        'Estado_Carga' => 'aprobado',
    ]);

    $response = $this->actingAs($this->creador)
        ->postJson("/api/v1/aprobacion/cargas/{$carga->ID_Carga}/enviar-revision");

    $response->assertStatus(400);
});

test('rechaza revisar carga no pendiente', function () {
    $malla = MallaCurricular::factory()->create([
        'ID_Normativa' => $this->normativa->ID_Normativa,
        'ID_Programa' => $this->programa->ID_Programa,
    ]);

    $carga = CargaMalla::factory()->create([
        'ID_Usuario' => $this->creador->ID_Usuario,
        'ID_Malla' => $malla->ID_Malla,
        'ID_Programa' => $this->programa->ID_Programa,
        'ID_Normativa' => $this->normativa->ID_Normativa,
        'tipo_carga' => 'malla',
        'Estado_Carga' => 'borrador',
    ]);

    $response = $this->actingAs($this->revisor)
        ->patchJson("/api/v1/aprobacion/cargas/{$carga->ID_Carga}/revisar", [
            'accion' => 'aprobar',
        ]);

    $response->assertStatus(400);
});

test('rechaza enviar revision sin malla asociada', function () {
    $cargaSinMalla = CargaMalla::factory()->create([
        'ID_Usuario' => $this->creador->ID_Usuario,
        'ID_Malla' => null,
        'ID_Programa' => $this->programa->ID_Programa,
        'ID_Normativa' => $this->normativa->ID_Normativa,
        'tipo_carga' => 'malla',
        'Estado_Carga' => 'borrador',
    ]);

    $response = $this->actingAs($this->creador)
        ->postJson("/api/v1/aprobacion/cargas/{$cargaSinMalla->ID_Carga}/enviar-revision");

    $response->assertStatus(400);
});

test('registra errores de carga y lista correctamente', function () {
    $malla = MallaCurricular::factory()->create([
        'ID_Normativa' => $this->normativa->ID_Normativa,
        'ID_Programa' => $this->programa->ID_Programa,
    ]);

    $carga = CargaMalla::factory()->create([
        'ID_Usuario' => $this->creador->ID_Usuario,
        'ID_Malla' => $malla->ID_Malla,
        'ID_Programa' => $this->programa->ID_Programa,
        'ID_Normativa' => $this->normativa->ID_Normativa,
        'tipo_carga' => 'malla',
        'Estado_Carga' => 'con_errores',
    ]);

    ErrorCarga::create([
        'ID_Carga' => $carga->ID_Carga,
        'Tipo_Error' => 'validacion',
        'Descripcion_Error' => 'Codigo de asignatura duplicado',
        'Mensaje_Error' => 'Codigo de asignatura duplicado',
        'Fila_Excel' => 5,
    ]);

    ErrorCarga::create([
        'ID_Carga' => $carga->ID_Carga,
        'Tipo_Error' => 'validacion',
        'Descripcion_Error' => 'Credito invalido',
        'Mensaje_Error' => 'Credito invalido',
        'Fila_Excel' => 10,
    ]);

    $response = $this->actingAs($this->creador)
        ->getJson("/api/v1/cargas/{$carga->ID_Carga}/errores");

    $response->assertStatus(200);
});
