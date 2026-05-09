<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Programa;
use App\Models\Componente;
use App\Models\PlantillaAgrupacion;

class PlantillaAgrupacionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info("Iniciando carga de plantillas de agrupación para Ingeniería Civil...");

        // Obtener el programa de Ingeniería Civil
        $programa = Programa::where('Codigo_Programa', 4021)->first();
        
        if (!$programa) {
            $this->command->error('No se encontró el programa de Ingeniería Civil (Código 4021)');
            return;
        }

        // Mapeo de componentes por ID del CSV
        $componenteMap = [
            1 => 'Fundamentación',
            2 => 'Disciplinar o Profesional', 
            3 => 'Libre Elección',
            4 => 'Nivelatorio',
            5 => 'Lengua Extranjera',
        ];

        // Plantillas de agrupaciones del CSV (sin ID_Malla)
        $plantillasAgrupaciones = [
            [
                'ID_COMPONENTE' => 1,
                'COMPONENTE' => 'FUNDAMENTACIÓN',
                'TIPO_AGRUPACIÓN' => 'OBLIGATORIA',
                'ID_AGRUPACIÓN' => 1,
                'AGRUPACIÓN' => 'MATEMÁTICAS, PROBABILIDAD Y ESTADÍSTICA',
                'CRÉDITOS EXIGIDOS' => 26,
            ],
            [
                'ID_COMPONENTE' => 1,
                'COMPONENTE' => 'FUNDAMENTACIÓN',
                'TIPO_AGRUPACIÓN' => 'OBLIGATORIA',
                'ID_AGRUPACIÓN' => 2,
                'AGRUPACIÓN' => 'FÍSICA',
                'CRÉDITOS EXIGIDOS' => 4,
            ],
            [
                'ID_COMPONENTE' => 1,
                'COMPONENTE' => 'FUNDAMENTACIÓN',
                'TIPO_AGRUPACIÓN' => 'OPTATIVA',
                'ID_AGRUPACIÓN' => 3,
                'AGRUPACIÓN' => 'FÍSICA',
                'CRÉDITOS EXIGIDOS' => 4,
            ],
            [
                'ID_COMPONENTE' => 1,
                'COMPONENTE' => 'FUNDAMENTACIÓN',
                'TIPO_AGRUPACIÓN' => 'OPTATIVA',
                'ID_AGRUPACIÓN' => 4,
                'AGRUPACIÓN' => 'HERRAMIENTAS INFORMÁTICAS Y MÉTODOS NUMÉRICOS',
                'CRÉDITOS EXIGIDOS' => 6,
            ],
            [
                'ID_COMPONENTE' => 1,
                'COMPONENTE' => 'FUNDAMENTACIÓN',
                'TIPO_AGRUPACIÓN' => 'OBLIGATORIA',
                'ID_AGRUPACIÓN' => 5,
                'AGRUPACIÓN' => 'CIENCIAS ECONÓMICAS Y ADMINISTRATIVAS',
                'CRÉDITOS EXIGIDOS' => 6,
            ],
            [
                'ID_COMPONENTE' => 1,
                'COMPONENTE' => 'FUNDAMENTACIÓN',
                'TIPO_AGRUPACIÓN' => 'OBLIGATORIA',
                'ID_AGRUPACIÓN' => 6,
                'AGRUPACIÓN' => 'CIENCIAS SOCIALES',
                'CRÉDITOS EXIGIDOS' => 3,
            ],
            [
                'ID_COMPONENTE' => 1,
                'COMPONENTE' => 'FUNDAMENTACIÓN',
                'TIPO_AGRUPACIÓN' => 'OBLIGATORIA',
                'ID_AGRUPACIÓN' => 7,
                'AGRUPACIÓN' => 'EXPRESIÓN GRÁFICA',
                'CRÉDITOS EXIGIDOS' => 3,
            ],
            [
                'ID_COMPONENTE' => 1,
                'COMPONENTE' => 'FUNDAMENTACIÓN',
                'TIPO_AGRUPACIÓN' => 'OBLIGATORIA',
                'ID_AGRUPACIÓN' => 8,
                'AGRUPACIÓN' => 'QUÍMICA',
                'CRÉDITOS EXIGIDOS' => 3,
            ],
            [
                'ID_COMPONENTE' => 2,
                'COMPONENTE' => 'DISCIPLINAR O PROFESIONAL',
                'TIPO_AGRUPACIÓN' => 'OBLIGATORIA',
                'ID_AGRUPACIÓN' => 9,
                'AGRUPACIÓN' => 'ESTRUCTURAS Y CONSTRUCCIÓN',
                'CRÉDITOS EXIGIDOS' => 15,
            ],
            [
                'ID_COMPONENTE' => 2,
                'COMPONENTE' => 'DISCIPLINAR O PROFESIONAL',
                'TIPO_AGRUPACIÓN' => 'OBLIGATORIA',
                'ID_AGRUPACIÓN' => 10,
                'AGRUPACIÓN' => 'VÍAS Y TRASPORTE',
                'CRÉDITOS EXIGIDOS' => 7,
            ],
            [
                'ID_COMPONENTE' => 2,
                'COMPONENTE' => 'DISCIPLINAR O PROFESIONAL',
                'TIPO_AGRUPACIÓN' => 'OBLIGATORIA',
                'ID_AGRUPACIÓN' => 11,
                'AGRUPACIÓN' => 'GEOTECNIA',
                'CRÉDITOS EXIGIDOS' => 13,
            ],
            [
                'ID_COMPONENTE' => 2,
                'COMPONENTE' => 'DISCIPLINAR O PROFESIONAL',
                'TIPO_AGRUPACIÓN' => 'OBLIGATORIA',
                'ID_AGRUPACIÓN' => 12,
                'AGRUPACIÓN' => 'HIDRÁULICA Y AMBIENTAL',
                'CRÉDITOS EXIGIDOS' => 15,
            ],
            [
                'ID_COMPONENTE' => 2,
                'COMPONENTE' => 'DISCIPLINAR O PROFESIONAL',
                'TIPO_AGRUPACIÓN' => 'OPTATIVA',
                'ID_AGRUPACIÓN' => 13,
                'AGRUPACIÓN' => 'CONSTRUCCIÓN DE OBRAS CIVILES',
                'CRÉDITOS EXIGIDOS' => 3,
            ],
            [
                'ID_COMPONENTE' => 2,
                'COMPONENTE' => 'DISCIPLINAR O PROFESIONAL',
                'TIPO_AGRUPACIÓN' => 'OBLIGATORIA',
                'ID_AGRUPACIÓN' => 14,
                'AGRUPACIÓN' => 'BÁSICA DISCIPLINAR',
                'CRÉDITOS EXIGIDOS' => 29,
            ],
            [
                'ID_COMPONENTE' => 2,
                'COMPONENTE' => 'DISCIPLINAR O PROFESIONAL',
                'TIPO_AGRUPACIÓN' => 'OBLIGATORIA',
                'ID_AGRUPACIÓN' => 15,
                'AGRUPACIÓN' => 'TRABAJO DE GRADO',
                'CRÉDITOS EXIGIDOS' => 6,
            ],
            [
                'ID_COMPONENTE' => 3,
                'COMPONENTE' => 'LIBRE ELECCIÓN',
                'TIPO_AGRUPACIÓN' => 'LIBRE ELECCIÓN',
                'ID_AGRUPACIÓN' => 31,
                'AGRUPACIÓN' => 'LIBRE ELECCIÓN',
                'CRÉDITOS EXIGIDOS' => 36,
            ],
            [
                'ID_COMPONENTE' => 4,
                'COMPONENTE' => 'NIVELATORIO',
                'TIPO_AGRUPACIÓN' => 'NIVELATORIO',
                'ID_AGRUPACIÓN' => 32,
                'AGRUPACIÓN' => 'NIVELATORIO',
                'CRÉDITOS EXIGIDOS' => 8,
            ],
            [
                'ID_COMPONENTE' => 5,
                'COMPONENTE' => 'LENGUA EXTRANJERA',
                'TIPO_AGRUPACIÓN' => 'INGLES',
                'ID_AGRUPACIÓN' => 33,
                'AGRUPACIÓN' => 'INGLES',
                'CRÉDITOS EXIGIDOS' => 12,
            ],
        ];

        $this->command->info("Procesando " . count($plantillasAgrupaciones) . " plantillas de agrupación...");

        $creadas = 0;
        $actualizadas = 0;

        foreach ($plantillasAgrupaciones as $plantillaData) {
            // Obtener el componente por nombre
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

            // Determinar si es obligatoria
            $esObligatoria = match($plantillaData['TIPO_AGRUPACIÓN']) {
                'OBLIGATORIA' => 1,
                'OPTATIVA', 'LIBRE ELECCIÓN', 'NIVELATORIO', 'INGLES' => 0,
                default => 0,
            };

            // Crear o actualizar la plantilla de agrupación
            $plantilla = PlantillaAgrupacion::updateOrCreate([
                'ID_Programa' => $programa->ID_Programa,
                'Nombre_Agrupacion' => $plantillaData['AGRUPACIÓN'],
            ], [
                'ID_Componente' => $componente->ID_Componente,
                'Tipo_Agrupacion' => $plantillaData['TIPO_AGRUPACIÓN'],
                'Creditos_Requeridos' => $plantillaData['CRÉDITOS EXIGIDOS'],
                'Es_Obligatoria' => $esObligatoria,
            ]);

            if ($plantilla->wasRecentlyCreated) {
                $creadas++;
                $this->command->info("✓ Creada: {$plantillaData['AGRUPACIÓN']} (ID: {$plantilla->ID_Plantilla_Agrupacion})");
            } else {
                $actualizadas++;
                $this->command->line("• Actualizada: {$plantillaData['AGRUPACIÓN']}");
            }
        }

        $this->command->info("");
        $this->command->info("Resumen del seeder de plantillas de agrupación:");
        $this->command->info("- Plantillas creadas: {$creadas}");
        $this->command->info("- Plantillas actualizadas: {$actualizadas}");
        $this->command->info("- Total procesadas: " . ($creadas + $actualizadas));
        $this->command->info("Plantillas listas para generar agrupaciones al procesar la malla.");
    }
}
