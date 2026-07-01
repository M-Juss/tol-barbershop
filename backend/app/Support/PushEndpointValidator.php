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

        if ($parsed['scheme'] !== 'https') {
            return false;
        }

        $host = $parsed['host'];

        if ($host === 'localhost' || filter_var($host, FILTER_VALIDATE_IP)) {
            return false;
        }

        $ips = gethostbynamel($host);

        if ($ips === false || $ips === []) {
            return false;
        }

        foreach ($ips as $ip) {
            if (! filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return false;
            }
        }

        return true;
    }
}
