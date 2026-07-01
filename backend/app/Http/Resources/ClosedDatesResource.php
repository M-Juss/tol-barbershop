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
            'reason' => $this->reason,
            'is_removed' => $this->is_removed,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
