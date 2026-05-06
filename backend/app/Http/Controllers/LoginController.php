<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Traits\ApiResponseTrait;


class LoginController extends Controller
{
    use ApiResponseTrait;
    public function login(LoginRequest $request)
    {
    
        $request->authenticate();
        $user = $request->user();
        
        $token = $user->createToken('auth_token')->plainTextToken;
        
        $data = [
            'user' => new UserResource($user),
            'token' => $token,
        ];
        
        return $this->success('Login successful', $data);
        
    }
}