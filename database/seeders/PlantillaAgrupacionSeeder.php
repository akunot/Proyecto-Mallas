<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Programa;
use App\Models\Componente;
use App\Models\PlantillaAgrupacion;

class PlantillaAgrupacionSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info("Iniciando carga de plantillas de AGRUPACION...");

        // Limpiar plantillas existentes para evitar conflictos de IDs y nombres duplicados
        \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        PlantillaAgrupacion::truncate();
        \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $componenteMap = [
            1 => 'Fundamentacion',
            2 => 'Disciplinar o Profesional', 
            3 => 'Libre ELECCION',
            4 => 'Nivelatorio',
            5 => 'Lengua Extranjera',
        ];

        $programasData = [
            4021 => [
                ['ID_AGRUPACION' => 1, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'MATEMÁTICAS, PROBABILIDAD Y ESTADÍSTICA', 'CREDITOS EXIGIDOS' => 26],
                ['ID_AGRUPACION' => 2, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'FÍSICA', 'CREDITOS EXIGIDOS' => 4],
                ['ID_AGRUPACION' => 3, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OPTATIVA', 'AGRUPACION' => 'FÍSICA', 'CREDITOS EXIGIDOS' => 4],
                ['ID_AGRUPACION' => 4, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OPTATIVA', 'AGRUPACION' => 'HERRAMIENTAS INFORMÁTICAS Y MÉTODOS NUMÉRICOS', 'CREDITOS EXIGIDOS' => 6],
                ['ID_AGRUPACION' => 5, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'CIENCIAS ECONÓMICAS Y ADMINISTRATIVAS', 'CREDITOS EXIGIDOS' => 6],
                ['ID_AGRUPACION' => 6, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'CIENCIAS SOCIALES', 'CREDITOS EXIGIDOS' => 3],
                ['ID_AGRUPACION' => 7, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'EXPRESIÓN GRÁFICA', 'CREDITOS EXIGIDOS' => 3],
                ['ID_AGRUPACION' => 8, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'QUÍMICA', 'CREDITOS EXIGIDOS' => 3],
                ['ID_AGRUPACION' => 9, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'ESTRUCTURAS Y CONSTRUCCIÓN', 'CREDITOS EXIGIDOS' => 15],
                ['ID_AGRUPACION' => 10, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'VÍAS Y TRASPORTE', 'CREDITOS EXIGIDOS' => 7],
                ['ID_AGRUPACION' => 11, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'GEOTECNIA', 'CREDITOS EXIGIDOS' => 13],
                ['ID_AGRUPACION' => 12, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'HIDRÁULICA Y AMBIENTAL', 'CREDITOS EXIGIDOS' => 15],
                ['ID_AGRUPACION' => 13, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OPTATIVA', 'AGRUPACION' => 'CONSTRUCCIÓN DE OBRAS CIVILES', 'CREDITOS EXIGIDOS' => 3],
                ['ID_AGRUPACION' => 14, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'BÁSICA DISCIPLINAR', 'CREDITOS EXIGIDOS' => 29],
                ['ID_AGRUPACION' => 15, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'TRABAJO DE GRADO', 'CREDITOS EXIGIDOS' => 6],
                ['ID_AGRUPACION' => 31, 'ID_COMPONENTE' => 3, 'TIPO_AGRUPACION' => 'LIBRE ELECCIÓN', 'AGRUPACION' => 'LIBRE ELECCIÓN', 'CREDITOS EXIGIDOS' => 36],
                ['ID_AGRUPACION' => 32, 'ID_COMPONENTE' => 4, 'TIPO_AGRUPACION' => 'NIVELATORIO', 'AGRUPACION' => 'NIVELATORIO', 'CREDITOS EXIGIDOS' => 8],
            ],
            4035 => [
                ['ID_AGRUPACION' => 16, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'HERRAMIENTAS INFORMÁTICAS', 'CREDITOS EXIGIDOS' => 3],
                ['ID_AGRUPACION' => 17, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'CUANTITATIVAS', 'CREDITOS EXIGIDOS' => 21],
                ['ID_AGRUPACION' => 18, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OPTATIVA', 'AGRUPACION' => 'CUANTITATIVAS OPTATIVAS', 'CREDITOS EXIGIDOS' => 6],
                ['ID_AGRUPACION' => 19, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'ADMINISTRACIÓN', 'CREDITOS EXIGIDOS' => 16],
                ['ID_AGRUPACION' => 20, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'HUMANÍSTICA', 'CREDITOS EXIGIDOS' => 6],
                ['ID_AGRUPACION' => 21, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'PROGRAMACIÓN', 'CREDITOS EXIGIDOS' => 12],
                ['ID_AGRUPACION' => 22, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'SISTEMAS COMPUTACIONALES', 'CREDITOS EXIGIDOS' => 9],
                ['ID_AGRUPACION' => 23, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'SISTEMAS DE INFORMACIÓN E INGENIERÍA DEL SOFTWARE', 'CREDITOS EXIGIDOS' => 15],
                ['ID_AGRUPACION' => 24, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'GESTIÓN INFORMÁTICA', 'CREDITOS EXIGIDOS' => 24],
                ['ID_AGRUPACION' => 25, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OPTATIVA', 'AGRUPACION' => 'PROFESIONALES OPTATIVAS', 'CREDITOS EXIGIDOS' => 9],
                ['ID_AGRUPACION' => 26, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'PRÁCTICA PROFESIONAL', 'CREDITOS EXIGIDOS' => 7],
                ['ID_AGRUPACION' => 27, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'TRABAJO DE GRADO', 'CREDITOS EXIGIDOS' => 6],
                ['ID_AGRUPACION' => 28, 'ID_COMPONENTE' => 3, 'TIPO_AGRUPACION' => 'LIBRE ELECCIÓN', 'AGRUPACION' => 'LIBRE ELECCIÓN', 'CREDITOS EXIGIDOS' => 33],
                ['ID_AGRUPACION' => 29, 'ID_COMPONENTE' => 4, 'TIPO_AGRUPACION' => 'NIVELATORIO', 'AGRUPACION' => 'NIVELATORIO', 'CREDITOS EXIGIDOS' => 8],
                ['ID_AGRUPACION' => 30, 'ID_COMPONENTE' => 5, 'TIPO_AGRUPACION' => 'INGLES', 'AGRUPACION' => 'INGLES', 'CREDITOS EXIGIDOS' => 12],
            ],
            4026 => [
                ['ID_AGRUPACION' => 33, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'CUANTITATIVAS', 'CREDITOS EXIGIDOS' => 18],
                ['ID_AGRUPACION' => 34, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'SISTEMAS', 'CREDITOS EXIGIDOS' => 5],
                ['ID_AGRUPACION' => 35, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'SOCIO HUMANISTICA', 'CREDITOS EXIGIDOS' => 6],
                ['ID_AGRUPACION' => 36, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'ADMINISTRATIVO GENERAL', 'CREDITOS EXIGIDOS' => 16],
                ['ID_AGRUPACION' => 37, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OPTATIVA', 'AGRUPACION' => 'ADMINISTRATIVO GENERAL', 'CREDITOS EXIGIDOS' => 4],
                ['ID_AGRUPACION' => 38, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'FINANZAS', 'CREDITOS EXIGIDOS' => 14],
                ['ID_AGRUPACION' => 39, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'ECONOMÍA', 'CREDITOS EXIGIDOS' => 13],
                ['ID_AGRUPACION' => 40, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OPTATIVA', 'AGRUPACION' => 'ECONOMÍA', 'CREDITOS EXIGIDOS' => 2],
                ['ID_AGRUPACION' => 41, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'MERCADOS', 'CREDITOS EXIGIDOS' => 6],
                ['ID_AGRUPACION' => 42, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'PRODUCCIÓN', 'CREDITOS EXIGIDOS' => 6],
                ['ID_AGRUPACION' => 43, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OPTATIVA', 'AGRUPACION' => 'PRODUCCIÓN', 'CREDITOS EXIGIDOS' => 3],
                ['ID_AGRUPACION' => 44, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'DERECHO', 'CREDITOS EXIGIDOS' => 3],
                ['ID_AGRUPACION' => 45, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OPTATIVA', 'AGRUPACION' => 'DERECHO', 'CREDITOS EXIGIDOS' => 2],
                ['ID_AGRUPACION' => 46, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'INVESTIGACIÓN', 'CREDITOS EXIGIDOS' => 6],
                ['ID_AGRUPACION' => 47, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OPTATIVA', 'AGRUPACION' => 'INVESTIGACIÓN', 'CREDITOS EXIGIDOS' => 6],
                ['ID_AGRUPACION' => 48, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'GESTIÓN HUMANA', 'CREDITOS EXIGIDOS' => 5],
                ['ID_AGRUPACION' => 49, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'PRÁCTICA', 'CREDITOS EXIGIDOS' => 15],
                ['ID_AGRUPACION' => 50, 'ID_COMPONENTE' => 3, 'TIPO_AGRUPACION' => 'NIVELATORIO', 'AGRUPACION' => 'NIVELATORIO', 'CREDITOS EXIGIDOS' => 8],
                ['ID_AGRUPACION' => 51, 'ID_COMPONENTE' => 4, 'TIPO_AGRUPACION' => 'LIBRE ELECCIÓN', 'AGRUPACION' => 'LIBRE ELECCIÓN', 'CREDITOS EXIGIDOS' => 32],
                ['ID_AGRUPACION' => 52, 'ID_COMPONENTE' => 5, 'TIPO_AGRUPACION' => 'INGLES', 'AGRUPACION' => 'INGLES', 'CREDITOS EXIGIDOS' => 12],
            ]
        ];

        $creadasTotales = 0;
        $actualizadasTotales = 0;

        foreach ($programasData as $codigo => $agrupaciones) {
            $programa = Programa::where('Codigo_Programa', $codigo)->first();
            
            if (!$programa) {
                $this->command->error("No se encontro el programa con codigo {$codigo}");
                continue;
            }

            $this->command->info("Procesando " . count($agrupaciones) . " plantillas para el programa {$programa->Nombre_Programa}...");

            $creadas = 0;
            $actualizadas = 0;

            foreach ($agrupaciones as $plantillaData) {
                $nombreComponente = $componenteMap[$plantillaData['ID_COMPONENTE']] ?? null;
                if (!$nombreComponente) {
                    $this->command->warn("Componente no encontrado para ID {$plantillaData['ID_COMPONENTE']}");
                    continue;
                }

                $componente = Componente::where('Nombre_Componente', $nombreComponente)->first();
                if (!$componente) {
                    $this->command->warn("Componente '{$nombreComponente}' no encontrado en BD");
                    continue;
                }

                $tipoAgrupacionRaw = trim($plantillaData['TIPO_AGRUPACION']);
                $esObligatoria = match($tipoAgrupacionRaw) {
                    'OBLIGATORIA' => 1,
                    'OPTATIVA', 'LIBRE ELECCION', 'LIBRE ELECCIÓN', 'NIVELATORIO', 'INGLES' => 0,
                    default => 0,
                };
                
                // Modificar el nombre temporalmente si existe el duplicado para el mismo programa
                // o usar una lógica que permita insertar por ID específico.
                // Como truncamos la tabla al inicio del seeder, no habrá registros previos.
                $plantilla = PlantillaAgrupacion::create([
                    'ID_Plantilla_Agrupacion' => $plantillaData['ID_AGRUPACION'],
                    'ID_Programa' => $programa->ID_Programa,
                    'Nombre_Agrupacion' => trim($plantillaData['AGRUPACION']),
                    'ID_Componente' => $componente->ID_Componente,
                    'Tipo_Agrupacion' => $tipoAgrupacionRaw,
                    'Creditos_Requeridos' => $plantillaData['CREDITOS EXIGIDOS'],
                    'Es_Obligatoria' => $esObligatoria,
                ]);

                if ($plantilla->wasRecentlyCreated) {
                    $creadas++;
                    $creadasTotales++;
                    $this->command->info("✓ ID {$plantillaData['ID_AGRUPACION']}: " . trim($plantillaData['AGRUPACION']));
                } 
            }
        }

        $this->command->info("");
        $this->command->info("Resumen general:");
        $this->command->info("- Plantillas creadas: {$creadasTotales}");
        $this->command->info("- Plantillas actualizadas: {$actualizadasTotales}");
        $this->command->info("Plantillas listas para generar agrupaciones al procesar la malla.");
    }
}
