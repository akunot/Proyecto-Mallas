<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Tabla: agrupacion_asignatura
     */
    public function up(): void
    {
        Schema::create('agrupacion_asignatura', function (Blueprint $table) {
            $table->id('ID_Agrup_Asig');
            $table->unsignedBigInteger('ID_Agrupacion');
            $table->unsignedBigInteger('ID_Asignatura')->nullable();
            $table->string('Tipo_Asignatura', 30);
            $table->unsignedInteger('Semestre_Sugerido')->nullable();
            $table->timestamps();

            $table->foreign('ID_Agrupacion')
                ->references('ID_Agrupacion')
                ->on('agrupaciones')
                ->onDelete('restrict')
                ->onUpdate('cascade');

            $table->foreign('ID_Asignatura')
                ->references('ID_Asignatura')
                ->on('asignaturas')
                ->onDelete('restrict')
                ->onUpdate('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('agrupacion_asignatura');
    }
};
