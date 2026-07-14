<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\SanitizesInput;
use App\Models\GalleryImage;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class GalleryImageRequest extends FormRequest
{
    use SanitizesInput;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->sanitizeStringFields(['alt_text']);
    }

    public function rules(): array
    {
        return [
            'image' => [
                $this->isMethod('post') ? 'required' : 'nullable',
                'image',
                'mimes:jpeg,jpg,png,webp',
                'max:5120',
                'dimensions:max_width=6000,max_height=6000',
            ],
            'category' => ['required', 'string', Rule::in(GalleryImage::CATEGORIES)],
            'alt_text' => ['required', 'string', 'max:160'],
            'display_order' => ['required', 'integer', 'min:0', 'max:9999'],
        ];
    }

    public function messages(): array
    {
        return [
            'image.required' => 'Please select an image.',
            'image.mimes' => 'The image must be a JPEG, PNG, or WebP file.',
            'image.max' => 'The image must not exceed 5 MB.',
            'category.in' => 'Please select a valid gallery category.',
            'alt_text.required' => 'Alt text is required.',
            'display_order.required' => 'Display order is required.',
        ];
    }
}
