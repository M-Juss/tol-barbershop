@props([
    'url',
    'color' => 'primary',
    'align' => 'center',
])
@php
    $backgroundColor = match ($color) {
        'green', 'success' => '#16a34a',
        'red', 'error' => '#dc2626',
        default => '#18181b',
    };
@endphp
<table align="{{ $align }}" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin: 30px auto; text-align: {{ $align }}; width: 100%;">
<tr>
<td align="{{ $align }}">
<a href="{{ $url }}" target="_blank" rel="noopener" style="background-color: {{ $backgroundColor }}; border-radius: 6px; color: #ffffff; display: inline-block; font-size: 16px; font-weight: 600; line-height: 1.25; padding: 12px 24px; text-decoration: none;">{!! $slot !!}</a>
</td>
</tr>
</table>
