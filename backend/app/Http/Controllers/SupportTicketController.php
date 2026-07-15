<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Models\SupportMessage;
use App\Models\SupportTicket;
use App\Models\User;
use App\Services\PushNotificationService;
use App\Support\DisplayId;
use App\Support\EntityChange;
use App\Traits\ApiResponseTrait;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SupportTicketController extends Controller
{
    use ApiResponseTrait;

    public function index(Request $request)
    {
        $user = $request->user();

        if ($user->role === 'customer') {
            $validated = $request->validate([
                'view' => ['nullable', 'in:state'],
            ]);

            if (($validated['view'] ?? null) === 'state') {
                $ticket = SupportTicket::where('customer_id', $user->id)
                    ->whereIn('status', ['waiting', 'active', 'resolved'])
                    ->orderByRaw("CASE WHEN status IN ('waiting', 'active') THEN 0 ELSE 1 END")
                    ->latest()
                    ->first(['id', 'status']);

                return $this->success('Ticket state retrieved successfully', $ticket);
            }

            $tickets = SupportTicket::with([
                'customer:id,fullname,email,image',
                'assignedTo:id,fullname',
                'messagesAsc.sender:id,fullname,role,image',
            ])
                ->where('customer_id', $user->id)
                ->latest()
                ->get();

            return $this->success('Tickets retrieved successfully', $tickets);
        }

        if (! in_array($user->role, ['admin', 'manager'], true)) {
            abort(403, 'Forbidden.');
        }

        $tickets = SupportTicket::with([
            'customer:id,fullname,email,image',
            'assignedTo:id,fullname',
        ])
            ->latest()
            ->get();

        return $this->success('Tickets retrieved successfully', $tickets);
    }

    public function show(Request $request, string $id)
    {
        $user = $request->user();

        $ticket = SupportTicket::with([
            'customer:id,fullname,email,image',
            'assignedTo:id,fullname',
            'messagesAsc.sender:id,fullname,role,image',
        ])->findOrFail($id);

        if ($user->role === 'customer' && (int) $ticket->customer_id !== (int) $user->id) {
            abort(403, 'Forbidden.');
        }

        if (! in_array($user->role, ['admin', 'manager', 'customer'], true)) {
            abort(403, 'Forbidden.');
        }

        return $this->success('Ticket retrieved successfully', $ticket);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        if ($user->role !== 'customer') {
            abort(403, 'Forbidden.');
        }

        $validated = $request->validate([
            'category' => ['required', 'string', 'max:50'],
            'message' => ['required', 'string', 'max:5000'],
        ]);

        $hasActiveOrWaiting = SupportTicket::where('customer_id', $user->id)
            ->whereIn('status', ['active', 'waiting'])
            ->exists();

        if ($hasActiveOrWaiting) {
            return $this->error('You already have an active or waiting ticket.', [], 422);
        }

        $status = 'waiting';

        DB::beginTransaction();

        try {
            $ticket = SupportTicket::create([
                'customer_id' => $user->id,
                'status' => $status,
                'category' => $validated['category'],
                'queued_at' => Carbon::now(),
                'customer_name_snapshot' => $user->fullname,
            ]);

            SupportMessage::create([
                'support_ticket_id' => $ticket->id,
                'sender_id' => $user->id,
                'sender_name_snapshot' => $user->fullname,
                'message' => $validated['message'],
            ]);

            $ticket->update(['last_message_at' => Carbon::now()]);

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();

            return $this->error('Failed to create ticket. Please try again.', [], 500);
        }

        $adminUsers = User::whereIn('role', ['admin', 'manager'])->get();
        $ticketId = DisplayId::ticket($ticket->id);

        foreach ($adminUsers as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'type' => 'new_support_ticket',
                'title' => 'New Support Ticket',
                'message' => sprintf(
                    '%s has submitted support ticket %s.',
                    $user->fullname,
                    $ticketId
                ),
                'payload' => [
                    'ticket_id' => $ticket->id,
                    'ticket_display_id' => $ticketId,
                    'customer_name' => $user->fullname,
                ],
                'created_by_user_id' => $user->id,
            ]);
        }

        try {
            $pushService = new PushNotificationService;

            foreach ($adminUsers as $admin) {
                $pushService->send($admin, [
                    'title' => 'New Support Ticket',
                    'body' => sprintf(
                        '%s has submitted support ticket %s.',
                        $user->fullname,
                        $ticketId
                    ),
                    'icon' => '/Tol-Logo-White-Bg.png',
                    'badge' => '/Tol-Logo-White-Bg.png',
                    'data' => [
                        'url' => '/'.$admin->role.'/customer-service',
                        'ticket_id' => $ticket->id,
                    ],
                ]);
            }
        } catch (\Exception $e) {
            logger()->error('Push notification failed: '.$e->getMessage());
        }

        EntityChange::dispatch('support_tickets');
        EntityChange::dispatch('notifications');

        $ticket->load([
            'customer:id,fullname,email,image',
            'assignedTo:id,fullname',
            'messagesAsc.sender:id,fullname,role,image',
        ]);

        return $this->created('Ticket created successfully', $ticket);
    }

    public function cancel(Request $request, string $id)
    {
        $user = $request->user();

        $ticket = SupportTicket::findOrFail($id);
        $ticketId = DisplayId::ticket($ticket->id);

        if ($user->role === 'customer') {
            if ((int) $ticket->customer_id !== (int) $user->id) {
                abort(403, 'Forbidden.');
            }

            if ($ticket->status !== 'waiting') {
                return $this->error('Only waiting tickets can be cancelled.', [], 422);
            }

            $ticket->update(['status' => 'cancelled']);
        } elseif (in_array($user->role, ['admin', 'manager'], true)) {
            if ((int) $ticket->assigned_to_id !== (int) $user->id) {
                return $this->error('This ticket is not assigned to you.', [], 403);
            }

            if ($ticket->status !== 'active') {
                return $this->error('Only active tickets can be cancelled.', [], 422);
            }

            $validated = $request->validate([
                'cancel_reason' => ['required', 'string', 'max:5000'],
            ]);

            $ticket->update([
                'status' => 'cancelled',
                'cancel_reason' => $validated['cancel_reason'],
                'resolved_at' => Carbon::now(),
            ]);

            Notification::create([
                'user_id' => $ticket->customer_id,
                'type' => 'ticket_cancelled',
                'title' => 'Ticket Cancelled',
                'message' => "Your support ticket {$ticketId} has been cancelled by a staff member.",
                'payload' => [
                    'ticket_id' => $ticket->id,
                    'ticket_display_id' => $ticketId,
                    'cancel_reason' => $validated['cancel_reason'],
                ],
                'created_by_user_id' => $user->id,
            ]);
        } else {
            abort(403, 'Forbidden.');
        }

        EntityChange::dispatch('support_tickets');

        return $this->noData('Ticket cancelled successfully');
    }

    public function accept(Request $request, string $id)
    {
        $user = $request->user();

        if (! in_array($user->role, ['admin', 'manager'], true)) {
            abort(403, 'Forbidden.');
        }

        $ticket = SupportTicket::findOrFail($id);

        if ($ticket->status !== 'waiting') {
            return $this->error('Only waiting tickets can be accepted.', [], 422);
        }

        $hasActiveTicket = SupportTicket::where('assigned_to_id', $user->id)
            ->where('status', 'active')
            ->exists();

        if ($hasActiveTicket) {
            return $this->error('You already have an active ticket. Resolve it first.', [], 422);
        }

        $queuePosition = SupportTicket::where('status', 'waiting')
            ->where('created_at', '<', $ticket->created_at)
            ->count() + 1;

        $ticket->update([
            'assigned_to_id' => $user->id,
            'assigned_staff_name_snapshot' => $user->fullname,
            'status' => 'active',
            'claimed_at' => Carbon::now(),
        ]);

        $ticketId = DisplayId::ticket($ticket->id);

        SupportMessage::create([
            'support_ticket_id' => $ticket->id,
            'sender_id' => $user->id,
            'sender_name_snapshot' => $user->fullname,
            'message' => "Ticket {$ticketId} has been accepted. A representative is now here to assist you.",
        ]);

        $ticket->update(['last_message_at' => Carbon::now()]);

        Notification::create([
            'user_id' => $ticket->customer_id,
            'type' => 'ticket_promoted',
            'title' => 'Your Turn!',
            'message' => "Your ticket {$ticketId} has been accepted. A representative has joined the conversation.",
            'payload' => [
                'ticket_id' => $ticket->id,
                'ticket_display_id' => $ticketId,
            ],
            'created_by_user_id' => $user->id,
        ]);

        try {
            $pushService = new PushNotificationService;
            $pushService->send($ticket->customer, [
                'title' => 'Your Turn!',
                'body' => "Your ticket {$ticketId} has been accepted. A representative has joined the conversation.",
                'icon' => '/Tol-Logo-White-Bg.png',
                'badge' => '/Tol-Logo-White-Bg.png',
                'data' => [
                    'url' => '/customer',
                    'ticket_id' => $ticket->id,
                ],
            ]);
        } catch (\Exception $e) {
            logger()->error('Push notification failed: '.$e->getMessage());
        }

        EntityChange::dispatch('support_tickets');

        $ticket->load([
            'customer:id,fullname,email,image',
            'assignedTo:id,fullname',
            'messagesAsc.sender:id,fullname,role,image',
        ]);

        return $this->success('Ticket accepted successfully', $ticket);
    }

    public function resolve(Request $request, string $id)
    {
        $user = $request->user();

        if (! in_array($user->role, ['admin', 'manager'], true)) {
            abort(403, 'Forbidden.');
        }

        $ticket = SupportTicket::with('customer')->findOrFail($id);
        $ticketId = DisplayId::ticket($ticket->id);

        if ((int) $ticket->assigned_to_id !== (int) $user->id) {
            return $this->error('This ticket is not assigned to you.', [], 403);
        }

        if ($ticket->status !== 'active') {
            return $this->error('Only active tickets can be resolved.', [], 422);
        }

        $validated = $request->validate([
            'resolution_notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $ticket->update([
            'status' => 'resolved',
            'resolution_notes' => $validated['resolution_notes'] ?? null,
            'resolved_at' => Carbon::now(),
        ]);

        Notification::create([
            'user_id' => $ticket->customer_id,
            'type' => 'ticket_resolved',
            'title' => 'Ticket Resolved',
            'message' => "Your support ticket {$ticketId} has been resolved.",
            'payload' => [
                'ticket_id' => $ticket->id,
                'ticket_display_id' => $ticketId,
            ],
            'created_by_user_id' => $user->id,
        ]);

        try {
            $pushService = new PushNotificationService;
            $pushService->send($ticket->customer, [
                'title' => 'Ticket Resolved',
                'body' => "Your support ticket {$ticketId} has been resolved.",
                'icon' => '/Tol-Logo-White-Bg.png',
                'badge' => '/Tol-Logo-White-Bg.png',
                'data' => [
                    'url' => '/customer',
                    'ticket_id' => $ticket->id,
                ],
            ]);
        } catch (\Exception $e) {
            logger()->error('Push notification failed: '.$e->getMessage());
        }

        EntityChange::dispatch('support_tickets');

        return $this->success('Ticket resolved successfully', $ticket);
    }

    public function sendMessage(Request $request, string $id)
    {
        $user = $request->user();

        $ticket = SupportTicket::findOrFail($id);

        if ($ticket->status !== 'active') {
            return $this->error('Cannot send messages to a non-active ticket.', [], 422);
        }

        if ($user->role === 'customer') {
            if ((int) $ticket->customer_id !== (int) $user->id) {
                abort(403, 'Forbidden.');
            }
        } elseif (in_array($user->role, ['admin', 'manager'], true)) {
            if ((int) $ticket->assigned_to_id !== (int) $user->id) {
                return $this->error('This ticket is not assigned to you.', [], 403);
            }
        } else {
            abort(403, 'Forbidden.');
        }

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:5000'],
        ]);

        $message = SupportMessage::create([
            'support_ticket_id' => $ticket->id,
            'sender_id' => $user->id,
            'sender_name_snapshot' => $user->fullname,
            'message' => $validated['message'],
        ]);

        $ticket->update(['last_message_at' => Carbon::now()]);

        $message->load('sender:id,fullname,role,image');

        EntityChange::dispatch('support_tickets');

        return $this->created('Message sent successfully', $message);
    }

    public function getMessages(Request $request, string $id)
    {
        $user = $request->user();

        $ticket = SupportTicket::findOrFail($id);

        if ($user->role === 'customer' && (int) $ticket->customer_id !== (int) $user->id) {
            abort(403, 'Forbidden.');
        }

        if (! in_array($user->role, ['admin', 'manager', 'customer'], true)) {
            abort(403, 'Forbidden.');
        }

        $validated = $request->validate([
            'after_id' => ['nullable', 'integer', 'min:0'],
        ]);

        $messages = SupportMessage::with('sender:id,fullname,role,image')
            ->where('support_ticket_id', $ticket->id)
            ->when(
                isset($validated['after_id']),
                fn ($query) => $query->where('id', '>', $validated['after_id'])
            )
            ->oldest('id')
            ->get();

        return $this->success('Messages retrieved successfully', $messages);
    }

    public function queue(Request $request)
    {
        $user = $request->user();

        if (! in_array($user->role, ['admin', 'manager'], true)) {
            abort(403, 'Forbidden.');
        }

        $validated = $request->validate([
            'view' => ['nullable', 'in:live,history'],
            'updated_after' => ['nullable', 'date'],
        ]);
        $view = $validated['view'] ?? null;
        $historyCheckedAt = Carbon::now();
        $historyUpdatedAfter = isset($validated['updated_after'])
            ? Carbon::parse($validated['updated_after'])->subSecond()
            : null;

        $waiting = $view === 'history'
            ? collect()
            : SupportTicket::with(['customer:id,fullname'])
                ->where('status', 'waiting')
                ->oldest('created_at')
                ->get();

        $active = $view === 'history'
            ? collect()
            : SupportTicket::with([
                'customer:id,fullname',
                'assignedTo:id,fullname',
            ])
                ->where('status', 'active')
                ->oldest('claimed_at')
                ->get();

        $resolved = $view === 'live'
            ? collect()
            : SupportTicket::with([
                'customer:id,fullname',
                'assignedTo:id,fullname',
            ])
                ->where('status', 'resolved')
                ->when(
                    $historyUpdatedAfter,
                    fn ($query) => $query->where('updated_at', '>=', $historyUpdatedAfter)
                )
                ->latest('resolved_at')
                ->get();

        $cancelled = $view === 'live'
            ? collect()
            : SupportTicket::with([
                'customer:id,fullname',
                'assignedTo:id,fullname',
            ])
                ->where('status', 'cancelled')
                ->when(
                    $historyUpdatedAfter,
                    fn ($query) => $query->where('updated_at', '>=', $historyUpdatedAfter)
                )
                ->latest('resolved_at')
                ->get();

        return $this->success('Queue retrieved successfully', [
            'waiting' => $waiting,
            'active' => $active,
            'resolved' => $resolved,
            'cancelled' => $cancelled,
            'checked_at' => $historyCheckedAt->toIso8601String(),
        ]);
    }

    public function waitingCount(Request $request)
    {
        $user = $request->user();

        if (! in_array($user->role, ['admin', 'manager'], true)) {
            abort(403, 'Forbidden.');
        }

        $count = SupportTicket::where('status', 'waiting')->count();

        return response()->json([
            'success' => true,
            'data' => [
                'count' => $count,
            ],
        ]);
    }

    public function customerTickets(Request $request, string $customerId)
    {
        $user = $request->user();

        if (! in_array($user->role, ['admin', 'manager'], true)) {
            abort(403, 'Forbidden.');
        }

        $tickets = SupportTicket::with([
            'assignedTo:id,fullname',
            'messagesAsc.sender:id,fullname,role,image',
        ])
            ->where('customer_id', $customerId)
            ->latest()
            ->get();

        return $this->success('Customer tickets retrieved successfully', $tickets);
    }
}
