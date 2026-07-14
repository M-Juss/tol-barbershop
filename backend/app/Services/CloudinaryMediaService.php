<?php

namespace App\Services;

use Cloudinary\Cloudinary;
use Illuminate\Http\UploadedFile;
use RuntimeException;

class CloudinaryMediaService
{
    private Cloudinary $cloudinary;

    public function __construct()
    {
        $url = (string) config('services.cloudinary.url');

        if ($url === '') {
            throw new RuntimeException('Cloudinary is not configured.');
        }

        $this->cloudinary = new Cloudinary($url);
    }

    /**
     * @return array{image_url: string, public_id: string}
     */
    public function uploadGalleryImage(UploadedFile $image): array
    {
        $path = $image->getRealPath();

        if ($path === false) {
            throw new RuntimeException('The uploaded image could not be read.');
        }

        $result = $this->cloudinary->uploadApi()->upload($path, [
            'folder' => (string) config('services.cloudinary.folder'),
            'resource_type' => 'image',
            'unique_filename' => true,
            'use_filename' => false,
        ]);

        $imageUrl = $result['secure_url'] ?? null;
        $publicId = $result['public_id'] ?? null;

        if (! is_string($imageUrl) || ! is_string($publicId)) {
            throw new RuntimeException('Cloudinary returned an invalid upload response.');
        }

        return [
            'image_url' => $imageUrl,
            'public_id' => $publicId,
        ];
    }

    public function deleteImage(string $publicId): void
    {
        $result = $this->cloudinary->uploadApi()->destroy($publicId, [
            'resource_type' => 'image',
            'invalidate' => true,
        ]);

        $status = $result['result'] ?? null;

        if (! in_array($status, ['ok', 'not found'], true)) {
            throw new RuntimeException('Cloudinary could not delete the image.');
        }
    }
}
