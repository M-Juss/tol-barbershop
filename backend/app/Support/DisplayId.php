<?php

namespace App\Support;

class DisplayId
{
    public static function booking(int|string|null $id): string
    {
        if ($id === null || ! is_numeric($id)) {
            return '';
        }

        $number = (((int) $id * 12345 + 67890) % 90000) + 10000;

        return "BK-{$number}";
    }

    public static function ticket(int|string|null $id): string
    {
        if ($id === null || ! is_numeric($id)) {
            return '';
        }

        $number = (((int) $id * 54321 + 98765) % 90000) + 10000;

        return "TK-{$number}";
    }
}
