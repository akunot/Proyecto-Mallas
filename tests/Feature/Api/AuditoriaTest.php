<?php

use App\Models\LogActividad;
use App\Models\Usuario;

beforeEach(function () {
    $this->usuario = Usuario::factory()->create();
});

test('lista logs de auditoría', function () {
    LogActividad::factory()->count(3)->create([
        'ID_Usuario' => $this->usuario->ID_Usuario,
    ]);

    $response = $this->actingAs($this->usuario)
        ->getJson('/api/v1/auditoria/logs');

    $response->assertStatus(200);
});

test('acciones disponibles retorna lista', function () {
    $response = $this->actingAs($this->usuario)
        ->getJson('/api/v1/auditoria/acciones-disponibles');

    $response->assertStatus(200);
});

test('entidades disponibles retorna lista', function () {
    $response = $this->actingAs($this->usuario)
        ->getJson('/api/v1/auditoria/entidades-disponibles');

    $response->assertStatus(200);
});

test('estadísticas retorna datos', function () {
    LogActividad::factory()->count(5)->create([
        'ID_Usuario' => $this->usuario->ID_Usuario,
    ]);

    $response = $this->actingAs($this->usuario)
        ->getJson('/api/v1/auditoria/estadisticas');

    $response->assertStatus(200);
});

test('logs requiere autenticación', function () {
    $response = $this->getJson('/api/v1/auditoria/logs');

    $response->assertStatus(401);
});

test('exporta logs a CSV con fechas formateadas', function () {
    LogActividad::factory()->count(3)->create([
        'ID_Usuario' => $this->usuario->ID_Usuario,
    ]);

    $response = $this->actingAs($this->usuario)
        ->get('/api/v1/auditoria/exportar-logs');

    $response->assertStatus(200);
    expect($response->headers->get('Content-Type'))->toContain('text/csv');

    $csv = $response->getContent();
    expect($csv)->toContain('ID_Log,Usuario,Acción')
        // Cada fila termina con la fecha formateada (Y-m-d H:i:s):
        // regresión para el cast 'datetime' de Creacion_Log en LogActividad.
        ->and($csv)->toMatch('/,\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/m');
});

test('exporta logs tolera campos nulos', function () {
    LogActividad::factory()->create([
        'ID_Usuario' => null,
        'Entidad_ID_Log' => null,
        'Detalle_Log' => null,
        'IP_Origen_Log' => null,
    ]);

    $response = $this->actingAs($this->usuario)
        ->get('/api/v1/auditoria/exportar-logs');

    $response->assertStatus(200);
});
