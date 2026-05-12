<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Models\User;

use Override;

class StaffRequest extends FormRequest
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
    
    #[Override]
protected function prepareForValidation()
{
    // If password is empty or missing, set a default one
    if (!$this->filled('password')) {
        $this->merge([
            'password' => 'Staff123!', 
        ]);
    }
}
    public function rules(): array
    {
        $currentId = $this->route('admin') ?? $this->route('barber') ?? $this->route('id');
        $currentUser = $currentId ? User::find($currentId) : null;
        $emailUnchanged =
            $currentUser &&
            $this->filled('email') &&
            strtolower((string) $this->input('email')) === strtolower((string) $currentUser->email);

        $emailRules = ['required', 'string', 'email', 'max:255'];
        if (!$emailUnchanged) {
            $emailRules[] = Rule::unique('users', 'email')->ignore($currentId);
        }

        return [
            'image' => 'nullable|image|mimes:jpeg,png,jpg,svg|max:2048',
            'fullname' => 'required|string|max:255',
            'email' => $emailRules,
            'contact_number' => 'required|string|max:255',
            'password' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ];
    }
    public function messages(): array
    {
        return [
            'fullname.required' => 'Full name is required',
            'email.required' => 'Email is required',
            'contact_number.required' => 'Contact number is required',
            'password.required' => 'Password is required',
            'is_active.required' => 'Status is required',
        ];
    }
}
