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
                'Codigo_Facultad' => 1,
                'Nombre_Facultad' => 'Facultad de Ingeniería y Arquitectura',
                'Conmutador_Facultad' => '6068879350',
                'Extension_Facultad' => '1350',
                'Campus_Facultad' => 'Campus La Nubia',
                'Url_Facultad' => 'https://manizales.unal.edu.co/facultades/ingenieria',
                'Esta_Activo' => 1,
            ],
            [
                'Codigo_Facultad' => 2,
                'Nombre_Facultad' => 'Facultad de Ciencias',
                'Conmutador_Facultad' => '6068879360',
                'Extension_Facultad' => '1360',
                'Campus_Facultad' => 'Campus La Nubia',
                'Url_Facultad' => 'https://manizales.unal.edu.co/facultades/ciencias',
                'Esta_Activo' => 1,
            ],
            [
                'Codigo_Facultad' => 3,
                'Nombre_Facultad' => 'Facultad de Administración',
                'Conmutador_Facultad' => '6068879370',
                'Extension_Facultad' => '1370',
                'Campus_Facultad' => 'Campus Palogrande',
                'Url_Facultad' => 'https://manizales.unal.edu.co/facultades/administracion',
                'Esta_Activo' => 1,
            ],
            [
                'Codigo_Facultad' => 4,
                'Nombre_Facultad' => 'Facultad de Medicina',
                'Conmutador_Facultad' => '6068879380',
                'Extension_Facultad' => '1380',
                'Campus_Facultad' => 'Campus Palogrande',
                'Url_Facultad' => 'https://manizales.unal.edu.co/facultades/medicina',
                'Esta_Activo' => 1,
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
