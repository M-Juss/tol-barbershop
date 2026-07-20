<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\SanitizesInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CustomerListRequest extends FormRequest
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
            'status' => ['nullable', 'string', Rule::in(['active', 'inactive'])],
            'sort' => ['sometimes', 'string', Rule::in(['fullname', 'total_visits', 'lifetime_value', 'last_visit_date', 'average_rating'])],
            'dir' => ['sometimes', 'string', Rule::in(['asc', 'desc'])],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ];
    }
}
