<?php

use App\Models\Agrupacion;
use App\Models\AgrupacionAsignatura;
use App\Models\Asignatura;
use App\Models\CargaMalla;
use App\Models\Componente;
use App\Models\MallaCurricular;
use App\Models\Normativa;
use App\Models\Programa;
use App\Models\Requisito;
use App\Models\Usuario;
use App\Services\ExcelParserService;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    $this->programa = Programa::factory()->create();
    $this->normativa = Normativa::factory()->create([
        'Codigo_Programa' => $this->programa->Codigo_Programa,
    ]);
    $this->usuario = Usuario::factory()->create();

    $this->malla1 = MallaCurricular::factory()->create([
        'ID_Normativa' => $this->normativa->ID_Normativa,
        'ID_Programa' => $this->programa->ID_Programa,
        'Version_Numero' => 1,
        'Estado' => 'archivada',
        'Es_Vigente' => null,
    ]);

    $this->malla2 = MallaCurricular::factory()->create([
        'ID_Normativa' => $this->normativa->ID_Normativa,
        'ID_Programa' => $this->programa->ID_Programa,
        'Version_Numero' => 2,
        'Estado' => 'activa',
        'Es_Vigente' => 1,
    ]);

    // Asignatura que EXISTE EN AMBAS versiones: el problema que publicDiff() no detecta.
    $this->asignatura = Asignatura::factory()->create([
        'Codigo_Base' => 'ABC100',
        'Codigo_Asignatura' => 'ABC100',
        'Nombre_Asignatura' => 'Calculo I',
    ]);

    $componente = Componente::factory()->create();

    foreach ([$this->malla1, $this->malla2] as $malla) {
        $agrupacion = Agrupacion::create([
            'ID_Malla' => $malla->ID_Malla,
            'ID_Programa' => $this->programa->ID_Programa,
            'ID_Componente' => $componente->ID_Componente,
            'Nombre_Agrupacion' => 'Basica',
            'Creditos_Requeridos' => 10,
            'Es_Obligatoria' => true,
        ]);

        AgrupacionAsignatura::create([
            'ID_Agrupacion' => $agrupacion->ID_Agrupacion,
            'ID_Asignatura' => $this->asignatura->ID_Asignatura,
            'ID_Malla' => $malla->ID_Malla,
            'Tipo_Asignatura' => 'obligatoria',
            'Semestre_Sugerido' => 1,
            'Orden' => 1,
        ]);
    }

    $this->reqViejo = Asignatura::factory()->create([
        'Nombre_Asignatura' => 'Geometria',
    ]);
    $this->reqNuevo = Asignatura::factory()->create([
        'Nombre_Asignatura' => 'Algebra',
    ]);

    // Estado inicial: la versión histórica tenía el prerrequisito "Geometria".
    Requisito::create([
        'ID_Asignatura' => $this->asignatura->ID_Asignatura,
        'ID_Programa' => $this->programa->ID_Programa,
        'ID_Asignatura_Requerida' => $this->reqViejo->ID_Asignatura,
        'Tipo_Requisito' => 'prerrequisito',
    ]);

    $this->carga = CargaMalla::factory()->create([
        'ID_Usuario' => $this->usuario->ID_Usuario,
        'ID_Malla' => $this->malla2->ID_Malla,
        'ID_Programa' => $this->programa->ID_Programa,
        'ID_Normativa' => $this->normativa->ID_Normativa,
        'tipo_carga' => 'malla',
        'Estado_Carga' => 'borrador',
    ]);
});
test('historial de requisitos expone cambios de prerequisito que publicDiff no detecta', function () {
    // Reprocesamiento de la versión 2: el prerrequisito de "Calculo I"
    // cambió de "Geometria" a "Algebra".
    $batchRequisitos = [[
        'ID_Asignatura' => $this->asignatura->ID_Asignatura,
        'ID_Programa' => $this->programa->ID_Programa,
        'ID_Asignatura_Requerida' => $this->reqNuevo->ID_Asignatura,
        'Tipo_Requisito' => 'prerrequisito',
        'Valor_Creditos' => null,
        'Descripcion_Requisito' => null,
        'created_at' => now(),
        'updated_at' => now(),
    ]];

    // Invocar la MISMA secuencia que ejecuta parseMalla(): detectar INSERT/UPDATE,
    // limpiar obsoletos y upsert.
    $service = new ExcelParserService;
    $reflection = new ReflectionClass($service);

    $cargaProp = $reflection->getProperty('carga');
    $cargaProp->setAccessible(true);
    $cargaProp->setValue($service, $this->carga);

    $detectar = $reflection->getMethod('detectarCambiosRequisitos');
    $detectar->setAccessible(true);
    $detectar->invoke($service, $batchRequisitos, $this->programa->ID_Programa);

    $cleanup = $reflection->getMethod('cleanupObsoleteRequisitos');
    $cleanup->setAccessible(true);
    $cleanup->invoke($service, $batchRequisitos, $this->programa->ID_Programa);

    DB::table('requisitos')->upsert(
        $batchRequisitos,
        ['ID_Asignatura', 'ID_Programa', 'ID_Asignatura_Requerida'],
        ['Tipo_Requisito', 'Valor_Creditos', 'Descripcion_Requisito', 'updated_at']
    );

    // 1) publicDiff() NO detecta el cambio porque la asignatura persiste en ambas mallas.
    $diff = $this->getJson("/api/v1/public/mallas/{$this->malla1->ID_Malla}/diff/{$this->malla2->ID_Malla}");
    $diff->assertStatus(200);
    expect($diff->json('data.resumen.requisitos_agregados'))->toBe(0);
    expect($diff->json('data.resumen.requisitos_eliminados'))->toBe(0);

    // 2) El nuevo endpoint SÍ lo expone, en formato legible.
    $response = $this->getJson("/api/v1/public/programas/{$this->programa->ID_Programa}/historial-requisitos");

    $response->assertStatus(200);

    $data = $response->json('data');
    expect($data)->toHaveCount(2); // DELETE de "Geometria" + INSERT de "Algebra"

    $acciones = collect($data)->pluck('tipo_cambio')->sort()->values()->all();
    expect($acciones)->toContain('INSERT_REQUISITO');
    expect($acciones)->toContain('DELETE_REQUISITO_OBSOLETO');

    $insert = collect($data)->firstWhere('tipo_cambio', 'INSERT_REQUISITO');
    expect($insert['asignatura_afectada']['ID_Asignatura'])->toBe($this->asignatura->ID_Asignatura);
    expect($insert['asignatura_afectada']['Nombre_Asignatura'])->toBe('Calculo I');
    expect($insert['resumen'])->toContain('Algebra');
    expect($insert['normativa'])->not->toBeNull();
    expect($insert['normativa']['Tipo_Normativa'])->toBe($this->normativa->Tipo_Normativa);
    expect($insert['normativa']['Numero_Normativa'])->toBe($this->normativa->Numero_Normativa);

    $delete = collect($data)->firstWhere('tipo_cambio', 'DELETE_REQUISITO_OBSOLETO');
    expect($delete['resumen'])->toContain('Geometria');
    expect($delete['asignatura_afectada']['ID_Asignatura'])->toBe($this->asignatura->ID_Asignatura);

    // 3) No se exponen campos internos ni el JSON crudo.
    $response->assertDontSee('ID_Usuario', false);
    $response->assertDontSee('IP_Origen_Log', false);
    $response->assertDontSee('Detalle_Log', false);
    $response->assertDontSee('"ID_Log"', false);
});

test('historial de requisitos retorna 404 para programa inexistente', function () {
    $this->getJson('/api/v1/public/programas/99999/historial-requisitos')
        ->assertStatus(404);
});
