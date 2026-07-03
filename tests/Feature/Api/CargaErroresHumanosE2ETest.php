<?php

use App\Models\CargaMalla;
use App\Models\ErrorCarga;
use App\Models\Normativa;
use App\Models\Programa;
use App\Models\Usuario;
use Illuminate\Http\UploadedFile;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

beforeEach(function () {
    $this->creador = Usuario::factory()->create();
    $this->programa = Programa::factory()->create();
    $this->normativa = Normativa::factory()->create([
        'Codigo_Programa' => $this->programa->Codigo_Programa,
    ]);
});

function crearExcelAsignaturasConErrores(): UploadedFile
{
    $spreadsheet = new Spreadsheet;
    $sheet = $spreadsheet->getActiveSheet();
    $sheet->setTitle('ASIGNATURAS');

    $rows = [
        ['Codigo', 'Nombre', 'Creditos', 'Horas_Presencial', 'Horas_Estudiante'],
        ['MAT101',  'Matematicas I',        4, 3, 2],
        [null,      'Asignatura sin codigo', 3, 2, 2],
        ['MAT101',  'Matematicas repetida',  4, 3, 2],
        ['FIS101',  'Fisica I',             4, 3, 2],
    ];

    $sheet->fromArray($rows, null, 'A1');

    $writer = new Xlsx($spreadsheet);
    $tempPath = tempnam(sys_get_temp_dir(), 'errores_').'.xlsx';
    $writer->save($tempPath);

    $uploaded = new UploadedFile(
        $tempPath,
        'asignaturas_con_errores.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        null,
        true
    );

    register_shutdown_function(function () use ($tempPath) {
        if (file_exists($tempPath)) {
            @unlink($tempPath);
        }
    });

    return $uploaded;
}

test('carga de asignaturas detecta errores humanos en el Excel', function () {
    // 1. Crear carga via API
    $response = $this->actingAs($this->creador)
        ->postJson('/api/v1/cargas', [
            'normativa_id' => $this->normativa->ID_Normativa,
            'programa_id' => $this->programa->ID_Programa,
            'tipo_carga' => 'asignaturas',
        ]);

    $response->assertStatus(201);
    $cargaId = $response->json('data.carga_id');

    // 2. Generar Excel con errores humanos y subirlo
    $archivo = crearExcelAsignaturasConErrores();

    $response = $this->actingAs($this->creador)
        ->call('POST', "/api/v1/cargas/{$cargaId}/archivo", [
            'tipo_archivo' => 'asignaturas',
        ], [], [
            'archivo' => $archivo,
        ]);

    $response->assertStatus(200);

    // 3. Procesar la carga
    $response = $this->actingAs($this->creador)
        ->postJson("/api/v1/cargas/{$cargaId}/procesar");

    $response->assertStatus(202);

    // 4. Verificar que se registraron los errores en la BD
    $errores = ErrorCarga::where('ID_Carga', $cargaId)->get();

    expect($errores)->not->toBeEmpty();
    expect($errores->count())->toBeGreaterThanOrEqual(2);

    // Buscar error de fila incompleta (codigo vacio)
    $carga = CargaMalla::find($cargaId);
    expect($carga->Estado_Carga)->toBe('con_errores');
});

test('errores humanos quedan registrados con los campos correctos', function () {
    $response = $this->actingAs($this->creador)
        ->postJson('/api/v1/cargas', [
            'normativa_id' => $this->normativa->ID_Normativa,
            'programa_id' => $this->programa->ID_Programa,
            'tipo_carga' => 'asignaturas',
        ]);

    $cargaId = $response->json('data.carga_id');

    $archivo = crearExcelAsignaturasConErrores();

    $this->actingAs($this->creador)
        ->call('POST', "/api/v1/cargas/{$cargaId}/archivo", [
            'tipo_archivo' => 'asignaturas',
        ], [], [
            'archivo' => $archivo,
        ]);

    $this->actingAs($this->creador)
        ->postJson("/api/v1/cargas/{$cargaId}/procesar");

    $errores = ErrorCarga::where('ID_Carga', $cargaId)->get();

    // Error 1: Fila incompleta (codigo vacio)
    $errorSinCodigo = $errores->first(fn ($e) => str_contains($e->Mensaje_Error, 'Fila incompleta'));
    expect($errorSinCodigo)->not->toBeNull();
    expect($errorSinCodigo->Fila_Error)->toBe(3);
    expect($errorSinCodigo->Columna_Error)->toBe('Asignaturas');
    expect($errorSinCodigo->Severidad_Error)->toBe('error');
    expect($errorSinCodigo->Valor_Recibido)->toContain('Asignatura sin codigo');

    // Error 2: Codigo duplicado en el mismo Excel
    $errorDuplicado = $errores->first(fn ($e) => str_contains($e->Mensaje_Error, 'múltiples veces'));
    expect($errorDuplicado)->not->toBeNull();
    expect($errorDuplicado->Fila_Error)->toBe(4);
    expect($errorDuplicado->Columna_Error)->toBe('Asignatura');
    expect($errorDuplicado->Severidad_Error)->toBe('error');
    expect($errorDuplicado->Valor_Recibido)->toContain('MAT101');

    // Verificar endpoint de errores tambien funciona
    $response = $this->actingAs($this->creador)
        ->getJson("/api/v1/cargas/{$cargaId}/errores");

    $response->assertStatus(200);
    expect($response->json('data'))->toBeArray();
    expect(count($response->json('data')))->toBeGreaterThanOrEqual(2);
});

test('carga valida sin errores humanos llega a borrador', function () {
    // Excel sin errores
    $spreadsheet = new Spreadsheet;
    $sheet = $spreadsheet->getActiveSheet();
    $sheet->setTitle('ASIGNATURAS');

    $rows = [
        ['Codigo', 'Nombre', 'Creditos', 'Horas_Presencial', 'Horas_Estudiante'],
        ['MAT101', 'Matematicas I', 4, 3, 2],
        ['FIS101', 'Fisica I', 4, 3, 2],
    ];

    $sheet->fromArray($rows, null, 'A1');

    $writer = new Xlsx($spreadsheet);
    $tempPath = tempnam(sys_get_temp_dir(), 'valida_').'.xlsx';
    $writer->save($tempPath);

    $archivo = new UploadedFile(
        $tempPath,
        'asignaturas_validas.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        null,
        true
    );

    $response = $this->actingAs($this->creador)
        ->postJson('/api/v1/cargas', [
            'normativa_id' => $this->normativa->ID_Normativa,
            'programa_id' => $this->programa->ID_Programa,
            'tipo_carga' => 'asignaturas',
        ]);

    $cargaId = $response->json('data.carga_id');

    $this->actingAs($this->creador)
        ->call('POST', "/api/v1/cargas/{$cargaId}/archivo", [
            'tipo_archivo' => 'asignaturas',
        ], [], [
            'archivo' => $archivo,
        ]);

    $this->actingAs($this->creador)
        ->postJson("/api/v1/cargas/{$cargaId}/procesar");

    $carga = CargaMalla::find($cargaId);
    expect($carga->Estado_Carga)->toBe('borrador');

    $errores = ErrorCarga::where('ID_Carga', $cargaId)->count();
    expect($errores)->toBe(0);

    if (file_exists($tempPath)) {
        @unlink($tempPath);
    }
});
