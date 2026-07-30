<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClosedDatesResource extends JsonResource
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
            'date_closed' => $this->date_closed,
            'closure_scope' => $this->closure_scope,
            'barber_user_id' => $this->barber_user_id,
            'barber_name' => $this->barber_name_snapshot,
            $this->mergeWhen(
                in_array($request->user()?->role, ['admin', 'manager'], true),
                ['reason' => $this->reason],
            ),
            'is_removed' => $this->is_removed,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
