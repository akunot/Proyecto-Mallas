<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\MallaCurricular;
use Illuminate\Support\Facades\Cache;

final class MallaVisualizerService
{
    private const CACHE_TTL = 86400;

    public function forPrograma(int $idPrograma): ?array
    {
        $cacheKey = "malla_visualizer:programa:{$idPrograma}";

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($idPrograma): ?array {
            $malla = MallaCurricular::with($this->eagerLoads($idPrograma))
                ->where('ID_Programa', $idPrograma)
                ->whereIn('Estado', ['activa', 'ACTIVA'])
                ->orderBy('Fecha_Vigencia', 'desc')
                ->first();

            if (! $malla) {
                return null;
            }

            return $this->toPayload($malla);
        });
    }

    public function byVersion(int $versionId): ?array
    {
        $cacheKey = "malla_visualizer:v:{$versionId}";

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($versionId): ?array {
            // Misma regla de visibilidad que publicHistory(): una malla
            // archivada solo es pública cuando Visible_Historial está
            // activo; la activa siempre lo es. Esto evita que una versión
            // ocultada siga accesible por URL directa.
            $programaId = MallaCurricular::whereIn('Estado', ['activa', 'archivada'])
                ->where(function ($q): void {
                    $q->where('Estado', '!=', 'archivada')
                        ->orWhere('Visible_Historial', 1);
                })
                ->where('ID_Malla', $versionId)
                ->value('ID_Programa');

            if (! $programaId) {
                return null;
            }

            $malla = MallaCurricular::with($this->eagerLoads($programaId))
                ->whereIn('Estado', ['activa', 'archivada'])
                ->where(function ($q): void {
                    $q->where('Estado', '!=', 'archivada')
                        ->orWhere('Visible_Historial', 1);
                })
                ->find($versionId);

            if (! $malla) {
                return null;
            }

            return $this->toPayload($malla);
        });
    }

    public function forgetProgramaCache(int $idPrograma): void
    {
        Cache::forget("malla_visualizer:programa:{$idPrograma}");
    }

    public function forgetVersionCache(int $versionId): void
    {
        Cache::forget("malla_visualizer:v:{$versionId}");
    }

    public function forgetAll(int $idPrograma, ?int $versionId = null): void
    {
        $this->forgetProgramaCache($idPrograma);
        if ($versionId !== null) {
            $this->forgetVersionCache($versionId);
        }
    }

    /**
     * @return array<int, mixed>
     */
    public function eagerLoads(?int $idPrograma = null): array
    {
        return [
            'programa',
            'programa.facultad',
            'normativa',
            'agrupaciones' => fn ($q) => $q->orderBy('ID_Agrupacion'),
            'agrupaciones.asignaturas' => fn ($q) => $q->orderBy('agrupacion_asignatura.Orden'),
            'agrupaciones.asignaturas.requisitos' => $idPrograma
                ? fn ($q) => $q->where('ID_Programa', $idPrograma)
                : fn ($q) => $q,
            'agrupaciones.asignaturas.requisitos.asignaturaRequerida',
            'agrupaciones.componente',
            'agrupaciones.slots',
        ];
    }

    /**
     * Ordinal denso (1, 2, 3...) que ocupa la malla en el historial público
     * de su programa: cantidad de versiones visibles con Version_Numero
     * menor o igual al de esta malla. Debe mantenerse consistente con la
     * numeración calculada en MallaController::publicHistory.
     */
    public function versionPublicadaOrdinal(MallaCurricular $malla): int
    {
        if (! $malla->ID_Programa) {
            return $malla->Version_Numero;
        }

        return MallaCurricular::where('ID_Programa', $malla->ID_Programa)
            ->whereIn('Estado', ['activa', 'archivada'])
            ->where(function ($q): void {
                $q->where('Estado', '!=', 'archivada')
                    ->orWhere('Visible_Historial', 1);
            })
            ->where('Version_Numero', '<=', $malla->Version_Numero)
            ->count();
    }

    /**
     * @return array<string, mixed>
     */
    public function toPayload(MallaCurricular $malla): array
    {
        $idPrograma = $malla->programa?->ID_Programa ?? 0;

        return [
            'ID_Malla' => $malla->ID_Malla,
            'Codigo_Plan' => $malla->Codigo_Plan,
            'programa' => [
                'ID_Programa' => $idPrograma,
                'Nombre_Programa' => $malla->programa?->Nombre_Programa ?? '',
                'Creditos_Totales' => $malla->programa?->Creditos_Totales,
                'Duracion_Semestres' => $malla->programa?->Duracion_Semestres,
                'Nivel_Formacion' => $malla->programa?->Nivel_Formacion,
                'Codigo_SNIES' => $malla->programa?->Codigo_SNIES,
                'Titulo_Otorgado' => $malla->programa?->Titulo_Otorgado,
            ],
            'normativa' => $malla->normativa ? [
                'Tipo_Normativa' => $malla->normativa->Tipo_Normativa,
                'Numero_Normativa' => $malla->normativa->Numero_Normativa,
                'Instancia' => $malla->normativa->Instancia,
                'Anio_Normativa' => $malla->normativa->Anio_Normativa,
                'Url_Normativa' => $malla->normativa->Url_Normativa,
            ] : null,
            'agrupaciones' => $malla->agrupaciones->map(function ($agrupacion): array {
                return [
                    'ID_Agrupacion' => $agrupacion->ID_Agrupacion,
                    'Nombre_Agrupacion' => $agrupacion->Nombre_Agrupacion,
                    'ID_Componente' => $agrupacion->ID_Componente,
                    'Creditos_Requeridos' => $agrupacion->Creditos_Requeridos,
                    'Es_Obligatoria' => (bool) $agrupacion->Es_Obligatoria,
                    'componente' => $agrupacion->componente ? [
                        'Nombre_Componente' => $agrupacion->componente->Nombre_Componente,
                    ] : null,
                    'asignaturas' => $agrupacion->asignaturas->map(function ($asignatura): array {
                        return [
                            'ID_Asignatura' => $asignatura->ID_Asignatura,
                            'Nombre_Asignatura' => $asignatura->Nombre_Asignatura,
                            'Codigo_Asignatura' => $asignatura->Codigo_Asignatura,
                            'Creditos_Asignatura' => $asignatura->Creditos_Asignatura,
                            'Horas_Presencial' => $asignatura->Horas_Presencial ?? 0,
                            'Horas_Estudiante' => $asignatura->Horas_Estudiante ?? 0,
                            'requisitos' => $asignatura->requisitos
                                ->values()
                                ->map(fn ($r) => [
                                    'ID_Asignatura_Requerida' => $r->ID_Asignatura_Requerida,
                                    'Tipo_Requisito' => $r->Tipo_Requisito,
                                    'Descripcion_Requisito' => $r->Descripcion_Requisito,
                                    'Valor_Creditos' => $r->Valor_Creditos,
                                    'asignatura_requerida' => $r->asignaturaRequerida ? [
                                        'Nombre_Asignatura' => $r->asignaturaRequerida->Nombre_Asignatura,
                                        'Codigo_Asignatura' => $r->asignaturaRequerida->Codigo_Asignatura,
                                    ] : null,
                                ])
                                ->all(),
                            'ID_Componente' => $asignatura->ID_Componente,
                            'pivot' => [
                                'Semestre_Sugerido' => $asignatura->pivot->Semestre_Sugerido,
                                'Tipo_Asignatura' => $asignatura->pivot->Tipo_Asignatura,
                                'Orden' => $asignatura->pivot->Orden,
                            ],
                        ];
                    })->values()->all(),
                    'slots' => $agrupacion->slots->map(function ($slot) use ($agrupacion): array {
                        $tipoSlot = strtolower((string) ($slot->Tipo_Slot ?? ''));

                        return [
                            'ID_Slot' => $slot->ID_Slot,
                            'Nombre_Slot' => $slot->Nombre_Slot,
                            'Tipo_Slot' => in_array($tipoSlot, ['optativa', 'libre', 'nivelatorio'], true) ? $tipoSlot : 'libre',
                            'Semestre' => $slot->Semestre,
                            'Orden' => $slot->Orden,
                            'Nombre_Agrupacion' => $agrupacion->Nombre_Agrupacion,
                        ];
                    })->values()->all(),
                ];
            })->values()->all(),
        ];
    }
}
