<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AppointmentResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,

            'customer' => [
                'id' => $this->is_walkin ? null : $this->user?->id,
                'fullname' => $this->resource->customerDisplayName(),
                'email' => $this->is_walkin ? null : $this->user?->email,
                'contact_number' => $this->is_walkin
                    ? ($this->walkin_customer_contact_number ?? $this->user?->contact_number)
                    : $this->user?->contact_number,
            ],

            'barber' => [
                'id' => $this->barber?->id,
                'fullname' => $this->barber_name_snapshot ?? $this->barber?->fullname,
                'email' => $this->barber?->email,
                'contact_number' => $this->barber?->contact_number,
            ],

            'service' => [
                'id' => $this->service?->id,
                'name' => $this->service_name_snapshot ?? $this->service?->name,
            ],

            'feedback' => $this->whenLoaded('feedback', fn () => [
                'id' => $this->feedback?->id,
                'rating' => $this->feedback?->rating,
                'comment' => $this->feedback?->comment,
                'submitted_at' => $this->feedback?->created_at,
            ]),

            'appointment_date' => $this->appointment_date,
            'appointment_time' => $this->appointment_time,
            'duration_minutes' => $this->duration_minutes,

            'price' => $this->price,
            'status' => $this->status,
            'is_walkin' => (bool) $this->is_walkin,
            'batch_id' => $this->batch_id,
            'customer_name' => $this->customer_name,
            'customer_name_snapshot' => $this->customer_name_snapshot,
            'service_name_snapshot' => $this->service_name_snapshot,
            'barber_name_snapshot' => $this->barber_name_snapshot,

            'notes' => $this->notes,
            'cancellation_reason' => $this->cancellation_reason,

            'approved_at' => $this->approved_at,
            'completed_at' => $this->completed_at,
            'cancelled_at' => $this->cancelled_at,
            'rejected_at' => $this->rejected_at,

            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
