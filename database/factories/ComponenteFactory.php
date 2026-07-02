<?php

namespace Database\Factories;

use App\Models\Componente;
use Illuminate\Database\Eloquent\Factories\Factory;

class ComponenteFactory extends Factory
{
    protected $model = Componente::class;

    public function definition(): array
    {
        return [
            'Nombre_Componente' => fake()->unique()->word(),
            'Descripcion_Componente' => fake()->sentence(),
        ];
    }
}
