<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\SanitizesInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BatchAppointmentRequest extends FormRequest
{
    use SanitizesInput;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->sanitizeTextFields(['notes']);

        if ($this->has('appointments')) {
            $appointments = $this->input('appointments');
            foreach ($appointments as $key => &$slot) {
                if (isset($slot['customer_name']) && is_string($slot['customer_name'])) {
                    $slot['customer_name'] = strip_tags(trim($slot['customer_name']));
                }
            }
            $this->merge(['appointments' => $appointments]);
        }
    }

    public function rules(): array
    {
        return [
            'barber_user_id' => [
                'required',
                Rule::exists('users', 'id')->where(function ($query) {
                    $query->where('role', 'barber');
                }),
            ],

            'appointment_date' => [
                'required',
                'date',
                'date_format:Y-m-d',
                'after_or_equal:today',
            ],

            'notes' => [
                'nullable',
                'string',
                'max:500',
            ],

            'appointments' => [
                'required',
                'array',
                'min:2',
                'max:11',
            ],

            'appointments.*.customer_name' => [
                'nullable',
                'string',
                'max:255',
                'regex:/^[A-Za-z\s]+$/',
            ],

            'appointments.*.service_id' => [
                'required',
                'exists:services,id',
            ],

            'appointments.*.appointment_time' => [
                'required',
                'date_format:H:i',
            ],

            'appointments.*.duration_minutes' => [
                'nullable',
                'integer',
                'min:1',
            ],

            'appointments.*.price' => [
                'required',
                'numeric',
                'min:0',
                'max:999999',
            ],
        ];
    }
}
