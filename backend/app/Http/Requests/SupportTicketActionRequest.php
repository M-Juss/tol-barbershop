<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\SanitizesInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SupportTicketActionRequest extends FormRequest
{
    use SanitizesInput;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->sanitizeStringFields(['category']);
        $this->sanitizeTextFields(['message', 'cancel_reason', 'resolution_notes']);
    }

    public function rules(): array
    {
        return match ($this->route()?->getActionMethod()) {
            'store' => [
                'category' => [
                    'required',
                    'string',
                    Rule::in([
                        'appointment_rescheduling',
                        'cancellation',
                        'service_feedback',
                        'billing',
                        'general_inquiry',
                    ]),
                ],
                'message' => ['required', 'string', 'max:5000'],
            ],
            'sendMessage' => [
                'message' => ['required', 'string', 'max:5000'],
            ],
            'cancel' => [
                'cancel_reason' => in_array($this->user()?->role, ['admin', 'manager'], true)
                    ? ['required', 'string', 'max:5000']
                    : ['prohibited'],
            ],
            'resolve' => [
                'resolution_notes' => ['nullable', 'string', 'max:5000'],
            ],
            default => [],
        };
    }
}
