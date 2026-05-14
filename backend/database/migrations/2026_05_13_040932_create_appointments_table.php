<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
        $table->id();

        // Relationships
        $table->foreignId('user_id')->constrained()->onDelete('cascade');

    $table->foreignId('service_id')->constrained()->onDelete('cascade');

    $table->foreignId('barber_user_id')
        ->constrained('users')
        ->onDelete('cascade');

        // Appointment Schedule
        $table->date('appointment_date');
        $table->time('appointment_time');
        $table->integer('duration_minutes')->nullable();

        // Pricing
        $table->decimal('price', 10, 2);

        // Status
        $table->enum('status', [
            'pending',
            'approved',
            'completed',
            'cancelled',
            'no_show',
        ])->default('pending');
        $table->boolean('is_walkin')->default(false);

        // Optional Notes
        $table->text('notes')->nullable();
        $table->text('cancellation_reason')->nullable();

        // Status Timestamps
        $table->timestamp('approved_at')->nullable();
        $table->timestamp('completed_at')->nullable();
        $table->timestamp('cancelled_at')->nullable();

        $table->timestamps();
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
