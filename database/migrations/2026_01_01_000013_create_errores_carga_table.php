<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Tabla: error_carga
     */
    public function up(): void
    {
        Schema::create('errores_carga', function (Blueprint $table) {
            $table->id('ID_Error');
            $table->unsignedBigInteger('ID_Carga');
            $table->unsignedInteger('Fila_Error')->nullable();
            $table->string('Columna_Error', 50)->nullable();
            $table->text('Mensaje_Error');
            $table->string('Valor_Recibido', 500)->nullable();
            $table->string('Severidad_Error', 20)->default('error');
            $table->timestamps();

            $table->foreign('ID_Carga')
                ->references('ID_Carga')
                ->on('cargas_mallas')
                ->onDelete('cascade')
                ->onUpdate('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('errores_carga');
    }
};
