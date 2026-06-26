<?php

use App\Models\Appointment;
use App\Models\AppointmentFeedback;
use App\Models\Notification;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function createFeedbackTestUser(string $role, string $email): User
{
    return User::create([
        'fullname' => ucfirst($role) . ' User',
        'contact_number' => '09170000000',
        'email' => $email,
        'role' => $role,
        'password' => 'password',
        'is_active' => true,
    ]);
}

function createFeedbackTestService(): Service
{
    return Service::create([
        'name' => 'Classic Haircut',
        'description' => 'Clean haircut service',
        'duration' => 45,
        'price' => 250,
        'is_active' => true,
    ]);
}

test('marking an appointment completed creates a feedback request notification', function () {
    $customer = createFeedbackTestUser('customer', 'feedback-customer@example.test');
    $barber = createFeedbackTestUser('barber', 'feedback-barber@example.test');
    $manager = createFeedbackTestUser('manager', 'feedback-manager@example.test');
    $service = createFeedbackTestService();

    $appointment = Appointment::create([
        'user_id' => $customer->id,
        'service_id' => $service->id,
        'barber_user_id' => $barber->id,
        'appointment_date' => now()->addDay()->toDateString(),
        'appointment_time' => '10:00',
        'duration_minutes' => 45,
        'price' => 250,
        'status' => 'approved',
    ]);

    Sanctum::actingAs($manager);

    $this->putJson("/api/appointments/{$appointment->id}", [
        'user_id' => $customer->id,
        'service_id' => $service->id,
        'barber_user_id' => $barber->id,
        'appointment_date' => $appointment->appointment_date->toDateString(),
        'appointment_time' => '10:00',
        'duration_minutes' => 45,
        'price' => 250,
        'status' => 'completed',
        'notes' => null,
    ])->assertOk();

    $appointment->refresh();

    expect($appointment->status)->toBe('completed');
    expect($appointment->completed_at)->not->toBeNull();

    $notification = Notification::where('user_id', $customer->id)->first();

    expect($notification)->not->toBeNull();
    expect($notification->type)->toBe('appointment_feedback_request');
    expect($notification->payload['appointment_id'])->toBe($appointment->id);
});

test('customer can submit feedback for their completed appointment', function () {
    $customer = createFeedbackTestUser('customer', 'submit-feedback-customer@example.test');
    $barber = createFeedbackTestUser('barber', 'submit-feedback-barber@example.test');
    $service = createFeedbackTestService();

    $appointment = Appointment::create([
        'user_id' => $customer->id,
        'service_id' => $service->id,
        'barber_user_id' => $barber->id,
        'appointment_date' => now()->toDateString(),
        'appointment_time' => '11:00',
        'duration_minutes' => 45,
        'price' => 250,
        'status' => 'completed',
        'completed_at' => now(),
    ]);

    Sanctum::actingAs($customer);

    $this->postJson('/api/appointment-feedback', [
        'appointment_id' => $appointment->id,
        'rating' => 5,
        'comment' => 'Excellent barber service and clean booking experience.',
    ])
        ->assertOk()
        ->assertJsonPath('data.rating', 5)
        ->assertJsonPath('data.comment', 'Excellent barber service and clean booking experience.');

    $this->assertDatabaseHas('appointment_feedback', [
        'appointment_id' => $appointment->id,
        'user_id' => $customer->id,
        'rating' => 5,
        'comment' => 'Excellent barber service and clean booking experience.',
    ]);

    expect(AppointmentFeedback::where('appointment_id', $appointment->id)->count())->toBe(1);
});
