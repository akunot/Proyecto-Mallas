<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Limpiar la tabla para evitar conflictos de constraint
        DB::table("requisitos")->truncate();

        Schema::table("requisitos", function (Blueprint $table) {
            // Eliminar llaves foráneas y columnas antiguas
            $table->dropForeign(["ID_Agrup_Asig"]);
            $table->dropForeign(["ID_Agrup_Asig_Requerida"]);
            $table->dropColumn(["ID_Agrup_Asig", "ID_Agrup_Asig_Requerida"]);

            // Agregar nuevas columnas
            $table->unsignedBigInteger("ID_Asignatura")->after("ID_Requisito");
            $table->unsignedBigInteger("ID_Programa")->nullable()->after("ID_Asignatura");
            $table->unsignedBigInteger("ID_Asignatura_Requerida")->nullable()->after("ID_Programa");

            // Establecer nuevas llaves foráneas
            $table->foreign("ID_Asignatura")->references("ID_Asignatura")->on("asignaturas")->onDelete("cascade");
            $table->foreign("ID_Programa")->references("ID_Programa")->on("programas")->onDelete("cascade");
            $table->foreign("ID_Asignatura_Requerida")->references("ID_Asignatura")->on("asignaturas")->onDelete("cascade");
        });
    }

    public function down(): void
    {
        DB::table("requisitos")->truncate();
        Schema::table("requisitos", function (Blueprint $table) {
            $table->dropForeign(["ID_Asignatura"]);
            $table->dropForeign(["ID_Programa"]);
            $table->dropForeign(["ID_Asignatura_Requerida"]);

            $table->dropColumn(["ID_Asignatura", "ID_Programa", "ID_Asignatura_Requerida"]);

            $table->unsignedBigInteger("ID_Agrup_Asig");
            $table->unsignedBigInteger("ID_Agrup_Asig_Requerida")->nullable();

            $table->foreign("ID_Agrup_Asig")->references("ID_Agrup_Asig")->on("agrupacion_asignatura")->onDelete("cascade");
            $table->foreign("ID_Agrup_Asig_Requerida")->references("ID_Agrup_Asig")->on("agrupacion_asignatura")->onDelete("cascade");
        });
    }
};

