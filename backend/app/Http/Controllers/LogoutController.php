<?php

namespace App\Http\Controllers;

use App\Models\PushSubscription;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LogoutController extends Controller
{
    use ApiResponseTrait;

    public function logout(Request $request)
    {
        $validated = $request->validate([
            'push_endpoint' => ['nullable', 'string', 'max:500'],
        ]);

        if (! empty($validated['push_endpoint'])) {
            PushSubscription::where('user_id', $request->user()->id)
                ->where('endpoint', $validated['push_endpoint'])
                ->delete();
        }

        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return $this->noData('Logged out successfully');
    }
}
