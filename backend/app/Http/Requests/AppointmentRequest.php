<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\SanitizesInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AppointmentRequest extends FormRequest
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
        $this->sanitizeStringFields(['walkin_customer_name']);
        $this->sanitizeTextFields(['notes', 'cancellation_reason']);
        $this->normalizePhoneFields(['walkin_customer_contact_number']);
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'user_id' => [
                'required_without:is_walkin',
                'exists:users,id',
            ],

            'service_id' => [
                'required',
                'exists:services,id',
            ],

            'barber_user_id' => [
                'required',
                Rule::exists('users', 'id')->where(function ($query) {
                    $query->where('role', 'barber');
                }),
            ],

            'appointment_date' => [
                'required_without:is_walkin',
                'date',
            ],

            'appointment_time' => [
                'required_without:is_walkin',
                'date_format:H:i',
            ],

            'duration_minutes' => [
                'nullable',
                'integer',
                'min:1',
            ],

            'price' => [
                'required',
                'integer',
                'min:0',
                'max:999999',
            ],

            'status' => [
                'nullable',
                Rule::in([
                    'pending',
                    'approved',
                    'completed',
                    'cancelled',
                    'no_show',
                    'rejected',
                ]),
            ],

            'is_walkin' => [
                'nullable',
                'boolean',
            ],

            'walkin_customer_name' => [
                'required_if:is_walkin,true',
                'string',
                'max:255',
                'regex:/^[A-Za-z\s]+$/',
            ],

            'walkin_customer_contact_number' => [
                'required_if:is_walkin,true',
                'string',
                'max:11',
                'regex:/^09\d{9}$/',
            ],

            'notes' => [
                'nullable',
                'string',
                'max:500',
            ],

            'cancellation_reason' => [
                'nullable',
                'string',
                'max:500',
            ],
        ];
    }
}
