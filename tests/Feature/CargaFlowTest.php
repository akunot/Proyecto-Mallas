<?php

use App\Models\CargaMalla;
use App\Models\Facultad;
use App\Models\Normativa;
use App\Models\Programa;
use App\Models\Sede;
use App\Models\Usuario;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;

beforeEach(function () {
    Artisan::call('migrate', ['--force' => true]);
    $sede = Sede::create([
        'Nombre_Sede' => 'Sede Prueba',
        'Ciudad_Sede' => 'Bogotá',
        'Direccion_Sede' => 'Calle 123',
    ]);

    $facultad = Facultad::create([
        'ID_Sede' => $sede->ID_Sede,
        'Nombre_Facultad' => 'Facultad de Prueba',
    ]);

    $programa = Programa::create([
        'ID_Facultad' => $facultad->ID_Facultad,
        'Codigo_Programa' => 'PR-001',
        'Nombre_Programa' => 'Programa de Prueba',
        'Titulo_Otorgado' => 'Ingeniero de Prueba',
        'Nivel_Formacion' => 'Pregrado',
        'Creditos_Totales' => 160,
        'Duracion_Semestres' => 10,
        'Codigo_SNIES' => '12345',
        'Activo_Programa' => 1,
    ]);

    $normativa = Normativa::create([
        'ID_Programa' => $programa->ID_Programa,
        'Tipo_Normativa' => 'Acuerdo',
        'Numero_Normativa' => '001',
        'Anio_Normativa' => date('Y'),
        'Instancia' => 'Consejo de Facultad',
        'Esta_Activo' => 1,
    ]);

    $this->user = Usuario::create([
        'Nombre_Usuario' => 'Usuario Prueba',
        'Email_Usuario' => 'usuario@prueba.test',
        'Activo_Usuario' => 1,
    ]);

    $this->programa = $programa;
    $this->normativa = $normativa;
});

test('can create carga and upload archivo tipo asignaturas before processing', function () {
    $this->actingAs($this->user, 'web');

    $createResponse = $this->postJson('/api/v1/cargas', [
        'normativa_id' => $this->normativa->ID_Normativa,
    ]);

    $createResponse->assertCreated();
    $createResponse->assertJsonPath('data.estado', 'esperando_archivos');

    $cargaId = $createResponse->json('data.carga_id');
    expect($cargaId)->toBeInt();

    $file = UploadedFile::fake()->create(
        'asignaturas.xlsx',
        50,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    $uploadResponse = $this->withHeaders([
        'Accept' => 'application/json',
    ])->post("/api/v1/cargas/{$cargaId}/archivo", [
        'archivo' => $file,
        'tipo_archivo' => 'asignaturas',
    ]);

    $uploadResponse->assertOk();
    $uploadResponse->assertJsonPath('data.estado', 'esperando_archivos');

    $processResponse = $this->postJson("/api/v1/cargas/{$cargaId}/procesar");
    $processResponse->assertStatus(409);
});
