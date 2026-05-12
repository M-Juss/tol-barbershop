<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\LoginController;
use App\Http\Controllers\RegisterController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\BarberController;
use App\Http\Controllers\ClosedDatesController;

Route::post('/register', [RegisterController::class, 'register']);
Route::post('/login', [LoginController::class, 'login']);


Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('/services', ServiceController::class);
    Route::apiResource('/admin', AdminController::class);
    Route::apiResource('/barber', BarberController::class);
    Route::apiResource('/closed-dates', ClosedDatesController::class)->only(['index', 'store', 'destroy']);

    // Route::get('/user', function (Request $request) {
    //     return $request->user();
    // });
});