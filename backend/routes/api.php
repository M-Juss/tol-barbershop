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
use App\Http\Controllers\ReScheduleController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ForgotPasswordController;

Route::post('/register', [RegisterController::class, 'register'])->middleware('throttle:10,1');
Route::post('/login', [LoginController::class, 'login'])->middleware('throttle:5,1');
Route::post('/forgot-password', [ForgotPasswordController::class, 'sendResetToken'])->middleware('throttle:5,1');
Route::post('/reset-password', [ForgotPasswordController::class, 'resetPassword'])->middleware('throttle:5,1');
Route::get('/public-services', [ServiceController::class, 'publicIndex']);


Route::middleware('auth:sanctum')->group(function () {
    Route::get('/appointments/overview/stats', [AppointmentController::class, 'overviewStats']);
    Route::get('/appointments/overview/monthly-revenue', [AppointmentController::class, 'monthlyRevenue']);
    Route::get('/appointments/overview/service-stats', [AppointmentController::class, 'serviceStats']);
    Route::get('/appointments/overview/time-slots', [AppointmentController::class, 'timeSlots']);
    Route::get('/appointments/overview/export-summary', [AppointmentController::class, 'exportSummary']);

    Route::apiResource('/services', ServiceController::class);
    Route::apiResource('/admin', AdminController::class);
    Route::apiResource('/barber', BarberController::class);
    Route::apiResource('/closed-dates', ClosedDatesController::class)
        ->only(['index', 'store', 'update'])
        ->middlewareFor(['store', 'update'], 'throttle:20,1');
    Route::apiResource('/appointments', AppointmentController::class)
        ->middlewareFor(['store', 'update'], 'throttle:30,1')
        ->middlewareFor('destroy', 'throttle:15,1');
    Route::get('/notifications', [NotificationController::class, 'index'])->middleware(['role:customer', 'throttle:120,1']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead'])->middleware(['role:customer', 'throttle:90,1']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead'])->middleware(['role:customer', 'throttle:20,1']);
    Route::get('/re-schedules', [ReScheduleController::class, 'index'])->middleware('role:manager,admin,customer');
    Route::post('/re-schedules', [ReScheduleController::class, 'store'])->middleware(['role:manager,admin', 'throttle:20,1']);
    Route::patch('/re-schedules/{id}/decision', [ReScheduleController::class, 'decide'])->middleware(['role:customer', 'throttle:20,1']);
    Route::put('/change-password', [EditUserController::class, 'changePassword'])->middleware('throttle:5,1');
    Route::put('/change-information', [EditUserController::class, 'changeInformation'])->middleware('throttle:30,1');

});
