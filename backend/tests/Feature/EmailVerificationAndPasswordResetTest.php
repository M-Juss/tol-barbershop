<?php

use App\Models\User;
use Illuminate\Auth\Events\PasswordReset as PasswordResetEvent;
use Illuminate\Auth\Events\Verified;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\URL;

uses(RefreshDatabase::class);

it('registers an unverified customer and sends a verification email', function () {
    Notification::fake();

    $this->postJson('/api/v1/register', [
        'fullname' => 'Juan Dela Cruz',
        'contact_number' => '09123456789',
        'email' => 'juan@example.com',
        'password' => 'Secure1!',
        'password_confirmation' => 'Secure1!',
        'terms_accepted' => true,
        'privacy_acknowledged' => true,
    ])->assertCreated();

    $user = User::where('email', 'juan@example.com')->firstOrFail();

    expect($user->role)->toBe('customer')
        ->and($user->email_verified_at)->toBeNull();
    Notification::assertSentTo($user, VerifyEmail::class);
});

it('verifies a customer using a signed email link', function () {
    Event::fake();
    $user = User::factory()->unverified()->create();
    $url = URL::temporarySignedRoute(
        'verification.verify',
        now()->addHour(),
        ['id' => $user->id, 'hash' => sha1($user->email)],
        absolute: false,
    );

    $this->get($url)
        ->assertRedirect(rtrim((string) config('app.frontend_url'), '/').'/login?verified=1');

    expect($user->fresh()->hasVerifiedEmail())->toBeTrue();
    Event::assertDispatched(Verified::class);
});

it('uses a verification link only once', function () {
    Event::fake([Verified::class]);
    $user = User::factory()->unverified()->create();
    $url = URL::temporarySignedRoute(
        'verification.verify',
        now()->addHour(),
        ['id' => $user->id, 'hash' => sha1($user->email)],
        absolute: false,
    );

    $this->get($url)
        ->assertRedirect(rtrim((string) config('app.frontend_url'), '/').'/login?verified=1');
    $this->get($url)
        ->assertRedirect(rtrim((string) config('app.frontend_url'), '/').'/login?verified=already');
    Event::assertDispatchedTimes(Verified::class, 1);
});

it('rejects an expired verification link', function () {
    $user = User::factory()->unverified()->create();
    $url = URL::temporarySignedRoute(
        'verification.verify',
        now()->subMinute(),
        ['id' => $user->id, 'hash' => sha1($user->email)],
        absolute: false,
    );

    $this->get($url)
        ->assertRedirect(rtrim((string) config('app.frontend_url'), '/').'/verify-email?status=invalid');

    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

it('renders a branded verification email with a fallback link', function () {
    $user = User::factory()->unverified()->create(['fullname' => 'Juan Dela Cruz']);
    $mail = (new VerifyEmail)->toMail($user);
    $html = (string) $mail->render();
    $text = view('emails.auth-action-text', $mail->data())->render();
    $verificationUrl = $mail->viewData['actionUrl'];

    expect($mail->subject)->toBe('Verify your TOL Barbershop email')
        ->and($html)
        ->toContain('background-color: #143c62')
        ->toContain('background-color: #de3b3d')
        ->toContain('Hi Juan Dela Cruz,')
        ->toContain(e("You're almost there."))
        ->toContain('Verify Email')
        ->toContain('expires in 60 minutes')
        ->toContain('href="'.e($verificationUrl).'"')
        ->toContain('/privacy-policy')
        ->and($text)
        ->toContain($verificationUrl)
        ->toContain("If you didn't create this account, you can safely ignore this email.");
});

it('resends verification without revealing whether the account exists', function () {
    Notification::fake();
    $user = User::factory()->unverified()->create();

    $knownResponse = $this->postJson('/api/v1/email/verification-notification', [
        'email' => $user->email,
    ]);
    $repeatedResponse = $this->postJson('/api/v1/email/verification-notification', [
        'email' => strtoupper($user->email),
    ]);
    $unknownResponse = $this->postJson('/api/v1/email/verification-notification', [
        'email' => 'missing@example.com',
    ]);

    $knownResponse->assertOk();
    $repeatedResponse->assertOk();
    $unknownResponse->assertOk();
    expect($knownResponse->json('message'))
        ->toBe($repeatedResponse->json('message'))
        ->toBe($unknownResponse->json('message'));
    Notification::assertSentTo($user, VerifyEmail::class);
    Notification::assertCount(1);
});

it('changes an unverified customer registration email and invalidates the old verification link', function () {
    Notification::fake();
    $user = User::factory()->unverified()->create([
        'email' => 'current@example.com',
        'password' => 'Secure1!',
    ]);
    $oldUrl = URL::temporarySignedRoute(
        'verification.verify',
        now()->addHour(),
        ['id' => $user->id, 'hash' => sha1($user->email)],
        absolute: false,
    );

    $this->postJson('/api/v1/email/change-registration-email', [
        'current_email' => ' CURRENT@EXAMPLE.COM ',
        'password' => 'Secure1!',
        'new_email' => ' NEW@EXAMPLE.COM ',
        'new_email_confirmation' => 'new@example.com',
    ])->assertOk()
        ->assertJsonPath('data.email', 'new@example.com');

    $user->refresh();
    expect($user->email)->toBe('new@example.com')
        ->and($user->email_verified_at)->toBeNull();
    Notification::assertSentTo($user, VerifyEmail::class);
    $this->get($oldUrl)
        ->assertRedirect(rtrim((string) config('app.frontend_url'), '/').'/verify-email?status=invalid');
    $this->assertGuest();
});

it('returns the generic credential error before checking new email availability', function () {
    $user = User::factory()->unverified()->create([
        'email' => 'current@example.com',
        'password' => 'Secure1!',
    ]);
    User::factory()->create(['email' => 'taken@example.com']);

    $this->postJson('/api/v1/email/change-registration-email', [
        'current_email' => $user->email,
        'password' => 'WrongSecure1!',
        'new_email' => 'taken@example.com',
        'new_email_confirmation' => 'taken@example.com',
    ])->assertUnprocessable()
        ->assertJsonPath('message', 'The provided credentials are invalid.')
        ->assertJsonValidationErrors('current_email')
        ->assertJsonMissingValidationErrors('new_email');

    expect($user->fresh()->email)->toBe('current@example.com');
});

it('rejects verified admin and inactive accounts with the same credential error', function () {
    $users = [
        User::factory()->create(['email' => 'verified@example.com', 'password' => 'Secure1!']),
        User::factory()->unverified()->create(['email' => 'admin@example.com', 'role' => 'admin', 'password' => 'Secure1!']),
        User::factory()->unverified()->create(['email' => 'inactive@example.com', 'is_active' => false, 'password' => 'Secure1!']),
    ];

    foreach ($users as $index => $user) {
        $this->postJson('/api/v1/email/change-registration-email', [
            'current_email' => $user->email,
            'password' => 'Secure1!',
            'new_email' => "new{$index}@example.com",
            'new_email_confirmation' => "new{$index}@example.com",
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'The provided credentials are invalid.')
            ->assertJsonValidationErrors('current_email');
    }
});

it('validates same and duplicate registration emails clearly', function () {
    $user = User::factory()->unverified()->create([
        'email' => 'current@example.com',
        'password' => 'Secure1!',
    ]);
    User::factory()->create(['email' => 'taken@example.com']);

    $payload = [
        'current_email' => $user->email,
        'password' => 'Secure1!',
        'new_email' => $user->email,
        'new_email_confirmation' => $user->email,
    ];

    $this->postJson('/api/v1/email/change-registration-email', $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors('new_email');

    $this->postJson('/api/v1/email/change-registration-email', [
        ...$payload,
        'new_email' => 'taken@example.com',
        'new_email_confirmation' => 'taken@example.com',
    ])->assertUnprocessable()
        ->assertJsonPath('message', 'The new email is unavailable.')
        ->assertJsonValidationErrors('new_email');
});

it('rate limits failed registration email credential attempts for five minutes', function () {
    $user = User::factory()->unverified()->create([
        'email' => 'current@example.com',
        'password' => 'Secure1!',
    ]);
    $payload = [
        'current_email' => $user->email,
        'password' => 'WrongSecure1!',
        'new_email' => 'new@example.com',
        'new_email_confirmation' => 'new@example.com',
    ];

    foreach (range(1, 5) as $attempt) {
        $this->postJson('/api/v1/email/change-registration-email', $payload)
            ->assertUnprocessable();
    }

    $this->travel(61)->seconds();
    $this->postJson('/api/v1/email/change-registration-email', $payload)
        ->assertTooManyRequests()
        ->assertHeader('Retry-After');
    $this->travelBack();
});

it('blocks unverified customers but not unverified admins from logging in', function () {
    $this->withHeader('Origin', 'http://localhost:3000');

    $customer = User::factory()->unverified()->create([
        'email' => 'customer@example.com',
        'password' => 'Secure1!',
    ]);
    $admin = User::factory()->unverified()->create([
        'email' => 'admin@example.com',
        'role' => 'admin',
        'password' => 'Secure1!',
    ]);

    $this->postJson('/api/v1/login', [
        'email' => $customer->email,
        'password' => 'Secure1!',
    ])->assertForbidden()->assertJsonPath('code', 'EMAIL_UNVERIFIED');
    $this->assertGuest();

    $this->postJson('/api/v1/login', [
        'email' => $admin->email,
        'password' => 'Secure1!',
    ])->assertOk();
    $this->assertAuthenticatedAs($admin);
});

it('blocks authenticated unverified customers from protected APIs but permits logout', function () {
    $this->withHeader('Origin', 'http://localhost:3000');

    $user = User::factory()->unverified()->create();

    $this->actingAs($user)
        ->getJson('/api/v1/user')
        ->assertForbidden()
        ->assertJsonPath('code', 'EMAIL_UNVERIFIED');

    $this->postJson('/api/v1/logout')->assertOk();
    $this->assertGuest('web');
});

it('returns the same forgot password response for known and unknown emails', function () {
    Notification::fake();
    $user = User::factory()->create();

    $knownResponse = $this->postJson('/api/v1/forgot-password', ['email' => $user->email]);
    $unknownResponse = $this->postJson('/api/v1/forgot-password', ['email' => 'missing@example.com']);

    $knownResponse->assertOk();
    $unknownResponse->assertOk();
    expect($knownResponse->json('message'))->toBe($unknownResponse->json('message'));
    Notification::assertSentTo($user, ResetPassword::class);
});

it('renders a branded password reset email with a fallback link', function () {
    $user = User::factory()->create([
        'fullname' => 'Maria Santos',
        'email' => 'maria@example.com',
    ]);
    $token = 'secure-reset-token';
    $mail = (new ResetPassword($token))->toMail($user);
    $html = (string) $mail->render();
    $text = view('emails.auth-action-text', $mail->data())->render();
    $resetUrl = rtrim((string) config('app.frontend_url'), '/').'/reset-password?'.http_build_query([
        'email' => $user->email,
        'token' => $token,
    ]);

    expect($mail->subject)->toBe('Reset your TOL Barbershop password')
        ->and($html)
        ->toContain('background-color: #143c62')
        ->toContain('background-color: #de3b3d')
        ->toContain('Hi Maria Santos,')
        ->toContain('We received a request to reset your TOL Barbershop password.')
        ->toContain('Reset Password')
        ->toContain('expires in 60 minutes')
        ->toContain('href="'.e($resetUrl).'"')
        ->toContain('/terms-of-use')
        ->and($text)
        ->toContain($resetUrl)
        ->toContain("If you didn't request a password reset, you can safely ignore this email.");
});

it('resets a password with a valid one-use emailed token', function () {
    Notification::fake();
    Event::fake([PasswordResetEvent::class]);
    config(['session.driver' => 'database']);
    $user = User::factory()->create(['password' => 'OldSecure1!']);
    $token = null;

    DB::table('sessions')->insert([
        'id' => 'existing-user-session',
        'user_id' => $user->id,
        'ip_address' => '127.0.0.1',
        'user_agent' => 'Pest',
        'payload' => 'test-payload',
        'last_activity' => now()->timestamp,
    ]);

    $this->postJson('/api/v1/forgot-password', ['email' => $user->email])->assertOk();
    Notification::assertSentTo(
        $user,
        ResetPassword::class,
        function (ResetPassword $notification) use (&$token): bool {
            $token = $notification->token;

            return true;
        },
    );

    $payload = [
        'email' => $user->email,
        'token' => $token,
        'password' => 'NewSecure1!',
        'password_confirmation' => 'NewSecure1!',
    ];

    $this->postJson('/api/v1/reset-password/validate-token', [
        'email' => strtoupper($user->email),
        'token' => $token,
    ])->assertOk()->assertJsonPath('data.valid', true);

    $this->postJson('/api/v1/reset-password', $payload)->assertOk();
    expect(Hash::check('NewSecure1!', $user->fresh()->password))->toBeTrue();
    $this->assertDatabaseMissing('sessions', ['user_id' => $user->id]);
    Event::assertDispatched(PasswordResetEvent::class);

    $this->postJson('/api/v1/reset-password/validate-token', [
        'email' => $user->email,
        'token' => $token,
    ])->assertOk()->assertJsonPath('data.valid', false);

    $this->postJson('/api/v1/reset-password', $payload)->assertUnprocessable();
    Event::assertDispatchedTimes(PasswordResetEvent::class, 1);
});

it('rejects invalid password reset tokens', function () {
    $user = User::factory()->create();

    $this->postJson('/api/v1/reset-password', [
        'email' => $user->email,
        'token' => 'invalid-token',
        'password' => 'NewSecure1!',
        'password_confirmation' => 'NewSecure1!',
    ])->assertUnprocessable();

    $this->postJson('/api/v1/reset-password/validate-token', [
        'email' => $user->email,
        'token' => 'invalid-token',
    ])->assertOk()->assertJsonPath('data.valid', false);

    $this->postJson('/api/v1/reset-password/validate-token', [
        'email' => 'missing@example.com',
        'token' => 'invalid-token',
    ])->assertOk()->assertJsonPath('data.valid', false);
});

it('invalidates an older password reset token when a newer one is issued', function () {
    $user = User::factory()->create();
    $oldToken = Password::createToken($user);
    $newToken = Password::createToken($user);

    $this->postJson('/api/v1/reset-password/validate-token', [
        'email' => $user->email,
        'token' => $oldToken,
    ])->assertOk()->assertJsonPath('data.valid', false);

    $this->postJson('/api/v1/reset-password/validate-token', [
        'email' => $user->email,
        'token' => $newToken,
    ])->assertOk()->assertJsonPath('data.valid', true);
});
