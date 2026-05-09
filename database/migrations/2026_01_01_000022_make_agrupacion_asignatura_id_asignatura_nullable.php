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
        Schema::table('agrupacion_asignatura', function (Blueprint $table) {
            // Hacer ID_Asignatura nullable para soportar slots
            $table->unsignedBigInteger('ID_Asignatura')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('agrupacion_asignatura', function (Blueprint $table) {
            $table->unsignedBigInteger('ID_Asignatura')->nullable(false)->change();
        });
    }
};
