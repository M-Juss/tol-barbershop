<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Notifications\Messages\MailMessage;
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

        $emailViews = [
            'html' => 'emails.auth-action',
            'text' => 'emails.auth-action-text',
        ];

        VerifyEmail::toMailUsing(function (User $user, string $verificationUrl) use ($emailViews): MailMessage {
            return (new MailMessage)
                ->subject('Verify your TOL Barbershop email')
                ->view($emailViews, [
                    'preheader' => 'One quick step to finish setting up your TOL Barbershop account.',
                    'heading' => 'Verify Your Email',
                    'customerName' => trim((string) $user->fullname) ?: 'there',
                    'intro' => "You're almost there. Verify your email address to finish setting up your TOL Barbershop account.",
                    'actionText' => 'Verify Email',
                    'actionUrl' => $verificationUrl,
                    'expiresIn' => (int) config('auth.verification.expire', 60),
                    'securityMessage' => "If you didn't create this account, you can safely ignore this email.",
                ]);
        });

        $resetPasswordUrl = function (User $user, string $token): string {
            $query = http_build_query([
                'email' => $user->getEmailForPasswordReset(),
                'token' => $token,
            ]);

            return rtrim((string) config('app.frontend_url'), '/').'/reset-password?'.$query;
        };

        ResetPassword::createUrlUsing($resetPasswordUrl);

        ResetPassword::toMailUsing(function (User $user, string $token) use ($emailViews, $resetPasswordUrl): MailMessage {
            return (new MailMessage)
                ->subject('Reset your TOL Barbershop password')
                ->view($emailViews, [
                    'preheader' => 'Use this secure link to reset your TOL Barbershop password.',
                    'heading' => 'Reset Password',
                    'customerName' => trim((string) $user->fullname) ?: 'there',
                    'intro' => 'We received a request to reset your TOL Barbershop password. Use the button below to choose a new one.',
                    'actionText' => 'Reset Password',
                    'actionUrl' => $resetPasswordUrl($user, $token),
                    'expiresIn' => (int) config('auth.passwords.'.config('auth.defaults.passwords').'.expire', 60),
                    'securityMessage' => "If you didn't request a password reset, you can safely ignore this email.",
                ]);
        });
    }
}
