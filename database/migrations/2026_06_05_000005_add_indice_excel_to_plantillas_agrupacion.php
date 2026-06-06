<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plantillas_agrupacion', function (Blueprint $table) {
            $table->integer('Indice_Agrupacion_Excel')->nullable()->after('ID_Componente');
        });

        // Populate Indice_Agrupacion_Excel = ID_Plantilla_Agrupacion for all existing rows
        DB::statement('UPDATE plantillas_agrupacion SET Indice_Agrupacion_Excel = ID_Plantilla_Agrupacion');
    }

    public function down(): void
    {
        Schema::table('plantillas_agrupacion', function (Blueprint $table) {
            $table->dropColumn('Indice_Agrupacion_Excel');
        });
    }
};
