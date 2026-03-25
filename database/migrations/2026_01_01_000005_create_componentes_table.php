<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Tabla: componente
     */
    public function up(): void
    {
        Schema::create('componentes', function (Blueprint $table) {
            $table->id('ID_Componente');
            $table->string('Nombre_Componente', 150)->unique();
            $table->text('Descripcion_Componente')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('componentes');
    }
};
