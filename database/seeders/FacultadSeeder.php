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
        $facultades = [
            [
                'Codigo_Facultad' => 4036,
                'Nombre_Facultad' => 'Facultad de Ingeniería y Arquitectura',
                'Conmutador_Facultad' => '8879300',
                'Extension_Facultad' => '50111',
                'Campus_Facultad' => 'Campus Palogrande',
                'Codigo_Sede' => 1103,
                'Url_Facultad' => 'https://fia.unal.edu.co/',
                'Esta_Activo' => 1,
            ],
            [
                'Codigo_Facultad' => 4037,
                'Nombre_Facultad' => 'Facultad de Ciencias Exactas y Naturales', 
                'Conmutador_Facultad' => '8879300',
                'Extension_Facultad' => '50423',
                'Campus_Facultad' => 'Campus Palogrande',
                'Codigo_Sede' => 1103,
                'Url_Facultad' => 'https://fcen.unal.edu.co/',
                'Esta_Activo' => 1,
            ],
            [
                'Codigo_Facultad' => 4046,
                'Nombre_Facultad' => 'Facultad de Administración',
                'Conmutador_Facultad' => '8879300',
                'Extension_Facultad' => '50133',
                'Campus_Facultad' => 'Campus Palogrande',
                'Codigo_Sede' => 1103,
                'Url_Facultad' => 'https://fadmon.unal.edu.co/',
                'Esta_Activo' => 1,
            ],
            [
                'Codigo_Facultad' => 4191,
                'Nombre_Facultad' => 'Facultad de Ciencias Humanas y Sociales',
                'Conmutador_Facultad' => '8879300',
                'Extension_Facultad' => '50136 - 50138',
                'Campus_Facultad' => 'Campus Palogrande',
                'Codigo_Sede' => 1103,
                'Url_Facultad' => '',
                'Esta_Activo' => 1,
            ],
        ];

        foreach ($facultades as $facultad) {
            Facultad::create([
                'Codigo_Facultad' => $facultad['Codigo_Facultad'],
                'Nombre_Facultad' => $facultad['Nombre_Facultad'],
                'Conmutador_Facultad' => $facultad['Conmutador_Facultad'],
                'Extension_Facultad' => $facultad['Extension_Facultad'],
                'Campus_Facultad' => $facultad['Campus_Facultad'],
                'Codigo_Sede' => $facultad['Codigo_Sede'],
                'Url_Facultad' => $facultad['Url_Facultad'],
                'Esta_Activo' => $facultad['Esta_Activo'],
            ]);
        }
    }
}

