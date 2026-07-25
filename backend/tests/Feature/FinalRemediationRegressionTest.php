<?php

use App\Models\Appointment;
use App\Models\Module;
use App\Models\Notification;
use App\Models\Role;
use App\Models\Service;
use App\Models\SupportTicket;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    Carbon::setTestNow('2026-07-16 12:00:00 UTC');
});

afterEach(function () {
    Carbon::setTestNow();
});

function finalRegressionUser(string $role, array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => $role,
        'is_active' => true,
    ], $attributes));
}

function finalRegressionService(array $attributes = []): Service
{
    return Service::create(array_merge([
        'name' => 'Regression Haircut',
        'description' => 'Regression test service',
        'duration' => 60,
        'price' => 300,
        'is_active' => true,
    ], $attributes));
}

function finalRegressionAppointmentPayload(User $customer, User $barber, Service $service): array
{
    return [
        'user_id' => $customer->id,
        'service_id' => $service->id,
        'barber_user_id' => $barber->id,
        'appointment_date' => '2026-07-17',
        'appointment_time' => '09:00',
        'price' => 300,
        'status' => 'approved',
    ];
}

test('admin appointment and walk-in creation require the exact matching module', function () {
    $appointmentModule = Module::create(['key' => 'appointment', 'name' => 'Appointments']);
    $walkinModule = Module::create(['key' => 'walkin', 'name' => 'Walk-ins']);
    $appointmentRole = Role::create(['name' => 'Appointment Only']);
    $walkinRole = Role::create(['name' => 'Walk-in Only']);
    $appointmentRole->modules()->attach($appointmentModule);
    $walkinRole->modules()->attach($walkinModule);
    $appointmentAdmin = finalRegressionUser('admin', ['role_id' => $appointmentRole->id]);
    $walkinAdmin = finalRegressionUser('admin', ['role_id' => $walkinRole->id]);
    $customer = finalRegressionUser('customer');
    $barber = finalRegressionUser('barber');
    $service = finalRegressionService();
    $scheduled = finalRegressionAppointmentPayload($customer, $barber, $service);
    $walkin = [
        'service_id' => $service->id,
        'barber_user_id' => $barber->id,
        'price' => 300,
        'is_walkin' => true,
        'walkin_customer_name' => 'Walkin Customer',
        'appointment_date' => '2026-07-16',
        'appointment_time' => '12:30',
    ];

    Sanctum::actingAs($appointmentAdmin);
    $this->postJson('/api/v1/appointments', $walkin)->assertForbidden();
    $this->postJson('/api/v1/appointments', $scheduled)->assertCreated();

    Sanctum::actingAs($walkinAdmin);
    $this->postJson('/api/v1/appointments', $scheduled)->assertForbidden();
    $this->postJson('/api/v1/appointments', $walkin)->assertCreated();
});

test('staff cannot create scheduled bookings for inactive customers or non-customer accounts', function () {
    $manager = finalRegressionUser('manager');
    $inactiveCustomer = finalRegressionUser('customer', ['is_active' => false]);
    $admin = finalRegressionUser('admin');
    $barber = finalRegressionUser('barber');
    $service = finalRegressionService();
    Sanctum::actingAs($manager);

    foreach ([$inactiveCustomer, $admin] as $owner) {
        $this->postJson(
            '/api/v1/appointments',
            finalRegressionAppointmentPayload($owner, $barber, $service),
        )->assertUnprocessable()->assertJsonValidationErrors('user_id');
    }

    $this->postJson('/api/v1/appointments/batch', [
        'barber_user_id' => $barber->id,
        'appointment_date' => '2026-07-17',
        'appointments' => [],
    ])->assertForbidden();
});

test('availability exposes occupied durations and only staff can exclude a rescheduled appointment', function () {
    $customer = finalRegressionUser('customer');
    $manager = finalRegressionUser('manager');
    $barber = finalRegressionUser('barber');
    $service = finalRegressionService(['duration' => 90]);
    $appointment = Appointment::create([
        'user_id' => $customer->id,
        'service_id' => $service->id,
        'barber_user_id' => $barber->id,
        'appointment_date' => '2026-07-17',
        'appointment_time' => '09:00',
        'duration_minutes' => 90,
        'price' => 300,
        'status' => 'pending',
        'active_slot_key' => "{$barber->id}|2026-07-17|09:00",
    ]);
    $url = "/api/v1/appointments/available-slots?barber_id={$barber->id}&date=2026-07-17";

    Sanctum::actingAs($customer);
    $this->getJson($url)
        ->assertOk()
        ->assertJsonPath('data.0.appointment_time', '09:00')
        ->assertJsonPath('data.0.duration_minutes', 90);
    $this->getJson($url."&ignore_appointment_id={$appointment->id}")->assertForbidden();

    Sanctum::actingAs($manager);
    $this->getJson($url."&ignore_appointment_id={$appointment->id}")
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

test('shop-local date boundaries are used instead of the UTC calendar date', function () {
    Carbon::setTestNow('2026-07-16 23:30:00 UTC');
    $customer = finalRegressionUser('customer');
    $barber = finalRegressionUser('barber');
    $service = finalRegressionService();
    Sanctum::actingAs($customer);

    $payload = finalRegressionAppointmentPayload($customer, $barber, $service);
    $payload['appointment_date'] = '2026-07-16';
    $payload['appointment_time'] = '19:00';

    $this->postJson('/api/v1/appointments', $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors('appointment_date');
});

test('closed dates reject active bookings accept true query values and remain unique', function () {
    $manager = finalRegressionUser('manager');
    $customer = finalRegressionUser('customer');
    $barber = finalRegressionUser('barber');
    $service = finalRegressionService();
    Appointment::create([
        'user_id' => $customer->id,
        'service_id' => $service->id,
        'barber_user_id' => $barber->id,
        'appointment_date' => '2026-07-17',
        'appointment_time' => '09:00',
        'duration_minutes' => 60,
        'price' => 300,
        'status' => 'approved',
        'active_slot_key' => "{$barber->id}|2026-07-17|09:00",
    ]);
    Sanctum::actingAs($manager);

    $this->postJson('/api/v1/closed-dates', [
        'date_closed' => '2026-07-17',
        'reason' => 'Maintenance',
    ])->assertCreated();

    $this->postJson('/api/v1/closed-dates', [
        'date_closed' => '2026-07-18',
        'reason' => 'Maintenance',
    ])->assertCreated();
    $this->postJson('/api/v1/closed-dates', [
        'date_closed' => '2026-07-18',
        'reason' => 'Duplicate',
    ])->assertUnprocessable()->assertJsonValidationErrors('date_closed');
    $this->getJson('/api/v1/closed-dates?all=true')->assertOk();
});

test('removing customer-service access requeues assigned tickets', function () {
    $supportModule = Module::firstOrCreate(['key' => 'customer-service'], ['name' => 'Customer Service']);
    $managementModule = Module::create(['key' => 'management', 'name' => 'Management']);
    $role = Role::create(['name' => 'Support Admin']);
    $role->modules()->attach([$supportModule->id, $managementModule->id]);
    $manager = finalRegressionUser('manager');
    $admin = finalRegressionUser('admin', ['role_id' => $role->id]);
    $customer = finalRegressionUser('customer');
    $ticket = SupportTicket::create([
        'customer_id' => $customer->id,
        'assigned_to_id' => $admin->id,
        'assigned_staff_name_snapshot' => $admin->fullname,
        'status' => 'active',
        'claimed_at' => now(),
        'last_message_at' => now(),
    ]);
    Sanctum::actingAs($manager);

    $this->putJson("/api/v1/roles/{$role->id}", [
        'name' => $role->name,
        'module_ids' => [$managementModule->id],
    ])->assertOk();

    $ticket->refresh();
    expect($ticket->status)->toBe('waiting')
        ->and($ticket->assigned_to_id)->toBeNull()
        ->and($ticket->claimed_at)->toBeNull();
    expect(Notification::where('user_id', $customer->id)->where('type', 'ticket_requeued')->count())->toBe(1);
});

test('support histories provide stable pagination for staff and customers', function () {
    $manager = finalRegressionUser('manager');
    $customer = finalRegressionUser('customer');
    foreach (range(1, 3) as $index) {
        SupportTicket::create([
            'customer_id' => $customer->id,
            'assigned_to_id' => $manager->id,
            'status' => 'resolved',
            'resolved_at' => now()->subMinutes($index),
        ]);
    }

    Sanctum::actingAs($manager);
    $staffFirst = $this->getJson('/api/v1/support/queue?view=history&per_page=1&history_page=1')
        ->assertOk()
        ->assertJsonPath('data.history_has_more', true);
    $staffSecond = $this->getJson('/api/v1/support/queue?view=history&per_page=1&history_page=2')
        ->assertOk();
    expect($staffFirst->json('data.resolved.0.id'))->not->toBe($staffSecond->json('data.resolved.0.id'));

    Sanctum::actingAs($customer);
    $this->getJson('/api/v1/support/tickets?page=2&per_page=1')
        ->assertOk()
        ->assertJsonPath('data.meta.current_page', 2)
        ->assertJsonPath('data.meta.last_page', 3)
        ->assertJsonCount(1, 'data.tickets');
});

test('management admins can reopen inactive services and barbers', function () {
    $managementModule = Module::create(['key' => 'management', 'name' => 'Management']);
    $appointmentModule = Module::create(['key' => 'appointment', 'name' => 'Appointments']);
    $managementRole = Role::create(['name' => 'Management Admin']);
    $appointmentRole = Role::create(['name' => 'Appointment Admin']);
    $managementRole->modules()->attach($managementModule);
    $appointmentRole->modules()->attach($appointmentModule);
    $managementAdmin = finalRegressionUser('admin', ['role_id' => $managementRole->id]);
    $appointmentAdmin = finalRegressionUser('admin', ['role_id' => $appointmentRole->id]);
    $service = finalRegressionService(['is_active' => false]);
    $barber = finalRegressionUser('barber', ['is_active' => false]);

    Sanctum::actingAs($managementAdmin);
    expect(collect($this->getJson('/api/v1/services')->assertOk()->json('data.services'))->pluck('id'))
        ->toContain($service->id);
    expect(collect($this->getJson('/api/v1/barber')->assertOk()->json('data'))->pluck('id'))
        ->toContain($barber->id);

    Sanctum::actingAs($appointmentAdmin);
    expect(collect($this->getJson('/api/v1/services')->assertOk()->json('data.services'))->pluck('id'))
        ->not->toContain($service->id);
    expect(collect($this->getJson('/api/v1/barber')->assertOk()->json('data'))->pluck('id'))
        ->not->toContain($barber->id);
});

test('archived appointments remain in business analytics', function () {
    $manager = finalRegressionUser('manager');
    $customer = finalRegressionUser('customer');
    $barber = finalRegressionUser('barber');
    $service = finalRegressionService();
    $appointment = Appointment::create([
        'user_id' => $customer->id,
        'service_id' => $service->id,
        'barber_user_id' => $barber->id,
        'appointment_date' => '2026-07-16',
        'appointment_time' => '10:00',
        'duration_minutes' => 60,
        'price' => 300,
        'status' => 'completed',
        'completed_at' => now(),
    ]);
    $appointment->delete();
    Sanctum::actingAs($manager);

    $this->getJson('/api/v1/analytics/kpi?period=daily')
        ->assertOk()
        ->assertJsonPath('completed_appointments', 1)
        ->assertJsonPath('total_revenue', 300);
});
