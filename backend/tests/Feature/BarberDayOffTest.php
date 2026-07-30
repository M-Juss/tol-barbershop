<?php

use App\Models\Appointment;
use App\Models\ClosedDateActivity;
use App\Models\ClosedDates;
use App\Models\Notification;
use App\Models\Service;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    Carbon::setTestNow('2026-07-27 10:00:00');
});

afterEach(function () {
    Carbon::setTestNow();
});

function barberDayOffUser(string $role): User
{
    return User::factory()->create([
        'role' => $role,
        'is_active' => true,
    ]);
}

function barberDayOffService(): Service
{
    return Service::create([
        'name' => 'Day Off Haircut',
        'description' => 'Service for barber day off tests',
        'duration' => 60,
        'price' => 300,
        'is_active' => true,
    ]);
}

function barberDayOffAppointment(
    User $customer,
    User $barber,
    Service $service,
    string $date,
    string $time,
    string $status,
): Appointment {
    return Appointment::create([
        'user_id' => $customer->id,
        'service_id' => $service->id,
        'barber_user_id' => $barber->id,
        'appointment_date' => $date,
        'appointment_time' => $time,
        'duration_minutes' => $service->duration,
        'price' => $service->price,
        'status' => $status,
        'active_slot_key' => "{$barber->id}|{$date}|{$time}",
        'approved_at' => $status === 'approved' ? now() : null,
    ]);
}

test('barber day off blocks pending and approved appointments then creates a private audit event and general notice', function () {
    $manager = barberDayOffUser('manager');
    $barber = barberDayOffUser('barber');
    $customer = barberDayOffUser('customer');
    $service = barberDayOffService();
    $pending = barberDayOffAppointment($customer, $barber, $service, '2026-07-28', '09:00', 'pending');
    $approved = barberDayOffAppointment($customer, $barber, $service, '2026-07-28', '11:00', 'approved');
    Sanctum::actingAs($manager);

    $payload = [
        'date_closed' => '2026-07-28',
        'closure_scope' => 'barber',
        'barber_user_id' => $barber->id,
        'reason' => 'Private medical appointment',
    ];

    $this->postJson('/api/v1/closed-dates', $payload)
        ->assertUnprocessable()
        ->assertJsonPath(
            'message',
            "Cannot close {$barber->fullname}'s schedule. Resolve 2 active appointments first.",
        );

    expect(ClosedDates::count())->toBe(0)
        ->and(ClosedDateActivity::count())->toBe(0)
        ->and(Notification::where('type', 'closed_date')->count())->toBe(0);

    $pending->update([
        'status' => 'rejected',
        'active_slot_key' => null,
        'rejected_at' => now(),
    ]);
    $approved->update([
        'status' => 'cancelled',
        'active_slot_key' => null,
        'cancelled_at' => now(),
    ]);

    $this->postJson('/api/v1/closed-dates', $payload)->assertCreated();

    $closure = ClosedDates::firstOrFail();
    $notification = Notification::where('user_id', $customer->id)
        ->where('type', 'closed_date')
        ->firstOrFail();
    $activity = ClosedDateActivity::firstOrFail();

    expect($closure->closure_scope)->toBe('barber')
        ->and((int) $closure->barber_user_id)->toBe($barber->id)
        ->and($activity->action)->toBe('closed')
        ->and($activity->reason)->toBe('Private medical appointment')
        ->and($notification->message)->toContain("Barber {$barber->fullname} will not be working on July 28, 2026")
        ->and($notification->message)->not->toContain('Private medical appointment')
        ->and($notification->payload)->not->toHaveKey('reason');

    Sanctum::actingAs($customer);
    $this->getJson("/api/v1/closed-dates?scope=availability&barber_id={$barber->id}")
        ->assertOk()
        ->assertJsonMissing(['reason' => 'Private medical appointment']);
});

test('shop closure blocks active appointments for every barber', function () {
    $manager = barberDayOffUser('manager');
    $firstBarber = barberDayOffUser('barber');
    $secondBarber = barberDayOffUser('barber');
    $customer = barberDayOffUser('customer');
    $service = barberDayOffService();
    $pending = barberDayOffAppointment($customer, $firstBarber, $service, '2026-07-28', '09:00', 'pending');
    $approved = barberDayOffAppointment($customer, $secondBarber, $service, '2026-07-28', '11:00', 'approved');
    Sanctum::actingAs($manager);

    $payload = [
        'date_closed' => '2026-07-28',
        'closure_scope' => 'shop',
        'reason' => 'Private maintenance details',
    ];

    $this->postJson('/api/v1/closed-dates', $payload)
        ->assertUnprocessable()
        ->assertJsonPath(
            'message',
            'Cannot close this date. Resolve 2 active appointments first.',
        );

    $pending->update(['status' => 'rejected', 'active_slot_key' => null]);
    $approved->update(['status' => 'cancelled', 'active_slot_key' => null]);

    $this->postJson('/api/v1/closed-dates', $payload)->assertCreated();

    expect(ClosedDates::firstOrFail()->closure_scope)->toBe('shop')
        ->and(Notification::where('user_id', $customer->id)->firstOrFail()->message)
        ->toBe('The shop will be closed on July 28, 2026. Please choose another available date.')
        ->not->toContain('Private maintenance details');
});

test('reopening creates a separate activity without another customer notice', function () {
    $manager = barberDayOffUser('manager');
    $barber = barberDayOffUser('barber');
    $customer = barberDayOffUser('customer');
    Sanctum::actingAs($manager);

    $response = $this->postJson('/api/v1/closed-dates', [
        'date_closed' => '2026-07-28',
        'closure_scope' => 'barber',
        'barber_user_id' => $barber->id,
        'reason' => 'Personal day',
    ])->assertCreated();
    $closedDateId = $response->json('data.id');
    $noticeCount = Notification::where('user_id', $customer->id)->count();

    $this->putJson("/api/v1/closed-dates/{$closedDateId}", [
        'is_removed' => true,
    ])->assertOk();

    expect(ClosedDates::findOrFail($closedDateId)->is_removed)->toBeTruthy()
        ->and(ClosedDateActivity::where('closed_date_id', $closedDateId)->pluck('action')->all())
        ->toBe(['closed', 'reopened'])
        ->and(Notification::where('user_id', $customer->id)->count())->toBe($noticeCount);

    $this->getJson('/api/v1/closed-dates/activity')
        ->assertOk()
        ->assertJsonPath('data.data.0.action', 'reopened')
        ->assertJsonPath('data.data.1.action', 'closed');
});

test('barber day off blocks every booking path and reduces dashboard capacity', function () {
    $manager = barberDayOffUser('manager');
    $customer = barberDayOffUser('customer');
    $closedBarber = barberDayOffUser('barber');
    $availableBarber = barberDayOffUser('barber');
    $service = barberDayOffService();
    ClosedDates::create([
        'date_closed' => '2026-07-28',
        'closure_scope' => 'barber',
        'barber_user_id' => $closedBarber->id,
        'barber_name_snapshot' => $closedBarber->fullname,
        'scope_key' => 'barber:'.$closedBarber->id,
        'reason' => 'Personal day',
    ]);

    Sanctum::actingAs($customer);
    $appointmentPayload = [
        'user_id' => $customer->id,
        'service_id' => $service->id,
        'barber_user_id' => $closedBarber->id,
        'appointment_date' => '2026-07-28',
        'appointment_time' => '09:00',
        'price' => 300,
        'status' => 'pending',
    ];

    $this->postJson('/api/v1/appointments', $appointmentPayload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors('appointment_date');
    $this->postJson('/api/v1/appointments/batch', [
        'barber_user_id' => $closedBarber->id,
        'appointment_date' => '2026-07-28',
        'appointments' => [
            ['service_id' => $service->id, 'appointment_time' => '09:00', 'price' => 300],
            ['service_id' => $service->id, 'appointment_time' => '11:00', 'price' => 300],
        ],
    ])->assertUnprocessable()->assertJsonValidationErrors('appointment_date');
    $this->getJson(
        "/api/v1/appointments/available-slots?barber_id={$closedBarber->id}&date=2026-07-28",
    )->assertUnprocessable()->assertJsonValidationErrors('date');

    Sanctum::actingAs($manager);
    ClosedDates::create([
        'date_closed' => '2026-07-27',
        'closure_scope' => 'barber',
        'barber_user_id' => $closedBarber->id,
        'barber_name_snapshot' => $closedBarber->fullname,
        'scope_key' => 'barber:'.$closedBarber->id,
        'reason' => 'Not working today',
    ]);
    $this->postJson('/api/v1/appointments', [
        'service_id' => $service->id,
        'barber_user_id' => $closedBarber->id,
        'appointment_date' => '2026-07-27',
        'appointment_time' => '10:00',
        'price' => 300,
        'status' => 'completed',
        'is_walkin' => true,
        'walkin_customer_name' => 'Walkin Guest',
    ])->assertUnprocessable()->assertJsonValidationErrors('appointment_date');

    $this->getJson('/api/v1/appointments/overview/weekly-schedule?date=2026-07-28')
        ->assertOk()
        ->assertJsonPath('days.1.total_slots', 11)
        ->assertJsonPath('time_slots.0.total_barbers', 1);

    $rescheduled = barberDayOffAppointment(
        $customer,
        $availableBarber,
        $service,
        '2026-07-29',
        '09:00',
        'approved',
    );
    $appointmentPayload['status'] = 'approved';
    $this->putJson("/api/v1/appointments/{$rescheduled->id}", $appointmentPayload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors('appointment_date');
});

test('closed dates allow today and future dates but reject past dates', function () {
    $manager = barberDayOffUser('manager');
    Sanctum::actingAs($manager);

    $this->postJson('/api/v1/closed-dates', [
        'date_closed' => '2026-07-26',
        'closure_scope' => 'shop',
        'reason' => 'Past date',
    ])->assertUnprocessable()->assertJsonValidationErrors('date_closed');

    $this->postJson('/api/v1/closed-dates', [
        'date_closed' => '2026-07-27',
        'closure_scope' => 'shop',
        'reason' => 'Today',
    ])->assertCreated();
});
