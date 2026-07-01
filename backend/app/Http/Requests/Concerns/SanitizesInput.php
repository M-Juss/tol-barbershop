<?php

namespace App\Http\Requests\Concerns;

trait SanitizesInput
{
    protected function sanitizeStringFields(array $fields): void
    {
        $clean = [];

        foreach ($fields as $field) {
            if ($this->has($field)) {
                $clean[$field] = $this->sanitizeSingleLine($this->input($field));
            }
        }

        if ($clean !== []) {
            $this->merge($clean);
        }
    }

    protected function sanitizeTextFields(array $fields): void
    {
        $clean = [];

        foreach ($fields as $field) {
            if ($this->has($field)) {
                $clean[$field] = $this->sanitizeMultiline($this->input($field));
            }
        }

        if ($clean !== []) {
            $this->merge($clean);
        }
    }

    protected function normalizeEmailFields(array $fields): void
    {
        $clean = [];

        foreach ($fields as $field) {
            if ($this->has($field) && is_string($this->input($field))) {
                $clean[$field] = mb_strtolower(trim($this->input($field)));
            }
        }

        if ($clean !== []) {
            $this->merge($clean);
        }
    }

    protected function normalizePhoneFields(array $fields): void
    {
        $clean = [];

        foreach ($fields as $field) {
            if ($this->has($field) && is_string($this->input($field))) {
                $clean[$field] = preg_replace('/\D/', '', trim($this->input($field)));
            }
        }

        if ($clean !== []) {
            $this->merge($clean);
        }
    }

    private function sanitizeSingleLine(mixed $value): mixed
    {
        if (! is_string($value)) {
            return $value;
        }

        $value = strip_tags($value);
        $value = preg_replace('/[\x00-\x1F\x7F]/u', '', $value) ?? $value;
        $value = preg_replace('/\s+/u', ' ', $value) ?? $value;

        return trim($value);
    }

    private function sanitizeMultiline(mixed $value): mixed
    {
        if (! is_string($value)) {
            return $value;
        }

        $value = strip_tags($value);
        $value = str_replace(["\r\n", "\r"], "\n", $value);
        $value = preg_replace('/[^\P{C}\n\t]/u', '', $value) ?? $value;
        $value = preg_replace("/[ \t]+/u", ' ', $value) ?? $value;

        return trim($value);
    }
}
