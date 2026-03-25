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
            $table->unsignedBigInteger('ID_Sede');
            $table->string('Nombre_Facultad', 150);
            $table->string('Conmutador_Facultad', 30)->nullable();
            $table->string('Extension_Facultad', 10)->nullable();
            $table->string('Campus_Facultad', 100)->nullable();
            $table->string('Url_Facultad', 300)->nullable();
            $table->timestamps();

            $table->foreign('ID_Sede')
                ->references('ID_Sede')
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
