<?php

namespace App\Http\Controllers\Api;

use App\Models\Agrupacion;
use App\Models\AgrupacionAsignatura;
use App\Models\Asignatura;
use App\Models\CargaMalla;
use App\Models\LogActividad;
use App\Models\MallaCurricular;
use App\Models\PlantillaAgrupacion;
use App\Models\Programa;
use App\Models\ProgramaElectiva;
use App\Models\Requisito;
use App\Models\SlotAgrupacion;
use App\Services\MallaVisualizerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
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
        $payload = app(MallaVisualizerService::class)->forPrograma($id);

        if (! $payload) {
            return response()->json([
                'message' => 'No hay una malla activa disponible para este programa.',
            ], 404);
        }

        return response()->json($payload);
    }

    /**
     * Endpoint público: retorna una versión específica de malla por su ID.
     */
    public function publicShow(int $id): JsonResponse
    {
        $payload = app(MallaVisualizerService::class)->byVersion($id);

        if (! $payload) {
            return response()->json([
                'message' => 'Malla no encontrada.',
            ], 404);
        }

        return response()->json($payload);
    }

    /**
     * Endpoint público: retorna SOLO la malla vigente de un programa.
     *
     * Criterio único: Es_Vigente = 1
     * Garantiza exactamente una malla por programa (o ninguna).
     */
    public function publicVigente(int $programaId): JsonResponse
    {
        $programa = Programa::find($programaId);

        if (! $programa) {
            return response()->json(['message' => 'Programa no encontrado.'], 404);
        }

        $mallaVigente = MallaCurricular::where('ID_Programa', $programaId)
            ->where('Es_Vigente', 1)
            ->first([
                'ID_Malla', 'Version_Numero', 'Version_Etiqueta',
                'Estado', 'Es_Vigente', 'Fecha_Vigencia',
                'Fecha_Fin_Vigencia', 'created_at',
            ]);

        if (! $mallaVigente) {
            return response()->json(['message' => 'No hay una malla vigente disponible.'], 404);
        }

        return response()->json(['data' => $mallaVigente]);
    }

    /**
     * Endpoint público: historial de versiones completadas (activa + archivada) de un programa.
     *
     * Retorna solo mallas en estado 'activa' o 'archivada' (exluye borradores, rechazadas).
     */
    public function publicHistory(int $programaId): JsonResponse
    {
        $programa = Programa::find($programaId);

        if (! $programa) {
            return response()->json(['message' => 'Programa no encontrado.'], 404);
        }

        $versiones = MallaCurricular::where('ID_Programa', $programaId)
            ->whereIn('Estado', ['activa', 'archivada'])
            ->orderBy('Version_Numero', 'desc')
            ->get([
                'ID_Malla', 'Version_Numero', 'Version_Etiqueta',
                'Estado', 'Es_Vigente', 'Fecha_Vigencia',
                'Fecha_Fin_Vigencia', 'created_at',
            ]);

        return response()->json(['data' => $versiones]);
    }

    /**
     * Endpoint público: historial legible de cambios de requisitos de un programa.
     *
     * Se apoya en la auditoría (logs_actividad) registrada por ExcelParserService
     * durante el reprocesamiento de mallas. Es la pieza complementaria que
     * publicDiff() no puede cubrir: requisitos corregidos en asignaturas que
     * persisten entre dos versiones de malla del mismo programa.
     */
    public function publicHistorialRequisitos(int $programaId): JsonResponse
    {
        $programa = Programa::find($programaId);

        if (! $programa) {
            return response()->json(['message' => 'Programa no encontrado.'], 404);
        }

        $logs = LogActividad::where('Entidad_Log', 'requisitos')
            ->whereIn('Accion_Log', ['INSERT_REQUISITO', 'UPDATE_REQUISITO', 'DELETE_REQUISITO_OBSOLETO'])
            ->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(Detalle_Log, '$.ID_Programa')) = ?", [(string) $programaId])
            ->orderByDesc('Creacion_Log')
            ->orderByDesc('ID_Log') // Desempate determinista dentro del mismo segundo
            ->get();

        if ($logs->isEmpty()) {
            return response()->json(['data' => []]);
        }

        // Resolver en consultas únicas las asignaturas (afectada y requeridas)
        // y las cargas con su normativa.
        $asignaturaIds = $logs
            ->map(fn (LogActividad $log) => (int) ($log->Detalle_Log['ID_Asignatura'] ?? 0))
            ->filter()
            ->unique();

        $requeridaIds = $logs->flatMap(function (LogActividad $log) {
            $ids = [];
            foreach (['valor_anterior', 'valor_nuevo'] as $campo) {
                $requisito = $log->Detalle_Log[$campo] ?? null;
                $id = $requisito['ID_Asignatura_Requerida'] ?? null;
                if ($id) {
                    $ids[] = (int) $id;
                }
            }

            return $ids;
        })->unique();

        $asignaturas = Asignatura::whereIn(
            'ID_Asignatura',
            $asignaturaIds->concat($requeridaIds)->unique()->values()->all()
        )->get()->keyBy('ID_Asignatura');

        $cargaIds = $logs
            ->map(fn (LogActividad $log) => (int) ($log->Detalle_Log['ID_Carga'] ?? 0))
            ->filter()
            ->unique();

        $cargas = CargaMalla::with('normativa')
            ->whereIn('ID_Carga', $cargaIds->values()->all())
            ->get()
            ->keyBy('ID_Carga');

        $data = $logs->map(function (LogActividad $log) use ($asignaturas, $cargas) {
            $detalle = $log->Detalle_Log;

            $normativa = null;
            $carga = $cargas->get((int) ($detalle['ID_Carga'] ?? 0));
            if ($carga) {
                $normativa = $carga->normativa;
            }

            return [
                'fecha' => Carbon::parse($log->Creacion_Log)->toIso8601String(),
                'asignatura_afectada' => $this->asignaturaPublica(
                    $asignaturas,
                    (int) ($detalle['ID_Asignatura'] ?? 0)
                ),
                'tipo_cambio' => $log->Accion_Log,
                'resumen' => $this->describirCambioRequisito(
                    $log->Accion_Log,
                    $detalle['valor_anterior'] ?? null,
                    $detalle['valor_nuevo'] ?? null,
                    $asignaturas
                ),
                'normativa' => $normativa ? [
                    'Tipo_Normativa' => $normativa->Tipo_Normativa,
                    'Numero_Normativa' => $normativa->Numero_Normativa,
                    'Anio_Normativa' => $normativa->Anio_Normativa,
                ] : null,
            ];
        })->values();

        return response()->json(['data' => $data]);
    }

    private function asignaturaPublica(Collection $asignaturas, int $id): ?array
    {
        $asignatura = $asignaturas->get($id);
        if (! $asignatura) {
            return null;
        }

        return [
            'ID_Asignatura' => $asignatura->ID_Asignatura,
            'Codigo_Asignatura' => $asignatura->Codigo_Asignatura,
            'Nombre_Asignatura' => $asignatura->Nombre_Asignatura,
        ];
    }

    private function describirCambioRequisito(
        string $accion,
        ?array $anterior,
        ?array $nuevo,
        Collection $asignaturas
    ): string {
        $tipo = $this->tipoRequisitoLegible($nuevo['Tipo_Requisito'] ?? ($anterior['Tipo_Requisito'] ?? null));

        $nombrar = function (?array $requisito) use ($asignaturas): string {
            if (! $requisito) {
                return '—';
            }

            return $this->nombrarRequisito($requisito, $asignaturas);
        };

        return match ($accion) {
            'INSERT_REQUISITO' => "Se agregó el {$tipo} '{$nombrar($nuevo)}'",
            'UPDATE_REQUISITO' => "El {$tipo} cambió de '{$nombrar($anterior)}' a '{$nombrar($nuevo)}'",
            'DELETE_REQUISITO_OBSOLETO' => "Se eliminó el {$tipo} '{$nombrar($anterior)}'",
            default => $accion,
        };
    }

    private function nombrarRequisito(array $requisito, Collection $asignaturas): string
    {
        if (! empty($requisito['ID_Asignatura_Requerida'])) {
            $asignatura = $asignaturas->get((int) $requisito['ID_Asignatura_Requerida']);

            return $asignatura?->Nombre_Asignatura ?? "Asignatura #{$requisito['ID_Asignatura_Requerida']}";
        }

        if (! empty($requisito['Descripcion_Requisito'])) {
            return $requisito['Descripcion_Requisito'];
        }

        if (! empty($requisito['Valor_Creditos'])) {
            return "{$requisito['Valor_Creditos']} créditos";
        }

        return $requisito['Tipo_Requisito'] ?? 'requisito';
    }

    private function tipoRequisitoLegible(?string $tipo): string
    {
        return match (strtolower($tipo ?? '')) {
            'prerrequisito' => 'prerrequisito',
            'correquisito' => 'correquisito',
            'creditos' => 'requisito de créditos',
            'preferente' => 'requisito preferente',
            default => 'requisito',
        };
    }

    /**
     * Endpoint público: compara dos versiones de malla de un mismo programa.
     */
    public function publicDiff(int $malla1Id, int $malla2Id): JsonResponse
    {
        $malla1 = MallaCurricular::findOrFail($malla1Id);
        $malla2 = MallaCurricular::findOrFail($malla2Id);

        if ($malla1->ID_Programa !== $malla2->ID_Programa) {
            return response()->json([
                'message' => 'Las mallas deben pertenecer al mismo programa.',
            ], 400);
        }

        $asig1 = AgrupacionAsignatura::where('ID_Malla', $malla1Id)
            ->with(['asignatura', 'agrupacion.componente'])
            ->get()
            ->keyBy('ID_Asignatura');

        $asig2 = AgrupacionAsignatura::where('ID_Malla', $malla2Id)
            ->with(['asignatura', 'agrupacion.componente'])
            ->get()
            ->keyBy('ID_Asignatura');

        $mapItem = fn ($a) => [
            'ID_Asignatura' => $a->ID_Asignatura,
            'Codigo_Asignatura' => $a->asignatura?->Codigo_Asignatura,
            'Nombre_Asignatura' => $a->asignatura?->Nombre_Asignatura,
            'Creditos_Asignatura' => $a->asignatura?->Creditos_Asignatura,
            'Semestre_Sugerido' => $a->Semestre_Sugerido,
            'Tipo_Asignatura' => $a->Tipo_Asignatura,
            'Nombre_Agrupacion' => $a->agrupacion?->Nombre_Agrupacion,
            'ID_Componente' => $a->agrupacion?->ID_Componente,
            'Nombre_Componente' => $a->agrupacion?->componente?->Nombre_Componente,
        ];

        $added = [];
        $removed = [];
        $modified = [];
        $unchanged = [];

        foreach ($asig2 as $id => $a2) {
            if (! $asig1->has($id)) {
                $added[] = $mapItem($a2);
            } else {
                $a1 = $asig1[$id];
                $oldItem = $mapItem($a1);
                $newItem = $mapItem($a2);
                $changed = ($oldItem['Semestre_Sugerido'] !== $newItem['Semestre_Sugerido'])
                    || ($oldItem['Tipo_Asignatura'] !== $newItem['Tipo_Asignatura'])
                    || ($oldItem['Nombre_Agrupacion'] !== $newItem['Nombre_Agrupacion'])
                    || ($oldItem['ID_Componente'] !== $newItem['ID_Componente']);
                if ($changed) {
                    $modified[] = ['old' => $oldItem, 'new' => $newItem];
                } else {
                    $unchanged[] = $newItem;
                }
            }
        }

        foreach ($asig1 as $id => $a1) {
            if (! $asig2->has($id)) {
                $removed[] = $mapItem($a1);
            }
        }

        // Comparar requisitos
        $reqNuevos = $this->getRequisitosMalla($malla2Id);
        $reqBase = $this->getRequisitosMalla($malla1Id);
        $reqKeyFn = fn ($r) => $r['ID_Asignatura'].'|'.($r['ID_Asignatura_Requerida'] ?? 'NULL').'|'.$r['Tipo_Requisito'];
        $reqBaseKeyed = collect($reqBase)->keyBy($reqKeyFn);
        $reqNuevosKeyed = collect($reqNuevos)->keyBy($reqKeyFn);

        $requisitosAgregados = [];
        $requisitosEliminados = [];

        foreach ($reqNuevosKeyed as $key => $r) {
            if (! $reqBaseKeyed->has($key)) {
                $requisitosAgregados[] = $r;
            }
        }

        foreach ($reqBaseKeyed as $key => $r) {
            if (! $reqNuevosKeyed->has($key)) {
                $requisitosEliminados[] = $r;
            }
        }

        return response()->json([
            'data' => [
                'malla1' => [
                    'ID_Malla' => $malla1->ID_Malla,
                    'Version_Numero' => $malla1->Version_Numero,
                    'Estado' => $malla1->Estado,
                    'Fecha_Vigencia' => $malla1->Fecha_Vigencia,
                ],
                'malla2' => [
                    'ID_Malla' => $malla2->ID_Malla,
                    'Version_Numero' => $malla2->Version_Numero,
                    'Estado' => $malla2->Estado,
                    'Fecha_Vigencia' => $malla2->Fecha_Vigencia,
                ],
                'resumen' => [
                    'agregadas' => count($added),
                    'eliminadas' => count($removed),
                    'modificadas' => count($modified),
                    'sin_cambios' => count($unchanged),
                    'requisitos_agregados' => count($requisitosAgregados),
                    'requisitos_eliminados' => count($requisitosEliminados),
                ],
                'cambios' => [
                    'agregadas' => $added,
                    'eliminadas' => $removed,
                    'modificadas' => $modified,
                    'sin_cambios' => $unchanged,
                    'requisitos_agregados' => $requisitosAgregados,
                    'requisitos_eliminados' => $requisitosEliminados,
                ],
            ],
        ]);
    }

    private function getRequisitosMalla(int $idMalla): array
    {
        $asignaturaIds = AgrupacionAsignatura::where('ID_Malla', $idMalla)
            ->pluck('ID_Asignatura');

        return Requisito::whereIn('ID_Asignatura', $asignaturaIds)
            ->orWhereIn('ID_Asignatura_Requerida', $asignaturaIds)
            ->with(['asignatura', 'asignaturaRequerida'])
            ->get()
            ->map(function ($item) {
                return [
                    'ID_Requisito' => $item->ID_Requisito,
                    'ID_Asignatura' => $item->ID_Asignatura,
                    'ID_Asignatura_Requerida' => $item->ID_Asignatura_Requerida,
                    'Tipo_Requisito' => $item->Tipo_Requisito,
                    'Descripcion_Requisito' => $item->Descripcion_Requisito,
                    'asignatura_principal' => [
                        'Codigo_Asignatura' => $item->asignatura?->Codigo_Asignatura,
                        'Nombre_Asignatura' => $item->asignatura?->Nombre_Asignatura,
                    ],
                    'asignatura_requerida' => $item->asignaturaRequerida ? [
                        'Codigo_Asignatura' => $item->asignaturaRequerida->Codigo_Asignatura,
                        'Nombre_Asignatura' => $item->asignaturaRequerida->Nombre_Asignatura,
                    ] : [
                        'Codigo_Asignatura' => null,
                        'Nombre_Asignatura' => $item->Descripcion_Requisito,
                    ],
                ];
            })
            ->toArray();
    }

    /**
     * Construye el payload de la malla (estructura "estilo Visualizer") para un
     * programa dado usando el servicio cacheado.
     *
     * @return array<string, mixed>|null
     */
    public static function buildPublicVisualizerPayload(int $idPrograma): ?array
    {
        return app(MallaVisualizerService::class)->forPrograma($idPrograma);
    }

    public function reordenar(Request $request, int $mallaId): JsonResponse
    {
        $malla = MallaCurricular::findOrFail($mallaId);

        $validated = $request->validate([
            'cambios' => 'sometimes|array',
            'cambios.*.ID_Asignatura' => 'required|integer|exists:asignaturas,ID_Asignatura',
            'cambios.*.Semestre_Sugerido' => 'required|integer|min:0|max:20',
            'cambios.*.Orden' => 'required|integer|min:0',
            'cambios_slots' => 'sometimes|array',
            'cambios_slots.*.ID_Slot' => 'required|integer|exists:slots_agrupacion,ID_Slot',
            'cambios_slots.*.Semestre' => 'required|integer|min:0|max:20',
            'cambios_slots.*.Orden' => 'required|integer|min:0',
        ]);

        DB::transaction(function () use ($validated, $malla) {
            foreach ($validated['cambios'] ?? [] as $cambio) {
                AgrupacionAsignatura::where('ID_Malla', $malla->ID_Malla)
                    ->where('ID_Asignatura', $cambio['ID_Asignatura'])
                    ->update([
                        'Semestre_Sugerido' => $cambio['Semestre_Sugerido'],
                        'Orden' => $cambio['Orden'],
                    ]);
            }

            foreach ($validated['cambios_slots'] ?? [] as $cambio) {
                SlotAgrupacion::where('ID_Slot', $cambio['ID_Slot'])
                    ->update([
                        'Semestre' => $cambio['Semestre'],
                        'Orden' => $cambio['Orden'],
                    ]);
            }
        });

        app(MallaVisualizerService::class)->forgetAll($malla->ID_Programa, $malla->ID_Malla);

        return response()->json(['ok' => true]);
    }

    public function optativas(Request $request, int $mallaId): JsonResponse
    {
        $malla = MallaCurricular::findOrFail($mallaId);
        $slotId = $request->query('slot_id');

        $slot = null;
        if ($slotId !== null) {
            $slot = SlotAgrupacion::with('agrupacion')->find($slotId);
            if (! $slot) {
                return response()->json([
                    'message' => 'Slot de optativa no encontrado.',
                    'data' => [],
                ], 404);
            }
        }

        $fallbackGroupName = $slot?->agrupacion?->Nombre_Agrupacion ?? 'Optativas';
        $fallbackGroupId = $slot?->agrupacion?->ID_Agrupacion ?? $slot?->ID_Agrupacion;

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
                    ->orWhereRaw('LOWER(agrupacion_asignatura.Tipo_Asignatura) IN (?, ?)', ['electiva', 'optativa']);
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

    /**
     * Endpoint administrativo: Retorna las optativas de un programa que NO están
     * vinculadas a ninguna agrupación (para asignación manual).
     */
    public function optativasSinAgrupacion(Request $request, int $mallaId): JsonResponse
    {
        $malla = MallaCurricular::findOrFail($mallaId);

        // Optativas registradas para el programa pero sin enlace en agrupacion_asignatura
        $optativasIds = ProgramaElectiva::where('ID_Programa', $malla->ID_Programa)
            ->pluck('ID_Asignatura')
            ->all();

        $vinculadasIds = AgrupacionAsignatura::where('ID_Malla', $mallaId)
            ->whereIn('ID_Asignatura', $optativasIds)
            ->pluck('ID_Asignatura')
            ->all();

        $noVinculadas = array_diff($optativasIds, $vinculadasIds);

        $asignaturas = Asignatura::whereIn('ID_Asignatura', $noVinculadas)
            ->get(['ID_Asignatura', 'Codigo_Asignatura', 'Nombre_Asignatura', 'Creditos_Asignatura']);

        return response()->json(['data' => $asignaturas]);
    }

    /**
     * Endpoint administrativo: Asigna una optativa a una agrupación específica.
     */
    public function asignarOptativaAgrupacion(Request $request, int $mallaId): JsonResponse
    {
        $validated = $request->validate([
            'ID_Agrupacion' => 'required|integer',
            'ID_Asignatura' => 'required|integer|exists:asignaturas,ID_Asignatura',
        ]);

        $malla = MallaCurricular::findOrFail($mallaId);

        // Buscar la agrupación real; si no existe, crearla desde la plantilla
        $agrupacionReal = $this->resolveAgrupacionDestino($malla, (int) $validated['ID_Agrupacion']);
        if (! $agrupacionReal) {
            return response()->json(['message' => 'La agrupación destino no es válida.'], 422);
        }

        // Verificar que la asignatura sea optativa del programa
        $esOptativa = ProgramaElectiva::where('ID_Programa', $malla->ID_Programa)
            ->where('ID_Asignatura', $validated['ID_Asignatura'])
            ->exists();

        if (! $esOptativa) {
            return response()->json([
                'message' => 'La asignatura no es una optativa registrada para este programa.',
            ], 422);
        }

        AgrupacionAsignatura::updateOrCreate(
            [
                'ID_Malla' => $mallaId,
                'ID_Asignatura' => $validated['ID_Asignatura'],
            ],
            [
                'ID_Agrupacion' => $agrupacionReal->ID_Agrupacion,
                'Tipo_Asignatura' => 'optativa',
            ]
        );

        app(MallaVisualizerService::class)->forgetAll($malla->ID_Programa, $malla->ID_Malla);

        return response()->json(['ok' => true, 'message' => 'Optativa asignada correctamente.']);
    }

    /**
     * Endpoint administrativo: Asigna múltiples optativas a una agrupación de una sola vez.
     */
    public function asignarOptativasBatch(Request $request, int $mallaId): JsonResponse
    {
        $validated = $request->validate([
            'ID_Agrupacion' => 'required|integer',
            'ID_Asignaturas' => 'required|array|min:1',
            'ID_Asignaturas.*' => 'required|integer|exists:asignaturas,ID_Asignatura',
        ]);

        $malla = MallaCurricular::findOrFail($mallaId);

        // Buscar la agrupación real; si no existe, crearla desde la plantilla
        $agrupacionReal = $this->resolveAgrupacionDestino($malla, (int) $validated['ID_Agrupacion']);
        if (! $agrupacionReal) {
            return response()->json(['message' => 'La agrupación destino no es válida.'], 422);
        }

        // Verificar que todas las asignaturas sean optativas del programa
        $idsValidos = ProgramaElectiva::where('ID_Programa', $malla->ID_Programa)
            ->whereIn('ID_Asignatura', $validated['ID_Asignaturas'])
            ->pluck('ID_Asignatura')
            ->all();

        $idsInvalidos = array_diff($validated['ID_Asignaturas'], $idsValidos);
        if (! empty($idsInvalidos)) {
            return response()->json([
                'message' => 'Algunas asignaturas no son optativas registradas para este programa.',
                'invalid_ids' => array_values($idsInvalidos),
            ], 422);
        }

        $now = now();
        $rows = array_map(fn ($id) => [
            'ID_Malla' => $mallaId,
            'ID_Agrupacion' => $agrupacionReal->ID_Agrupacion,
            'ID_Asignatura' => $id,
            'Tipo_Asignatura' => 'optativa',
            'created_at' => $now,
            'updated_at' => $now,
        ], $idsValidos);

        DB::table('agrupacion_asignatura')->upsert(
            $rows,
            ['ID_Malla', 'ID_Asignatura'],
            ['Tipo_Asignatura', 'updated_at']
        );

        $count = count($idsValidos);

        app(MallaVisualizerService::class)->forgetAll($malla->ID_Programa, $mallaId);

        return response()->json([
            'ok' => true,
            'message' => "{$count} optativas asignadas correctamente a '{$agrupacionReal->Nombre_Agrupacion}'.",
        ]);
    }

    /**
     * Resuelve la agrupación destino a partir del ID de plantilla enviado por el frontend.
     * Busca la plantilla, y si ya existe una agrupación con el mismo nombre+componente en la malla
     * la retorna; si no, la crea desde la plantilla.
     */
    private function resolveAgrupacionDestino(MallaCurricular $malla, int $id): ?Agrupacion
    {
        // 1. Obtener la plantilla (el frontend envía ID_Plantilla_Agrupacion como ID_Agrupacion)
        $plantilla = PlantillaAgrupacion::find($id);
        if (! $plantilla || $plantilla->ID_Programa !== $malla->ID_Programa) {
            return null;
        }

        // 2. Buscar si ya existe una agrupación con mismo nombre+componente en la malla
        $agrupacionExistente = Agrupacion::where('ID_Malla', $malla->ID_Malla)
            ->where('ID_Componente', $plantilla->ID_Componente)
            ->where('Nombre_Agrupacion', $plantilla->Nombre_Agrupacion)
            ->first();

        if ($agrupacionExistente) {
            return $agrupacionExistente;
        }

        // 3. No existe en absoluto → crearla desde la plantilla
        return $plantilla->generarAgrupacion($malla->ID_Malla);
    }

    /**
     * Endpoint administrativo: Remueve una optativa de una agrupación.
     */
    public function removerOptativaAgrupacion(Request $request, int $mallaId): JsonResponse
    {
        $validated = $request->validate([
            'ID_Agrupacion' => 'required|integer|exists:agrupaciones,ID_Agrupacion',
            'ID_Asignatura' => 'required|integer|exists:asignaturas,ID_Asignatura',
        ]);

        $malla = MallaCurricular::findOrFail($mallaId);

        AgrupacionAsignatura::where('ID_Malla', $mallaId)
            ->where('ID_Agrupacion', $validated['ID_Agrupacion'])
            ->where('ID_Asignatura', $validated['ID_Asignatura'])
            ->whereRaw('LOWER(Tipo_Asignatura) = ?', ['optativa'])
            ->delete();

        app(MallaVisualizerService::class)->forgetAll($malla->ID_Programa, $mallaId);

        return response()->json(['ok' => true, 'message' => 'Optativa removida de la agrupación.']);
    }

    /**
     * Endpoint administrativo: Remueve múltiples optativas de una agrupación de una sola vez.
     */
    public function removerOptativasBatch(Request $request, int $mallaId): JsonResponse
    {
        $validated = $request->validate([
            'ID_Agrupacion' => 'required|integer|exists:agrupaciones,ID_Agrupacion',
            'ID_Asignaturas' => 'required|array|min:1',
            'ID_Asignaturas.*' => 'required|integer|exists:asignaturas,ID_Asignatura',
        ]);

        $malla = MallaCurricular::findOrFail($mallaId);

        $deleted = AgrupacionAsignatura::where('ID_Malla', $mallaId)
            ->where('ID_Agrupacion', $validated['ID_Agrupacion'])
            ->whereIn('ID_Asignatura', $validated['ID_Asignaturas'])
            ->whereRaw('LOWER(Tipo_Asignatura) = ?', ['optativa'])
            ->delete();

        app(MallaVisualizerService::class)->forgetAll($malla->ID_Programa, $mallaId);

        return response()->json([
            'ok' => true,
            'message' => "{$deleted} optativas removidas de la agrupación.",
        ]);
    }

    /**
     * Endpoint administrativo: Retorna las optativas agrupadas por agrupación para la vista admin.
     * Solo muestra agrupaciones que TIENEN optativas asignadas (columna derecha del panel).
     */
    public function optativasPorAgrupacion(Request $request, int $mallaId): JsonResponse
    {
        $malla = MallaCurricular::findOrFail($mallaId);

        $agrupaciones = Agrupacion::where('ID_Malla', $mallaId)
            ->whereHas('asignaturas', function ($q) {
                $q->whereRaw('LOWER(agrupacion_asignatura.Tipo_Asignatura) IN (?, ?)', ['optativa', 'electiva']);
            })
            ->with(['asignaturas' => function ($q) {
                $q->whereRaw('LOWER(agrupacion_asignatura.Tipo_Asignatura) IN (?, ?)', ['optativa', 'electiva'])
                    ->orderBy('Nombre_Asignatura');
            }])
            ->orderBy('Nombre_Agrupacion')
            ->get(['ID_Agrupacion', 'Nombre_Agrupacion', 'ID_Componente']);

        return response()->json(['data' => $agrupaciones]);
    }

    /**
     * Endpoint administrativo: Retorna TODAS las agrupaciones de la malla
     * (para el selector de destino en asignación masiva).
     */
    public function agrupacionesDePrograma(Request $request, int $mallaId): JsonResponse
    {
        $malla = MallaCurricular::findOrFail($mallaId);

        $agrupaciones = PlantillaAgrupacion::where('ID_Programa', $malla->ID_Programa)
            ->where('Tipo_Agrupacion', 'OPTATIVA')
            ->orderBy('Nombre_Agrupacion')
            ->get()
            ->map(fn ($p) => [
                'ID_Agrupacion' => $p->ID_Plantilla_Agrupacion,
                'Nombre_Agrupacion' => $p->Nombre_Agrupacion,
                'ID_Componente' => $p->ID_Componente,
            ]);

        return response()->json(['data' => $agrupaciones]);
    }
}
