<?php

use App\Models\Notification;
use App\Models\User;
use App\Support\DisplayId;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('appointment display references use the APT prefix', function () {
    expect(DisplayId::booking(1))->toBe('APT-90235');
});

test('existing booking references are migrated to appointment references', function () {
    $user = User::create([
        'fullname' => 'Reference Test User',
        'contact_number' => '09170000000',
        'email' => 'reference@example.test',
        'role' => 'customer',
        'password' => 'password',
        'is_active' => true,
    ]);

    $notification = Notification::create([
        'user_id' => $user->id,
        'type' => 'appointment_completed',
        'title' => 'Booking Complete',
        'message' => 'Your booking BK-90235 is now complete.',
        'payload' => [
            'appointment_id' => 1,
            'booking_id' => 'BK-90235',
        ],
    ]);

    $migration = require database_path('migrations/2026_07_13_000000_update_booking_references_to_appointment_references.php');
    $migration->up();

    $notification->refresh();

    expect($notification->message)->toBe('Your booking APT-90235 is now complete.');
    expect($notification->payload['booking_id'])->toBe('APT-90235');
});
