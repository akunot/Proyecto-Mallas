<?php

namespace Database\Seeders;

use App\Models\Sede;
use Illuminate\Database\Seeder;

class SedeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Sede::create([
            'Nombre_Sede' => 'Universidad Nacional de Colombia - Sede Manizales',
            'Ciudad_Sede' => 'Manizales',
            'Direccion_Sede' => 'Carrera 27 # 64-60',
            'Conmutador_Sede' => '6068879300',
            'Campus_Sede' => 'Campus La Nubia',
            'Url_Sede' => 'https://manizales.unal.edu.co',
        ]);
    }
}
