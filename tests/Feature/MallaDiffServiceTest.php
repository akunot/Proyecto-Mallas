<?php

use App\Models\Agrupacion;
use App\Models\AgrupacionAsignatura;
use App\Models\Asignatura;
use App\Models\CargaMalla;
use App\Models\Componente;
use App\Models\DiffMalla;
use App\Models\MallaCurricular;
use App\Models\Normativa;
use App\Models\Programa;
use App\Services\MallaDiffService;

beforeEach(function () {
    $this->service = app(MallaDiffService::class);

    $programa = Programa::factory()->create();
    $normativa = Normativa::factory()->create(['Codigo_Programa' => $programa->Codigo_Programa]);

    $this->mallaBase = MallaCurricular::factory()->create([
        'ID_Normativa' => $normativa->ID_Normativa,
        'ID_Programa' => $programa->ID_Programa,
    ]);

    $this->mallaNueva = MallaCurricular::factory()->create([
        'ID_Normativa' => $normativa->ID_Normativa,
        'ID_Programa' => $programa->ID_Programa,
        'Version_Numero' => 2,
        'Es_Vigente' => null,
    ]);

    $this->carga = CargaMalla::factory()->create([
        'ID_Malla' => $this->mallaNueva->ID_Malla,
        'ID_Programa' => $programa->ID_Programa,
        'ID_Normativa' => $normativa->ID_Normativa,
        'Estado_Carga' => 'listo_para_procesar',
    ]);

    $this->componente = Componente::factory()->create();
    $this->asignatura = Asignatura::factory()->create();
});

test('genera diffs INSERT para primera version', function () {
    $this->service->generarDiffs($this->mallaNueva, null, $this->carga);

    $diffs = DiffMalla::where('ID_Carga', $this->carga->ID_Carga)->get();
    expect($diffs)->toBeEmpty('Sin asignaturas, no debería haber diffs');
});

test('genera diffs INSERT cuando se agregan asignaturas', function () {
    $agrupacion = Agrupacion::create([
        'ID_Malla' => $this->mallaNueva->ID_Malla,
        'ID_Programa' => $this->mallaNueva->ID_Programa,
        'ID_Componente' => $this->componente->ID_Componente,
        'Nombre_Agrupacion' => 'Area 1',
    ]);

    $agrupAsig = AgrupacionAsignatura::create([
        'ID_Agrupacion' => $agrupacion->ID_Agrupacion,
        'ID_Asignatura' => $this->asignatura->ID_Asignatura,
        'ID_Malla' => $this->mallaNueva->ID_Malla,
        'Tipo_Asignatura' => 'obligatoria',
        'Semestre_Sugerido' => 1,
    ]);

    $this->service->generarDiffs($this->mallaNueva, null, $this->carga);

    $diffs = DiffMalla::where('ID_Carga', $this->carga->ID_Carga)->get();
    expect($diffs)->toHaveCount(1);

    $diff = $diffs->first();
    expect($diff->Entidad_Afectada)->toBe('agrupacion_asignatura');
    expect($diff->Tipo_Cambio)->toBe('INSERT');
    expect($diff->ID_Registro)->toBe($agrupAsig->ID_Agrup_Asig);
});

test('detecta DELETE cuando se elimina asignatura', function () {
    $agrupacionBase = Agrupacion::create([
        'ID_Malla' => $this->mallaBase->ID_Malla,
        'ID_Programa' => $this->mallaBase->ID_Programa,
        'ID_Componente' => $this->componente->ID_Componente,
        'Nombre_Agrupacion' => 'Area 1',
    ]);

    AgrupacionAsignatura::create([
        'ID_Agrupacion' => $agrupacionBase->ID_Agrupacion,
        'ID_Asignatura' => $this->asignatura->ID_Asignatura,
        'ID_Malla' => $this->mallaBase->ID_Malla,
        'Tipo_Asignatura' => 'obligatoria',
        'Semestre_Sugerido' => 1,
    ]);

    $this->service->generarDiffs($this->mallaNueva, $this->mallaBase, $this->carga);

    $diffs = DiffMalla::where('ID_Carga', $this->carga->ID_Carga)->get();
    expect($diffs)->toHaveCount(1);

    $diff = $diffs->first();
    expect($diff->Tipo_Cambio)->toBe('DELETE');
});

test('detecta UPDATE cuando cambia tipo de asignatura', function () {
    $agrupacionBase = Agrupacion::create([
        'ID_Malla' => $this->mallaBase->ID_Malla,
        'ID_Programa' => $this->mallaBase->ID_Programa,
        'ID_Componente' => $this->componente->ID_Componente,
        'Nombre_Agrupacion' => 'Area 1',
    ]);

    $agrupacionNueva = Agrupacion::create([
        'ID_Malla' => $this->mallaNueva->ID_Malla,
        'ID_Programa' => $this->mallaNueva->ID_Programa,
        'ID_Componente' => $this->componente->ID_Componente,
        'Nombre_Agrupacion' => $agrupacionBase->Nombre_Agrupacion,
    ]);

    AgrupacionAsignatura::create([
        'ID_Agrupacion' => $agrupacionBase->ID_Agrupacion,
        'ID_Asignatura' => $this->asignatura->ID_Asignatura,
        'ID_Malla' => $this->mallaBase->ID_Malla,
        'Tipo_Asignatura' => 'obligatoria',
    ]);

    AgrupacionAsignatura::create([
        'ID_Agrupacion' => $agrupacionNueva->ID_Agrupacion,
        'ID_Asignatura' => $this->asignatura->ID_Asignatura,
        'ID_Malla' => $this->mallaNueva->ID_Malla,
        'Tipo_Asignatura' => 'optativa',
    ]);

    $this->service->generarDiffs($this->mallaNueva, $this->mallaBase, $this->carga);

    $diffs = DiffMalla::where('ID_Carga', $this->carga->ID_Carga)->get();
    expect($diffs->where('Tipo_Cambio', 'UPDATE'))->toHaveCount(1);

    $updateDiff = $diffs->where('Tipo_Cambio', 'UPDATE')->first();
    expect($updateDiff->Valor_Anterior['Tipo_Asignatura'])->toBe('obligatoria');
    expect($updateDiff->Valor_Nuevo['Tipo_Asignatura'])->toBe('optativa');
});

test('sin cambios entre mallas identicas no genera diffs', function () {
    $this->service->generarDiffs($this->mallaBase, $this->mallaBase, $this->carga);

    $diffs = DiffMalla::where('ID_Carga', $this->carga->ID_Carga)->get();
    expect($diffs)->toBeEmpty();
});

test('obtenerDiffsAgrupados agrupa por entidad', function () {
    $agrupacion = Agrupacion::create([
        'ID_Malla' => $this->mallaNueva->ID_Malla,
        'ID_Programa' => $this->mallaNueva->ID_Programa,
        'ID_Componente' => $this->componente->ID_Componente,
        'Nombre_Agrupacion' => 'Area 1',
    ]);

    AgrupacionAsignatura::create([
        'ID_Agrupacion' => $agrupacion->ID_Agrupacion,
        'ID_Asignatura' => $this->asignatura->ID_Asignatura,
        'ID_Malla' => $this->mallaNueva->ID_Malla,
        'Tipo_Asignatura' => 'obligatoria',
    ]);

    $this->service->generarDiffs($this->mallaNueva, null, $this->carga);

    $agrupados = $this->service->obtenerDiffsAgrupados($this->carga);
    expect($agrupados)->toHaveKey('agrupacion_asignatura');
    expect($agrupados['agrupacion_asignatura'])->toHaveKey('INSERT');
    expect($agrupados['agrupacion_asignatura']['INSERT'])->toHaveCount(1);
});
