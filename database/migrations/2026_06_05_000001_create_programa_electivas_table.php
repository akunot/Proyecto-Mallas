<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('programa_electivas', function (Blueprint $table) {
            $table->id('ID_Prog_Electiva');
            $table->unsignedBigInteger('ID_Programa');
            $table->unsignedBigInteger('ID_Asignatura');
            $table->timestamps();

            $table->foreign('ID_Programa')
                  ->references('ID_Programa')->on('programas')->onDelete('cascade');
            $table->foreign('ID_Asignatura')
                  ->references('ID_Asignatura')->on('asignaturas')->onDelete('cascade');
            $table->unique(['ID_Programa', 'ID_Asignatura'], 'uq_prog_asig');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('programa_electivas');
    }
};
