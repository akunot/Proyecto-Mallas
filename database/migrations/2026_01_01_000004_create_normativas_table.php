<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Tabla: normativa
     */
    public function up(): void
    {
        Schema::create('normativas', function (Blueprint $table) {
            $table->id('ID_Normativa');
            $table->unsignedBigInteger('ID_Programa');
            $table->string('Tipo_Normativa', 50);
            $table->string('Numero_Normativa', 50);
            $table->integer('Anio_Normativa');
            $table->string('Instancia', 150);
            $table->text('Descripcion_Normativa')->nullable();
            $table->string('Url_Normativa', 500)->nullable();
            $table->tinyInteger('Esta_Activo')->default(1);
            $table->timestamps();

            $table->foreign('ID_Programa')
                ->references('ID_Programa')
                ->on('programas')
                ->onDelete('restrict')
                ->onUpdate('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('normativas');
    }
};
