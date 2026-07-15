<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('customer registration accepts a simple six character password', function () {
    Notification::fake();

    $this->postJson('/api/v1/register', [
        'fullname' => 'Simple Password',
        'contact_number' => '09123456789',
        'email' => 'simple-registration@example.test',
        'password' => 'aaaaaa',
        'password_confirmation' => 'aaaaaa',
        'terms_accepted' => true,
        'privacy_acknowledged' => true,
    ])->assertCreated();

    $user = User::where('email', 'simple-registration@example.test')->firstOrFail();

    expect(Hash::check('aaaaaa', $user->password))->toBeTrue();
});

test('customer registration rejects passwords shorter than six characters', function () {
    Notification::fake();

    $this->postJson('/api/v1/register', [
        'fullname' => 'Short Password',
        'contact_number' => '09123456789',
        'email' => 'short-registration@example.test',
        'password' => 'aaaaa',
        'password_confirmation' => 'aaaaa',
        'terms_accepted' => true,
        'privacy_acknowledged' => true,
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('password');
});

test('customer password reset accepts a simple six character password', function () {
    $user = User::factory()->create([
        'email' => 'simple-reset@example.test',
        'password' => 'old-password',
    ]);
    $token = Password::createToken($user);

    $this->postJson('/api/v1/reset-password', [
        'email' => $user->email,
        'token' => $token,
        'password' => 'aaaaa',
        'password_confirmation' => 'aaaaa',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('password');

    $this->postJson('/api/v1/reset-password', [
        'email' => $user->email,
        'token' => $token,
        'password' => 'aaaaaa',
        'password_confirmation' => 'aaaaaa',
    ])->assertOk();

    expect(Hash::check('aaaaaa', $user->fresh()->password))->toBeTrue();
});

test('customer password change accepts a simple six character password', function () {
    $customer = User::factory()->create([
        'role' => 'customer',
        'password' => 'old-password',
    ]);
    Sanctum::actingAs($customer);

    $this->putJson('/api/v1/change-password', [
        'current_password' => 'old-password',
        'password' => 'aaaaa',
        'password_confirmation' => 'aaaaa',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('password');

    $this->putJson('/api/v1/change-password', [
        'current_password' => 'old-password',
        'password' => 'aaaaaa',
        'password_confirmation' => 'aaaaaa',
    ])->assertOk();

    expect(Hash::check('aaaaaa', $customer->fresh()->password))->toBeTrue();
});

test('manager can create and update an admin with a simple six character password', function () {
    $manager = User::factory()->create(['role' => 'manager']);
    Sanctum::actingAs($manager);

    $payload = [
        'fullname' => 'Simple Admin',
        'contact_number' => '09123456789',
        'email' => 'simple-admin@example.test',
        'password' => 'aaaaa',
        'password_confirmation' => 'aaaaa',
        'is_active' => true,
    ];

    $this->postJson('/api/v1/admin', $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors('password');

    $this->postJson('/api/v1/admin', [
        ...$payload,
        'password' => 'aaaaaa',
        'password_confirmation' => 'aaaaaa',
    ])->assertCreated();

    $admin = User::where('email', 'simple-admin@example.test')->firstOrFail();
    expect(Hash::check('aaaaaa', $admin->password))->toBeTrue();

    $this->putJson("/api/v1/admin/{$admin->id}", [
        'fullname' => $admin->fullname,
        'contact_number' => $admin->contact_number,
        'email' => $admin->email,
        'password' => 'bbbbbb',
        'password_confirmation' => 'bbbbbb',
        'is_active' => true,
    ])->assertOk();

    expect(Hash::check('bbbbbb', $admin->fresh()->password))->toBeTrue();
});

test('barber password validation keeps its existing complexity policy', function () {
    $manager = User::factory()->create(['role' => 'manager']);
    Sanctum::actingAs($manager);

    $this->postJson('/api/v1/barber', [
        'fullname' => 'Simple Barber',
        'contact_number' => '09123456789',
        'email' => 'simple-barber@example.test',
        'password' => 'aaaaaa',
        'password_confirmation' => 'aaaaaa',
        'is_active' => true,
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('password');
});
