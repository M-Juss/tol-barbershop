<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('re_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('appointment_id')->constrained('appointments')->cascadeOnDelete();
            $table->foreignId('customer_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('service_id')->constrained('services')->cascadeOnDelete();
            $table->foreignId('barber_user_id')->constrained('users')->cascadeOnDelete();
            $table->date('appointment_date');
            $table->time('appointment_time');
            $table->integer('duration_minutes')->nullable();
            $table->decimal('price', 10, 2);
            $table->text('notes')->nullable();
            $table->text('reason')->nullable();
            $table->enum('decision', ['pending', 'accepted', 'declined'])->default('pending');
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('created_by_role')->default('manager');
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();

            $table->index(['customer_user_id', 'decision']);
            $table->index(['appointment_id', 'decision']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('re_schedules');
    }
};
