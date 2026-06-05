<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE cargas_mallas MODIFY COLUMN tipo_carga ENUM('asignaturas', 'electivas', 'malla', 'optativa') NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE cargas_mallas MODIFY COLUMN tipo_carga ENUM('asignaturas', 'electivas', 'malla') NOT NULL");
    }
};
