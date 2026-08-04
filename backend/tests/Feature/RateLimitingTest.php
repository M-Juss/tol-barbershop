<?php

use App\Http\Requests\LoginRequest;
use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Session\ArraySessionHandler;
use Illuminate\Session\Store;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function resolveNamedLimit(string $name, string $method, string $uri, User $user): Limit
{
    $request = Request::create($uri, $method);
    $route = app('router')->getRoutes()->match($request);
    $request->setRouteResolver(fn () => $route);
    $request->setUserResolver(fn () => $user);

    return RateLimiter::limiter($name)($request);
}

function resolveGuestNamedLimits(
    string $name,
    string $method,
    string $uri,
    array $payload,
    string $sessionId,
    array $server = [],
): array {
    $request = Request::create($uri, $method, $payload, [], [], $server);
    $route = app('router')->getRoutes()->match($request);
    $request->setRouteResolver(fn () => $route);
    $request->setLaravelSession(new Store(
        'rate-limiting-test',
        new ArraySessionHandler(120),
        $sessionId,
    ));

    return RateLimiter::limiter($name)($request);
}

test('different users do not share authenticated read buckets', function () {
    [$firstUser, $secondUser] = User::factory()->count(2)->create();

    $first = resolveNamedLimit('authenticated-read', 'GET', '/api/v1/services', $firstUser);
    $second = resolveNamedLimit('authenticated-read', 'GET', '/api/v1/services', $secondUser);

    expect($first->key)->toBe("read:{$firstUser->id}:services.index")
        ->and($second->key)->toBe("read:{$secondUser->id}:services.index")
        ->and($first->key)->not->toBe($second->key);
});

test('read limiter keys use normalized route templates instead of dynamic paths', function () {
    $user = User::factory()->create();

    $first = resolveNamedLimit(
        'authenticated-read',
        'GET',
        '/api/v1/support/tickets/1/messages',
        $user,
    );
    $second = resolveNamedLimit(
        'authenticated-read',
        'GET',
        '/api/v1/support/tickets/999/messages',
        $user,
    );

    expect($first->key)
        ->toBe("read:{$user->id}:api/v1/support/tickets/{id}/messages")
        ->and($second->key)->toBe($first->key)
        ->and($first->maxAttempts)->toBe(600);
});

test('polling and normal reads use isolated per-route keys', function () {
    $user = User::factory()->create();

    $changes = resolveNamedLimit('polling', 'GET', '/api/v1/changes', $user);
    $pendingCount = resolveNamedLimit(
        'polling',
        'GET',
        '/api/v1/appointments/pending-count',
        $user,
    );
    $services = resolveNamedLimit('authenticated-read', 'GET', '/api/v1/services', $user);
    $barbers = resolveNamedLimit('authenticated-read', 'GET', '/api/v1/barber', $user);

    expect($changes->key)->toBe("poll:{$user->id}:api/v1/changes")
        ->and($pendingCount->key)->toBe("poll:{$user->id}:api/v1/appointments/pending-count")
        ->and($services->key)->toBe("read:{$user->id}:services.index")
        ->and($barbers->key)->toBe("read:{$user->id}:barber.index")
        ->and(collect([
            $changes->key,
            $pendingCount->key,
            $services->key,
            $barbers->key,
        ])->unique())->toHaveCount(4)
        ->and($changes->maxAttempts)->toBe(600)
        ->and($services->maxAttempts)->toBe(600);
});

test('public reads use isolated normalized global route buckets', function () {
    $resolvePublicLimit = function (string $uri, string $peer): Limit {
        $request = Request::create($uri, 'GET', [], [], [], [
            'REMOTE_ADDR' => $peer,
        ]);
        $route = app('router')->getRoutes()->match($request);
        $request->setRouteResolver(fn () => $route);

        return RateLimiter::limiter('public-read')($request);
    };

    $services = $resolvePublicLimit('/api/v1/public-services', '203.0.113.10');
    $sameRouteDifferentPeer = $resolvePublicLimit('/api/v1/public-services', '203.0.113.99');
    $gallery = $resolvePublicLimit('/api/v1/public-gallery-images', '203.0.113.10');

    expect($services->key)
        ->toBe('public-read:api/v1/public-services')
        ->and($sameRouteDifferentPeer->key)->toBe($services->key)
        ->and($gallery->key)
        ->toBe('public-read:api/v1/public-gallery-images')
        ->and($services->key)->not->toBe($gallery->key)
        ->and($services->maxAttempts)->toBe(600)
        ->and($gallery->maxAttempts)->toBe(600);
});

test('write booking support and logout limiters have separate user buckets', function () {
    $user = User::factory()->create();

    $write = resolveNamedLimit('authenticated-write', 'POST', '/api/v1/services', $user);
    $booking = resolveNamedLimit('booking-action', 'POST', '/api/v1/appointments', $user);
    $support = resolveNamedLimit(
        'support-message',
        'POST',
        '/api/v1/support/tickets/1/messages',
        $user,
    );
    $logout = resolveNamedLimit('logout', 'POST', '/api/v1/logout', $user);

    expect($write->key)->toBe("write:{$user->id}")
        ->and($write->maxAttempts)->toBe(30)
        ->and($booking->key)->toBe("booking:{$user->id}")
        ->and($booking->maxAttempts)->toBe(30)
        ->and($support->key)->toBe("support-msg:{$user->id}")
        ->and($support->maxAttempts)->toBe(60)
        ->and($logout->key)->toBe("logout:{$user->id}")
        ->and($logout->maxAttempts)->toBe(30);
});

test('logout route does not use the shared authenticated write limiter', function () {
    $route = app('router')->getRoutes()->match(Request::create('/api/v1/logout', 'POST'));

    expect($route->gatherMiddleware())
        ->toContain('throttle:logout')
        ->not->toContain('throttle:authenticated-write');
});

test('login limits isolate email and browser session while retaining a global ceiling', function () {
    $emails = [
        'first@example.test',
        'second@example.test',
        'third@example.test',
        'fourth@example.test',
    ];
    $limits = collect($emails)->map(
        fn (string $email, int $index): array => resolveGuestNamedLimits(
            'login',
            'POST',
            '/api/v1/login',
            ['email' => $email],
            str_repeat((string) ($index + 1), 40),
            ['REMOTE_ADDR' => '203.0.113.10'],
        ),
    );

    expect($limits->pluck('0.key')->unique())->toHaveCount(4)
        ->and($limits->pluck('1.key')->unique())->toHaveCount(4)
        ->and($limits->pluck('2.key')->unique())->toHaveCount(1)
        ->and($limits->first()[0]->maxAttempts)->toBe(10)
        ->and($limits->first()[1]->maxAttempts)->toBe(30)
        ->and($limits->first()[2]->maxAttempts)->toBe(300)
        ->and($limits->flatten()->pluck('key')->contains(
            fn (string $key): bool => str_starts_with($key, 'login-client:')
        ))->toBeFalse();
});

test('same email shares login protection across different devices', function () {
    $first = resolveGuestNamedLimits(
        'login',
        'POST',
        '/api/v1/login',
        ['email' => 'target@example.test'],
        str_repeat('a', 40),
        ['REMOTE_ADDR' => '203.0.113.10'],
    );
    $second = resolveGuestNamedLimits(
        'login',
        'POST',
        '/api/v1/login',
        ['email' => 'target@example.test'],
        str_repeat('b', 40),
        ['REMOTE_ADDR' => '198.51.100.20'],
    );

    expect($first[0]->key)->toBe($second[0]->key)
        ->and($first[1]->key)->not->toBe($second[1]->key)
        ->and($first[2]->key)->toBe($second[2]->key);
});

test('failed login and recovery keys follow the target email instead of the proxy peer', function () {
    $firstLoginRequest = LoginRequest::create('/api/v1/login', 'POST', [
        'email' => 'target@example.test',
    ], [], [], [
        'REMOTE_ADDR' => '203.0.113.10',
    ]);
    $secondLoginRequest = LoginRequest::create('/api/v1/login', 'POST', [
        'email' => 'target@example.test',
    ], [], [], [
        'REMOTE_ADDR' => '198.51.100.20',
    ]);

    expect($firstLoginRequest->throttleKey())->toBe($secondLoginRequest->throttleKey());

    foreach ([
        'verification-resend' => 'email',
        'forgot-password' => 'email',
        'reset-password' => 'email',
        'validate-reset-token' => 'email',
        'change-registration-email' => 'current_email',
    ] as $limiter => $field) {
        $first = resolveGuestNamedLimits(
            $limiter,
            'POST',
            match ($limiter) {
                'verification-resend' => '/api/v1/email/verification-notification',
                'forgot-password' => '/api/v1/forgot-password',
                'reset-password' => '/api/v1/reset-password',
                'validate-reset-token' => '/api/v1/reset-password/validate-token',
                default => '/api/v1/email/change-registration-email',
            },
            [$field => 'target@example.test'],
            str_repeat('d', 40),
            ['REMOTE_ADDR' => '203.0.113.10'],
        );
        $second = resolveGuestNamedLimits(
            $limiter,
            'POST',
            match ($limiter) {
                'verification-resend' => '/api/v1/email/verification-notification',
                'forgot-password' => '/api/v1/forgot-password',
                'reset-password' => '/api/v1/reset-password',
                'validate-reset-token' => '/api/v1/reset-password/validate-token',
                default => '/api/v1/email/change-registration-email',
            },
            [$field => 'target@example.test'],
            str_repeat('e', 40),
            ['REMOTE_ADDR' => '198.51.100.20'],
        );

        expect($first[0]->key)->toBe($second[0]->key)
            ->and($first[1]->key)->toBe($second[1]->key);
    }
});

test('untrusted forwarded IP headers do not bypass login limits', function () {
    $forwarded = resolveGuestNamedLimits('login', 'POST', '/api/v1/login', [
        'email' => 'client@example.test',
    ], str_repeat('c', 40), [
        'REMOTE_ADDR' => '203.0.113.10',
        'HTTP_X_FORWARDED_FOR' => '198.51.100.20',
    ]);
    $unforwarded = resolveGuestNamedLimits('login', 'POST', '/api/v1/login', [
        'email' => 'client@example.test',
    ], str_repeat('c', 40), [
        'REMOTE_ADDR' => '203.0.113.10',
    ]);

    expect(array_map(fn (Limit $limit): string => $limit->key, $forwarded))
        ->toBe(array_map(fn (Limit $limit): string => $limit->key, $unforwarded));
});

test('four accounts can each log in once without sharing a limiter', function () {
    $users = User::factory()->count(4)->create();
    $frontendUrl = rtrim((string) config('app.frontend_url'), '/');

    foreach ($users as $user) {
        $this
            ->withHeaders([
                'Origin' => $frontendUrl,
                'Referer' => $frontendUrl.'/login',
            ])
            ->postJson('/api/v1/login', [
                'email' => $user->email,
                'password' => 'password',
            ])
            ->assertOk();
    }
});

test('login and registration endpoints enforce their strict named limits with diagnostics', function () {
    Notification::fake();

    $loginPayload = [
        'email' => 'limited-login@example.test',
        'password' => 'aaaaaa',
    ];

    foreach (range(1, 10) as $attempt) {
        $this->postJson('/api/v1/login', $loginPayload)->assertUnauthorized();
    }
    $this->postJson('/api/v1/login', $loginPayload)
        ->assertTooManyRequests()
        ->assertHeader('X-RateLimit-Policy', 'login-email')
        ->assertHeader('X-Response-Source', 'laravel')
        ->assertJsonPath('code', 'RATE_LIMITED')
        ->assertJsonPath('data.policy', 'login-email');

    $registrationPayload = [
        'fullname' => 'Limited Registration',
        'contact_number' => '09123456789',
        'email' => 'limited-registration@example.test',
        'password' => 'aaaaaa',
        'password_confirmation' => 'aaaaaa',
        'terms_accepted' => true,
        'privacy_acknowledged' => true,
    ];

    foreach (range(1, 5) as $attempt) {
        $this->postJson('/api/v1/register', $registrationPayload)->assertCreated();
    }
    $this->postJson('/api/v1/register', $registrationPayload)
        ->assertTooManyRequests()
        ->assertHeader('X-RateLimit-Policy', 'register-email')
        ->assertJsonPath('data.policy', 'register-email');
});

test('abusive login traffic reaches the global safety ceiling', function () {
    foreach (range(1, 300) as $attempt) {
        RateLimiter::hit(md5('loginlogin-global'), 60);
    }

    $this->postJson('/api/v1/login', [
        'email' => 'global-limit@example.test',
        'password' => 'password',
    ])
        ->assertTooManyRequests()
        ->assertHeader('X-RateLimit-Policy', 'login-global')
        ->assertJsonPath('data.source', 'laravel');
});

test('exhausting the shared write bucket does not block logout', function () {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    foreach (range(1, 30) as $attempt) {
        $this->postJson('/api/v1/push/subscribe', [])->assertUnprocessable();
    }
    $this->postJson('/api/v1/push/subscribe', [])->assertTooManyRequests();

    $this->postJson('/api/v1/logout')->assertOk();
});
