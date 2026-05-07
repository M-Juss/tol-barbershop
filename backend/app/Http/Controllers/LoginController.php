<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Traits\ApiResponseTrait;
use Illuminate\Validation\ValidationException;



class LoginController extends Controller
{
    use ApiResponseTrait;
    public function login(LoginRequest $request)
    {
        try{
            $request->authenticate();
            $user = $request->user();
        
            $token = $user->createToken('auth_token')->plainTextToken;
        
            $data = [
                'user' => new UserResource($user),
                'token' => $token,
            ];
        
            return $this->success('Login successful', $data);
        } catch (ValidationException $e) {

        return $this->error(
            'Invalid credentials',
            $e->errors(),
            401
        );

    } catch (\Exception $e) {

        return $this->error(
            'Something went wrong',
            [],
            500
        );
    }
}
}