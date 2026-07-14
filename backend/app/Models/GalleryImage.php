<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GalleryImage extends Model
{
    public const CATEGORIES = ['services', 'interior', 'tools'];

    protected $fillable = [
        'category',
        'image_url',
        'cloudinary_public_id',
        'alt_text',
        'display_order',
    ];

    protected $casts = [
        'display_order' => 'integer',
    ];
}
