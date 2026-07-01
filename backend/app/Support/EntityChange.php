<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

class EntityChange
{
    public static function dispatch(string $entityType): void
    {
        Cache::increment("change:{$entityType}");
    }
}
