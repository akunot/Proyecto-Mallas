<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Tabla: diff_malla
     */
    public function up(): void
    {
        Schema::create('diffs_mallas', function (Blueprint $table) {
            $table->id('ID_Diff');
            $table->unsignedBigInteger('ID_Carga');
            $table->string('Entidad_Afectada', 50);
            $table->string('Tipo_Cambio', 20);
            $table->unsignedBigInteger('ID_Registro')->nullable();
            $table->json('Valor_Anterior')->nullable();
            $table->json('Valor_Nuevo')->nullable();
            $table->timestamp('Creado_Diff')->useCurrent();
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
        Schema::dropIfExists('diffs_mallas');
    }
};
