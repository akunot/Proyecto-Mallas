<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LogActividad;
use App\Models\DiffMalla;
use App\Models\CargaMalla;
use App\Services\MallaDiffService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AuditoriaController extends Controller
{
    /**
     * Lista los logs de actividad con filtros.
     */
    public function index(Request $request): JsonResponse
    {
        $query = LogActividad::with(['usuario']);

        // Filtros
        if ($request->has('usuario_id')) {
            $query->where('ID_Usuario', $request->usuario_id);
        }

        if ($request->has('accion')) {
            $query->where('Accion_Log', $request->accion);
        }

        if ($request->has('entidad')) {
            $query->where('Entidad_Log', $request->entidad);
        }

        if ($request->has('desde')) {
            $query->whereDate('Creacion_Log', '>=', $request->desde);
        }

        if ($request->has('hasta')) {
            $query->whereDate('Creacion_Log', '<=', $request->hasta);
        }

        // Ordenamiento y paginación
        $logs = $query->orderBy('Creacion_Log', 'desc')
            ->paginate(20);

        return response()->json([
            'data' => $logs->items(),
            'pagination' => [
                'current_page' => $logs->currentPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
                'last_page' => $logs->lastPage(),
            ],
        ]);
    }

    /**
     * Obtiene los diffs de una carga específica.
     */
    public function diffs(CargaMalla $carga): JsonResponse
    {
        $diffService = new MallaDiffService();
        $diffs = $diffService->obtenerDiffsAgrupados($carga);
        $resumen = $diffService->generarResumenCambios($carga);

        return response()->json([
            'data' => [
                'diffs' => $diffs,
                'resumen' => $resumen,
                'carga' => $carga->load(['malla', 'usuario', 'usuarioRevisor']),
            ],
        ]);
    }

    /**
     * Obtiene el resumen de cambios de una carga.
     */
    public function resumenCambios(CargaMalla $carga): JsonResponse
    {
        $diffService = new MallaDiffService();
        $resumen = $diffService->generarResumenCambios($carga);

        return response()->json([
            'data' => $resumen,
        ]);
    }

    /**
     * Obtiene las acciones disponibles para filtrar logs.
     */
    public function accionesDisponibles(): JsonResponse
    {
        $acciones = LogActividad::select('Accion_Log')
            ->distinct()
            ->pluck('Accion_Log')
            ->sort()
            ->values();

        return response()->json([
            'data' => $acciones,
        ]);
    }

    /**
     * Obtiene las entidades disponibles para filtrar logs.
     */
    public function entidadesDisponibles(): JsonResponse
    {
        $entidades = LogActividad::select('Entidad_Log')
            ->distinct()
            ->pluck('Entidad_Log')
            ->sort()
            ->values();

        return response()->json([
            'data' => $entidades,
        ]);
    }

    /**
     * Obtiene estadísticas de auditoría.
     */
    public function estadisticas(Request $request): JsonResponse
    {
        $query = LogActividad::query();

        // Filtros de fecha
        if ($request->has('desde')) {
            $query->whereDate('Creacion_Log', '>=', $request->desde);
        }

        if ($request->has('hasta')) {
            $query->whereDate('Creacion_Log', '<=', $request->hasta);
        }

        $totalLogs = $query->count();
        
        $logsPorAccion = $query->select('Accion_Log')
            ->selectRaw('COUNT(*) as total')
            ->groupBy('Accion_Log')
            ->orderBy('total', 'desc')
            ->get();

        $logsPorEntidad = $query->select('Entidad_Log')
            ->selectRaw('COUNT(*) as total')
            ->groupBy('Entidad_Log')
            ->orderBy('total', 'desc')
            ->get();

        $logsPorUsuario = $query->with('usuario')
            ->select('ID_Usuario')
            ->selectRaw('COUNT(*) as total')
            ->groupBy('ID_Usuario')
            ->orderBy('total', 'desc')
            ->limit(10)
            ->get();

        return response()->json([
            'data' => [
                'total_logs' => $totalLogs,
                'por_accion' => $logsPorAccion,
                'por_entidad' => $logsPorEntidad,
                'por_usuario' => $logsPorUsuario,
            ],
        ]);
    }

    /**
     * Obtiene el timeline de actividad para una entidad específica.
     */
    public function timelineEntidad(Request $request): JsonResponse
    {
        $request->validate([
            'entidad' => 'required|string',
            'entidad_id' => 'required|integer',
        ]);

        $logs = LogActividad::with(['usuario'])
            ->where('Entidad_Log', $request->entidad)
            ->where('Entidad_ID_Log', $request->entidad_id)
            ->orderBy('Creacion_Log', 'desc')
            ->get();

        return response()->json([
            'data' => $logs,
        ]);
    }

    /**
     * Exporta logs a CSV.
     */
    public function exportarLogs(Request $request): JsonResponse
    {
        $query = LogActividad::with(['usuario']);

        // Aplicar mismos filtros que index()
        if ($request->has('usuario_id')) {
            $query->where('ID_Usuario', $request->usuario_id);
        }

        if ($request->has('accion')) {
            $query->where('Accion_Log', $request->accion);
        }

        if ($request->has('entidad')) {
            $query->where('Entidad_Log', $request->entidad);
        }

        if ($request->has('desde')) {
            $query->whereDate('Creacion_Log', '>=', $request->desde);
        }

        if ($request->has('hasta')) {
            $query->whereDate('Creacion_Log', '<=', $request->hasta);
        }

        $logs = $query->orderBy('Creacion_Log', 'desc')->get();

        $csv = $this->generarCSV($logs);

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="logs_actividad_' . date('Y-m-d') . '.csv"',
        ]);
    }

    /**
     * Genera el contenido CSV de logs.
     */
    private function generarCSV($logs): string
    {
        $headers = [
            'ID_Log',
            'Usuario',
            'Acción',
            'Entidad',
            'ID Entidad',
            'Detalle',
            'IP Origen',
            'Fecha',
        ];

        $csv = implode(',', $headers) . "\n";

        foreach ($logs as $log) {
            $row = [
                $log->ID_Log,
                $log->usuario?->Nombre_Usuario ?? 'Sistema',
                $log->Accion_Log,
                $log->Entidad_Log,
                $log->Entidad_ID_Log,
                json_encode($log->Detalle_Log),
                $log->IP_Origen_Log,
                $log->Creacion_Log->format('Y-m-d H:i:s'),
            ];

            // Escapar comas y comillas
            $row = array_map(function($value) {
                if (str_contains($value, ',') || str_contains($value, '"')) {
                    return '"' . str_replace('"', '""', $value) . '"';
                }
                return $value;
            }, $row);

            $csv .= implode(',', $row) . "\n";
        }

        return $csv;
    }
}
