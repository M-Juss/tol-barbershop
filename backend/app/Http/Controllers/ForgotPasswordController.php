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

            // In-app flow: frontend will use this token in reset-password page.
            return $this->success('Password reset token generated successfully.', [
                'email' => $user->email,
                'token' => $token,
            ]);
        } catch (\Exception $e) {
            return $this->error('Failed to generate reset token.', [], 500);
        }
    }

    public function resetPassword(ResetPasswordRequest $request)
    {
        $validated = $request->validated();

        $status = Password::reset(
            [
                'email' => $validated['email'],
                'password' => $validated['password'],
                'password_confirmation' => $validated['password_confirmation'],
                'token' => $validated['token'],
            ],
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return $this->success('Password reset successfully.');
        }

        return $this->error('Invalid or expired reset token.', [], 422);
    }
}
