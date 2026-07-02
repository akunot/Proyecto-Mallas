<?php

namespace Database\Factories;

use App\Models\Sede;
use Illuminate\Database\Eloquent\Factories\Factory;

class SedeFactory extends Factory
{
    protected $model = Sede::class;

    public function definition(): array
    {
        return [
            'Codigo_Sede' => fake()->unique()->randomNumber(5),
            'Nombre_Sede' => fake()->city().' Campus',
            'Ciudad_Sede' => fake()->city(),
            'Direccion_Sede' => fake()->address(),
            'Conmutador_Sede' => fake()->phoneNumber(),
            'Campus_Sede' => fake()->word(),
            'Url_Sede' => fake()->url(),
        ];
    }
}
