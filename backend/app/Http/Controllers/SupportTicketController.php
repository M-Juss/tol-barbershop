<?php

namespace App\Http\Controllers;

use App\Http\Requests\SupportTicketActionRequest;
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
                'page' => ['nullable', 'integer', 'min:1'],
                'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
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
                'customer:id,fullname,email',
                'assignedTo:id,fullname',
            ])
                ->where('customer_id', $user->id)
                ->latest()
                ->paginate(
                    (int) ($validated['per_page'] ?? 20),
                    ['*'],
                    'page',
                    (int) ($validated['page'] ?? 1),
                );

            return $this->success('Tickets retrieved successfully', [
                'tickets' => $tickets->items(),
                'meta' => [
                    'current_page' => $tickets->currentPage(),
                    'last_page' => $tickets->lastPage(),
                    'per_page' => $tickets->perPage(),
                    'total' => $tickets->total(),
                ],
            ]);
        }

        if (! in_array($user->role, ['admin', 'manager'], true)) {
            abort(403, 'Forbidden.');
        }

        $tickets = SupportTicket::with([
            'customer:id,fullname,email',
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
            'customer:id,fullname,email',
            'assignedTo:id,fullname',
            'messagesAsc.sender:id,fullname,role',
        ])->findOrFail($id);

        if ($user->role === 'customer' && (int) $ticket->customer_id !== (int) $user->id) {
            abort(403, 'Forbidden.');
        }

        if (! in_array($user->role, ['admin', 'manager', 'customer'], true)) {
            abort(403, 'Forbidden.');
        }

        return $this->success('Ticket retrieved successfully', $ticket);
    }

    public function store(SupportTicketActionRequest $request)
    {
        $user = $request->user();

        if ($user->role !== 'customer') {
            abort(403, 'Forbidden.');
        }

        $validated = $request->validated();

        try {
            $ticket = DB::transaction(function () use ($user, $validated): ?SupportTicket {
                User::whereKey($user->id)->lockForUpdate()->firstOrFail();

                $hasActiveOrWaiting = SupportTicket::where('customer_id', $user->id)
                    ->whereIn('status', ['active', 'waiting'])
                    ->exists();

                if ($hasActiveOrWaiting) {
                    return null;
                }

                $now = Carbon::now();
                $ticket = SupportTicket::create([
                    'customer_id' => $user->id,
                    'status' => 'waiting',
                    'category' => $validated['category'],
                    'queued_at' => $now,
                    'last_message_at' => $now,
                    'customer_name_snapshot' => $user->fullname,
                ]);

                SupportMessage::create([
                    'support_ticket_id' => $ticket->id,
                    'sender_id' => $user->id,
                    'sender_name_snapshot' => $user->fullname,
                    'message' => $validated['message'],
                ]);

                return $ticket;
            }, 3);
        } catch (\Exception $e) {
            return $this->error('Failed to create ticket. Please try again.', [], 500);
        }

        if (! $ticket) {
            return $this->error('You already have an active or waiting ticket.', [], 422);
        }

        $adminUsers = User::activeStaffForModule('customer-service')->get();
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
            'customer:id,fullname,email',
            'assignedTo:id,fullname',
            'messagesAsc.sender:id,fullname,role',
        ]);

        return $this->created('Ticket created successfully', $ticket);
    }

    public function cancel(SupportTicketActionRequest $request, string $id)
    {
        $user = $request->user();
        $validated = $request->validated();

        if (! in_array($user->role, ['customer', 'admin', 'manager'], true)) {
            abort(403, 'Forbidden.');
        }

        $result = DB::transaction(function () use ($id, $user, $validated): array {
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $ticket = SupportTicket::whereKey($id)->lockForUpdate()->firstOrFail();
            $ticketId = DisplayId::ticket($ticket->id);

            if ($user->role === 'customer') {
                if ((int) $ticket->customer_id !== (int) $user->id) {
                    abort(403, 'Forbidden.');
                }

                $updated = SupportTicket::whereKey($ticket->id)
                    ->where('status', 'waiting')
                    ->update([
                        'status' => 'cancelled',
                        'resolved_at' => Carbon::now(),
                        'updated_at' => Carbon::now(),
                    ]);

                return $updated === 1
                    ? ['cancelled' => true]
                    : ['error' => 'Only waiting tickets can be cancelled.', 'status' => 422];
            }

            if ((int) $ticket->assigned_to_id !== (int) $user->id) {
                return ['error' => 'This ticket is not assigned to you.', 'status' => 403];
            }

            $updated = SupportTicket::whereKey($ticket->id)
                ->where('status', 'active')
                ->where('assigned_to_id', $user->id)
                ->update([
                    'status' => 'cancelled',
                    'cancel_reason' => $validated['cancel_reason'],
                    'resolved_at' => Carbon::now(),
                    'updated_at' => Carbon::now(),
                ]);

            if ($updated !== 1) {
                return ['error' => 'Only active tickets can be cancelled.', 'status' => 422];
            }

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

            return ['cancelled' => true];
        }, 3);

        if (isset($result['error'])) {
            return $this->error($result['error'], [], $result['status']);
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

        $result = DB::transaction(function () use ($id, $user): array {
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $ticket = SupportTicket::whereKey($id)->lockForUpdate()->firstOrFail();

            if ($ticket->status !== 'waiting') {
                return ['error' => 'Only waiting tickets can be accepted.'];
            }

            $hasActiveTicket = SupportTicket::where('assigned_to_id', $user->id)
                ->where('status', 'active')
                ->exists();

            if ($hasActiveTicket) {
                return ['error' => 'You already have an active ticket. Resolve it first.'];
            }

            $ticketId = DisplayId::ticket($ticket->id);
            $now = Carbon::now();
            $claimed = SupportTicket::whereKey($ticket->id)
                ->where('status', 'waiting')
                ->update([
                    'assigned_to_id' => $user->id,
                    'assigned_staff_name_snapshot' => $user->fullname,
                    'status' => 'active',
                    'claimed_at' => $now,
                    'last_message_at' => $now,
                    'updated_at' => $now,
                ]);

            if ($claimed !== 1) {
                return ['error' => 'Only waiting tickets can be accepted.'];
            }

            SupportMessage::create([
                'support_ticket_id' => $ticket->id,
                'sender_id' => $user->id,
                'sender_name_snapshot' => $user->fullname,
                'message' => "Ticket {$ticketId} has been accepted. A representative is now here to assist you.",
            ]);

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

            $ticket->refresh();

            return [
                'ticket' => $ticket,
                'ticket_id' => $ticketId,
            ];
        }, 3);

        if (isset($result['error'])) {
            return $this->error($result['error'], [], 422);
        }

        /** @var SupportTicket $ticket */
        $ticket = $result['ticket'];
        $ticketId = $result['ticket_id'];

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
            'customer:id,fullname,email',
            'assignedTo:id,fullname',
            'messagesAsc.sender:id,fullname,role',
        ]);

        return $this->success('Ticket accepted successfully', $ticket);
    }

    public function resolve(SupportTicketActionRequest $request, string $id)
    {
        $user = $request->user();

        if (! in_array($user->role, ['admin', 'manager'], true)) {
            abort(403, 'Forbidden.');
        }

        $validated = $request->validated();
        $result = DB::transaction(function () use ($id, $user, $validated): array {
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $ticket = SupportTicket::with('customer')->whereKey($id)->lockForUpdate()->firstOrFail();

            if ((int) $ticket->assigned_to_id !== (int) $user->id) {
                return ['error' => 'This ticket is not assigned to you.', 'status' => 403];
            }

            if ($ticket->status !== 'active') {
                return ['error' => 'Only active tickets can be resolved.', 'status' => 422];
            }

            $ticketId = DisplayId::ticket($ticket->id);
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

            return ['ticket' => $ticket, 'ticket_id' => $ticketId];
        }, 3);

        if (isset($result['error'])) {
            return $this->error($result['error'], [], $result['status']);
        }

        /** @var SupportTicket $ticket */
        $ticket = $result['ticket'];
        $ticketId = $result['ticket_id'];

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

    public function sendMessage(SupportTicketActionRequest $request, string $id)
    {
        $user = $request->user();
        $validated = $request->validated();

        $result = DB::transaction(function () use ($id, $user, $validated): array {
            $ticket = SupportTicket::whereKey($id)->lockForUpdate()->firstOrFail();

            if ($ticket->status !== 'active') {
                return ['error' => 'Cannot send messages to a non-active ticket.', 'status' => 422];
            }

            if ($user->role === 'customer') {
                if ((int) $ticket->customer_id !== (int) $user->id) {
                    abort(403, 'Forbidden.');
                }
            } elseif (in_array($user->role, ['admin', 'manager'], true)) {
                if ((int) $ticket->assigned_to_id !== (int) $user->id) {
                    return ['error' => 'This ticket is not assigned to you.', 'status' => 403];
                }
            } else {
                abort(403, 'Forbidden.');
            }

            $message = SupportMessage::create([
                'support_ticket_id' => $ticket->id,
                'sender_id' => $user->id,
                'sender_name_snapshot' => $user->fullname,
                'message' => $validated['message'],
            ]);

            $ticket->update(['last_message_at' => Carbon::now()]);

            return ['message' => $message];
        }, 3);

        if (isset($result['error'])) {
            return $this->error($result['error'], [], $result['status']);
        }

        /** @var SupportMessage $message */
        $message = $result['message'];

        $message->load('sender:id,fullname,role');

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

        $messages = SupportMessage::with('sender:id,fullname,role')
            ->where('support_ticket_id', $ticket->id)
            ->when(
                isset($validated['after_id']),
                fn ($query) => $query->where('id', '>', $validated['after_id'])
            )
            ->oldest('id')
            ->limit(200)
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
            'history_page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
        $view = $validated['view'] ?? null;
        $historyPage = (int) ($validated['history_page'] ?? 1);
        $perPage = (int) ($validated['per_page'] ?? 100);
        $historyOffset = ($historyPage - 1) * $perPage;
        $historyCheckedAt = Carbon::now();
        $historyUpdatedAfter = isset($validated['updated_after'])
            ? Carbon::parse($validated['updated_after'])->subSecond()
            : null;

        $waiting = $view === 'history'
            ? collect()
            : SupportTicket::with(['customer:id,fullname'])
                ->where('status', 'waiting')
                ->oldest('created_at')
                ->limit(100)
                ->get();

        $active = $view === 'history'
            ? collect()
            : SupportTicket::with([
                'customer:id,fullname',
                'assignedTo:id,fullname',
            ])
                ->where('status', 'active')
                ->oldest('claimed_at')
                ->limit(100)
                ->get();

        $resolvedRows = $view === 'live'
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
                ->latest('id')
                ->offset($historyOffset)
                ->limit($perPage + 1)
                ->get();

        $cancelledRows = $view === 'live'
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
                ->latest('id')
                ->offset($historyOffset)
                ->limit($perPage + 1)
                ->get();
        $historyHasMore = $resolvedRows->count() > $perPage || $cancelledRows->count() > $perPage;
        $resolved = $resolvedRows->take($perPage)->values();
        $cancelled = $cancelledRows->take($perPage)->values();

        return $this->success('Queue retrieved successfully', [
            'waiting' => $waiting,
            'active' => $active,
            'resolved' => $resolved,
            'cancelled' => $cancelled,
            'checked_at' => $historyCheckedAt->toIso8601String(),
            'history_page' => $historyPage,
            'history_has_more' => $view !== 'live' && $historyHasMore,
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

        $validated = $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
        $tickets = SupportTicket::with([
            'assignedTo:id,fullname',
        ])
            ->where('customer_id', $customerId)
            ->latest()
            ->paginate(
                (int) ($validated['per_page'] ?? 20),
                ['*'],
                'page',
                (int) ($validated['page'] ?? 1),
            );

        return $this->success('Customer tickets retrieved successfully', [
            'tickets' => $tickets->items(),
            'meta' => [
                'current_page' => $tickets->currentPage(),
                'last_page' => $tickets->lastPage(),
                'per_page' => $tickets->perPage(),
                'total' => $tickets->total(),
            ],
        ]);
    }
}
