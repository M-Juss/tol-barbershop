<?php

namespace App\Http\Controllers;

use App\Models\PushSubscription;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PushSubscriptionController extends Controller
{
    use ApiResponseTrait;

    public function subscribe(Request $request)
    {
        $authUser = $request->user();

        if (!$authUser) {
            return $this->error('Unauthorized.', [], 401);
        }

        $validator = Validator::make($request->all(), [
            'endpoint' => ['required', 'string'],
            'keys' => ['required', 'array'],
            'keys.p256dh' => ['required', 'string'],
            'keys.auth' => ['required', 'string'],
        ]);

        if ($validator->fails()) {
            return $this->error('Validation failed.', $validator->errors()->toArray(), 422);
        }

        PushSubscription::updateOrCreate(
            ['endpoint' => $request->endpoint],
            [
                'user_id' => $authUser->id,
                'endpoint' => $request->endpoint,
                'p256dh' => $request->keys['p256dh'],
                'auth' => $request->keys['auth'],
            ],
        );

        return $this->success('Subscribed to push notifications.');
    }

    public function unsubscribe(Request $request)
    {
        $authUser = $request->user();

        if (!$authUser) {
            return $this->error('Unauthorized.', [], 401);
        }

        PushSubscription::where('user_id', $authUser->id)
            ->where('endpoint', $request->endpoint)
            ->delete();

        return $this->success('Unsubscribed from push notifications.');
    }

    public function unsubscribeAll(Request $request)
    {
        $authUser = $request->user();

        if (!$authUser) {
            return $this->error('Unauthorized.', [], 401);
        }

        PushSubscription::where('user_id', $authUser->id)->delete();

        return $this->success('All subscriptions removed.');
    }
}
