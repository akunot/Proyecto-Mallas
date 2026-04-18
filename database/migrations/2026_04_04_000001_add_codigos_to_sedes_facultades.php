<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sedes', function (Blueprint $table) {
            $table->string('Codigo_Sede')->nullable()->unique()->after('ID_Sede');
        });

        Schema::table('facultades', function (Blueprint $table) {
            $table->string('Codigo_Facultad')->nullable()->unique()->after('ID_Facultad');
        });
    }

    public function down(): void
    {
        Schema::table('sedes', function (Blueprint $table) {
            $table->dropColumn('Codigo_Sede');
        });

        Schema::table('facultades', function (Blueprint $table) {
            $table->dropColumn('Codigo_Facultad');
        });
    }
};