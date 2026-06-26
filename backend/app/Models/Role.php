<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Role extends Model
{
    protected $fillable = [
        'name',
    ];

    public function modules(): BelongsToMany
    {
        return $this->belongsToMany(Module::class, 'role_module');
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }
}
