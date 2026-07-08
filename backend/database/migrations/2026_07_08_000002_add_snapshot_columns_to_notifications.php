<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->unsignedBigInteger('appointment_id')->nullable()->after('payload');
            $table->string('service_name', 255)->nullable()->after('appointment_id');
            $table->string('barber_name', 255)->nullable()->after('service_name');
            $table->date('appointment_date')->nullable()->after('barber_name');
            $table->string('appointment_time', 10)->nullable()->after('appointment_date');
            $table->decimal('price', 10, 2)->nullable()->after('appointment_time');
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropColumn([
                'appointment_id',
                'service_name',
                'barber_name',
                'appointment_date',
                'appointment_time',
                'price',
            ]);
        });
    }
};
