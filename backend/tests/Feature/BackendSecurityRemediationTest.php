<?php

use App\Models\Appointment;
use App\Models\ClosedDates;
use App\Models\Module;
use App\Models\PushSubscription;
use App\Models\Role;
use App\Models\Service;
use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('sanctum csrf handshake issues an xsrf cookie and api routes are stateful', function () {
    $response = $this
        ->withHeader('Origin', (string) config('app.frontend_url'))
        ->get('/sanctum/csrf-cookie');

    $response->assertNoContent();

    $cookieNames = collect($response->headers->getCookies())
        ->map(fn ($cookie) => $cookie->getName());
    $route = app('router')->getRoutes()->match(Request::create('/api/v1/user', 'GET'));
    $middleware = app('router')->gatherRouteMiddleware($route);

    expect($cookieNames)->toContain('XSRF-TOKEN')
        ->and($middleware)->toContain(EnsureFrontendRequestsAreStateful::class)
        ->and(app(PreventRequestForgery::class)->getExcludedPaths())->not->toContain('api/*');
});

test('inactive accounts are rejected and their current access token is revoked', function () {
    $user = User::factory()->create(['is_active' => false]);
    $token = $user->createToken('inactive-session');

    Sanctum::actingAs($user);
    $user->withAccessToken($token->accessToken);

    $this->getJson('/api/v1/user')
        ->assertForbidden()
        ->assertJsonPath('code', 'ACCOUNT_DISABLED');

    $this->assertDatabaseMissing('personal_access_tokens', [
        'id' => $token->accessToken->id,
    ]);
});

test('admins require a matching module while managers bypass module assignments', function () {
    $appointmentModule = Module::create([
        'key' => 'appointment',
        'name' => 'Appointments',
    ]);
    $role = Role::create(['name' => 'Appointment Admin']);
    $admin = User::factory()->create([
        'fullname' => 'Admin User',
        'role' => 'admin',
        'role_id' => $role->id,
    ]);

    Sanctum::actingAs($admin);
    $this->getJson('/api/v1/user')->assertJsonPath('data.permissions', []);
    $this->getJson('/api/v1/services')->assertForbidden();

    $role->modules()->attach($appointmentModule);
    $this->getJson('/api/v1/services')->assertOk();

    $manager = User::factory()->create(['role' => 'manager', 'role_id' => null]);
    Sanctum::actingAs($manager);
    $this->getJson('/api/v1/services')->assertOk();
});

test('admin page APIs carry their matching module middleware', function (string $method, string $uri, string $module) {
    $route = app('router')->getRoutes()->match(Request::create($uri, $method));

    expect($route->gatherMiddleware())->toContain("module:{$module}");
})->with([
    'dashboard' => ['GET', '/api/v1/appointments/overview/stats', 'dashboard'],
    'dashboard weekly schedule' => ['GET', '/api/v1/appointments/overview/weekly-schedule?date=2026-07-20', 'dashboard'],
    'management' => ['POST', '/api/v1/services', 'management'],
    'appointment' => ['GET', '/api/v1/appointments', 'appointment'],
    'walk-in' => ['GET', '/api/v1/walkins/stats', 'walkin'],
    'history' => ['GET', '/api/v1/appointments/history', 'history'],
    'reports' => ['GET', '/api/v1/analytics/revenue', 'reports'],
    'feedback' => ['GET', '/api/v1/feedback', 'feedback'],
    'customers' => ['GET', '/api/v1/customers', 'crm'],
    'customer service' => ['GET', '/api/v1/support/queue', 'customer-service'],
]);

test('admin and barber endpoints cannot target users from another role', function () {
    $manager = User::factory()->create(['role' => 'manager']);
    $customer = User::factory()->create([
        'fullname' => 'Original Customer',
        'email' => 'target-customer@example.test',
        'contact_number' => '09123456789',
    ]);

    Sanctum::actingAs($manager);

    $this->getJson("/api/v1/admin/{$manager->id}")->assertNotFound();
    $this->putJson("/api/v1/barber/{$customer->id}", [
        'fullname' => 'Wrong Role Update',
        'email' => $customer->email,
        'contact_number' => $customer->contact_number,
        'is_active' => true,
    ])->assertNotFound();
    $this->deleteJson("/api/v1/barber/{$customer->id}")->assertNotFound();

    expect($customer->fresh()->fullname)->toBe('Original Customer')
        ->and($customer->fresh()->deleted_at)->toBeNull();
});

test('staff image uploads are rejected', function () {
    $manager = User::factory()->create(['role' => 'manager']);
    Sanctum::actingAs($manager);

    $this->post('/api/v1/barber', [
        'fullname' => 'Image Barber',
        'email' => 'image-barber@example.test',
        'contact_number' => '09123456789',
        'is_active' => true,
        'image' => UploadedFile::fake()->create('staff.jpg', 100, 'image/jpeg'),
    ], ['Accept' => 'application/json'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('image');

    $this->assertDatabaseMissing('users', ['email' => 'image-barber@example.test']);
});

test('profile email changes require the current password and require customer reverification', function () {
    Notification::fake();

    $customer = User::factory()->create([
        'email' => 'current-profile@example.test',
        'password' => 'old-password',
    ]);
    Sanctum::actingAs($customer);

    $profile = [
        'fullname' => 'Profile Customer',
        'email' => 'new-profile@example.test',
        'contact_number' => '09123456789',
    ];

    $this->putJson('/api/v1/change-information', $profile)
        ->assertUnprocessable()
        ->assertJsonValidationErrors('current_password');

    $this->putJson('/api/v1/change-information', [
        ...$profile,
        'current_password' => 'wrong-password',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('current_password');

    $this->putJson('/api/v1/change-information', [
        ...$profile,
        'current_password' => 'old-password',
    ])->assertOk()
        ->assertJsonPath('data.email', 'new-profile@example.test');

    $customer->refresh();
    expect($customer->email)->toBe('new-profile@example.test')
        ->and($customer->email_verified_at)->toBeNull();
    Notification::assertSentTo($customer, VerifyEmail::class);
});

test('profile updates keep a customer verified when the email is unchanged', function () {
    $customer = User::factory()->create([
        'email' => 'unchanged-profile@example.test',
    ]);
    Sanctum::actingAs($customer);

    $this->putJson('/api/v1/change-information', [
        'fullname' => 'Updated Customer',
        'email' => 'UNCHANGED-PROFILE@example.test',
        'contact_number' => '09123456789',
    ])->assertOk();

    expect($customer->fresh()->email_verified_at)->not->toBeNull();
});

test('password changes preserve the current token and revoke other sessions and tokens', function () {
    config()->set('session.driver', 'database');

    $user = User::factory()->create([
        'password' => 'old-password',
        'remember_token' => 'old-remember-token',
    ]);
    $currentToken = $user->createToken('current-token');
    $otherToken = $user->createToken('other-token');
    DB::table('sessions')->insert([
        [
            'id' => 'other-session-one',
            'user_id' => $user->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Pest',
            'payload' => 'payload',
            'last_activity' => now()->timestamp,
        ],
        [
            'id' => 'other-session-two',
            'user_id' => $user->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Pest',
            'payload' => 'payload',
            'last_activity' => now()->timestamp,
        ],
    ]);

    Sanctum::actingAs($user);
    $user->withAccessToken($currentToken->accessToken);

    $this->putJson('/api/v1/change-password', [
        'current_password' => 'old-password',
        'password' => 'aaaaaa',
        'password_confirmation' => 'aaaaaa',
    ])->assertOk();

    $user->refresh();
    expect(Hash::check('aaaaaa', $user->password))->toBeTrue()
        ->and($user->remember_token)->not->toBe('old-remember-token');
    $this->assertDatabaseHas('personal_access_tokens', ['id' => $currentToken->accessToken->id]);
    $this->assertDatabaseMissing('personal_access_tokens', ['id' => $otherToken->accessToken->id]);
    $this->assertDatabaseMissing('sessions', ['user_id' => $user->id]);
});

test('deleting a service archives it without removing its record', function () {
    $manager = User::factory()->create(['role' => 'manager']);
    $service = Service::create([
        'name' => 'Archive Haircut',
        'description' => 'Service retained for historical records',
        'duration' => 30,
        'price' => 200,
        'is_active' => true,
    ]);
    Sanctum::actingAs($manager);

    $this->deleteJson("/api/v1/services/{$service->id}")
        ->assertOk()
        ->assertJsonPath('message', 'Service archived successfully');

    $this->assertDatabaseHas('services', [
        'id' => $service->id,
        'is_active' => false,
    ]);
});

test('registration returns the same generic result for an existing email', function () {
    Notification::fake();
    $existing = User::factory()->create(['email' => 'existing-registration@example.test']);

    $response = $this->postJson('/api/v1/register', [
        'fullname' => 'Existing Customer',
        'contact_number' => '09123456789',
        'email' => 'EXISTING-REGISTRATION@example.test',
        'password' => 'aaaaaa',
        'password_confirmation' => 'aaaaaa',
        'terms_accepted' => true,
        'privacy_acknowledged' => true,
    ]);

    $response
        ->assertCreated()
        ->assertJsonPath('message', 'If registration can be completed, check your inbox for a verification email.')
        ->assertJsonPath('data.email', 'existing-registration@example.test');
    expect(User::where('email', $existing->email)->count())->toBe(1);
});

test('customers do not receive barber private contact fields', function () {
    $customer = User::factory()->create(['role' => 'customer']);
    $barber = User::factory()->create([
        'role' => 'barber',
        'email' => 'private-barber@example.test',
        'contact_number' => '09123456789',
    ]);
    $service = Service::create([
        'name' => 'Privacy Cut',
        'description' => 'Privacy resource test',
        'duration' => 30,
        'price' => 200,
        'is_active' => true,
    ]);
    Appointment::create([
        'user_id' => $customer->id,
        'service_id' => $service->id,
        'barber_user_id' => $barber->id,
        'appointment_date' => now()->addDay()->toDateString(),
        'appointment_time' => '09:00',
        'duration_minutes' => 30,
        'price' => 200,
        'status' => 'pending',
    ]);

    Sanctum::actingAs($customer);
    $this->getJson('/api/v1/barber')
        ->assertOk()
        ->assertJsonMissingPath('data.0.email')
        ->assertJsonMissingPath('data.0.contact_number');
    $this->getJson('/api/v1/appointments')
        ->assertOk()
        ->assertJsonMissingPath('data.0.barber.email')
        ->assertJsonMissingPath('data.0.barber.contact_number');
});

test('deactivating an admin revokes sessions tokens and push subscriptions', function () {
    config()->set('session.driver', 'database');
    $manager = User::factory()->create(['role' => 'manager']);
    $admin = User::factory()->create([
        'fullname' => 'Admin User',
        'role' => 'admin',
        'is_active' => true,
        'contact_number' => '09123456789',
    ]);
    $token = $admin->createToken('admin-device');
    PushSubscription::create([
        'user_id' => $admin->id,
        'endpoint' => 'https://fcm.googleapis.com/fcm/send/example',
        'p256dh' => 'key',
        'auth' => 'auth',
    ]);
    DB::table('sessions')->insert([
        'id' => 'admin-session',
        'user_id' => $admin->id,
        'ip_address' => '127.0.0.1',
        'user_agent' => 'Pest',
        'payload' => 'payload',
        'last_activity' => now()->timestamp,
    ]);

    Sanctum::actingAs($manager);
    $this->putJson("/api/v1/admin/{$admin->id}", [
        'fullname' => $admin->fullname,
        'email' => $admin->email,
        'contact_number' => $admin->contact_number,
        'is_active' => false,
        'role_id' => null,
    ])->assertOk();

    $this->assertDatabaseMissing('personal_access_tokens', ['id' => $token->accessToken->id]);
    $this->assertDatabaseMissing('push_subscriptions', ['user_id' => $admin->id]);
    $this->assertDatabaseMissing('sessions', ['user_id' => $admin->id]);
});

test('staff notification recipients are active and module scoped', function () {
    $module = Module::create(['key' => 'appointment', 'name' => 'Appointments']);
    $role = Role::create(['name' => 'Appointment Notifications']);
    $role->modules()->attach($module);
    $manager = User::factory()->create(['role' => 'manager', 'is_active' => true]);
    $allowedAdmin = User::factory()->create(['role' => 'admin', 'role_id' => $role->id, 'is_active' => true]);
    User::factory()->create(['role' => 'admin', 'is_active' => true]);
    User::factory()->create(['role' => 'manager', 'is_active' => false]);

    expect(User::activeStaffForModule('appointment')->pluck('id')->all())
        ->toEqualCanonicalizing([$manager->id, $allowedAdmin->id]);
});

test('customers cannot request removed closed date history', function () {
    ClosedDates::create([
        'date_closed' => now()->addWeek()->toDateString(),
        'reason' => 'Maintenance',
        'is_removed' => true,
    ]);
    $customer = User::factory()->create(['role' => 'customer']);
    Sanctum::actingAs($customer);

    $this->getJson('/api/v1/closed-dates?all=1')->assertForbidden();
});

test('support text is sanitized before storage', function () {
    $customer = User::factory()->create(['role' => 'customer']);
    Sanctum::actingAs($customer);

    $this->postJson('/api/v1/support/tickets', [
        'category' => '<b>general_inquiry</b>',
        'message' => '<script>alert(1)</script>Hello',
    ])->assertCreated();

    $this->assertDatabaseHas('support_tickets', ['category' => 'general_inquiry']);
    $this->assertDatabaseHas('support_messages', ['message' => 'alert(1)Hello']);
});
