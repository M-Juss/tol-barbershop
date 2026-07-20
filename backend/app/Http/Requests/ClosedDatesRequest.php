<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\SanitizesInput;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ClosedDatesRequest extends FormRequest
{
    use SanitizesInput;

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->sanitizeTextFields(['reason']);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $closedDateId = $this->route('closed_date') ?? $this->route('id');

        return [
            'date_closed' => [
                'required',
                'date_format:Y-m-d',
                Rule::unique('closed_dates', 'date_closed')->ignore($closedDateId),
            ],
            'reason' => ['required', 'string', 'max:255'],
            'is_removed' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'date_closed.required' => 'Date is required',
            'date_closed.date' => 'Date must be a valid date',
            'reason.required' => 'Reason is required',
            'reason.string' => 'Reason must be a string',
            'is_removed.boolean' => 'Is removed must be a boolean',
        ];
    }
}
