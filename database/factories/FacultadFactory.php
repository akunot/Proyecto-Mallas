<?php

namespace Database\Factories;

use App\Models\Facultad;
use App\Models\Sede;
use Illuminate\Database\Eloquent\Factories\Factory;

class FacultadFactory extends Factory
{
    protected $model = Facultad::class;

    public function definition(): array
    {
        return [
            'Codigo_Sede' => fn () => Sede::factory()->create()->Codigo_Sede,
            'Codigo_Facultad' => fake()->unique()->randomNumber(4),
            'Nombre_Facultad' => fake()->word().' Faculty',
            'Conmutador_Facultad' => fake()->phoneNumber(),
            'Extension_Facultad' => fake()->randomNumber(3),
            'Campus_Facultad' => fake()->word(),
            'Url_Facultad' => fake()->url(),
            'Esta_Activo' => 1,
        ];
    }
}
