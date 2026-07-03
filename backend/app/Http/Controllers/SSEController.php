<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SSEController extends Controller
{
    public function stream(Request $request): StreamedResponse
    {
        $token = $this->resolveBearerToken($request);

        if (! $token) {
            return response()->stream(function () {
                echo "event: error\ndata: {\"message\":\"Unauthenticated\"}\n\n";
            }, 401, ['Content-Type' => 'text/event-stream']);
        }

        $accessToken = PersonalAccessToken::findToken($token);
        if (! $accessToken || ! $accessToken->tokenable) {
            return response()->stream(function () {
                echo "event: error\ndata: {\"message\":\"Invalid token\"}\n\n";
            }, 401, ['Content-Type' => 'text/event-stream']);
        }

        $accessToken->tokenable->withAccessToken($accessToken);

        $entityTypes = [
            'appointments',
            'barbers',
            'services',
            'admins',
            'notifications',
            'feedback',
            'closed_dates',
            'modules',
            'roles',
        ];

        $lastValues = [];

        return response()->stream(function () use ($entityTypes, &$lastValues) {
            while (true) {
                if (connection_aborted()) {
                    break;
                }

                foreach ($entityTypes as $type) {
                    $current = Cache::get("change:{$type}", 0);

                    if (! isset($lastValues[$type])) {
                        $lastValues[$type] = $current;

                        continue;
                    }

                    if ($current !== $lastValues[$type]) {
                        $lastValues[$type] = $current;
                        echo "event: {$type}\ndata: {}\n\n";
                        ob_flush();
                        flush();
                    }
                }

                sleep(2);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    private function resolveBearerToken(Request $request): ?string
    {
        $header = $request->header('Authorization', '');

        if (Str::startsWith($header, 'Bearer ')) {
            return Str::substr($header, 7);
        }

        return $request->query('token');
    }
}
