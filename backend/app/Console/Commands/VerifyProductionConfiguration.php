<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

class VerifyProductionConfiguration extends Command
{
    protected $signature = 'production:verify';

    protected $description = 'Verify production runtime, service, security, and database settings';

    public function handle(): int
    {
        $frontendUrl = (string) config('app.frontend_url');
        $frontendHost = (string) parse_url($frontendUrl, PHP_URL_HOST);
        $frontendPort = parse_url($frontendUrl, PHP_URL_PORT);
        $frontendAuthority = $frontendHost.($frontendPort ? ':'.$frontendPort : '');
        $statefulDomains = array_map('trim', config('sanctum.stateful', []));
        $mailUrl = (string) config('mail.mailers.smtp.url');
        $mailHost = (string) config('mail.mailers.smtp.host');
        $requiredExtensions = [
            'ctype',
            'curl',
            'dom',
            'fileinfo',
            'filter',
            'hash',
            'iconv',
            'json',
            'libxml',
            'openssl',
            'pcre',
            'pdo_mysql',
            'session',
            'SimpleXML',
            'tokenizer',
            'xml',
            'xmlwriter',
        ];
        $checks = [
            ['PHP 8.4 or newer', version_compare(PHP_VERSION, '8.4.0', '>=')],
            ['Required PHP extensions', collect($requiredExtensions)->every(fn (string $extension): bool => extension_loaded($extension))],
            ['APP_ENV=production', app()->environment('production')],
            ['APP_DEBUG=false', config('app.debug') === false],
            ['APP_KEY configured', filled(config('app.key'))],
            ['APP_URL uses HTTPS', $this->isHttpsUrl((string) config('app.url'))],
            ['FRONTEND_URL uses HTTPS', $this->isHttpsUrl($frontendUrl)],
            ['Database driver is MySQL', $this->databaseDriverIsMysql()],
            ['MySQL 8.0 or newer', $this->mysqlVersionIsSupported()],
            ['Database session driver', config('session.driver') === 'database'],
            ['Database cache store', config('cache.default') === 'database'],
            ['Synchronous queue', config('queue.default') === 'sync'],
            ['Session encryption enabled', config('session.encrypt') === true],
            ['Secure HTTP-only session cookie', config('session.secure') === true && config('session.http_only') === true],
            ['Session SameSite is lax', config('session.same_site') === 'lax'],
            ['Session domain remains unset', blank(config('session.domain'))],
            ['Frontend is a Sanctum stateful domain', $frontendAuthority !== '' && in_array($frontendAuthority, $statefulDomains, true)],
            ['Sanctum domains contain no preview or tunnel wildcards', collect($statefulDomains)->every(
                fn (string $domain): bool => ! str_contains($domain, '*')
                    && ! str_contains(strtolower($domain), 'ngrok')
                    && ! str_contains(strtolower($domain), 'deploy-preview'),
            )],
            ['SMTP mailer configured', config('mail.default') === 'smtp'
                && ($mailUrl !== '' || ($mailHost !== '' && ! in_array($mailHost, ['127.0.0.1', 'localhost'], true)))],
            ['Verified sender address configured', filter_var(config('mail.from.address'), FILTER_VALIDATE_EMAIL) !== false
                && config('mail.from.address') !== 'hello@example.com'],
            ['Cloudinary configured', filled(config('services.cloudinary.url')) && filled(config('services.cloudinary.folder'))],
            ['Web Push VAPID configured', filled(config('services.webpush.subject'))
                && filled(config('services.webpush.public_key'))
                && filled(config('services.webpush.private_key'))],
            ['Session and cache tables exist', $this->sessionAndCacheTablesExist()],
            ['Storage directories are writable', is_writable(storage_path()) && is_writable(base_path('bootstrap/cache'))],
            ['Laravel configuration is cached', app()->configurationIsCached()],
            ['Every-minute application task is registered', $this->schedulerTaskIsRegistered()],
        ];

        $this->table(
            ['Check', 'Result'],
            array_map(fn (array $check): array => [$check[0], $check[1] ? 'PASS' : 'FAIL'], $checks),
        );

        $failures = collect($checks)->filter(fn (array $check): bool => ! $check[1]);

        if ($failures->isNotEmpty()) {
            $this->error("Production verification failed: {$failures->count()} check(s) need attention.");

            return self::FAILURE;
        }

        $this->info('Production configuration checks passed.');

        return self::SUCCESS;
    }

    private function isHttpsUrl(string $url): bool
    {
        return filter_var($url, FILTER_VALIDATE_URL) !== false
            && strtolower((string) parse_url($url, PHP_URL_SCHEME)) === 'https';
    }

    private function mysqlVersionIsSupported(): bool
    {
        try {
            $version = (string) DB::selectOne('SELECT VERSION() AS version')->version;

            return preg_match('/^\d+\.\d+\.\d+/', $version, $matches) === 1
                && version_compare($matches[0], '8.0.0', '>=');
        } catch (Throwable) {
            return false;
        }
    }

    private function databaseDriverIsMysql(): bool
    {
        try {
            return DB::getDriverName() === 'mysql';
        } catch (Throwable) {
            return false;
        }
    }

    private function sessionAndCacheTablesExist(): bool
    {
        try {
            return Schema::hasTable('sessions') && Schema::hasTable('cache');
        } catch (Throwable) {
            return false;
        }
    }

    private function schedulerTaskIsRegistered(): bool
    {
        return collect(app(Schedule::class)->events())
            ->contains(fn ($event): bool => str_contains((string) $event->command, 'support:cancel-inactive'));
    }
}
