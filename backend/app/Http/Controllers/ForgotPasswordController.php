<?php

namespace App\Http\Controllers;

use App\Http\Requests\ForgotPasswordRequest;
use App\Http\Requests\ResetPasswordRequest;
use App\Http\Requests\ValidateResetPasswordTokenRequest;
use App\Models\User;
use App\Traits\ApiResponseTrait;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Throwable;

class ForgotPasswordController extends Controller
{
    use ApiResponseTrait;

    public function sendResetLink(ForgotPasswordRequest $request)
    {
        try {
            Password::sendResetLink([
                'email' => $request->validated('email'),
            ]);
        } catch (Throwable $exception) {
            report($exception);
        }

        return $this->success('If an account exists for that email, a password reset link has been sent.');
    }

    public function resetPassword(ResetPasswordRequest $request)
    {
        $validated = $request->validated();

        $status = DB::transaction(function () use ($validated): string {
            $token = DB::table((string) config('auth.passwords.users.table'))
                ->where('email', $validated['email'])
                ->lockForUpdate()
                ->first();

            if (! $token) {
                return Password::INVALID_TOKEN;
            }

            return Password::reset(
                [
                    'email' => $validated['email'],
                    'password' => $validated['password'],
                    'password_confirmation' => $validated['password_confirmation'],
                    'token' => $validated['token'],
                ],
                function (User $user, string $password): void {
                    $user->forceFill([
                        'password' => $password,
                        'remember_token' => Str::random(60),
                    ])->save();

                    if (config('session.driver') === 'database') {
                        DB::table((string) config('session.table', 'sessions'))
                            ->where('user_id', $user->getKey())
                            ->delete();
                    }

                    $user->tokens()->delete();

                    event(new PasswordReset($user));
                }
            );
        });

        if ($status === Password::PASSWORD_RESET) {
            return $this->success('Password reset successfully.');
        }

        return $this->error('Invalid or expired reset token.', [], 422);
    }

    public function validateToken(ValidateResetPasswordTokenRequest $request): JsonResponse
    {
        $validated = $request->validated();

        try {
            $user = User::query()->where('email', $validated['email'])->first();
            $tokenExists = DB::table((string) config('auth.passwords.users.table'))
                ->where('email', $validated['email'])
                ->exists();

            if (! $user || ! $tokenExists) {
                Hash::check(
                    $validated['token'],
                    '$2y$12$usesomesillystringfore7hnbRJHxXVLeakoG8K30oukPsA.ztMG',
                );
                $valid = false;
            } else {
                $valid = Password::broker()->tokenExists($user, $validated['token']);
            }
        } catch (Throwable $exception) {
            report($exception);
            $valid = false;
        }

        return $this->success('Reset token validation completed.', [
            'valid' => $valid,
        ]);
    }
}
