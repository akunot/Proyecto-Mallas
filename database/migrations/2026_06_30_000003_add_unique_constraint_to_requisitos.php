<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Eliminar duplicados antes de agregar la constraint única
        DB::statement('
            DELETE r1 FROM requisitos r1
            INNER JOIN requisitos r2
            WHERE r1.ID_Requisito > r2.ID_Requisito
            AND r1.ID_Asignatura = r2.ID_Asignatura
            AND (r1.ID_Programa = r2.ID_Programa OR (r1.ID_Programa IS NULL AND r2.ID_Programa IS NULL))
            AND (r1.ID_Asignatura_Requerida = r2.ID_Asignatura_Requerida OR (r1.ID_Asignatura_Requerida IS NULL AND r2.ID_Asignatura_Requerida IS NULL))
        ');

        Schema::table('requisitos', function (Blueprint $table) {
            $table->unique(
                ['ID_Asignatura', 'ID_Programa', 'ID_Asignatura_Requerida'],
                'uq_requisitos_asig_prog_asigreq'
            );
        });
    }

    public function down(): void
    {
        Schema::table('requisitos', function (Blueprint $table) {
            $table->dropUnique('uq_requisitos_asig_prog_asigreq');
        });
    }
};
