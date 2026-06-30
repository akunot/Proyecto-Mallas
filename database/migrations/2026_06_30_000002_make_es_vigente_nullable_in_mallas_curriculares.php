<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE mallas_curriculares MODIFY COLUMN Es_Vigente TINYINT NULL DEFAULT NULL');
        DB::statement('UPDATE mallas_curriculares SET Es_Vigente = NULL WHERE Es_Vigente = 0');
    }

    public function down(): void
    {
        DB::statement('UPDATE mallas_curriculares SET Es_Vigente = 0 WHERE Es_Vigente IS NULL');
        DB::statement('ALTER TABLE mallas_curriculares MODIFY COLUMN Es_Vigente TINYINT NOT NULL DEFAULT 0');
    }
};
