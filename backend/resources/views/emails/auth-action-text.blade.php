TOL Barbershop

{!! $heading !!}

Hi {!! $customerName !!},

{!! $intro !!}

{!! $actionText !!}:
{!! $actionUrl !!}

For your security, this link expires in {!! $expiresIn !!} minutes.
{!! $securityMessage !!}

Privacy: {{ rtrim((string) config('app.frontend_url'), '/') }}/privacy-policy
Terms: {{ rtrim((string) config('app.frontend_url'), '/') }}/terms-of-use
Data Compliance: {{ rtrim((string) config('app.frontend_url'), '/') }}/data-compliance

(c) {{ date('Y') }} TOL Barbershop. All rights reserved.
