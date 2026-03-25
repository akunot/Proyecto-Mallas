<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Tabla: agrupacion
     */
    public function up(): void
    {
        Schema::create('agrupaciones', function (Blueprint $table) {
            $table->id('ID_Agrupacion');
            $table->unsignedBigInteger('ID_Malla');
            $table->unsignedBigInteger('ID_Componente');
            $table->string('Nombre_Agrupacion', 150);
            $table->unsignedInteger('Creditos_Requeridos')->nullable();
            $table->unsignedInteger('Creditos_Maximos')->nullable();
            $table->tinyInteger('Es_Obligatoria')->default(0);
            $table->timestamps();

            $table->foreign('ID_Malla')
                ->references('ID_Malla')
                ->on('mallas_curriculares')
                ->onDelete('restrict')
                ->onUpdate('cascade');

            $table->foreign('ID_Componente')
                ->references('ID_Componente')
                ->on('componentes')
                ->onDelete('restrict')
                ->onUpdate('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('agrupaciones');
    }
};
