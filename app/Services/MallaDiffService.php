<?php

namespace App\Services;

use App\Models\MallaCurricular;
use App\Models\AgrupacionAsignatura;
use App\Models\Requisito;
use App\Models\DiffMalla;
use App\Models\CargaMalla;
use Illuminate\Support\Collection;

class MallaDiffService
{
    /**
     * Genera los diffs entre dos mallas y los guarda en la BD.
     */
    public function generarDiffs(MallaCurricular $mallaNueva, ?MallaCurricular $mallaBase, CargaMalla $carga): void
    {
        // Si no hay malla base, todo es INSERT
        if (!$mallaBase) {
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
        $asignaciones = $this->getAgrupacionesAsignaturas($mallaNueva->ID_Malla);
        
        foreach ($asignaciones as $asignacion) {
            DiffMalla::create([
                'ID_Carga' => $carga->ID_Carga,
                'Entidad_Afectada' => 'agrupacion_asignatura',
                'Tipo_Cambio' => 'INSERT',
                'ID_Registro' => $asignacion['ID_Agrup_Asig'],
                'Valor_Anterior' => null,
                'Valor_Nuevo' => $asignacion,
            ]);
        }

        $requisitos = $this->getRequisitos($mallaNueva->ID_Malla);
        
        foreach ($requisitos as $requisito) {
            DiffMalla::create([
                'ID_Carga' => $carga->ID_Carga,
                'Entidad_Afectada' => 'requisito',
                'Tipo_Cambio' => 'INSERT',
                'ID_Registro' => $requisito['ID_Requisito'],
                'Valor_Anterior' => null,
                'Valor_Nuevo' => $requisito,
            ]);
        }
    }

    /**
     * Compara las asignaciones entre dos mallas.
     */
    private function compararAsignaciones(Collection $nuevas, Collection $base, CargaMalla $carga): void
    {
        $baseKeyed = $base->keyBy(function($item) {
            return $item['ID_Agrupacion'] . '|' . $item['ID_Asignatura'];
        });

        $nuevasKeyed = $nuevas->keyBy(function($item) {
            return $item['ID_Agrupacion'] . '|' . $item['ID_Asignatura'];
        });

        // Detectar INSERTs (nuevos en la malla nueva)
        foreach ($nuevasKeyed as $key => $asignacion) {
            if (!$baseKeyed->has($key)) {
                DiffMalla::create([
                    'ID_Carga' => $carga->ID_Carga,
                    'Entidad_Afectada' => 'agrupacion_asignatura',
                    'Tipo_Cambio' => 'INSERT',
                    'ID_Registro' => $asignacion['ID_Agrup_Asig'],
                    'Valor_Anterior' => null,
                    'Valor_Nuevo' => $asignacion,
                ]);
            }
        }

        // Detectar DELETEs (eliminados de la malla base)
        foreach ($baseKeyed as $key => $asignacion) {
            if (!$nuevasKeyed->has($key)) {
                DiffMalla::create([
                    'ID_Carga' => $carga->ID_Carga,
                    'Entidad_Afectada' => 'agrupacion_asignatura',
                    'Tipo_Cambio' => 'DELETE',
                    'ID_Registro' => $asignacion['ID_Agrup_Asig'],
                    'Valor_Anterior' => $asignacion,
                    'Valor_Nuevo' => null,
                ]);
            }
        }

        // Detectar UPDATEs (existentes en ambas pero con cambios)
        foreach ($nuevasKeyed as $key => $nueva) {
            if ($baseKeyed->has($key)) {
                $base = $baseKeyed->get($key);
                
                if ($this->asignacionCambiada($nueva, $base)) {
                    DiffMalla::create([
                        'ID_Carga' => $carga->ID_Carga,
                        'Entidad_Afectada' => 'agrupacion_asignatura',
                        'Tipo_Cambio' => 'UPDATE',
                        'ID_Registro' => $nueva['ID_Agrup_Asig'],
                        'Valor_Anterior' => $base,
                        'Valor_Nuevo' => $nueva,
                    ]);
                }
            }
        }
    }

    /**
     * Compara los requisitos entre dos mallas.
     */
    private function compararRequisitos(Collection $nuevos, Collection $base, CargaMalla $carga): void
    {
        $baseKeyed = $base->keyBy(function($item) {
            return $item['ID_Agrup_Asig'] . '|' . ($item['ID_Agrup_Asig_Requerida'] ?? 'NULL') . '|' . $item['Tipo_Requisito'];
        });

        $nuevosKeyed = $nuevos->keyBy(function($item) {
            return $item['ID_Agrup_Asig'] . '|' . ($item['ID_Agrup_Asig_Requerida'] ?? 'NULL') . '|' . $item['Tipo_Requisito'];
        });

        // INSERTs
        foreach ($nuevosKeyed as $key => $requisito) {
            if (!$baseKeyed->has($key)) {
                DiffMalla::create([
                    'ID_Carga' => $carga->ID_Carga,
                    'Entidad_Afectada' => 'requisito',
                    'Tipo_Cambio' => 'INSERT',
                    'ID_Registro' => $requisito['ID_Requisito'],
                    'Valor_Anterior' => null,
                    'Valor_Nuevo' => $requisito,
                ]);
            }
        }

        // DELETEs
        foreach ($baseKeyed as $key => $requisito) {
            if (!$nuevosKeyed->has($key)) {
                DiffMalla::create([
                    'ID_Carga' => $carga->ID_Carga,
                    'Entidad_Afectada' => 'requisito',
                    'Tipo_Cambio' => 'DELETE',
                    'ID_Registro' => $requisito['ID_Requisito'],
                    'Valor_Anterior' => $requisito,
                    'Valor_Nuevo' => null,
                ]);
            }
        }
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
        return Requisito::whereHas('agrupacionAsignatura', function($query) use ($idMalla) {
            $query->where('ID_Malla', $idMalla);
        })
        ->with([
            'agrupacionAsignatura.agrupacion',
            'agrupacionAsignatura.asignatura',
            'agrupacionAsignaturaRequerida.agrupacion',
            'agrupacionAsignaturaRequerida.asignatura'
        ])
        ->get()
        ->map(function ($item) {
            return [
                'ID_Requisito' => $item->ID_Requisito,
                'ID_Agrup_Asig' => $item->ID_Agrup_Asig,
                'ID_Agrup_Asig_Requerida' => $item->ID_Agrup_Asig_Requerida,
                'Tipo_Requisito' => $item->Tipo_Requisito,
                'Creditos_Minimos' => $item->Creditos_Minimos,
                'Descripcion_Requisito' => $item->Descripcion_Requisito,
                'asignatura_principal' => [
                    'Codigo_Asignatura' => $item->agrupacionAsignatura->asignatura?->Codigo_Asignatura,
                    'Nombre_Asignatura' => $item->agrupacionAsignatura->asignatura?->Nombre_Asignatura,
                ],
                'asignatura_requerida' => $item->agrupacionAsignaturaRequerida ? [
                    'Codigo_Asignatura' => $item->agrupacionAsignaturaRequerida->asignatura?->Codigo_Asignatura,
                    'Nombre_Asignatura' => $item->agrupacionAsignaturaRequerida->asignatura?->Nombre_Asignatura,
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
        $diffs = DiffMalla::where('ID_Carga', $carga->ID_Calla)->get();

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
