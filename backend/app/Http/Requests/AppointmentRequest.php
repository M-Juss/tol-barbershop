<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AppointmentRequest extends FormRequest
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
                'after_or_equal:today',
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
                'numeric',
                'min:0',
            ],

            'status' => [
                'nullable',
                Rule::in([
                    'pending',
                    'approved',
                    'completed',
                    'cancelled',
                    'no_show',
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
            ],

            'walkin_customer_contact_number' => [
                'required_if:is_walkin,true',
                'string',
                'min:7',
                'max:50',
            ],

            'notes' => [
                'nullable',
                'string',
                'max:500',
            ],

            'cancellation_reason' => [
                'nullable',
                'string',
            ],
        ];
    }
}
