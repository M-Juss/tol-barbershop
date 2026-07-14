<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Appointment extends Model
{
    protected $fillable = [
        'user_id',
        'service_id',
        'barber_user_id',
        'appointment_date',
        'appointment_time',
        'duration_minutes',
        'price',
        'status',
        'is_walkin',
        'walkin_customer_name',
        'walkin_customer_contact_number',
        'notes',
        'cancellation_reason',
        'approved_at',
        'completed_at',
        'cancelled_at',
        'rejected_at',
        'batch_id',
        'customer_name',
        'customer_name_snapshot',
        'service_name_snapshot',
        'barber_name_snapshot',
    ];

    protected $casts = [
        'appointment_date' => 'date',
        'appointment_time' => 'string',
        'approved_at' => 'datetime',
        'completed_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'rejected_at' => 'datetime',
        'price' => 'decimal:2',
        'is_walkin' => 'boolean',
    ];

    public function customerDisplayName(): ?string
    {
        if (filled($this->customer_name)) {
            return $this->customer_name;
        }

        if (filled($this->customer_name_snapshot)) {
            return $this->customer_name_snapshot;
        }

        if ($this->is_walkin && filled($this->walkin_customer_name)) {
            return $this->walkin_customer_name;
        }

        return $this->user?->fullname;
    }

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed(); // ROLE IS CUSTOMER
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class, 'service_id');
    }

    public function barber(): BelongsTo
    {
        return $this->belongsTo(User::class, 'barber_user_id')->withTrashed(); // ROLE IS BARBER
    }

    public function feedback(): HasOne
    {
        return $this->hasOne(AppointmentFeedback::class);
    }
}
