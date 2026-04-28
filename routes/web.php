<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
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
    Route::get('/dashboard', function () {
        $sedesCount = Sede::count();
        $facultadesCount = Facultad::count();
        $programasCount = Programa::count();
        
        return Inertia::render('Dashboard', [
            'sedesCount' => $sedesCount,
            'facultadesCount' => $facultadesCount,
            'programasCount' => $programasCount,
        ]);
    })->name('dashboard');
    
    // Catálogos - Sedes
    Route::get('/sedes', function (Illuminate\Http\Request $request) {
        $query = Sede::query();

        // Búsqueda por nombre o ciudad
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('Nombre_Sede', 'like', '%' . $search . '%')
                  ->orWhere('Ciudad_Sede', 'like', '%' . $search . '%');
            });
        }

        // Ordenamiento
        $sortField = $request->sort_by ?? 'ID_Sede';
        $sortOrder = $request->sort_order ?? 'asc';
        $query->orderBy($sortField, $sortOrder);

        $sedes = $query->paginate(20)->withQueryString();

        return Inertia::render('Catalogos/Sedes', [
            'sedes' => [
                'data' => $sedes->items(),
                'meta' => [
                    'current_page' => $sedes->currentPage(),
                    'total' => $sedes->total(),
                    'per_page' => $sedes->perPage(),
                    'last_page' => $sedes->lastPage(),
                    'sort_by' => $sortField,
                    'sort_order' => $sortOrder,
                ],
            ],
        ]);
    })->name('sedes');
    Route::get('/sedes/create', function () {
        return Inertia::render('Catalogos/SedesForm');
    })->name('sedes.create');
    Route::get('/sedes/{id}/edit', [SedeController::class, 'edit']);
    Route::patch('/sedes/{id}/toggle', [SedeController::class, 'toggle']);
    Route::delete('/sedes/{id}', [SedeController::class, 'destroy']);
    
    // Catálogos - Facultades
    Route::get('/facultades', function (Illuminate\Http\Request $request) {
        $query = Facultad::with('sede');

        // Búsqueda por nombre de facultad
        if ($request->filled('search')) {
            $query->where('Nombre_Facultad', 'like', '%' . $request->search . '%');
        }

        // Ordenamiento
        $sortField = $request->sort_by ?? 'ID_Facultad';
        $sortOrder = $request->sort_order ?? 'asc';
        $query->orderBy($sortField, $sortOrder);

        $facultades = $query->paginate(20)->withQueryString();

        $facultadesData = collect($facultades->items())->map(function ($facultad) {
            return [
                'ID_Facultad' => $facultad->ID_Facultad,
                'ID_Sede' => $facultad->ID_Sede,
                'Codigo_Facultad' => $facultad->Codigo_Facultad,
                'Nombre_Facultad' => $facultad->Nombre_Facultad,
                'Conmutador_Facultad' => $facultad->Conmutador_Facultad,
                'Extension_Facultad' => $facultad->Extension_Facultad,
                'Campus_Facultad' => $facultad->Campus_Facultad,
                'Url_Facultad' => $facultad->Url_Facultad,
                'Nombre_Sede' => $facultad->sede ? $facultad->sede->Nombre_Sede : null,
            ];
        });

        return Inertia::render('Catalogos/Facultades', [
            'facultades' => [
                'data' => $facultadesData,
                'meta' => [
                    'current_page' => $facultades->currentPage(),
                    'total' => $facultades->total(),
                    'per_page' => $facultades->perPage(),
                    'last_page' => $facultades->lastPage(),
                    'sort_by' => $sortField,
                    'sort_order' => $sortOrder,
                ],
            ],
            'sedes' => Sede::select('ID_Sede', 'Nombre_Sede')->get(),
        ]);
    })->name('facultades');
    Route::get('/facultades/create', function () {
        $sedes = Sede::select('ID_Sede', 'Nombre_Sede')->get();
        return Inertia::render('Catalogos/FacultadesForm', [
            'sedes' => $sedes,
        ]);
    })->name('facultades.create');
    Route::get('/facultades/{id}/edit', [FacultadController::class, 'edit']);
    Route::patch('/facultades/{id}/toggle', [FacultadController::class, 'toggle']);
    Route::delete('/facultades/{id}', [FacultadController::class, 'destroy']);
    
    // Catálogos - Programas
    Route::get('/programas', function (Illuminate\Http\Request $request) {
        $query = Programa::with(['facultad', 'facultad.sede']);

        // Búsqueda por nombre o código
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('Nombre_Programa', 'like', '%' . $search . '%')
                  ->orWhere('Codigo_Programa', 'like', '%' . $search . '%');
            });
        }

        // Ordenamiento
        $sortField = $request->sort_by ?? 'ID_Programa';
        $sortOrder = $request->sort_order ?? 'asc';
        $query->orderBy($sortField, $sortOrder);

        $programas = $query->paginate(20)->withQueryString();

        return Inertia::render('Catalogos/Programas', [
            'programas' => [
                'data' => $programas->items(),
                'meta' => [
                    'current_page' => $programas->currentPage(),
                    'total' => $programas->total(),
                    'per_page' => $programas->perPage(),
                    'last_page' => $programas->lastPage(),
                    'sort_by' => $sortField,
                    'sort_order' => $sortOrder,
                ],
            ],
            'facultades' => \App\Models\Facultad::select('ID_Facultad', 'Nombre_Facultad')->where('Activo_Facultad', 1)->get(),
        ]);
    })->name('programas');
    Route::get('/programas/create', function () {
        $facultades = \App\Models\Facultad::select('ID_Facultad', 'Nombre_Facultad')->where('Esta_Activo', 1)->get();
        return Inertia::render('Catalogos/ProgramasForm', [
            'facultades' => $facultades,
        ]);
    })->name('programas.create');
    Route::get('/programas/{id}/edit', [ProgramaController::class, 'edit']);
    Route::patch('/programas/{id}/toggle', [ProgramaController::class, 'toggle']);
    
    // Catálogos - Normativas
    Route::get('/normativas', function (Illuminate\Http\Request $request) {
        $query = \App\Models\Normativa::with('programa');

        // Búsqueda por tipo, número o año
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('Tipo_Normativa', 'like', '%' . $search . '%')
                  ->orWhere('Numero_Normativa', 'like', '%' . $search . '%')
                  ->orWhere('Instancia', 'like', '%' . $search . '%');
            });
        }

        // Ordenamiento
        $sortField = $request->sort_by ?? 'ID_Normativa';
        $sortOrder = $request->sort_order ?? 'asc';
        $query->orderBy($sortField, $sortOrder);

        $normativas = $query->paginate(20)->withQueryString();

        return Inertia::render('Catalogos/Normativas', [
            'normativas' => [
                'data' => $normativas->items(),
                'meta' => [
                    'current_page' => $normativas->currentPage(),
                    'total' => $normativas->total(),
                    'per_page' => $normativas->perPage(),
                    'last_page' => $normativas->lastPage(),
                    'sort_by' => $sortField,
                    'sort_order' => $sortOrder,
                ],
            ],
            'programas' => Programa::select('ID_Programa', 'Nombre_Programa')->where('Activo_Programa', 1)->get(),
        ]);
    })->name('normativas');
    Route::get('/normativas/create', function () {
        $programas = Programa::select('ID_Programa', 'Nombre_Programa')->where('Activo_Programa', 1)->get();
        return Inertia::render('Catalogos/NormativasForm', [
            'programas' => $programas,
        ]);
    })->name('normativas.create');
    Route::get('/normativas/{id}/edit', [NormativaController::class, 'edit']);
    Route::patch('/normativas/{id}/toggle', [NormativaController::class, 'toggle']);
    
    // Catálogos - Componentes
    Route::get('/componentes', function (Illuminate\Http\Request $request) {
        $query = \App\Models\Componente::query();

        // Búsqueda por nombre
        if ($request->filled('search')) {
            $query->where('Nombre_Componente', 'like', '%' . $request->search . '%');
        }

        // Ordenamiento
        $sortField = $request->sort_by ?? 'ID_Componente';
        $sortOrder = $request->sort_order ?? 'asc';
        $query->orderBy($sortField, $sortOrder);

        $componentes = $query->paginate(20)->withQueryString();

        return Inertia::render('Catalogos/Componentes', [
            'componentes' => [
                'data' => $componentes->items(),
                'meta' => [
                    'current_page' => $componentes->currentPage(),
                    'total' => $componentes->total(),
                    'per_page' => $componentes->perPage(),
                    'last_page' => $componentes->lastPage(),
                    'sort_by' => $sortField,
                    'sort_order' => $sortOrder,
                ],
            ],
        ]);
    })->name('componentes');
    Route::inertia('/componentes/create', 'Catalogos/ComponentesForm')->name('componentes.create');
    Route::get('/componentes/{id}/edit', [ComponenteController::class, 'edit']);
    Route::patch('/componentes/{id}/toggle', [ComponenteController::class, 'toggle']);
    
    // Catálogos - Asignaturas
    Route::get('/asignaturas', function (Illuminate\Http\Request $request) {
        $query = \App\Models\Asignatura::query();

        // Búsqueda por nombre o código
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('Nombre_Asignatura', 'like', '%' . $search . '%')
                  ->orWhere('Codigo_Asignatura', 'like', '%' . $search . '%');
            });
        }

        // Ordenamiento
        $sortField = $request->sort_by ?? 'ID_Asignatura';
        $sortOrder = $request->sort_order ?? 'asc';
        $query->orderBy($sortField, $sortOrder);

        // Paginación con preservación de query strings
        $asignaturas = $query->paginate(20)->withQueryString();

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
    Route::get('/usuarios', function (Illuminate\Http\Request $request) {
        $query = \App\Models\Usuario::query();

        // Búsqueda por nombre o email
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('Nombre_Usuario', 'like', '%' . $search . '%')
                  ->orWhere('Email_Usuario', 'like', '%' . $search . '%');
            });
        }

        // Ordenamiento
        $sortField = $request->sort_by ?? 'ID_Usuario';
        $sortOrder = $request->sort_order ?? 'asc';
        $query->orderBy($sortField, $sortOrder);

        $usuarios = $query->paginate(20)->withQueryString();

        return Inertia::render('Catalogos/Usuarios', [
            'usuarios' => [
                'data' => $usuarios->items(),
                'meta' => [
                    'current_page' => $usuarios->currentPage(),
                    'total' => $usuarios->total(),
                    'per_page' => $usuarios->perPage(),
                    'last_page' => $usuarios->lastPage(),
                    'sort_by' => $sortField,
                    'sort_order' => $sortOrder,
                ],
            ],
        ]);
    })->name('usuarios');
    Route::inertia('/usuarios/create', 'Catalogos/UsuariosForm')->name('usuarios.create');
    Route::get('/usuarios/{id}/edit', [UsuarioController::class, 'edit']);
    Route::patch('/usuarios/{id}/toggle', [UsuarioController::class, 'toggle']);
    
    // Mallas y cargas (Fase 3+)
    Route::inertia('/cargas', 'Cargas/Cargas')->name('cargas');
});
