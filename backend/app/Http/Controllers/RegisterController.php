<?php

namespace App\Http\Controllers;

use App\Http\Requests\RegisterRequest;
use App\Models\User;
use App\Traits\ApiResponseTrait;
use App\Http\Resources\UserResource;

class RegisterController extends Controller
{
    use ApiResponseTrait;
    public function register(RegisterRequest $request){
        $user = User::create($request->validated());
        return $this->success('User registered successfully', new UserResource($user), 201);
       
    }
    
}