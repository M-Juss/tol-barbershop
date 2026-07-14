<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureCustomerEmailIsVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (
            $user?->role === 'customer'
            && ! $user->hasVerifiedEmail()
            && ! $request->is('api/v1/logout')
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Please verify your email address before continuing.',
                'code' => 'EMAIL_UNVERIFIED',
            ], 403);
        }

        return $next($request);
    }
}
