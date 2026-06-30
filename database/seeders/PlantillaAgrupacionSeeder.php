<?php

namespace Database\Seeders;

use App\Models\Componente;
use App\Models\PlantillaAgrupacion;
use App\Models\Programa;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PlantillaAgrupacionSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('Iniciando carga de plantillas de AGRUPACION...');

        // Limpiar plantillas existentes para evitar conflictos de IDs y nombres duplicados
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        PlantillaAgrupacion::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $componenteMap = [
            1 => 'Fundamentacion',
            2 => 'Disciplinar o Profesional',
            3 => 'Libre Eleccion',
            4 => 'Nivelatorio',
            5 => 'Lengua Extranjera',
        ];

        $programasData = [
            4021 => [
                ['ID_AGRUPACION' => 1, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Matemáticas, Probabilidad y Estadística', 'CREDITOS EXIGIDOS' => 26],
                ['ID_AGRUPACION' => 2, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Física', 'CREDITOS EXIGIDOS' => 4],
                ['ID_AGRUPACION' => 3, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OPTATIVA', 'AGRUPACION' => 'Física', 'CREDITOS EXIGIDOS' => 4],
                ['ID_AGRUPACION' => 4, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OPTATIVA', 'AGRUPACION' => 'Herramientas Informáticas y Métodos Numéricos', 'CREDITOS EXIGIDOS' => 6],
                ['ID_AGRUPACION' => 5, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Ciencias Económicas y Administrativas', 'CREDITOS EXIGIDOS' => 6],
                ['ID_AGRUPACION' => 6, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Ciencias Sociales', 'CREDITOS EXIGIDOS' => 3],
                ['ID_AGRUPACION' => 7, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Expresión Gráfica', 'CREDITOS EXIGIDOS' => 3],
                ['ID_AGRUPACION' => 8, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Química', 'CREDITOS EXIGIDOS' => 3],
                ['ID_AGRUPACION' => 9, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Estructuras y Construcción', 'CREDITOS EXIGIDOS' => 15],
                ['ID_AGRUPACION' => 10, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Vías y Trastorne', 'CREDITOS EXIGIDOS' => 7],
                ['ID_AGRUPACION' => 11, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Geotecnia', 'CREDITOS EXIGIDOS' => 13],
                ['ID_AGRUPACION' => 12, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Hidráulica y Ambiental', 'CREDITOS EXIGIDOS' => 15],
                ['ID_AGRUPACION' => 13, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OPTATIVA', 'AGRUPACION' => 'Construcción de Obras Civiles', 'CREDITOS EXIGIDOS' => 3],
                ['ID_AGRUPACION' => 14, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Básica Disciplinar', 'CREDITOS EXIGIDOS' => 29],
                ['ID_AGRUPACION' => 15, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Trabajo de Grado', 'CREDITOS EXIGIDOS' => 6],
                ['ID_AGRUPACION' => 31, 'ID_COMPONENTE' => 3, 'TIPO_AGRUPACION' => 'LIBRE ELECCIÓN', 'AGRUPACION' => 'Libre Elección', 'CREDITOS EXIGIDOS' => 36],
                ['ID_AGRUPACION' => 32, 'ID_COMPONENTE' => 4, 'TIPO_AGRUPACION' => 'NIVELATORIO', 'AGRUPACION' => 'Nivelatorio', 'CREDITOS EXIGIDOS' => 8],
            ],
            4035 => [
                ['ID_AGRUPACION' => 16, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Herramientas Informáticas', 'CREDITOS EXIGIDOS' => 3],
                ['ID_AGRUPACION' => 17, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Cuantitativas', 'CREDITOS EXIGIDOS' => 21],
                ['ID_AGRUPACION' => 18, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OPTATIVA', 'AGRUPACION' => 'Cuantitativas Optativas', 'CREDITOS EXIGIDOS' => 6],
                ['ID_AGRUPACION' => 19, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Administración', 'CREDITOS EXIGIDOS' => 16],
                ['ID_AGRUPACION' => 20, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Humanística', 'CREDITOS EXIGIDOS' => 6],
                ['ID_AGRUPACION' => 21, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Programación', 'CREDITOS EXIGIDOS' => 12],
                ['ID_AGRUPACION' => 22, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Sistemas Computacionales', 'CREDITOS EXIGIDOS' => 9],
                ['ID_AGRUPACION' => 23, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Sistemas de Información e Ingeniería del Software', 'CREDITOS EXIGIDOS' => 15],
                ['ID_AGRUPACION' => 24, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Gestión Informática', 'CREDITOS EXIGIDOS' => 24],
                ['ID_AGRUPACION' => 25, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OPTATIVA', 'AGRUPACION' => 'Profesionales Optativas', 'CREDITOS EXIGIDOS' => 9],
                ['ID_AGRUPACION' => 26, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Práctica Profesional', 'CREDITOS EXIGIDOS' => 7],
                ['ID_AGRUPACION' => 27, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Trabajo de Grado', 'CREDITOS EXIGIDOS' => 6],
                ['ID_AGRUPACION' => 28, 'ID_COMPONENTE' => 3, 'TIPO_AGRUPACION' => 'LIBRE ELECCIÓN', 'AGRUPACION' => 'Libre Elección', 'CREDITOS EXIGIDOS' => 33],
                ['ID_AGRUPACION' => 29, 'ID_COMPONENTE' => 4, 'TIPO_AGRUPACION' => 'NIVELATORIO', 'AGRUPACION' => 'Nivelatorio', 'CREDITOS EXIGIDOS' => 8],
                ['ID_AGRUPACION' => 30, 'ID_COMPONENTE' => 5, 'TIPO_AGRUPACION' => 'INGLES', 'AGRUPACION' => 'Ingles', 'CREDITOS EXIGIDOS' => 12],
            ],
            4026 => [
                ['ID_AGRUPACION' => 33, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Cuantitativas', 'CREDITOS EXIGIDOS' => 18],
                ['ID_AGRUPACION' => 34, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Sistemas', 'CREDITOS EXIGIDOS' => 5],
                ['ID_AGRUPACION' => 35, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Socio Humanistica', 'CREDITOS EXIGIDOS' => 6],
                ['ID_AGRUPACION' => 36, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Administrativo General', 'CREDITOS EXIGIDOS' => 16],
                ['ID_AGRUPACION' => 37, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OPTATIVA', 'AGRUPACION' => 'Administrativo General', 'CREDITOS EXIGIDOS' => 4],
                ['ID_AGRUPACION' => 38, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Finanzas', 'CREDITOS EXIGIDOS' => 14],
                ['ID_AGRUPACION' => 39, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Economía', 'CREDITOS EXIGIDOS' => 13],
                ['ID_AGRUPACION' => 40, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OPTATIVA', 'AGRUPACION' => 'Economía', 'CREDITOS EXIGIDOS' => 2],
                ['ID_AGRUPACION' => 41, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Mercados', 'CREDITOS EXIGIDOS' => 6],
                ['ID_AGRUPACION' => 42, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Producción', 'CREDITOS EXIGIDOS' => 6],
                ['ID_AGRUPACION' => 43, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OPTATIVA', 'AGRUPACION' => 'Producción', 'CREDITOS EXIGIDOS' => 3],
                ['ID_AGRUPACION' => 44, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Derecho', 'CREDITOS EXIGIDOS' => 3],
                ['ID_AGRUPACION' => 45, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OPTATIVA', 'AGRUPACION' => 'Derecho', 'CREDITOS EXIGIDOS' => 2],
                ['ID_AGRUPACION' => 46, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Investigación', 'CREDITOS EXIGIDOS' => 6],
                ['ID_AGRUPACION' => 47, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OPTATIVA', 'AGRUPACION' => 'Investigación', 'CREDITOS EXIGIDOS' => 6],
                ['ID_AGRUPACION' => 48, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Gestión Humana', 'CREDITOS EXIGIDOS' => 5],
                ['ID_AGRUPACION' => 49, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Práctica', 'CREDITOS EXIGIDOS' => 15],
                ['ID_AGRUPACION' => 50, 'ID_COMPONENTE' => 4, 'TIPO_AGRUPACION' => 'NIVELATORIO', 'AGRUPACION' => 'Nivelatorio', 'CREDITOS EXIGIDOS' => 8],
                ['ID_AGRUPACION' => 51, 'ID_COMPONENTE' => 3, 'TIPO_AGRUPACION' => 'LIBRE ELECCIÓN', 'AGRUPACION' => 'Libre Elección', 'CREDITOS EXIGIDOS' => 32],
                ['ID_AGRUPACION' => 52, 'ID_COMPONENTE' => 5, 'TIPO_AGRUPACION' => 'INGLES', 'AGRUPACION' => 'Ingles', 'CREDITOS EXIGIDOS' => 12],
            ],
            4027 => [
                ['ID_AGRUPACION' => 53, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Cuantitativas', 'CREDITOS EXIGIDOS' => 18],
                ['ID_AGRUPACION' => 54, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Sistemas', 'CREDITOS EXIGIDOS' => 5],
                ['ID_AGRUPACION' => 55, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Socio Humanistica', 'CREDITOS EXIGIDOS' => 6],
                ['ID_AGRUPACION' => 56, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Administrativo General', 'CREDITOS EXIGIDOS' => 16],
                ['ID_AGRUPACION' => 57, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OPTATIVA', 'AGRUPACION' => 'Administrativo General', 'CREDITOS EXIGIDOS' => 4],
                ['ID_AGRUPACION' => 58, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Finanzas', 'CREDITOS EXIGIDOS' => 14],
                ['ID_AGRUPACION' => 59, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Economía', 'CREDITOS EXIGIDOS' => 13],
                ['ID_AGRUPACION' => 60, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OPTATIVA', 'AGRUPACION' => 'Economía', 'CREDITOS EXIGIDOS' => 2],
                ['ID_AGRUPACION' => 61, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Mercados', 'CREDITOS EXIGIDOS' => 6],
                ['ID_AGRUPACION' => 62, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Producción', 'CREDITOS EXIGIDOS' => 6],
                ['ID_AGRUPACION' => 63, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OPTATIVA', 'AGRUPACION' => 'Producción', 'CREDITOS EXIGIDOS' => 3],
                ['ID_AGRUPACION' => 64, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Derecho', 'CREDITOS EXIGIDOS' => 3],
                ['ID_AGRUPACION' => 65, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OPTATIVA', 'AGRUPACION' => 'Derecho', 'CREDITOS EXIGIDOS' => 2],
                ['ID_AGRUPACION' => 66, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Investigación', 'CREDITOS EXIGIDOS' => 6],
                ['ID_AGRUPACION' => 67, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OPTATIVA', 'AGRUPACION' => 'Investigación', 'CREDITOS EXIGIDOS' => 6],
                ['ID_AGRUPACION' => 68, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Gestión Humana', 'CREDITOS EXIGIDOS' => 5],
                ['ID_AGRUPACION' => 69, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Práctica', 'CREDITOS EXIGIDOS' => 15],
                ['ID_AGRUPACION' => 70, 'ID_COMPONENTE' => 4, 'TIPO_AGRUPACION' => 'NIVELATORIO', 'AGRUPACION' => 'Nivelatorios', 'CREDITOS EXIGIDOS' => 8],
                ['ID_AGRUPACION' => 71, 'ID_COMPONENTE' => 3, 'TIPO_AGRUPACION' => 'LIBRE ELECCIÓN', 'AGRUPACION' => 'Libre Elección', 'CREDITOS EXIGIDOS' => 32],
                ['ID_AGRUPACION' => 72, 'ID_COMPONENTE' => 5, 'TIPO_AGRUPACION' => 'INGLES', 'AGRUPACION' => 'Ingles', 'CREDITOS EXIGIDOS' => 12],
            ],
            4033 => [
                ['ID_AGRUPACION' => 73, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Area de Cultura', 'CREDITOS EXIGIDOS' => 3],
                ['ID_AGRUPACION' => 74, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Area de Comunicación', 'CREDITOS EXIGIDOS' => 9],
                ['ID_AGRUPACION' => 75, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OPTATIVA', 'AGRUPACION' => 'Area de Comunicación', 'CREDITOS EXIGIDOS' => 3],
                ['ID_AGRUPACION' => 76, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Areas de Investigación', 'CREDITOS EXIGIDOS' => 13],
                ['ID_AGRUPACION' => 77, 'ID_COMPONENTE' => 1, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Area de Expresiones Artísticas', 'CREDITOS EXIGIDOS' => 12],
                ['ID_AGRUPACION' => 78, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Area de Cultura', 'CREDITOS EXIGIDOS' => 21],
                ['ID_AGRUPACION' => 79, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OPTATIVA', 'AGRUPACION' => 'Area de Cultura', 'CREDITOS EXIGIDOS' => 2],
                ['ID_AGRUPACION' => 80, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Area de Gestión', 'CREDITOS EXIGIDOS' => 20],
                ['ID_AGRUPACION' => 81, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OPTATIVA', 'AGRUPACION' => 'Area de Gestión', 'CREDITOS EXIGIDOS' => 3],
                ['ID_AGRUPACION' => 82, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OPTATIVA', 'AGRUPACION' => 'Economía', 'CREDITOS EXIGIDOS' => 2],
                ['ID_AGRUPACION' => 83, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Area de Comunicación', 'CREDITOS EXIGIDOS' => 5],
                ['ID_AGRUPACION' => 84, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Area de Investigación', 'CREDITOS EXIGIDOS' => 15],
                ['ID_AGRUPACION' => 85, 'ID_COMPONENTE' => 2, 'TIPO_AGRUPACION' => 'OBLIGATORIA', 'AGRUPACION' => 'Area de Expresiones Artísticas', 'CREDITOS EXIGIDOS' => 7],
                ['ID_AGRUPACION' => 86, 'ID_COMPONENTE' => 3, 'TIPO_AGRUPACION' => 'LIBRE ELECCIÓN', 'AGRUPACION' => 'Libre Elección', 'CREDITOS EXIGIDOS' => 28],
                ['ID_AGRUPACION' => 87, 'ID_COMPONENTE' => 4, 'TIPO_AGRUPACION' => 'NIVELATORIO', 'AGRUPACION' => 'Nivelatorio', 'CREDITOS EXIGIDOS' => 8],
                ['ID_AGRUPACION' => 88, 'ID_COMPONENTE' => 5, 'TIPO_AGRUPACION' => 'INGLES', 'AGRUPACION' => 'Ingles', 'CREDITOS EXIGIDOS' => 15],
            ],
        ];

        $creadasTotales = 0;
        $actualizadasTotales = 0;

        foreach ($programasData as $codigo => $agrupaciones) {
            $programa = Programa::where('Codigo_Programa', $codigo)->first();

            if (! $programa) {
                $this->command->error("No se encontro el programa con codigo {$codigo}");

                continue;
            }

            $this->command->info('Procesando '.count($agrupaciones)." plantillas para el programa {$programa->Nombre_Programa}...");

            $creadas = 0;
            $actualizadas = 0;

            foreach ($agrupaciones as $plantillaData) {
                $nombreComponente = $componenteMap[$plantillaData['ID_COMPONENTE']] ?? null;
                if (! $nombreComponente) {
                    $this->command->warn("Componente no encontrado para ID {$plantillaData['ID_COMPONENTE']}");

                    continue;
                }

                $componente = Componente::where('Nombre_Componente', $nombreComponente)->first();
                if (! $componente) {
                    $this->command->warn("Componente '{$nombreComponente}' no encontrado en BD");

                    continue;
                }

                $tipoAgrupacionRaw = trim($plantillaData['TIPO_AGRUPACION']);
                $esObligatoria = match ($tipoAgrupacionRaw) {
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
                    $this->command->info("✓ ID {$plantillaData['ID_AGRUPACION']}: ".trim($plantillaData['AGRUPACION']));
                }
            }
        }

        $this->command->info('');
        $this->command->info('Resumen general:');
        $this->command->info("- Plantillas creadas: {$creadasTotales}");
        $this->command->info("- Plantillas actualizadas: {$actualizadasTotales}");
        $this->command->info('Plantillas listas para generar agrupaciones al procesar la malla.');
    }
}
