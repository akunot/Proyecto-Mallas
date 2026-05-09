<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Agrupacion;
use App\Models\MallaCurricular;
use App\Models\Programa;
use App\Models\Componente;

class AgrupacionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info("Seeder de agrupaciones - NOTA: Las agrupaciones se crearán durante el procesamiento del Excel de malla.");
        $this->command->info("Este seeder ahora solo sirve como referencia de la estructura esperada.");
        
        // Obtener el programa de Ingeniería Civil para referencia
        $programa = Programa::where('Codigo_Programa', 4021)->first();
        
        if (!$programa) {
            $this->command->error('No se encontró el programa de Ingeniería Civil (Código 4021)');
            return;
        }

        $this->command->info("Programa de Ingeniería Civil encontrado: ID {$programa->ID_Programa}");
        $this->command->info("Las agrupaciones se crearán automáticamente al procesar el archivo Excel de malla.");

        // NOTA: Las agrupaciones deben crearse durante el procesamiento del Excel
        // ya que requieren un ID_Malla válido que solo se genera al procesar el archivo.
        
        $this->command->info("Estructura de agrupaciones esperada para Ingeniería Civil:");
        $this->command->info("- 8 agrupaciones de Fundamentación");
        $this->command->info("- 7 agrupaciones de Disciplinar/Profesional");
        $this->command->info("- 1 agrupación de Libre Elección");
        $this->command->info("- 1 agrupación de Nivelatorio");
        $this->command->info("- 1 agrupación de Lengua Extranjera");
        $this->command->info("Total: 18 agrupaciones");
        
        $this->command->info("El ExcelParserService procesará las agrupaciones del CSV automáticamente.");
    }
}
