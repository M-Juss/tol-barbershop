<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

class CustomerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $name = $this->fullname ?? 'Customer';

        $isActive = $this->last_visit_date
            ? now()->diffInDays($this->last_visit_date) <= 60
            : true;

        return [
            'id' => $this->id,
            'fullname' => $this->fullname,
            'email' => $this->email,
            'contact_number' => $this->contact_number,
            'is_active' => $isActive,
            'initials' => Str::of($name)
                ->explode(' ')
                ->filter()
                ->map(fn (string $part) => Str::upper(Str::substr($part, 0, 1)))
                ->take(2)
                ->implode(''),
            'total_visits' => (int) ($this->total_visits ?? 0),
            'no_show_count' => (int) ($this->no_show_count ?? 0),
            'cancelled_count' => (int) ($this->cancelled_count ?? 0),
            'lifetime_value' => (float) ($this->lifetime_value ?? 0),
            'last_visit_date' => $this->last_visit_date,
            'average_rating' => $this->average_rating ? round((float) $this->average_rating, 1) : null,
            'registered_date' => $this->created_at?->format('M d, Y'),
        ];
    }
}
