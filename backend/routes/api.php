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
// [RESCHEDULE] use App\Http\Controllers\ReScheduleController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\AppointmentFeedbackController;
use App\Http\Controllers\ForgotPasswordController;
use App\Http\Controllers\LogoutController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\ModuleController;
use App\Http\Controllers\PushSubscriptionController;
use App\Http\Controllers\SSEController;

Route::prefix('v1')->group(function () {
    Route::post('/register', [RegisterController::class, 'register'])->middleware('throttle:30,1');

    Route::get('/login', function () {
        return response()->json(['message' => 'Unauthenticated'], 401);
    })->name('login');

    Route::post('/login', [LoginController::class, 'login'])->middleware('throttle:30,1');
    Route::post('/forgot-password', [ForgotPasswordController::class, 'sendResetToken'])->middleware('throttle:10,1');
    Route::post('/reset-password', [ForgotPasswordController::class, 'resetPassword'])->middleware('throttle:30,1');
    Route::get('/public-services', [ServiceController::class, 'publicIndex']);
    Route::get('/public-feedback', [AppointmentFeedbackController::class, 'publicIndex'])->middleware('throttle:300,1');

    Route::get('/events/stream', [SSEController::class, 'stream']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [LogoutController::class, 'logout'])->middleware('throttle:30,1');
        Route::get('/user', [EditUserController::class, 'currentUser']);
        Route::delete('/account', [EditUserController::class, 'destroy'])->middleware('throttle:10,1');

        Route::post('/push/subscribe', [PushSubscriptionController::class, 'subscribe'])->middleware('throttle:30,1');
        Route::post('/push/unsubscribe', [PushSubscriptionController::class, 'unsubscribe'])->middleware('throttle:30,1');
        Route::post('/push/unsubscribe-all', [PushSubscriptionController::class, 'unsubscribeAll'])->middleware('throttle:10,1');

        Route::middleware('role:admin,manager')->group(function () {
            Route::get('/appointments/pending-count', [AppointmentController::class, 'pendingCount'])->middleware('throttle:300,1');
            Route::get('/appointments/overview/stats', [AppointmentController::class, 'overviewStats'])->middleware('throttle:300,1');
            Route::get('/appointments/overview/monthly-revenue', [AppointmentController::class, 'monthlyRevenue'])->middleware('throttle:300,1');
            Route::get('/appointments/overview/service-stats', [AppointmentController::class, 'serviceStats'])->middleware('throttle:300,1');
            Route::get('/appointments/overview/time-slots', [AppointmentController::class, 'timeSlots'])->middleware('throttle:300,1');
            Route::get('/appointments/overview/export-summary', [AppointmentController::class, 'exportSummary'])->middleware('throttle:60,1');

            Route::get('/analytics/kpi', [AnalyticsController::class, 'kpi'])->middleware('throttle:300,1');
            Route::get('/analytics/revenue', [AnalyticsController::class, 'revenue'])->middleware('throttle:300,1');
            Route::get('/analytics/appointments', [AnalyticsController::class, 'appointments'])->middleware('throttle:300,1');
            Route::get('/analytics/services', [AnalyticsController::class, 'services'])->middleware('throttle:300,1');
            Route::get('/analytics/barbers', [AnalyticsController::class, 'barbers'])->middleware('throttle:300,1');
            Route::get('/analytics/ratings', [AnalyticsController::class, 'ratings'])->middleware('throttle:300,1');
            Route::get('/analytics/peak-hours', [AnalyticsController::class, 'peakHours'])->middleware('throttle:300,1');
            Route::get('/analytics/day-of-week', [AnalyticsController::class, 'dayOfWeek'])->middleware('throttle:300,1');
            Route::get('/feedback', [AppointmentFeedbackController::class, 'index'])->middleware('throttle:300,1');
        });

        Route::apiResource('/services', ServiceController::class)
            ->middlewareFor(['index'], 'role:admin,manager,customer')
            ->middlewareFor(['store', 'update', 'destroy'], ['role:manager', 'throttle:60,1']);
        Route::apiResource('/admin', AdminController::class)
            ->middleware(['role:manager'])
            ->middlewareFor(['store', 'update', 'destroy'], 'throttle:30,1');
        Route::apiResource('/roles', RoleController::class)
            ->middleware(['role:manager'])
            ->middlewareFor(['store', 'update', 'destroy'], 'throttle:30,1');
        Route::get('/modules', [ModuleController::class, 'index'])->middleware(['role:manager', 'throttle:300,1']);
        Route::apiResource('/barber', BarberController::class)
            ->middlewareFor(['index'], 'role:admin,manager,customer')
            ->middlewareFor(['store', 'update', 'destroy'], ['role:manager', 'throttle:30,1']);
        Route::apiResource('/closed-dates', ClosedDatesController::class)
            ->only(['index', 'store', 'update'])
            ->middlewareFor('index', ['role:admin,manager,customer'])
            ->middlewareFor('store', ['role:manager', 'throttle:30,1'])
            ->middlewareFor('update', ['role:manager', 'throttle:30,1']);
        Route::apiResource('/appointments', AppointmentController::class)
            ->middlewareFor('index', ['role:admin,manager,customer'])
            ->middlewareFor('store', ['role:admin,manager,customer', 'throttle:60,1'])
            ->middlewareFor('show', ['role:admin,manager,customer'])
            ->middlewareFor('update', ['role:admin,manager', 'throttle:60,1'])
            ->middlewareFor('destroy', ['role:admin,manager', 'throttle:30,1']);
        Route::get('/notifications', [NotificationController::class, 'index'])->middleware(['role:customer', 'throttle:300,1']);
        Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead'])->middleware(['role:customer', 'throttle:100,1']);
        Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead'])->middleware(['role:customer', 'throttle:30,1']);
        Route::post('/appointment-feedback', [AppointmentFeedbackController::class, 'store'])->middleware(['role:customer', 'throttle:30,1']);
        Route::get('/pending-feedback', [AppointmentFeedbackController::class, 'pendingFeedback'])->middleware(['role:customer', 'throttle:300,1']);
        // [RESCHEDULE] Route::get('/re-schedules', [ReScheduleController::class, 'index'])->middleware(['role:manager,admin,customer', 'throttle:300,1']);
        // [RESCHEDULE] Route::post('/re-schedules', [ReScheduleController::class, 'store'])->middleware(['role:manager,admin', 'throttle:30,1']);
        // [RESCHEDULE] Route::patch('/re-schedules/{id}/decision', [ReScheduleController::class, 'decide'])->middleware(['role:customer', 'throttle:30,1']);
        Route::put('/change-password', [EditUserController::class, 'changePassword'])->middleware(['role:admin,manager,customer', 'throttle:30,1']);
        Route::put('/change-information', [EditUserController::class, 'changeInformation'])->middleware(['role:admin,manager,customer', 'throttle:30,1']);
    });
});
