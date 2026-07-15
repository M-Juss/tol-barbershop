<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class EntityChange
{
    public static function dispatch(string $entityType): void
    {
        Cache::forever(self::key($entityType), (string) Str::uuid());
    }

    public static function version(string $entityType): string
    {
        return (string) Cache::get(self::key($entityType), '0');
    }

    private static function key(string $entityType): string
    {
        return "change:{$entityType}";
    }
}
