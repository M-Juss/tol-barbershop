<?php

$frontendUrl = rtrim((string) env('FRONTEND_URL', 'http://localhost:3000'), '/');

return [
    'terms' => [
        'version' => '2026-07-14',
        'url' => $frontendUrl.'/terms-of-use',
    ],
    'privacy' => [
        'version' => '2026-07-14',
        'url' => $frontendUrl.'/privacy-policy',
    ],
];
