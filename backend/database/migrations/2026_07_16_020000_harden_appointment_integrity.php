<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $hasDuplicateActiveSlots = DB::table('appointments')
            ->select(['barber_user_id', 'appointment_date', 'appointment_time'])
            ->whereIn('status', ['pending', 'approved'])
            ->groupBy('barber_user_id', 'appointment_date', 'appointment_time')
            ->havingRaw('COUNT(*) > 1')
            ->exists();

        if ($hasDuplicateActiveSlots) {
            throw new RuntimeException(
                'Duplicate pending or approved appointment start times must be resolved before this migration can run.',
            );
        }

        Schema::table('appointments', function (Blueprint $table) {
            $table->string('active_slot_key', 64)->nullable()->after('status');
            $table->softDeletes();
            $table->unsignedBigInteger('archived_by_user_id')->nullable();
            $table->index('archived_by_user_id', 'appointments_archived_by_index');
            $table->index(
                ['barber_user_id', 'appointment_date', 'status', 'appointment_time'],
                'appointments_schedule_conflict_index',
            );
        });

        Schema::table('appointments', function (Blueprint $table) {
            $table->dropForeign(['service_id']);
            $table->foreign('service_id')->references('id')->on('services')->restrictOnDelete();
        });

        DB::table('appointments')
            ->whereIn('status', ['pending', 'approved'])
            ->orderBy('id')
            ->chunkById(500, function ($appointments): void {
                foreach ($appointments as $appointment) {
                    $key = $appointment->barber_user_id.'|'.substr($appointment->appointment_date, 0, 10).'|'.substr($appointment->appointment_time, 0, 5);

                    DB::table('appointments')
                        ->where('id', $appointment->id)
                        ->update(['active_slot_key' => $key]);
                }
            });

        Schema::table('appointments', function (Blueprint $table) {
            $table->unique('active_slot_key', 'appointments_active_slot_unique');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropForeign(['service_id']);
            $table->foreign('service_id')->references('id')->on('services')->cascadeOnDelete();
        });

        Schema::table('appointments', function (Blueprint $table) {
            $table->index('barber_user_id', 'appointments_barber_user_id_index');
            $table->dropUnique('appointments_active_slot_unique');
            $table->dropIndex('appointments_schedule_conflict_index');
            $table->dropIndex('appointments_archived_by_index');
            $table->dropColumn(['active_slot_key', 'deleted_at', 'archived_by_user_id']);
        });
    }
};
