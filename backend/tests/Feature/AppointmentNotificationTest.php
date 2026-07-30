<?php

use App\Models\Appointment;
use App\Models\Notification;
use App\Models\Service;
use App\Models\User;
use App\Support\DisplayId;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    Carbon::setTestNow('2026-07-16 12:00:00');
});

afterEach(function () {
    Carbon::setTestNow();
});

function appointmentNotificationUser(string $role, string $email): User
{
    $user = User::factory()->create([
        'role' => $role,
        'email' => $email,
        'is_active' => true,
    ]);

    if ($role === 'customer') {
        $user->markEmailAsVerified();
    }

    return $user;
}

function appointmentNotificationService(): Service
{
    return Service::create([
        'name' => 'Signature Haircut',
        'description' => 'Appointment notification test service',
        'duration' => 60,
        'price' => 350,
        'is_active' => true,
    ]);
}

function appointmentNotificationPayload(
    User $customer,
    User $barber,
    Service $service,
    string $date,
    string $time,
    string $status,
    ?string $reason = null,
): array {
    return [
        'user_id' => $customer->id,
        'service_id' => $service->id,
        'barber_user_id' => $barber->id,
        'appointment_date' => $date,
        'appointment_time' => $time,
        'duration_minutes' => $service->duration,
        'price' => (int) $service->price,
        'status' => $status,
        'notes' => null,
        'cancellation_reason' => $reason,
    ];
}

test('customer receives a structured pending notification after submitting an appointment request', function () {
    $customer = appointmentNotificationUser('customer', 'pending-notification-customer@example.test');
    $barber = appointmentNotificationUser('barber', 'pending-notification-barber@example.test');
    $service = appointmentNotificationService();
    Sanctum::actingAs($customer);

    $this->postJson('/api/v1/appointments', appointmentNotificationPayload(
        $customer,
        $barber,
        $service,
        '2026-07-17',
        '09:00',
        'pending',
    ))->assertCreated();

    $appointment = Appointment::firstOrFail();
    $notification = Notification::where('user_id', $customer->id)->sole();

    expect($notification->type)->toBe('appointment_status')
        ->and($notification->title)->toBe('Request Received')
        ->and($notification->message)->toBe(sprintf(
            'We received your Signature Haircut appointment request %s for July 17, 2026 at 9:00 AM with %s. It is awaiting confirmation.',
            DisplayId::booking($appointment->id),
            $barber->fullname,
        ))
        ->and($notification->payload['status'])->toBe('pending')
        ->and($notification->payload['appointment_id'])->toBe($appointment->id)
        ->and($notification->payload['next_step'])->toBe('We will notify you after the barbershop reviews your request.');
});

test('appointment status notifications use structured status-specific copy and payloads', function (
    string $currentStatus,
    string $nextStatus,
    string $date,
    string $time,
    ?string $reason,
    string $expectedTitle,
) {
    $customer = appointmentNotificationUser('customer', "{$nextStatus}-notification-customer@example.test");
    $barber = appointmentNotificationUser('barber', "{$nextStatus}-notification-barber@example.test");
    $manager = appointmentNotificationUser('manager', "{$nextStatus}-notification-manager@example.test");
    $service = appointmentNotificationService();
    $appointment = Appointment::create([
        'user_id' => $customer->id,
        'service_id' => $service->id,
        'barber_user_id' => $barber->id,
        'appointment_date' => $date,
        'appointment_time' => $time,
        'duration_minutes' => $service->duration,
        'price' => $service->price,
        'status' => $currentStatus,
        'active_slot_key' => in_array($currentStatus, ['pending', 'approved'], true)
            ? "{$barber->id}|{$date}|{$time}"
            : null,
    ]);
    Sanctum::actingAs($manager);

    $this->putJson(
        "/api/v1/appointments/{$appointment->id}",
        appointmentNotificationPayload($customer, $barber, $service, $date, $time, $nextStatus, $reason),
    )->assertOk();

    $notification = Notification::where('user_id', $customer->id)
        ->where('payload->appointment_id', $appointment->id)
        ->sole();

    expect($notification->title)->toBe($expectedTitle)
        ->and($notification->message)->toContain(DisplayId::booking($appointment->id))
        ->and($notification->message)->not->toContain('is now')
        ->and($notification->payload['status'])->toBe($nextStatus)
        ->and($notification->payload['service_name'])->toBe($service->name)
        ->and($notification->payload['barber_name'])->toBe($barber->fullname)
        ->and($notification->payload['appointment_date'])->toBe($date)
        ->and($notification->payload['appointment_time'])->toBe($time)
        ->and($notification->payload['next_step'])->toBeString();

    if ($reason) {
        expect($notification->payload['cancellation_reason'])->toBe($reason)
            ->and($notification->message)->not->toContain($reason);
    }
})->with([
    'approved' => ['pending', 'approved', '2026-07-17', '09:00', null, 'Appointment Confirmed'],
    'rejected' => ['pending', 'rejected', '2026-07-17', '10:00', 'The selected barber is unavailable.', 'Request Not Approved'],
    'cancelled' => ['approved', 'cancelled', '2026-07-17', '11:00', 'The shop will close early.', 'Appointment Cancelled'],
    'completed' => ['approved', 'completed', '2026-07-15', '13:00', null, 'Appointment Completed'],
    'no-show' => ['approved', 'no_show', '2026-07-15', '14:00', null, 'Appointment Marked as No-Show'],
]);

test('group booking pending and rejected notifications include structured appointments and a private reason', function () {
    $customer = appointmentNotificationUser('customer', 'group-notification-customer@example.test');
    $barber = appointmentNotificationUser('barber', 'group-notification-barber@example.test');
    $manager = appointmentNotificationUser('manager', 'group-notification-manager@example.test');
    $service = appointmentNotificationService();
    Sanctum::actingAs($customer);

    $this->postJson('/api/v1/appointments/batch', [
        'barber_user_id' => $barber->id,
        'appointment_date' => '2026-07-17',
        'notes' => null,
        'appointments' => [
            [
                'customer_name' => null,
                'service_id' => $service->id,
                'appointment_time' => '09:00',
                'price' => 350,
            ],
            [
                'customer_name' => 'Guest Customer',
                'service_id' => $service->id,
                'appointment_time' => '10:00',
                'price' => 350,
            ],
        ],
    ])->assertSuccessful();

    $appointments = Appointment::orderBy('id')->get();
    $batchId = $appointments->firstOrFail()->batch_id;
    $pendingNotification = Notification::where('user_id', $customer->id)->sole();

    expect($pendingNotification->title)->toBe('Group Booking Request Received')
        ->and($pendingNotification->payload['status'])->toBe('pending')
        ->and($pendingNotification->payload['appointment_count'])->toBe(2)
        ->and($pendingNotification->payload['appointments'])->toHaveCount(2);

    Sanctum::actingAs($manager);
    $reason = 'The requested group schedule is unavailable.';
    $this->putJson("/api/v1/appointments/batch/{$batchId}/status", [
        'status' => 'rejected',
        'cancellation_reason' => $reason,
    ])->assertOk();

    $rejectedNotification = Notification::where('user_id', $customer->id)
        ->where('payload->status', 'rejected')
        ->sole();

    expect($rejectedNotification->title)->toBe('Group Booking Not Approved')
        ->and($rejectedNotification->message)->not->toContain('is now')
        ->and($rejectedNotification->message)->not->toContain($reason)
        ->and($rejectedNotification->payload['cancellation_reason'])->toBe($reason)
        ->and($rejectedNotification->payload['appointments'])->toHaveCount(2)
        ->and($rejectedNotification->payload['next_step'])->toBeString();
});
