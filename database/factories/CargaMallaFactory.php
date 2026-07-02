<?php

namespace Database\Factories;

use App\Models\CargaMalla;
use App\Models\Usuario;
use Illuminate\Database\Eloquent\Factories\Factory;

class CargaMallaFactory extends Factory
{
    protected $model = CargaMalla::class;

    public function definition(): array
    {
        return [
            'ID_Usuario' => Usuario::factory(),
            'tipo_carga' => 'malla',
            'Estado_Carga' => 'esperando_archivos',
        ];
    }

    public function tipo(string $tipo): static
    {
        return $this->state(fn(array $attributes) => [
            'tipo_carga' => $tipo,
        ]);
    }

    public function estado(string $estado): static
    {
        return $this->state(fn(array $attributes) => [
            'Estado_Carga' => $estado,
        ]);
    }
}
