<?php

use App\Models\Asignatura;
use App\Models\Programa;
use App\Models\Requisito;
use App\Services\ExcelParserService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

test('cleanup de requisitos obsoletos elimina requisitos que no aparecen en el batch nuevo', function () {
    // Crear datos de prueba
    $programa = Programa::factory()->create();
    
    // Crear tres asignaturas: A (base), B y C (requisitos)
    $asigA = Asignatura::factory()->create(['Codigo_Base' => 'A']);
    $asigB = Asignatura::factory()->create(['Codigo_Base' => 'B']);
    $asigC = Asignatura::factory()->create(['Codigo_Base' => 'C']);
    
    // Crear requisitos iniciales: A→B y A→créditos
    Requisito::create([
        'ID_Asignatura' => $asigA->ID_Asignatura,
        'ID_Programa' => $programa->ID_Programa,
        'ID_Asignatura_Requerida' => $asigB->ID_Asignatura,
        'Tipo_Requisito' => 'prerrequisito',
        'Valor_Creditos' => null,
        'Descripcion_Requisito' => null,
    ]);
    
    Requisito::create([
        'ID_Asignatura' => $asigA->ID_Asignatura,
        'ID_Programa' => $programa->ID_Programa,
        'ID_Asignatura_Requerida' => null,
        'Tipo_Requisito' => 'creditos',
        'Valor_Creditos' => 30,
        'Descripcion_Requisito' => 'Mínimo 30 créditos',
    ]);
    
    // Verificar que hay 2 requisitos para asignatura A
    expect(Requisito::where('ID_Asignatura', $asigA->ID_Asignatura)
        ->where('ID_Programa', $programa->ID_Programa)
        ->count())
        ->toBe(2);
    
    // Simular re-procesamiento: nuevo batch solo contiene A→C (no B, no créditos)
    $newBatchRequisitos = [
        [
            'ID_Asignatura' => $asigA->ID_Asignatura,
            'ID_Programa' => $programa->ID_Programa,
            'ID_Asignatura_Requerida' => $asigC->ID_Asignatura,
            'Tipo_Requisito' => 'prerrequisito',
            'Valor_Creditos' => null,
            'Descripcion_Requisito' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ];
    
    // Usar reflection para acceder al método privado cleanupObsoleteRequisitos
    $service = new ExcelParserService();
    $reflection = new ReflectionClass($service);
    $method = $reflection->getMethod('cleanupObsoleteRequisitos');
    $method->setAccessible(true);
    
    // Ejecutar limpieza
    $method->invoke($service, $newBatchRequisitos, $programa->ID_Programa);
    
    // Simular el upsert que ocurriría después del cleanup en parseMalla()
    DB::table('requisitos')->upsert(
        $newBatchRequisitos,
        ['ID_Asignatura', 'ID_Programa', 'ID_Asignatura_Requerida'],
        ['Tipo_Requisito', 'Valor_Creditos', 'Descripcion_Requisito', 'updated_at']
    );
    
    // Verificar que solo queda A→C (los requisitos A→B y A→créditos fueron eliminados)
    $requisitosRestantes = Requisito::where('ID_Asignatura', $asigA->ID_Asignatura)
        ->where('ID_Programa', $programa->ID_Programa)
        ->get();
    
    expect($requisitosRestantes->count())->toBe(1);
    expect($requisitosRestantes->first()->ID_Asignatura_Requerida)->toBe($asigC->ID_Asignatura);
});

test('cleanup preserva requisitos con descripción cuando la descripción coincide', function () {
    // Caso: requisito A→C con descripción específica debe preservarse
    $programa = Programa::factory()->create();
    
    $asigA = Asignatura::factory()->create(['Codigo_Base' => 'A']);
    $asigC = Asignatura::factory()->create(['Codigo_Base' => 'C']);
    
    // Crear requisito con descripción
    Requisito::create([
        'ID_Asignatura' => $asigA->ID_Asignatura,
        'ID_Programa' => $programa->ID_Programa,
        'ID_Asignatura_Requerida' => $asigC->ID_Asignatura,
        'Tipo_Requisito' => 'preferente',
        'Valor_Creditos' => null,
        'Descripcion_Requisito' => 'Preferentemente después de Asig C',
    ]);
    
    // Batch nuevo contiene el mismo requisito (preserva descripción)
    $newBatchRequisitos = [
        [
            'ID_Asignatura' => $asigA->ID_Asignatura,
            'ID_Programa' => $programa->ID_Programa,
            'ID_Asignatura_Requerida' => $asigC->ID_Asignatura,
            'Tipo_Requisito' => 'preferente',
            'Valor_Creditos' => null,
            'Descripcion_Requisito' => 'Preferentemente después de Asig C',
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ];
    
    $service = new ExcelParserService();
    $reflection = new ReflectionClass($service);
    $method = $reflection->getMethod('cleanupObsoleteRequisitos');
    $method->setAccessible(true);
    $method->invoke($service, $newBatchRequisitos, $programa->ID_Programa);
    
    // Verificar que el requisito fue preservado
    expect(Requisito::where('ID_Asignatura', $asigA->ID_Asignatura)
        ->where('ID_Programa', $programa->ID_Programa)
        ->where('ID_Asignatura_Requerida', $asigC->ID_Asignatura)
        ->where('Descripcion_Requisito', 'Preferentemente después de Asig C')
        ->count())
        ->toBe(1);
});

test('cleanup maneja correctamente requisitos con ID_Asignatura_Requerida NULL', function () {
    // Caso: cambiar de requisito de créditos "30 créditos" a "40 créditos"
    $programa = Programa::factory()->create();
    $asigA = Asignatura::factory()->create(['Codigo_Base' => 'A']);
    
    // Crear requisito de créditos antiguo
    Requisito::create([
        'ID_Asignatura' => $asigA->ID_Asignatura,
        'ID_Programa' => $programa->ID_Programa,
        'ID_Asignatura_Requerida' => null,
        'Tipo_Requisito' => 'creditos',
        'Valor_Creditos' => 30,
        'Descripcion_Requisito' => '30 créditos',
    ]);
    
    // Batch nuevo: cambiar a 40 créditos (descripción diferente)
    $newBatchRequisitos = [
        [
            'ID_Asignatura' => $asigA->ID_Asignatura,
            'ID_Programa' => $programa->ID_Programa,
            'ID_Asignatura_Requerida' => null,
            'Tipo_Requisito' => 'creditos',
            'Valor_Creditos' => 40,
            'Descripcion_Requisito' => '40 créditos',
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ];
    
    $service = new ExcelParserService();
    $reflection = new ReflectionClass($service);
    $method = $reflection->getMethod('cleanupObsoleteRequisitos');
    $method->setAccessible(true);
    $method->invoke($service, $newBatchRequisitos, $programa->ID_Programa);
    
    // Simular el upsert que ocurriría después del cleanup en parseMalla()
    DB::table('requisitos')->upsert(
        $newBatchRequisitos,
        ['ID_Asignatura', 'ID_Programa', 'ID_Asignatura_Requerida'],
        ['Tipo_Requisito', 'Valor_Creditos', 'Descripcion_Requisito', 'updated_at']
    );
    
    // Verificar que solo existe el requisito de 40 créditos
    $requisitos = Requisito::where('ID_Asignatura', $asigA->ID_Asignatura)
        ->where('ID_Programa', $programa->ID_Programa)
        ->get();
    
    expect($requisitos->count())->toBe(1);
    expect($requisitos->first()->Descripcion_Requisito)->toBe('40 créditos');
});
