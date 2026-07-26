<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClosedDates extends Model
{
    protected $fillable = [
        'date_closed',
        'closure_scope',
        'barber_user_id',
        'barber_name_snapshot',
        'scope_key',
        'reason',
        'is_removed',
        'created_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'is_removed' => 'boolean',
        ];
    }

    public function barber(): BelongsTo
    {
        return $this->belongsTo(User::class, 'barber_user_id')->withTrashed();
    }

    public function activities(): HasMany
    {
        return $this->hasMany(ClosedDateActivity::class, 'closed_date_id');
    }
}
