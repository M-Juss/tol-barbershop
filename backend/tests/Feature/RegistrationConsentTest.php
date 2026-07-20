<?php

use App\Models\User;
use App\Models\UserPolicyAcceptance;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

function registrationConsentPayload(array $overrides = []): array
{
    return array_replace([
        'fullname' => 'Consent Customer',
        'contact_number' => '09123456789',
        'email' => 'consent@example.test',
        'password' => 'Secure1!',
        'password_confirmation' => 'Secure1!',
        'terms_accepted' => true,
        'privacy_acknowledged' => true,
    ], $overrides);
}

it('requires both registration consent fields', function () {
    $payload = registrationConsentPayload();
    unset($payload['terms_accepted'], $payload['privacy_acknowledged']);

    $this->postJson('/api/v1/register', $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['terms_accepted', 'privacy_acknowledged'])
        ->assertJsonPath('errors.terms_accepted.0', 'You must accept the Terms of Use to register.')
        ->assertJsonPath('errors.privacy_acknowledged.0', 'You must acknowledge the Privacy Policy to register.');
});

it('rejects false registration consent fields', function () {
    $this->postJson('/api/v1/register', registrationConsentPayload([
        'terms_accepted' => false,
        'privacy_acknowledged' => false,
    ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['terms_accepted', 'privacy_acknowledged'])
        ->assertJsonPath('errors.terms_accepted.0', 'You must accept the Terms of Use to register.')
        ->assertJsonPath('errors.privacy_acknowledged.0', 'You must acknowledge the Privacy Policy to register.');
});

it('records registration consent without exposing its metadata', function () {
    Notification::fake();

    $response = $this->postJson('/api/v1/register', registrationConsentPayload());

    $response->assertCreated()
        ->assertJsonMissingPath('data.policy_acceptances')
        ->assertJsonMissingPath('data.terms_version')
        ->assertJsonMissingPath('data.privacy_version')
        ->assertJsonMissingPath('data.accepted_at');

    $user = User::where('email', 'consent@example.test')->firstOrFail();
    $acceptance = UserPolicyAcceptance::sole();

    expect($acceptance->user->is($user))->toBeTrue()
        ->and($user->policyAcceptances()->sole()->is($acceptance))->toBeTrue()
        ->and($acceptance->terms_version)->toBe('2026-07-20')
        ->and($acceptance->privacy_version)->toBe('2026-07-20');
});

it('uses server-controlled policy versions and acceptance time', function () {
    Notification::fake();
    config([
        'legal.terms.version' => 'server-terms-version',
        'legal.privacy.version' => 'server-privacy-version',
    ]);
    $acceptedAt = Carbon::parse('2026-07-14 12:34:56');
    $this->travelTo($acceptedAt);

    $this->postJson('/api/v1/register', registrationConsentPayload([
        'terms_version' => 'client-terms-version',
        'privacy_version' => 'client-privacy-version',
        'accepted_at' => '2000-01-01 00:00:00',
    ]))->assertCreated();

    $acceptance = UserPolicyAcceptance::sole();

    expect($acceptance->terms_version)->toBe('server-terms-version')
        ->and($acceptance->privacy_version)->toBe('server-privacy-version')
        ->and($acceptance->accepted_at->equalTo($acceptedAt))->toBeTrue();
});

it('retains consent on soft delete and cascades it on physical delete', function () {
    Notification::fake();
    $this->postJson('/api/v1/register', registrationConsentPayload())->assertCreated();

    $user = User::where('email', 'consent@example.test')->firstOrFail();
    $acceptanceId = UserPolicyAcceptance::sole()->id;

    $user->delete();
    $this->assertDatabaseHas('user_policy_acceptances', ['id' => $acceptanceId]);

    $user->forceDelete();
    $this->assertDatabaseMissing('user_policy_acceptances', ['id' => $acceptanceId]);
});

it('fails closed when either server policy version is empty', function (string $configKey) {
    Notification::fake();
    config([$configKey => '  ']);
    $this->withoutExceptionHandling();

    expect(fn () => $this->postJson('/api/v1/register', registrationConsentPayload()))
        ->toThrow(LogicException::class, 'Registration policy versions are not configured.');

    $this->assertDatabaseMissing('users', ['email' => 'consent@example.test']);
    $this->assertDatabaseCount('user_policy_acceptances', 0);
    Notification::assertNothingSent();
})->with([
    'terms version' => 'legal.terms.version',
    'privacy version' => 'legal.privacy.version',
]);

it('rolls back registration when consent cannot be recorded', function () {
    Notification::fake();
    UserPolicyAcceptance::creating(function (): void {
        throw new RuntimeException('Consent insert failed.');
    });
    $this->withoutExceptionHandling();

    expect(fn () => $this->postJson('/api/v1/register', registrationConsentPayload()))
        ->toThrow(RuntimeException::class, 'Consent insert failed.');

    $this->assertDatabaseMissing('users', ['email' => 'consent@example.test']);
    $this->assertDatabaseCount('user_policy_acceptances', 0);
    Notification::assertNothingSent();
});
