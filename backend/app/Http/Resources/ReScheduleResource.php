<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReScheduleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'appointment_id' => $this->appointment_id,
            'customer_user_id' => $this->customer_user_id,
            'customer_name' => $this->customer?->fullname,
            'service_id' => $this->service_id,
            'service_name' => $this->service?->name,
            'barber_user_id' => $this->barber_user_id,
            'barber_name' => $this->barber?->fullname,
            'appointment_date' => $this->appointment_date,
            'appointment_time' => $this->appointment_time,
            'duration_minutes' => $this->duration_minutes,
            'price' => (float) $this->price,
            'notes' => $this->notes,
            'reason' => $this->reason,
            'decision' => $this->decision,
            'created_by_user_id' => $this->created_by_user_id,
            'created_by_role' => $this->created_by_role,
            'responded_at' => $this->responded_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
