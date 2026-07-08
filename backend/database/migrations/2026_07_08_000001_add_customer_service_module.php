<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('modules')->where('key', 'appointment')->update(['name' => 'Appointments']);

        DB::table('modules')->updateOrInsert(
            ['key' => 'customer-service'],
            [
                'name' => 'Customer Service',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }

    public function down(): void
    {
        DB::table('modules')->where('key', 'customer-service')->delete();

        DB::table('modules')->where('key', 'appointment')->update(['name' => 'Appointment']);
    }
};
