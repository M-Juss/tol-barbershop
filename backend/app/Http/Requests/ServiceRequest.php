<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\SanitizesInput;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ServiceRequest extends FormRequest
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
        $this->sanitizeStringFields(['name']);
        $this->sanitizeTextFields(['description']);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name'=> ['required', 'string', 'max:255', 'regex:/^[A-Za-z\s]+$/'],
            'description'=> 'required|string|max:1000',
            'duration'=> 'required|integer|min:1|max:480',
            'price'=> 'required|integer|min:0|max:999999',
            'is_active'=> 'required|boolean',
        ];
    }
}
