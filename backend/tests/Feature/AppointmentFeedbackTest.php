<?php

use App\Models\Appointment;
use App\Models\AppointmentFeedback;
use App\Models\Notification;
use App\Models\Service;
use App\Models\User;
use App\Support\DisplayId;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function createFeedbackTestUser(string $role, string $email): User
{
    $user = User::create([
        'fullname' => ucfirst($role).' User',
        'contact_number' => '09170000000',
        'email' => $email,
        'role' => $role,
        'password' => 'password',
        'is_active' => true,
    ]);

    if ($role === 'customer') {
        $user->markEmailAsVerified();
    }

    return $user;
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

    $this->putJson("/api/v1/appointments/{$appointment->id}", [
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
    expect($notification->type)->toBe('appointment_completed');
    expect($notification->payload['appointment_id'])->toBe($appointment->id);
    expect($notification->payload['booking_id'])->toStartWith('APT-');
    expect($notification->message)->toContain($notification->payload['booking_id']);
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

    $this->postJson('/api/v1/appointment-feedback', [
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
        'is_featured' => false,
    ]);

    expect(AppointmentFeedback::where('appointment_id', $appointment->id)->count())->toBe(1);

    $this->getJson('/api/v1/public-feedback')
        ->assertOk()
        ->assertJsonCount(1, 'data.feedback');

    $this->getJson('/api/v1/featured-feedback')
        ->assertOk()
        ->assertJsonCount(0, 'data.feedback');
});

test('featured five star feedback is available to public landing endpoints', function () {
    $customer = createFeedbackTestUser('customer', 'historical-feedback-customer@example.test');
    $barber = createFeedbackTestUser('barber', 'historical-feedback-barber@example.test');
    $service = createFeedbackTestService();

    $appointment = Appointment::create([
        'user_id' => $customer->id,
        'service_id' => $service->id,
        'barber_user_id' => $barber->id,
        'appointment_date' => now()->subDay()->toDateString(),
        'appointment_time' => '12:00',
        'duration_minutes' => 45,
        'price' => 250,
        'status' => 'completed',
        'completed_at' => now()->subDay(),
    ]);

    AppointmentFeedback::create([
        'appointment_id' => $appointment->id,
        'user_id' => $customer->id,
        'rating' => 5,
        'comment' => 'Legacy public feedback',
        'is_featured' => true,
        'customer_name_snapshot' => $customer->fullname,
    ]);

    $this->getJson('/api/v1/public-feedback')
        ->assertOk()
        ->assertJsonCount(1, 'data.feedback');

    $this->getJson('/api/v1/featured-feedback')
        ->assertOk()
        ->assertJsonCount(1, 'data.feedback');
});

test('manager can feature submitted feedback for the landing page', function () {
    $customer = createFeedbackTestUser('customer', 'public-feedback-customer@example.test');
    $customer->update(['fullname' => 'Jamie Marie Rivera']);
    $barber = createFeedbackTestUser('barber', 'public-feedback-barber@example.test');
    $manager = createFeedbackTestUser('manager', 'public-feedback-manager@example.test');
    $service = createFeedbackTestService();

    $appointment = Appointment::create([
        'user_id' => $customer->id,
        'service_id' => $service->id,
        'barber_user_id' => $barber->id,
        'appointment_date' => now()->toDateString(),
        'appointment_time' => '13:00',
        'duration_minutes' => 45,
        'price' => 250,
        'status' => 'completed',
        'completed_at' => now(),
    ]);

    Sanctum::actingAs($customer);

    $this->postJson('/api/v1/appointment-feedback', [
        'appointment_id' => $appointment->id,
        'rating' => 5,
        'comment' => 'Excellent service from start to finish.',
    ])->assertOk();

    $feedback = AppointmentFeedback::where('appointment_id', $appointment->id)->firstOrFail();

    Sanctum::actingAs($manager);

    $this->putJson("/api/v1/feedback/{$feedback->id}/toggle-feature")
        ->assertOk()
        ->assertJsonPath('data.is_featured', true);

    $this->getJson('/api/v1/featured-feedback')
        ->assertOk()
        ->assertJsonCount(1, 'data.feedback')
        ->assertJsonPath('data.feedback.0.customer_name', 'Jamie Marie Rivera')
        ->assertJsonPath('data.feedback.0.service_name', 'Classic Haircut')
        ->assertJsonPath('data.feedback.0.is_featured', true);

    $this->getJson('/api/v1/public-feedback')
        ->assertOk()
        ->assertJsonCount(1, 'data.feedback')
        ->assertJsonPath('data.feedback.0.customer_name', 'Jamie Marie Rivera');
});

test('appointment status notifications include the appointment reference', function () {
    $customer = createFeedbackTestUser('customer', 'status-customer@example.test');
    $barber = createFeedbackTestUser('barber', 'status-barber@example.test');
    $manager = createFeedbackTestUser('manager', 'status-manager@example.test');
    $service = createFeedbackTestService();

    $appointment = Appointment::create([
        'user_id' => $customer->id,
        'service_id' => $service->id,
        'barber_user_id' => $barber->id,
        'appointment_date' => now()->addDay()->toDateString(),
        'appointment_time' => '10:00',
        'duration_minutes' => 45,
        'price' => 250,
        'status' => 'pending',
    ]);

    Sanctum::actingAs($manager);

    $this->putJson("/api/v1/appointments/{$appointment->id}", [
        'user_id' => $customer->id,
        'service_id' => $service->id,
        'barber_user_id' => $barber->id,
        'appointment_date' => $appointment->appointment_date->toDateString(),
        'appointment_time' => '10:00',
        'duration_minutes' => 45,
        'price' => 250,
        'status' => 'approved',
        'notes' => null,
    ])->assertOk();

    $notification = Notification::where('user_id', $customer->id)
        ->where('type', 'appointment_status')
        ->first();

    expect($notification)->not->toBeNull();
    expect($notification->message)->toBe(
        sprintf('Your appointment %s is now approved.', DisplayId::booking($appointment->id))
    );
});

function createFeedbackListRecord(
    User $customer,
    User $barber,
    Service $service,
    int $rating,
    bool $featured,
    string $comment,
    string $createdAt,
): AppointmentFeedback {
    $appointment = Appointment::create([
        'user_id' => $customer->id,
        'service_id' => $service->id,
        'barber_user_id' => $barber->id,
        'appointment_date' => now()->toDateString(),
        'appointment_time' => '10:00',
        'duration_minutes' => 45,
        'price' => 250,
        'status' => 'completed',
    ]);

    return AppointmentFeedback::forceCreate([
        'appointment_id' => $appointment->id,
        'user_id' => $customer->id,
        'rating' => $rating,
        'comment' => $comment,
        'is_featured' => $featured,
        'customer_name_snapshot' => $customer->fullname,
        'created_at' => $createdAt,
        'updated_at' => $createdAt,
    ]);
}

test('authenticated feedback list paginates and sorts deterministically', function () {
    $customer = createFeedbackTestUser('customer', 'feedback-list-customer@example.test');
    $barber = createFeedbackTestUser('barber', 'feedback-list-barber@example.test');
    $manager = createFeedbackTestUser('manager', 'feedback-list-manager@example.test');
    $service = createFeedbackTestService();
    $first = createFeedbackListRecord($customer, $barber, $service, 5, false, 'First', '2026-07-15 10:00:00');
    $second = createFeedbackListRecord($customer, $barber, $service, 3, false, 'Second', '2026-07-15 11:00:00');
    $third = createFeedbackListRecord($customer, $barber, $service, 3, false, 'Third', '2026-07-15 11:00:00');
    $fourth = createFeedbackListRecord($customer, $barber, $service, 4, false, 'Fourth', '2026-07-15 09:00:00');
    Sanctum::actingAs($manager);

    $pageOne = $this->getJson('/api/v1/feedback?per_page=2&page=1')
        ->assertOk()
        ->assertJsonPath('data.meta.current_page', 1)
        ->assertJsonPath('data.meta.last_page', 2)
        ->assertJsonPath('data.meta.per_page', 2)
        ->assertJsonPath('data.meta.total', 4);

    $pageTwo = $this->getJson('/api/v1/feedback?per_page=2&page=2')->assertOk();
    $pageOneIds = collect($pageOne->json('data.feedback'))->pluck('id')->all();
    $pageTwoIds = collect($pageTwo->json('data.feedback'))->pluck('id')->all();

    expect($pageOneIds)->toBe([$third->id, $second->id]);
    expect($pageTwoIds)->toBe([$first->id, $fourth->id]);
    expect(array_intersect($pageOneIds, $pageTwoIds))->toBe([]);

    $sorted = $this->getJson('/api/v1/feedback?sort=rating&dir=asc')->assertOk();
    expect(collect($sorted->json('data.feedback'))->pluck('id')->all())
        ->toBe([$second->id, $third->id, $fourth->id, $first->id]);
});

test('authenticated feedback list applies filters and literal wildcard search', function () {
    $customer = createFeedbackTestUser('customer', 'feedback-filter-customer@example.test');
    $barber = createFeedbackTestUser('barber', 'feedback-filter-barber@example.test');
    $manager = createFeedbackTestUser('manager', 'feedback-filter-manager@example.test');
    $service = createFeedbackTestService();
    $matching = createFeedbackListRecord($customer, $barber, $service, 5, true, 'Precision % result', '2026-07-15 10:00:00');
    createFeedbackListRecord($customer, $barber, $service, 5, false, 'Ordinary result', '2026-07-15 11:00:00');
    createFeedbackListRecord($customer, $barber, $service, 4, true, 'Another result', '2026-07-15 12:00:00');
    Sanctum::actingAs($manager);

    $this->getJson('/api/v1/feedback?rating=5&featured=featured&search=%25')
        ->assertOk()
        ->assertJsonPath('data.meta.total', 1)
        ->assertJsonPath('data.feedback.0.id', $matching->id);

    $this->getJson('/api/v1/feedback?featured=not_featured')
        ->assertOk()
        ->assertJsonPath('data.meta.total', 1);
});

test('authenticated feedback list rejects invalid list parameters', function () {
    $manager = createFeedbackTestUser('manager', 'feedback-validation-manager@example.test');
    Sanctum::actingAs($manager);

    $query = http_build_query([
        'rating' => 6,
        'featured' => 'yes',
        'sort' => 'comment',
        'dir' => 'sideways',
        'page' => 0,
        'per_page' => 51,
    ]);

    $this->getJson('/api/v1/feedback?'.$query)
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['rating', 'featured', 'sort', 'dir', 'page', 'per_page']);
});
