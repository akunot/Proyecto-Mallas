<?php

use App\Models\LogActividad;
use App\Models\Usuario;
use App\Services\LogActividadService;

test('registrar crea un log', function () {
    $usuario = Usuario::factory()->create();

    LogActividadService::registrar(
        $usuario,
        'TEST',
        'usuario',
        $usuario->ID_Usuario,
        ['nombre' => $usuario->Nombre_Usuario]
    );

    expect(LogActividad::where('ID_Usuario', $usuario->ID_Usuario)->count())->toBe(1);
});

test('registrar múltiples veces crea múltiples logs', function () {
    $usuario = Usuario::factory()->create();

    LogActividadService::registrar($usuario, 'LOGIN', 'usuario', $usuario->ID_Usuario, []);
    LogActividadService::registrar($usuario, 'LOGOUT', 'usuario', $usuario->ID_Usuario, []);

    expect(LogActividad::where('ID_Usuario', $usuario->ID_Usuario)->count())->toBe(2);
});

test('registrar guarda la acción correcta', function () {
    $usuario = Usuario::factory()->create();

    LogActividadService::registrar(
        $usuario,
        'CREATE',
        'sede',
        1,
        ['nombre' => 'Sede Test']
    );

    $log = LogActividad::where('ID_Usuario', $usuario->ID_Usuario)->first();
    expect($log->Accion_Log)->toBe('CREATE');
    expect($log->Entidad_Log)->toBe('sede');
});
