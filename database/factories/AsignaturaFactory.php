<?php

namespace Database\Factories;

use App\Models\Asignatura;
use Illuminate\Database\Eloquent\Factories\Factory;

class AsignaturaFactory extends Factory
{
    protected $model = Asignatura::class;

    public function definition(): array
    {
        $codigo = (string) fake()->unique()->randomNumber(7);

        return [
            'Codigo_Asignatura' => $codigo,
            'Codigo_Base' => $codigo,
            'Nombre_Asignatura' => fake()->sentence(3),
            'Creditos_Asignatura' => fake()->numberBetween(1, 6),
            'Horas_Presencial' => fake()->numberBetween(0, 64),
            'Horas_Estudiante' => fake()->numberBetween(0, 64),
            'Descripcion_Asignatura' => fake()->paragraph(),
            'es_electiva_libre' => false,
        ];
    }

    public function electiva(): static
    {
        return $this->state(fn(array $attributes) => [
            'es_electiva_libre' => true,
        ]);
    }
}
