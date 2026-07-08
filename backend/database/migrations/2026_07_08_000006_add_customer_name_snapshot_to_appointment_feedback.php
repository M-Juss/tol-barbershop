<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointment_feedback', function (Blueprint $table) {
            $table->string('customer_name_snapshot', 255)->nullable()->after('user_id');
        });
    }

    public function down(): void
    {
        Schema::table('appointment_feedback', function (Blueprint $table) {
            $table->dropColumn('customer_name_snapshot');
        });
    }
};
