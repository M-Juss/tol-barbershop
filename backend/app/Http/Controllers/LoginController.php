<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Resources\UserResource;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class LoginController extends Controller
{
    use ApiResponseTrait;

    public function unauthenticated(): JsonResponse
    {
        return response()->json(['message' => 'Unauthenticated'], 401);
    }

    public function login(LoginRequest $request)
    {
        try {
            $request->authenticate();

            $user = Auth::user();

            if (! $user) {
                return $this->error('Authentication failed.', [], 401);
            }

            if (! $user->is_active) {
                $this->forceLogout($request);

                return response()->json([
                    'success' => false,
                    'message' => 'This account has been disabled. Contact the barbershop for assistance.',
                    'code' => 'ACCOUNT_DISABLED',
                ], 403);
            }

            if (! in_array($user->role, ['admin', 'manager', 'customer'], true)) {
                $this->forceLogout($request);

                return $this->error('This role does not have application access.', [], 403);
            }

            if ($user->role === 'customer' && ! $user->hasVerifiedEmail()) {
                $this->forceLogout($request);

                return response()->json([
                    'success' => false,
                    'message' => 'Please verify your email address before logging in.',
                    'code' => 'EMAIL_UNVERIFIED',
                ], 403);
            }

            Auth::guard('web')->login($user);
            $request->session()->regenerate();

            return $this->success('Login successful', [
                'user' => new UserResource($user),
            ]);
        } catch (ValidationException $e) {
            $errors = $e->errors();
            $emailError = $errors['email'][0] ?? '';

            if (str_contains($emailError, 'Too many login attempts')) {
                return $this->error('Too many login attempts. Please try again later.', $errors, 429);
            }

            if ($emailError === LoginRequest::DEACTIVATED_ACCOUNT_MESSAGE) {
                return response()->json([
                    'success' => false,
                    'message' => LoginRequest::DEACTIVATED_ACCOUNT_MESSAGE,
                    'code' => 'ACCOUNT_DISABLED',
                ], 403);
            }

            return $this->error('Invalid email or password.', $errors, 401);
        } catch (\Exception $e) {
            return $this->error(
                'Something went wrong. Please try again.',
                [],
                500
            );
        }
    }

    private function forceLogout(LoginRequest $request): void
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
    }
}
