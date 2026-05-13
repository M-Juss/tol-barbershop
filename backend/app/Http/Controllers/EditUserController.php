<?php

namespace App\Http\Controllers;

use App\Http\Requests\ChangeInformationRequest;
use App\Http\Requests\ChangePasswordRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class EditUserController extends Controller
{
    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        $user->update([
            'password' => $request->password,
        ]);

        return response()->json([
            'success' => true,  
            'message' => 'Password updated successfully.',
            'data' => $user,
        ]);
    }

    public function changeInformation(ChangeInformationRequest $request): JsonResponse
    {
        $user = $request->user();

        $user->update([
            'fullname' => $request->fullname,
            'email' => $request->email,
            'contact_number' => $request->contact_number,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Information updated successfully.',
            'data' => $user,
        ]);
    }
}