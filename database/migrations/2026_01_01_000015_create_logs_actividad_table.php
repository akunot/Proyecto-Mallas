<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Tabla: log_actividad
     */
    public function up(): void
    {
        Schema::create('logs_actividad', function (Blueprint $table) {
            $table->id('ID_Log');
            $table->unsignedBigInteger('ID_Usuario')->nullable();
            $table->string('Accion_Log', 100);
            $table->string('Entidad_Log', 50)->nullable();
            $table->unsignedBigInteger('Entidad_ID_Log')->nullable();
            $table->json('Detalle_Log')->nullable();
            $table->string('IP_Origen_Log', 45)->nullable();
            $table->timestamp('Creacion_Log')->useCurrent();
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
        Schema::dropIfExists('logs_actividad');
    }
};
