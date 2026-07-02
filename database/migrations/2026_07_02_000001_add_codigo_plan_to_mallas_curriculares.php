<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mallas_curriculares', function (Blueprint $table) {
            $table->string('Codigo_Plan', 50)->nullable()->after('Version_Etiqueta');
        });
    }

    public function down(): void
    {
        Schema::table('mallas_curriculares', function (Blueprint $table) {
            $table->dropColumn('Codigo_Plan');
        });
    }
};
