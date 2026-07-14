<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gallery_images', function (Blueprint $table) {
            $table->id();
            $table->string('category', 20);
            $table->text('image_url');
            $table->string('cloudinary_public_id')->unique();
            $table->string('alt_text', 160);
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();

            $table->index(['category', 'display_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gallery_images');
    }
};
