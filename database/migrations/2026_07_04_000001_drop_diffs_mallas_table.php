<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('diffs_mallas');
    }

    public function down(): void
    {
        // Re-create from original migration if needed
    }
};
