<?php

use App\Http\Controllers\Api\AgrupacionController;
use App\Http\Controllers\Api\AsignaturaController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ComponenteController;
use App\Http\Controllers\Api\FacultadController;
use App\Http\Controllers\Api\NormativaController;
use App\Http\Controllers\Api\ProgramaController;
use App\Http\Controllers\Api\SedeController;
use App\Http\Controllers\Api\UsuarioController;
use App\Http\Controllers\MallaPublicaController;
use App\Models\Asignatura;
use App\Models\CargaMalla;
use App\Models\Componente;
use App\Models\Facultad;
use App\Models\LogActividad;
use App\Models\MallaCurricular;
use App\Models\Normativa;
use App\Models\PlantillaAgrupacion;
use App\Models\Programa;
use App\Models\Sede;
use App\Models\Usuario;
use App\Services\MallaVisualizerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Rutas web que usan Inertia para renderizar páginas React en el cliente.
| Estas rutas proporcionan la navegación SPA del frontend.
|
*/

// ============================================================================
// VISTAS PÚBLICAS — Sistema de Mallas (sin autenticación)
// ============================================================================

/**
 * Lógica compartida para renderizar el listado de programas activos.
 */
$renderProgramasActivos = function () {
    $data = Cache::remember('programas_activos', 300, function () {
        $facultades = Facultad::where('Esta_Activo', 1)
            ->orderBy('Nombre_Facultad')
            ->get()
            ->keyBy('Codigo_Facultad');

        $programas = Programa::with(['mallas' => function ($query) {
                // Obtener SOLO la malla vigente de cada programa (Es_Vigente = 1)
                $query->where('Es_Vigente', 1);
            }])
            ->whereIn('Codigo_Facultad', $facultades->keys())
            ->where('Esta_Activo', 1)
            ->whereHas('mallas', function ($query) {
                // Verificar que existe una malla vigente
                $query->where('Es_Vigente', 1);
            })
            ->orderBy('Nombre_Programa')
            ->get()
            ->groupBy('Codigo_Facultad');

        return $facultades->map(function ($facultad) use ($programas) {
            $progs = collect($programas->get($facultad->Codigo_Facultad, []))->map(function ($programa) {
                $mallaActiva = $programa->mallas->first();

                return [
                    'ID_Programa' => $programa->ID_Programa,
                    'Nombre_Programa' => $programa->Nombre_Programa,
                    'Codigo_Programa' => $programa->Codigo_Programa,
                    'Nivel_Formacion' => $programa->Nivel_Formacion,
                    'Creditos_Totales' => $programa->Creditos_Totales,
                    'Duracion_Semestres' => $programa->Duracion_Semestres,
                    'Codigo_SNIES' => $programa->Codigo_SNIES,
                    'Titulo_Otorgado' => $programa->Titulo_Otorgado,
                    'ID_Malla' => $mallaActiva ? $mallaActiva->ID_Malla : null,
                    'Estado_Malla' => $mallaActiva ? $mallaActiva->Estado : null,
                ];
            })->values()->toArray(); // Filter no es necesario, ya filtramos por Es_Vigente = 1 en query

            return [
                'ID_Facultad' => $facultad->ID_Facultad,
                'Nombre_Facultad' => $facultad->Nombre_Facultad,
                'Codigo_Facultad' => $facultad->Codigo_Facultad,
                'Url_Facultad' => $facultad->Url_Facultad,
                'programas' => $progs,
            ];
        })->filter(fn ($f) => !empty($f['programas']))->values()->toArray();
    });

    return Inertia::render('Inicio/ProgramasActivos', [
        'facultades' => $data,
    ]);
};

// Ruta raíz — muestra el listado público de programas activos
Route::get('/', $renderProgramasActivos)->name('home');

// Ruta alternativa /inicio (por si alguien la usa)
Route::get('/inicio', $renderProgramasActivos);

// Rutas de autenticación (públicas) - usan sesión para mantener estado
Route::inertia('/login', 'Auth/Login')->name('login');

// Rutas de autenticación API vía web (para mantener sesión)
Route::post('/auth/request-otp', [AuthController::class, 'requestOtp'])->middleware('throttle:otp-request');
Route::post('/auth/verify-otp', [AuthController::class, 'verifyOtp'])->middleware('throttle:otp-verify');

/**
 * Vista de Detalle — Malla Académica por Programa
 * Muestra la estructura completa de la malla activa (o una versión histórica)
 * de un programa.
 *
 * Query params:
 *   ?v=ID_Malla  — Carga una versión específica en lugar de la activa.
 */
Route::get('/malla-publica/{id_programa}', [MallaPublicaController::class, 'show'])
    ->name('malla.publica');

// ============================================================================
// RUTAS PROTEGIDAS (requieren autenticación usando sesión web)
// ============================================================================

Route::middleware(['auth'])->group(function () {
    // Cerrar sesión
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Dashboard
    Route::get('/dashboard', function () {
        $sedesCount = Sede::count();
        $facultadesCount = Facultad::count();
        $programasCount = Programa::count();
        $asignaturasCount = Asignatura::count();
        $mallasCount = MallaCurricular::count();
        $usuariosCount = Usuario::count();
        $normativasCount = Normativa::count();
        $componentesCount = Componente::count();
        $agrupacionesCount = PlantillaAgrupacion::count();

        // Cargas pendientes de aprobación
        $cargasPendientes = CargaMalla::where('Estado_Carga', 'pendiente_aprobacion')->count();

        // Cargas recientes
        $cargasRecientes = CargaMalla::with(['malla', 'usuario', 'programa'])
            ->orderBy('Creacion_Carga', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($carga) {
                return [
                    'id' => $carga->ID_Carga,
                    'estado' => $carga->Estado_Carga,
                    'malla' => $carga->malla ? $carga->malla->Nombre_Malla : 'N/A',
                    'programa' => $carga->programa ? $carga->programa->Nombre_Programa : 'N/A',
                    'usuario' => $carga->usuario ? $carga->usuario->Nombre_Usuario : 'N/A',
                    'fecha' => $carga->Creacion_Carga->format('d/m/Y H:i'),
                ];
            });

        return Inertia::render('Dashboard', [
            'sedesCount' => $sedesCount,
            'facultadesCount' => $facultadesCount,
            'programasCount' => $programasCount,
            'asignaturasCount' => $asignaturasCount,
            'mallasCount' => $mallasCount,
            'usuariosCount' => $usuariosCount,
            'normativasCount' => $normativasCount,
            'componentesCount' => $componentesCount,
            'agrupacionesCount' => $agrupacionesCount,
            'cargasPendientes' => $cargasPendientes,
            'cargasRecientes' => $cargasRecientes,
        ]);
    })->name('dashboard');

    // Catálogos - Sedes
    Route::get('/sedes', function (Request $request) {
        $query = Sede::query();

        // Búsqueda por nombre o ciudad
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('Nombre_Sede', 'like', '%'.$search.'%')
                    ->orWhere('Ciudad_Sede', 'like', '%'.$search.'%');
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
    Route::post('/sedes', [SedeController::class, 'store']);
    Route::put('/sedes/{id}', [SedeController::class, 'update']);
    Route::post('/componentes', [ComponenteController::class, 'store']);
    Route::put('/componentes/{id}', [ComponenteController::class, 'update']);
    Route::get('/sedes/create', function () {
        return Inertia::render('Catalogos/SedesForm');
    })->name('sedes.create');
    Route::get('/sedes/{id}/edit', [SedeController::class, 'edit']);
    Route::patch('/sedes/{id}/toggle', [SedeController::class, 'toggle']);
    Route::delete('/sedes/{id}', [SedeController::class, 'destroy']);

    // Catálogos - Facultades
    Route::get('/facultades', function (Request $request) {
        $query = Facultad::with('sede');

        // Búsqueda por nombre de facultad
        if ($request->filled('search')) {
            $query->where('Nombre_Facultad', 'like', '%'.$request->search.'%');
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
            'sedes' => Sede::select('Codigo_Sede', 'Nombre_Sede')->get(),
        ]);
    })->name('facultades');
    Route::post('/facultades', [FacultadController::class, 'store']);
    Route::get('/facultades/create', function () {
        $sedes = Sede::select('Codigo_Sede', 'Nombre_Sede')->get();

        return Inertia::render('Catalogos/FacultadesForm', [
            'sedes' => $sedes,
        ]);
    })->name('facultades.create');
    Route::get('/facultades/{id}/edit', [FacultadController::class, 'edit']);
    Route::put('/facultades/{id}', [FacultadController::class, 'update']);
    Route::patch('/facultades/{id}/toggle', [FacultadController::class, 'toggle']);
    Route::delete('/facultades/{id}', [FacultadController::class, 'destroy']);

    // Catálogos - Programas
    Route::get('/programas', function (Request $request) {
        $query = Programa::with(['facultad', 'facultad.sede']);

        // Búsqueda por nombre o código
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('Nombre_Programa', 'like', '%'.$search.'%')
                    ->orWhere('Codigo_Programa', 'like', '%'.$search.'%');
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
            'facultades' => Facultad::select('ID_Facultad', 'Nombre_Facultad')->where('Esta_Activo', 1)->get(),
        ]);
    })->name('programas');
    Route::get('/programas/create', function () {
        $facultades = Facultad::select('Codigo_Facultad', 'Nombre_Facultad')->where('Esta_Activo', 1)->get();

        return Inertia::render('Catalogos/ProgramasForm', [
            'facultades' => $facultades,
        ]);
    })->name('programas.create');
    Route::get('/programas/{id}/edit', [ProgramaController::class, 'edit']);
    Route::post('/programas', [ProgramaController::class, 'store']);
    Route::put('/programas/{id}', [ProgramaController::class, 'update']);
    Route::patch('/programas/{id}/toggle', [ProgramaController::class, 'toggle']);
    Route::delete('/programas/{id}', [ProgramaController::class, 'destroy']);

    // Catálogos - Normativas
    Route::get('/normativas', function (Request $request) {
        $query = Normativa::with('programa');

        // Búsqueda por tipo, número o año
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('Tipo_Normativa', 'like', '%'.$search.'%')
                    ->orWhere('Numero_Normativa', 'like', '%'.$search.'%')
                    ->orWhere('Instancia', 'like', '%'.$search.'%');
            });
        }

        // Ordenamiento
        $sortField = $request->sort_by ?? 'ID_Normativa';
        $sortOrder = $request->sort_order ?? 'asc';

        // Validar campos permitidos para ordenamiento (solo columnas reales en BD)
        $allowedSortFields = ['ID_Normativa', 'Tipo_Normativa', 'Numero_Normativa', 'Anio_Normativa', 'Instancia', 'Esta_Activo'];

        if (in_array($sortField, $allowedSortFields)) {
            $query->orderBy($sortField, $sortOrder);
        } else {
            $query->orderBy('ID_Normativa', $sortOrder);
        }

        $normativas = $query->paginate(20)->withQueryString();

        // Mapear datos para incluir Nombre_Programa directamente
        $normativasData = collect($normativas->items())->map(function ($normativa) {
            return [
                'ID_Normativa' => $normativa->ID_Normativa,
                'ID_Programa' => $normativa->ID_Programa,
                'Codigo_Programa' => $normativa->Codigo_Programa,
                'Tipo_Normativa' => $normativa->Tipo_Normativa,
                'Numero_Normativa' => $normativa->Numero_Normativa,
                'Anio_Normativa' => $normativa->Anio_Normativa,
                'Instancia' => $normativa->Instancia,
                'Descripcion_Normativa' => $normativa->Descripcion_Normativa,
                'Url_Normativa' => $normativa->Url_Normativa,
                'Esta_Activo' => $normativa->Esta_Activo,
                'Nombre_Programa' => $normativa->programa?->Nombre_Programa ?? null,
            ];
        });

        return Inertia::render('Catalogos/Normativas', [
            'normativas' => [
                'data' => $normativasData,
                'meta' => [
                    'current_page' => $normativas->currentPage(),
                    'total' => $normativas->total(),
                    'per_page' => $normativas->perPage(),
                    'last_page' => $normativas->lastPage(),
                    'sort_by' => $sortField,
                    'sort_order' => $sortOrder,
                ],
            ],
            'programas' => Programa::select('ID_Programa', 'Codigo_Programa', 'Nombre_Programa')->where('Esta_Activo', 1)->get(),
        ]);
    })->name('normativas');
    Route::get('/normativas/create', function () {
        $programas = Programa::select('ID_Programa', 'Codigo_Programa', 'Nombre_Programa')->where('Esta_Activo', 1)->get();

        return Inertia::render('Catalogos/NormativasForm', [
            'programas' => $programas,
        ]);
    })->name('normativas.create');
    Route::get('/normativas/{id}/edit', [NormativaController::class, 'edit']);
    Route::post('/normativas', [NormativaController::class, 'store']);
    Route::put('/normativas/{id}', [NormativaController::class, 'update']);
    Route::patch('/normativas/{id}/toggle', [NormativaController::class, 'toggle']);
    Route::delete('/normativas/{id}', [NormativaController::class, 'destroy']);

    // Catálogos - Componentes
    Route::get('/componentes', function (Request $request) {
        $query = Componente::query();

        // Búsqueda por nombre
        if ($request->has('search') && $request->search) {
            $query->where('Nombre_Componente', 'like', '%'.$request->search.'%');
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
    Route::post('/asignaturas', [AsignaturaController::class, 'store']);
    Route::put('/asignaturas/{id}', [AsignaturaController::class, 'update']);
    Route::post('/usuarios', [UsuarioController::class, 'store']);
    Route::put('/usuarios/{id}', [UsuarioController::class, 'update']);

    // Catálogos - Agrupaciones
    Route::get('/agrupaciones', function (Request $request) {
        $query = PlantillaAgrupacion::with(['programa', 'componente']);

        // Búsqueda por nombre
        if ($request->has('search') && $request->search) {
            $query->where('Nombre_Agrupacion', 'like', '%'.$request->search.'%');
        }

        // Ordenamiento
        $sortField = $request->sort_by ?? 'ID_Plantilla_Agrupacion';
        $sortOrder = $request->sort_order ?? 'asc';
        $query->orderBy($sortField, $sortOrder);

        $agrupaciones = $query->paginate(20)->withQueryString();

        return Inertia::render('Catalogos/Agrupaciones', [
            'agrupaciones' => [
                'data' => $agrupaciones->items(),
                'meta' => [
                    'current_page' => $agrupaciones->currentPage(),
                    'total' => $agrupaciones->total(),
                    'per_page' => $agrupaciones->perPage(),
                    'last_page' => $agrupaciones->lastPage(),
                    'sort_by' => $sortField,
                    'sort_order' => $sortOrder,
                ],
            ],
        ]);
    })->name('agrupaciones');
    Route::get('/agrupaciones/create', function () {
        $programas = Programa::select('ID_Programa', 'Nombre_Programa')->get();
        $componentes = Componente::select('ID_Componente', 'Nombre_Componente')->get();

        return Inertia::render('Catalogos/AgrupacionesForm', [
            'programas' => $programas,
            'componentes' => $componentes,
        ]);
    })->name('agrupaciones.create');
    Route::get('/agrupaciones/{id}/edit', [AgrupacionController::class, 'edit']);
    Route::put('/agrupaciones/{id}', [AgrupacionController::class, 'update']);
    Route::post('/agrupaciones', [AgrupacionController::class, 'store']);
    Route::patch('/agrupaciones/{id}/toggle', [AgrupacionController::class, 'toggle']);
    Route::delete('/agrupaciones/{id}', [AgrupacionController::class, 'destroy']);

    // Catálogos - Asignaturas
    Route::get('/asignaturas', function (Request $request) {
        $query = Asignatura::query();

        // Búsqueda por nombre o código
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('Nombre_Asignatura', 'like', '%'.$search.'%')
                    ->orWhere('Codigo_Asignatura', 'like', '%'.$search.'%');
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
                    'sort_by' => $sortField,
                    'sort_order' => $sortOrder,
                ],
            ],
        ]);
    })->name('asignaturas');
    Route::inertia('/asignaturas/create', 'Catalogos/AsignaturasForm')->name('asignaturas.create');
    Route::get('/asignaturas/{id}/edit', [AsignaturaController::class, 'edit']);
    Route::patch('/asignaturas/{id}/toggle', [AsignaturaController::class, 'toggle']);

    // Catálogos - Usuarios
    Route::get('/usuarios', function (Request $request) {
        $query = Usuario::query();

        // Búsqueda por nombre o email
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('Nombre_Usuario', 'like', '%'.$search.'%')
                    ->orWhere('Email_Usuario', 'like', '%'.$search.'%');
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

    Route::get('/mallas', function (Request $request) {
        $mallas = MallaCurricular::with('programa')
            ->orderBy('ID_Malla', 'desc')
            ->paginate(15);

        return Inertia::render('Mallas/Index', [
            'mallas' => [
                'data' => $mallas->items(),
                'meta' => [
                    'current_page' => $mallas->currentPage(),
                    'last_page' => $mallas->lastPage(),
                    'total' => $mallas->total(),
                ],
            ],
        ]);
    })->name('mallas.index');

    Route::get('/mallas/{id}', function ($id) {
        $malla = MallaCurricular::with([
            'programa',
            'agrupaciones.asignaturas.requisitos.asignaturaRequerida',
            'agrupaciones.componente',
        ])->findOrFail($id);

        return Inertia::render('Mallas/Show', [
            'malla' => $malla,
        ]);
    })->name('mallas.show');

    Route::get('/mallas/{id}/grafica', function ($id) {
        $malla = MallaCurricular::findOrFail($id);
        $idPrograma = $malla->programa->ID_Programa;

        $service = app(MallaVisualizerService::class);
        $malla->load($service->eagerLoads($idPrograma));

        $payload = $service->toPayload($malla);
        $payload['programa']['Facultad'] = $malla->programa->facultad->Nombre_Facultad ?? null;

        return Inertia::render('Mallas/Visualizer', [
            'malla' => $payload,
        ]);
    })->name('mallas.visualizer');

    // Gestión de optativas por agrupación (admin)
    Route::get('/mallas/{id}/optativas-asignacion', function ($id) {
        $malla = MallaCurricular::with('programa')->findOrFail($id);

        return Inertia::render('Mallas/OptativasAsignacion', [
            'malla' => [
                'ID_Malla' => $malla->ID_Malla,
                'Codigo_Plan' => $malla->Codigo_Plan,
                'programa' => [
                    'ID_Programa' => $malla->programa->ID_Programa,
                    'Nombre_Programa' => $malla->programa->Nombre_Programa,
                ],
            ],
        ]);
    })->name('mallas.optativas-asignacion');

    // Auditoría y Aprobación (módulos nuevos)
    Route::get('/auditoria', function (Request $request) {
        $query = LogActividad::with('usuario');

        // Aplicar filtros desde la URL
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('Detalle_Log', 'like', '%'.$search.'%')
                    ->orWhere('IP_Origen_Log', 'like', '%'.$search.'%');
            });
        }
        if ($request->filled('accion')) {
            $query->where('Accion_Log', $request->accion);
        }
        if ($request->filled('entidad')) {
            $query->where('Entidad_Log', $request->entidad);
        }
        if ($request->filled('usuario_id')) {
            $query->where('ID_Usuario', $request->usuario_id);
        }
        if ($request->filled('desde')) {
            $query->whereDate('Creacion_Log', '>=', $request->desde);
        }
        if ($request->filled('hasta')) {
            $query->whereDate('Creacion_Log', '<=', $request->hasta);
        }

        $logs = $query->orderBy('Creacion_Log', 'desc')
            ->paginate(20)
            ->withQueryString();

        // Obtener estadísticas
        $totalLogs = LogActividad::count();
        $porAccion = LogActividad::select('Accion_Log')
            ->selectRaw('COUNT(*) as total')
            ->groupBy('Accion_Log')
            ->orderBy('total', 'desc')
            ->get();

        $porEntidad = LogActividad::select('Entidad_Log')
            ->selectRaw('COUNT(*) as total')
            ->groupBy('Entidad_Log')
            ->orderBy('total', 'desc')
            ->get();

        $porUsuario = LogActividad::with('usuario')
            ->select('ID_Usuario')
            ->selectRaw('COUNT(*) as total')
            ->groupBy('ID_Usuario')
            ->orderBy('total', 'desc')
            ->limit(10)
            ->get();

        // Obtener acciones y entidades disponibles
        $acciones = LogActividad::select('Accion_Log')
            ->distinct()
            ->pluck('Accion_Log')
            ->sort()
            ->values();

        $entidades = LogActividad::select('Entidad_Log')
            ->distinct()
            ->pluck('Entidad_Log')
            ->sort()
            ->values();

        return Inertia::render('Auditoria/AuditoriaPage', [
            'logs' => $logs->items(),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'total' => $logs->total(),
                'per_page' => $logs->perPage(),
                'last_page' => $logs->lastPage(),
            ],
            'estadisticas' => [
                'total_logs' => $totalLogs,
                'por_accion' => $porAccion,
                'por_entidad' => $porEntidad,
                'por_usuario' => $porUsuario,
            ],
            'acciones' => $acciones,
            'entidades' => $entidades,
            'filters' => $request->only(['usuario_id', 'accion', 'entidad', 'desde', 'hasta', 'search']),
        ]);
    })->name('auditoria');

    Route::get('/aprobacion', function () {
        // Obtener cargas pendientes de revisión
        $pendientes = CargaMalla::with(['malla', 'usuario', 'programa'])
            ->where('Estado_Carga', 'pendiente_aprobacion')
            ->where('ID_Usuario', '!=', auth()->user()->ID_Usuario)
            ->orderBy('Creacion_Carga', 'desc')
            ->get();

        // Obtener mis cargas
        $misCargas = CargaMalla::with(['malla', 'usuarioRevisor', 'programa'])
            ->where('ID_Usuario', auth()->user()->ID_Usuario)
            ->orderBy('Creacion_Carga', 'desc')
            ->get();

        return Inertia::render('Aprobacion/AprobacionPage', [
            'pendientes' => $pendientes,
            'misCargas' => $misCargas,
        ]);
    })->name('aprobacion');
});
