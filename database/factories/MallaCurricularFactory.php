<?php

namespace Database\Factories;

use App\Models\MallaCurricular;
use App\Models\Normativa;
use App\Models\Programa;
use Illuminate\Database\Eloquent\Factories\Factory;

class MallaCurricularFactory extends Factory
{
    protected $model = MallaCurricular::class;

    public function definition(): array
    {
        $programa = Programa::factory()->create();

        return [
            'ID_Normativa' => Normativa::factory()->create(['Codigo_Programa' => $programa->Codigo_Programa])->ID_Normativa,
            'ID_Programa' => $programa->ID_Programa,
            'Version_Numero' => 1,
            'Fecha_Vigencia' => now(),
            'Estado' => 'borrador',
            'Es_Vigente' => 0,
        ];
    }

    public function version(int $numero): static
    {
        return $this->state(fn (array $attributes) => [
            'Version_Numero' => $numero,
        ]);
    }

    public function activa(): static
    {
        return $this->state(fn (array $attributes) => [
            'Estado' => 'activa',
            'Es_Vigente' => 1,
        ]);
    }
}
