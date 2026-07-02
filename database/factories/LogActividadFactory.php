<?php

namespace Database\Factories;

use App\Models\LogActividad;
use App\Models\Usuario;
use Illuminate\Database\Eloquent\Factories\Factory;

class LogActividadFactory extends Factory
{
    protected $model = LogActividad::class;

    public function definition(): array
    {
        return [
            'ID_Usuario' => Usuario::factory(),
            'Accion_Log' => fake()->randomElement(['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT']),
            'Entidad_Log' => fake()->randomElement(['sede', 'facultad', 'programa', 'malla']),
            'Entidad_ID_Log' => fake()->randomNumber(3),
            'Detalle_Log' => json_encode(['nombre' => fake()->word()]),
            'IP_Origen_Log' => fake()->ipv4(),
        ];
    }
}
