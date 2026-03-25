<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Tabla: programa
     */
    public function up(): void
    {
        Schema::create('programas', function (Blueprint $table) {
            $table->id('ID_Programa');
            $table->unsignedBigInteger('ID_Facultad');
            $table->string('Codigo_Programa', 20)->unique();
            $table->string('Nombre_Programa', 200);
            $table->string('Titulo_Otorgado', 200)->nullable();
            $table->string('Nivel_Formacion', 50)->nullable();
            $table->unsignedInteger('Creditos_Totales')->nullable();
            $table->unsignedInteger('Duracion_Semestres')->nullable();
            $table->string('Codigo_SNIES', 20)->nullable();
            $table->string('Url_Programa', 300)->nullable();
            $table->string('Campus_Programa', 100)->nullable();
            $table->string('Conmutador', 30)->nullable();
            $table->string('Extension', 10)->nullable();
            $table->string('Correo', 200)->nullable();
            $table->string('Area_Curricular', 100)->nullable();
            $table->tinyInteger('Activo_Programa')->default(1);
            $table->timestamps();

            $table->foreign('ID_Facultad')
                ->references('ID_Facultad')
                ->on('facultades')
                ->onDelete('restrict')
                ->onUpdate('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('programas');
    }
};
