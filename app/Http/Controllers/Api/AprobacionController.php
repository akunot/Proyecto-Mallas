<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CargaMalla;
use App\Models\MallaCurricular;
use App\Services\LogActividadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AprobacionController extends Controller
{
    /**
     * Obtiene las cargas del usuario autenticado (solo tipo 'malla').
     */
    public function misCargas(Request $request): JsonResponse
    {
        $perPage = $request->per_page ?? 20;
        $cargas = CargaMalla::with(['usuario', 'programa', 'malla', 'usuarioRevisor'])
            ->where('ID_Usuario', $request->user()->ID_Usuario)
            ->where('tipo_carga', 'malla')
            ->orderBy('Creacion_Carga', 'desc')
            ->paginate($perPage);

        return response()->json([
            'data' => $cargas->items(),
            'meta' => [
                'current_page' => $cargas->currentPage(),
                'total' => $cargas->total(),
                'per_page' => $cargas->perPage(),
                'last_page' => $cargas->lastPage(),
            ],
        ]);
    }

    /**
     * Obtiene las cargas pendientes de revisión (solo tipo 'malla', excluye propias).
     */
    public function pendientes(Request $request): JsonResponse
    {
        $perPage = $request->per_page ?? 20;
        $cargas = CargaMalla::with(['usuario', 'programa', 'malla', 'usuarioRevisor'])
            ->where('Estado_Carga', 'pendiente_aprobacion')
            ->where('tipo_carga', 'malla')
            ->orderBy('Creacion_Carga', 'desc')
            ->paginate($perPage);

        return response()->json([
            'data' => $cargas->items(),
            'meta' => [
                'current_page' => $cargas->currentPage(),
                'total' => $cargas->total(),
                'per_page' => $cargas->perPage(),
                'last_page' => $cargas->lastPage(),
            ],
        ]);
    }

    /**
     * Obtiene la malla con todos sus datos para el visualizador.
     */
    public function detalleMalla(int $id): JsonResponse
    {
        $carga = CargaMalla::findOrFail($id);

        if (! $carga->ID_Malla) {
            return response()->json(['data' => null, 'message' => 'No hay malla asociada'], 404);
        }

        $malla = MallaCurricular::with([
            'programa',
            'agrupaciones.asignaturas.requisitos.asignaturaRequerida',
            'agrupaciones.componente',
            'agrupaciones.slots',
        ])->find($carga->ID_Malla);

        if (! $malla) {
            return response()->json(['data' => null, 'message' => 'Malla no encontrada'], 404);
        }

        return response()->json(['data' => $malla]);
    }

    /**
     * Envía una carga a revisión.
     */
    public function enviarRevision(int $id, Request $request): JsonResponse
    {
        $carga = CargaMalla::findOrFail($id);
        $usuario = $request->user();

        $permitidos = ['borrador', 'con_errores', 'rechazado'];
        if (! in_array($carga->Estado_Carga, $permitidos)) {
            return response()->json([
                'message' => 'Error al enviar a revisión',
                'error' => 'La carga debe estar en estado borrador o rechazado para enviar a revisión',
            ], 400);
        }

        if (! $carga->ID_Malla) {
            return response()->json([
                'message' => 'Error al enviar a revisión',
                'error' => 'No existe una malla asociada a esta carga',
            ], 400);
        }

        $updateData = ['Estado_Carga' => 'pendiente_aprobacion'];

        if ($carga->Estado_Carga === 'rechazado') {
            $updateData['Comentario_Revisor'] = null;
            $updateData['ID_Usuario_Revisor'] = null;
            $updateData['Fecha_Revision'] = null;
            $updateData['Finalizacion_Carga'] = null;
        }

        $carga->update($updateData);
        $carga->malla?->update(['Estado' => 'en_revision']);

        LogActividadService::registrar(
            $usuario,
            'ENVIAR_REVISION',
            'carga_malla',
            $carga->ID_Carga,
            ['malla_id' => $carga->ID_Malla, 'programa_id' => $carga->ID_Programa]
        );

        return response()->json([
            'data' => $carga->load(['malla', 'programa', 'usuario']),
            'message' => 'Malla enviada a revisión exitosamente',
        ]);
    }

    /**
     * Aprueba o rechaza una carga.
     */
    public function revisar(int $id, Request $request): JsonResponse
    {
        $request->validate([
            'accion' => 'required|in:aprobar,rechazar',
            'comentario' => 'nullable|string|max:1000',
        ]);

        $carga = CargaMalla::with('malla')->findOrFail($id);
        $usuario = $request->user();
        $accion = $request->input('accion');
        $comentario = $request->input('comentario', '');

        if ($carga->Estado_Carga !== 'pendiente_aprobacion') {
            return response()->json([
                'message' => 'Error en la revisión',
                'error' => 'Solo cargas pendientes de aprobación pueden ser revisadas',
            ], 400);
        }

        if ($accion === 'aprobar') {
            $mallaAnterior = MallaCurricular::where('ID_Programa', $carga->ID_Programa)
                ->where('Es_Vigente', 1)
                ->first();

            if ($mallaAnterior) {
                $mallaAnterior->update([
                    'Es_Vigente' => null,
                    'Fecha_Fin_Vigencia' => now(),
                    'Estado' => 'archivada',
                ]);
            }

            $carga->malla->update([
                'Estado' => 'activa',
                'Es_Vigente' => 1,
                'Fecha_Vigencia' => now(),
            ]);

            $carga->update([
                'Estado_Carga' => 'aprobado',
                'Comentario_Revisor' => $comentario,
                'ID_Usuario_Revisor' => $usuario->ID_Usuario,
                'Fecha_Revision' => now(),
                'Finalizacion_Carga' => now(),
            ]);

            LogActividadService::registrar($usuario, 'APROBAR_MALLA', 'carga_malla', $carga->ID_Carga, [
                'malla_id' => $carga->ID_Malla, 'comentario' => $comentario,
                'malla_anterior_id' => $mallaAnterior?->ID_Malla,
            ]);
        } else {
            $carga->malla->update(['Estado' => 'rechazada']);

            $carga->update([
                'Estado_Carga' => 'rechazado',
                'Comentario_Revisor' => $comentario,
                'ID_Usuario_Revisor' => $usuario->ID_Usuario,
                'Fecha_Revision' => now(),
                'Finalizacion_Carga' => now(),
            ]);

            LogActividadService::registrar($usuario, 'RECHAZAR_MALLA', 'carga_malla', $carga->ID_Carga, [
                'malla_id' => $carga->ID_Malla, 'comentario' => $comentario,
            ]);
        }

        return response()->json([
            'data' => $carga->load(['malla', 'programa', 'usuario', 'usuarioRevisor']),
            'message' => $accion === 'aprobar' ? 'Malla aprobada exitosamente' : 'Malla rechazada',
        ]);
    }
}
