<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('sedes')->truncate();
        DB::table('facultades')->truncate();
        DB::table('programas')->truncate();
        DB::table('normativas')->truncate();
        DB::table('usuarios')->truncate();
        DB::table('componentes')->truncate();
        DB::table('plantillas_agrupacion')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $this->call([
            SedeSeeder::class,
            FacultadSeeder::class,
            ProgramaSeeder::class,
            NormativaSeeder::class,
            UsuarioSeeder::class,
            ComponenteSeeder::class,
            PlantillaAgrupacionSeeder::class,
        ]);
    }
}
