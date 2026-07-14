<?php

use App\Models\Appointment;
use App\Models\Service;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    Carbon::setTestNow('2026-07-14 12:00:00');
});

afterEach(function () {
    Carbon::setTestNow();
});

function createAnalyticsReportContext(): array
{
    return [
        'manager' => User::factory()->create(['role' => 'manager']),
        'customer' => User::factory()->create(['role' => 'customer']),
        'barber' => User::factory()->create(['role' => 'barber']),
        'service' => Service::create([
            'name' => 'Classic Haircut',
            'description' => 'Classic haircut service',
            'duration' => 45,
            'price' => 250,
            'is_active' => true,
        ]),
    ];
}

function createAnalyticsReportAppointment(
    array $context,
    string $date,
    string $status,
    float $price = 250,
): Appointment {
    return Appointment::create([
        'user_id' => $context['customer']->id,
        'service_id' => $context['service']->id,
        'barber_user_id' => $context['barber']->id,
        'appointment_date' => $date,
        'appointment_time' => '10:00',
        'duration_minutes' => 45,
        'price' => $price,
        'status' => $status,
    ]);
}

test('appointments include analytics indexes', function () {
    $indexes = collect(Schema::getIndexes('appointments'))->pluck('name');

    expect($indexes)
        ->toContain('appointments_appointment_date_index')
        ->toContain('appointments_status_appointment_date_index');
});

test('analytics periods are validated', function () {
    $context = createAnalyticsReportContext();
    Sanctum::actingAs($context['manager']);

    $this->getJson('/api/v1/analytics/kpi?period=quarterly')
        ->assertUnprocessable()
        ->assertJsonValidationErrors('period');
});

test('analytics kpi returns the exact selected date range', function () {
    $context = createAnalyticsReportContext();
    createAnalyticsReportAppointment($context, '2026-07-14', 'completed', 300);
    createAnalyticsReportAppointment($context, '2026-07-13', 'cancelled');
    createAnalyticsReportAppointment($context, '2026-07-12', 'no_show');
    createAnalyticsReportAppointment($context, '2026-07-07', 'completed', 500);
    Sanctum::actingAs($context['manager']);

    $response = $this->getJson('/api/v1/analytics/kpi?period=daily')
        ->assertOk();

    $response
        ->assertJsonPath('date_range.from', '2026-07-08')
        ->assertJsonPath('date_range.to', '2026-07-14')
        ->assertJsonPath('completed_appointments', 1)
        ->assertJsonPath('cancelled_count', 1)
        ->assertJsonPath('completion_rate', 33.3);

    expect((float) $response->json('total_revenue'))->toBe(300.0);
});

test('rating distribution follows appointment dates', function () {
    $context = createAnalyticsReportContext();
    $inRange = createAnalyticsReportAppointment($context, '2026-07-10', 'completed');
    $outOfRange = createAnalyticsReportAppointment($context, '2026-07-01', 'completed');

    DB::table('appointment_feedback')->insert([
        [
            'appointment_id' => $inRange->id,
            'user_id' => $context['customer']->id,
            'rating' => 5,
            'created_at' => '2026-06-01 10:00:00',
            'updated_at' => '2026-06-01 10:00:00',
        ],
        [
            'appointment_id' => $outOfRange->id,
            'user_id' => $context['customer']->id,
            'rating' => 1,
            'created_at' => '2026-07-14 10:00:00',
            'updated_at' => '2026-07-14 10:00:00',
        ],
    ]);
    Sanctum::actingAs($context['manager']);

    $this->getJson('/api/v1/analytics/ratings?period=daily')
        ->assertOk()
        ->assertJsonPath('0.count', 0)
        ->assertJsonPath('4.count', 1);
});

test('day of week analytics maps monday through sunday correctly', function () {
    $context = createAnalyticsReportContext();
    createAnalyticsReportAppointment($context, '2026-07-13', 'completed');
    createAnalyticsReportAppointment($context, '2026-07-12', 'cancelled');
    Sanctum::actingAs($context['manager']);

    $this->getJson('/api/v1/analytics/day-of-week?period=daily')
        ->assertOk()
        ->assertJsonPath('0.day', 'Monday')
        ->assertJsonPath('0.completed', 1)
        ->assertJsonPath('0.total', 1)
        ->assertJsonPath('6.day', 'Sunday')
        ->assertJsonPath('6.cancelled', 1)
        ->assertJsonPath('6.total', 1);
});

test('analytics series include appointments on the final date', function () {
    $context = createAnalyticsReportContext();
    createAnalyticsReportAppointment($context, '2026-07-14', 'completed', 300);
    Sanctum::actingAs($context['manager']);

    $this->getJson('/api/v1/analytics/revenue?period=daily')
        ->assertOk()
        ->assertJsonPath('0.label', '2026-07-14')
        ->assertJsonPath('0.value', 300);

    $this->getJson('/api/v1/analytics/appointments?period=daily')
        ->assertOk()
        ->assertJsonPath('0.label', '2026-07-14')
        ->assertJsonPath('0.completed', 1);

    $this->getJson('/api/v1/analytics/peak-hours?period=daily')
        ->assertOk()
        ->assertJsonPath('0.hour', '10:00')
        ->assertJsonPath('0.count', 1);

    $this->getJson('/api/v1/analytics/revenue?period=yearly')
        ->assertOk()
        ->assertJsonPath('0.label', '2026')
        ->assertJsonPath('0.value', 300);

    $this->getJson('/api/v1/analytics/appointments?period=yearly')
        ->assertOk()
        ->assertJsonPath('0.label', '2026')
        ->assertJsonPath('0.completed', 1);
});
