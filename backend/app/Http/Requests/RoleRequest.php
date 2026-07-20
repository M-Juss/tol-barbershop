<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\SanitizesInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RoleRequest extends FormRequest
{
    use SanitizesInput;

    protected function prepareForValidation(): void
    {
        $this->sanitizeStringFields(['name']);
    }

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $roleId = $this->route('role');

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('roles', 'name')->ignore($roleId),
            ],
            'module_ids' => ['required', 'array', 'min:1', 'max:50'],
            'module_ids.*' => ['integer', 'distinct', 'exists:modules,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Role name is required.',
            'name.unique' => 'This role name already exists.',
            'module_ids.required' => 'Please select at least one module.',
            'module_ids.min' => 'Please select at least one module.',
            'module_ids.*.exists' => 'Invalid module selected.',
        ];
    }
}
