<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\SanitizesInput;
use App\Models\ClosedDates;
use Carbon\Carbon;
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
        $isWalkin = (bool) $this->boolean('is_walkin');

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
                'required',
                'date',
                function ($attribute, $value, $fail) use ($isWalkin) {
                    if (! $isWalkin) {
                        return;
                    }

                    $shopTimezone = (string) config('app.shop_timezone', 'Asia/Manila');
                    $todayStr = Carbon::now($shopTimezone)->format('Y-m-d');

                    if ($value > $todayStr) {
                        $fail('Walk-in date cannot be in the future.');

                        return;
                    }

                    $date = Carbon::parse($value, $shopTimezone);
                    if ($date->isSunday()) {
                        $fail('The barbershop is closed on Sundays.');

                        return;
                    }

                    $barberUserId = (int) $this->input('barber_user_id');
                    $isClosed = ClosedDates::where('date_closed', $value)
                        ->where('is_removed', false)
                        ->where(function ($query) use ($barberUserId): void {
                            $query
                                ->where('closure_scope', 'shop')
                                ->orWhere(function ($barberQuery) use ($barberUserId): void {
                                    $barberQuery
                                        ->where('closure_scope', 'barber')
                                        ->where('barber_user_id', $barberUserId);
                                });
                        })
                        ->exists();

                    if ($isClosed) {
                        $fail('The selected barber is unavailable on this date.');
                    }
                },
            ],

            'appointment_time' => [
                'required',
                'date_format:H:i',
                function ($attribute, $value, $fail) use ($isWalkin) {
                    if (! $isWalkin) {
                        return;
                    }

                    if (preg_match('/^(09|1[0-1]):00$|^12:30$|^(1[3-9]):00$/', $value) !== 1) {
                        $fail('Appointment time must be on the hour from 09:00 through 19:00.');
                    }
                },
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
                'min:2',
                'max:255',
                'regex:/^[A-Za-z\s]+$/',
            ],

            'walkin_customer_contact_number' => [
                'nullable',
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
                'required_if:status,cancelled,rejected',
                'nullable',
                'string',
                'max:500',
            ],
        ];
    }
}
