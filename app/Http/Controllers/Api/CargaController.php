<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCargaRequest;
use App\Http\Requests\UploadCargaArchivoRequest;
use App\Jobs\ProcesarExcelJob;
use App\Models\CargaMalla;
use App\Models\ErrorCarga;
use App\Services\ExcelUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CargaController extends Controller
{
    private ExcelUploadService $uploadService;

    public function __construct(ExcelUploadService $uploadService)
    {
        $this->uploadService = $uploadService;
    }

    public function store(StoreCargaRequest $request): JsonResponse
    {
        $result = $this->uploadService->createCarga(
            $request->input('normativa_id'),
            $request->input('malla_base_id'),
            $request->user()->ID_Usuario
        );

        if (!$result['success']) {
            return response()->json([
                'message' => $result['message'] ?? 'Error al crear la carga.',
                'data' => $result['data'] ?? null,
            ], $result['status'] ?? 400);
        }

        return response()->json([
            'data' => $result['data'],
            'message' => 'Carga creada correctamente. Sube el archivo correspondiente para continuar.',
        ], 201);
    }

    public function uploadArchivo(int $id, UploadCargaArchivoRequest $request): JsonResponse
    {
        $result = $this->uploadService->uploadArchivo(
            $id,
            $request->file('archivo'),
            $request->input('tipo_archivo'),
            $request->user()->ID_Usuario
        );

        if (!$result['success']) {
            return response()->json([
                'message' => $result['message'] ?? 'Error al subir el archivo.',
                'data' => $result['data'] ?? null,
            ], $result['status'] ?? 400);
        }

        return response()->json([
            'data' => $result['data'],
            'message' => 'Archivo subido correctamente.',
        ], 200);
    }

    public function procesar(int $id): JsonResponse
    {
        $carga = CargaMalla::findOrFail($id);

        if ($carga->Estado_Carga !== 'listo_para_procesar') {
            return response()->json([
                'message' => 'La carga debe estar en estado listo_para_procesar para iniciar el procesamiento.',
            ], 409);
        }

        $carga->update(['Estado_Carga' => 'iniciado']);

        if (app()->isLocal()) {
            $job = new ProcesarExcelJob($id);
            $job->handle(app(\App\Services\ExcelParserService::class));
        } else {
            ProcesarExcelJob::dispatch($id);
        }

        return response()->json([
            'data' => [
                'carga_id' => $id,
                'estado' => 'iniciado',
            ],
            'message' => 'El procesamiento de la carga se ha iniciado.',
        ], 202);
    }

    public function index(Request $request): JsonResponse
    {
        $query = CargaMalla::with([
            'usuario',
            'normativa.programa',
            'archivoAsignaturas',
            'archivoElectivas',
            'archivoMalla',
            'malla.normativa.programa',
        ]);

        if ($request->has('estado') && $request->input('estado')) {
            $query->where('Estado_Carga', $request->input('estado'));
        }

        if ($request->has('programa_id') && $request->input('programa_id')) {
            $query->where('ID_Programa', $request->input('programa_id'));
        }

        $cargas = $query->orderBy('Creacion_Carga', 'desc')
            ->paginate(20);

        $items = array_map(function ($carga) {
            return $this->sanitizeForJson($carga);
        }, $cargas->items());

        return response()->json([
            'data' => $items,
            'meta' => [
                'current_page' => $cargas->currentPage(),
                'total' => $cargas->total(),
                'per_page' => $cargas->perPage(),
                'last_page' => $cargas->lastPage(),
            ],
            'message' => '',
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $carga = CargaMalla::with([
            'usuario',
            'normativa.programa.facultad.sede',
            'malla.normativa.programa.facultad.sede',
            'archivoAsignaturas',
            'archivoElectivas',
            'archivoMalla',
            'errores',
            'mallaBase',
        ])->findOrFail($id);

        $cargaArray = $this->sanitizeForJson($carga);

        return response()->json([
            'data' => $cargaArray,
            'message' => '',
        ]);
    }

    public function estado(int $id): JsonResponse
    {
        $carga = CargaMalla::findOrFail($id);

        $errorsCount = ErrorCarga::where('ID_Carga', $id)
            ->where('Severidad_Error', 'error')
            ->count();

        $warningsCount = ErrorCarga::where('ID_Carga', $id)
            ->where('Severidad_Error', 'advertencia')
            ->count();

        $percentage = 0;
        if (in_array($carga->Estado_Carga, ['iniciado', 'validando'])) {
            $percentage = 50;
        } elseif ($carga->Estado_Carga === 'borrador') {
            $percentage = 100;
        } elseif ($carga->Estado_Carga === 'con_errores') {
            $percentage = 100;
        }

        return response()->json([
            'data' => [
                'carga_id' => $carga->ID_Carga,
                'estado' => $carga->Estado_Carga,
                'Estado_Carga' => $carga->Estado_Carga,
                'errores_count' => $errorsCount,
                'advertencias_count' => $warningsCount,
                'porcentaje' => $percentage,
            ],
            'message' => '',
        ]);
    }

    public function errores(int $id): JsonResponse
    {
        $errores = ErrorCarga::where('ID_Carga', $id)
            ->orderBy('Fila_Error')
            ->orderBy('Severidad_Error', 'desc')
            ->get();

        return response()->json([
            'data' => $errores,
            'message' => '',
        ]);
    }

    public function diff(int $id): JsonResponse
    {
        $carga = CargaMalla::with(['malla', 'mallaBase'])->findOrFail($id);

        if (!$carga->ID_Malla_Base) {
            return response()->json([
                'data' => [],
                'message' => 'Esta carga no tiene una malla base para comparar.',
            ]);
        }

        return response()->json([
            'data' => [],
            'message' => 'Diff no implementado aún.',
        ]);
    }

    public function enviarRevision(int $id, Request $request): JsonResponse
    {
        $carga = CargaMalla::findOrFail($id);

        if ($carga->ID_Usuario !== $request->user()->ID_Usuario) {
            return response()->json([
                'message' => 'No tienes permiso para enviar esta carga a revisión.',
            ], 403);
        }

        if ($carga->Estado_Carga !== 'borrador') {
            return response()->json([
                'message' => 'Solo las cargas en estado borrador pueden enviarse a revisión.',
            ], 400);
        }

        $carga->update(['Estado_Carga' => 'pendiente_aprobacion']);

        return response()->json([
            'data' => $carga,
            'message' => 'Carga enviada a revisión correctamente.',
        ]);
    }

    public function revisar(int $id, Request $request): JsonResponse
    {
        $request->validate([
            'accion' => ['required', 'in:aprobar,rechazar'],
            'comentario' => ['nullable', 'string'],
        ]);

        $carga = CargaMalla::with('malla')->findOrFail($id);

        if ($carga->ID_Usuario === $request->user()->ID_Usuario) {
            return response()->json([
                'message' => 'No puedes revisar tu propia carga.',
            ], 403);
        }

        if (!in_array($carga->Estado_Carga, ['pendiente_aprobacion'])) {
            return response()->json([
                'message' => 'Solo las cargas pendientes de aprobación pueden ser revisadas.',
            ], 400);
        }

        $accion = $request->input('accion');

        if ($accion === 'aprobar') {
            $carga->update([
                'Estado_Carga' => 'aprobado',
                'Comentario_Revisor' => $request->input('comentario'),
                'ID_Usuario_Revisor' => $request->user()->ID_Usuario,
                'Fecha_Revision' => now(),
            ]);

            $carga->malla->update([
                'Estado' => 'activa',
                'Es_Vigente' => 1,
            ]);
        } else {
            $carga->update([
                'Estado_Carga' => 'rechazado',
                'Comentario_Revisor' => $request->input('comentario'),
                'ID_Usuario_Revisor' => $request->user()->ID_Usuario,
                'Fecha_Revision' => now(),
            ]);

            $carga->malla->update([
                'Estado' => 'rechazada',
            ]);
        }

        return response()->json([
            'data' => $carga,
            'message' => $accion === 'aprobar' ? 'Malla aprobada correctamente.' : 'Malla rechazada.',
        ]);
    }
}
