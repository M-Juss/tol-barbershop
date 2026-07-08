<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Traits\ApiResponseTrait;

class WalkinController extends Controller
{
    use ApiResponseTrait;

    public function stats()
    {
        try {
            $totalWalkins = Appointment::where('is_walkin', true)->count();
            $totalRevenue = (float) Appointment::where('is_walkin', true)
                ->where('status', 'completed')
                ->sum('price');

            return $this->success('Walk-in stats retrieved successfully.', [
                'total_walkins' => $totalWalkins,
                'total_revenue' => $totalRevenue,
            ]);
        } catch (\Exception $e) {
            return $this->error('Failed to retrieve walk-in stats.', [], 500);
        }
    }
}
