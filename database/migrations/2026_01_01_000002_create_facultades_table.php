<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Tabla: facultad
     */
    public function up(): void
    {
        Schema::create('facultades', function (Blueprint $table) {
            $table->id('ID_Facultad');
            $table->unsignedBigInteger('Codigo_Facultad')->unique();
            $table->unsignedBigInteger('Codigo_Sede');
            $table->string('Nombre_Facultad', 150);
            $table->string('Conmutador_Facultad', 30)->nullable();
            $table->string('Extension_Facultad', 80)->nullable();
            $table->string('Campus_Facultad', 100)->nullable();
            $table->string('Url_Facultad', 300)->nullable();
            $table->timestamps();

             $table->foreign('Codigo_Sede')
                 ->references('Codigo_Sede')
                 ->on('sedes')
                 ->onDelete('restrict')
                 ->onUpdate('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('facultades');
    }
};
