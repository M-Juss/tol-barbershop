<?php

namespace App\Http\Controllers;

use App\Http\Requests\GalleryImageRequest;
use App\Http\Resources\GalleryImageResource;
use App\Models\GalleryImage;
use App\Services\CloudinaryMediaService;
use App\Support\EntityChange;
use App\Traits\ApiResponseTrait;
use Illuminate\Support\Facades\Log;
use Throwable;

class GalleryImageController extends Controller
{
    use ApiResponseTrait;

    public function publicIndex()
    {
        try {
            $images = GalleryImage::query()
                ->orderBy('category')
                ->orderBy('display_order')
                ->orderBy('id')
                ->get();

            return $this->success('Public gallery images retrieved successfully', [
                'gallery_images' => GalleryImageResource::collection($images),
            ]);
        } catch (Throwable $e) {
            Log::error('Could not fetch public gallery images', ['exception' => $e]);

            return $this->error('Could not fetch public gallery images', [], 500);
        }
    }

    public function index()
    {
        try {
            $images = GalleryImage::query()
                ->orderBy('category')
                ->orderBy('display_order')
                ->orderBy('id')
                ->get();

            return $this->success('Gallery images retrieved successfully', [
                'gallery_images' => GalleryImageResource::collection($images),
            ]);
        } catch (Throwable $e) {
            Log::error('Could not fetch gallery images', ['exception' => $e]);

            return $this->error('Could not fetch gallery images', [], 500);
        }
    }

    public function store(GalleryImageRequest $request, CloudinaryMediaService $media)
    {
        $uploaded = null;

        try {
            $validated = $request->validated();
            $uploaded = $media->uploadGalleryImage($request->file('image'));

            $galleryImage = GalleryImage::create([
                'category' => $validated['category'],
                'image_url' => $uploaded['image_url'],
                'cloudinary_public_id' => $uploaded['public_id'],
                'alt_text' => $validated['alt_text'],
                'display_order' => $validated['display_order'],
            ]);

            EntityChange::dispatch('gallery_images');

            return $this->created('Gallery image created successfully', [
                'gallery_image' => new GalleryImageResource($galleryImage),
            ]);
        } catch (Throwable $e) {
            if ($uploaded !== null) {
                try {
                    $media->deleteImage($uploaded['public_id']);
                } catch (Throwable $cleanupException) {
                    Log::warning('Could not clean up failed gallery upload', [
                        'public_id' => $uploaded['public_id'],
                        'exception' => $cleanupException,
                    ]);
                }
            }

            Log::error('Could not create gallery image', ['exception' => $e]);

            return $this->error('Could not create gallery image', [], 500);
        }
    }

    public function update(
        GalleryImageRequest $request,
        GalleryImage $galleryImage,
        CloudinaryMediaService $media
    ) {
        $uploaded = null;
        $oldPublicId = $galleryImage->cloudinary_public_id;

        try {
            $validated = $request->validated();

            if ($request->hasFile('image')) {
                $uploaded = $media->uploadGalleryImage($request->file('image'));
            }

            $galleryImage->update([
                'category' => $validated['category'],
                'image_url' => $uploaded['image_url'] ?? $galleryImage->image_url,
                'cloudinary_public_id' => $uploaded['public_id'] ?? $oldPublicId,
                'alt_text' => $validated['alt_text'],
                'display_order' => $validated['display_order'],
            ]);
        } catch (Throwable $e) {
            if ($uploaded !== null) {
                try {
                    $media->deleteImage($uploaded['public_id']);
                } catch (Throwable $cleanupException) {
                    Log::warning('Could not clean up failed gallery replacement', [
                        'public_id' => $uploaded['public_id'],
                        'exception' => $cleanupException,
                    ]);
                }
            }

            Log::error('Could not update gallery image', ['exception' => $e]);

            return $this->error('Could not update gallery image', [], 500);
        }

        if ($uploaded !== null) {
            try {
                $media->deleteImage($oldPublicId);
            } catch (Throwable $e) {
                Log::warning('Could not delete replaced gallery image', [
                    'public_id' => $oldPublicId,
                    'exception' => $e,
                ]);
            }
        }

        EntityChange::dispatch('gallery_images');

        return $this->success('Gallery image updated successfully', [
            'gallery_image' => new GalleryImageResource($galleryImage->fresh()),
        ]);
    }

    public function destroy(GalleryImage $galleryImage, CloudinaryMediaService $media)
    {
        try {
            $media->deleteImage($galleryImage->cloudinary_public_id);
            $galleryImage->delete();
            EntityChange::dispatch('gallery_images');

            return $this->success('Gallery image deleted successfully');
        } catch (Throwable $e) {
            Log::error('Could not delete gallery image', ['exception' => $e]);

            return $this->error('Could not delete gallery image', [], 500);
        }
    }
}
