<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClosedDateActivity extends Model
{
    protected $fillable = [
        'closed_date_id',
        'action',
        'closure_scope',
        'date_closed',
        'barber_user_id',
        'barber_name_snapshot',
        'reason',
        'actor_user_id',
        'actor_name_snapshot',
    ];

    public function closedDate(): BelongsTo
    {
        return $this->belongsTo(ClosedDates::class);
    }
}
