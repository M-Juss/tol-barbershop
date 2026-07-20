<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $permissions = $this->role === 'admin' ? [] : null;

        if ($this->role === 'admin' && $this->roleModel) {
            $this->roleModel->load('modules');
            $permissions = $this->roleModel->modules->pluck('key')->toArray();
        }

        return [
            'id' => $this->id,
            'fullname' => $this->fullname,
            'contact_number' => $this->contact_number,
            'email' => $this->email,
            'role' => $this->role,
            'created_at' => $this->created_at,
            'permissions' => $permissions,
        ];
    }
}
