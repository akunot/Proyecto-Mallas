<?php

use App\Models\Asignatura;
use App\Models\CargaMalla;
use App\Models\Componente;
use App\Models\ErrorCarga;
use App\Models\MallaCurricular;
use App\Models\Normativa;
use App\Models\PlantillaAgrupacion;
use App\Models\Programa;
use App\Models\Usuario;
use App\Services\ExcelParserService;

/**
 * Regresión: una asignatura creada desde el CRUD debe ser localizable por el
 * importador de mallas. Ambos caminos comparten la misma clave de catálogo:
 * `Codigo_Base` (= CodeNormalizationService::normalize(Codigo_Asignatura)).
 */
function codigoAsignaturaLibre(): string
{
    do {
        $codigo = (string) fake()->numberBetween(1000000, 9999999);
    } while (Asignatura::where('Codigo_Asignatura', $codigo)->exists());

    return $codigo;
}

function nuevoParserConContexto(CargaMalla $carga, MallaCurricular $malla, bool $precargar = true): ExcelParserService
{
    $service = new ExcelParserService;
    $reflection = new ReflectionClass($service);

    $cargaProp = $reflection->getProperty('carga');
    $cargaProp->setAccessible(true);
    $cargaProp->setValue($service, $carga);

    $mallaProp = $reflection->getProperty('malla');
    $mallaProp->setAccessible(true);
    $mallaProp->setValue($service, $malla);

    if ($precargar) {
        $preload = $reflection->getMethod('preloadAsignaturasCache');
        $preload->setAccessible(true);
        $preload->invoke($service);
    }

    return $service;
}

/**
 * Ejecuta accumulateMallaRow() sobre una fila de la hoja MALLA.
 * Columnas: Normativa, Componente, Plantilla, Codigo, Obligatoria,
 * TipoRequisito, CodigoRequisito, Semestre, ...
 */
function acumularFilaMalla(ExcelParserService $service, array $fila, int $numeroFila = 2): array
{
    $reflection = new ReflectionClass($service);
    $method = $reflection->getMethod('accumulateMallaRow');
    $method->setAccessible(true);

    $batchComponentes = [];
    $batchAgrupaciones = [];
    $batchRelaciones = [];
    $batchRequisitos = [];
    $compTempMap = [];
    $agrupTempMap = [];

    $args = [
        $fila,
        $numeroFila,
        &$batchComponentes,
        &$batchAgrupaciones,
        &$batchRelaciones,
        &$batchRequisitos,
        &$compTempMap,
        &$agrupTempMap,
    ];
    $method->invokeArgs($service, $args);

    return [
        'agrupaciones' => $batchAgrupaciones,
        'relaciones' => $batchRelaciones,
        'requisitos' => $batchRequisitos,
    ];
}

function filaMalla($componente, $plantilla, $codigo, string $obligatoria = 'NO'): array
{
    return [
        null,
        $componente,
        (string) $plantilla,
        $codigo,
        $obligatoria,
        '', '',
        3,
        '', '', '', '',
    ];
}

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
    $this->carga = CargaMalla::factory()->create([
        'ID_Malla' => $this->malla->ID_Malla,
        'ID_Programa' => $this->programa->ID_Programa,
        'ID_Normativa' => $this->normativa->ID_Normativa,
        'tipo_carga' => 'malla',
    ]);
    $this->plantilla = PlantillaAgrupacion::create([
        'ID_Programa' => $this->programa->ID_Programa,
        'ID_Componente' => $this->componente->ID_Componente,
        'Nombre_Agrupacion' => 'Agrupacion de prueba',
        'Tipo_Agrupacion' => 'OBLIGATORIA',
        'Creditos_Requeridos' => 9,
        'Es_Obligatoria' => true,
    ]);
});

function crearAsignaturaDesdeCrud($test, string $codigo, string $nombre = 'Asignatura CRUD'): int
{
    $response = $test->actingAs($test->usuario)
        ->postJson('/api/v1/asignaturas', [
            'Codigo_Asignatura' => $codigo,
            'Nombre_Asignatura' => $nombre,
            'Creditos_Asignatura' => 3,
        ]);

    $response->assertStatus(201);

    $id = $response->json('data.ID_Asignatura');
    expect($id)->not->toBeNull();

    return (int) $id;
}

test('Caso 1 y 6: asignatura creada desde el CRUD es encontrada por el importador de mallas', function () {
    $codigo = codigoAsignaturaLibre();

    $idCreada = crearAsignaturaDesdeCrud($this, $codigo, 'Prueba Asignatura Malla');

    $creada = Asignatura::find($idCreada);
    expect($creada->Codigo_Base)->toBe($codigo);

    $service = nuevoParserConContexto($this->carga, $this->malla);
    $resultado = acumularFilaMalla(
        $service,
        filaMalla($this->componente->ID_Componente, $this->plantilla->ID_Plantilla_Agrupacion, $codigo),
        60
    );

    expect(ErrorCarga::where('ID_Carga', $this->carga->ID_Carga)->pluck('Mensaje_Error')->all())->toBe([]);
    expect($resultado['relaciones'])->toHaveCount(1);
    expect($resultado['relaciones'][0]['ID_Asignatura'])->toBe($idCreada);
});

test('Caso 2: una asignatura realmente inexistente sigue produciendo el error de catalogo', function () {
    $codigo = codigoAsignaturaLibre();
    expect(Asignatura::where('Codigo_Base', $codigo)->exists())->toBeFalse();

    $service = nuevoParserConContexto($this->carga, $this->malla);
    $resultado = acumularFilaMalla(
        $service,
        filaMalla($this->componente->ID_Componente, $this->plantilla->ID_Plantilla_Agrupacion, $codigo),
        61
    );

    expect($resultado['relaciones'])->toBeEmpty();

    $error = ErrorCarga::where('ID_Carga', $this->carga->ID_Carga)
        ->where('Columna_Error', 'Asignatura')
        ->first();

    expect($error)->not->toBeNull();
    expect($error->Mensaje_Error)->toBe('Asignatura no encontrada en el catalogo. Asegurese de subirla primero.');
    expect($error->Valor_Recibido)->toBe($codigo);
    expect($error->Fila_Error)->toBe(61);
});

test('Caso 3: codigo con espacios accidentales produce un Codigo_Base consistente', function () {
    $codigo = codigoAsignaturaLibre();

    // 1) Via HTTP (CRUD): TrimStrings normaliza el valor recibido, asi que el
    //    catalogo guarda el codigo limpio en Codigo_Asignatura y en Codigo_Base.
    $idCreada = crearAsignaturaDesdeCrud($this, ' '.$codigo.' ');

    $creada = Asignatura::find($idCreada);
    expect($creada->Codigo_Asignatura)->toBe($codigo);
    expect($creada->Codigo_Base)->toBe($codigo);

    $service = nuevoParserConContexto($this->carga, $this->malla);
    $resultado = acumularFilaMalla(
        $service,
        filaMalla($this->componente->ID_Componente, $this->plantilla->ID_Plantilla_Agrupacion, $codigo),
        62
    );

    expect(ErrorCarga::where('ID_Carga', $this->carga->ID_Carga)->pluck('Mensaje_Error')->all())->toBe([]);
    expect($resultado['relaciones'])->toHaveCount(1);
    expect($resultado['relaciones'][0]['ID_Asignatura'])->toBe($idCreada);

    // 2) Escritura directa (seeds, tinker, scripts): el codigo con espacios se
    //    conserva en Codigo_Asignatura, pero Codigo_Base (la clave de busqueda
    //    del importador) queda normalizado.
    $codigoEspaciado = codigoAsignaturaLibre();
    $directa = Asignatura::create([
        'Codigo_Asignatura' => ' '.$codigoEspaciado."\n",
        'Nombre_Asignatura' => 'Codigo con espacios',
        'Creditos_Asignatura' => 3,
    ]);

    expect($directa->Codigo_Asignatura)->toBe(' '.$codigoEspaciado."\n");
    expect($directa->fresh()->Codigo_Base)->toBe($codigoEspaciado);

    $serviceDirecto = nuevoParserConContexto($this->carga, $this->malla);
    $resultadoDirecto = acumularFilaMalla(
        $serviceDirecto,
        filaMalla($this->componente->ID_Componente, $this->plantilla->ID_Plantilla_Agrupacion, $codigoEspaciado),
        63
    );

    expect(ErrorCarga::where('ID_Carga', $this->carga->ID_Carga)->pluck('Mensaje_Error')->all())->toBe([]);
    expect($resultadoDirecto['relaciones'])->toHaveCount(1);
    expect($resultadoDirecto['relaciones'][0]['ID_Asignatura'])->toBe($directa->ID_Asignatura);
});

test('Caso 4: el codigo almacenado como string en BD coincide con la celda numerica de Excel', function () {
    $codigo = codigoAsignaturaLibre();

    $idCreada = crearAsignaturaDesdeCrud($this, $codigo);

    $guardada = Asignatura::find($idCreada)->getAttributes();
    expect(gettype($guardada['Codigo_Asignatura']))->toBe('string');
    expect($guardada['Codigo_Base'])->toBe($codigo);

    $service = nuevoParserConContexto($this->carga, $this->malla);

    // PhpSpreadsheet devuelve celdas numéricas como int/float.
    $resultadoInt = acumularFilaMalla(
        $service,
        filaMalla($this->componente->ID_Componente, $this->plantilla->ID_Plantilla_Agrupacion, (int) $codigo),
        63
    );
    expect($resultadoInt['relaciones'])->toHaveCount(1);
    expect($resultadoInt['relaciones'][0]['ID_Asignatura'])->toBe($idCreada);

    // Nueva instancia (mismo estado inicial que una importación independiente)
    // para repetir la fila con el código llegando como string.
    $serviceString = nuevoParserConContexto($this->carga, $this->malla);
    $resultadoString = acumularFilaMalla(
        $serviceString,
        filaMalla($this->componente->ID_Componente, $this->plantilla->ID_Plantilla_Agrupacion, $codigo),
        64
    );
    expect(ErrorCarga::where('ID_Carga', $this->carga->ID_Carga)->pluck('Mensaje_Error')->all())->toBe([]);
    expect($resultadoString['relaciones'])->toHaveCount(1);
    expect($resultadoString['relaciones'][0]['ID_Asignatura'])->toBe($idCreada);
});

test('Caso 5: varias asignaturas creadas desde el CRUD se resuelven en una misma malla', function () {
    $codigos = [];
    foreach (range(1, 3) as $i) {
        $codigos[$i] = codigoAsignaturaLibre();
        $codigos[$i] = ['codigo' => $codigos[$i], 'id' => crearAsignaturaDesdeCrud($this, $codigos[$i])];
    }

    $service = nuevoParserConContexto($this->carga, $this->malla);

    $filas = [];
    foreach ($codigos as $i => $datos) {
        $filas[] = acumularFilaMalla(
            $service,
            filaMalla($this->componente->ID_Componente, $this->plantilla->ID_Plantilla_Agrupacion, $datos['codigo']),
            70 + $i
        );
    }

    expect(ErrorCarga::where('ID_Carga', $this->carga->ID_Carga)->pluck('Mensaje_Error')->all())->toBe([]);

    $relaciones = collect($filas)->flatMap(fn ($fila) => $fila['relaciones']);
    expect($relaciones)->toHaveCount(3);
    expect($relaciones->pluck('ID_Asignatura')->sort()->values()->all())
        ->toBe(collect($codigos)->pluck('id')->sort()->values()->all());
});

test('Caso 7: la precarga del catalogo del importador incluye una asignatura creada despues de una carga previa', function () {
    $codigoPrevio = codigoAsignaturaLibre();
    crearAsignaturaDesdeCrud($this, $codigoPrevio);

    // Se inicia una importación: precarga el catálogo en ese momento.
    $parserPrevio = nuevoParserConContexto($this->carga, $this->malla);

    // Inmediatamente después, el CRUD registra una asignatura nueva.
    $codigoNuevo = codigoAsignaturaLibre();
    $idNuevo = crearAsignaturaDesdeCrud($this, $codigoNuevo);

    // Una nueva importación (nueva instancia, como ocurre en cada job) debe
    // volver a precargar el catálogo y ver la asignatura recién creada.
    $parserNuevo = nuevoParserConContexto($this->carga, $this->malla);

    $buscar = fn (ExcelParserService $parser, string $codigo): ?int => (function () use ($parser, $codigo) {
        $reflection = new ReflectionClass($parser);
        $method = $reflection->getMethod('buscarAsignaturaPorCodigoBase');
        $method->setAccessible(true);

        return $method->invoke($parser, $codigo);
    })();

    expect($buscar($parserNuevo, $codigoPrevio))->not->toBeNull();
    expect($buscar($parserNuevo, $codigoNuevo))->toBe($idNuevo);

    $resultado = acumularFilaMalla(
        $parserNuevo,
        filaMalla($this->componente->ID_Componente, $this->plantilla->ID_Plantilla_Agrupacion, $codigoNuevo),
        80
    );
    expect(ErrorCarga::where('ID_Carga', $this->carga->ID_Carga)->pluck('Mensaje_Error')->all())->toBe([]);
    expect($resultado['relaciones'][0]['ID_Asignatura'])->toBe($idNuevo);
});

test('el modelo conserva un Codigo_Base explicito y lo recalcula al cambiar el codigo', function () {
    $codigo = codigoAsignaturaLibre();

    // Un Codigo_Base provisto explicitamente (factory, importador) no se pisa.
    $explicita = Asignatura::factory()->create([
        'Codigo_Asignatura' => $codigo,
        'Codigo_Base' => 'BASE_EXPLICITA',
    ]);
    expect($explicita->fresh()->Codigo_Base)->toBe('BASE_EXPLICITA');

    // Un update del codigo recalcula la base normalizada.
    $explicita->update(['Codigo_Asignatura' => $codigo.'9']);
    expect($explicita->fresh()->Codigo_Base)->toBe($codigo.'9');
});

test('el CRUD recalcula Codigo_Base al actualizar el codigo de una asignatura', function () {
    $codigo = codigoAsignaturaLibre();
    $idCreada = crearAsignaturaDesdeCrud($this, $codigo);

    $nuevoCodigo = codigoAsignaturaLibre();

    $this->actingAs($this->usuario)
        ->putJson("/api/v1/asignaturas/{$idCreada}", [
            'Codigo_Asignatura' => $nuevoCodigo,
        ])
        ->assertStatus(200);

    $actualizada = Asignatura::find($idCreada);
    expect($actualizada->Codigo_Asignatura)->toBe($nuevoCodigo);
    expect($actualizada->Codigo_Base)->toBe($nuevoCodigo);

    $service = nuevoParserConContexto($this->carga, $this->malla);
    $resultado = acumularFilaMalla(
        $service,
        filaMalla($this->componente->ID_Componente, $this->plantilla->ID_Plantilla_Agrupacion, $nuevoCodigo),
        81
    );

    expect(ErrorCarga::where('ID_Carga', $this->carga->ID_Carga)->pluck('Mensaje_Error')->all())->toBe([]);
    expect($resultado['relaciones'][0]['ID_Asignatura'])->toBe($idCreada);
});
