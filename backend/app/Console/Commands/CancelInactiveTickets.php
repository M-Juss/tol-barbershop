<?php

namespace App\Console\Commands;

use App\Models\Notification;
use App\Models\SupportTicket;
use App\Support\DisplayId;
use Carbon\Carbon;
use Illuminate\Console\Command;

class CancelInactiveTickets extends Command
{
    protected $signature = 'support:cancel-inactive';

    protected $description = 'Cancel active support tickets with no messages for 5 minutes';

    public function handle(): void
    {
        $cutoff = Carbon::now()->subMinutes(5);

        $tickets = SupportTicket::where('status', 'active')
            ->where('last_message_at', '<', $cutoff)
            ->get();

        foreach ($tickets as $ticket) {
            $ticketId = DisplayId::ticket($ticket->id);

            $ticket->update([
                'status' => 'cancelled',
                'subject' => 'Auto-cancelled due to inactivity',
                'resolved_at' => Carbon::now(),
            ]);

            Notification::create([
                'user_id' => $ticket->customer_id,
                'type' => 'ticket_cancelled',
                'title' => 'Ticket Cancelled',
                'message' => "Your support ticket {$ticketId} was cancelled due to inactivity for 5 minutes. Please create a new ticket if you still need assistance.",
                'payload' => [
                    'ticket_id' => $ticket->id,
                    'ticket_display_id' => $ticketId,
                ],
            ]);

            if ($ticket->assigned_to_id) {
                Notification::create([
                    'user_id' => $ticket->assigned_to_id,
                    'type' => 'ticket_cancelled',
                    'title' => 'Ticket Cancelled',
                    'message' => "Support ticket {$ticketId} was auto-cancelled due to inactivity.",
                    'payload' => [
                        'ticket_id' => $ticket->id,
                        'ticket_display_id' => $ticketId,
                    ],
                ]);
            }
        }

        $count = $tickets->count();

        if ($count > 0) {
            $this->info("Cancelled {$count} inactive ticket(s).");
        }
    }
}
