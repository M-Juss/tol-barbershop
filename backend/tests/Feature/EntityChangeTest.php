<?php

use App\Models\User;
use App\Support\EntityChange;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    config()->set('cache.default', 'database');
});

test('entity changes persist unique versions with the database cache store', function () {
    Cache::forget('change:appointments');

    EntityChange::dispatch('appointments');
    $firstVersion = EntityChange::version('appointments');
    EntityChange::dispatch('appointments');
    $secondVersion = EntityChange::version('appointments');

    expect($firstVersion)
        ->not->toBe('0')
        ->and($secondVersion)
        ->not->toBe($firstVersion);
});

test('the change version endpoint requires authentication', function () {
    $this->getJson('/api/v1/changes')->assertUnauthorized();
});

test('authenticated users can retrieve appointment change versions', function () {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    EntityChange::dispatch('appointments');
    $version = EntityChange::version('appointments');

    $this->getJson('/api/v1/changes')
        ->assertOk()
        ->assertJsonPath('data.appointments', $version);
});
