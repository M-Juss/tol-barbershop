<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureModulePermission
{
    public function handle(Request $request, Closure $next, string ...$moduleKeys): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 401);
        }

        if ($user->role !== 'admin') {
            return $next($request);
        }

        $hasPermission = $moduleKeys !== []
            && $user->roleModel()
                ->whereHas('modules', fn ($query) => $query->whereIn('key', $moduleKeys))
                ->exists();

        if (! $hasPermission) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden: module permission is required.',
            ], 403);
        }

        return $next($request);
    }
}
