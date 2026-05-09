<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('requisitos', function (Blueprint $table) {
            // Verificar si las columnas ya existen antes de agregarlas
            if (!Schema::hasColumn('requisitos', 'Valor_Creditos')) {
                $table->integer('Valor_Creditos')->nullable()->after('Tipo_Requisito');
            }
            
            if (!Schema::hasColumn('requisitos', 'Descripcion_Requisito')) {
                $table->text('Descripcion_Requisito')->nullable()->after('Valor_Creditos');
            }
            
            // Si Tipo_Requisito es ENUM, convertirlo a VARCHAR
            if (Schema::hasColumn('requisitos', 'Tipo_Requisito')) {
                // La columna ya existe y ya es VARCHAR (la migración original ya la creó así)
                // No necesitamos hacer nada
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('requisitos', function (Blueprint $table) {
            // Eliminar las columnas agregadas si existen
            if (Schema::hasColumn('requisitos', 'Valor_Creditos')) {
                $table->dropColumn('Valor_Creditos');
            }
            
            if (Schema::hasColumn('requisitos', 'Descripcion_Requisito')) {
                $table->dropColumn('Descripcion_Requisito');
            }
        });
    }
};
