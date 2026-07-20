<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\SanitizesInput;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ChangeInformationRequest extends FormRequest
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

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $emailIsChanging = $this->user()
            && strcasecmp((string) $this->input('email'), (string) $this->user()->email) !== 0;

        return [
            'fullname' => ['required', 'string', 'max:255', 'regex:/^[A-Za-z\s]+$/'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($this->user()->id),
            ],
            'contact_number' => ['required', 'string', 'max:11', 'regex:/^09\d{9}$/'],
            'current_password' => [
                Rule::requiredIf($emailIsChanging),
                'nullable',
                'string',
                'max:255',
                'current_password',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'current_password.required' => 'Your current password is required to change your email.',
            'current_password.current_password' => 'Your current password is incorrect.',
        ];
    }
}
