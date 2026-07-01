<?php

namespace App\Http\Controllers;

use App\Http\Requests\ChangeInformationRequest;
use App\Http\Requests\ChangePasswordRequest;
use App\Http\Resources\UserResource;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

    public function destroy(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return $this->error('Not authenticated.', [], 401);
        }

        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'Account deleted successfully.',
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
