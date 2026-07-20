<?php

namespace App\Http\Controllers;

use App\Http\Requests\ChangeRegistrationEmailRequest;
use App\Http\Requests\ResendEmailVerificationRequest;
use App\Models\User;
use App\Traits\ApiResponseTrait;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Throwable;

class EmailVerificationController extends Controller
{
    use ApiResponseTrait;

    public function checkStatus(Request $request): JsonResponse
    {
        $email = $request->query('email');

        if (! $email || ! is_string($email)) {
            return $this->error('Email is required.', [], 422);
        }

        $user = User::query()
            ->where('email', $email)
            ->where('role', 'customer')
            ->first();

        if (! $user) {
            return $this->success('If an account exists for that email, it is not yet verified.', [
                'verified' => false,
            ]);
        }

        return $this->success('Verification status retrieved.', [
            'verified' => $user->hasVerifiedEmail(),
        ]);
    }

    public function show(Request $request): RedirectResponse
    {
        if (! $request->hasValidSignature(absolute: false)) {
            return $this->invalidVerificationRedirect();
        }

        $user = User::query()->find($request->route('id'));

        if (! $user
            || $user->role !== 'customer'
            || ! hash_equals((string) $request->route('hash'), sha1($user->getEmailForVerification()))) {
            return $this->invalidVerificationRedirect();
        }

        $frontendUrl = rtrim((string) config('app.frontend_url'), '/')
            .'/verify-email?'.http_build_query(['email' => $user->email])
            .'#'.http_build_query(['verification' => $request->getRequestUri()]);

        return redirect()->away($frontendUrl);
    }

    public function verify(Request $request): JsonResponse
    {
        if (! $request->hasValidSignature(absolute: false)) {
            return $this->error('This verification link is invalid or expired.', [], 422);
        }

        $result = DB::transaction(function () use ($request): array {
            $user = User::query()
                ->whereKey($request->route('id'))
                ->lockForUpdate()
                ->first();

            if (! $user
                || $user->role !== 'customer'
                || ! hash_equals((string) $request->route('hash'), sha1($user->getEmailForVerification()))) {
                return ['status' => 'invalid'];
            }

            if ($user->hasVerifiedEmail()) {
                return ['status' => 'already_verified'];
            }

            if (! $user->markEmailAsVerified()) {
                return ['status' => 'invalid'];
            }

            return ['status' => 'verified', 'user' => $user];
        });

        if ($result['status'] === 'invalid') {
            return $this->error('This verification link is invalid or expired.', [], 422);
        }

        if ($result['status'] === 'already_verified') {
            return $this->success('This email address is already verified.', [
                'status' => 'already_verified',
            ]);
        }

        event(new Verified($result['user']));

        return $this->success('Email address verified successfully.', [
            'status' => 'verified',
        ]);
    }

    public function resend(ResendEmailVerificationRequest $request): JsonResponse
    {
        $email = $request->validated('email');
        $throttleKey = 'verification-resend:'.hash('sha256', $email);

        if (! Cache::add($throttleKey, true, 60)) {
            return $this->verificationResendResponse();
        }

        try {
            $user = User::query()
                ->where('email', $email)
                ->where('role', 'customer')
                ->first();

            if ($user && ! $user->hasVerifiedEmail()) {
                $user->sendEmailVerificationNotification();
            }
        } catch (Throwable $exception) {
            report($exception);
        }

        return $this->verificationResendResponse();
    }

    public function changeRegistrationEmail(ChangeRegistrationEmailRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $throttleKey = 'change-registration-email:'.hash(
            'sha256',
            $validated['current_email'].'|'.$request->ip(),
        );

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            return $this->credentialRateLimitResponse($throttleKey);
        }

        $result = DB::transaction(function () use ($validated): array {
            $user = User::query()
                ->where('email', $validated['current_email'])
                ->lockForUpdate()
                ->first();
            $passwordMatches = Hash::check(
                $validated['password'],
                $user?->password ?? '$2y$12$usesomesillystringfore7hnbRJHxXVLeakoG8K30oukPsA.ztMG',
            );

            if (! $user
                || ! $passwordMatches
                || $user->role !== 'customer'
                || ! $user->is_active
                || $user->hasVerifiedEmail()) {
                return ['status' => 'invalid_credentials'];
            }

            if (User::withTrashed()
                ->where('email', $validated['new_email'])
                ->lockForUpdate()
                ->exists()) {
                return ['status' => 'duplicate_email'];
            }

            $user->forceFill([
                'email' => $validated['new_email'],
                'email_verified_at' => null,
            ])->save();

            return ['status' => 'updated', 'user' => $user];
        });

        if ($result['status'] === 'invalid_credentials') {
            RateLimiter::hit($throttleKey, 300);

            return $this->credentialErrorResponse();
        }

        RateLimiter::clear($throttleKey);

        if ($result['status'] === 'duplicate_email') {
            return $this->error(
                'The new email is unavailable.',
                ['new_email' => ['The new email has already been taken.']],
                422,
            );
        }

        $user = $result['user'];

        try {
            $user->sendEmailVerificationNotification();
        } catch (Throwable $exception) {
            report($exception);
        }

        return $this->success('Registration email changed successfully.', [
            'email' => $user->email,
        ]);
    }

    private function verificationResendResponse(): JsonResponse
    {
        return $this->success('If an unverified customer account exists for that email, a verification link has been sent.');
    }

    private function invalidVerificationRedirect(): RedirectResponse
    {
        return redirect()->away(rtrim((string) config('app.frontend_url'), '/').'/verify-email?status=invalid');
    }

    private function credentialErrorResponse(): JsonResponse
    {
        return $this->error(
            'The provided credentials are invalid.',
            ['current_email' => ['The provided credentials are invalid.']],
            422,
        );
    }

    private function credentialRateLimitResponse(string $throttleKey): JsonResponse
    {
        $seconds = RateLimiter::availableIn($throttleKey);

        return $this->error(
            'Too many attempts. Please try again later.',
            [],
            429,
        )->header('Retry-After', (string) $seconds);
    }
}
