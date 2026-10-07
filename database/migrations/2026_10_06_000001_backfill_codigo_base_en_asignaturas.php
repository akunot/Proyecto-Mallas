<?php

use App\Services\CodeNormalizationService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Puebla Codigo_Base en las asignaturas que fueron creadas sin ella.
     *
     * El CRUD (CatalogoController::store/update) nunca escribia Codigo_Base,
     * mientras que el importador de mallas resuelve cada asignatura con
     * "WHERE Codigo_Base = normalize(codigo)". Esas filas quedaban invisibles
     * para la carga de mallas ("Asignatura no encontrada en el catalogo").
     *
     * Idempotente: solo toca filas sin Codigo_Base y respeta el indice unico.
     */
    public function up(): void
    {
        $pendientes = DB::table('asignaturas')
            ->where(fn ($query) => $query->whereNull('Codigo_Base')->orWhere('Codigo_Base', ''))
            ->get(['ID_Asignatura', 'Codigo_Asignatura']);

        foreach ($pendientes as $asignatura) {
            $codigo = $asignatura->Codigo_Asignatura;

            if ($codigo === null || trim($codigo) === '') {
                continue;
            }

            $codigoBase = CodeNormalizationService::normalize($codigo);

            if ($codigoBase === '') {
                continue;
            }

            // No violar el indice unico: si otra fila ya usa esa base, se
            // conserva NULL para revision manual en lugar de romper la carga.
            $ocupada = DB::table('asignaturas')
                ->where('Codigo_Base', $codigoBase)
                ->exists();

            if ($ocupada) {
                continue;
            }

            DB::table('asignaturas')
                ->where('ID_Asignatura', $asignatura->ID_Asignatura)
                ->update(['Codigo_Base' => $codigoBase]);
        }
    }

    /**
     * Reverse the migrations (migracion de datos: no revierte).
     */
    public function down(): void
    {
        //
    }
};
