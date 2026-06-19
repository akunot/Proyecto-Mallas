<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\SedeController;
use App\Http\Controllers\Api\FacultadController;
use App\Http\Controllers\Api\ProgramaController;
use App\Http\Controllers\Api\NormativaController;
use App\Http\Controllers\Api\ComponenteController;
use App\Http\Controllers\Api\AgrupacionController;
use App\Http\Controllers\Api\AsignaturaController;
use App\Http\Controllers\Api\UsuarioController;
use App\Http\Controllers\Api\CargaController;
use App\Http\Controllers\Api\AuditoriaController;
use App\Http\Controllers\Api\AprobacionController;
use App\Http\Controllers\Api\MallaController;
use Illuminate\Support\Facades\Route;

/*

|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Aquí están las rutas de la API REST del sistema de Mallas Académicas.
| Todas las rutas están bajo el prefijo /api
|
| RUTAS PÚBLICAS (sin autenticación):
|   - /api/v1/auth/request-otp
|   - /api/v1/auth/verify-otp
|   - /api/v1/public/mallas (vista pública de mallas)
|
| RUTAS PROTEGIDAS (requieren auth:sanctum):
|   - /api/v1/auth/logout
|   - /api/v1/me
|   - Todas las demás rutas de catálogos
|   - Carga de mallas
|   - Flujo de aprobación
|
*/

/*
|--------------------------------------------------------------------------
| RUTAS PÚBLICAS
|--------------------------------------------------------------------------
*/
// Rutas de autenticación (públicas)
Route::prefix('v1/auth')->group(function () {
    Route::post('/request-otp', [AuthController::class, 'requestOtp']);
    Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);
});

// Rutas públicas para visualizar mallas (sin login)
// IMPORTANTE: Esta es la vista pública que anyone puede ver en mallas.manizales.unal.edu.co
Route::prefix('v1/public')->group(function () {
    // Ver todas las sedes (público)
    Route::get('/sedes', [SedeController::class, 'index']);
    
    // Ver todas las facultades (público)
    Route::get('/facultades', [FacultadController::class, 'index']);
    
    // Ver programas por facultad (público)
    Route::get('/facultades/{id}/programas', [ProgramaController::class, 'index']);

    // Ver malla de un programa con la misma estructura que usa el Visualizador (público)
    Route::get('/programas/{id}/malla-visualizador', [MallaController::class, 'publicVisualizer']);

    // Catálogo público de electivas/libre elección (sin autenticación)
    Route::get('/electivas', [AsignaturaController::class, 'catalogo']);

    // Optativas públicas de una malla (sin autenticación)
    Route::get('/mallas/{mallaId}/optativas', [MallaController::class, 'optativas']);

    // Test endpoint - probar si la API responde
    Route::get('/test', function() {
        return response()->json(['message' => 'API funcionando', 'status' => 'ok']);
    });
    
    // Ver mallas vigentes de todos los programas (público)
    // Route::get('/mallas', [MallaController::class, 'publicIndex']);
    
    // Ver malla vigente de un programa específico (público)
    // Route::get('/programas/{id}/malla', [MallaController::class, 'publicShow']);
    
    // Ver historial de versiones de un programa (público)
    // Route::get('/programas/{id}/historial', [MallaController::class, 'publicHistory']);
});

/*
|--------------------------------------------------------------------------
| RUTAS PROTEGIDAS (requieren autenticación)
|--------------------------------------------------------------------------
*/
Route::middleware('auth.token')->prefix('v1')->group(function () {
    // Cierre de sesión
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    
    // Información del usuario autenticado
    Route::get('/me', [AuthController::class, 'me']);
    
    // Rutas de catálogos (solo usuarios registrados)
    // Sedes
        Route::get('/sedes', [SedeController::class, 'index']);
        Route::post('/sedes', [SedeController::class, 'store']);
        Route::get('/sedes/{id}', [SedeController::class, 'show']);
        Route::put('/sedes/{id}', [SedeController::class, 'update']);
        Route::patch('/sedes/{id}/toggle', [SedeController::class, 'toggle']);

        // Facultades
        Route::get('/facultades', [FacultadController::class, 'index']);
        Route::post('/facultades', [FacultadController::class, 'store']);
        Route::get('/facultades/{id}', [FacultadController::class, 'show']);
        Route::put('/facultades/{id}', [FacultadController::class, 'update']);
        Route::patch('/facultades/{id}/toggle', [FacultadController::class, 'toggle']);

        // Programas
        Route::get('/programas', [ProgramaController::class, 'index']);
        Route::post('/programas', [ProgramaController::class, 'store']);
        Route::get('/programas/{id}', [ProgramaController::class, 'show']);
        Route::put('/programas/{id}', [ProgramaController::class, 'update']);
        Route::patch('/programas/{id}/toggle', [ProgramaController::class, 'toggle']);
        Route::get('/programas/{id}/electivas', [ProgramaController::class, 'electivas']);

        // Normativas
        Route::get('/normativas', [NormativaController::class, 'index']);
        Route::post('/normativas', [NormativaController::class, 'store']);
        Route::get('/normativas/{id}', [NormativaController::class, 'show']);
        Route::put('/normativas/{id}', [NormativaController::class, 'update']);
        Route::patch('/normativas/{id}/toggle', [NormativaController::class, 'toggle']);

        // Componentes
        Route::get('/componentes', [ComponenteController::class, 'index']);
        Route::post('/componentes', [ComponenteController::class, 'store']);
        Route::get('/componentes/{id}', [ComponenteController::class, 'show']);
        Route::put('/componentes/{id}', [ComponenteController::class, 'update']);
        Route::patch('/componentes/{id}/toggle', [ComponenteController::class, 'toggle']);

        // Agrupaciones
        Route::get('/agrupaciones', [AgrupacionController::class, 'index']);
        Route::post('/agrupaciones', [AgrupacionController::class, 'store']);
        Route::get('/agrupaciones/{id}', [AgrupacionController::class, 'show']);
        Route::put('/agrupaciones/{id}', [AgrupacionController::class, 'update']);
        Route::delete('/agrupaciones/{id}', [AgrupacionController::class, 'destroy']);

        // Asignaturas
        Route::get('/electivas', [AsignaturaController::class, 'catalogo']);
        Route::get('/asignaturas', [AsignaturaController::class, 'index']);
        Route::post('/asignaturas', [AsignaturaController::class, 'store']);
        Route::get('/asignaturas/{id}', [AsignaturaController::class, 'show']);
        Route::put('/asignaturas/{id}', [AsignaturaController::class, 'update']);
        Route::patch('/asignaturas/{id}/toggle', [AsignaturaController::class, 'toggle']);

        // Usuarios (solo admins)
        Route::get('/usuarios', [UsuarioController::class, 'index']);
        Route::post('/usuarios', [UsuarioController::class, 'store']);
        Route::get('/usuarios/{id}', [UsuarioController::class, 'show']);
        Route::put('/usuarios/{id}', [UsuarioController::class, 'update']);
        Route::patch('/usuarios/{id}/toggle', [UsuarioController::class, 'toggle']);
        
        // Mallas - reordenación de bloques en el visualizador
        Route::patch('/mallas/{mallaId}/reordenar', [MallaController::class, 'reordenar']);
        Route::get('/mallas/{mallaId}/optativas', [MallaController::class, 'optativas']);

        // Mallas y cargas (Fase 3+)
        Route::get('/cargas', [CargaController::class, 'index']);
        Route::post('/cargas', [CargaController::class, 'store']);
        Route::get('/cargas/{id}', [CargaController::class, 'show']);
        Route::post('/cargas/{id}/archivo', [CargaController::class, 'uploadArchivo']);
        Route::post('/cargas/{id}/procesar', [CargaController::class, 'procesar']);
        Route::get('/cargas/{id}/estado', [CargaController::class, 'estado']);
        Route::get('/cargas/{id}/errores', [CargaController::class, 'errores']);
        Route::get('/cargas/{id}/diff', [CargaController::class, 'diff']);
        
        // Flujo de aprobación de mallas (simplificado)
        Route::get('/aprobacion/mis-cargas', [AprobacionController::class, 'misCargas']);
        Route::get('/aprobacion/pendientes', [AprobacionController::class, 'pendientes']);
        Route::get('/aprobacion/cargas/{id}/detalle-malla', [AprobacionController::class, 'detalleMalla']);
        Route::post('/aprobacion/cargas/{id}/enviar-revision', [AprobacionController::class, 'enviarRevision']);
        Route::patch('/aprobacion/cargas/{id}/revisar', [AprobacionController::class, 'revisar']);
        
        // Auditoría y logs
        Route::get('/auditoria/logs', [AuditoriaController::class, 'index']);
        Route::get('/auditoria/diffs/{id}', [AuditoriaController::class, 'diffs']);
        Route::get('/auditoria/resumen-cambios/{id}', [AuditoriaController::class, 'resumenCambios']);
        Route::get('/auditoria/acciones-disponibles', [AuditoriaController::class, 'accionesDisponibles']);
        Route::get('/auditoria/entidades-disponibles', [AuditoriaController::class, 'entidadesDisponibles']);
        Route::get('/auditoria/estadisticas', [AuditoriaController::class, 'estadisticas']);
        Route::get('/auditoria/timeline', [AuditoriaController::class, 'timelineEntidad']);
        Route::get('/auditoria/exportar-logs', [AuditoriaController::class, 'exportarLogs']);
        
        // Test endpoint autenticado
        Route::get('/test-auth', function(Illuminate\Http\Request $request) {
            return response()->json([
                'message' => 'Autenticado correctamente',
                'user' => $request->user(),
            ]);
        });
});