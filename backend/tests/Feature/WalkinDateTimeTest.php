<?php

use App\Models\Appointment;
use App\Models\ClosedDates;
use App\Models\Module;
use App\Models\Role;
use App\Models\Service;
use App\Models\User;
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

function walkinDateTimeUser(string $role, array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => $role,
        'is_active' => true,
    ], $attributes));
}

function walkinDateTimeService(array $attributes = []): Service
{
    return Service::create(array_merge([
        'name' => 'Walk-in DateTime Service',
        'description' => 'Walk-in date/time test service',
        'duration' => 60,
        'price' => 300,
        'is_active' => true,
    ], $attributes));
}

function walkinDateTimePayload(User $barber, Service $service, string $date = '2026-07-16', string $time = '12:00'): array
{
    return [
        'service_id' => $service->id,
        'barber_user_id' => $barber->id,
        'price' => (int) $service->price,
        'is_walkin' => true,
        'walkin_customer_name' => 'DateTime Customer',
        'appointment_date' => $date,
        'appointment_time' => $time,
    ];
}

function walkinDateTimeSetup(): array
{
    $module = Module::create(['key' => 'walkin', 'name' => 'Walk-ins']);
    $role = Role::create(['name' => 'Walk-in Admin']);
    $role->modules()->attach($module);
    $admin = walkinDateTimeUser('admin', ['role_id' => $role->id]);
    $barber = walkinDateTimeUser('barber');
    $service = walkinDateTimeService();

    return compact('admin', 'barber', 'service');
}

test('walk-in accepts historical date and valid time slot', function () {
    $setup = walkinDateTimeSetup();
    Sanctum::actingAs($setup['admin']);

    $this->postJson('/api/v1/appointments', walkinDateTimePayload(
        $setup['barber'],
        $setup['service'],
        '2026-07-10',
        '14:00',
    ))->assertCreated();

    $appointment = Appointment::latest()->first();
    expect($appointment->appointment_date->toDateString())->toBe('2026-07-10');
    expect(substr((string) $appointment->appointment_time, 0, 5))->toBe('14:00');
});

test('walk-in accepts today date', function () {
    $setup = walkinDateTimeSetup();
    Sanctum::actingAs($setup['admin']);

    $this->postJson('/api/v1/appointments', walkinDateTimePayload(
        $setup['barber'],
        $setup['service'],
        '2026-07-16',
        '09:00',
    ))->assertCreated();
});

test('walk-in rejects future date', function () {
    $setup = walkinDateTimeSetup();
    Sanctum::actingAs($setup['admin']);

    $this->postJson('/api/v1/appointments', walkinDateTimePayload(
        $setup['barber'],
        $setup['service'],
        '2026-07-17',
        '09:00',
    ))->assertUnprocessable()->assertJsonValidationErrors('appointment_date');
});

test('walk-in rejects Sunday', function () {
    $setup = walkinDateTimeSetup();
    Sanctum::actingAs($setup['admin']);

    // 2026-07-12 is a Sunday
    $this->postJson('/api/v1/appointments', walkinDateTimePayload(
        $setup['barber'],
        $setup['service'],
        '2026-07-12',
        '09:00',
    ))->assertUnprocessable()->assertJsonValidationErrors('appointment_date');
});

test('walk-in rejects closed date', function () {
    $setup = walkinDateTimeSetup();
    Sanctum::actingAs($setup['admin']);

    ClosedDates::create([
        'date_closed' => '2026-07-15',
        'reason' => 'Holiday',
    ]);

    $this->postJson('/api/v1/appointments', walkinDateTimePayload(
        $setup['barber'],
        $setup['service'],
        '2026-07-15',
        '09:00',
    ))->assertUnprocessable()->assertJsonValidationErrors('appointment_date');
});

test('walk-in rejects missing date', function () {
    $setup = walkinDateTimeSetup();
    Sanctum::actingAs($setup['admin']);

    $payload = walkinDateTimePayload($setup['barber'], $setup['service']);
    unset($payload['appointment_date']);

    $this->postJson('/api/v1/appointments', $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors('appointment_date');
});

test('walk-in rejects missing time', function () {
    $setup = walkinDateTimeSetup();
    Sanctum::actingAs($setup['admin']);

    $payload = walkinDateTimePayload($setup['barber'], $setup['service']);
    unset($payload['appointment_time']);

    $this->postJson('/api/v1/appointments', $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors('appointment_time');
});

test('walk-in rejects invalid time format', function () {
    $setup = walkinDateTimeSetup();
    Sanctum::actingAs($setup['admin']);

    $this->postJson('/api/v1/appointments', walkinDateTimePayload(
        $setup['barber'],
        $setup['service'],
        '2026-07-16',
        '25:00',
    ))->assertUnprocessable()->assertJsonValidationErrors('appointment_time');
});

test('walk-in rejects time slots outside valid schedule', function () {
    $setup = walkinDateTimeSetup();
    Sanctum::actingAs($setup['admin']);

    $invalidTimes = ['08:00', '08:30', '12:00', '12:15', '12:45', '14:30', '15:30', '20:00', '21:00'];
    foreach ($invalidTimes as $time) {
        $this->postJson('/api/v1/appointments', walkinDateTimePayload(
            $setup['barber'],
            $setup['service'],
            '2026-07-16',
            $time,
        ))->assertUnprocessable()->assertJsonValidationErrors('appointment_time');
    }
});

test('walk-in accepts all valid schedule slots', function () {
    $setup = walkinDateTimeSetup();
    Sanctum::actingAs($setup['admin']);

    $validTimes = ['09:00', '10:00', '11:00', '12:30', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
    foreach ($validTimes as $time) {
        $this->postJson('/api/v1/appointments', walkinDateTimePayload(
            $setup['barber'],
            $setup['service'],
            '2026-07-16',
            $time,
        ))->assertCreated();
    }
});

test('walk-in stores submitted date and time not server time', function () {
    $setup = walkinDateTimeSetup();
    Sanctum::actingAs($setup['admin']);

    $this->postJson('/api/v1/appointments', walkinDateTimePayload(
        $setup['barber'],
        $setup['service'],
        '2026-07-10',
        '09:00',
    ))->assertCreated();

    $appointment = Appointment::latest()->first();
    expect($appointment->appointment_date->toDateString())->toBe('2026-07-10');
    expect(substr((string) $appointment->appointment_time, 0, 5))->toBe('09:00');
    expect($appointment->status)->toBe('completed');
    expect($appointment->is_walkin)->toBeTrue();
    expect($appointment->user_id)->toBeNull();
});

test('walk-in with arbitrary time does not affect customer availability', function () {
    $setup = walkinDateTimeSetup();
    $customer = walkinDateTimeUser('customer');
    Sanctum::actingAs($setup['admin']);

    $this->postJson('/api/v1/appointments', walkinDateTimePayload(
        $setup['barber'],
        $setup['service'],
        '2026-07-16',
        '14:00',
    ))->assertCreated();

    Sanctum::actingAs($customer);
    $response = $this->getJson('/api/v1/appointments/available-slots?barber_id='.$setup['barber']->id.'&date=2026-07-16');
    $response->assertOk();

    $slots = $response->json('data');
    $occupiedAt14 = collect($slots)->firstWhere('appointment_time', '14:00');
    expect($occupiedAt14)->toBeNull();
});
