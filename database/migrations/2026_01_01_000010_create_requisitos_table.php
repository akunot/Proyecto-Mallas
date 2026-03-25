<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Tabla: requisito
     */
    public function up(): void
    {
        Schema::create('requisitos', function (Blueprint $table) {
            $table->id('ID_Requisito');
            $table->unsignedBigInteger('ID_Agrup_Asig');
            $table->unsignedBigInteger('ID_Agrup_Asig_Requerida')->nullable();
            $table->string('Tipo_Requisito', 30);
            $table->unsignedInteger('Creditos_Minimos')->nullable();
            $table->text('Descripcion_Requisito')->nullable();
            $table->timestamps();

            $table->foreign('ID_Agrup_Asig')
                ->references('ID_Agrup_Asig')
                ->on('agrupacion_asignatura')
                ->onDelete('restrict')
                ->onUpdate('cascade');

            $table->foreign('ID_Agrup_Asig_Requerida')
                ->references('ID_Agrup_Asig')
                ->on('agrupacion_asignatura')
                ->onDelete('restrict')
                ->onUpdate('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('requisitos');
    }
};
