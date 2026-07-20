<?php

$allowedOrigins = array_values(array_filter([
    env('FRONTEND_URL', 'http://localhost:3000'),
    env('NGROK_URL'),
], fn ($origin): bool => is_string($origin) && $origin !== ''));

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Settings for cross-origin requests. Credentials must be enabled to
    | support cookie-based authentication with Sanctum SPA.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => $allowedOrigins,

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
