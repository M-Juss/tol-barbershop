<?php

namespace App\Console\Commands;

use App\Models\SupportTicket;
use App\Models\Notification;
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
            $ticket->update([
                'status' => 'cancelled',
                'subject' => 'Auto-cancelled due to inactivity',
                'resolved_at' => Carbon::now(),
            ]);

            Notification::create([
                'user_id' => $ticket->customer_id,
                'type' => 'ticket_cancelled',
                'title' => 'Ticket Cancelled',
                'message' => 'Your support ticket was cancelled due to inactivity for 5 minutes. Please create a new ticket if you still need assistance.',
                'payload' => [
                    'ticket_id' => $ticket->id,
                ],
            ]);

            if ($ticket->assigned_to_id) {
                Notification::create([
                    'user_id' => $ticket->assigned_to_id,
                    'type' => 'ticket_cancelled',
                    'title' => 'Ticket Cancelled',
                    'message' => 'A support ticket was auto-cancelled due to inactivity.',
                    'payload' => [
                        'ticket_id' => $ticket->id,
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
