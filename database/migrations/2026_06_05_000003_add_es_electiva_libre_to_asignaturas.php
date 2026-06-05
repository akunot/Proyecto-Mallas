<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('asignaturas', function (Blueprint $table) {
            $table->boolean('es_electiva_libre')->default(false)->after('Descripcion_Asignatura');
        });
    }

    public function down(): void
    {
        Schema::table('asignaturas', function (Blueprint $table) {
            $table->dropColumn('es_electiva_libre');
        });
    }
};
