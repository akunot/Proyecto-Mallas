<?php

use App\Models\CargaMalla;
use App\Models\MallaCurricular;
use App\Models\Normativa;
use App\Models\Programa;
use App\Models\Usuario;

beforeEach(function () {
    $this->creador = Usuario::factory()->create();
    $this->revisor = Usuario::factory()->create();

    $programa = Programa::factory()->create();
    $normativa = Normativa::factory()->create(['Codigo_Programa' => $programa->Codigo_Programa]);
    $this->malla = MallaCurricular::factory()->create([
        'ID_Normativa' => $normativa->ID_Normativa,
        'ID_Programa' => $programa->ID_Programa,
        'Estado' => 'borrador',
    ]);

    $this->carga = CargaMalla::factory()->create([
        'ID_Usuario' => $this->creador->ID_Usuario,
        'ID_Malla' => $this->malla->ID_Malla,
        'ID_Programa' => $programa->ID_Programa,
        'ID_Normativa' => $normativa->ID_Normativa,
        'tipo_carga' => 'malla',
        'Estado_Carga' => 'borrador',
    ]);
});

test('enviar revision con estado borrador retorna 200', function () {
    $response = $this->actingAs($this->creador)
        ->postJson("/api/v1/aprobacion/cargas/{$this->carga->ID_Carga}/enviar-revision");

    $response->assertStatus(200);

    $this->carga->refresh();
    expect($this->carga->Estado_Carga)->toBe('pendiente_aprobacion');
    expect($this->malla->fresh()->Estado)->toBe('en_revision');
});

test('enviar revision con estado invalido retorna 400', function () {
    $this->carga->update(['Estado_Carga' => 'aprobado']);

    $response = $this->actingAs($this->creador)
        ->postJson("/api/v1/aprobacion/cargas/{$this->carga->ID_Carga}/enviar-revision");

    $response->assertStatus(400);
});

test('aprobar malla con revisor diferente retorna 200', function () {
    $this->carga->update(['Estado_Carga' => 'pendiente_aprobacion']);

    $response = $this->actingAs($this->revisor)
        ->patchJson("/api/v1/aprobacion/cargas/{$this->carga->ID_Carga}/revisar", [
            'accion' => 'aprobar',
            'comentario' => 'Aprobada',
        ]);

    $response->assertStatus(200);

    $this->carga->refresh();
    expect($this->carga->Estado_Carga)->toBe('aprobado');
    expect($this->carga->ID_Usuario_Revisor)->toBe($this->revisor->ID_Usuario);
    expect($this->malla->fresh()->Estado)->toBe('activa');
});

test('rechazar malla con revisor diferente retorna 200', function () {
    $this->carga->update(['Estado_Carga' => 'pendiente_aprobacion']);

    $response = $this->actingAs($this->revisor)
        ->patchJson("/api/v1/aprobacion/cargas/{$this->carga->ID_Carga}/revisar", [
            'accion' => 'rechazar',
            'comentario' => 'Requiere correcciones',
        ]);

    $response->assertStatus(200);

    $this->carga->refresh();
    expect($this->carga->Estado_Carga)->toBe('rechazado');
    expect($this->carga->ID_Usuario_Revisor)->toBe($this->revisor->ID_Usuario);
    expect($this->malla->fresh()->Estado)->toBe('rechazada');
});

test('puede aprobar propia carga retorna 200', function () {
    $this->carga->update(['Estado_Carga' => 'pendiente_aprobacion']);

    $response = $this->actingAs($this->creador)
        ->patchJson("/api/v1/aprobacion/cargas/{$this->carga->ID_Carga}/revisar", [
            'accion' => 'aprobar',
        ]);

    $response->assertStatus(200);
});

test('puede reenviar carga rechazada a revision', function () {
    $this->carga->update([
        'Estado_Carga' => 'rechazado',
        'Comentario_Revisor' => 'Requiere cambios',
        'ID_Usuario_Revisor' => $this->revisor->ID_Usuario,
        'Fecha_Revision' => now(),
        'Finalizacion_Carga' => now(),
    ]);
    $this->malla->update(['Estado' => 'rechazada']);

    $response = $this->actingAs($this->creador)
        ->postJson("/api/v1/aprobacion/cargas/{$this->carga->ID_Carga}/enviar-revision");

    $response->assertStatus(200);

    $this->carga->refresh();
    expect($this->carga->Estado_Carga)->toBe('pendiente_aprobacion');
    expect($this->carga->Comentario_Revisor)->toBeNull();
    expect($this->carga->ID_Usuario_Revisor)->toBeNull();
    expect($this->carga->Finalizacion_Carga)->toBeNull();
    expect($this->malla->fresh()->Estado)->toBe('en_revision');
});

test('revisar carga no pendiente retorna 400', function () {
    $response = $this->actingAs($this->revisor)
        ->patchJson("/api/v1/aprobacion/cargas/{$this->carga->ID_Carga}/revisar", [
            'accion' => 'aprobar',
        ]);

    $response->assertStatus(400);
});

test('aprobar malla archiva la malla vigente anterior', function () {
    $programaId = $this->malla->ID_Programa;

    $mallaAnterior = MallaCurricular::factory()->activa()->create([
        'ID_Programa' => $programaId,
        'ID_Normativa' => $this->malla->ID_Normativa,
    ]);

    $this->carga->update(['Estado_Carga' => 'pendiente_aprobacion']);

    $response = $this->actingAs($this->revisor)
        ->patchJson("/api/v1/aprobacion/cargas/{$this->carga->ID_Carga}/revisar", [
            'accion' => 'aprobar',
        ]);

    $response->assertStatus(200);

    $mallaAnterior->refresh();
    expect($mallaAnterior->Es_Vigente)->toBeNull();
    expect($mallaAnterior->Estado)->toBe('archivada');
});

test('obtener cargas pendientes de revision', function () {
    $this->carga->update(['Estado_Carga' => 'pendiente_aprobacion']);

    $response = $this->actingAs($this->revisor)
        ->getJson('/api/v1/aprobacion/pendientes');

    $response->assertStatus(200);
});

test('obtener mis cargas como creador', function () {
    $response = $this->actingAs($this->creador)
        ->getJson('/api/v1/aprobacion/mis-cargas');

    $response->assertStatus(200);
});

test('no puede enviar revision sin malla asociada', function () {
    $cargaSinMalla = CargaMalla::factory()->create([
        'ID_Usuario' => $this->creador->ID_Usuario,
        'ID_Malla' => null,
        'Estado_Carga' => 'borrador',
    ]);

    $response = $this->actingAs($this->creador)
        ->postJson("/api/v1/aprobacion/cargas/{$cargaSinMalla->ID_Carga}/enviar-revision");

    $response->assertStatus(400);
});
