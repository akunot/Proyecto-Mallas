<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Agrega ID_Malla a agrupacion_asignatura según v4
     */
    public function up(): void
    {
        Schema::table('agrupacion_asignatura', function (Blueprint $table) {
            // Agregar columna ID_Malla
            $table->unsignedBigInteger('ID_Malla')->after('ID_Agrupacion');
            
            // Agregar índice único para v4
            $table->unique(['ID_Agrupacion', 'ID_Asignatura', 'ID_Malla'], 'uq_agrup_asig_malla');
        });

        // Establecer foreign key para ID_Malla
        Schema::table('agrupacion_asignatura', function (Blueprint $table) {
            $table->foreign('ID_Malla')
                ->references('ID_Malla')
                ->on('mallas_curriculares')
                ->onDelete('restrict')
                ->onUpdate('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('agrupacion_asignatura', function (Blueprint $table) {
            $table->dropForeign(['ID_Malla']);
            $table->dropUnique('uq_agrup_asig_malla');
            $table->dropColumn('ID_Malla');
        });
    }
};
