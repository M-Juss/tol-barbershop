<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->string('customer_name_snapshot', 255)->nullable()->after('walkin_customer_contact_number');
            $table->string('service_name_snapshot', 255)->nullable()->after('customer_name_snapshot');
            $table->string('barber_name_snapshot', 255)->nullable()->after('service_name_snapshot');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn(['customer_name_snapshot', 'service_name_snapshot', 'barber_name_snapshot']);
        });
    }
};
