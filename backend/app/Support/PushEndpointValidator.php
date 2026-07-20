<?php

namespace App\Support;

class PushEndpointValidator
{
    public static function validate(string $endpoint): bool
    {
        $parsed = parse_url($endpoint);

        if (! $parsed || ! isset($parsed['scheme'], $parsed['host'])) {
            return false;
        }

        if ($parsed['scheme'] !== 'https'
            || isset($parsed['user'])
            || isset($parsed['pass'])
            || (isset($parsed['port']) && (int) $parsed['port'] !== 443)) {
            return false;
        }

        $host = strtolower(rtrim($parsed['host'], '.'));

        if (filter_var($host, FILTER_VALIDATE_IP)
            || preg_match('/^[a-z0-9.-]+$/', $host) !== 1) {
            return false;
        }

        $allowedHosts = config('services.webpush.allowed_endpoint_hosts', []);

        foreach ($allowedHosts as $allowedHost) {
            $allowedHost = strtolower(trim((string) $allowedHost));

            if ($allowedHost === '') {
                continue;
            }

            if ($allowedHost[0] === '.') {
                if (str_ends_with($host, $allowedHost) && $host !== substr($allowedHost, 1)) {
                    return true;
                }

                continue;
            }

            if (hash_equals($allowedHost, $host)) {
                return true;
            }
        }

        return false;
    }
}
