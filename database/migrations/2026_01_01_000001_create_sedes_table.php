<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Tabla: sede
     */
    public function up(): void
    {
        Schema::create('sedes', function (Blueprint $table) {
            $table->id('ID_Sede');
            $table->string('Nombre_Sede', 100);
            $table->string('Ciudad_Sede', 100);
            $table->string('Direccion_Sede', 200)->nullable();
            $table->string('Conmutador_Sede', 30)->nullable();
            $table->string('Campus_Sede', 100)->nullable();
            $table->string('Url_Sede', 300)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sedes');
    }
};
