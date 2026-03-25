<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Tabla: malla_curricular
     * Nota: RN-01 solo una malla vigente por programa
     */
    public function up(): void
    {
        Schema::create('mallas_curriculares', function (Blueprint $table) {
            $table->id('ID_Malla');
            $table->unsignedBigInteger('ID_Normativa');
            $table->unsignedBigInteger('ID_Programa');
            $table->unsignedInteger('Version_Numero');
            $table->string('Version_Etiqueta', 50)->nullable();
            $table->date('Fecha_Vigencia');
            $table->date('Fecha_Fin_Vigencia')->nullable();
            $table->string('Estado', 20)->default('borrador');
            $table->tinyInteger('Es_Vigente')->default(0);
            $table->timestamps();

            $table->foreign('ID_Normativa')
                ->references('ID_Normativa')
                ->on('normativas')
                ->onDelete('restrict')
                ->onUpdate('cascade');

            $table->foreign('ID_Programa')
                ->references('ID_Programa')
                ->on('programas')
                ->onDelete('restrict')
                ->onUpdate('cascade');

            // Índice único para vigencia por programa ( workaround para partial unique index)
            $table->unique(['ID_Programa', 'Es_Vigente'], 'unique_vigente_programa');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mallas_curriculares');
    }
};
