<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Control de visibilidad en el historial público: cada malla archivada
     * puede mostrarse u ocultarse en la ruta pública (historial de versiones
     * del programa) según decida el administrador. La malla activa siempre
     * es pública, independiente de este flag.
     *
     * Default true para mantener el comportamiento actual: toda malla
     * archivada existente sigue visible tras la migración.
     */
    public function up(): void
    {
        Schema::table('mallas_curriculares', function (Blueprint $table) {
            $table->boolean('Visible_Historial')
                ->default(true)
                ->after('Es_Vigente');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('mallas_curriculares', function (Blueprint $table) {
            $table->dropColumn('Visible_Historial');
        });
    }
};
