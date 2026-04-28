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
        Schema::table('cargas_mallas', function (Blueprint $table) {
            $table->unsignedBigInteger('ID_Normativa')->nullable()->change();
            $table->unsignedBigInteger('ID_Programa')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cargas_mallas', function (Blueprint $table) {
            $table->dropForeign('cargas_mallas_id_normativa_foreign');
            $table->dropForeign('cargas_mallas_id_programa_foreign');
            $table->unsignedBigInteger('ID_Normativa')->nullable(false)->change();
            $table->unsignedBigInteger('ID_Programa')->nullable(false)->change();
            $table->foreign('ID_Normativa')
                ->references('ID_Normativa')
                ->on('normativa')
                ->onDelete('restrict')
                ->onUpdate('cascade');
            $table->foreign('ID_Programa')
                ->references('ID_Programa')
                ->on('programa')
                ->onDelete('restrict')
                ->onUpdate('cascade');
        });
    }
};
