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

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Rutas web que usan Inertia para renderizar páginas React en el cliente.
| Estas rutas proporcionan la navegación SPA del frontend.
|
*/

// Ruta raíz - redirigir a login o dashboard
Route::get('/', function () {
    return Inertia::location('/login');
})->name('home');

// Rutas de autenticación (públicas)
Route::inertia('/login', 'Auth/Login')->name('login');

// Rutas protegidas (requieren autenticación usando cookies de Sanctum)
Route::middleware(['auth:sanctum'])->group(function () {
    // Dashboard
    Route::inertia('/dashboard', 'Dashboard')->name('dashboard');
    
    // Catálogos - Sedes
    Route::inertia('/sedes', 'Catalogos/Sedes')->name('sedes');
    Route::inertia('/sedes/create', 'Catalogos/SedesForm', ['sedes' => []])->name('sedes.create');
    Route::get('/sedes/{id}/edit', [SedeController::class, 'edit']);
    
    // Catálogos - Facultades
    Route::inertia('/facultades', 'Catalogos/Facultades')->name('facultades');
    Route::inertia('/facultades/create', 'Catalogos/FacultadesForm', ['sedes' => []])->name('facultades.create');
    Route::get('/facultades/{id}/edit', [FacultadController::class, 'edit']);
    
    // Catálogos - Programas
    Route::inertia('/programas', 'Catalogos/Programas')->name('programas');
    Route::inertia('/programas/create', 'Catalogos/ProgramasForm', ['facultades' => []])->name('programas.create');
    Route::get('/programas/{id}/edit', [ProgramaController::class, 'edit']);
    
    // Catálogos - Normativas
    Route::inertia('/normativas', 'Catalogos/Normativas')->name('normativas');
    Route::inertia('/normativas/create', 'Catalogos/NormativasForm', ['programas' => []])->name('normativas.create');
    Route::get('/normativas/{id}/edit', [NormativaController::class, 'edit']);
    
    // Catálogos - Componentes
    Route::inertia('/componentes', 'Catalogos/Componentes')->name('componentes');
    Route::inertia('/componentes/create', 'Catalogos/ComponentesForm')->name('componentes.create');
    Route::get('/componentes/{id}/edit', [ComponenteController::class, 'edit']);
    
    // Catálogos - Asignaturas
    Route::inertia('/asignaturas', 'Catalogos/Asignaturas')->name('asignaturas');
    Route::inertia('/asignaturas/create', 'Catalogos/AsignaturasForm')->name('asignaturas.create');
    Route::get('/asignaturas/{id}/edit', [AsignaturaController::class, 'edit']);
    
    // Catálogos - Usuarios
    Route::inertia('/usuarios', 'Catalogos/Usuarios')->name('usuarios');
    Route::inertia('/usuarios/create', 'Catalogos/UsuariosForm')->name('usuarios.create');
    Route::get('/usuarios/{id}/edit', [UsuarioController::class, 'edit']);
    
    // Mallas y cargas (Fase 3+)
    Route::inertia('/mallas', 'Mallas/Index')->name('mallas');
    Route::inertia('/cargas', 'Cargas/Index')->name('cargas');
});
