<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $this->replaceReferencePrefix('BK-', 'APT-');
    }

    public function down(): void
    {
        $this->replaceReferencePrefix('APT-', 'BK-');
    }

    private function replaceReferencePrefix(string $from, string $to): void
    {
        DB::table('notifications')
            ->orderBy('id')
            ->chunkById(100, function ($notifications) use ($from, $to): void {
                foreach ($notifications as $notification) {
                    $message = str_replace($from, $to, $notification->message);
                    $payload = $notification->payload
                        ? json_decode($notification->payload, true, 512, JSON_THROW_ON_ERROR)
                        : null;

                    if (is_array($payload) && isset($payload['booking_id']) && is_string($payload['booking_id'])) {
                        $payload['booking_id'] = str_replace($from, $to, $payload['booking_id']);
                    }

                    DB::table('notifications')
                        ->where('id', $notification->id)
                        ->update([
                            'message' => $message,
                            'payload' => $payload === null
                                ? null
                                : json_encode($payload, JSON_THROW_ON_ERROR),
                        ]);
                }
            });
    }
};
