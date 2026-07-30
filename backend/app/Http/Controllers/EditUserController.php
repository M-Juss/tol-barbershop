<?php

namespace App\Http\Controllers;

use App\Http\Requests\ChangeInformationRequest;
use App\Http\Requests\ChangePasswordRequest;
use App\Http\Requests\DeleteAccountRequest;
use App\Http\Resources\UserResource;
use App\Models\Appointment;
use App\Models\PushSubscription;
use App\Models\User;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;
use Throwable;

class EditUserController extends Controller
{
    use ApiResponseTrait;

    public function currentUser(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return $this->error('Not authenticated.', [], 401);
        }

        return $this->success('User retrieved successfully.', new UserResource($user));
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validated();
        $currentAccessToken = $user->currentAccessToken();
        $currentSessionId = $request->hasSession() ? $request->session()->getId() : null;

        DB::transaction(function () use ($currentAccessToken, $currentSessionId, $user, $validated): void {
            $user->forceFill([
                'password' => $validated['password'],
                'remember_token' => Str::random(60),
            ])->save();

            $tokens = $user->tokens();
            if ($currentAccessToken instanceof PersonalAccessToken) {
                $tokens->whereKeyNot($currentAccessToken->getKey());
            }
            $tokens->delete();

            if (config('session.driver') === 'database') {
                $sessions = DB::table((string) config('session.table', 'sessions'))
                    ->where('user_id', $user->id);

                if ($currentSessionId) {
                    $sessions->where('id', '!=', $currentSessionId);
                }

                $sessions->delete();
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Password updated successfully.',
            'data' => null,
        ]);
    }

    public function destroy(DeleteAccountRequest $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return $this->error('Not authenticated.', [], 401);
        }

        DB::transaction(function () use ($user): void {
            $lockedUser = User::whereKey($user->id)
                ->lockForUpdate()
                ->firstOrFail();
            $activeAppointmentCount = Appointment::where('user_id', $lockedUser->id)
                ->where(function ($query): void {
                    $query
                        ->where('status', 'pending')
                        ->orWhere(function ($approvedQuery): void {
                            $approvedQuery
                                ->where('status', 'approved')
                                ->whereDate(
                                    'appointment_date',
                                    '>=',
                                    now((string) config('app.shop_timezone', 'Asia/Manila'))->toDateString(),
                                );
                        });
                })
                ->orderBy('id')
                ->lockForUpdate()
                ->get(['id'])
                ->count();

            if ($activeAppointmentCount > 0) {
                $appointmentLabel = $activeAppointmentCount === 1
                    ? 'appointment'
                    : 'appointments';

                throw ValidationException::withMessages([
                    'account' => "Resolve {$activeAppointmentCount} pending or current/upcoming approved {$appointmentLabel} before deactivating your account.",
                ]);
            }

            PushSubscription::where('user_id', $lockedUser->id)->delete();
            $lockedUser->tokens()->delete();
            DB::table('sessions')->where('user_id', $lockedUser->id)->delete();
            DB::table('password_reset_tokens')->where('email', $lockedUser->email)->delete();
            $lockedUser->delete();
        }, 3);

        Auth::guard('web')->logout();
        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json([
            'success' => true,
            'message' => 'Account deactivated successfully.',
        ]);
    }

    public function changeInformation(ChangeInformationRequest $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validated();
        $emailChanged = strcasecmp((string) $user->email, $validated['email']) !== 0;

        $updates = [
            'fullname' => $validated['fullname'],
            'email' => $validated['email'],
            'contact_number' => $validated['contact_number'],
        ];

        if ($emailChanged && $user->role === 'customer') {
            $updates['email_verified_at'] = null;
        }

        $user->forceFill($updates)->save();

        if ($emailChanged && $user->role === 'customer') {
            defer(function () use ($user): void {
                try {
                    $user->sendEmailVerificationNotification();
                } catch (Throwable $exception) {
                    report($exception);
                }
            });
        }

        return response()->json([
            'success' => true,
            'message' => 'Information updated successfully.',
            'data' => new UserResource($user),
        ]);
    }
}
