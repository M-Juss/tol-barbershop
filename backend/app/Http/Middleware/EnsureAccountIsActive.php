<?php

namespace App\Http\Middleware;

use App\Models\PushSubscription;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 401);
        }

        if ($user->is_active) {
            return $next($request);
        }

        DB::transaction(function () use ($user): void {
            PushSubscription::where('user_id', $user->id)->delete();
            $user->tokens()->delete();

            if (config('session.driver') === 'database') {
                DB::table((string) config('session.table', 'sessions'))
                    ->where('user_id', $user->id)
                    ->delete();
            }
        });

        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json([
            'success' => false,
            'message' => 'Account is disabled.',
            'code' => 'ACCOUNT_DISABLED',
        ], 403);
    }
}
