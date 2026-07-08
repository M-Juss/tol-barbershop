<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('support_tickets', function (Blueprint $table) {
            $table->string('customer_name_snapshot', 255)->nullable()->after('customer_id');
            $table->string('assigned_staff_name_snapshot', 255)->nullable()->after('assigned_to_id');
        });
    }

    public function down(): void
    {
        Schema::table('support_tickets', function (Blueprint $table) {
            $table->dropColumn(['customer_name_snapshot', 'assigned_staff_name_snapshot']);
        });
    }
};
