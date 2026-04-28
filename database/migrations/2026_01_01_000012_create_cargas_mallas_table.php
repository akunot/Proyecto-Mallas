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
            $table->unsignedBigInteger('ID_Archivo_Asignaturas')->nullable();
            $table->unsignedBigInteger('ID_Archivo_Electivas')->nullable();
            $table->unsignedBigInteger('ID_Archivo_Malla')->nullable();
            $table->unsignedBigInteger('ID_Malla')->nullable();
            $table->unsignedBigInteger('ID_Malla_Base')->nullable();
            $table->unsignedBigInteger('ID_Usuario');
            $table->unsignedBigInteger('ID_Programa');
            $table->unsignedBigInteger('ID_Normativa');
            $table->string('Estado_Carga', 30)->default('esperando_archivos');
            $table->text('Comentario_Carga')->nullable();
            $table->text('Comentario_Revisor')->nullable();
            $table->unsignedBigInteger('ID_Usuario_Revisor')->nullable();
            $table->timestamp('Fecha_Revision')->nullable();
            $table->timestamp('Creacion_Carga')->useCurrent();
            $table->timestamp('Finalizacion_Carga')->nullable();
            $table->timestamps();

            $table->foreign('ID_Archivo_Asignaturas')
                ->references('ID_Archivo')
                ->on('archivos_excel')
                ->onDelete('restrict')
                ->onUpdate('cascade');

            $table->foreign('ID_Archivo_Electivas')
                ->references('ID_Archivo')
                ->on('archivos_excel')
                ->onDelete('restrict')
                ->onUpdate('cascade');

            $table->foreign('ID_Archivo_Malla')
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

            $table->foreign('ID_Programa')
                ->references('ID_Programa')
                ->on('programas')
                ->onDelete('restrict')
                ->onUpdate('cascade');

            $table->foreign('ID_Normativa')
                ->references('ID_Normativa')
                ->on('normativas')
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
