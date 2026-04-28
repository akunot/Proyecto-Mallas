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
        Schema::table('asignaturas', function (Blueprint $table) {
            // 1. Agregar campo Tipo_Asignatura
            $table->enum('Tipo_Asignatura', ['regular', 'electiva'])
                  ->default('regular')
                  ->after('Creditos_Asignatura');

            // 2. Agregar campo Codigo_Base (normalizado, único)
            $table->string('Codigo_Base', 50)
                  ->nullable()
                  ->after('Codigo_Asignatura');
        });

        // 3. Poblar Codigo_Base masivamente con valores normalizados de Codigo_Asignatura
        // Maneja tres casos: floats de Excel (4200713.0), códigos con guión (1123456-Z), y códigos puros
        DB::statement("
            UPDATE asignaturas
            SET Codigo_Base = CASE
                -- Caso 1: Números decimales (Excel los convierte a float)
                WHEN Codigo_Asignatura REGEXP '^[0-9]+\\.[0-9]+$'
                    THEN CAST(CAST(Codigo_Asignatura AS DECIMAL) AS CHAR)
                -- Caso 2: Códigos con guión (ej: 1123456-Z)
                WHEN Codigo_Asignatura REGEXP '^[0-9]+-[A-Za-z0-9]+$'
                    THEN SUBSTRING_INDEX(Codigo_Asignatura, '-', 1)
                -- Caso 3: Códigos numéricos puros guardados como string
                WHEN Codigo_Asignatura REGEXP '^[0-9]+$'
                    THEN Codigo_Asignatura
                -- Otros casos: dejar nulo (requerirán revisión manual)
                ELSE NULL
            END
        ");

        // 4. Para los que quedaron NULL (códigos no numéricos), copiar el original
        DB::statement("
            UPDATE asignaturas
            SET Codigo_Base = Codigo_Asignatura
            WHERE Codigo_Base IS NULL
              AND Codigo_Asignatura REGEXP '^[0-9]+$'
        ");

        // 5. Hacer NOT NULL los Codigo_Base que pudieron ser calculados correctamente
        //NOTA: Si quedan NULLs después de esto, hay códigos no numéricos que requieren limpieza manual
        DB::statement("
            UPDATE asignaturas
            SET Codigo_Base = CONCAT('MANUAL_', ID_Asignatura)
            WHERE Codigo_Base IS NULL
        ");

        // 6. Agregar constraint UNIQUE a Codigo_Base
        Schema::table('asignaturas', function (Blueprint $table) {
            $table->unique('Codigo_Base');
        });

        // 7. Agregar índices para optimizar búsquedas
        Schema::table('asignaturas', function (Blueprint $table) {
            $table->index('Codigo_Base');
            $table->index('Tipo_Asignatura');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('asignaturas', function (Blueprint $table) {
            $table->dropUnique(['Codigo_Base']);
            $table->dropIndex(['Codigo_Base']);
            $table->dropIndex(['Tipo_Asignatura']);
            $table->dropColumn(['Tipo_Asignatura', 'Codigo_Base']);
        });
    }
};
