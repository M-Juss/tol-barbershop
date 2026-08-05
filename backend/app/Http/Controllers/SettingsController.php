<?php

namespace App\Http\Controllers;

use App\Traits\ApiResponseTrait;

class SettingsController extends Controller
{
    use ApiResponseTrait;

    public function publicBookingSettings()
    {
        try {
            return $this->success('Booking settings retrieved successfully', [
                'opening_time' => '09:00',
                'closing_time' => '19:00',
                'slot_interval_minutes' => 60,
                'max_slots_per_booking' => 11,
            ])->withHeaders([
                'Cache-Control' => 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
            ]);
        } catch (\Exception $e) {
            return $this->error('Could not fetch booking settings', [], 500);
        }
    }
}
