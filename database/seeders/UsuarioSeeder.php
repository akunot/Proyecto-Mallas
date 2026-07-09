<?php

namespace Database\Seeders;

use App\Models\Usuario;
use Illuminate\Database\Seeder;

class UsuarioSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Usuario::create([
            'Nombre_Usuario' => 'Sistema de Información Académico',
            'Email_Usuario' => 'sia_man@unal.edu.co',
            'Activo_Usuario' => 1,
        ]);

        Usuario::create([
            'Nombre_Usuario' => 'Espacio Virtual de Atencion',
            'Email_Usuario' => 'eva_man@unal.edu.co',
            'Activo_Usuario' => 1,
        ]);

        Usuario::create([
            'Nombre_Usuario' => 'Sergio Alejandro',
            'Email_Usuario' => 'secastrob@unal.edu.co',
            'Activo_Usuario' => 1,
        ]);
    }
}
