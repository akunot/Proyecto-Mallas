<?php

namespace App\Services;

use App\Models\CargaMalla;
use App\Models\LogActividad;
use App\Models\MallaCurricular;
use App\Models\Usuario;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class MallaAprobacionService
{
    /**
     * Envía una malla a revisión.
     */
    public function enviarRevision(CargaMalla $carga, Usuario $usuario): CargaMalla
    {
        // Validar que la malla esté en un estado que permita enviar a revisión
        // Puede ser 'borrador' (procesada sin errores) o 'con_errores' (procesada con errores pero la malla ya fue creada)
        $estadosPermitidos = ['borrador', 'con_errores'];
        if (! in_array($carga->Estado_Carga, $estadosPermitidos)) {
            throw new \Exception('La carga debe estar en estado borrador para enviar a revisión');
        }

        // Validar que exista una malla asociada
        if (! $carga->ID_Malla) {
            throw new \Exception('No existe una malla asociada a esta carga');
        }

        return DB::transaction(function () use ($carga, $usuario) {
            // Actualizar estado
            $carga->update([
                'Estado_Carga' => 'pendiente_aprobacion',
            ]);

            // Actualizar estado de la malla
            $malla = $carga->malla;
            $malla->update([
                'Estado' => 'en_revision',
            ]);

            // Registrar log
            $this->registrarLog(
                $usuario,
                'ENVIAR_REVISION',
                'carga_malla',
                $carga->ID_Carga,
                [
                    'malla_id' => $carga->ID_Malla,
                    'programa_id' => $carga->ID_Programa,
                    'normativa_id' => $carga->ID_Normativa,
                ]
            );

            return $carga->refresh();
        });
    }

    /**
     * Aprueba una malla.
     */
    public function aprobarMalla(CargaMalla $carga, Usuario $revisor, string $comentario): CargaMalla
    {
        // Validar que el revisor sea diferente al usuario que cargó
        if ($carga->ID_Usuario === $revisor->ID_Usuario) {
            throw new \Exception('El mismo usuario que cargó la malla no puede aprobarla');
        }

        // Validar que la malla esté pendiente de aprobación
        if ($carga->Estado_Carga !== 'pendiente_aprobacion') {
            throw new \Exception('La malla no está pendiente de aprobación');
        }

        return DB::transaction(function () use ($carga, $revisor, $comentario) {
            $mallaNueva = $carga->malla;
            $programaId = $carga->ID_Programa;

            // Buscar y archivar la malla vigente anterior
            $mallaVigenteAnterior = MallaCurricular::where('ID_Programa', $programaId)
                ->where('Es_Vigente', 1)
                ->first();

            if ($mallaVigenteAnterior) {
                // Archivar malla anterior
                $mallaVigenteAnterior->update([
                    'Es_Vigente' => null,
                    'Fecha_Fin_Vigencia' => now(),
                    'Estado' => 'archivada',
                ]);
            }

            // Activar nueva malla
            $mallaNueva->update([
                'Estado' => 'activa',
                'Es_Vigente' => 1,
                'Fecha_Vigencia' => now(),
            ]);

            // Actualizar carga
            $carga->update([
                'Estado_Carga' => 'aprobado',
                'Comentario_Revisor' => $comentario,
                'ID_Usuario_Revisor' => $revisor->ID_Usuario,
                'Fecha_Revision' => now(),
                'Finalizacion_Carga' => now(),
            ]);

            // Registrar logs
            $this->registrarLog(
                $revisor,
                'APROBAR_MALLA',
                'carga_malla',
                $carga->ID_Carga,
                [
                    'malla_id' => $mallaNueva->ID_Malla,
                    'malla_anterior_id' => $mallaVigenteAnterior?->ID_Malla,
                    'comentario' => $comentario,
                ]
            );

            if ($mallaVigenteAnterior) {
                $this->registrarLog(
                    $revisor,
                    'ARCHIVAR_MALLA',
                    'malla_curricular',
                    $mallaVigenteAnterior->ID_Malla,
                    [
                        'motivo' => 'Nueva malla aprobada',
                        'nueva_malla_id' => $mallaNueva->ID_Malla,
                    ]
                );
            }

            $this->registrarLog(
                $revisor,
                'ACTIVAR_MALLA',
                'malla_curricular',
                $mallaNueva->ID_Malla,
                [
                    'programa_id' => $programaId,
                    'carga_id' => $carga->ID_Carga,
                ]
            );

            return $carga->refresh();
        });
    }

    /**
     * Rechaza una malla.
     */
    public function rechazarMalla(CargaMalla $carga, Usuario $revisor, string $comentario): CargaMalla
    {
        // Validar que el revisor sea diferente al usuario que cargó
        if ($carga->ID_Usuario === $revisor->ID_Usuario) {
            throw new \Exception('El mismo usuario que cargó la malla no puede rechazarla');
        }

        // Validar que la malla esté pendiente de aprobación
        if ($carga->Estado_Carga !== 'pendiente_aprobacion') {
            throw new \Exception('La malla no está pendiente de aprobación');
        }

        return DB::transaction(function () use ($carga, $revisor, $comentario) {
            $malla = $carga->malla;

            // Rechazar malla
            $malla->update([
                'Estado' => 'rechazada',
            ]);

            // Actualizar carga
            $carga->update([
                'Estado_Carga' => 'rechazado',
                'Comentario_Revisor' => $comentario,
                'ID_Usuario_Revisor' => $revisor->ID_Usuario,
                'Fecha_Revision' => now(),
                'Finalizacion_Carga' => now(),
            ]);

            // Registrar log
            $this->registrarLog(
                $revisor,
                'RECHAZAR_MALLA',
                'carga_malla',
                $carga->ID_Carga,
                [
                    'malla_id' => $malla->ID_Malla,
                    'comentario' => $comentario,
                ]
            );

            $this->registrarLog(
                $revisor,
                'RECHAZAR_MALLA',
                'malla_curricular',
                $malla->ID_Malla,
                [
                    'carga_id' => $carga->ID_Carga,
                    'comentario' => $comentario,
                ]
            );

            return $carga->refresh();
        });
    }

    /**
     * Obtiene las mallas que un usuario puede revisar.
     */
    public function obtenerMallasParaRevisar(Usuario $usuario): Collection
    {
        return CargaMalla::with(['malla', 'usuario', 'programa'])
            ->where('Estado_Carga', 'pendiente_aprobacion')
            ->where('ID_Usuario', '!=', $usuario->ID_Usuario)
            ->orderBy('Creacion_Carga', 'desc')
            ->get();
    }

    /**
     * Obtiene las mallas que un usuario ha cargado.
     */
    public function obtenerMisCargas(Usuario $usuario): Collection
    {
        return CargaMalla::with(['malla', 'usuarioRevisor', 'programa'])
            ->where('ID_Usuario', $usuario->ID_Usuario)
            ->orderBy('Creacion_Carga', 'desc')
            ->get();
    }

    /**
     * Verifica si un usuario puede revisar una malla específica.
     */
    public function puedeRevisar(Usuario $usuario, CargaMalla $carga): bool
    {
        return $carga->Estado_Carga === 'pendiente_aprobacion' &&
               $carga->ID_Usuario !== $usuario->ID_Usuario;
    }

    /**
     * Verifica si un usuario puede enviar a revisión una malla específica.
     */
    public function puedeEnviarRevision(Usuario $usuario, CargaMalla $carga): bool
    {
        $estadosPermitidos = ['borrador', 'con_errores'];

        return in_array($carga->Estado_Carga, $estadosPermitidos) &&
               $carga->ID_Malla !== null;
    }

    /**
     * Obtiene el historial de versiones de un programa.
     */
    public function obtenerHistorialPrograma(int $programaId): Collection
    {
        return MallaCurricular::where('ID_Programa', $programaId)
            ->with(['normativa', 'carga.usuario', 'carga.usuarioRevisor'])
            ->orderBy('Version_Numero', 'desc')
            ->get();
    }

    /**
     * Compara dos versiones específicas de malla.
     */
    public function compararVersiones(MallaCurricular $malla1, MallaCurricular $malla2): array
    {
        $diffService = new MallaDiffService;

        // Crear una carga temporal para generar diffs
        $cargaTemporal = new CargaMalla([
            'ID_Carga' => 0, // Temporal
            'ID_Programa' => $malla1->ID_Programa,
        ]);

        // Generar diffs entre las dos versiones
        $diffService->generarDiffs($malla1, $malla2, $cargaTemporal);

        return $diffService->obtenerDiffsAgrupados($cargaTemporal);
    }

    /**
     * Registra una actividad en el log.
     */
    private function registrarLog(Usuario $usuario, string $accion, string $entidad, int $entidadId, array $detalle = []): void
    {
        LogActividad::create([
            'ID_Usuario' => $usuario->ID_Usuario,
            'Accion_Log' => $accion,
            'Entidad_Log' => $entidad,
            'Entidad_ID_Log' => $entidadId,
            'Detalle_Log' => array_merge($detalle, [
                'ip' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]),
            'IP_Origen_Log' => request()->ip(),
        ]);
    }

    /**
     * Obtiene estadísticas de aprobación por programa.
     */
    public function obtenerEstadisticasPrograma(int $programaId): array
    {
        $cargas = CargaMalla::where('ID_Programa', $programaId)->get();

        return [
            'total_cargas' => $cargas->count(),
            'aprobadas' => $cargas->where('Estado_Carga', 'aprobado')->count(),
            'rechazadas' => $cargas->where('Estado_Carga', 'rechazado')->count(),
            'pendientes' => $cargas->where('Estado_Carga', 'pendiente_aprobacion')->count(),
            'en_borrador' => $cargas->where('Estado_Carga', 'borrador')->count(),
            'con_errores' => $cargas->where('Estado_Carga', 'con_errores')->count(),
            'tiempo_promedio_aprobacion' => $this->calcularTiempoPromedioAprobacion($cargas),
        ];
    }

    /**
     * Calcula el tiempo promedio de aprobación en días.
     */
    private function calcularTiempoPromedioAprobacion(Collection $cargas): float
    {
        $aprobadas = $cargas->where('Estado_Carga', 'aprobado')
            ->whereNotNull('Fecha_Revision')
            ->whereNotNull('Creacion_Carga');

        if ($aprobadas->isEmpty()) {
            return 0;
        }

        $totalDias = $aprobadas->sum(function ($carga) {
            return $carga->Fecha_Revision->diffInDays($carga->Creacion_Carga);
        });

        return round($totalDias / $aprobadas->count(), 1);
    }
}
