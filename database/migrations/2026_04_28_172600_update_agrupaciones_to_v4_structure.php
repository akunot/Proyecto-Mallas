<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Actualiza agrupaciones a la estructura v4: ID_Malla -> ID_Programa
     */
    public function up(): void
    {
        Schema::table('agrupaciones', function (Blueprint $table) {
            // Agregar columna ID_Programa
            $table->unsignedBigInteger('ID_Programa')->after('ID_Agrupacion')->nullable();
            
            // Agregar columna Tipo_Agrupacion
            $table->string('Tipo_Agrupacion', 30)->after('ID_Componente')->nullable();
            
            // Agregar índice único para v4
            $table->unique(['ID_Programa', 'ID_Componente', 'Nombre_Agrupacion'], 'uq_agrupacion_programa');
        });

        // Copiar datos de ID_Malla a ID_Programa (temporal)
        DB::statement("
            UPDATE agrupaciones a 
            JOIN mallas_curriculares m ON a.ID_Malla = m.ID_Malla 
            SET a.ID_Programa = m.ID_Programa
        ");

        // Establecer foreign key para ID_Programa
        Schema::table('agrupaciones', function (Blueprint $table) {
            $table->foreign('ID_Programa')
                ->references('ID_Programa')
                ->on('programas')
                ->onDelete('restrict')
                ->onUpdate('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('agrupaciones', function (Blueprint $table) {
            $table->dropForeign(['ID_Programa']);
            $table->dropUnique('uq_agrupacion_programa');
            $table->dropColumn(['ID_Programa', 'Tipo_Agrupacion']);
        });
    }
};
