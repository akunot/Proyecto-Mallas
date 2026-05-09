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

        $componenteMap = [
            1 => 'Fundamentacion',
            2 => 'Disciplinar o Profesional', 
            3 => 'Libre ELECCION',
            4 => 'Nivelatorio',
            5 => 'Lengua Extranjera',
        ];

        $programasData = [
            4021 => [
                ['ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'MATEMATICAS, PROBABILIDAD Y ESTADISTICA', 'CREDITOS EXIGIDOS' => 26],
                ['ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'FISICA', 'CREDITOS EXIGIDOS' => 4],
                ['ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OPTATIVA', 'AGRUPACION' => 'FISICA', 'CREDITOS EXIGIDOS' => 4],
                ['ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OPTATIVA', 'AGRUPACION' => 'HERRAMIENTAS INFORMTICAS Y MTODOS NUMRICOS', 'CREDITOS EXIGIDOS' => 6],
                ['ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'CIENCIAS ECONMICAS Y ADMINISTRATIVAS', 'CREDITOS EXIGIDOS' => 6],
                ['ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'CIENCIAS SOCIALES', 'CREDITOS EXIGIDOS' => 3],
                ['ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'EXPRESION GRAFICA', 'CREDITOS EXIGIDOS' => 3],
                ['ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'QUIMICA', 'CREDITOS EXIGIDOS' => 3],
                ['ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'ESTRUCTURAS Y CONSTRUCCION', 'CREDITOS EXIGIDOS' => 15],
                ['ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'VIAS Y TRASPORTE', 'CREDITOS EXIGIDOS' => 7],
                ['ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'GEOTECNIA', 'CREDITOS EXIGIDOS' => 13],
                ['ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'HIDRAULICA Y AMBIENTAL', 'CREDITOS EXIGIDOS' => 15],
                ['ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OPTATIVA', 'AGRUPACION' => 'CONSTRUCCION DE OBRAS CIVILES', 'CREDITOS EXIGIDOS' => 3],
                ['ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'BASICA DISCIPLINAR', 'CREDITOS EXIGIDOS' => 29],
                ['ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'TRABAJO DE GRADO', 'CREDITOS EXIGIDOS' => 6],
                ['ID_COMPONENTE' => 3, 'TIPO_AGRUPACION' => 'LIBRE ELECCION', 'AGRUPACION' => 'LIBRE ELECCION', 'CREDITOS EXIGIDOS' => 36],
                ['ID_COMPONENTE' => 4, 'TIPO_AGRUPACION' => 'NIVELATORIO', 'AGRUPACION' => 'NIVELATORIO', 'CREDITOS EXIGIDOS' => 8],
                ['ID_COMPONENTE' => 5, 'TIPO_AGRUPACION' => 'INGLES', 'AGRUPACION' => 'INGLES', 'CREDITOS EXIGIDOS' => 12],
            ],
            4035 => [
                ['ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'HERRAMIENTAS INFORMATICAS', 'CREDITOS EXIGIDOS' => 3],
                ['ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'CUANTITATIVAS', 'CREDITOS EXIGIDOS' => 21],
                ['ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OPTATIVA', 'AGRUPACION' => 'CUANTITATIVAS OPTATIVAS', 'CREDITOS EXIGIDOS' => 6],
                ['ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'ADMINISTRACION', 'CREDITOS EXIGIDOS' => 16],
                ['ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'HUMANASTICA', 'CREDITOS EXIGIDOS' => 6],
                ['ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'PROGRAMACION', 'CREDITOS EXIGIDOS' => 12],
                ['ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'SISTEMAS COMPUTACIONALES', 'CREDITOS EXIGIDOS' => 9],
                ['ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'SISTEMAS DE INFORMACION E INGENIERIA DEL SOFTWARE', 'CREDITOS EXIGIDOS' => 15],
                ['ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'GESTION INFORMATICA', 'CREDITOS EXIGIDOS' => 24],
                ['ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OPTATIVA', 'AGRUPACION' => 'PROFESIONALES OPTATIVAS', 'CREDITOS EXIGIDOS' => 9],
                ['ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'PRACTICA PROFESIONAL', 'CREDITOS EXIGIDOS' => 7],
                ['ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'TRABAJO DE GRADO', 'CREDITOS EXIGIDOS' => 6],
                ['ID_COMPONENTE' => 3, 'TIPO_AGRUPACION' => 'LIBRE ELECCION', 'AGRUPACION' => 'LIBRE ELECCION', 'CREDITOS EXIGIDOS' => 33],
                ['ID_COMPONENTE' => 4, 'TIPO_AGRUPACION' => 'NIVELATORIO', 'AGRUPACION' => 'NIVELATORIO', 'CREDITOS EXIGIDOS' => 8],
                ['ID_COMPONENTE' => 5, 'TIPO_AGRUPACION' => 'INGLES', 'AGRUPACION' => 'INGLES', 'CREDITOS EXIGIDOS' => 12],
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
                    'OPTATIVA', 'LIBRE ELECCION', 'NIVELATORIO', 'INGLES' => 0,
                    default => 0,
                };
                
                $plantilla = PlantillaAgrupacion::updateOrCreate([
                    'ID_Programa' => $programa->ID_Programa,
                    'Nombre_Agrupacion' => trim($plantillaData['AGRUPACION']),
                ], [
                    'ID_Componente' => $componente->ID_Componente,
                    'Tipo_Agrupacion' => $tipoAgrupacionRaw,
                    'Creditos_Requeridos' => $plantillaData['CREDITOS EXIGIDOS'],
                    'Es_Obligatoria' => $esObligatoria,
                ]);

                if ($plantilla->wasRecentlyCreated) {
                    $creadas++;
                    $creadasTotales++;
                    $this->command->info("? Creada: " . trim($plantillaData['AGRUPACION']));
                } else {
                    $actualizadas++;
                    $actualizadasTotales++;
                    $this->command->line("? Actualizada: " . trim($plantillaData['AGRUPACION']));
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
