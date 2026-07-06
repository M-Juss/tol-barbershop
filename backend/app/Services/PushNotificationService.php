<?php

namespace App\Services;

use App\Models\PushSubscription;
use App\Models\User;
use App\Support\PushEndpointValidator;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

class PushNotificationService
{
    private WebPush $webPush;

    public function __construct()
    {
        $auth = [
            'VAPID' => [
                'subject' => env('VAPID_SUBJECT', 'mailto:admin@tolbarbershop.com'),
                'publicKey' => env('VAPID_PUBLIC_KEY'),
                'privateKey' => env('VAPID_PRIVATE_KEY'),
            ],
        ];

        $this->webPush = new WebPush($auth);
    }

    public function send(User $user, array $payload): void
    {
        $subscriptions = PushSubscription::where('user_id', $user->id)->get();

        if ($subscriptions->isEmpty()) {
            return;
        }

        $data = json_encode($payload);

        foreach ($subscriptions as $sub) {
            if (! PushEndpointValidator::validate($sub->endpoint)) {
                $sub->delete();

                continue;
            }

            $subscription = Subscription::create([
                'endpoint' => $sub->endpoint,
                'publicKey' => $sub->p256dh,
                'authToken' => $sub->auth,
            ]);

            $this->webPush->queueNotification($subscription, $data);
        }

        $reports = $this->webPush->flush();

        foreach ($reports as $report) {
            if ($report->isSubscriptionExpired()) {
                PushSubscription::where('endpoint', $report->getEndpoint())->delete();
            }
        }
    }
}
