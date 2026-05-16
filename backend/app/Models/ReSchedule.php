<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReSchedule extends Model
{
    protected $table = 're_schedules';

    protected $fillable = [
        'appointment_id',
        'customer_user_id',
        'service_id',
        'barber_user_id',
        'appointment_date',
        'appointment_time',
        'duration_minutes',
        'price',
        'notes',
        'reason',
        'decision',
        'created_by_user_id',
        'created_by_role',
        'responded_at',
    ];

    protected $casts = [
        'appointment_date' => 'date',
        'appointment_time' => 'string',
        'price' => 'decimal:2',
        'responded_at' => 'datetime',
    ];

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class, 'appointment_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_user_id');
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class, 'service_id');
    }

    public function barber(): BelongsTo
    {
        return $this->belongsTo(User::class, 'barber_user_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
