<?php

use App\Models\Notification;
use App\Models\SupportMessage;
use App\Models\SupportTicket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('customer ticket state returns only the current live ticket summary', function () {
    $customer = User::factory()->create(['role' => 'customer']);
    $waiting = SupportTicket::create([
        'customer_id' => $customer->id,
        'status' => 'waiting',
    ]);
    SupportTicket::create([
        'customer_id' => $customer->id,
        'status' => 'resolved',
        'resolved_at' => now(),
    ]);

    Sanctum::actingAs($customer);

    $this->getJson('/api/v1/support/tickets?view=state')
        ->assertOk()
        ->assertJsonPath('data.id', $waiting->id)
        ->assertJsonPath('data.status', 'waiting')
        ->assertJsonCount(2, 'data');
});

test('customer ticket state falls back to the latest resolution and ignores cancellations', function () {
    $resolvedCustomer = User::factory()->create(['role' => 'customer']);
    $cancelledCustomer = User::factory()->create(['role' => 'customer']);
    $resolved = SupportTicket::create([
        'customer_id' => $resolvedCustomer->id,
        'status' => 'resolved',
        'resolved_at' => now(),
    ]);
    SupportTicket::create([
        'customer_id' => $cancelledCustomer->id,
        'status' => 'cancelled',
        'resolved_at' => now(),
    ]);

    Sanctum::actingAs($resolvedCustomer);
    $this->getJson('/api/v1/support/tickets?view=state')
        ->assertOk()
        ->assertJsonPath('data.id', $resolved->id)
        ->assertJsonPath('data.status', 'resolved');

    Sanctum::actingAs($cancelledCustomer);
    $this->getJson('/api/v1/support/tickets?view=state')
        ->assertOk()
        ->assertJsonPath('data', null);
});

test('staff live queue excludes history and unnecessary customer fields', function () {
    $customer = User::factory()->create(['role' => 'customer']);
    $manager = User::factory()->create(['role' => 'manager']);

    SupportTicket::create([
        'customer_id' => $customer->id,
        'status' => 'waiting',
    ]);
    SupportTicket::create([
        'customer_id' => $customer->id,
        'assigned_to_id' => $manager->id,
        'status' => 'active',
    ]);
    SupportTicket::create([
        'customer_id' => $customer->id,
        'assigned_to_id' => $manager->id,
        'status' => 'resolved',
        'resolved_at' => now(),
    ]);

    Sanctum::actingAs($manager);

    $this->getJson('/api/v1/support/queue?view=live')
        ->assertOk()
        ->assertJsonCount(1, 'data.waiting')
        ->assertJsonCount(1, 'data.active')
        ->assertJsonCount(0, 'data.resolved')
        ->assertJsonCount(0, 'data.cancelled')
        ->assertJsonMissingPath('data.waiting.0.customer.email');
});

test('staff queue history excludes live tickets and includes assigned staff', function () {
    $customer = User::factory()->create(['role' => 'customer']);
    $manager = User::factory()->create(['role' => 'manager']);

    SupportTicket::create([
        'customer_id' => $customer->id,
        'status' => 'waiting',
    ]);
    SupportTicket::create([
        'customer_id' => $customer->id,
        'assigned_to_id' => $manager->id,
        'status' => 'resolved',
        'resolved_at' => now(),
    ]);
    SupportTicket::create([
        'customer_id' => $customer->id,
        'assigned_to_id' => $manager->id,
        'status' => 'cancelled',
        'resolved_at' => now(),
    ]);

    Sanctum::actingAs($manager);

    $this->getJson('/api/v1/support/queue?view=history')
        ->assertOk()
        ->assertJsonCount(0, 'data.waiting')
        ->assertJsonCount(0, 'data.active')
        ->assertJsonCount(1, 'data.resolved')
        ->assertJsonCount(1, 'data.cancelled')
        ->assertJsonPath('data.cancelled.0.assigned_to.id', $manager->id);
});

test('staff queue history cursor returns terminal tickets updated after its check', function () {
    $customer = User::factory()->create(['role' => 'customer']);
    $manager = User::factory()->create(['role' => 'manager']);
    $oldTicket = SupportTicket::create([
        'customer_id' => $customer->id,
        'assigned_to_id' => $manager->id,
        'status' => 'resolved',
        'resolved_at' => now()->subMinutes(5),
    ]);
    DB::table('support_tickets')
        ->where('id', $oldTicket->id)
        ->update(['updated_at' => now()->subMinutes(5)]);

    Sanctum::actingAs($manager);

    $checkedAt = $this->getJson('/api/v1/support/queue?view=history')
        ->assertOk()
        ->json('data.checked_at');

    $newTicket = SupportTicket::create([
        'customer_id' => $customer->id,
        'assigned_to_id' => $manager->id,
        'status' => 'resolved',
        'resolved_at' => now(),
    ]);

    $response = $this->getJson(
        '/api/v1/support/queue?view=history&updated_after='.urlencode($checkedAt)
    )->assertOk();

    expect(collect($response->json('data.resolved'))->pluck('id')->all())
        ->toContain($newTicket->id)
        ->not->toContain($oldTicket->id);
});

test('message cursor returns only newer messages', function () {
    $customer = User::factory()->create(['role' => 'customer']);
    $ticket = SupportTicket::create([
        'customer_id' => $customer->id,
        'status' => 'active',
    ]);
    SupportMessage::create([
        'support_ticket_id' => $ticket->id,
        'sender_id' => $customer->id,
        'message' => 'First message',
    ]);
    $second = SupportMessage::create([
        'support_ticket_id' => $ticket->id,
        'sender_id' => $customer->id,
        'message' => 'Second message',
    ]);
    $third = SupportMessage::create([
        'support_ticket_id' => $ticket->id,
        'sender_id' => $customer->id,
        'message' => 'Third message',
    ]);

    Sanctum::actingAs($customer);

    $this->getJson("/api/v1/support/tickets/{$ticket->id}/messages?after_id={$second->id}")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $third->id)
        ->assertJsonPath('data.0.message', 'Third message');
});

test('customer cannot use the message cursor on another customer ticket', function () {
    $owner = User::factory()->create(['role' => 'customer']);
    $otherCustomer = User::factory()->create(['role' => 'customer']);
    $ticket = SupportTicket::create([
        'customer_id' => $owner->id,
        'status' => 'active',
    ]);

    Sanctum::actingAs($otherCustomer);

    $this->getJson("/api/v1/support/tickets/{$ticket->id}/messages?after_id=0")
        ->assertForbidden();
});

test('customer cannot create a second open support ticket', function () {
    $customer = User::factory()->create(['role' => 'customer']);
    Sanctum::actingAs($customer);

    $payload = [
        'category' => 'appointment_rescheduling',
        'message' => 'I need help with my appointment.',
    ];

    $this->postJson('/api/v1/support/tickets', $payload)->assertCreated();
    $this->postJson('/api/v1/support/tickets', $payload)
        ->assertUnprocessable()
        ->assertJsonPath('message', 'You already have an active or waiting ticket.');

    expect(SupportTicket::where('customer_id', $customer->id)->count())->toBe(1);
    expect(SupportMessage::count())->toBe(1);
});

test('only one staff member can claim a waiting ticket', function () {
    $customer = User::factory()->create(['role' => 'customer']);
    $firstManager = User::factory()->create(['role' => 'manager']);
    $secondManager = User::factory()->create(['role' => 'manager']);
    $ticket = SupportTicket::create([
        'customer_id' => $customer->id,
        'status' => 'waiting',
        'queued_at' => now(),
    ]);

    Sanctum::actingAs($firstManager);
    $this->postJson("/api/v1/support/tickets/{$ticket->id}/accept")->assertOk();

    Sanctum::actingAs($secondManager);
    $this->postJson("/api/v1/support/tickets/{$ticket->id}/accept")
        ->assertUnprocessable()
        ->assertJsonPath('message', 'Only waiting tickets can be accepted.');

    $ticket->refresh();
    expect($ticket->status)->toBe('active');
    expect($ticket->assigned_to_id)->toBe($firstManager->id);
    expect(SupportMessage::where('support_ticket_id', $ticket->id)->count())->toBe(1);
    expect(Notification::where('type', 'ticket_promoted')->where('user_id', $customer->id)->count())->toBe(1);
});

test('staff with an active ticket cannot claim another waiting ticket', function () {
    $firstCustomer = User::factory()->create(['role' => 'customer']);
    $secondCustomer = User::factory()->create(['role' => 'customer']);
    $manager = User::factory()->create(['role' => 'manager']);
    $firstTicket = SupportTicket::create([
        'customer_id' => $firstCustomer->id,
        'status' => 'waiting',
    ]);
    $secondTicket = SupportTicket::create([
        'customer_id' => $secondCustomer->id,
        'status' => 'waiting',
    ]);
    Sanctum::actingAs($manager);

    $this->postJson("/api/v1/support/tickets/{$firstTicket->id}/accept")->assertOk();
    $this->postJson("/api/v1/support/tickets/{$secondTicket->id}/accept")
        ->assertUnprocessable()
        ->assertJsonPath('message', 'You already have an active ticket. Resolve it first.');

    expect($secondTicket->fresh()->status)->toBe('waiting');
    expect($secondTicket->fresh()->assigned_to_id)->toBeNull();
});
