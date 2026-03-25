<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Tabla: carga_malla
     */
    public function up(): void
    {
        Schema::create('cargas_mallas', function (Blueprint $table) {
            $table->id('ID_Carga');
            $table->unsignedBigInteger('ID_Archivo');
            $table->unsignedBigInteger('ID_Malla')->nullable();
            $table->unsignedBigInteger('ID_Malla_Base')->nullable();
            $table->unsignedBigInteger('ID_Usuario');
            $table->string('Estado_Carga', 30)->default('iniciado');
            $table->text('Comentario_Carga')->nullable();
            $table->text('Comentario_Revisor')->nullable();
            $table->unsignedBigInteger('ID_Usuario_Revisor')->nullable();
            $table->timestamp('Fecha_Revision')->nullable();
            $table->timestamp('Creacion_Carga')->useCurrent();
            $table->timestamp('Finalizacion_Carga')->nullable();
            $table->timestamps();

            $table->foreign('ID_Archivo')
                ->references('ID_Archivo')
                ->on('archivos_excel')
                ->onDelete('restrict')
                ->onUpdate('cascade');

            $table->foreign('ID_Malla')
                ->references('ID_Malla')
                ->on('mallas_curriculares')
                ->onDelete('restrict')
                ->onUpdate('cascade');

            $table->foreign('ID_Malla_Base')
                ->references('ID_Malla')
                ->on('mallas_curriculares')
                ->onDelete('restrict')
                ->onUpdate('cascade');

            $table->foreign('ID_Usuario')
                ->references('ID_Usuario')
                ->on('usuarios')
                ->onDelete('restrict')
                ->onUpdate('cascade');

            $table->foreign('ID_Usuario_Revisor')
                ->references('ID_Usuario')
                ->on('usuarios')
                ->onDelete('restrict')
                ->onUpdate('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cargas_mallas');
    }
};
