<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Agrega el campo de imagen/logo por programa.
     * Nullable: los programas existentes no se modifican (migración no destructiva).
     */
    public function up(): void
    {
        Schema::table('programas', function (Blueprint $table) {
            $table->string('Ruta_Imagen', 300)->nullable()->after('Area_Curricular');
        });
    }

    public function down(): void
    {
        Schema::table('programas', function (Blueprint $table) {
            $table->dropColumn('Ruta_Imagen');
        });
    }
};
