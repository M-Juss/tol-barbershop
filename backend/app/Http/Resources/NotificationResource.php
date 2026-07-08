<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'type' => $this->type,
            'title' => $this->title,
            'message' => $this->message,
            'payload' => $this->payload,
            'appointment_id' => $this->appointment_id,
            'service_name' => $this->service_name,
            'barber_name' => $this->barber_name,
            'appointment_date' => $this->appointment_date,
            'appointment_time' => $this->appointment_time,
            'price' => $this->price,
            'is_read' => (bool) $this->is_read,
            'read_at' => $this->read_at,
            'created_by_user_id' => $this->created_by_user_id,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
