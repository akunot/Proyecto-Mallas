<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cargas_mallas', function (Blueprint $table) {
            $table->index('Estado_Carga');
            $table->index('tipo_carga');
            $table->index(['ID_Usuario', 'Estado_Carga']);
            $table->index(['ID_Programa', 'Estado_Carga']);
        });

        Schema::table('asignaturas', function (Blueprint $table) {
            $table->index('es_electiva_libre');
        });

        Schema::table('logs_actividad', function (Blueprint $table) {
            $table->index(['Entidad_Log', 'Entidad_ID_Log']);
            $table->index('Accion_Log');
            $table->index('Creacion_Log');
        });
    }

    public function down(): void
    {
        Schema::table('cargas_mallas', function (Blueprint $table) {
            $table->dropIndex(['Estado_Carga']);
            $table->dropIndex(['tipo_carga']);
            $table->dropIndex(['ID_Usuario', 'Estado_Carga']);
            $table->dropIndex(['ID_Programa', 'Estado_Carga']);
        });

        Schema::table('asignaturas', function (Blueprint $table) {
            $table->dropIndex(['es_electiva_libre']);
        });

        Schema::table('logs_actividad', function (Blueprint $table) {
            $table->dropIndex(['Entidad_Log', 'Entidad_ID_Log']);
            $table->dropIndex(['Accion_Log']);
            $table->dropIndex(['Creacion_Log']);
        });
    }
};
