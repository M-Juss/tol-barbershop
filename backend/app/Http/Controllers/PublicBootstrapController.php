<?php

namespace App\Http\Controllers;

use App\Http\Resources\AppointmentFeedbackResource;
use App\Http\Resources\GalleryImageResource;
use App\Http\Resources\ServiceResource;
use App\Models\AppointmentFeedback;
use App\Models\GalleryImage;
use App\Models\Service;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;

class PublicBootstrapController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(): JsonResponse
    {
        $featuredFeedback = AppointmentFeedback::query()
            ->with(['user:id,fullname', 'appointment.service:id,name', 'appointment.barber:id,fullname'])
            ->where('is_featured', true)
            ->latest()
            ->limit(5)
            ->get();

        $feedback = $featuredFeedback->isEmpty()
            ? AppointmentFeedback::query()
                ->with(['user:id,fullname', 'appointment.service:id,name', 'appointment.barber:id,fullname'])
                ->where('rating', 5)
                ->whereNotNull('comment')
                ->where('comment', '<>', '')
                ->latest()
                ->limit(10)
                ->get()
            : collect();

        return $this->success('Public content retrieved', [
            'services' => ServiceResource::collection(
                Service::query()->where('is_active', true)->get(),
            ),
            'gallery_images' => GalleryImageResource::collection(
                GalleryImage::query()
                    ->orderBy('category')
                    ->orderBy('display_order')
                    ->orderBy('id')
                    ->get(),
            ),
            'featured_feedback' => AppointmentFeedbackResource::collection($featuredFeedback),
            'feedback' => AppointmentFeedbackResource::collection($feedback),
        ])->withHeaders([
            'Cache-Control' => 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
        ]);
    }
}
