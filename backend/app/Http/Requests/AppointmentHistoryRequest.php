<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\SanitizesInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AppointmentHistoryRequest extends FormRequest
{
    use SanitizesInput;

    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['customer', 'admin', 'manager'], true);
    }

    protected function prepareForValidation(): void
    {
        $this->sanitizeStringFields(['search']);
    }

    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'string', Rule::in(['pending', 'approved', 'completed', 'cancelled', 'rejected', 'no_show'])],
            'is_walkin' => ['nullable', 'boolean'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ];
    }
}
