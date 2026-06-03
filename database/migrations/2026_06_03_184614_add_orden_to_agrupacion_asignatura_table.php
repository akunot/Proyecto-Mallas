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
            $table->integer('Orden')->default(0)->after('Semestre_Sugerido');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('agrupacion_asignatura', function (Blueprint $table) {
            $table->dropColumn('Orden');
        });
    }
};
