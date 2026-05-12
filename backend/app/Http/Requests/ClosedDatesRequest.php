<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ClosedDatesRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'date_closed' => 'required|date',
            'reason' => 'required|string',
        ];
    }
    
    public function messages(): array
    {
        return [
            'date_closed.required' => 'Date is required',
            'date_closed.date' => 'Date must be a valid date',
            'reason.required' => 'Reason is required',
            'reason.string' => 'Reason must be a string',
        ];
    }
}