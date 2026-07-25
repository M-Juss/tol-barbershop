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

test('analytics reports endpoint returns section-specific data', function () {
    $context = createAnalyticsReportContext();
    createAnalyticsReportAppointment($context, '2026-07-14', 'completed', 300);
    createAnalyticsReportAppointment($context, '2026-07-13', 'cancelled');
    Sanctum::actingAs($context['manager']);

    $response = $this->getJson('/api/v1/analytics/reports?section=overview&period=daily')
        ->assertOk();

    $response->assertJsonStructure([
        'meta' => ['section', 'period', 'comparison', 'date_range', 'granularity', 'earliest_date', 'timezone'],
        'data' => ['total_revenue', 'completed_appointments', 'completion_rate', 'total_customers', 'average_rating', 'insights'],
    ]);

    expect($response->json('meta.section'))->toBe('overview');
    expect($response->json('data.total_revenue'))->toBe(300);
    expect($response->json('data.completed_appointments'))->toBe(1);
});

test('analytics reports validates section parameter', function () {
    $context = createAnalyticsReportContext();
    Sanctum::actingAs($context['manager']);

    $this->getJson('/api/v1/analytics/reports?section=invalid')
        ->assertUnprocessable()
        ->assertJsonValidationErrors('section');
});

test('analytics reports validates custom date range', function () {
    $context = createAnalyticsReportContext();
    Sanctum::actingAs($context['manager']);

    $this->getJson('/api/v1/analytics/reports?section=overview&period=custom')
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['start_date', 'end_date']);
});

test('analytics reports validates comparison parameter', function () {
    $context = createAnalyticsReportContext();
    Sanctum::actingAs($context['manager']);

    $this->getJson('/api/v1/analytics/reports?section=overview&comparison=invalid')
        ->assertUnprocessable()
        ->assertJsonValidationErrors('comparison');
});

test('analytics reports returns custom date range data', function () {
    $context = createAnalyticsReportContext();
    createAnalyticsReportAppointment($context, '2026-07-10', 'completed', 400);
    createAnalyticsReportAppointment($context, '2026-07-20', 'completed', 200);
    Sanctum::actingAs($context['manager']);

    $response = $this->getJson('/api/v1/analytics/reports?section=revenue&period=custom&start_date=2026-07-01&end_date=2026-07-14')
        ->assertOk();

    expect($response->json('meta.date_range.from'))->toBe('2026-07-01');
    expect($response->json('meta.date_range.to'))->toBe('2026-07-14');
    expect($response->json('meta.section'))->toBe('revenue');
    expect($response->json('data.total_revenue'))->toBe(400);
});

test('last month returns four zero-filled weekly revenue buckets', function () {
    $context = createAnalyticsReportContext();
    createAnalyticsReportAppointment($context, '2026-06-17', 'completed', 100);
    createAnalyticsReportAppointment($context, '2026-06-23', 'completed', 200);
    createAnalyticsReportAppointment($context, '2026-06-24', 'completed', 300);
    createAnalyticsReportAppointment($context, '2026-07-14', 'completed', 400);
    Sanctum::actingAs($context['manager']);

    $response = $this->getJson('/api/v1/analytics/reports?section=revenue&period=30_days')
        ->assertOk()
        ->assertJsonPath('meta.date_range.from', '2026-06-17')
        ->assertJsonPath('meta.date_range.to', '2026-07-14')
        ->assertJsonPath('meta.granularity', 'weekly');

    expect($response->json('data.by_date'))->toHaveCount(4)
        ->and($response->json('data.by_date.0.date'))->toBe('2026-06-17')
        ->and($response->json('data.by_date.0.value'))->toBe(300)
        ->and($response->json('data.by_date.1.date'))->toBe('2026-06-24')
        ->and($response->json('data.by_date.1.value'))->toBe(300)
        ->and($response->json('data.by_date.2.value'))->toBe(0)
        ->and($response->json('data.by_date.3.value'))->toBe(400);
});

test('last three months returns twelve weekly appointment buckets', function () {
    $context = createAnalyticsReportContext();
    createAnalyticsReportAppointment($context, '2026-04-22', 'completed');
    createAnalyticsReportAppointment($context, '2026-04-29', 'cancelled');
    createAnalyticsReportAppointment($context, '2026-07-14', 'no_show');
    Sanctum::actingAs($context['manager']);

    $response = $this->getJson('/api/v1/analytics/reports?section=appointments&period=3_months')
        ->assertOk()
        ->assertJsonPath('meta.date_range.from', '2026-04-22')
        ->assertJsonPath('meta.granularity', 'weekly');

    expect($response->json('data.by_date'))->toHaveCount(12)
        ->and($response->json('data.by_date.0.date'))->toBe('2026-04-22')
        ->and($response->json('data.by_date.0.completed'))->toBe(1)
        ->and($response->json('data.by_date.1.date'))->toBe('2026-04-29')
        ->and($response->json('data.by_date.1.cancelled'))->toBe(1)
        ->and($response->json('data.by_date.11.date'))->toBe('2026-07-08')
        ->and($response->json('data.by_date.11.no_show'))->toBe(1);
});

test('long presets return calendar month buckets', function () {
    $context = createAnalyticsReportContext();
    Sanctum::actingAs($context['manager']);

    $sixMonths = $this->getJson('/api/v1/analytics/reports?section=revenue&period=6_months')
        ->assertOk()
        ->assertJsonPath('meta.date_range.from', '2026-02-01')
        ->assertJsonPath('meta.granularity', 'monthly');

    expect($sixMonths->json('data.by_date'))->toHaveCount(6)
        ->and($sixMonths->json('data.by_date.0.date'))->toBe('2026-02-01')
        ->and($sixMonths->json('data.by_date.5.date'))->toBe('2026-07-01');

    $twelveMonths = $this->getJson('/api/v1/analytics/reports?section=appointments&period=12_months')
        ->assertOk()
        ->assertJsonPath('meta.date_range.from', '2025-08-01')
        ->assertJsonPath('meta.granularity', 'monthly');

    expect($twelveMonths->json('data.by_date'))->toHaveCount(12)
        ->and($twelveMonths->json('data.by_date.0.date'))->toBe('2025-08-01')
        ->and($twelveMonths->json('data.by_date.11.date'))->toBe('2026-07-01');
});

test('custom ranges adapt their bucket granularity by inclusive days', function () {
    $context = createAnalyticsReportContext();
    Sanctum::actingAs($context['manager']);

    $this->getJson('/api/v1/analytics/reports?section=revenue&period=custom&start_date=2026-07-08&end_date=2026-07-14')
        ->assertOk()
        ->assertJsonPath('meta.granularity', 'daily')
        ->assertJsonCount(7, 'data.by_date');

    $this->getJson('/api/v1/analytics/reports?section=revenue&period=custom&start_date=2026-07-07&end_date=2026-07-14')
        ->assertOk()
        ->assertJsonPath('meta.granularity', 'weekly')
        ->assertJsonCount(2, 'data.by_date');

    $this->getJson('/api/v1/analytics/reports?section=revenue&period=custom&start_date=2026-04-14&end_date=2026-07-14')
        ->assertOk()
        ->assertJsonPath('meta.granularity', 'weekly');

    $this->getJson('/api/v1/analytics/reports?section=revenue&period=custom&start_date=2026-04-13&end_date=2026-07-14')
        ->assertOk()
        ->assertJsonPath('meta.granularity', 'monthly');
});

test('report ranges use the Manila calendar date around UTC midnight', function () {
    Carbon::setTestNow('2026-07-14 16:30:00 UTC');
    $context = createAnalyticsReportContext();
    Sanctum::actingAs($context['manager']);

    $this->getJson('/api/v1/analytics/reports?section=revenue&period=7_days')
        ->assertOk()
        ->assertJsonPath('meta.date_range.from', '2026-07-09')
        ->assertJsonPath('meta.date_range.to', '2026-07-15');

    $this->getJson('/api/v1/analytics/reports?section=revenue&period=custom&start_date=2026-07-15&end_date=2026-07-15')
        ->assertOk()
        ->assertJsonPath('meta.date_range.to', '2026-07-15');
});

test('analytics reports returns previous period comparison', function () {
    $context = createAnalyticsReportContext();
    createAnalyticsReportAppointment($context, '2026-07-14', 'completed', 300);
    Sanctum::actingAs($context['manager']);

    $response = $this->getJson('/api/v1/analytics/reports?section=overview&period=daily&comparison=previous')
        ->assertOk();

    expect($response->json('meta.comparison'))->toBe('previous');
    expect($response->json('data.comparison'))->not->toBeNull();
    expect($response->json('data.comparison.total_revenue'))->toBe(0);
});

test('analytics reports returns appointments section', function () {
    $context = createAnalyticsReportContext();
    createAnalyticsReportAppointment($context, '2026-07-14', 'completed');
    createAnalyticsReportAppointment($context, '2026-07-14', 'cancelled');
    Sanctum::actingAs($context['manager']);

    $response = $this->getJson('/api/v1/analytics/reports?section=appointments&period=daily')
        ->assertOk();

    $response->assertJsonStructure([
        'data' => ['total', 'completed', 'cancelled', 'completion_rate', 'by_date', 'by_day_of_week', 'peak_hours'],
    ]);

    expect($response->json('data.total'))->toBe(2);
    expect($response->json('data.completed'))->toBe(1);
});

test('analytics reports returns services section', function () {
    $context = createAnalyticsReportContext();
    createAnalyticsReportAppointment($context, '2026-07-14', 'completed', 250);
    Sanctum::actingAs($context['manager']);

    $response = $this->getJson('/api/v1/analytics/reports?section=services&period=daily')
        ->assertOk();

    $response->assertJsonStructure([
        'data' => ['services', 'most_booked', 'least_booked', 'average_revenue_per_service'],
    ]);

    expect($response->json('data.services.0.completed_count'))->toBe(1);
});

test('analytics reports returns barbers section', function () {
    $context = createAnalyticsReportContext();
    createAnalyticsReportAppointment($context, '2026-07-14', 'completed', 300);
    Sanctum::actingAs($context['manager']);

    $response = $this->getJson('/api/v1/analytics/reports?section=barbers&period=daily')
        ->assertOk();

    $response->assertJsonStructure([
        'data' => ['barbers'],
    ]);

    expect($response->json('data.barbers.0.completed_count'))->toBe(1);
    expect($response->json('data.barbers.0.revenue'))->toBe(300);
});

test('analytics reports returns customers section', function () {
    $context = createAnalyticsReportContext();
    createAnalyticsReportAppointment($context, '2026-07-14', 'completed');
    Sanctum::actingAs($context['manager']);

    $response = $this->getJson('/api/v1/analytics/reports?section=customers&period=daily')
        ->assertOk();

    $response->assertJsonStructure([
        'data' => ['total_customers_served', 'new_customers', 'returning_customers', 'repeat_rate', 'rating_distribution'],
    ]);

    expect($response->json('data.total_customers_served'))->toBe(1);
});
