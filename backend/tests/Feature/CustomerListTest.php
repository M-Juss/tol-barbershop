<?php

use App\Models\Appointment;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function createCustomerListContext(): array
{
    return [
        'manager' => User::factory()->create(['role' => 'manager']),
        'barber' => User::factory()->create(['role' => 'barber']),
        'service' => Service::create([
            'name' => 'Customer List Cut',
            'description' => 'Customer list test service',
            'duration' => 30,
            'price' => 200,
            'is_active' => true,
        ]),
    ];
}

function createCustomerListAppointment(array $context, User $customer, array $attributes = []): Appointment
{
    return Appointment::forceCreate(array_merge([
        'user_id' => $customer->id,
        'service_id' => $context['service']->id,
        'barber_user_id' => $context['barber']->id,
        'appointment_date' => now()->toDateString(),
        'appointment_time' => '10:00',
        'duration_minutes' => 30,
        'price' => 200,
        'status' => 'completed',
    ], $attributes));
}

test('customer list paginates without overlap and uses deterministic sorting', function () {
    $context = createCustomerListContext();
    $customers = collect(range(1, 5))->map(fn (int $number) => User::factory()->create([
        'role' => 'customer',
        'fullname' => 'Same Customer',
        'email' => "same-customer-{$number}@example.test",
    ]));
    Sanctum::actingAs($context['manager']);

    $pageOne = $this->getJson('/api/v1/customers?sort=fullname&dir=asc&per_page=2&page=1')
        ->assertOk()
        ->assertJsonPath('data.meta.current_page', 1)
        ->assertJsonPath('data.meta.last_page', 3)
        ->assertJsonPath('data.meta.per_page', 2)
        ->assertJsonPath('data.meta.total', 5);

    $pageTwo = $this->getJson('/api/v1/customers?sort=fullname&dir=asc&per_page=2&page=2')
        ->assertOk();

    $pageOneIds = collect($pageOne->json('data.customers'))->pluck('id')->all();
    $pageTwoIds = collect($pageTwo->json('data.customers'))->pluck('id')->all();

    expect($pageOneIds)->toBe($customers->take(2)->pluck('id')->all());
    expect($pageTwoIds)->toBe($customers->slice(2, 2)->pluck('id')->all());
    expect(array_intersect($pageOneIds, $pageTwoIds))->toBe([]);
});

test('customer list filters searches literal wildcards and sorts computed fields', function () {
    $context = createCustomerListContext();
    $active = User::factory()->create([
        'role' => 'customer',
        'fullname' => 'Active Customer',
    ]);
    $inactive = User::factory()->create([
        'role' => 'customer',
        'fullname' => 'Legacy % Customer',
    ]);
    $frequent = User::factory()->create([
        'role' => 'customer',
        'fullname' => 'Frequent Customer',
    ]);
    createCustomerListAppointment($context, $inactive, [
        'appointment_date' => now()->subDays(90)->toDateString(),
    ]);
    createCustomerListAppointment($context, $frequent);
    createCustomerListAppointment($context, $frequent, ['appointment_time' => '11:00']);
    Sanctum::actingAs($context['manager']);

    $this->getJson('/api/v1/customers?status=inactive')
        ->assertOk()
        ->assertJsonPath('data.meta.total', 1)
        ->assertJsonPath('data.customers.0.id', $inactive->id);

    $this->getJson('/api/v1/customers?search=%25')
        ->assertOk()
        ->assertJsonPath('data.meta.total', 1)
        ->assertJsonPath('data.customers.0.id', $inactive->id);

    $response = $this->getJson('/api/v1/customers?sort=total_visits&dir=desc')
        ->assertOk();

    expect(collect($response->json('data.customers'))->pluck('id')->first())->toBe($frequent->id);
    expect($active->exists)->toBeTrue();
});

test('customer list rejects invalid list parameters', function () {
    $context = createCustomerListContext();
    Sanctum::actingAs($context['manager']);

    $query = http_build_query([
        'status' => 'pending',
        'sort' => 'email',
        'dir' => 'sideways',
        'page' => 0,
        'per_page' => 100,
    ]);

    $this->getJson('/api/v1/customers?'.$query)
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['status', 'sort', 'dir', 'page', 'per_page']);
});
