<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['image', 'fullname', 'contact_number', 'email', 'password', 'role', 'is_active', 'role_id'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function roleModel(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class, 'user_id');
    }

    public function appointmentFeedback(): HasMany
    {
        return $this->hasMany(AppointmentFeedback::class, 'user_id');
    }

    public function policyAcceptances(): HasMany
    {
        return $this->hasMany(UserPolicyAcceptance::class);
    }

    public function scopeActiveStaffForModule(Builder $query, string $moduleKey): Builder
    {
        return $query
            ->where('is_active', true)
            ->where(function (Builder $staffQuery) use ($moduleKey): void {
                $staffQuery
                    ->where('role', 'manager')
                    ->orWhere(function (Builder $adminQuery) use ($moduleKey): void {
                        $adminQuery
                            ->where('role', 'admin')
                            ->whereHas('roleModel.modules', fn (Builder $moduleQuery) => $moduleQuery->where('key', $moduleKey));
                    });
            });
    }

    public function canAccessModule(string $moduleKey): bool
    {
        if ($this->role === 'manager') {
            return true;
        }

        return $this->role === 'admin'
            && $this->roleModel()
                ->whereHas('modules', fn (Builder $query) => $query->where('key', $moduleKey))
                ->exists();
    }
}
