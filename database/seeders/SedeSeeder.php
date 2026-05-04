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
            'Codigo_Sede' => 1103,
            'Nombre_Sede' => 'Manizales',
            'Ciudad_Sede' => 'Manizales',
            'Direccion_Sede' => 'Carrera 27 # 64-60',
            'Conmutador_Sede' => '8879300',
            'Campus_Sede' => 'Campus Palogrande',
            'Url_Sede' => 'https://manizales.unal.edu.co/',
        ]);
    }
}
