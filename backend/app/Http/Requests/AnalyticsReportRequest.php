<?php

namespace App\Http\Requests;

use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AnalyticsReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $today = Carbon::today(config('app.shop_timezone', 'Asia/Manila'))->toDateString();

        return [
            'section' => ['sometimes', 'string', Rule::in([
                'overview', 'revenue', 'appointments', 'services', 'barbers', 'customers', 'all',
            ])],
            'period' => ['sometimes', 'string', Rule::in([
                'daily', 'weekly', 'monthly', 'yearly',
                '7_days', '30_days', '3_months', '6_months', '12_months',
                'custom',
            ])],
            'start_date' => [
                'required_if:period,custom',
                'nullable',
                'date_format:Y-m-d',
                'before_or_equal:end_date',
            ],
            'end_date' => [
                'required_if:period,custom',
                'nullable',
                'date_format:Y-m-d',
                'after_or_equal:start_date',
                'before_or_equal:'.$today,
            ],
            'comparison' => ['sometimes', 'string', Rule::in(['none', 'previous', 'previous_year'])],
        ];
    }

    public function section(): string
    {
        return $this->validated('section', 'overview');
    }

    public function period(): string
    {
        return $this->validated('period', '7_days');
    }

    public function comparison(): string
    {
        return $this->validated('comparison', 'none');
    }
}
