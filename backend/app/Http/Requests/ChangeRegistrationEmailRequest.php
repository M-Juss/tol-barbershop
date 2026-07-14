<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\SanitizesInput;
use Illuminate\Foundation\Http\FormRequest;

class ChangeRegistrationEmailRequest extends FormRequest
{
    use SanitizesInput;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->normalizeEmailFields([
            'current_email',
            'new_email',
            'new_email_confirmation',
        ]);
    }

    public function rules(): array
    {
        return [
            'current_email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string', 'max:255'],
            'new_email' => ['required', 'string', 'email', 'max:255', 'confirmed', 'different:current_email'],
            'new_email_confirmation' => ['required', 'string', 'email', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'new_email.confirmed' => 'New email confirmation does not match.',
            'new_email.different' => 'New email must be different from the current email.',
        ];
    }
}
