<?php

namespace Database\Seeders;

use App\Models\Facultad;
use Illuminate\Database\Seeder;

class FacultadSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $sedeId = 1; // UNAL Manizales

        $facultades = [
            [
                'Nombre_Facultad' => 'Facultad de Ingeniería y Arquitectura',
                'Conmutador_Facultad' => '6068879350',
                'Extension_Facultad' => '1350',
                'Campus_Facultad' => 'Campus La Nubia',
                'Url_Facultad' => 'https://manizales.unal.edu.co/facultades/ingenieria',
            ],
            [
                'Nombre_Facultad' => 'Facultad de Ciencias',
                'Conmutador_Facultad' => '6068879360',
                'Extension_Facultad' => '1360',
                'Campus_Facultad' => 'Campus La Nubia',
                'Url_Facultad' => 'https://manizales.unal.edu.co/facultades/ciencias',
            ],
            [
                'Nombre_Facultad' => 'Facultad de Administración',
                'Conmutador_Facultad' => '6068879370',
                'Extension_Facultad' => '1370',
                'Campus_Facultad' => 'Campus Palogrande',
                'Url_Facultad' => 'https://manizales.unal.edu.co/facultades/administracion',
            ],
            [
                'Nombre_Facultad' => 'Facultad deMedicina',
                'Conmutador_Facultad' => '6068879380',
                'Extension_Facultad' => '1380',
                'Campus_Facultad' => 'Campus Palogrande',
                'Url_Facultad' => 'https://manizales.unal.edu.co/facultades/medicina',
            ],
        ];

        foreach ($facultades as $facultad) {
            Facultad::create([
                'ID_Sede' => $sedeId,
                ...$facultad,
            ]);
        }
    }
}
