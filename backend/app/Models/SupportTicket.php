<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SupportTicket extends Model
{
    protected $fillable = [
        'customer_id',
        'assigned_to_id',
        'status',
        'category',
        'subject',
        'resolution_notes',
        'cancel_reason',
        'last_message_at',
        'queued_at',
        'claimed_at',
        'resolved_at',
    ];

    protected $casts = [
        'last_message_at' => 'datetime',
        'queued_at' => 'datetime',
        'claimed_at' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id')->withTrashed();
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to_id')->withTrashed();
    }

    public function messages(): HasMany
    {
        return $this->hasMany(SupportMessage::class)->latest('created_at');
    }

    public function messagesAsc(): HasMany
    {
        return $this->hasMany(SupportMessage::class)->oldest('created_at');
    }
}
