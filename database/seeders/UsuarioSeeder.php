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
        // Usuario administrador principal
        Usuario::create([
            'Nombre_Usuario' => 'Administrador Sistema',
            'Email_Usuario' => 'admin@unal.edu.co',
            'Activo_Usuario' => 1,
        ]);

        // Usuario revisor de ejemplo
        Usuario::create([
            'Nombre_Usuario' => 'Revisor Académico',
            'Email_Usuario' => 'revisor@unal.edu.co',
            'Activo_Usuario' => 1,
        ]);
    }
}
