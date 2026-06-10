<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CargaMalla;
use App\Models\MallaCurricular;
use App\Services\MallaAprobacionService;
use App\Services\MallaDiffService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class MallaAprobacionController extends Controller
{
    protected MallaAprobacionService $aprobacionService;
    protected MallaDiffService $diffService;

    public function __construct(MallaAprobacionService $aprobacionService, MallaDiffService $diffService)
    {
        $this->aprobacionService = $aprobacionService;
        $this->diffService = $diffService;
    }

    /**
     * Envía una malla a revisión.
     */
    public function enviarRevision(CargaMalla $carga): JsonResponse
    {
        try {
            $usuario = auth()->user();
            $cargaActualizada = $this->aprobacionService->enviarRevision($carga, $usuario);

            return response()->json([
                'message' => 'Malla enviada a revisión exitosamente',
                'data' => $cargaActualizada->load(['malla', 'programa']),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al enviar a revisión',
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Aprueba o rechaza una malla.
     */
    public function revisar(Request $request, CargaMalla $carga): JsonResponse
    {
        $request->validate([
            'accion' => ['required', Rule::in(['aprobar', 'rechazar'])],
            'comentario' => 'required|string|max:1000',
        ]);

        try {
            $usuario = auth()->user();

            if ($request->accion === 'aprobar') {
                $cargaActualizada = $this->aprobacionService->aprobarMalla($carga, $usuario, $request->comentario);
                $message = 'Malla aprobada exitosamente';
            } else {
                $cargaActualizada = $this->aprobacionService->rechazarMalla($carga, $usuario, $request->comentario);
                $message = 'Malla rechazada';
            }

            return response()->json([
                'message' => $message,
                'data' => $cargaActualizada->load(['malla', 'usuario', 'usuarioRevisor', 'programa']),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error en la revisión',
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Obtiene las mallas pendientes de revisión.
     */
    public function pendientesRevision(): JsonResponse
    {
        $usuario = auth()->user();
        $cargas = $this->aprobacionService->obtenerMallasParaRevisar($usuario);

        return response()->json([
            'data' => $cargas,
        ]);
    }

    /**
     * Obtiene las cargas del usuario autenticado.
     */
    public function misCargas(): JsonResponse
    {
        $usuario = auth()->user();
        $cargas = $this->aprobacionService->obtenerMisCargas($usuario);

        return response()->json([
            'data' => $cargas,
        ]);
    }

    /**
     * Obtiene el historial de versiones de un programa.
     */
    public function historialPrograma(int $programaId): JsonResponse
    {
        $historial = $this->aprobacionService->obtenerHistorialPrograma($programaId);

        return response()->json([
            'data' => $historial,
        ]);
    }

    /**
     * Compara dos versiones específicas de malla.
     */
    public function compararVersiones(Request $request): JsonResponse
    {
        $request->validate([
            'malla1_id' => 'required|integer|exists:malla_curricular,ID_Malla',
            'malla2_id' => 'required|integer|exists:malla_curricular,ID_Malla',
        ]);

        $malla1 = MallaCurricular::findOrFail($request->malla1_id);
        $malla2 = MallaCurricular::findOrFail($request->malla2_id);

        // Validar que pertenezcan al mismo programa
        if ($malla1->ID_Programa !== $malla2->ID_Programa) {
            return response()->json([
                'message' => 'Las mallas deben pertenecer al mismo programa',
            ], 400);
        }

        try {
            $diffs = $this->aprobacionService->compararVersiones($malla1, $malla2);

            return response()->json([
                'data' => [
                    'malla1' => $malla1->load(['normativa']),
                    'malla2' => $malla2->load(['normativa']),
                    'diffs' => $diffs,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al comparar versiones',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtiene estadísticas de aprobación por programa.
     */
    public function estadisticasPrograma(int $programaId): JsonResponse
    {
        $estadisticas = $this->aprobacionService->obtenerEstadisticasPrograma($programaId);

        return response()->json([
            'data' => $estadisticas,
        ]);
    }

    /**
     * Verifica si un usuario puede revisar una malla.
     */
    public function puedeRevisar(CargaMalla $carga): JsonResponse
    {
        $usuario = auth()->user();
        $puede = $this->aprobacionService->puedeRevisar($usuario, $carga);

        return response()->json([
            'data' => [
                'puede_revisar' => $puede,
                'motivo' => $puede ? null : $this->obtenerMotivoNoPuedeRevisar($usuario, $carga),
            ],
        ]);
    }

    /**
     * Verifica si un usuario puede enviar a revisión una malla.
     */
    public function puedeEnviarRevision(CargaMalla $carga): JsonResponse
    {
        $usuario = auth()->user();
        $puede = $this->aprobacionService->puedeEnviarRevision($usuario, $carga);

        return response()->json([
            'data' => [
                'puede_enviar' => $puede,
                'motivo' => $puede ? null : $this->obtenerMotivoNoPuedeEnviar($usuario, $carga),
            ],
        ]);
    }

    /**
     * Obtiene el motivo por el que no se puede revisar.
     */
    private function obtenerMotivoNoPuedeRevisar($usuario, CargaMalla $carga): string
    {
        if ($carga->Estado_Carga !== 'pendiente_aprobacion') {
            return 'La malla no está pendiente de aprobación';
        }

        if ($carga->ID_Usuario === $usuario->ID_Usuario) {
            return 'No puedes revisar una malla que tú mismo cargaste';
        }

        return 'No tienes permiso para revisar esta malla';
    }

    /**
     * Obtiene el motivo por el que no se puede enviar a revisión.
     */
    private function obtenerMotivoNoPuedeEnviar($usuario, CargaMalla $carga): string
    {
        if ($carga->Estado_Carga !== 'borrador') {
            return 'La malla no está en estado borrador';
        }

        if (!$carga->ID_Malla) {
            return 'No existe una malla asociada a esta carga';
        }

        return 'No se puede enviar a revisión';
    }

    /**
     * Obtiene detalles completos de una carga para revisión.
     */
    public function detallesRevision(CargaMalla $carga): JsonResponse
    {
        $carga->load([
            'malla',
            'usuario',
            'programa.facultad.sede',
            'normativa',
            'erroresCarga',
        ]);

        // Obtener diffs
        $diffs = $this->diffService->obtenerDiffsAgrupados($carga);
        $resumen = $this->diffService->generarResumenCambios($carga);

        // Verificar permisos del usuario actual
        $usuario = auth()->user();
        $esPropietario = $carga->ID_Usuario === $usuario->ID_Usuario;
        $esRevisor = $this->aprobacionService->puedeRevisar($usuario, $carga);
        $puedeEnviar = $this->aprobacionService->puedeEnviarRevision($usuario, $carga);

        return response()->json([
            'data' => [
                'carga' => $carga,
                'diffs' => $diffs,
                'resumen' => $resumen,
                'permisos' => [
                    'es_propietario' => $esPropietario,
                    'es_revisor' => $esRevisor,
                    'puede_enviar_revision' => $puedeEnviar,
                    'puede_revisar' => $esRevisor,
                ],
            ],
        ]);
    }
}
