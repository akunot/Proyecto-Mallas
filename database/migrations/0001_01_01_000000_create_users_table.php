<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Tabla: usuario
     */
    public function up(): void
    {
        Schema::create('usuarios', function (Blueprint $table) {
            $table->id('ID_Usuario');
            $table->string('Nombre_Usuario', 200);
            $table->string('Email_Usuario', 200)->unique();
            $table->string('Otp_Code', 255)->nullable();
            $table->timestamp('Otp_Expires_At')->nullable();
            $table->tinyInteger('Activo_Usuario')->default(1);
            $table->timestamp('Creacion_Usuario')->useCurrent();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('usuarios');
    }
};
