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
        Schema::create('plantillas_agrupacion', function (Blueprint $table) {
            $table->id('ID_Plantilla_Agrupacion');
            $table->unsignedBigInteger('ID_Programa');
            $table->unsignedBigInteger('ID_Componente');
            $table->string('Nombre_Agrupacion', 255);
            $table->string('Tipo_Agrupacion', 100)->nullable();
            $table->integer('Creditos_Requeridos')->nullable();
            $table->integer('Creditos_Maximos')->nullable();
            $table->boolean('Es_Obligatoria')->default(false);
            $table->timestamps();

            // Foreign Keys
            $table->foreign('ID_Programa')->references('ID_Programa')->on('programas');
            $table->foreign('ID_Componente')->references('ID_Componente')->on('componentes');

            // Indexes
            $table->index(['ID_Programa', 'ID_Componente']);
            // El índice único impide tener dos agrupaciones con el mismo nombre para el mismo programa.
            // En Ingeniería Civil existen dos agrupaciones llamadas "FÍSICA" (ID 2 y 3).
            // Cambiamos el índice único por uno normal para permitir esta estructura.
            $table->index(['ID_Programa', 'Nombre_Agrupacion']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('plantillas_agrupacion');
    }
};
