<?php

use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
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

test('public reads use isolated normalized route buckets for the same peer', function () {
    $resolvePublicLimit = function (string $uri): Limit {
        $request = Request::create($uri, 'GET', [], [], [], [
            'REMOTE_ADDR' => '203.0.113.10',
        ]);
        $route = app('router')->getRoutes()->match($request);
        $request->setRouteResolver(fn () => $route);

        return RateLimiter::limiter('public-read')($request);
    };

    $services = $resolvePublicLimit('/api/v1/public-services');
    $gallery = $resolvePublicLimit('/api/v1/public-gallery-images');

    expect($services->key)
        ->toBe('public-read:203.0.113.10:api/v1/public-services')
        ->and($gallery->key)
        ->toBe('public-read:203.0.113.10:api/v1/public-gallery-images')
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

test('untrusted forwarded IP headers do not replace the direct peer IP', function () {
    $request = Request::create('/api/v1/login', 'POST', [
        'email' => 'client@example.test',
    ], [], [], [
        'REMOTE_ADDR' => '203.0.113.10',
        'HTTP_X_FORWARDED_FOR' => '198.51.100.20',
    ]);
    $route = app('router')->getRoutes()->match($request);
    $request->setRouteResolver(fn () => $route);

    $limits = RateLimiter::limiter('login')($request);

    expect($request->ip())->toBe('203.0.113.10')
        ->and($limits[1]->key)->toBe('login-client:'.hash('sha256', '203.0.113.10'));
});

test('login and registration endpoints enforce their strict named limits', function () {
    Notification::fake();

    $loginPayload = [
        'email' => 'limited-login@example.test',
        'password' => 'aaaaaa',
    ];

    foreach (range(1, 10) as $attempt) {
        $this->postJson('/api/v1/login', $loginPayload)->assertUnauthorized();
    }
    $this->postJson('/api/v1/login', $loginPayload)->assertTooManyRequests();

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
    $this->postJson('/api/v1/register', $registrationPayload)->assertTooManyRequests();
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
