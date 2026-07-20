<?php

use App\Models\Appointment;
use App\Models\Module;
use App\Models\Role;
use App\Models\Service;
use App\Models\User;
use App\Support\DisplayId;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function createAppointmentHistoryContext(): array
{
    $historyModule = Module::create(['key' => 'history', 'name' => 'History']);
    $historyRole = Role::create(['name' => 'History Admin']);
    $historyRole->modules()->attach($historyModule);

    return [
        'admin' => User::factory()->create([
            'role' => 'admin',
            'role_id' => $historyRole->id,
        ]),
        'manager' => User::factory()->create(['role' => 'manager']),
        'customer' => User::factory()->create([
            'role' => 'customer',
            'fullname' => 'History Customer',
        ]),
        'other_customer' => User::factory()->create([
            'role' => 'customer',
            'fullname' => 'Other Customer',
        ]),
        'barber' => User::factory()->create([
            'role' => 'barber',
            'fullname' => 'Searchable Barber',
        ]),
        'service' => Service::create([
            'name' => 'Precision Fade',
            'description' => 'Appointment history test service',
            'duration' => 45,
            'price' => 250,
            'is_active' => true,
        ]),
    ];
}

function createAppointmentHistoryRecord(array $context, array $attributes = []): Appointment
{
    return Appointment::forceCreate(array_merge([
        'user_id' => $context['customer']->id,
        'service_id' => $context['service']->id,
        'barber_user_id' => $context['barber']->id,
        'appointment_date' => '2026-07-15',
        'appointment_time' => '10:00',
        'duration_minutes' => 45,
        'price' => 250,
        'status' => 'completed',
        'is_walkin' => false,
        'created_at' => '2026-07-15 10:00:00',
        'updated_at' => '2026-07-15 10:00:00',
    ], $attributes));
}

test('appointment history requires authentication and permits only supported roles', function () {
    $context = createAppointmentHistoryContext();

    $this->getJson('/api/v1/appointments/history')->assertUnauthorized();

    Sanctum::actingAs($context['barber']);
    $this->getJson('/api/v1/appointments/history')->assertForbidden();

    foreach (['admin', 'manager', 'customer'] as $role) {
        Sanctum::actingAs($context[$role]);
        $this->getJson('/api/v1/appointments/history')->assertOk();
    }
});

test('customer appointment history is isolated even when a display reference collides', function () {
    $context = createAppointmentHistoryContext();
    $own = createAppointmentHistoryRecord($context, ['id' => 1]);
    $other = createAppointmentHistoryRecord($context, [
        'id' => 6001,
        'user_id' => $context['other_customer']->id,
    ]);

    expect(DisplayId::booking($own->id))->toBe(DisplayId::booking($other->id));

    Sanctum::actingAs($context['customer']);

    $this->getJson('/api/v1/appointments/history?search='.DisplayId::booking($own->id))
        ->assertOk()
        ->assertJsonPath('data.meta.total', 1)
        ->assertJsonPath('data.appointments.0.id', $own->id);

    Sanctum::actingAs($context['manager']);

    $response = $this->getJson('/api/v1/appointments/history?search='.DisplayId::booking($own->id))
        ->assertOk()
        ->assertJsonPath('data.meta.total', 2);

    expect(collect($response->json('data.appointments'))->pluck('id')->all())
        ->toBe([$other->id, $own->id]);
});

test('appointment history paginates without overlap and orders deterministically', function () {
    $context = createAppointmentHistoryContext();
    $first = createAppointmentHistoryRecord($context, ['created_at' => '2026-07-15 11:00:00']);
    $second = createAppointmentHistoryRecord($context, ['created_at' => '2026-07-15 12:00:00']);
    $third = createAppointmentHistoryRecord($context, ['created_at' => '2026-07-15 12:00:00']);
    $fourth = createAppointmentHistoryRecord($context, ['created_at' => '2026-07-15 09:00:00']);
    Sanctum::actingAs($context['manager']);

    $pageOne = $this->getJson('/api/v1/appointments/history?per_page=2&page=1')
        ->assertOk()
        ->assertJsonPath('data.meta.current_page', 1)
        ->assertJsonPath('data.meta.last_page', 2)
        ->assertJsonPath('data.meta.per_page', 2)
        ->assertJsonPath('data.meta.total', 4);

    $pageTwo = $this->getJson('/api/v1/appointments/history?per_page=2&page=2')
        ->assertOk()
        ->assertJsonPath('data.meta.current_page', 2);

    $pageOneIds = collect($pageOne->json('data.appointments'))->pluck('id')->all();
    $pageTwoIds = collect($pageTwo->json('data.appointments'))->pluck('id')->all();

    expect($pageOneIds)->toBe([$third->id, $second->id]);
    expect($pageTwoIds)->toBe([$first->id, $fourth->id]);
    expect(array_intersect($pageOneIds, $pageTwoIds))->toBe([]);
});

test('appointment history filters status and walk-in records', function () {
    $context = createAppointmentHistoryContext();
    createAppointmentHistoryRecord($context, ['status' => 'pending']);
    $walkin = createAppointmentHistoryRecord($context, [
        'user_id' => null,
        'status' => 'completed',
        'is_walkin' => true,
        'walkin_customer_name' => 'Walk-in Guest',
    ]);
    $completed = createAppointmentHistoryRecord($context);
    Sanctum::actingAs($context['manager']);

    $this->getJson('/api/v1/appointments/history?status=completed')
        ->assertOk()
        ->assertJsonPath('data.meta.total', 2);

    $this->getJson('/api/v1/appointments/history?status=completed&is_walkin=1')
        ->assertOk()
        ->assertJsonPath('data.meta.total', 1)
        ->assertJsonPath('data.appointments.0.id', $walkin->id);

    $this->getJson('/api/v1/appointments/history?is_walkin=0')
        ->assertOk()
        ->assertJsonPath('data.meta.total', 2)
        ->assertJsonMissing(['id' => $walkin->id])
        ->assertJsonFragment(['id' => $completed->id]);
});

test('appointment history searches raw ids, snapshots, and related names', function () {
    $context = createAppointmentHistoryContext();
    $appointment = createAppointmentHistoryRecord($context, [
        'customer_name_snapshot' => 'Snapshot Needle',
    ]);
    createAppointmentHistoryRecord($context, [
        'user_id' => $context['other_customer']->id,
        'service_name_snapshot' => 'Different Service',
        'barber_name_snapshot' => 'Different Barber',
    ]);
    Sanctum::actingAs($context['manager']);

    $this->getJson('/api/v1/appointments/history?search='.$appointment->id)
        ->assertOk()
        ->assertJsonPath('data.meta.total', 1)
        ->assertJsonPath('data.appointments.0.id', $appointment->id);

    $this->getJson('/api/v1/appointments/history?search=Snapshot%20Needle')
        ->assertOk()
        ->assertJsonPath('data.meta.total', 1)
        ->assertJsonPath('data.appointments.0.id', $appointment->id);

    $this->getJson('/api/v1/appointments/history?search=Precision%20Fade')
        ->assertOk()
        ->assertJsonPath('data.meta.total', 2);

    $this->getJson('/api/v1/appointments/history?search=Searchable%20Barber')
        ->assertOk()
        ->assertJsonPath('data.meta.total', 2);
});

test('appointment history rejects invalid list parameters', function () {
    $context = createAppointmentHistoryContext();
    Sanctum::actingAs($context['manager']);

    $query = http_build_query([
        'search' => str_repeat('a', 101),
        'status' => 'archived',
        'is_walkin' => 'maybe',
        'page' => 0,
        'per_page' => 51,
    ]);

    $this->getJson('/api/v1/appointments/history?'.$query)
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['search', 'status', 'is_walkin', 'page', 'per_page']);
});

test('list indexes are available', function () {
    $appointmentIndexes = collect(Schema::getIndexes('appointments'))->pluck('name');
    $userIndexes = collect(Schema::getIndexes('users'))->pluck('name');
    $feedbackIndexes = collect(Schema::getIndexes('appointment_feedback'))->pluck('name');

    expect($appointmentIndexes)
        ->toContain('appointments_created_id_list_index')
        ->toContain('appointments_user_created_id_list_index')
        ->toContain('appointments_status_created_id_list_index')
        ->toContain('appointments_walkin_created_id_list_index')
        ->toContain('appointments_user_status_date_list_index');
    expect($userIndexes)->toContain('users_role_fullname_id_list_index');
    expect($feedbackIndexes)
        ->toContain('appointment_feedback_created_id_list_index')
        ->toContain('appointment_feedback_rating_created_id_list_index')
        ->toContain('appointment_feedback_featured_created_id_list_index');
});
