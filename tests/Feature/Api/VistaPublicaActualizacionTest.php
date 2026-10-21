<?php

use App\Models\Agrupacion;
use App\Models\Asignatura;
use App\Models\CargaMalla;
use App\Models\Componente;
use App\Models\MallaCurricular;
use App\Models\PlantillaAgrupacion;
use App\Models\Programa;
use App\Models\Usuario;
use App\Services\MallaVisualizerService;
use Inertia\Testing\AssertableInertia as Assert;

/**
 * Crea un programa con una malla del estado indicado y una agrupación
 * que contiene una asignatura.
 *
 * @return array{programa: Programa, malla: MallaCurricular, componente: Componente, agrupacion: Agrupacion, asignatura: Asignatura}
 */
function crearMallaConAsignatura(string $estado = 'activa', ?Programa $programa = null, ?Componente $componente = null): array
{
    $programa ??= Programa::factory()->create();
    $componente ??= Componente::factory()->create();
    $malla = MallaCurricular::factory()->create([
        'ID_Programa' => $programa->ID_Programa,
        'Estado' => $estado,
        'Es_Vigente' => $estado === 'activa' ? 1 : 0,
    ]);
    $agrupacion = Agrupacion::create([
        'ID_Malla' => $malla->ID_Malla,
        'ID_Programa' => $programa->ID_Programa,
        'ID_Componente' => $componente->ID_Componente,
        'Nombre_Agrupacion' => 'Fundamentación',
        'Creditos_Requeridos' => 10,
        'Es_Obligatoria' => 1,
    ]);
    $asignatura = Asignatura::factory()->create(['Creditos_Asignatura' => 3]);
    $agrupacion->asignaturas()->attach($asignatura->ID_Asignatura, [
        'ID_Malla' => $malla->ID_Malla,
        'Tipo_Asignatura' => 'obligatoria',
        'Semestre_Sugerido' => 1,
        'Orden' => 0,
    ]);

    return compact('programa', 'malla', 'componente', 'agrupacion', 'asignatura');
}

test('la vista pública refleja el cambio de créditos de una asignatura aunque esté en caché', function () {
    ['programa' => $programa, 'asignatura' => $asignatura] = crearMallaConAsignatura();
    $service = app(MallaVisualizerService::class);

    $antes = $service->forPrograma($programa->ID_Programa);
    expect($antes['agrupaciones'][0]['asignaturas'][0]['Creditos_Asignatura'])->toBe(3);

    $asignatura->update(['Creditos_Asignatura' => 5]);

    $despues = $service->forPrograma($programa->ID_Programa);
    expect($despues['agrupaciones'][0]['asignaturas'][0]['Creditos_Asignatura'])->toBe(5);
});

test('editar créditos de una plantilla actualiza la malla activa pero no las archivadas', function () {
    $usuario = Usuario::factory()->create();
    ['programa' => $programa, 'componente' => $componente, 'agrupacion' => $activa] = crearMallaConAsignatura('activa');
    ['agrupacion' => $archivada] = crearMallaConAsignatura('archivada', $programa, $componente);

    $plantilla = PlantillaAgrupacion::factory()->create([
        'ID_Programa' => $programa->ID_Programa,
        'ID_Componente' => $componente->ID_Componente,
        'Nombre_Agrupacion' => 'Fundamentación',
        'Creditos_Requeridos' => 10,
        'Es_Obligatoria' => true,
    ]);

    $service = app(MallaVisualizerService::class);
    expect($service->forPrograma($programa->ID_Programa)['agrupaciones'][0]['Creditos_Requeridos'])->toBe(10);

    $this->actingAs($usuario)
        ->putJson("/api/v1/agrupaciones/{$plantilla->ID_Plantilla_Agrupacion}", [
            'Creditos_Requeridos' => 14,
        ])
        ->assertOk();

    expect($activa->fresh()->Creditos_Requeridos)->toBe(14)
        ->and($archivada->fresh()->Creditos_Requeridos)->toBe(10)
        ->and($service->forPrograma($programa->ID_Programa)['agrupaciones'][0]['Creditos_Requeridos'])->toBe(14);
});

test('editar solo el nombre de una plantilla no sobrescribe los créditos de la malla', function () {
    $usuario = Usuario::factory()->create();
    ['programa' => $programa, 'componente' => $componente, 'agrupacion' => $activa] = crearMallaConAsignatura('activa');

    // La plantilla no coincide con los créditos cargados desde el Excel
    $plantilla = PlantillaAgrupacion::factory()->create([
        'ID_Programa' => $programa->ID_Programa,
        'ID_Componente' => $componente->ID_Componente,
        'Nombre_Agrupacion' => 'Fundamentación',
        'Creditos_Requeridos' => null,
        'Es_Obligatoria' => false,
    ]);

    $this->actingAs($usuario)
        ->putJson("/api/v1/agrupaciones/{$plantilla->ID_Plantilla_Agrupacion}", [
            'Nombre_Agrupacion' => 'Fundamentación básica',
        ])
        ->assertOk();

    $activa->refresh();
    expect($activa->Nombre_Agrupacion)->toBe('Fundamentación básica')
        ->and($activa->Creditos_Requeridos)->toBe(10);
});

test('el dashboard muestra la actividad reciente de todos los usuarios', function () {
    $yo = Usuario::factory()->create();
    $otro = Usuario::factory()->create();
    $programa = Programa::factory()->create();

    $mia = CargaMalla::factory()->create(['ID_Usuario' => $yo->ID_Usuario, 'ID_Programa' => $programa->ID_Programa]);
    $ajena = CargaMalla::factory()->create(['ID_Usuario' => $otro->ID_Usuario, 'ID_Programa' => $programa->ID_Programa]);

    $this->withoutVite()
        ->actingAs($yo)
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->where('cargasRecientes', fn ($cargas) => collect($cargas)->pluck('ID_Carga')
                ->intersect([$mia->ID_Carga, $ajena->ID_Carga])
                ->count() === 2)
        );
});
