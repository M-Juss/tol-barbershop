<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\SanitizesInput;
use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
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
        $this->sanitizeStringFields(['fullname']);
        $this->normalizeEmailFields(['email']);
        $this->normalizePhoneFields(['contact_number']);
    }

    public function rules(): array
    {
        return [
            'fullname' => ['required', 'string', 'max:255', 'regex:/^[A-Za-z\s]+$/'],
            'contact_number' => ['required', 'string', 'max:11', 'regex:/^09\d{9}$/'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', 'string', 'min:6', 'max:255'],
            'terms_accepted' => ['required', 'boolean', 'accepted'],
            'privacy_acknowledged' => ['required', 'boolean', 'accepted'],
        ];
    }

    public function messages(): array
    {
        return [
            'fullname.required' => 'Full name is required.',
            'fullname.string' => 'Full name must be a string.',
            'fullname.max' => 'Full name must not exceed 255 characters.',
            'fullname.regex' => 'Full name must only contain letters and spaces.',
            'contact_number.required' => 'Contact number is required.',
            'contact_number.string' => 'Contact number must be a string.',
            'contact_number.max' => 'Contact number must not exceed 11 digits.',
            'contact_number.regex' => 'Contact number must be a valid PH mobile number.',
            'email.required' => 'Email is required.',
            'email.string' => 'Email must be a string.',
            'email.email' => 'Email must be a valid email address.',
            'email.max' => 'Email must not exceed 255 characters.',
            'email.unique' => 'Email has already been taken.',
            'password.required' => 'Password is required.',
            'password.string' => 'Password must be a string.',
            'password.min' => 'Password must be at least 6 characters long.',
            'password.confirmed' => 'Password confirmation does not match.',
            'terms_accepted.required' => 'You must accept the Terms of Use to register.',
            'terms_accepted.boolean' => 'Terms acceptance must be true or false.',
            'terms_accepted.accepted' => 'You must accept the Terms of Use to register.',
            'privacy_acknowledged.required' => 'You must acknowledge the Privacy Policy to register.',
            'privacy_acknowledged.boolean' => 'Privacy acknowledgement must be true or false.',
            'privacy_acknowledged.accepted' => 'You must acknowledge the Privacy Policy to register.',
        ];
    }
}
