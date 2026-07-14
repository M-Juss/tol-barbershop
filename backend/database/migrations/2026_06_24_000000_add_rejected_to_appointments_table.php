<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->enum('status', ['pending', 'approved', 'completed', 'cancelled', 'no_show', 'rejected'])
                ->default('pending')
                ->change();
            $table->timestamp('rejected_at')->nullable()->after('cancelled_at');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn('rejected_at');
            $table->enum('status', ['pending', 'approved', 'completed', 'cancelled', 'no_show'])
                ->default('pending')
                ->change();
        });
    }
};
