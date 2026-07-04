<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

class CustomerResourceDetail extends JsonResource
{
    public function toArray(Request $request): array
    {
        $name = $this->fullname ?? 'Customer';
        $completed = (int) ($this->total_visits ?? 0);
        $noShow = (int) ($this->no_show_count ?? 0);
        $cancelled = (int) ($this->cancelled_count ?? 0);
        $terminal = $completed + $noShow + $cancelled;
        $noShowRate = $terminal > 0 ? round(($noShow / $terminal) * 100, 1) : 0;
        $cancellationRate = $terminal > 0 ? round(($cancelled / $terminal) * 100, 1) : 0;

        $servicePreferences = $this->relationLoaded('servicePreferences')
            ? $this->servicePreferences->map(fn ($item) => [
                'service_name' => $item->service_name,
                'count' => (int) $item->count,
                'percentage' => round(($item->count / max($completed, 1)) * 100),
            ])
            : [];

        $barberPreferences = $this->relationLoaded('barberPreferences')
            ? $this->barberPreferences->map(fn ($item) => [
                'barber_name' => $item->barber_name,
                'count' => (int) $item->count,
                'percentage' => round(($item->count / max($completed, 1)) * 100),
            ])
            : [];

        $recentAppointments = $this->relationLoaded('recentAppointments')
            ? $this->recentAppointments->map(fn ($appt) => [
                'id' => $appt->id,
                'appointment_date' => $appt->appointment_date?->format('M d, Y'),
                'appointment_time' => $appt->appointment_time,
                'service_name' => $appt->service?->name,
                'barber_name' => $appt->barber?->fullname,
                'price' => (float) $appt->price,
                'status' => $appt->status,
            ])
            : [];

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
            'completed_count' => $completed,
            'no_show_count' => $noShow,
            'cancelled_count' => $cancelled,
            'lifetime_value' => (float) ($this->lifetime_value ?? 0),
            'last_visit_date' => $this->last_visit_date,
            'average_rating' => $this->average_rating ? round((float) $this->average_rating, 1) : null,
            'registered_date' => $this->created_at?->format('M d, Y'),
            'no_show_rate' => $noShowRate,
            'cancellation_rate' => $cancellationRate,
            'service_preferences' => $servicePreferences,
            'barber_preferences' => $barberPreferences,
            'recent_appointments' => $recentAppointments,
        ];
    }
}
