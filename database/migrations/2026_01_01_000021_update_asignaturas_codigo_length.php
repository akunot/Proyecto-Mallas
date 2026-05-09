<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('asignaturas', function (Blueprint $table) {
            // Actualizar Codigo_Asignatura a VARCHAR(20) para soportar códigos con sufijos
            $table->string('Codigo_Asignatura', 20)->change();
            
            // Solo modificar Codigo_Base si la columna existe
            if (Schema::hasColumn('asignaturas', 'Codigo_Base')) {
                $table->string('Codigo_Base', 20)->change();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('asignaturas', function (Blueprint $table) {
            $table->string('Codigo_Asignatura', 255)->change();
            
            // Solo revertir Codigo_Base si la columna existe
            if (Schema::hasColumn('asignaturas', 'Codigo_Base')) {
                $table->string('Codigo_Base', 255)->change();
            }
        });
    }
};
