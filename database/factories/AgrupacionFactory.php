<?php

namespace Database\Factories;

use App\Models\Agrupacion;
use App\Models\Programa;
use Illuminate\Database\Eloquent\Factories\Factory;

class AgrupacionFactory extends Factory
{
    protected $model = Agrupacion::class;

    public function definition(): array
    {
        return [
            'Nombre_Agrupacion' => fake()->unique()->word().' '.fake()->randomElement(['Semestre', 'Ciclo', 'Nivel']),
            'ID_Programa' => Programa::factory(),
        ];
    }
}
