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

    public static function versions(array $entityTypes): array
    {
        $keys = array_map(self::key(...), $entityTypes);
        $cachedVersions = Cache::many($keys);
        $versions = [];

        foreach ($entityTypes as $index => $entityType) {
            $versions[$entityType] = (string) ($cachedVersions[$keys[$index]] ?? '0');
        }

        return $versions;
    }

    private static function key(string $entityType): string
    {
        return "change:{$entityType}";
    }
}
