<?php

namespace App\Http\Controllers;

use App\Http\Requests\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Traits\ApiResponseTrait;
use Illuminate\Support\Facades\DB;
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
        $acceptedAt = now();

        $user = DB::transaction(function () use ($userAttributes, $termsVersion, $privacyVersion, $acceptedAt): User {
            $user = User::create($userAttributes);
            $user->policyAcceptances()->create([
                'terms_version' => $termsVersion,
                'privacy_version' => $privacyVersion,
                'accepted_at' => $acceptedAt,
            ]);

            return $user;
        });

        try {
            $user->sendEmailVerificationNotification();
        } catch (Throwable $exception) {
            report($exception);
        }

        return $this->success('User registered successfully', new UserResource($user), 201);

    }
}
