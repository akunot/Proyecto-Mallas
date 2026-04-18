<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('facultades', function (Blueprint $table) {
            $table->tinyInteger('Esta_Activo')->default(1)->after('Url_Facultad');
        });
    }

    public function down(): void
    {
        Schema::table('facultades', function (Blueprint $table) {
            $table->dropColumn('Esta_Activo');
        });
    }
};