<?php

namespace App\Http\Controllers;

use App\Http\Requests\RegisterRequest;
use App\Models\User;
use App\Traits\ApiResponseTrait;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use LogicException;
use Throwable;

class RegisterController extends Controller
{
    use ApiResponseTrait;

    public function register(RegisterRequest $request)
    {
        $termsVersion = trim((string) config('legal.terms.version'));
        $privacyVersion = trim((string) config('legal.privacy.version'));

        if ($termsVersion === '' || $privacyVersion === '') {
            throw new LogicException('Registration policy versions are not configured.');
        }

        $userAttributes = $request->safe()->except([
            'terms_accepted',
            'privacy_acknowledged',
        ]);
        $userAttributes['password'] = Hash::make($userAttributes['password']);
        $acceptedAt = now();

        try {
            $registration = DB::transaction(function () use ($userAttributes, $termsVersion, $privacyVersion, $acceptedAt): array {
                $existingUser = User::withTrashed()
                    ->where('email', $userAttributes['email'])
                    ->lockForUpdate()
                    ->first(['id', 'deleted_at']);

                if ($existingUser) {
                    return [
                        'user' => null,
                        'deactivated' => $existingUser->trashed(),
                    ];
                }

                $user = User::create($userAttributes);
                $user->policyAcceptances()->create([
                    'terms_version' => $termsVersion,
                    'privacy_version' => $privacyVersion,
                    'accepted_at' => $acceptedAt,
                ]);

                return [
                    'user' => $user,
                    'deactivated' => false,
                ];
            });
        } catch (UniqueConstraintViolationException) {
            $registration = [
                'user' => null,
                'deactivated' => User::withTrashed()
                    ->where('email', $userAttributes['email'])
                    ->whereNotNull('deleted_at')
                    ->exists(),
            ];
        }

        $user = $registration['user'];
        if ($registration['deactivated']) {
            return $this->error(
                'This email belongs to a deactivated account and cannot be used again.',
                ['email' => ['This email belongs to a deactivated account and cannot be used again.']],
                422,
            );
        }

        if ($user) {
            defer(function () use ($user): void {
                try {
                    $user->sendEmailVerificationNotification();
                } catch (Throwable $exception) {
                    report($exception);
                }
            });
        }

        return $this->success(
            'If registration can be completed, check your inbox for a verification email.',
            ['email' => $userAttributes['email']],
            201,
        );

    }
}
