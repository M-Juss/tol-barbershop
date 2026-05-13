<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClosedDates extends Model
{
    protected $fillable = [
        'date_closed',
        'reason',
        'is_removed',
    ];
}