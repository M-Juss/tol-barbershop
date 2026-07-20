<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\SupportTicket;
use App\Support\DisplayId;
use App\Support\EntityChange;
use Illuminate\Support\Facades\DB;

class SupportTicketAssignmentService
{
    public function requeueAssignedTickets(int $staffId): int
    {
        $count = DB::transaction(function () use ($staffId): int {
            $tickets = SupportTicket::query()
                ->where('assigned_to_id', $staffId)
                ->where('status', 'active')
                ->orderBy('id')
                ->lockForUpdate()
                ->get();
            $now = now();

            foreach ($tickets as $ticket) {
                $ticket->update([
                    'assigned_to_id' => null,
                    'assigned_staff_name_snapshot' => null,
                    'status' => 'waiting',
                    'queued_at' => $now,
                    'claimed_at' => null,
                ]);

                Notification::create([
                    'user_id' => $ticket->customer_id,
                    'type' => 'ticket_requeued',
                    'title' => 'Support Ticket Requeued',
                    'message' => sprintf(
                        'Your support ticket %s was returned to the queue and will be assigned to another representative.',
                        DisplayId::ticket($ticket->id),
                    ),
                    'payload' => [
                        'ticket_id' => $ticket->id,
                        'ticket_display_id' => DisplayId::ticket($ticket->id),
                    ],
                ]);
            }

            return $tickets->count();
        }, 3);

        if ($count > 0) {
            EntityChange::dispatch('support_tickets');
            EntityChange::dispatch('notifications');
        }

        return $count;
    }
}
