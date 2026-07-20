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
        $staff = [
            'id' => $this->id,
            'image' => null,
            'fullname' => $this->fullname,
            'role' => $this->role,
            'is_active' => $this->is_active,
            'role_id' => $this->role_id,
            'role_name' => $this->roleModel?->name,
        ];

        if (in_array($request->user()?->role, ['admin', 'manager'], true)) {
            $staff['contact_number'] = $this->contact_number;
            $staff['email'] = $this->email;
        }

        return $staff;
    }
}
