<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Notification;
use App\Models\SupportTicket;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NavigationSummaryController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role === 'customer') {
            $ticket = SupportTicket::query()
                ->where('customer_id', $user->id)
                ->whereIn('status', ['waiting', 'active', 'resolved'])
                ->orderByRaw("CASE WHEN status IN ('waiting', 'active') THEN 0 ELSE 1 END")
                ->latest()
                ->first(['id', 'status']);

            return $this->success('Navigation summary retrieved', [
                'unread_notifications' => Notification::query()
                    ->where('user_id', $user->id)
                    ->where('is_read', false)
                    ->count(),
                'support_ticket' => $ticket,
                'pending_appointments' => null,
                'waiting_support_tickets' => null,
            ]);
        }

        return $this->success('Navigation summary retrieved', [
            'unread_notifications' => null,
            'support_ticket' => null,
            'pending_appointments' => $user->canAccessModule('appointment')
                ? Appointment::query()->where('status', 'pending')->count()
                : null,
            'waiting_support_tickets' => $user->canAccessModule('customer-service')
                ? SupportTicket::query()->where('status', 'waiting')->count()
                : null,
        ]);
    }
}
