<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\AppointmentFeedbackController;
use App\Http\Controllers\BarberController;
use App\Http\Controllers\ClosedDatesController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\EditUserController;
use App\Http\Controllers\EmailVerificationController;
use App\Http\Controllers\EntityChangeController;
use App\Http\Controllers\ForgotPasswordController;
use App\Http\Controllers\GalleryImageController;
use App\Http\Controllers\LoginController;
use App\Http\Controllers\LogoutController;
use App\Http\Controllers\ModuleController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PushSubscriptionController;
use App\Http\Controllers\RegisterController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\SupportTicketController;
use App\Http\Controllers\WalkinController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('/register', [RegisterController::class, 'register'])->middleware('throttle:register');

    Route::get('/login', [LoginController::class, 'unauthenticated'])->name('login');

    Route::post('/login', [LoginController::class, 'login'])->middleware('throttle:login');
    Route::get('/email/verify/status', [EmailVerificationController::class, 'checkStatus'])
        ->middleware('throttle:verification-link');
    Route::get('/email/verify/{id}/{hash}', [EmailVerificationController::class, 'show'])
        ->middleware('throttle:verification-link')
        ->name('verification.verify');
    Route::post('/email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])
        ->middleware('throttle:verification-link');
    Route::post('/email/verification-notification', [EmailVerificationController::class, 'resend'])->middleware('throttle:verification-resend');
    Route::post('/email/change-registration-email', [EmailVerificationController::class, 'changeRegistrationEmail'])->middleware('throttle:change-registration-email');
    Route::post('/forgot-password', [ForgotPasswordController::class, 'sendResetLink'])->middleware('throttle:forgot-password');
    Route::post('/reset-password', [ForgotPasswordController::class, 'resetPassword'])->middleware('throttle:reset-password');
    Route::post('/reset-password/validate-token', [ForgotPasswordController::class, 'validateToken'])->middleware('throttle:validate-reset-token');
    Route::get('/public-services', [ServiceController::class, 'publicIndex'])->middleware('throttle:public-read');
    Route::get('/public-gallery-images', [GalleryImageController::class, 'publicIndex'])->middleware('throttle:public-read');
    Route::get('/public-feedback', [AppointmentFeedbackController::class, 'publicIndex'])->middleware('throttle:public-read');
    Route::get('/featured-feedback', [AppointmentFeedbackController::class, 'featuredIndex'])->middleware('throttle:public-read');
    Route::get('/public-booking-settings', [SettingsController::class, 'publicBookingSettings'])->middleware('throttle:public-read');

    Route::middleware(['auth:sanctum', 'active', 'customer.verified'])->group(function () {
        Route::post('/logout', [LogoutController::class, 'logout'])->middleware('throttle:30,1');
        Route::get('/user', [EditUserController::class, 'currentUser'])->middleware('throttle:60,1');
        Route::delete('/account', [EditUserController::class, 'destroy'])->middleware('throttle:10,1');

        Route::post('/push/subscribe', [PushSubscriptionController::class, 'subscribe'])->middleware('throttle:30,1');
        Route::post('/push/unsubscribe', [PushSubscriptionController::class, 'unsubscribe'])->middleware('throttle:30,1');
        Route::post('/push/unsubscribe-all', [PushSubscriptionController::class, 'unsubscribeAll'])->middleware('throttle:10,1');
        Route::get('/changes', [EntityChangeController::class, 'index'])->middleware('throttle:120,1');

        Route::middleware('role:admin,manager')->group(function () {
            Route::get('/appointments/pending-count', [AppointmentController::class, 'pendingCount'])->middleware(['module:appointment', 'throttle:300,1']);
            Route::get('/appointments/overview/stats', [AppointmentController::class, 'overviewStats'])->middleware(['module:dashboard', 'throttle:300,1']);
            Route::get('/appointments/overview/monthly-revenue', [AppointmentController::class, 'monthlyRevenue'])->middleware(['module:dashboard', 'throttle:300,1']);
            Route::get('/appointments/overview/service-stats', [AppointmentController::class, 'serviceStats'])->middleware(['module:dashboard', 'throttle:300,1']);
            Route::get('/appointments/overview/time-slots', [AppointmentController::class, 'timeSlots'])->middleware(['module:dashboard', 'throttle:300,1']);
            Route::get('/analytics/kpi', [AnalyticsController::class, 'kpi'])->middleware(['module:dashboard,reports', 'throttle:300,1']);
            Route::get('/analytics/reports', [AnalyticsController::class, 'reports'])->middleware(['module:reports', 'throttle:300,1']);
            Route::get('/analytics/revenue', [AnalyticsController::class, 'revenue'])->middleware(['module:reports', 'throttle:300,1']);
            Route::get('/analytics/appointments', [AnalyticsController::class, 'appointments'])->middleware(['module:reports', 'throttle:300,1']);
            Route::get('/analytics/services', [AnalyticsController::class, 'services'])->middleware(['module:reports', 'throttle:300,1']);
            Route::get('/analytics/barbers', [AnalyticsController::class, 'barbers'])->middleware(['module:reports', 'throttle:300,1']);
            Route::get('/analytics/ratings', [AnalyticsController::class, 'ratings'])->middleware(['module:reports', 'throttle:300,1']);
            Route::get('/analytics/peak-hours', [AnalyticsController::class, 'peakHours'])->middleware(['module:reports', 'throttle:300,1']);
            Route::get('/analytics/day-of-week', [AnalyticsController::class, 'dayOfWeek'])->middleware(['module:reports', 'throttle:300,1']);
            Route::get('/feedback', [AppointmentFeedbackController::class, 'index'])->middleware(['module:feedback', 'throttle:300,1']);
            Route::put('/feedback/{id}/toggle-feature', [AppointmentFeedbackController::class, 'toggleFeature'])->middleware(['module:feedback', 'throttle:60,1']);
            Route::get('/customers', [CustomerController::class, 'index'])->middleware(['module:crm', 'throttle:300,1']);
            Route::get('/customers/{id}', [CustomerController::class, 'show'])->middleware(['module:crm', 'throttle:300,1']);
            Route::get('/walkins/stats', [WalkinController::class, 'stats'])->middleware(['module:walkin', 'throttle:300,1']);
        });

        Route::apiResource('/services', ServiceController::class)
            ->middlewareFor(['index'], ['role:admin,manager,customer', 'module:management,appointment,walkin', 'throttle:300,1'])
            ->middlewareFor(['show'], ['role:admin,manager', 'module:management', 'throttle:300,1'])
            ->middlewareFor(['store', 'update', 'destroy'], ['role:admin,manager', 'module:management', 'throttle:60,1']);
        Route::apiResource('/gallery-images', GalleryImageController::class)
            ->only(['index', 'store', 'update', 'destroy'])
            ->middleware(['role:admin,manager', 'module:management'])
            ->middlewareFor(['index'], 'throttle:300,1')
            ->middlewareFor(['store', 'update', 'destroy'], 'throttle:30,1');
        Route::apiResource('/admin', AdminController::class)
            ->middleware(['role:manager'])
            ->middlewareFor(['index', 'show'], 'throttle:300,1')
            ->middlewareFor(['store', 'update', 'destroy'], 'throttle:30,1');
        Route::apiResource('/roles', RoleController::class)
            ->middleware(['role:manager'])
            ->middlewareFor(['index', 'show'], 'throttle:300,1')
            ->middlewareFor(['store', 'update', 'destroy'], 'throttle:30,1');
        Route::get('/modules', [ModuleController::class, 'index'])->middleware(['role:manager', 'throttle:300,1']);

        Route::prefix('support')->group(function () {
            Route::middleware(['role:customer,admin,manager', 'module:customer-service'])->group(function () {
                Route::get('/tickets/{id}', [SupportTicketController::class, 'show'])->middleware('throttle:300,1');
                Route::get('/tickets/{id}/messages', [SupportTicketController::class, 'getMessages'])->middleware('throttle:60,1');
                Route::post('/tickets/{id}/messages', [SupportTicketController::class, 'sendMessage'])->middleware('throttle:60,1');
                Route::post('/tickets/{id}/cancel', [SupportTicketController::class, 'cancel'])->middleware('throttle:30,1');
            });

            Route::middleware('role:customer')->group(function () {
                Route::get('/tickets', [SupportTicketController::class, 'index'])->middleware('throttle:60,1');
                Route::post('/tickets', [SupportTicketController::class, 'store'])->middleware('throttle:30,1');
            });

            Route::middleware(['role:admin,manager', 'module:customer-service'])->group(function () {
                Route::get('/queue', [SupportTicketController::class, 'queue'])->middleware('throttle:60,1');
                Route::get('/queue/count', [SupportTicketController::class, 'waitingCount'])->middleware('throttle:300,1');
                Route::post('/tickets/{id}/accept', [SupportTicketController::class, 'accept'])->middleware('throttle:30,1');
                Route::post('/tickets/{id}/resolve', [SupportTicketController::class, 'resolve'])->middleware('throttle:30,1');
                Route::get('/customer/{customerId}', [SupportTicketController::class, 'customerTickets'])->middleware('throttle:300,1');
            });
        });
        Route::apiResource('/barber', BarberController::class)
            ->middlewareFor(['index'], ['role:admin,manager,customer', 'module:management,appointment,walkin', 'throttle:300,1'])
            ->middlewareFor(['show'], ['role:admin,manager,customer', 'module:management,appointment,walkin', 'throttle:300,1'])
            ->middlewareFor(['store', 'update', 'destroy'], ['role:admin,manager', 'module:management', 'throttle:30,1']);
        Route::get('/closed-dates/check-conflicts', [ClosedDatesController::class, 'checkConflicts'])
            ->middleware(['role:admin,manager', 'module:management', 'throttle:300,1']);
        Route::apiResource('/closed-dates', ClosedDatesController::class)
            ->only(['index', 'store', 'update'])
            ->middlewareFor('index', ['role:admin,manager,customer', 'module:dashboard,management,appointment,walkin', 'throttle:300,1'])
            ->middlewareFor('store', ['role:admin,manager', 'module:management', 'throttle:30,1'])
            ->middlewareFor('update', ['role:admin,manager', 'module:management', 'throttle:30,1']);
        Route::post('/appointments/batch', [AppointmentController::class, 'storeBatch'])->middleware(['role:customer', 'throttle:30,1']);
        Route::put('/appointments/batch/{batchId}/status', [AppointmentController::class, 'updateBatchStatus'])
            ->where('batchId', 'BATCH-[A-Za-z0-9-]+')
            ->middleware(['role:admin,manager', 'module:appointment', 'throttle:30,1']);
        Route::get('/appointments/available-slots', [AppointmentController::class, 'availableSlots'])->middleware(['role:admin,manager,customer', 'module:appointment', 'throttle:300,1']);
        Route::get('/appointments/history', [AppointmentController::class, 'history'])->middleware(['role:admin,manager,customer', 'module:history', 'throttle:300,1']);
        Route::apiResource('/appointments', AppointmentController::class)
            ->middlewareFor('index', ['role:admin,manager,customer', 'module:appointment', 'throttle:300,1'])
            ->middlewareFor('store', ['role:admin,manager,customer', 'module:appointment,walkin', 'throttle:60,1'])
            ->middlewareFor('show', ['role:admin,manager,customer', 'module:appointment', 'throttle:300,1'])
            ->middlewareFor('update', ['role:admin,manager', 'module:appointment', 'throttle:60,1'])
            ->middlewareFor('destroy', ['role:admin,manager', 'module:appointment', 'throttle:30,1']);
        Route::get('/notifications', [NotificationController::class, 'index'])->middleware(['role:customer', 'throttle:300,1']);
        Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead'])->middleware(['role:customer', 'throttle:100,1']);
        Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead'])->middleware(['role:customer', 'throttle:30,1']);
        Route::post('/appointment-feedback', [AppointmentFeedbackController::class, 'store'])->middleware(['role:customer', 'throttle:30,1']);
        Route::get('/pending-feedback', [AppointmentFeedbackController::class, 'pendingFeedback'])->middleware(['role:customer', 'throttle:300,1']);
        Route::put('/change-password', [EditUserController::class, 'changePassword'])->middleware(['role:admin,manager,customer', 'throttle:30,1']);
        Route::put('/change-information', [EditUserController::class, 'changeInformation'])->middleware(['role:admin,manager,customer', 'throttle:30,1']);
    });
});
