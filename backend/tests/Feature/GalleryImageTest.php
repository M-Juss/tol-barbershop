<?php

use App\Models\GalleryImage;
use App\Models\User;
use App\Services\CloudinaryMediaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function galleryUser(string $role): User
{
    return User::factory()->create(['role' => $role]);
}

function galleryImage(array $overrides = []): GalleryImage
{
    return GalleryImage::create(array_merge([
        'category' => 'interior',
        'image_url' => 'https://res.cloudinary.com/demo/image/upload/interior.jpg',
        'cloudinary_public_id' => 'tol-barbershop/landing-gallery/interior',
        'alt_text' => 'Interior of TOL Barbershop',
        'display_order' => 1,
    ], $overrides));
}

test('public gallery images are ordered and do not expose cloudinary public ids', function () {
    $later = galleryImage([
        'image_url' => 'https://res.cloudinary.com/demo/image/upload/later.jpg',
        'cloudinary_public_id' => 'tol-barbershop/landing-gallery/later',
        'display_order' => 2,
    ]);
    $first = galleryImage([
        'image_url' => 'https://res.cloudinary.com/demo/image/upload/first.jpg',
        'cloudinary_public_id' => 'tol-barbershop/landing-gallery/first',
        'display_order' => 1,
    ]);

    $this->getJson('/api/v1/public-gallery-images')
        ->assertOk()
        ->assertJsonPath('data.gallery_images.0.id', $first->id)
        ->assertJsonPath('data.gallery_images.1.id', $later->id)
        ->assertJsonMissing(['cloudinary_public_id' => $first->cloudinary_public_id]);
});

test('admins and managers can upload gallery images', function (string $role) {
    Sanctum::actingAs(galleryUser($role));

    $media = Mockery::mock(CloudinaryMediaService::class);
    $media->shouldReceive('uploadGalleryImage')->once()->andReturn([
        'image_url' => 'https://res.cloudinary.com/demo/image/upload/new.jpg',
        'public_id' => 'tol-barbershop/landing-gallery/new',
    ]);
    $this->app->instance(CloudinaryMediaService::class, $media);

    $this->post('/api/v1/gallery-images', [
        'image' => UploadedFile::fake()->image('gallery.jpg', 1200, 900),
        'category' => 'services',
        'alt_text' => 'A barber providing a haircut',
        'display_order' => 3,
    ])
        ->assertCreated()
        ->assertJsonPath('data.gallery_image.category', 'services')
        ->assertJsonPath('data.gallery_image.display_order', 3);

    $this->assertDatabaseHas('gallery_images', [
        'category' => 'services',
        'cloudinary_public_id' => 'tol-barbershop/landing-gallery/new',
        'alt_text' => 'A barber providing a haircut',
        'display_order' => 3,
    ]);
})->with(['admin', 'manager']);

test('customers cannot manage gallery images', function () {
    Sanctum::actingAs(galleryUser('customer'));

    $this->getJson('/api/v1/gallery-images')->assertForbidden();
    $this->postJson('/api/v1/gallery-images', [
        'category' => 'services',
        'alt_text' => 'A barber providing a haircut',
        'display_order' => 1,
    ])->assertForbidden();
});

test('gallery upload validation matches supported fields and files', function () {
    Sanctum::actingAs(galleryUser('manager'));

    $this->postJson('/api/v1/gallery-images', [
        'category' => 'invalid',
        'alt_text' => '',
        'display_order' => -1,
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['image', 'category', 'alt_text', 'display_order']);
});

test('gallery image metadata can be updated without replacing the asset', function () {
    Sanctum::actingAs(galleryUser('admin'));
    $galleryImage = galleryImage();

    $media = Mockery::mock(CloudinaryMediaService::class);
    $media->shouldNotReceive('uploadGalleryImage');
    $media->shouldNotReceive('deleteImage');
    $this->app->instance(CloudinaryMediaService::class, $media);

    $this->putJson("/api/v1/gallery-images/{$galleryImage->id}", [
        'category' => 'tools',
        'alt_text' => 'Professional barber tools',
        'display_order' => 4,
    ])
        ->assertOk()
        ->assertJsonPath('data.gallery_image.category', 'tools')
        ->assertJsonPath('data.gallery_image.alt_text', 'Professional barber tools');

    $this->assertDatabaseHas('gallery_images', [
        'id' => $galleryImage->id,
        'category' => 'tools',
        'cloudinary_public_id' => $galleryImage->cloudinary_public_id,
        'display_order' => 4,
    ]);
});

test('replacing a gallery image deletes the previous cloudinary asset after updating', function () {
    Sanctum::actingAs(galleryUser('manager'));
    $galleryImage = galleryImage();

    $media = Mockery::mock(CloudinaryMediaService::class);
    $media->shouldReceive('uploadGalleryImage')->once()->andReturn([
        'image_url' => 'https://res.cloudinary.com/demo/image/upload/replacement.jpg',
        'public_id' => 'tol-barbershop/landing-gallery/replacement',
    ]);
    $media->shouldReceive('deleteImage')
        ->once()
        ->with('tol-barbershop/landing-gallery/interior');
    $this->app->instance(CloudinaryMediaService::class, $media);

    $this->post("/api/v1/gallery-images/{$galleryImage->id}", [
        '_method' => 'PUT',
        'image' => UploadedFile::fake()->image('replacement.webp', 1200, 900),
        'category' => 'interior',
        'alt_text' => 'Updated barbershop interior',
        'display_order' => 2,
    ])->assertOk();

    $this->assertDatabaseHas('gallery_images', [
        'id' => $galleryImage->id,
        'cloudinary_public_id' => 'tol-barbershop/landing-gallery/replacement',
        'image_url' => 'https://res.cloudinary.com/demo/image/upload/replacement.jpg',
    ]);
});

test('deleting a gallery image removes its cloudinary asset and database record', function () {
    Sanctum::actingAs(galleryUser('admin'));
    $galleryImage = galleryImage();

    $media = Mockery::mock(CloudinaryMediaService::class);
    $media->shouldReceive('deleteImage')
        ->once()
        ->with($galleryImage->cloudinary_public_id);
    $this->app->instance(CloudinaryMediaService::class, $media);

    $this->deleteJson("/api/v1/gallery-images/{$galleryImage->id}")
        ->assertOk();

    $this->assertDatabaseMissing('gallery_images', ['id' => $galleryImage->id]);
});
