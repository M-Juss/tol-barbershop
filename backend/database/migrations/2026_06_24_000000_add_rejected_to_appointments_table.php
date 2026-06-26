<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE appointments MODIFY COLUMN status ENUM('pending', 'approved', 'completed', 'cancelled', 'no_show', 'rejected') NOT NULL DEFAULT 'pending'");

        Schema::table('appointments', function (Blueprint $table) {
            $table->timestamp('rejected_at')->nullable()->after('cancelled_at');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn('rejected_at');
        });

        DB::statement("ALTER TABLE appointments MODIFY COLUMN status ENUM('pending', 'approved', 'completed', 'cancelled', 'no_show') NOT NULL DEFAULT 'pending'");
    }
};
