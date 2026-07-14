<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $emailKey = fn (Request $request, string $field): string => hash(
            'sha256',
            $request->ip().'|'.Str::lower(trim((string) $request->input($field))),
        );

        RateLimiter::for('verification-link', fn (Request $request): Limit => Limit::perMinute(6)
            ->by(hash('sha256', $request->ip().'|'.$request->route('id'))));
        RateLimiter::for('verification-resend', fn (Request $request): Limit => Limit::perMinute(6)
            ->by($emailKey($request, 'email')));
        RateLimiter::for('change-registration-email', fn (Request $request): Limit => Limit::perMinute(5)
            ->by($emailKey($request, 'current_email')));
        RateLimiter::for('forgot-password', fn (Request $request): Limit => Limit::perMinute(10)
            ->by($emailKey($request, 'email')));
        RateLimiter::for('reset-password', fn (Request $request): Limit => Limit::perMinute(30)
            ->by($emailKey($request, 'email')));
        RateLimiter::for('validate-reset-token', fn (Request $request): Limit => Limit::perMinute(30)
            ->by($emailKey($request, 'email')));

        VerifyEmail::createUrlUsing(function (User $user): string {
            $signedPath = URL::temporarySignedRoute(
                'verification.verify',
                now()->addMinutes((int) config('auth.verification.expire', 60)),
                [
                    'id' => $user->getKey(),
                    'hash' => sha1($user->getEmailForVerification()),
                ],
                absolute: false,
            );

            return rtrim((string) config('app.frontend_url'), '/').$signedPath;
        });

        ResetPassword::createUrlUsing(function (User $user, string $token): string {
            $query = http_build_query([
                'email' => $user->getEmailForPasswordReset(),
                'token' => $token,
            ]);

            return rtrim((string) config('app.frontend_url'), '/').'/reset-password?'.$query;
        });
    }
}
