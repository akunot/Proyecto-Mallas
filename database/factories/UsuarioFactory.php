<?php

namespace Database\Factories;

use App\Models\Usuario;
use Illuminate\Database\Eloquent\Factories\Factory;

class UsuarioFactory extends Factory
{
    protected $model = Usuario::class;

    public function definition(): array
    {
        return [
            'Nombre_Usuario' => fake()->name(),
            'Email_Usuario' => fake()->unique()->safeEmail(),
            'Activo_Usuario' => 1,
        ];
    }

    public function inactivo(): static
    {
        return $this->state(fn(array $attributes) => [
            'Activo_Usuario' => 0,
        ]);
    }
}
