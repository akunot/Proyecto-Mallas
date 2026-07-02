<?php

namespace Database\Factories;

use App\Models\Normativa;
use App\Models\Programa;
use Illuminate\Database\Eloquent\Factories\Factory;

class NormativaFactory extends Factory
{
    protected $model = Normativa::class;

    public function definition(): array
    {
        return [
            'Codigo_Programa' => fn () => Programa::factory()->create()->Codigo_Programa,
            'Tipo_Normativa' => fake()->randomElement(['Acuerdo', 'Resolución', 'Decreto']),
            'Numero_Normativa' => fake()->numerify('###'),
            'Anio_Normativa' => fake()->numberBetween(2010, 2026),
            'Instancia' => fake()->word(),
            'Descripcion_Normativa' => fake()->sentence(),
            'Url_Normativa' => fake()->url(),
            'Esta_Activo' => 1,
        ];
    }
}
