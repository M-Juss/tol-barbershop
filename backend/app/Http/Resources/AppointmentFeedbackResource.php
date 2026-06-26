<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

class AppointmentFeedbackResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $customerName = $this->user?->fullname ?? 'Customer';

        return [
            'id' => $this->id,
            'appointment_id' => $this->appointment_id,
            'rating' => $this->rating,
            'comment' => $this->comment,
            'customer_name' => $customerName,
            'customer_initials' => Str::of($customerName)
                ->explode(' ')
                ->filter()
                ->map(fn (string $part) => Str::upper(Str::substr($part, 0, 1)))
                ->take(2)
                ->implode(''),
            'service_name' => $this->appointment?->service?->name,
            'submitted_at' => $this->created_at,
        ];
    }
}
