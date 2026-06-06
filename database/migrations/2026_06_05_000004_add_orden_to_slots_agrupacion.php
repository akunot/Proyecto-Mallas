<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('slots_agrupacion', function (Blueprint $table) {
            $table->integer('Orden')->default(0)->after('Semestre');
        });
    }

    public function down(): void
    {
        Schema::table('slots_agrupacion', function (Blueprint $table) {
            $table->dropColumn('Orden');
        });
    }
};
