<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\SanitizesInput;
use Carbon\Carbon;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ClosedDatesRequest extends FormRequest
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
        $this->sanitizeTextFields(['reason']);

        if (! $this->has('closure_scope')) {
            $this->merge(['closure_scope' => 'shop']);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $today = Carbon::today((string) config('app.shop_timezone', 'Asia/Manila'))->toDateString();

        return [
            'date_closed' => [
                'required',
                'date_format:Y-m-d',
                'after_or_equal:'.$today,
            ],
            'closure_scope' => ['required', Rule::in(['shop', 'barber'])],
            'barber_user_id' => [
                Rule::requiredIf($this->input('closure_scope') === 'barber'),
                'nullable',
                'integer',
                Rule::exists('users', 'id')->where(fn ($query) => $query
                    ->where('role', 'barber')
                    ->where('is_active', true)),
            ],
            'reason' => ['required', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'date_closed.required' => 'Date is required',
            'date_closed.date_format' => 'Date must use the Y-m-d format',
            'date_closed.after_or_equal' => 'Closed dates cannot be in the past',
            'closure_scope.required' => 'Closure type is required',
            'barber_user_id.required' => 'Barber is required',
            'reason.required' => 'Reason is required',
            'reason.string' => 'Reason must be a string',
        ];
    }
}
