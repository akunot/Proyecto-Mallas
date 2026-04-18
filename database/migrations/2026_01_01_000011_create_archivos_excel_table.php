<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Tabla: archivo_excel
     */
    public function up(): void
    {
        Schema::create('archivos_excel', function (Blueprint $table) {
            $table->id('ID_Archivo');
            $table->unsignedBigInteger('ID_Usuario');
            $table->string('Tipo_Archivo', 20);
            $table->string('Nombre_Archivo', 300);
            $table->binary('Contenido_Archivo');
            $table->bigInteger('Tamanio_Bytes')->unsigned();
            $table->string('Hash_Sha256', 64);
            $table->string('Estado_Procesamiento', 30)->default('pendiente');
            $table->timestamp('Fecha_Subido')->useCurrent();
            $table->timestamps();

            $table->foreign('ID_Usuario')
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
        Schema::dropIfExists('archivos_excel');
    }
};
