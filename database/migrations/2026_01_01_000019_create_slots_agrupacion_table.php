<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('slots_agrupacion', function (Blueprint $table) {
            $table->id('ID_Slot');
            $table->unsignedBigInteger('ID_Agrupacion');
            $table->string('Nombre_Slot', 255);
            $table->string('Tipo_Slot', 50); // optativa, libre, nivelatorio
            $table->integer('Semestre')->nullable();
            $table->timestamps();

            // Foreign Keys
            $table->foreign('ID_Agrupacion')->references('ID_Agrupacion')->on('agrupaciones');

            // Indexes
            $table->index(['ID_Agrupacion', 'Tipo_Slot']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('slots_agrupacion');
    }
};
