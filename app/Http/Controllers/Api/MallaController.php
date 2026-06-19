<?php

namespace App\Http\Controllers\Api;

use App\Models\Agrupacion;
use App\Models\AgrupacionAsignatura;
use App\Models\Componente;
use App\Models\MallaCurricular;
use App\Models\ProgramaElectiva;
use App\Models\Requisito;
use App\Models\SlotAgrupacion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class MallaController extends Controller
{
    /**
     * Endpoint público: devuelve la malla activa de un programa con
     * exactamente la misma estructura JSON que consume Visualizer.tsx
     * (agrupaciones -> asignaturas con pivot, slots, componente, requisitos).
     */
    public function publicVisualizer(Request $request, int $id): JsonResponse
    {
        $payload = self::buildPublicVisualizerPayload($id);

        if (!$payload) {
            return response()->json([
                'message' => 'No hay una malla activa disponible para este programa.',
            ], 404);
        }

        return response()->json($payload);
    }

    /**
     * Construye el payload de la malla (estructura "estilo Visualizer") para un
     * programa dado. Se expone como helper reutilizable para que routes/web.php
     * pueda generar la misma estructura sin duplicar la lógica de consulta/transformación.
     *
     * @return array<string, mixed>|null
     */
    public static function buildPublicVisualizerPayload(int $idPrograma): ?array
    {
        $malla = MallaCurricular::with([
            'programa',
            'normativa',
            'agrupaciones' => function ($query) {
                $query->orderBy('ID_Agrupacion');
            },
            'agrupaciones.asignaturas' => function ($query) {
                $query->orderBy('agrupacion_asignatura.Orden');
            },
            'agrupaciones.asignaturas.requisitos.asignaturaRequerida',
            'agrupaciones.componente',
            'agrupaciones.slots',
        ])
            ->where('ID_Programa', $idPrograma)
            ->whereIn('Estado', ['activa', 'ACTIVO'])
            ->orderBy('Fecha_Vigencia', 'desc')
            ->first();

        if (!$malla) {
            return null;
        }

        return [
            'ID_Malla'    => $malla->ID_Malla,
            'Codigo_Plan' => $malla->Codigo_Plan,
            'programa'    => [
                'ID_Programa'     => $malla->programa->ID_Programa ?? $idPrograma,
                'Nombre_Programa' => $malla->programa->Nombre_Programa ?? '',
            ],
            'normativa' => $malla->normativa ? [
                'Tipo_Normativa'   => $malla->normativa->Tipo_Normativa,
                'Numero_Normativa' => $malla->normativa->Numero_Normativa,
                'Instancia'        => $malla->normativa->Instancia,
                'Anio_Normativa'   => $malla->normativa->Anio_Normativa,
            ] : null,
            'agrupaciones' => $malla->agrupaciones->map(function ($agrupacion) {
                return [
                    'ID_Agrupacion'       => $agrupacion->ID_Agrupacion,
                    'Nombre_Agrupacion'   => $agrupacion->Nombre_Agrupacion,
                    'ID_Componente'       => $agrupacion->ID_Componente,
                    'Creditos_Requeridos' => $agrupacion->Creditos_Requeridos,
                    'Es_Obligatoria'      => (bool) $agrupacion->Es_Obligatoria,
                    'componente' => $agrupacion->componente ? [
                        'Nombre_Componente' => $agrupacion->componente->Nombre_Componente,
                    ] : null,
                    'asignaturas' => $agrupacion->asignaturas->map(function ($asignatura) {
                        return [
                            'ID_Asignatura'       => $asignatura->ID_Asignatura,
                            'Nombre_Asignatura'   => $asignatura->Nombre_Asignatura,
                            'Codigo_Asignatura'   => $asignatura->Codigo_Asignatura,
                            'Creditos_Asignatura' => $asignatura->Creditos_Asignatura,
                            'Horas_Presencial'    => $asignatura->Horas_Presencial ?? 0,
                            'Horas_Estudiante'    => $asignatura->Horas_Estudiante ?? 0,
                            'requisitos'          => $asignatura->requisitos->map(fn ($r) => [
                                'ID_Asignatura_Requerida' => $r->ID_Asignatura_Requerida,
                                'Tipo_Requisito'          => $r->Tipo_Requisito,
                                'Descripcion_Requisito'   => $r->Descripcion_Requisito,
                                'Valor_Creditos'          => $r->Valor_Creditos,
                                'asignatura_requerida'    => $r->asignaturaRequerida ? [
                                    'Nombre_Asignatura' => $r->asignaturaRequerida->Nombre_Asignatura,
                                    'Codigo_Asignatura' => $r->asignaturaRequerida->Codigo_Asignatura,
                                ] : null,
                            ])->values(),
                            'ID_Componente' => $asignatura->ID_Componente ?? null,
                            'pivot' => [
                                'Semestre_Sugerido' => $asignatura->pivot->Semestre_Sugerido,
                                'Tipo_Asignatura'   => $asignatura->pivot->Tipo_Asignatura,
                                'Orden'             => $asignatura->pivot->Orden,
                            ],
                        ];
                    })->values(),
                    'slots' => $agrupacion->slots->map(function ($slot) use ($agrupacion) {
                        return [
                            'ID_Slot'           => $slot->ID_Slot,
                            'Nombre_Slot'       => $slot->Nombre_Slot,
                            'Tipo_Slot'         => $slot->Tipo_Slot,
                            'Semestre'          => $slot->Semestre,
                            'Orden'             => $slot->Orden,
                            'Nombre_Agrupacion' => $agrupacion->Nombre_Agrupacion,
                        ];
                    })->values(),
                ];
            })->values(),
        ];
    }

    public function reordenar(Request $request, int $mallaId): JsonResponse
    {
        $malla = MallaCurricular::findOrFail($mallaId);

        $validated = $request->validate([
            'cambios'                        => 'sometimes|array',
            'cambios.*.ID_Asignatura'        => 'required|integer|exists:asignaturas,ID_Asignatura',
            'cambios.*.Semestre_Sugerido'    => 'required|integer|min:0|max:20',
            'cambios.*.Orden'                => 'required|integer|min:0',
            'cambios_slots'                  => 'sometimes|array',
            'cambios_slots.*.ID_Slot'        => 'required|integer|exists:slots_agrupacion,ID_Slot',
            'cambios_slots.*.Semestre'       => 'required|integer|min:0|max:20',
            'cambios_slots.*.Orden'          => 'required|integer|min:0',
        ]);

        DB::transaction(function () use ($validated, $malla) {
            foreach ($validated['cambios'] ?? [] as $cambio) {
                AgrupacionAsignatura::where('ID_Malla', $malla->ID_Malla)
                    ->where('ID_Asignatura', $cambio['ID_Asignatura'])
                    ->update([
                        'Semestre_Sugerido' => $cambio['Semestre_Sugerido'],
                        'Orden'             => $cambio['Orden'],
                    ]);
            }

            foreach ($validated['cambios_slots'] ?? [] as $cambio) {
                SlotAgrupacion::where('ID_Slot', $cambio['ID_Slot'])
                    ->update([
                        'Semestre' => $cambio['Semestre'],
                        'Orden'    => $cambio['Orden'],
                    ]);
            }
        });

        return response()->json(['ok' => true]);
    }

    public function optativas(Request $request, int $mallaId): JsonResponse
    {
        $malla = MallaCurricular::findOrFail($mallaId);
        $slotId = $request->query('slot_id');

        $slot = null;
        if ($slotId !== null) {
            $slot = SlotAgrupacion::with('agrupacion')->find($slotId);
            if (!$slot) {
                return response()->json([
                    'message' => 'Slot de optativa no encontrado.',
                    'data' => [],
                ], 404);
            }
        }

        $fallbackGroupName = $slot?->agrupacion?->Nombre_Agrupacion ?? 'Optativas';
        $fallbackGroupId = $slot?->agrupacion?->ID_Agrupacion ?? $slot?->ID_Agrupacion;

        $optativaAsignaturaIds = ProgramaElectiva::where('ID_Programa', $malla->ID_Programa)
            ->pluck('ID_Asignatura')
            ->all();

        if (!empty($optativaAsignaturaIds)) {
            $this->ensureOptativasLinkedToMalla($malla, $slot, $optativaAsignaturaIds);
        }

        $query = ProgramaElectiva::query()
            ->where('programa_electivas.ID_Programa', $malla->ID_Programa)
            ->join('asignaturas', 'programa_electivas.ID_Asignatura', '=', 'asignaturas.ID_Asignatura')
            ->leftJoin('agrupacion_asignatura', function ($join) use ($malla) {
                $join->on('asignaturas.ID_Asignatura', '=', 'agrupacion_asignatura.ID_Asignatura')
                     ->where('agrupacion_asignatura.ID_Malla', $malla->ID_Malla);
            })
            ->leftJoin('agrupaciones', function ($join) use ($malla) {
                $join->on('agrupacion_asignatura.ID_Agrupacion', '=', 'agrupaciones.ID_Agrupacion')
                     ->where('agrupaciones.ID_Malla', $malla->ID_Malla);
            })
            ->where(function ($query) use ($malla) {
                $query->whereNull('agrupaciones.ID_Agrupacion')
                    ->orWhere('agrupaciones.ID_Malla', $malla->ID_Malla);
            })
            ->where(function ($query) {
                $query->whereNull('agrupacion_asignatura.Tipo_Asignatura')
                    ->orWhereIn('agrupacion_asignatura.Tipo_Asignatura', ['electiva', 'optativa']);
            });

        if ($slot && $slot->agrupacion) {
            $query->where('agrupacion_asignatura.ID_Agrupacion', $slot->agrupacion->ID_Agrupacion);
        }

        $optativas = $query
            ->orderBy('agrupaciones.Nombre_Agrupacion')
            ->orderBy('asignaturas.Nombre_Asignatura')
            ->get();

        $requisitosByAsignatura = Requisito::with('asignaturaRequerida')
            ->where('ID_Programa', $malla->ID_Programa)
            ->whereIn('ID_Asignatura', $optativas->pluck('ID_Asignatura')->unique()->all())
            ->get()
            ->groupBy('ID_Asignatura');

        $optativas = $optativas
            ->map(function ($item) use ($fallbackGroupId, $fallbackGroupName, $requisitosByAsignatura) {
                $groupId = $item->ID_Agrupacion ?? $fallbackGroupId;
                $groupName = $item->Nombre_Agrupacion ?? $fallbackGroupName;

                return [
                    'ID_Asignatura' => $item->ID_Asignatura,
                    'Codigo_Asignatura' => $item->Codigo_Asignatura,
                    'Nombre_Asignatura' => $item->Nombre_Asignatura,
                    'Creditos_Asignatura' => $item->Creditos_Asignatura,
                    'ID_Agrupacion' => $groupId,
                    'Nombre_Agrupacion' => $groupName,
                    'requisitos' => $requisitosByAsignatura[$item->ID_Asignatura] ?? [],
                ];
            })
            ->groupBy('Nombre_Agrupacion')
            ->map(function ($items, $groupName) {
                $first = $items->first();

                return [
                    'ID_Agrupacion' => $first['ID_Agrupacion'],
                    'Nombre_Agrupacion' => $groupName,
                    'asignaturas' => $items->values()->all(),
                ];
            })
            ->values();

        return response()->json([
            'data' => $optativas,
            'meta' => [
                'total' => $optativas->reduce(fn ($sum, $group) => $sum + count($group['asignaturas']), 0),
                'groups' => $optativas->count(),
            ],
        ]);
    }

    private function ensureOptativasLinkedToMalla(MallaCurricular $malla, ?SlotAgrupacion $slot, array $asignaturaIds): void
    {
        if (empty($asignaturaIds)) {
            return;
        }

        $agrupacionId = null;
        if ($slot?->agrupacion) {
            $agrupacionId = $slot->agrupacion->ID_Agrupacion;
        } else {
            $componente = Componente::firstOrCreate(['Nombre_Componente' => 'Libre Elección']);
            $agrupacion = Agrupacion::firstOrCreate(
                [
                    'ID_Malla' => $malla->ID_Malla,
                    'ID_Componente' => $componente->ID_Componente,
                    'Nombre_Agrupacion' => 'Optativas',
                ],
                [
                    'Creditos_Requeridos' => null,
                    'Creditos_Maximos' => null,
                    'Es_Obligatoria' => 0,
                ]
            );
            $agrupacionId = $agrupacion->ID_Agrupacion;
        }

        if (!$agrupacionId) {
            return;
        }

        $existingAsignaturas = AgrupacionAsignatura::where('ID_Malla', $malla->ID_Malla)
            ->where('ID_Agrupacion', $agrupacionId)
            ->whereIn('ID_Asignatura', $asignaturaIds)
            ->pluck('ID_Asignatura')
            ->all();

        $missingAsignaturas = array_diff($asignaturaIds, $existingAsignaturas);
        if (empty($missingAsignaturas)) {
            return;
        }

        $now = now();
        $rows = array_map(fn ($id) => [
            'ID_Malla' => $malla->ID_Malla,
            'ID_Agrupacion' => $agrupacionId,
            'ID_Asignatura' => $id,
            'Tipo_Asignatura' => 'optativa',
            'created_at' => $now,
            'updated_at' => $now,
        ], $missingAsignaturas);

        DB::table('agrupacion_asignatura')->upsert(
            $rows,
            ['ID_Agrupacion', 'ID_Asignatura', 'ID_Malla'],
            ['Tipo_Asignatura', 'updated_at']
        );
    }
}