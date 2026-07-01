<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StaffResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'image' => $this->image,
            'fullname' => $this->fullname,
            'contact_number' => $this->contact_number,
            'email' => $this->email,
            'role' => $this->role,
            'is_active' => $this->is_active,
            'role_id' => $this->role_id,
            'role_name' => $this->roleModel?->name,
        ];
    }
}
