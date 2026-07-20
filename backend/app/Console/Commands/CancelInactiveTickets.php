<?php

namespace App\Console\Commands;

use App\Models\Notification;
use App\Models\SupportTicket;
use App\Support\DisplayId;
use App\Support\EntityChange;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CancelInactiveTickets extends Command
{
    protected $signature = 'support:cancel-inactive';

    protected $description = 'Cancel active support tickets with no messages for 5 minutes';

    public function handle(): void
    {
        $cutoff = Carbon::now()->subMinutes(5);

        $count = 0;
        SupportTicket::where('status', 'active')
            ->where('last_message_at', '<', $cutoff)
            ->select('id')
            ->chunkById(100, function ($tickets) use ($cutoff, &$count): void {
                foreach ($tickets as $ticketReference) {
                    $cancelled = DB::transaction(function () use ($ticketReference, $cutoff): bool {
                        $ticket = SupportTicket::whereKey($ticketReference->id)
                            ->where('status', 'active')
                            ->where('last_message_at', '<', $cutoff)
                            ->lockForUpdate()
                            ->first();

                        if (! $ticket) {
                            return false;
                        }

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

                        return true;
                    }, 3);

                    if ($cancelled) {
                        $count++;
                    }
                }
            });

        if ($count > 0) {
            EntityChange::dispatch('support_tickets');
            EntityChange::dispatch('notifications');
            $this->info("Cancelled {$count} inactive ticket(s).");
        }
    }
}
