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
            $totalWalkins = Appointment::withTrashed()->where('is_walkin', true)->count();

            return $this->success('Walk-in stats retrieved successfully.', [
                'total_walkins' => $totalWalkins,
            ]);
        } catch (\Exception $e) {
            return $this->error('Failed to retrieve walk-in stats.', [], 500);
        }
    }
}
