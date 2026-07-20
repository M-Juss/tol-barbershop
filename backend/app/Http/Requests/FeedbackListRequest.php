<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\SanitizesInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class FeedbackListRequest extends FormRequest
{
    use SanitizesInput;

    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['admin', 'manager'], true);
    }

    protected function prepareForValidation(): void
    {
        $this->sanitizeStringFields(['search']);
    }

    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:100'],
            'rating' => ['nullable', 'integer', 'min:1', 'max:5'],
            'featured' => ['nullable', 'string', Rule::in(['all', 'featured', 'not_featured'])],
            'sort' => ['sometimes', 'string', Rule::in(['created_at', 'rating'])],
            'dir' => ['sometimes', 'string', Rule::in(['asc', 'desc'])],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ];
    }
}
