<?php

use App\Models\Agrupacion;
use App\Models\AgrupacionAsignatura;
use App\Models\Asignatura;
use App\Models\Componente;
use App\Models\MallaCurricular;
use App\Models\Normativa;
use App\Models\PlantillaAgrupacion;
use App\Models\Programa;
use App\Models\Requisito;
use App\Models\SlotAgrupacion;
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
test('splitBatchRequisitos separa requisitos con y sin asignatura requerida', function () {
    $programa = Programa::factory()->create();
    $asigA = Asignatura::factory()->create(['Codigo_Base' => 'A']);
    $asigB = Asignatura::factory()->create(['Codigo_Base' => 'B']);

    $batch = [
        [
            'ID_Asignatura' => $asigA->ID_Asignatura,
            'ID_Programa' => $programa->ID_Programa,
            'ID_Asignatura_Requerida' => null,
            'Tipo_Requisito' => 'creditos',
            'Valor_Creditos' => 100,
            'Descripcion_Requisito' => 'Haber aprobado 100 créditos (60%) del plan de estudios',
        ],
        [
            'ID_Asignatura' => $asigA->ID_Asignatura,
            'ID_Programa' => $programa->ID_Programa,
            'ID_Asignatura_Requerida' => $asigB->ID_Asignatura,
            'Tipo_Requisito' => 'prerrequisito',
            'Valor_Creditos' => null,
            'Descripcion_Requisito' => null,
        ],
    ];

    $service = new ExcelParserService();
    $reflection = new ReflectionClass($service);
    $method = $reflection->getMethod('splitBatchRequisitos');
    $method->setAccessible(true);

    [$sinFk, $conFk] = $method->invoke($service, $batch);

    expect($sinFk)->toHaveCount(1);
    expect($sinFk[0]['Tipo_Requisito'])->toBe('creditos');
    expect($conFk)->toHaveCount(1);
    expect($conFk[0]['ID_Asignatura_Requerida'])->toBe($asigB->ID_Asignatura);
});

test('updateOrInsertRequisitosSinFk no duplica requisitos de créditos al re-procesar', function () {
    $programa = Programa::factory()->create();
    $asigA = Asignatura::factory()->create(['Codigo_Base' => 'A']);

    $requisito = [
        'ID_Asignatura' => $asigA->ID_Asignatura,
        'ID_Programa' => $programa->ID_Programa,
        'ID_Asignatura_Requerida' => null,
        'Tipo_Requisito' => 'creditos',
        'Valor_Creditos' => 100,
        'Descripcion_Requisito' => 'Haber aprobado 100 créditos (60%) del plan de estudios',
    ];

    // Simular la re-carga del mismo archivo dos veces (flujo de parseMalla):
    // el upsert normal no es suficiente para clave NULL en MySQL.
    foreach ([1, 2] as $carga) {
        $service = new ExcelParserService();
        $reflection = new ReflectionClass($service);
        $method = $reflection->getMethod('updateOrInsertRequisitosSinFk');
        $method->setAccessible(true);
        $method->invoke($service, [$requisito]);
    }

    $filas = Requisito::where('ID_Asignatura', $asigA->ID_Asignatura)
        ->where('ID_Programa', $programa->ID_Programa)
        ->get();

    expect($filas)->toHaveCount(1);
    expect($filas->first()->Tipo_Requisito)->toBe('creditos');
    expect($filas->first()->Valor_Creditos)->toBe(100);
});
test('dos re-cargas del mismo archivo no duplican requisitos de créditos (flujo parseMalla)', function () {
    $programa = Programa::factory()->create();
    $asigA = Asignatura::factory()->create(['Codigo_Base' => 'A']);
    $asigB = Asignatura::factory()->create(['Codigo_Base' => 'B']);

    // Batch equivalente al que produce processRequisitoBatch para el archivo
    // "FORMATO DE CARGA - ADM. SISTEMAS.xlsx": un requisito de créditos en texto
    // (sin FK) y un prerrequisito con código (con FK).
    $batch = [
        [
            'ID_Asignatura' => $asigA->ID_Asignatura,
            'ID_Programa' => $programa->ID_Programa,
            'ID_Asignatura_Requerida' => null,
            'Tipo_Requisito' => 'creditos',
            'Valor_Creditos' => 100,
            'Descripcion_Requisito' => 'Haber aprobado 100 créditos (60%) del plan de estudios',
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'ID_Asignatura' => $asigA->ID_Asignatura,
            'ID_Programa' => $programa->ID_Programa,
            'ID_Asignatura_Requerida' => $asigB->ID_Asignatura,
            'Tipo_Requisito' => 'prerrequisito',
            'Valor_Creditos' => null,
            'Descripcion_Requisito' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ];

    foreach ([1, 2] as $carga) {
        $service = new ExcelParserService();
        $reflection = new ReflectionClass($service);

        $dedupe = $reflection->getMethod('dedupeBatchRequisitos');
        $dedupe->setAccessible(true);
        $batch = $dedupe->invoke($service, $batch);

        $cleanup = $reflection->getMethod('cleanupObsoleteRequisitos');
        $cleanup->setAccessible(true);
        $cleanup->invoke($service, $batch, $programa->ID_Programa);

        $purge = $reflection->getMethod('purgeDuplicateRequisitosByNormalizedDescription');
        $purge->setAccessible(true);
        $purge->invoke($service, $batch, $programa->ID_Programa);

        $split = $reflection->getMethod('splitBatchRequisitos');
        $split->setAccessible(true);
        [$sinFk, $conFk] = $split->invoke($service, $batch);

        if (! empty($conFk)) {
            DB::table('requisitos')->upsert(
                $conFk,
                ['ID_Asignatura', 'ID_Programa', 'ID_Asignatura_Requerida'],
                ['Tipo_Requisito', 'Valor_Creditos', 'Descripcion_Requisito', 'updated_at']
            );
        }

        if (! empty($sinFk)) {
            $updateOrInsert = $reflection->getMethod('updateOrInsertRequisitosSinFk');
            $updateOrInsert->setAccessible(true);
            $updateOrInsert->invoke($service, $sinFk);
        }
    }

    $creditos = Requisito::where('ID_Asignatura', $asigA->ID_Asignatura)
        ->where('ID_Programa', $programa->ID_Programa)
        ->where('Tipo_Requisito', 'creditos')
        ->get();
    $prerrequisito = Requisito::where('ID_Asignatura', $asigA->ID_Asignatura)
        ->where('ID_Programa', $programa->ID_Programa)
        ->where('Tipo_Requisito', 'prerrequisito')
        ->get();

    expect($creditos)->toHaveCount(1);
    expect($creditos->first()->Descripcion_Requisito)->toBe('Haber aprobado 100 créditos (60%) del plan de estudios');
    expect($prerrequisito)->toHaveCount(1);
    expect($prerrequisito->first()->ID_Asignatura_Requerida)->toBe($asigB->ID_Asignatura);
});

test('purge de duplicados conserva dos requisitos de texto distintos de la misma asignatura', function () {
    $programa = Programa::factory()->create();
    $asigA = Asignatura::factory()->create(['Codigo_Base' => 'A']);

    Requisito::create([
        'ID_Asignatura' => $asigA->ID_Asignatura,
        'ID_Programa' => $programa->ID_Programa,
        'ID_Asignatura_Requerida' => null,
        'Tipo_Requisito' => 'opcional',
        'Valor_Creditos' => null,
        'Descripcion_Requisito' => 'Sistemas Operativos',
    ]);

    Requisito::create([
        'ID_Asignatura' => $asigA->ID_Asignatura,
        'ID_Programa' => $programa->ID_Programa,
        'ID_Asignatura_Requerida' => null,
        'Tipo_Requisito' => 'opcional',
        'Valor_Creditos' => null,
        'Descripcion_Requisito' => 'Bases de Datos',
    ]);

    $batch = [
        [
            'ID_Asignatura' => $asigA->ID_Asignatura,
            'ID_Programa' => $programa->ID_Programa,
            'ID_Asignatura_Requerida' => null,
            'Tipo_Requisito' => 'opcional',
            'Valor_Creditos' => null,
            'Descripcion_Requisito' => 'Sistemas Operativos',
        ],
        [
            'ID_Asignatura' => $asigA->ID_Asignatura,
            'ID_Programa' => $programa->ID_Programa,
            'ID_Asignatura_Requerida' => null,
            'Tipo_Requisito' => 'opcional',
            'Valor_Creditos' => null,
            'Descripcion_Requisito' => 'Bases de Datos',
        ],
    ];

    $service = new ExcelParserService();
    $reflection = new ReflectionClass($service);
    $purge = $reflection->getMethod('purgeDuplicateRequisitosByNormalizedDescription');
    $purge->setAccessible(true);
    $purge->invoke($service, $batch, $programa->ID_Programa);

    $restantes = Requisito::where('ID_Asignatura', $asigA->ID_Asignatura)
        ->where('ID_Programa', $programa->ID_Programa)
        ->count();

    // Ambas descripciones distintas deben sobrevivir (antes se borraba una).
    expect($restantes)->toBe(2);
});

test('esPlaceholder reconoce optativas con sufijos mayores a 8 (OPTATIVA9, OPTATIVA10)', function () {
    $service = new ExcelParserService();
    $reflection = new ReflectionClass($service);
    $method = $reflection->getMethod('esPlaceholder');
    $method->setAccessible(true);

    // Cualquier sufijo numérico es placeholder (sin límite hardcodeado).
    foreach (['OPTATIVA9', 'OPTATIVA10', 'OPTATIVA11', 'LIBRE12', 'NIVELATORIO3'] as $codigo) {
        expect($method->invoke($service, $codigo))->toBeTrue();
    }

    // Variantes de formato que pueden llegar desde el Excel.
    expect($method->invoke($service, 'OPTATIVA 9'))->toBeTrue();
    expect($method->invoke($service, 'optativa10'))->toBeTrue();
    expect($method->invoke($service, ' NIVELATORIO 1 '))->toBeTrue();

    // Regresión: los rangos históricos siguen siendo placeholders.
    foreach (['OPTATIVA1', 'OPTATIVA8', 'LIBRE1', 'LIBRE11', 'NIVELATORIO2'] as $codigo) {
        expect($method->invoke($service, $codigo))->toBeTrue();
    }

    // Casos negativos: no son placeholders.
    foreach (['OPTATIVA', 'OPTATIVA9A', 'OPTATIVAFOO', '4201294', 'LIBRE ELECTIVA', 'INGLES I'] as $codigo) {
        expect($method->invoke($service, $codigo))->toBeFalse();
    }
});

test('placeholders OPTATIVA9 y OPTATIVA10 crean slots en lugar de relaciones de asignatura', function () {
    // Datos base equivalentes a las filas 68/69 de
    // "FORMATO DE CARGA - ADM. SISTEMAS.xlsx" con la plantilla 25
    // "Profesionales Optativas" del programa de ADM. SISTEMAS (4035).
    $programa = Programa::factory()->create();
    $normativa = Normativa::factory()->create([
        'Codigo_Programa' => $programa->Codigo_Programa,
    ]);
    $malla = MallaCurricular::factory()->create([
        'ID_Normativa' => $normativa->ID_Normativa,
        'ID_Programa' => $programa->ID_Programa,
        'Estado' => 'borrador',
    ]);
    $componente = Componente::factory()->create();

    $plantilla = PlantillaAgrupacion::create([
        'ID_Programa' => $programa->ID_Programa,
        'ID_Componente' => $componente->ID_Componente,
        'Nombre_Agrupacion' => 'Profesionales Optativas',
        'Tipo_Agrupacion' => 'OPTATIVA',
        'Creditos_Requeridos' => 9,
        'Es_Obligatoria' => false,
    ]);

    // Fila del Excel (columnas: Normativa, Componente, Agrupación, Código,
    // Obligatoria, Tipo requisito, Código requisito, Semestre).
    $filas = [
        [$normativa->ID_Normativa, $componente->ID_Componente, (string) $plantilla->ID_Plantilla_Agrupacion, 'OPTATIVA9', 'NO', '', '', 4],
        [$normativa->ID_Normativa, $componente->ID_Componente, (string) $plantilla->ID_Plantilla_Agrupacion, 'OPTATIVA10', 'NO', '', '', 8],
    ];

    $service = new ExcelParserService();
    $reflection = new ReflectionClass($service);

    $mallaProp = $reflection->getProperty('malla');
    $mallaProp->setAccessible(true);
    $mallaProp->setValue($service, $malla);

    $method = $reflection->getMethod('procesarPlaceholder');
    $method->setAccessible(true);
    foreach ($filas as $index => $fila) {
        $method->invoke($service, $fila, $index + 1);
    }

    // El placeholder crea la agrupación desde la plantilla y coloca los slots allí.
    $agrupacion = Agrupacion::where('ID_Malla', $malla->ID_Malla)
        ->where('Nombre_Agrupacion', 'Profesionales Optativas')
        ->first();
    expect($agrupacion)->not->toBeNull();

    $slots = SlotAgrupacion::where('ID_Agrupacion', $agrupacion->ID_Agrupacion)
        ->orderBy('Nombre_Slot')
        ->get();
    expect($slots)->toHaveCount(2);

    $slot9 = $slots->firstWhere('Nombre_Slot', 'OPTATIVA9');
    $slot10 = $slots->firstWhere('Nombre_Slot', 'OPTATIVA10');

    expect($slot9)->not->toBeNull();
    expect($slot9->Tipo_Slot)->toBe('optativa');
    expect($slot9->Semestre)->toBe(4);

    expect($slot10)->not->toBeNull();
    expect($slot10->Tipo_Slot)->toBe('optativa');
    expect($slot10->Semestre)->toBe(8);

    // Nunca deben quedar vinculadas como asignaturas de la malla, aunque
    // existan en el catálogo (el placeholder se detecta antes de buscarlo).
    expect(
        AgrupacionAsignatura::where('ID_Agrupacion', $agrupacion->ID_Agrupacion)->exists()
    )->toBeFalse();
});
