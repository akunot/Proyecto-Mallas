<?php

namespace Database\Factories;

use App\Models\Facultad;
use App\Models\Programa;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProgramaFactory extends Factory
{
    protected $model = Programa::class;

    public function definition(): array
    {
        return [
            'Codigo_Facultad' => fn () => Facultad::factory()->create()->Codigo_Facultad,
            'Codigo_Programa' => fake()->unique()->randomNumber(5),
            'Nombre_Programa' => fake()->sentence(3),
            'Titulo_Otorgado' => fake()->sentence(2),
            'Nivel_Formacion' => fake()->randomElement(['Pregrado', 'Maestría', 'Doctorado']),
            'Creditos_Totales' => fake()->numberBetween(120, 180),
            'Duracion_Semestres' => fake()->numberBetween(8, 12),
            'Codigo_SNIES' => fake()->numerify('######'),
            'Url_Programa' => fake()->url(),
            'Campus_Programa' => fake()->word(),
            'Conmutador' => fake()->phoneNumber(),
            'Extension' => fake()->randomNumber(3),
            'Correo' => fake()->email(),
            'Area_Curricular' => fake()->word(),
            'Esta_Activo' => 1,
        ];
    }
}
