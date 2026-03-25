<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Tabla: asignatura
     */
    public function up(): void
    {
        Schema::create('asignaturas', function (Blueprint $table) {
            $table->id('ID_Asignatura');
            $table->string('Codigo_Asignatura', 20)->unique();
            $table->string('Nombre_Asignatura', 200);
            $table->unsignedInteger('Creditos_Asignatura');
            $table->unsignedInteger('Horas_Presencial')->nullable();
            $table->unsignedInteger('Horas_Estudiante')->nullable();
            $table->text('Descripcion_Asignatura')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('asignaturas');
    }
};
