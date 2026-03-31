<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\Api\SedeController;
use App\Http\Controllers\Api\FacultadController;
use App\Http\Controllers\Api\ProgramaController;
use App\Http\Controllers\Api\NormativaController;
use App\Http\Controllers\Api\ComponenteController;
use App\Http\Controllers\Api\AsignaturaController;
use App\Http\Controllers\Api\UsuarioController;
use App\Http\Controllers\Api\AuthController;
use App\Models\Sede;
use App\Models\Facultad;
use App\Models\Programa;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Rutas web que usan Inertia para renderizar páginas React en el cliente.
| Estas rutas proporcionan la navegación SPA del frontend.
|
*/

// Ruta raíz - redirigir a login
Route::get('/', function () {
    return Inertia::location('/login');
})->name('home');

// Rutas de autenticación (públicas) - usan sesión para mantener estado
Route::inertia('/login', 'Auth/Login')->name('login');

// Rutas de autenticación API vía web (para mantener sesión)
Route::post('/auth/request-otp', [AuthController::class, 'requestOtp']);
Route::post('/auth/verify-otp', [AuthController::class, 'verifyOtp']);

// Rutas protegidas (requieren autenticación usando sesión web)
Route::middleware(['auth'])->group(function () {
    // Cerrar sesión
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    
    // Dashboard
    Route::inertia('/dashboard', 'Dashboard')->name('dashboard');
    
    // Catálogos - Sedes
    Route::get('/sedes', function () {
        $sedes = Sede::paginate(20);
        return Inertia::render('Catalogos/Sedes', [
            'sedes' => [
                'data' => $sedes->items(),
                'meta' => [
                    'current_page' => $sedes->currentPage(),
                    'total' => $sedes->total(),
                    'per_page' => $sedes->perPage(),
                    'last_page' => $sedes->lastPage(),
                ],
            ],
        ]);
    })->name('sedes');
    Route::inertia('/sedes/create', 'Catalogos/SedesForm', ['sedes' => []])->name('sedes.create');
    Route::get('/sedes/{id}/edit', [SedeController::class, 'edit']);
    Route::patch('/sedes/{id}/toggle', [SedeController::class, 'toggle']);
    
    // Catálogos - Facultades
    Route::get('/facultades', function () {
        $facultades = Facultad::with('sede')->paginate(20);
        return Inertia::render('Catalogos/Facultades', [
            'facultades' => [
                'data' => $facultades->items(),
                'meta' => [
                    'current_page' => $facultades->currentPage(),
                    'total' => $facultades->total(),
                    'per_page' => $facultades->perPage(),
                    'last_page' => $facultades->lastPage(),
                ],
            ],
        ]);
    })->name('facultades');
    Route::inertia('/facultades/create', 'Catalogos/FacultadesForm', ['sedes' => []])->name('facultades.create');
    Route::get('/facultades/{id}/edit', [FacultadController::class, 'edit']);
    Route::patch('/facultades/{id}/toggle', [FacultadController::class, 'toggle']);
    
    // Catálogos - Programas
    Route::get('/programas', function () {
        $programas = Programa::with(['facultad', 'facultad.sede'])->paginate(20);
        return Inertia::render('Catalogos/Programas', [
            'programas' => [
                'data' => $programas->items(),
                'meta' => [
                    'current_page' => $programas->currentPage(),
                    'total' => $programas->total(),
                    'per_page' => $programas->perPage(),
                    'last_page' => $programas->lastPage(),
                ],
            ],
        ]);
    })->name('programas');
    Route::inertia('/programas/create', 'Catalogos/ProgramasForm', ['facultades' => []])->name('programas.create');
    Route::get('/programas/{id}/edit', [ProgramaController::class, 'edit']);
    Route::patch('/programas/{id}/toggle', [ProgramaController::class, 'toggle']);
    
    // Catálogos - Normativas
    Route::get('/normativas', function () {
        $normativas = \App\Models\Normativa::with('programa')->paginate(20);
        return Inertia::render('Catalogos/Normativas', [
            'normativas' => [
                'data' => $normativas->items(),
                'meta' => [
                    'current_page' => $normativas->currentPage(),
                    'total' => $normativas->total(),
                    'per_page' => $normativas->perPage(),
                    'last_page' => $normativas->lastPage(),
                ],
            ],
        ]);
    })->name('normativas');
    Route::inertia('/normativas/create', 'Catalogos/NormativasForm', ['programas' => []])->name('normativas.create');
    Route::get('/normativas/{id}/edit', [NormativaController::class, 'edit']);
    Route::patch('/normativas/{id}/toggle', [NormativaController::class, 'toggle']);
    
    // Catálogos - Componentes
    Route::get('/componentes', function () {
        $componentes = \App\Models\Componente::paginate(20);
        return Inertia::render('Catalogos/Componentes', [
            'componentes' => [
                'data' => $componentes->items(),
                'meta' => [
                    'current_page' => $componentes->currentPage(),
                    'total' => $componentes->total(),
                    'per_page' => $componentes->perPage(),
                    'last_page' => $componentes->lastPage(),
                ],
            ],
        ]);
    })->name('componentes');
    Route::inertia('/componentes/create', 'Catalogos/ComponentesForm')->name('componentes.create');
    Route::get('/componentes/{id}/edit', [ComponenteController::class, 'edit']);
    Route::patch('/componentes/{id}/toggle', [ComponenteController::class, 'toggle']);
    
    // Catálogos - Asignaturas
    Route::get('/asignaturas', function () {
        $asignaturas = \App\Models\Asignatura::paginate(20);
        return Inertia::render('Catalogos/Asignaturas', [
            'asignaturas' => [
                'data' => $asignaturas->items(),
                'meta' => [
                    'current_page' => $asignaturas->currentPage(),
                    'total' => $asignaturas->total(),
                    'per_page' => $asignaturas->perPage(),
                    'last_page' => $asignaturas->lastPage(),
                ],
            ],
        ]);
    })->name('asignaturas');
    Route::inertia('/asignaturas/create', 'Catalogos/AsignaturasForm')->name('asignaturas.create');
    Route::get('/asignaturas/{id}/edit', [AsignaturaController::class, 'edit']);
    Route::patch('/asignaturas/{id}/toggle', [AsignaturaController::class, 'toggle']);
    
    // Catálogos - Usuarios
    Route::get('/usuarios', function () {
        $usuarios = \App\Models\Usuario::paginate(20);
        return Inertia::render('Catalogos/Usuarios', [
            'usuarios' => [
                'data' => $usuarios->items(),
                'meta' => [
                    'current_page' => $usuarios->currentPage(),
                    'total' => $usuarios->total(),
                    'per_page' => $usuarios->perPage(),
                    'last_page' => $usuarios->lastPage(),
                ],
            ],
        ]);
    })->name('usuarios');
    Route::inertia('/usuarios/create', 'Catalogos/UsuariosForm')->name('usuarios.create');
    Route::get('/usuarios/{id}/edit', [UsuarioController::class, 'edit']);
    Route::patch('/usuarios/{id}/toggle', [UsuarioController::class, 'toggle']);
    
    // Mallas y cargas (Fase 3+) - Comentado: rutas huérfanas sin páginas implementadas
    // Route::inertia('/mallas', 'Mallas/Index')->name('mallas');
    // Route::inertia('/cargas', 'Cargas/Index')->name('cargas');
});
