<?php

namespace Database\Factories;

use App\Models\Componente;
use App\Models\PlantillaAgrupacion;
use App\Models\Programa;
use Illuminate\Database\Eloquent\Factories\Factory;

class PlantillaAgrupacionFactory extends Factory
{
    protected $model = PlantillaAgrupacion::class;

    public function definition(): array
    {
        return [
            'ID_Programa' => Programa::factory(),
            'ID_Componente' => Componente::factory(),
            'Indice_Agrupacion_Excel' => fake()->numberBetween(1, 10),
            'Nombre_Agrupacion' => fake()->unique()->word().' '.fake()->randomElement(['Semestre', 'Ciclo', 'Nivel']),
            'Tipo_Agrupacion' => fake()->randomElement(['Semestral', 'Anual', 'Ciclo']),
            'Creditos_Requeridos' => fake()->optional()->numberBetween(1, 20),
            'Creditos_Maximos' => fake()->optional()->numberBetween(1, 30),
            'Es_Obligatoria' => fake()->boolean(),
        ];
    }
}
