<?php

namespace App\Http\Controllers;

use App\Http\Requests\ForgotPasswordRequest;
use App\Http\Requests\ResetPasswordRequest;
use App\Models\User;
use App\Traits\ApiResponseTrait;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class ForgotPasswordController extends Controller
{
    use ApiResponseTrait;

    public function sendResetToken(ForgotPasswordRequest $request)
    {
        try {
            $user = User::where('email', $request->validated('email'))->firstOrFail();
            $token = Password::createToken($user);

            session([
                'password_reset_email' => $user->email,
                'password_reset_token' => $token,
            ]);

            return $this->success('Password reset token generated successfully.');
        } catch (\Exception $e) {
            return $this->error('Failed to generate reset token.', [], 500);
        }
    }

    public function resetPassword(ResetPasswordRequest $request)
    {
        $email = session('password_reset_email');
        $token = session('password_reset_token');

        if (!$email || !$token) {
            return $this->error('No reset session found. Please request a new reset token.', [], 422);
        }

        $status = Password::reset(
            [
                'email' => $email,
                'password' => $request->validated('password'),
                'password_confirmation' => $request->validated('password_confirmation'),
                'token' => $token,
            ],
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();
            }
        );

        session()->forget(['password_reset_email', 'password_reset_token']);

        if ($status === Password::PASSWORD_RESET) {
            return $this->success('Password reset successfully.');
        }

        return $this->error('Invalid or expired reset token.', [], 422);
    }
}
