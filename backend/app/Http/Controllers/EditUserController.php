<?php

namespace App\Http\Controllers;

use App\Http\Requests\ChangeInformationRequest;
use App\Http\Requests\ChangePasswordRequest;
use App\Http\Requests\DeleteAccountRequest;
use App\Http\Resources\UserResource;
use App\Models\PushSubscription;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

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

        $user->update([
            'password' => $validated['password'],
        ]);

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
            PushSubscription::where('user_id', $user->id)->delete();
            $user->tokens()->delete();
            DB::table('sessions')->where('user_id', $user->id)->delete();
            DB::table('password_reset_tokens')->where('email', $user->email)->delete();
            $user->delete();
        });

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

        $user->update([
            'fullname' => $validated['fullname'],
            'email' => $validated['email'],
            'contact_number' => $validated['contact_number'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Information updated successfully.',
            'data' => $user,
        ]);
    }
}
