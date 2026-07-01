<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\SanitizesInput;
use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StaffRequest extends FormRequest
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
        $currentId = $this->route('admin') ?? $this->route('barber') ?? $this->route('id');
        $isAdminStore = $this->routeIs('admin.store');
        $currentUser = $currentId ? User::find($currentId) : null;
        $emailUnchanged =
            $currentUser &&
            $this->filled('email') &&
            strtolower((string) $this->input('email')) === strtolower((string) $currentUser->email);

        $emailRules = ['required', 'string', 'email', 'max:255'];
        if (! $emailUnchanged) {
            $emailRules[] = Rule::unique('users', 'email')->ignore($currentId);
        }

        $passwordRules = $isAdminStore
            ? ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()->symbols()]
            : ['nullable', 'confirmed', Password::min(8)->mixedCase()->numbers()->symbols()];

        return [
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp,heic,heif|max:3072',
            'fullname' => ['required', 'string', 'max:255', 'regex:/^[A-Za-z\s]+$/'],
            'email' => $emailRules,
            'contact_number' => ['required', 'string', 'max:11', 'regex:/^09\d{9}$/'],
            'password' => $passwordRules,
            'is_active' => 'nullable|boolean',
            'role_id' => 'nullable|integer|exists:roles,id',
        ];
    }

    public function messages(): array
    {
        return [
            'fullname.required' => 'Full name is required',
            'fullname.regex' => 'Full name must only contain letters and spaces',
            'email.required' => 'Email is required',
            'contact_number.required' => 'Contact number is required',
            'contact_number.regex' => 'Contact number must be a valid PH mobile number.',
            'password.required' => 'Password is required',
            'password.regex' => 'Password must contain at least one lowercase, uppercase , number, and  special character.',
            'is_active.required' => 'Status is required',
        ];
    }
}
