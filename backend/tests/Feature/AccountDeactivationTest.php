<?php

use App\Models\Appointment;
use App\Models\AppointmentFeedback;
use App\Models\Notification;
use App\Models\PushSubscription;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('account deactivation requires the current password', function () {
    $user = User::factory()->create();
    $subscription = PushSubscription::create([
        'user_id' => $user->id,
        'endpoint' => 'https://fcm.googleapis.com/fcm/send/account-test',
        'p256dh' => 'test-p256dh',
        'auth' => 'test-auth',
    ]);

    Sanctum::actingAs($user);

    $this->deleteJson('/api/v1/account', [
        'password' => 'incorrect-password',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('password');

    expect($user->fresh()->deleted_at)->toBeNull();
    $this->assertDatabaseHas('push_subscriptions', ['id' => $subscription->id]);
});

test('account deactivation ends access while retaining operational and consent records', function () {
    $user = User::factory()->create(['email' => 'deactivate@example.test']);
    $barber = User::factory()->create([
        'email' => 'deactivate-barber@example.test',
        'role' => 'barber',
    ]);
    $service = Service::create([
        'name' => 'Account Test Haircut',
        'description' => 'Account deactivation test service',
        'duration' => 45,
        'price' => 250,
        'is_active' => true,
    ]);
    $appointment = Appointment::create([
        'user_id' => $user->id,
        'service_id' => $service->id,
        'barber_user_id' => $barber->id,
        'appointment_date' => now()->subDay()->toDateString(),
        'appointment_time' => '10:00',
        'duration_minutes' => 45,
        'price' => 250,
        'status' => 'completed',
    ]);
    $feedback = AppointmentFeedback::create([
        'appointment_id' => $appointment->id,
        'user_id' => $user->id,
        'rating' => 5,
        'comment' => 'Retained public feedback',
        'is_featured' => true,
        'customer_name_snapshot' => $user->fullname,
    ]);
    $acceptance = $user->policyAcceptances()->create([
        'terms_version' => '2026-07-14',
        'privacy_version' => '2026-07-14',
        'accepted_at' => now(),
    ]);
    $notification = Notification::create([
        'user_id' => $user->id,
        'type' => 'account_test',
        'title' => 'Retained notification',
        'message' => 'Operational record',
    ]);
    PushSubscription::create([
        'user_id' => $user->id,
        'endpoint' => 'https://fcm.googleapis.com/fcm/send/deactivation-test',
        'p256dh' => 'test-p256dh',
        'auth' => 'test-auth',
    ]);
    $token = $user->createToken('account-test');
    DB::table('sessions')->insert([
        'id' => 'account-deactivation-session',
        'user_id' => $user->id,
        'ip_address' => '127.0.0.1',
        'user_agent' => 'Pest',
        'payload' => 'test-payload',
        'last_activity' => now()->timestamp,
    ]);

    Sanctum::actingAs($user);

    $this->deleteJson('/api/v1/account', [
        'password' => 'password',
    ])->assertOk()
        ->assertJsonPath('message', 'Account deactivated successfully.');

    $this->assertSoftDeleted('users', ['id' => $user->id]);
    $this->assertDatabaseMissing('push_subscriptions', ['user_id' => $user->id]);
    $this->assertDatabaseMissing('personal_access_tokens', ['id' => $token->accessToken->id]);
    $this->assertDatabaseMissing('sessions', ['user_id' => $user->id]);
    $this->assertDatabaseHas('user_policy_acceptances', ['id' => $acceptance->id]);
    $this->assertDatabaseHas('appointments', ['id' => $appointment->id]);
    $this->assertDatabaseHas('notifications', ['id' => $notification->id]);

    $feedback->refresh();
    expect($feedback->is_featured)->toBeTrue();
});

test('logout retains stored push subscriptions', function () {
    $user = User::factory()->create();
    PushSubscription::create([
        'user_id' => $user->id,
        'endpoint' => 'https://fcm.googleapis.com/fcm/send/logout-test',
        'p256dh' => 'test-p256dh',
        'auth' => 'test-auth',
    ]);

    $this->withHeader('Origin', 'http://localhost:3000')
        ->actingAs($user)
        ->postJson('/api/v1/logout')
        ->assertOk();

    $this->assertDatabaseHas('push_subscriptions', ['user_id' => $user->id]);
    $this->assertGuest('web');
});
