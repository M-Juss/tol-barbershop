<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\LoginController;
use App\Http\Controllers\RegisterController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\BarberController;
use App\Http\Controllers\ClosedDatesController;
use App\Http\Controllers\EditUserController;

Route::post('/register', [RegisterController::class, 'register']);
Route::post('/login', [LoginController::class, 'login']);


Route::middleware('auth:sanctum')->group(function () {
    Route::get('/appointments/overview/stats', [AppointmentController::class, 'overviewStats']);
    Route::get('/appointments/overview/monthly-revenue', [AppointmentController::class, 'monthlyRevenue']);
    Route::get('/appointments/overview/service-stats', [AppointmentController::class, 'serviceStats']);
    Route::get('/appointments/overview/time-slots', [AppointmentController::class, 'timeSlots']);
    Route::get('/appointments/overview/export-summary', [AppointmentController::class, 'exportSummary']);

    Route::apiResource('/services', ServiceController::class);
    Route::apiResource('/admin', AdminController::class);
    Route::apiResource('/barber', BarberController::class);
    Route::apiResource('/closed-dates', ClosedDatesController::class)->only(['index', 'store', 'update']);
    Route::apiResource('/appointments', AppointmentController::class);
    Route::put('/change-password', [EditUserController::class, 'changePassword']);
    Route::put('/change-information', [EditUserController::class, 'changeInformation']);
    // Route::get('/user', function (Request $request) {
    //     return $request->user();
    // });
});
