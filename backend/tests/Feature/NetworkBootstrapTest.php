<?php

use App\Models\GalleryImage;
use App\Models\Notification;
use App\Models\Service;
use App\Models\SupportTicket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('customer navigation summary returns notification and support badge data', function () {
    $customer = User::factory()->create(['role' => 'customer']);
    $ticket = SupportTicket::create([
        'customer_id' => $customer->id,
        'status' => 'waiting',
    ]);
    Notification::create([
        'user_id' => $customer->id,
        'type' => 'test',
        'title' => 'Unread',
        'message' => 'Unread notification',
        'is_read' => false,
    ]);
    Notification::create([
        'user_id' => $customer->id,
        'type' => 'test',
        'title' => 'Read',
        'message' => 'Read notification',
        'is_read' => true,
    ]);

    Sanctum::actingAs($customer);

    $this->getJson('/api/v1/navigation-summary')
        ->assertOk()
        ->assertJsonPath('data.unread_notifications', 1)
        ->assertJsonPath('data.support_ticket.id', $ticket->id)
        ->assertJsonPath('data.support_ticket.status', 'waiting')
        ->assertJsonPath('data.pending_appointments', null)
        ->assertJsonPath('data.waiting_support_tickets', null);
});

test('manager navigation summary returns staff badge data', function () {
    $customer = User::factory()->create(['role' => 'customer']);
    $manager = User::factory()->create(['role' => 'manager']);
    SupportTicket::create([
        'customer_id' => $customer->id,
        'status' => 'waiting',
    ]);

    Sanctum::actingAs($manager);

    $this->getJson('/api/v1/navigation-summary')
        ->assertOk()
        ->assertJsonPath('data.unread_notifications', null)
        ->assertJsonPath('data.support_ticket', null)
        ->assertJsonPath('data.pending_appointments', 0)
        ->assertJsonPath('data.waiting_support_tickets', 1);
});

test('public bootstrap consolidates landing content with short shared caching', function () {
    $service = Service::create([
        'name' => 'Haircut',
        'description' => 'Classic haircut',
        'duration' => 60,
        'price' => 250,
        'is_active' => true,
    ]);
    $galleryImage = GalleryImage::create([
        'category' => 'interior',
        'image_url' => 'https://res.cloudinary.com/demo/image/upload/interior.jpg',
        'cloudinary_public_id' => 'tol/interior',
        'alt_text' => 'Barbershop interior',
        'display_order' => 1,
    ]);

    $this->getJson('/api/v1/public-bootstrap')
        ->assertOk()
        ->assertHeader(
            'Cache-Control',
            'max-age=300, public, s-maxage=300, stale-while-revalidate=600',
        )
        ->assertJsonPath('data.services.0.id', $service->id)
        ->assertJsonPath('data.gallery_images.0.id', $galleryImage->id)
        ->assertJsonStructure([
            'data' => [
                'services',
                'gallery_images',
                'featured_feedback',
                'feedback',
            ],
        ]);
});
