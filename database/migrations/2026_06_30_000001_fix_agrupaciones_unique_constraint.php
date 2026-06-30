<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agrupaciones', function (Blueprint $table) {
            $table->index('ID_Programa', 'idx_agrupaciones_id_programa');
        });

        Schema::table('agrupaciones', function (Blueprint $table) {
            $table->dropForeign(['ID_Programa']);
            $table->dropUnique('uq_agrupacion_programa');
        });

        Schema::table('agrupaciones', function (Blueprint $table) {
            $table->unique(['ID_Malla', 'ID_Componente', 'Nombre_Agrupacion'], 'uq_agrupacion_malla');
        });

        Schema::table('agrupaciones', function (Blueprint $table) {
            $table->foreign('ID_Programa')
                ->references('ID_Programa')
                ->on('programas')
                ->onDelete('restrict')
                ->onUpdate('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('agrupaciones', function (Blueprint $table) {
            $table->dropForeign(['ID_Programa']);
        });

        Schema::table('agrupaciones', function (Blueprint $table) {
            $table->dropUnique('uq_agrupacion_malla');
            $table->unique(['ID_Programa', 'ID_Componente', 'Nombre_Agrupacion'], 'uq_agrupacion_programa');
        });

        Schema::table('agrupaciones', function (Blueprint $table) {
            $table->foreign('ID_Programa')
                ->references('ID_Programa')
                ->on('programas')
                ->onDelete('restrict')
                ->onUpdate('cascade');
        });

        Schema::table('agrupaciones', function (Blueprint $table) {
            $table->dropIndex('idx_agrupaciones_id_programa');
        });
    }
};
