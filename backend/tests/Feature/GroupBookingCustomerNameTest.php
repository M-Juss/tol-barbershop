<?php

use App\Models\Appointment;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function createGroupBookingTestUser(string $role, string $email, string $name, string $contactNumber): User
{
    $user = User::create([
        'fullname' => $name,
        'contact_number' => $contactNumber,
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

function createGroupBookingTestService(): Service
{
    return Service::create([
        'name' => 'Group Haircut',
        'description' => 'Haircut for group booking tests',
        'duration' => 60,
        'price' => 300,
        'is_active' => true,
    ]);
}

test('group member remains the displayed customer after approval while contact details belong to the booker', function () {
    $booker = createGroupBookingTestUser(
        'customer',
        'group-booker@example.test',
        'Booking Customer',
        '09171111111'
    );
    $barber = createGroupBookingTestUser(
        'barber',
        'group-barber@example.test',
        'Group Barber',
        '09172222222'
    );
    $manager = createGroupBookingTestUser(
        'manager',
        'group-manager@example.test',
        'Group Manager',
        '09173333333'
    );
    $service = createGroupBookingTestService();
    $appointmentDate = now()->addDays(2)->toDateString();

    Sanctum::actingAs($booker);

    $this->postJson('/api/v1/appointments/batch', [
        'barber_user_id' => $barber->id,
        'appointment_date' => $appointmentDate,
        'appointments' => [
            [
                'customer_name' => 'Group Member One',
                'service_id' => $service->id,
                'appointment_time' => '10:00',
                'price' => 300,
            ],
            [
                'customer_name' => 'Group Member Two',
                'service_id' => $service->id,
                'appointment_time' => '11:00',
                'price' => 300,
            ],
        ],
    ])
        ->assertOk()
        ->assertJsonPath('data.0.customer.fullname', 'Group Member One')
        ->assertJsonPath('data.0.customer.email', $booker->email)
        ->assertJsonPath('data.0.customer.contact_number', $booker->contact_number);

    $appointment = Appointment::where('customer_name', 'Group Member One')->firstOrFail();

    expect($appointment->customer_name_snapshot)->toBe('Group Member One');
    expect($appointment->user_id)->toBe($booker->id);

    Sanctum::actingAs($manager);

    $this->putJson("/api/v1/appointments/{$appointment->id}", [
        'user_id' => $booker->id,
        'service_id' => $service->id,
        'barber_user_id' => $barber->id,
        'appointment_date' => $appointmentDate,
        'appointment_time' => '10:00',
        'price' => 300,
        'status' => 'approved',
    ])
        ->assertOk()
        ->assertJsonPath('data.customer.fullname', 'Group Member One')
        ->assertJsonPath('data.customer.email', $booker->email)
        ->assertJsonPath('data.customer.contact_number', $booker->contact_number);

    $appointment->refresh();

    expect($appointment->customer_name_snapshot)->toBe('Group Member One');
    expect($appointment->user_id)->toBe($booker->id);
});

test('an existing approved group row displays its per-person name instead of a wrong snapshot', function () {
    $booker = createGroupBookingTestUser(
        'customer',
        'existing-group-booker@example.test',
        'Existing Booker',
        '09174444444'
    );
    $barber = createGroupBookingTestUser(
        'barber',
        'existing-group-barber@example.test',
        'Existing Barber',
        '09175555555'
    );
    $manager = createGroupBookingTestUser(
        'manager',
        'existing-group-manager@example.test',
        'Existing Manager',
        '09176666666'
    );
    $service = createGroupBookingTestService();
    $appointmentDate = now()->addDay()->toDateString();

    $appointment = Appointment::create([
        'user_id' => $booker->id,
        'service_id' => $service->id,
        'barber_user_id' => $barber->id,
        'appointment_date' => $appointmentDate,
        'appointment_time' => '10:00',
        'duration_minutes' => 60,
        'price' => 300,
        'status' => 'approved',
        'batch_id' => 'BATCH-EXISTING',
        'customer_name' => 'Existing Group Member',
        'customer_name_snapshot' => $booker->fullname,
    ]);

    Sanctum::actingAs($manager);

    $this->getJson("/api/v1/appointments/{$appointment->id}")
        ->assertOk()
        ->assertJsonPath('data.customer.fullname', 'Existing Group Member')
        ->assertJsonPath('data.customer.email', $booker->email)
        ->assertJsonPath('data.customer.contact_number', $booker->contact_number);

    $slots = $this->getJson("/api/v1/appointments/overview/time-slots?date={$appointmentDate}")
        ->assertOk()
        ->json();
    $slotAppointment = collect($slots)
        ->firstWhere('time', '10:00 AM')['appointments'][0];

    expect($slotAppointment['customer'])->toBe('Existing Group Member');
    expect($slotAppointment['customer_email'])->toBe($booker->email);
    expect($slotAppointment['customer_contact'])->toBe($booker->contact_number);
    expect($appointment->fresh()->customer_name_snapshot)->toBe($booker->fullname);
});
