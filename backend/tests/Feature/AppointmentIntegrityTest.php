<?php

use App\Models\Appointment;
use App\Models\ClosedDates;
use App\Models\Service;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    Carbon::setTestNow('2026-07-16 12:00:00');
});

afterEach(function () {
    Carbon::setTestNow();
});

function createAppointmentIntegrityUser(string $role, array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => $role,
        'is_active' => true,
    ], $attributes));
}

function createAppointmentIntegrityService(array $attributes = []): Service
{
    return Service::create(array_merge([
        'name' => 'Integrity Haircut',
        'description' => 'Service used by appointment integrity tests',
        'duration' => 60,
        'price' => 300,
        'is_active' => true,
    ], $attributes));
}

function appointmentIntegrityPayload(
    User $customer,
    User $barber,
    Service $service,
    string $date = '2026-07-17',
    string $time = '09:00',
    string $status = 'pending',
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
    ];
}

test('scheduled bookings enforce active resources and all business date boundaries', function () {
    $customer = createAppointmentIntegrityUser('customer');
    $barber = createAppointmentIntegrityUser('barber');
    $service = createAppointmentIntegrityService();
    Sanctum::actingAs($customer);

    $service->update(['is_active' => false]);
    $this->postJson('/api/v1/appointments', appointmentIntegrityPayload($customer, $barber, $service))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('service_id');

    $service->update(['is_active' => true]);
    $barber->update(['is_active' => false]);
    $this->postJson('/api/v1/appointments', appointmentIntegrityPayload($customer, $barber, $service))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('barber_user_id');

    $barber->update(['is_active' => true]);
    ClosedDates::create([
        'date_closed' => '2026-07-17',
        'reason' => 'Private event',
        'is_removed' => false,
    ]);
    $this->postJson('/api/v1/appointments', appointmentIntegrityPayload($customer, $barber, $service))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('appointment_date');

    $invalidSchedules = [
        ['2026-07-15', '09:00', 'appointment_date'],
        ['2026-07-19', '09:00', 'appointment_date'],
        ['2026-07-24', '09:00', 'appointment_date'],
        ['2026-07-18', '09:30', 'appointment_time'],
        ['2026-07-18', '20:00', 'appointment_time'],
    ];

    foreach ($invalidSchedules as [$date, $time, $errorKey]) {
        $this->postJson(
            '/api/v1/appointments',
            appointmentIntegrityPayload($customer, $barber, $service, $date, $time),
        )
            ->assertUnprocessable()
            ->assertJsonValidationErrors($errorKey);
    }

    $this->getJson("/api/v1/appointments/available-slots?barber_id={$barber->id}&date=2026-07-23")
        ->assertOk();
    $this->getJson("/api/v1/appointments/available-slots?barber_id={$barber->id}&date=2026-07-24")
        ->assertUnprocessable()
        ->assertJsonValidationErrors('date');
    $this->postJson('/api/v1/appointments/batch', [
        'barber_user_id' => $barber->id,
        'appointment_date' => '2026-07-24',
        'appointments' => [
            ['customer_name' => null, 'service_id' => $service->id, 'appointment_time' => '09:00', 'price' => 300],
            ['customer_name' => 'Second Guest', 'service_id' => $service->id, 'appointment_time' => '10:00', 'price' => 300],
        ],
    ])->assertUnprocessable()->assertJsonValidationErrors('appointment_date');

    expect(Appointment::count())->toBe(0);
});

test('create and reschedule reject duration overlaps while adjacent slots remain available', function () {
    $firstCustomer = createAppointmentIntegrityUser('customer');
    $secondCustomer = createAppointmentIntegrityUser('customer');
    $manager = createAppointmentIntegrityUser('manager');
    $barber = createAppointmentIntegrityUser('barber');
    $otherBarber = createAppointmentIntegrityUser('barber');
    $longService = createAppointmentIntegrityService(['duration' => 90]);
    $shortService = createAppointmentIntegrityService([
        'name' => 'Short Haircut',
        'duration' => 30,
    ]);

    Sanctum::actingAs($firstCustomer);
    $this->postJson(
        '/api/v1/appointments',
        appointmentIntegrityPayload($firstCustomer, $barber, $longService, time: '09:00'),
    )->assertSuccessful();

    expect(Appointment::where('barber_user_id', $barber->id)->where('status', 'pending')->count())->toBe(1);
    expect(Appointment::whereDate('appointment_date', '2026-07-17')->count())->toBe(1);
    expect(Appointment::firstOrFail()->duration_minutes)->toBe(90);

    Sanctum::actingAs($secondCustomer);
    $this->postJson(
        '/api/v1/appointments',
        appointmentIntegrityPayload($secondCustomer, $barber, $shortService, time: '10:00'),
    )
        ->assertUnprocessable()
        ->assertJsonValidationErrors('appointment_time');

    $this->postJson(
        '/api/v1/appointments',
        appointmentIntegrityPayload($secondCustomer, $barber, $shortService, time: '11:00'),
    )->assertSuccessful();

    $rescheduled = Appointment::create([
        'user_id' => $secondCustomer->id,
        'service_id' => $shortService->id,
        'barber_user_id' => $otherBarber->id,
        'appointment_date' => '2026-07-17',
        'appointment_time' => '13:00',
        'duration_minutes' => 30,
        'price' => 300,
        'status' => 'approved',
        'active_slot_key' => "{$otherBarber->id}|2026-07-17|13:00",
    ]);

    Sanctum::actingAs($manager);
    $this->putJson(
        "/api/v1/appointments/{$rescheduled->id}",
        appointmentIntegrityPayload($secondCustomer, $barber, $shortService, time: '10:00', status: 'approved'),
    )
        ->assertUnprocessable()
        ->assertJsonValidationErrors('appointment_time');

    expect($rescheduled->fresh()->barber_user_id)->toBe($otherBarber->id);
    expect(substr($rescheduled->fresh()->appointment_time, 0, 5))->toBe('13:00');
});

test('pending appointment quota is checked atomically for an entire batch', function () {
    $customer = createAppointmentIntegrityUser('customer');
    $barber = createAppointmentIntegrityUser('barber');
    $existingBarber = createAppointmentIntegrityUser('barber');
    $service = createAppointmentIntegrityService(['duration' => 30]);

    foreach (range(1, 10) as $index) {
        Appointment::create([
            'user_id' => $customer->id,
            'service_id' => $service->id,
            'barber_user_id' => $existingBarber->id,
            'appointment_date' => '2026-07-18',
            'appointment_time' => '09:00',
            'duration_minutes' => 30,
            'price' => 300,
            'status' => 'pending',
            'notes' => "Existing {$index}",
        ]);
    }

    Sanctum::actingAs($customer);
    $this->postJson('/api/v1/appointments/batch', [
        'barber_user_id' => $barber->id,
        'appointment_date' => '2026-07-18',
        'appointments' => [
            ['customer_name' => null, 'service_id' => $service->id, 'appointment_time' => '09:00', 'price' => 300],
            ['customer_name' => 'Second Guest', 'service_id' => $service->id, 'appointment_time' => '10:00', 'price' => 300],
        ],
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('appointments');

    expect(Appointment::where('user_id', $customer->id)->count())->toBe(10);
    expect(Appointment::whereNotNull('batch_id')->count())->toBe(0);
});

test('batch identifiers are random and not derived from timestamps or user ids', function () {
    $customer = createAppointmentIntegrityUser('customer');
    $barber = createAppointmentIntegrityUser('barber');
    $service = createAppointmentIntegrityService(['duration' => 30]);
    Sanctum::actingAs($customer);

    $makeBatch = fn (string $date) => $this->postJson('/api/v1/appointments/batch', [
        'barber_user_id' => $barber->id,
        'appointment_date' => $date,
        'appointments' => [
            ['customer_name' => null, 'service_id' => $service->id, 'appointment_time' => '09:00', 'price' => 300],
            ['customer_name' => 'Second Guest', 'service_id' => $service->id, 'appointment_time' => '10:00', 'price' => 300],
        ],
    ])->assertOk();

    $firstId = $makeBatch('2026-07-17')->json('data.0.batch_id');
    $secondId = $makeBatch('2026-07-18')->json('data.0.batch_id');

    expect($firstId)->toMatch('/^BATCH-[A-Z0-9]{24}$/');
    expect($secondId)->toMatch('/^BATCH-[A-Z0-9]{24}$/');
    expect($secondId)->not->toBe($firstId);
});

test('status transitions are one way and future appointments cannot be completed or marked no show', function () {
    $customer = createAppointmentIntegrityUser('customer');
    $manager = createAppointmentIntegrityUser('manager');
    $barber = createAppointmentIntegrityUser('barber');
    $service = createAppointmentIntegrityService();
    $pending = Appointment::create([
        'user_id' => $customer->id,
        'service_id' => $service->id,
        'barber_user_id' => $barber->id,
        'appointment_date' => '2026-07-17',
        'appointment_time' => '09:00',
        'duration_minutes' => 60,
        'price' => 300,
        'status' => 'pending',
        'active_slot_key' => "{$barber->id}|2026-07-17|09:00",
    ]);
    Sanctum::actingAs($manager);

    $this->putJson(
        "/api/v1/appointments/{$pending->id}",
        appointmentIntegrityPayload($customer, $barber, $service, status: 'completed'),
    )
        ->assertUnprocessable()
        ->assertJsonValidationErrors('status');

    $pending->update(['status' => 'approved']);
    foreach (['completed', 'no_show'] as $terminalStatus) {
        $this->putJson(
            "/api/v1/appointments/{$pending->id}",
            appointmentIntegrityPayload($customer, $barber, $service, status: $terminalStatus),
        )
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');
    }

    expect($pending->fresh()->status)->toBe('approved');
});

test('a past approved appointment can complete and terminal appointments cannot be reopened', function () {
    $customer = createAppointmentIntegrityUser('customer');
    $manager = createAppointmentIntegrityUser('manager');
    $barber = createAppointmentIntegrityUser('barber');
    $service = createAppointmentIntegrityService();
    $appointment = Appointment::create([
        'user_id' => $customer->id,
        'service_id' => $service->id,
        'barber_user_id' => $barber->id,
        'appointment_date' => '2026-07-16',
        'appointment_time' => '10:00',
        'duration_minutes' => 60,
        'price' => 300,
        'status' => 'approved',
        'active_slot_key' => "{$barber->id}|2026-07-16|10:00",
    ]);
    Sanctum::actingAs($manager);

    $this->putJson(
        "/api/v1/appointments/{$appointment->id}",
        appointmentIntegrityPayload($customer, $barber, $service, '2026-07-16', '10:00', 'completed'),
    )->assertOk();

    expect($appointment->fresh()->status)->toBe('completed');
    expect($appointment->fresh()->completed_at)->not->toBeNull();
    expect($appointment->fresh()->active_slot_key)->toBeNull();

    $this->putJson(
        "/api/v1/appointments/{$appointment->id}",
        appointmentIntegrityPayload($customer, $barber, $service, status: 'approved'),
    )
        ->assertUnprocessable()
        ->assertJsonValidationErrors('status');
});

test('a past-due approved appointment cannot be rescheduled', function () {
    $customer = createAppointmentIntegrityUser('customer');
    $manager = createAppointmentIntegrityUser('manager');
    $barber = createAppointmentIntegrityUser('barber');
    $service = createAppointmentIntegrityService();
    $appointment = Appointment::create([
        'user_id' => $customer->id,
        'service_id' => $service->id,
        'barber_user_id' => $barber->id,
        'appointment_date' => '2026-07-15',
        'appointment_time' => '10:00',
        'duration_minutes' => 60,
        'price' => 300,
        'status' => 'approved',
        'active_slot_key' => "{$barber->id}|2026-07-15|10:00",
    ]);
    Sanctum::actingAs($manager);

    $this->putJson(
        "/api/v1/appointments/{$appointment->id}",
        appointmentIntegrityPayload($customer, $barber, $service, '2026-07-17', '10:00', 'approved'),
    )
        ->assertUnprocessable()
        ->assertJsonValidationErrors('appointment');

    expect($appointment->fresh()->appointment_date->toDateString())->toBe('2026-07-15')
        ->and(substr($appointment->fresh()->appointment_time, 0, 5))->toBe('10:00');
});

test('only terminal appointments can be soft archived with the acting staff recorded', function () {
    $customer = createAppointmentIntegrityUser('customer');
    $manager = createAppointmentIntegrityUser('manager');
    $barber = createAppointmentIntegrityUser('barber');
    $service = createAppointmentIntegrityService();
    $pending = Appointment::create([
        'user_id' => $customer->id,
        'service_id' => $service->id,
        'barber_user_id' => $barber->id,
        'appointment_date' => '2026-07-17',
        'appointment_time' => '09:00',
        'duration_minutes' => 60,
        'price' => 300,
        'status' => 'pending',
        'active_slot_key' => "{$barber->id}|2026-07-17|09:00",
    ]);
    $completed = Appointment::create([
        'user_id' => $customer->id,
        'service_id' => $service->id,
        'barber_user_id' => $barber->id,
        'appointment_date' => '2026-07-15',
        'appointment_time' => '10:00',
        'duration_minutes' => 60,
        'price' => 300,
        'status' => 'completed',
        'completed_at' => now(),
    ]);
    Sanctum::actingAs($manager);

    $this->deleteJson("/api/v1/appointments/{$pending->id}")->assertUnprocessable();
    expect($pending->fresh())->not->toBeNull();

    $this->deleteJson("/api/v1/appointments/{$completed->id}")
        ->assertOk()
        ->assertJsonPath('message', 'Appointment archived successfully.');

    expect(Appointment::find($completed->id))->toBeNull();
    $archived = Appointment::withTrashed()->findOrFail($completed->id);
    expect($archived->deleted_at)->not->toBeNull();
    expect($archived->archived_by_user_id)->toBe($manager->id);
});

test('database constraint rejects duplicate active start keys', function () {
    $customer = createAppointmentIntegrityUser('customer');
    $barber = createAppointmentIntegrityUser('barber');
    $service = createAppointmentIntegrityService();
    $attributes = [
        'user_id' => $customer->id,
        'service_id' => $service->id,
        'barber_user_id' => $barber->id,
        'appointment_date' => '2026-07-17',
        'appointment_time' => '09:00',
        'duration_minutes' => 60,
        'price' => 300,
        'status' => 'pending',
        'active_slot_key' => "{$barber->id}|2026-07-17|09:00",
    ];

    Appointment::create($attributes);

    expect(fn () => Appointment::create($attributes))
        ->toThrow(UniqueConstraintViolationException::class);
});

test('group status updates are atomic', function () {
    $customer = createAppointmentIntegrityUser('customer');
    $manager = createAppointmentIntegrityUser('manager');
    $barber = createAppointmentIntegrityUser('barber');
    $service = createAppointmentIntegrityService(['duration' => 30]);
    $batchId = 'BATCH-'.str_repeat('A', 24);

    foreach (['09:00', '10:00'] as $time) {
        Appointment::create([
            'user_id' => $customer->id,
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'appointment_date' => '2026-07-17',
            'appointment_time' => $time,
            'duration_minutes' => 30,
            'price' => 300,
            'status' => 'pending',
            'active_slot_key' => "{$barber->id}|2026-07-17|{$time}",
            'batch_id' => $batchId,
        ]);
    }

    Sanctum::actingAs($manager);
    $this->putJson("/api/v1/appointments/batch/{$batchId}/status", [
        'status' => 'approved',
    ])->assertOk();
    expect(Appointment::where('batch_id', $batchId)->where('status', 'approved')->count())->toBe(2);

    Appointment::where('batch_id', $batchId)->latest('id')->firstOrFail()->update(['status' => 'pending']);
    $this->putJson("/api/v1/appointments/batch/{$batchId}/status", [
        'status' => 'rejected',
        'cancellation_reason' => 'Unavailable',
    ])->assertConflict();

    expect(Appointment::where('batch_id', $batchId)->where('status', 'approved')->count())->toBe(1)
        ->and(Appointment::where('batch_id', $batchId)->where('status', 'pending')->count())->toBe(1);
});
