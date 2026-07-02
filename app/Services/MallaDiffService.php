<?php

namespace App\Services;

use App\Models\AgrupacionAsignatura;
use App\Models\CargaMalla;
use App\Models\DiffMalla;
use App\Models\MallaCurricular;
use App\Models\Requisito;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class MallaDiffService
{
    /**
     * Genera los diffs entre dos mallas y los guarda en la BD.
     */
    public function generarDiffs(MallaCurricular $mallaNueva, ?MallaCurricular $mallaBase, CargaMalla $carga): void
    {
        // Si no hay malla base, todo es INSERT
        if (! $mallaBase) {
            $this->generarDiffsPrimeraVersion($mallaNueva, $carga);

            return;
        }

        // Obtener asignaciones de ambas mallas
        $asignacionesNuevas = $this->getAgrupacionesAsignaturas($mallaNueva->ID_Malla);
        $asignacionesBase = $this->getAgrupacionesAsignaturas($mallaBase->ID_Malla);

        // Comparar asignaciones
        $this->compararAsignaciones($asignacionesNuevas, $asignacionesBase, $carga);

        // Comparar requisitos
        $requisitosNuevos = $this->getRequisitos($mallaNueva->ID_Malla);
        $requisitosBase = $this->getRequisitos($mallaBase->ID_Malla);

        $this->compararRequisitos($requisitosNuevos, $requisitosBase, $carga);
    }

    /**
     * Genera diffs para la primera versión (todo es INSERT).
     */
    private function generarDiffsPrimeraVersion(MallaCurricular $mallaNueva, CargaMalla $carga): void
    {
        $payload = [];
        $now = now();

        foreach ($this->getAgrupacionesAsignaturas($mallaNueva->ID_Malla) as $asignacion) {
            $payload[] = $this->diffPayload($carga->ID_Carga, 'agrupacion_asignatura', 'INSERT', $asignacion['ID_Agrup_Asig'], null, $asignacion, $now);
        }

        foreach ($this->getRequisitos($mallaNueva->ID_Malla) as $requisito) {
            $payload[] = $this->diffPayload($carga->ID_Carga, 'requisito', 'INSERT', $requisito['ID_Requisito'], null, $requisito, $now);
        }

        if (! empty($payload)) {
            DB::table('diffs_mallas')->insert($payload);
        }
    }

    /**
     * Compara las asignaciones entre dos mallas.
     */
    private function compararAsignaciones(Collection $nuevas, Collection $base, CargaMalla $carga): void
    {
        $baseKeyed = $base->keyBy(fn ($item) => $item['ID_Asignatura']);
        $nuevasKeyed = $nuevas->keyBy(fn ($item) => $item['ID_Asignatura']);

        $payload = [];
        $now = now();

        foreach ($nuevasKeyed as $key => $asignacion) {
            if (! $baseKeyed->has($key)) {
                $payload[] = $this->diffPayload($carga->ID_Carga, 'agrupacion_asignatura', 'INSERT', $asignacion['ID_Agrup_Asig'], null, $asignacion, $now);
            }
        }

        foreach ($baseKeyed as $key => $asignacion) {
            if (! $nuevasKeyed->has($key)) {
                $payload[] = $this->diffPayload($carga->ID_Carga, 'agrupacion_asignatura', 'DELETE', $asignacion['ID_Agrup_Asig'], $asignacion, null, $now);
            }
        }

        foreach ($nuevasKeyed as $key => $nueva) {
            if ($baseKeyed->has($key)) {
                $base = $baseKeyed->get($key);
                if ($this->asignacionCambiada($nueva, $base)) {
                    $payload[] = $this->diffPayload($carga->ID_Carga, 'agrupacion_asignatura', 'UPDATE', $nueva['ID_Agrup_Asig'], $base, $nueva, $now);
                }
            }
        }

        if (! empty($payload)) {
            DB::table('diffs_mallas')->insert($payload);
        }
    }

    /**
     * Compara los requisitos entre dos mallas.
     */
    private function compararRequisitos(Collection $nuevos, Collection $base, CargaMalla $carga): void
    {
        $keyFn = fn ($item) => $item['ID_Asignatura'].'|'.($item['ID_Asignatura_Requerida'] ?? 'NULL').'|'.$item['Tipo_Requisito'];
        $baseKeyed = $base->keyBy($keyFn);
        $nuevosKeyed = $nuevos->keyBy($keyFn);

        $payload = [];
        $now = now();

        foreach ($nuevosKeyed as $key => $requisito) {
            if (! $baseKeyed->has($key)) {
                $payload[] = $this->diffPayload($carga->ID_Carga, 'requisito', 'INSERT', $requisito['ID_Requisito'], null, $requisito, $now);
            }
        }

        foreach ($baseKeyed as $key => $requisito) {
            if (! $nuevosKeyed->has($key)) {
                $payload[] = $this->diffPayload($carga->ID_Carga, 'requisito', 'DELETE', $requisito['ID_Requisito'], $requisito, null, $now);
            }
        }

        if (! empty($payload)) {
            DB::table('diffs_mallas')->insert($payload);
        }
    }

    private function diffPayload(int $idCarga, string $entidad, string $tipo, ?int $idRegistro, mixed $anterior, mixed $nuevo, $now): array
    {
        return [
            'ID_Carga' => $idCarga,
            'Entidad_Afectada' => $entidad,
            'Tipo_Cambio' => $tipo,
            'ID_Registro' => $idRegistro,
            'Valor_Anterior' => $anterior !== null ? json_encode($anterior) : null,
            'Valor_Nuevo' => $nuevo !== null ? json_encode($nuevo) : null,
            'created_at' => $now,
            'updated_at' => $now,
        ];
    }

    /**
     * Verifica si una asignación ha cambiado.
     */
    private function asignacionCambiada(array $nueva, array $base): bool
    {
        $camposComparar = ['Tipo_Asignatura', 'Semestre_Sugerido'];

        foreach ($camposComparar as $campo) {
            if (($nueva[$campo] ?? null) !== ($base[$campo] ?? null)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Obtiene las asignaciones de una malla con datos completos.
     */
    private function getAgrupacionesAsignaturas(int $idMalla): Collection
    {
        return AgrupacionAsignatura::where('ID_Malla', $idMalla)
            ->with(['agrupacion.componente', 'asignatura'])
            ->get()
            ->map(function ($item) {
                return [
                    'ID_Agrup_Asig' => $item->ID_Agrup_Asig,
                    'ID_Agrupacion' => $item->ID_Agrupacion,
                    'ID_Malla' => $item->ID_Malla,
                    'ID_Asignatura' => $item->ID_Asignatura,
                    'Tipo_Asignatura' => $item->Tipo_Asignatura,
                    'Semestre_Sugerido' => $item->Semestre_Sugerido,
                    'Nombre_Agrupacion' => $item->agrupacion->Nombre_Agrupacion,
                    'Nombre_Componente' => $item->agrupacion->componente->Nombre_Componente,
                    'Codigo_Asignatura' => $item->asignatura?->Codigo_Asignatura,
                    'Nombre_Asignatura' => $item->asignatura?->Nombre_Asignatura,
                ];
            });
    }

    /**
     * Obtiene los requisitos de una malla con datos completos.
     */
    private function getRequisitos(int $idMalla): Collection
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
                    'Creditos_Minimos' => $item->Creditos_Minimos,
                    'Descripcion_Requisito' => $item->Descripcion_Requisito,
                    'asignatura_principal' => [
                        'Codigo_Asignatura' => $item->asignatura?->Codigo_Asignatura,
                        'Nombre_Asignatura' => $item->asignatura?->Nombre_Asignatura,
                    ],
                    'asignatura_requerida' => $item->asignaturaRequerida ? [
                        'Codigo_Asignatura' => $item->asignaturaRequerida->Codigo_Asignatura,
                        'Nombre_Asignatura' => $item->asignaturaRequerida->Nombre_Asignatura,
                    ] : null,
                ];
            });
    }

    /**
     * Obtiene los diffs de una carga agrupados por entidad.
     */
    public function obtenerDiffsAgrupados(CargaMalla $carga): array
    {
        $diffs = DiffMalla::where('ID_Carga', $carga->ID_Carga)
            ->orderBy('Entidad_Afectada')
            ->orderBy('Tipo_Cambio')
            ->get()
            ->groupBy('Entidad_Afectada');

        $resultado = [];

        foreach ($diffs as $entidad => $diffsEntidad) {
            $resultado[$entidad] = [
                'INSERT' => $diffsEntidad->where('Tipo_Cambio', 'INSERT')->values(),
                'UPDATE' => $diffsEntidad->where('Tipo_Cambio', 'UPDATE')->values(),
                'DELETE' => $diffsEntidad->where('Tipo_Cambio', 'DELETE')->values(),
            ];
        }

        return $resultado;
    }

    /**
     * Genera un resumen de cambios para mostrar en la UI.
     */
    public function generarResumenCambios(CargaMalla $carga): array
    {
        $diffs = DiffMalla::where('ID_Carga', $carga->ID_Carga)->get();

        return [
            'total_cambios' => $diffs->count(),
            'por_entidad' => $diffs->groupBy('Entidad_Afectada')->map->count(),
            'por_tipo' => $diffs->groupBy('Tipo_Cambio')->map->count(),
            'asignaturas_agregadas' => $diffs->where('Entidad_Afectada', 'agrupacion_asignatura')->where('Tipo_Cambio', 'INSERT')->count(),
            'asignaturas_eliminadas' => $diffs->where('Entidad_Afectada', 'agrupacion_asignatura')->where('Tipo_Cambio', 'DELETE')->count(),
            'asignaturas_modificadas' => $diffs->where('Entidad_Afectada', 'agrupacion_asignatura')->where('Tipo_Cambio', 'UPDATE')->count(),
            'requisitos_agregados' => $diffs->where('Entidad_Afectada', 'requisito')->where('Tipo_Cambio', 'INSERT')->count(),
            'requisitos_eliminados' => $diffs->where('Entidad_Afectada', 'requisito')->where('Tipo_Cambio', 'DELETE')->count(),
        ];
    }
}
