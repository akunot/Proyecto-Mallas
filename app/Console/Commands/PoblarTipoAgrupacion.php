<?php

namespace App\Console\Commands;

use App\Models\Agrupacion;
use App\Models\PlantillaAgrupacion;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class PoblarTipoAgrupacion extends Command
{
    protected $signature = 'poblar:tipo-agrupacion';
    protected $description = 'Pobla el campo Tipo_Agrupacion en la tabla agrupaciones que esté NULL, usando los datos de plantillas_agrupacion';

    public function handle()
    {
        $this->info('Iniciando actualización de Tipo_Agrupacion e ID_Programa en agrupaciones...');

        // 1. Actualizar ID_Programa desde la malla (siempre funciona)
        $updatedProg = DB::statement('
            UPDATE agrupaciones a
            JOIN mallas_curriculares m ON a.ID_Malla = m.ID_Malla
            SET a.ID_Programa = m.ID_Programa
            WHERE a.ID_Programa IS NULL
        ');

        // 2. Actualizar Tipo_Agrupacion: primero OPTATIVA (para evitar que OBLIGATORIA sobreescriba)
        $updatedOptativa = DB::statement('
            UPDATE agrupaciones a
            JOIN mallas_curriculares m ON a.ID_Malla = m.ID_Malla
            JOIN plantillas_agrupacion p ON m.ID_Programa = p.ID_Programa AND a.Nombre_Agrupacion = p.Nombre_Agrupacion AND a.ID_Componente = p.ID_Componente
            SET a.Tipo_Agrupacion = p.Tipo_Agrupacion
            WHERE a.Tipo_Agrupacion IS NULL
              AND p.Tipo_Agrupacion = \'OPTATIVA\'
        ');

        // 3. Actualizar el resto (OBLIGATORIA, LIBRE ELECCIÓN, etc.) solo si siguen NULL
        $updatedResto = DB::statement('
            UPDATE agrupaciones a
            JOIN mallas_curriculares m ON a.ID_Malla = m.ID_Malla
            JOIN plantillas_agrupacion p ON m.ID_Programa = p.ID_Programa AND a.Nombre_Agrupacion = p.Nombre_Agrupacion AND a.ID_Componente = p.ID_Componente
            SET a.Tipo_Agrupacion = p.Tipo_Agrupacion
            WHERE a.Tipo_Agrupacion IS NULL
        ');

        $this->info("Actualización completada.");
        $this->info("- ID_Programa actualizados: {$updatedProg}");
        $this->info("- Tipo_Agrupacion (OPTATIVA) actualizados: {$updatedOptativa}");
        $this->info("- Tipo_Agrupacion (resto) actualizados: {$updatedResto}");
    }
}