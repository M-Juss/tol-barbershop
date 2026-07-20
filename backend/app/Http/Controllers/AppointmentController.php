<?php

namespace App\Http\Controllers;

use App\Http\Requests\AppointmentHistoryRequest;
use App\Http\Requests\AppointmentRequest;
use App\Http\Requests\BatchAppointmentRequest;
use App\Http\Requests\BatchAppointmentStatusRequest;
use App\Http\Resources\AppointmentResource;
use App\Models\Appointment;
use App\Models\ClosedDates;
use App\Models\Notification;
use App\Models\Service;
use App\Models\User;
use App\Services\AppointmentBookingService;
use App\Services\PushNotificationService;
use App\Support\DisplayId;
use App\Support\EntityChange;
use App\Traits\ApiResponseTrait;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AppointmentController extends Controller
{
    use ApiResponseTrait;

    private const DASHBOARD_SLOT_STATUSES = ['completed', 'approved', 'pending', 'no_show'];

    public function __construct(private readonly AppointmentBookingService $bookingService) {}

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Appointment::with([
            'user',
            'barber',
            'service',
            'feedback',
        ])->latest();

        $user = $request->user();
        if ($user?->role === 'customer') {
            $query->where('user_id', $user->id);
        } elseif (in_array($user?->role, ['admin', 'manager'], true)) {
            $query->whereIn('status', AppointmentBookingService::ACTIVE_STATUSES);
        } else {
            abort(403, 'Forbidden.');
        }

        $appointments = $query->get();

        return AppointmentResource::collection($appointments);
    }

    public function history(AppointmentHistoryRequest $request)
    {
        $validated = $request->validated();
        $user = $request->user();
        $query = Appointment::with([
            'user:id,fullname,email,contact_number',
            'barber:id,fullname,email,contact_number',
            'service:id,name',
            'feedback:id,appointment_id,rating,comment,created_at',
        ]);

        if ($user->role === 'customer') {
            $query->where('user_id', $user->id);
        }

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (array_key_exists('is_walkin', $validated)) {
            $query->where('is_walkin', (bool) $validated['is_walkin']);
        }

        if (! empty($validated['search'])) {
            $search = $validated['search'];
            $like = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $search).'%';

            $query->where(function ($searchQuery) use ($search, $like) {
                if (ctype_digit($search)) {
                    $searchQuery->orWhere('id', (int) $search);
                }

                if (preg_match('/^APT-(\d{5})$/i', $search, $matches) === 1) {
                    $searchQuery->orWhereRaw('((id * 12345 + 67890) % 90000) + 10000 = ?', [(int) $matches[1]]);
                }

                $searchQuery
                    ->orWhereRaw("customer_name LIKE ? ESCAPE '!'", [$like])
                    ->orWhereRaw("customer_name_snapshot LIKE ? ESCAPE '!'", [$like])
                    ->orWhereRaw("walkin_customer_name LIKE ? ESCAPE '!'", [$like])
                    ->orWhereRaw("service_name_snapshot LIKE ? ESCAPE '!'", [$like])
                    ->orWhereRaw("barber_name_snapshot LIKE ? ESCAPE '!'", [$like])
                    ->orWhereHas('user', fn ($userQuery) => $userQuery->whereRaw("fullname LIKE ? ESCAPE '!'", [$like]))
                    ->orWhereHas('service', fn ($serviceQuery) => $serviceQuery->whereRaw("name LIKE ? ESCAPE '!'", [$like]))
                    ->orWhereHas('barber', fn ($barberQuery) => $barberQuery->whereRaw("fullname LIKE ? ESCAPE '!'", [$like]));
            });
        }

        $perPage = $validated['per_page'] ?? 15;
        $appointments = $query
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($perPage, ['*'], 'page', $validated['page'] ?? 1);

        return $this->success('Appointment history retrieved successfully.', [
            'appointments' => AppointmentResource::collection($appointments),
            'meta' => [
                'current_page' => $appointments->currentPage(),
                'last_page' => $appointments->lastPage(),
                'per_page' => $appointments->perPage(),
                'total' => $appointments->total(),
            ],
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(AppointmentRequest $request)
    {
        $validated = $request->validated();
        $isWalkin = (bool) ($validated['is_walkin'] ?? false);
        $authUser = $request->user();
        $canManage = in_array($authUser?->role, ['admin', 'manager'], true);

        if ($canManage) {
            $this->assertStaffCanCreateType($authUser, $isWalkin ? 'walkin' : 'appointment');
        }

        if (! $canManage) {
            if ($isWalkin) {
                abort(403, 'Customers cannot create walk-in appointments.');
            }

            if ((int) $validated['user_id'] !== (int) $authUser->id) {
                abort(403, 'Customers can only create their own appointments.');
            }

            $validated['status'] = 'pending';
        }

        if ($isWalkin) {
            $appointment = DB::transaction(function () use ($validated): Appointment {
                $resources = $this->bookingService->lockActiveResources(
                    null,
                    (int) $validated['barber_user_id'],
                    [(int) $validated['service_id']],
                );
                $service = $resources['services']->get((int) $validated['service_id']);
                $now = Carbon::now();
                $shopNow = Carbon::now((string) config('app.shop_timezone', 'Asia/Manila'));

                return Appointment::create([
                    'user_id' => null,
                    'service_id' => $service->id,
                    'barber_user_id' => $resources['barber']->id,
                    'appointment_date' => $shopNow->toDateString(),
                    'appointment_time' => $shopNow->format('H:i'),
                    'duration_minutes' => $service->duration,
                    'price' => $service->price,
                    'status' => 'completed',
                    'is_walkin' => true,
                    'walkin_customer_name' => $validated['walkin_customer_name'] ?? null,
                    'walkin_customer_contact_number' => $validated['walkin_customer_contact_number'] ?? null,
                    'notes' => $validated['notes'] ?? null,
                    'completed_at' => $now,
                    'customer_name_snapshot' => $validated['walkin_customer_name'] ?? null,
                    'service_name_snapshot' => $service->name,
                    'barber_name_snapshot' => $resources['barber']->fullname,
                ]);
            }, 3);

            $appointment->load(['barber', 'service']);
            EntityChange::dispatch('appointments');

            return new AppointmentResource($appointment);
        }

        $status = $validated['status'] ?? 'pending';
        $this->bookingService->assertCreatableStatus($status);

        try {
            $appointment = DB::transaction(function () use ($validated, $status): Appointment {
                $resources = $this->bookingService->validateAndLock(
                    (int) $validated['user_id'],
                    (int) $validated['barber_user_id'],
                    $validated['appointment_date'],
                    [[
                        'service_id' => (int) $validated['service_id'],
                        'appointment_time' => $validated['appointment_time'],
                    ]],
                    $status === 'pending' ? 1 : 0,
                );
                $service = $resources['services']->get((int) $validated['service_id']);

                return Appointment::create([
                    'user_id' => $validated['user_id'],
                    'service_id' => $service->id,
                    'barber_user_id' => $resources['barber']->id,
                    'appointment_date' => $validated['appointment_date'],
                    'appointment_time' => $validated['appointment_time'],
                    'duration_minutes' => $service->duration,
                    'price' => $service->price,
                    'status' => $status,
                    'active_slot_key' => $this->bookingService->activeSlotKey(
                        $resources['barber']->id,
                        $validated['appointment_date'],
                        $validated['appointment_time'],
                    ),
                    'is_walkin' => false,
                    'notes' => $validated['notes'] ?? null,
                    'customer_name_snapshot' => $resources['customer']?->fullname,
                    'service_name_snapshot' => $service->name,
                    'barber_name_snapshot' => $resources['barber']->fullname,
                    'approved_at' => $status === 'approved' ? Carbon::now() : null,
                ]);
            }, 3);
        } catch (UniqueConstraintViolationException) {
            return response()->json([
                'message' => 'Selected barber already has an appointment at this time.',
            ], 422);
        }

        $appointment->load([
            'user',
            'barber',
            'service',
        ]);

        if ($appointment->status === 'pending' && ! $canManage) {
            $adminUsers = User::activeStaffForModule('appointment')->get();

            foreach ($adminUsers as $admin) {
                Notification::create([
                    'user_id' => $admin->id,
                    'type' => 'new_pending_appointment',
                    'title' => 'New Appointment Request',
                    'message' => sprintf(
                        'New booking from %s for %s.',
                        $appointment->user?->fullname ?? 'A customer',
                        $appointment->service?->name ?? 'barbershop service'
                    ),
                    'appointment_id' => $appointment->id,
                    'service_name' => $appointment->service?->name,
                    'barber_name' => $appointment->barber?->fullname,
                    'appointment_date' => $appointment->appointment_date,
                    'appointment_time' => $appointment->appointment_time,
                    'price' => $appointment->price,
                    'payload' => [
                        'appointment_id' => $appointment->id,
                        'customer_name' => $appointment->user?->fullname,
                        'customer_email' => $appointment->user?->email,
                        'service_name' => $appointment->service?->name,
                        'barber_name' => $appointment->barber?->fullname,
                        'appointment_date' => $appointment->appointment_date,
                        'appointment_time' => $appointment->appointment_time,
                        'price' => $appointment->price,
                    ],
                    'created_by_user_id' => $appointment->user_id,
                ]);
            }

            try {
                $pushService = new PushNotificationService;
                $pushTitle = 'New Appointment Request';
                $pushBody = sprintf(
                    'New booking from %s for %s.',
                    $appointment->user?->fullname ?? 'A customer',
                    $appointment->service?->name ?? 'barbershop service'
                );

                foreach ($adminUsers as $admin) {
                    $pushService->send($admin, [
                        'title' => $pushTitle,
                        'body' => $pushBody,
                        'icon' => '/Tol-Logo-White-Bg.png',
                        'badge' => '/Tol-Logo-White-Bg.png',
                        'data' => [
                            'url' => '/'.$admin->role.'/appointment',
                            'appointment_id' => $appointment->id,
                        ],
                    ]);
                }
            } catch (\Exception $e) {
                logger()->error('Push notification failed: '.$e->getMessage());
            }

            EntityChange::dispatch('notifications');
        }

        EntityChange::dispatch('appointments');

        return new AppointmentResource($appointment);
    }

    public function storeBatch(BatchAppointmentRequest $request)
    {
        $validated = $request->validated();
        $authUser = $request->user();

        if ($authUser?->role !== 'customer') {
            abort(403, 'Group bookings must be created by the customer who owns them.');
        }

        $slots = $validated['appointments'];
        $barberUserId = (int) $validated['barber_user_id'];
        $appointmentDate = $validated['appointment_date'];
        $batchId = 'BATCH-'.Str::upper(Str::random(24));

        try {
            $createdAppointments = DB::transaction(function () use ($slots, $barberUserId, $appointmentDate, $batchId, $authUser, $validated): array {
                $resources = $this->bookingService->validateAndLock(
                    (int) $authUser->id,
                    $barberUserId,
                    $appointmentDate,
                    collect($slots)->map(fn (array $slot): array => [
                        'service_id' => (int) $slot['service_id'],
                        'appointment_time' => $slot['appointment_time'],
                    ])->all(),
                    count($slots),
                );
                $appointments = [];

                foreach ($slots as $slot) {
                    $service = $resources['services']->get((int) $slot['service_id']);

                    $appointments[] = Appointment::create([
                        'user_id' => $authUser->id,
                        'service_id' => $service->id,
                        'barber_user_id' => $resources['barber']->id,
                        'appointment_date' => $appointmentDate,
                        'appointment_time' => $slot['appointment_time'],
                        'duration_minutes' => $service->duration,
                        'price' => $service->price,
                        'status' => 'pending',
                        'active_slot_key' => $this->bookingService->activeSlotKey(
                            $resources['barber']->id,
                            $appointmentDate,
                            $slot['appointment_time'],
                        ),
                        'batch_id' => $batchId,
                        'customer_name' => $slot['customer_name'] ?? null,
                        'customer_name_snapshot' => filled($slot['customer_name'] ?? null)
                            ? $slot['customer_name']
                            : $authUser->fullname,
                        'service_name_snapshot' => $service->name,
                        'barber_name_snapshot' => $resources['barber']->fullname,
                        'notes' => $validated['notes'] ?? null,
                    ]);
                }

                return $appointments;
            }, 3);
        } catch (UniqueConstraintViolationException) {
            return response()->json([
                'message' => 'One or more selected time slots are already booked.',
            ], 422);
        }

        foreach ($createdAppointments as $appointment) {
            $appointment->load(['user', 'barber', 'service']);
        }

        if ($authUser->role === 'customer') {
            $appointmentNames = collect($createdAppointments)->map(function ($appt) {
                return ($appt->customer_name ?? $appt->user?->fullname).' — '.($appt->service?->name ?? 'Service');
            })->implode(', ');

            $adminUsers = User::activeStaffForModule('appointment')->get();

            foreach ($adminUsers as $admin) {
                Notification::create([
                    'user_id' => $admin->id,
                    'type' => 'new_pending_appointment',
                    'title' => 'New Group Booking Request',
                    'message' => sprintf(
                        'Group booking from %s (%d appointments): %s.',
                        $authUser->fullname,
                        count($createdAppointments),
                        $appointmentNames
                    ),
                    'payload' => [
                        'batch_id' => $batchId,
                        'customer_name' => $authUser->fullname,
                        'customer_email' => $authUser->email,
                        'barber_name' => $createdAppointments[0]->barber?->fullname,
                        'appointment_date' => $appointmentDate,
                        'appointment_count' => count($createdAppointments),
                    ],
                    'created_by_user_id' => $authUser->id,
                ]);
            }

            try {
                $pushService = new PushNotificationService;
                $pushTitle = 'New Group Booking Request';
                $pushBody = sprintf(
                    'Group booking from %s (%d appointments).',
                    $authUser->fullname,
                    count($createdAppointments)
                );

                foreach ($adminUsers as $admin) {
                    $pushService->send($admin, [
                        'title' => $pushTitle,
                        'body' => $pushBody,
                        'icon' => '/Tol-Logo-White-Bg.png',
                        'badge' => '/Tol-Logo-White-Bg.png',
                        'data' => [
                            'url' => '/'.$admin->role.'/appointment',
                            'batch_id' => $batchId,
                        ],
                    ]);
                }
            } catch (\Exception $e) {
                logger()->error('Push notification failed: '.$e->getMessage());
            }

            EntityChange::dispatch('notifications');
        }

        EntityChange::dispatch('appointments');

        return AppointmentResource::collection(collect($createdAppointments));
    }

    public function updateBatchStatus(BatchAppointmentStatusRequest $request, string $batchId)
    {
        $validated = $request->validated();
        $status = $validated['status'];
        $snapshot = Appointment::where('batch_id', $batchId)
            ->orderBy('id')
            ->get();

        if ($snapshot->isEmpty()) {
            abort(404);
        }

        $isHomogeneousBatch = $snapshot->count() >= 2
            && $snapshot->count() <= 11
            && $snapshot->pluck('user_id')->filter()->unique()->count() === 1
            && $snapshot->pluck('user_id')->filter()->count() === $snapshot->count()
            && $snapshot->pluck('barber_user_id')->unique()->count() === 1
            && $snapshot->map(fn (Appointment $appointment): string => $appointment->appointment_date->toDateString())->unique()->count() === 1
            && ! $snapshot->contains(fn (Appointment $appointment): bool => $appointment->is_walkin);

        if (! $isHomogeneousBatch) {
            return $this->error('This group of appointments cannot be updated together. Please manage them individually.', [], 409);
        }

        $result = DB::transaction(function () use ($batchId, $snapshot, $status, $validated): array {
            if ($status === 'approved') {
                $first = $snapshot->first();
                $this->bookingService->validateAndLock(
                    (int) $first->user_id,
                    (int) $first->barber_user_id,
                    $first->appointment_date->toDateString(),
                    $snapshot->map(fn (Appointment $appointment): array => [
                        'service_id' => (int) $appointment->service_id,
                        'appointment_time' => substr((string) $appointment->appointment_time, 0, 5),
                    ])->all(),
                    0,
                    $snapshot->modelKeys(),
                );
            }

            $appointments = Appointment::where('batch_id', $batchId)
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            if ($appointments->count() !== $snapshot->count()
                || $appointments->contains(fn (Appointment $appointment): bool => $appointment->status !== 'pending')) {
                return ['error' => 'The group changed while it was being updated. Refresh and try again.'];
            }

            $now = Carbon::now();
            foreach ($appointments as $appointment) {
                $appointment->update([
                    'status' => $status,
                    'active_slot_key' => $status === 'approved' ? $appointment->active_slot_key : null,
                    'approved_at' => $status === 'approved' ? $now : null,
                    'rejected_at' => $status === 'rejected' ? $now : null,
                    'cancellation_reason' => $status === 'rejected'
                        ? ($validated['cancellation_reason'] ?? null)
                        : null,
                ]);
            }

            return ['appointments' => $appointments];
        }, 3);

        if (isset($result['error'])) {
            return $this->error($result['error'], [], 409);
        }

        /** @var Collection<int, Appointment> $appointments */
        $appointments = $result['appointments'];
        $appointments->load(['user', 'barber', 'service']);

        foreach ($appointments->groupBy('user_id') as $userAppointments) {
            $customer = $userAppointments->first()?->user;
            if (! $customer) {
                continue;
            }

            Notification::create([
                'user_id' => $customer->id,
                'type' => 'appointment_status',
                'title' => 'Group Booking Updated',
                'message' => sprintf(
                    'Your group booking is now %s.',
                    $status === 'approved' ? 'approved' : 'rejected',
                ),
                'payload' => [
                    'batch_id' => $batchId,
                    'status' => $status,
                    'appointment_count' => $userAppointments->count(),
                ],
                'created_by_user_id' => $request->user()?->id,
            ]);

            try {
                (new PushNotificationService)->send($customer, [
                    'title' => 'Group Booking Updated',
                    'body' => sprintf(
                        'Your group booking is now %s.',
                        $status === 'approved' ? 'approved' : 'rejected',
                    ),
                    'icon' => '/Tol-Logo-White-Bg.png',
                    'badge' => '/Tol-Logo-White-Bg.png',
                    'data' => ['url' => '/customer'],
                ]);
            } catch (\Throwable $exception) {
                report($exception);
            }
        }

        EntityChange::dispatch('appointments');
        EntityChange::dispatch('notifications');

        return AppointmentResource::collection($appointments);
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, string $id)
    {
        $query = Appointment::with([
            'user',
            'barber',
            'service',
        ]);

        $user = $request->user();
        if ($user?->role === 'customer') {
            $query->where('user_id', $user->id);
        } elseif (! in_array($user?->role, ['admin', 'manager'], true)) {
            abort(403, 'Forbidden.');
        }

        $appointment = $query->findOrFail($id);

        return new AppointmentResource($appointment);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(AppointmentRequest $request, string $id)
    {
        if (! in_array($request->user()?->role, ['admin', 'manager'], true)) {
            abort(403, 'Forbidden.');
        }

        $validated = $request->validated();
        $snapshot = Appointment::findOrFail($id);

        try {
            [$appointment, $originalStatus, $nextStatus, $detailsChanged] = DB::transaction(function () use ($id, $validated, $snapshot): array {
                $this->bookingService->lockUsers([
                    $snapshot->user_id,
                    $snapshot->barber_user_id,
                    $validated['barber_user_id'],
                ]);

                $appointment = Appointment::whereKey($id)->lockForUpdate()->firstOrFail();
                if ((int) $appointment->barber_user_id !== (int) $snapshot->barber_user_id) {
                    throw ValidationException::withMessages([
                        'appointment' => 'The appointment changed while it was being updated. Please retry.',
                    ]);
                }

                $originalStatus = (string) $appointment->status;
                $nextStatus = (string) ($validated['status'] ?? $originalStatus);
                $this->bookingService->assertValidStatusTransition($originalStatus, $nextStatus);

                if ((int) ($validated['user_id'] ?? 0) !== (int) $appointment->user_id) {
                    throw ValidationException::withMessages([
                        'user_id' => 'An appointment cannot be transferred to another customer.',
                    ]);
                }

                if (array_key_exists('is_walkin', $validated)
                    && (bool) $validated['is_walkin'] !== (bool) $appointment->is_walkin) {
                    throw ValidationException::withMessages([
                        'is_walkin' => 'The appointment type cannot be changed.',
                    ]);
                }

                $originalDate = $appointment->appointment_date->toDateString();
                $originalTime = substr((string) $appointment->appointment_time, 0, 5);
                $detailsChanged = (int) $validated['service_id'] !== (int) $appointment->service_id
                    || (int) $validated['barber_user_id'] !== (int) $appointment->barber_user_id
                    || $validated['appointment_date'] !== $originalDate
                    || $validated['appointment_time'] !== $originalTime;

                if ($detailsChanged && ! in_array($nextStatus, AppointmentBookingService::ACTIVE_STATUSES, true)) {
                    throw ValidationException::withMessages([
                        'appointment' => 'Completed or cancelled appointments cannot be rescheduled.',
                    ]);
                }

                if (in_array($nextStatus, AppointmentBookingService::ACTIVE_STATUSES, true)) {
                    $resources = $this->bookingService->validateAndLock(
                        (int) $appointment->user_id,
                        (int) $validated['barber_user_id'],
                        $validated['appointment_date'],
                        [[
                            'service_id' => (int) $validated['service_id'],
                            'appointment_time' => $validated['appointment_time'],
                        ]],
                        0,
                        [(int) $appointment->id],
                    );
                    $service = $resources['services']->get((int) $validated['service_id']);
                    $barber = $resources['barber'];
                    $customer = $resources['customer'];
                } else {
                    $service = Service::findOrFail($appointment->service_id);
                    $barber = User::withTrashed()->findOrFail($appointment->barber_user_id);
                    $customer = $appointment->user()->first();
                }

                if ($nextStatus !== $originalStatus) {
                    $this->bookingService->assertNotFutureTerminal(
                        $validated['appointment_date'],
                        $validated['appointment_time'],
                        $nextStatus,
                    );
                }

                $reason = $validated['cancellation_reason'] ?? null;
                $updates = [
                    'service_id' => $service->id,
                    'barber_user_id' => $barber->id,
                    'appointment_date' => $validated['appointment_date'],
                    'appointment_time' => $validated['appointment_time'],
                    'duration_minutes' => $service->duration,
                    'price' => $service->price,
                    'status' => $nextStatus,
                    'active_slot_key' => in_array($nextStatus, AppointmentBookingService::ACTIVE_STATUSES, true)
                        ? $this->bookingService->activeSlotKey(
                            $barber->id,
                            $validated['appointment_date'],
                            $validated['appointment_time'],
                        )
                        : null,
                    'notes' => $validated['notes'] ?? null,
                    'cancellation_reason' => in_array($nextStatus, ['cancelled', 'rejected'], true)
                        && is_string($reason) && trim($reason) !== ''
                            ? trim($reason)
                            : null,
                    'customer_name_snapshot' => $appointment->is_walkin
                        ? ($appointment->walkin_customer_name ?? $validated['walkin_customer_name'] ?? null)
                        : (filled($appointment->customer_name)
                            ? $appointment->customer_name
                            : $customer?->fullname),
                    'service_name_snapshot' => $service->name,
                    'barber_name_snapshot' => $barber->fullname,
                ];

                if ($nextStatus !== $originalStatus) {
                    $timestampColumn = match ($nextStatus) {
                        'approved' => 'approved_at',
                        'completed' => 'completed_at',
                        'cancelled' => 'cancelled_at',
                        'rejected' => 'rejected_at',
                        default => null,
                    };

                    if ($timestampColumn) {
                        $updates[$timestampColumn] = Carbon::now();
                    }
                }

                $appointment->update($updates);

                return [$appointment, $originalStatus, $nextStatus, $detailsChanged];
            }, 3);
        } catch (UniqueConstraintViolationException) {
            return response()->json([
                'message' => 'Selected barber already has an appointment at this time.',
            ], 422);
        }

        $appointment->loadMissing(['user', 'barber', 'service']);

        if ($nextStatus && $nextStatus !== $originalStatus) {
            $appointment->loadMissing(['service:id,name', 'barber:id,fullname']);
            $bookingId = DisplayId::booking($appointment->id);

            if ($nextStatus === 'completed') {
                $exists = Notification::where('user_id', $appointment->user_id)
                    ->where('type', 'appointment_feedback_request')
                    ->where('payload->appointment_id', $appointment->id)
                    ->exists();

                if (! $exists) {
                    Notification::create([
                        'user_id' => $appointment->user_id,
                        'type' => 'appointment_completed',
                        'title' => 'Booking Complete',
                        'message' => sprintf(
                            'Your %s booking %s is now complete.',
                            $appointment->service?->name ?? 'barbershop service',
                            $bookingId
                        ),
                        'appointment_id' => $appointment->id,
                        'service_name' => $appointment->service?->name,
                        'payload' => [
                            'appointment_id' => $appointment->id,
                            'booking_id' => $bookingId,
                            'status' => $nextStatus,
                            'service_name' => $appointment->service?->name,
                        ],
                        'created_by_user_id' => $request->user()?->id,
                    ]);
                }
            } else {
                Notification::create([
                    'user_id' => $appointment->user_id,
                    'type' => 'appointment_status',
                    'title' => 'Appointment Status Updated',
                    'message' => sprintf(
                        'Your appointment %s is now %s.',
                        $bookingId,
                        str_replace('_', ' ', $nextStatus)
                    ),
                    'appointment_id' => $appointment->id,
                    'service_name' => $appointment->service?->name,
                    'barber_name' => $appointment->barber?->fullname,
                    'appointment_date' => $appointment->appointment_date,
                    'appointment_time' => $appointment->appointment_time,
                    'price' => $appointment->price,
                    'payload' => [
                        'appointment_id' => $appointment->id,
                        'status' => $nextStatus,
                        'service_name' => $appointment->service?->name,
                        'barber_name' => $appointment->barber?->fullname,
                        'appointment_date' => $appointment->appointment_date,
                        'appointment_time' => $appointment->appointment_time,
                        'price' => $appointment->price,
                    ],
                    'created_by_user_id' => $request->user()?->id,
                ]);
            }

            try {
                $pushService = new PushNotificationService;
                $pushTitle = $nextStatus === 'completed'
                    ? 'Booking Complete'
                    : 'Appointment Status Updated';
                $pushBody = $nextStatus === 'completed'
                    ? sprintf('Your %s booking %s is now complete.', $appointment->service?->name ?? 'barbershop service', $bookingId)
                    : sprintf('Your appointment %s is now %s.', $bookingId, str_replace('_', ' ', $nextStatus));

                $pushService->send($appointment->user, [
                    'title' => $pushTitle,
                    'body' => $pushBody,
                    'icon' => '/Tol-Logo-White-Bg.png',
                    'badge' => '/Tol-Logo-White-Bg.png',
                    'data' => [
                        'url' => '/customer/notification',
                        'appointment_id' => $appointment->id,
                    ],
                ]);
            } catch (\Exception $e) {
                logger()->error('Push notification failed: '.$e->getMessage());
            }
        } elseif ($detailsChanged) {
            $appointment->loadMissing(['service:id,name', 'barber:id,fullname']);

            Notification::create([
                'user_id' => $appointment->user_id,
                'type' => 'appointment_rescheduled',
                'title' => 'Appointment Rescheduled',
                'message' => sprintf(
                    'Your %s appointment has been rescheduled to %s at %s with %s.',
                    $appointment->service?->name ?? 'barbershop service',
                    Carbon::parse($appointment->appointment_date)->format('F j, Y'),
                    Carbon::parse($appointment->appointment_time)->format('g:i A'),
                    $appointment->barber?->fullname ?? 'the barber'
                ),
                'appointment_id' => $appointment->id,
                'service_name' => $appointment->service?->name,
                'barber_name' => $appointment->barber?->fullname,
                'appointment_date' => $appointment->appointment_date,
                'appointment_time' => $appointment->appointment_time,
                'price' => $appointment->price,
                'payload' => [
                    'appointment_id' => $appointment->id,
                    'service_name' => $appointment->service?->name,
                    'barber_name' => $appointment->barber?->fullname,
                    'appointment_date' => $appointment->appointment_date,
                    'appointment_time' => $appointment->appointment_time,
                    'price' => $appointment->price,
                ],
                'created_by_user_id' => $request->user()?->id,
            ]);

            try {
                $pushService = new PushNotificationService;
                $pushService->send($appointment->user, [
                    'title' => 'Appointment Rescheduled',
                    'body' => sprintf(
                        'Your %s appointment has been rescheduled to %s at %s with %s.',
                        $appointment->service?->name ?? 'barbershop service',
                        Carbon::parse($appointment->appointment_date)->format('F j, Y'),
                        Carbon::parse($appointment->appointment_time)->format('g:i A'),
                        $appointment->barber?->fullname ?? 'the barber'
                    ),
                    'icon' => '/Tol-Logo-White-Bg.png',
                    'badge' => '/Tol-Logo-White-Bg.png',
                    'data' => [
                        'url' => '/customer/notification',
                        'appointment_id' => $appointment->id,
                    ],
                ]);
            } catch (\Exception $e) {
                logger()->error('Push notification failed: '.$e->getMessage());
            }
        }

        $appointment->load([
            'user',
            'barber',
            'service',
        ]);

        EntityChange::dispatch('appointments');

        return new AppointmentResource($appointment);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, string $id)
    {
        $result = DB::transaction(function () use ($id, $request): array {
            $appointment = Appointment::whereKey($id)->lockForUpdate()->firstOrFail();

            if (in_array($appointment->status, AppointmentBookingService::ACTIVE_STATUSES, true)) {
                return ['archived' => false];
            }

            $appointment->update([
                'active_slot_key' => null,
                'archived_by_user_id' => $request->user()?->id,
            ]);
            $appointment->delete();

            return ['archived' => true];
        }, 3);

        if (! $result['archived']) {
            return response()->json([
                'message' => 'Pending or approved appointments must be cancelled or rejected before archiving.',
            ], 422);
        }

        EntityChange::dispatch('appointments');

        return response()->json([
            'message' => 'Appointment archived successfully.',
        ]);
    }

    public function overviewStats()
    {
        $completedAppointments = Appointment::withTrashed()->where('status', 'completed')->count();
        $pendingAppointments = Appointment::where('status', 'pending')->count();
        $approvedAppointments = Appointment::where('status', 'approved')->count();
        $totalCustomers = User::where('role', 'customer')->count();
        $totalRevenue = (float) Appointment::withTrashed()->where('status', 'completed')->sum('price');

        return response()->json([
            'completed_appointments' => $completedAppointments,
            'pending_appointments' => $pendingAppointments,
            'approved_appointments' => $approvedAppointments,
            'total_customers' => $totalCustomers,
            'total_revenue' => $totalRevenue,
        ]);
    }

    public function pendingCount()
    {
        $count = Appointment::where('status', 'pending')->count();

        return response()->json([
            'success' => true,
            'data' => [
                'count' => $count,
            ],
        ]);
    }

    public function monthlyRevenue()
    {
        $startDate = Carbon::today()->subDays(29);
        $endDate = Carbon::today();

        $rows = Appointment::withTrashed()->select([
            DB::raw("DATE_FORMAT(appointment_date, '%Y-%m-%d') as date"),
            DB::raw('SUM(price) as revenue'),
        ])
            ->where('status', 'completed')
            ->whereBetween('appointment_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $revenuesByDate = $rows->mapWithKeys(function ($row) {
            return [$row->date => (float) $row->revenue];
        });

        $dailyData = [];
        $cursor = $startDate->copy();

        while ($cursor->lte($endDate)) {
            $key = $cursor->toDateString();
            $dailyData[] = [
                'date' => $key,
                'revenue' => (float) ($revenuesByDate[$key] ?? 0),
            ];
            $cursor->addDay();
        }

        return response()->json($dailyData);
    }

    public function serviceStats()
    {
        $serviceName = "COALESCE(appointments.service_name_snapshot, services.name, 'Unknown')";
        $rows = Appointment::withTrashed()
            ->leftJoin('services', 'services.id', '=', 'appointments.service_id')
            ->where('status', 'completed')
            ->selectRaw("{$serviceName} as service_name, COUNT(*) as completed_count")
            ->groupBy(DB::raw($serviceName))
            ->orderByDesc('completed_count')
            ->get()
            ->map(function ($row) {
                return [
                    'service_name' => $row->service_name,
                    'completed_count' => (int) $row->completed_count,
                ];
            })
            ->values();

        return response()->json($rows);
    }

    public function timeSlots(Request $request)
    {
        $validated = $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
        ]);

        $date = $validated['date'];

        $appointments = Appointment::with(['user:id,fullname,email,contact_number', 'barber:id,fullname', 'service:id,name'])
            ->whereDate('appointment_date', $date)
            ->whereIn('status', self::DASHBOARD_SLOT_STATUSES)
            ->get();

        $slotMap = [];
        foreach ($appointments as $appointment) {
            $time24 = substr((string) $appointment->appointment_time, 0, 5);
            $time12 = Carbon::createFromFormat('H:i', $time24)->format('g:i A');

            $slotMap[$time12][] = [
                'id' => $appointment->id,
                'customer' => $appointment->customerDisplayName(),
                'customer_email' => $appointment->user?->email,
                'customer_contact' => $appointment->user?->contact_number,
                'service' => $appointment->service?->name,
                'barber' => $appointment->barber?->fullname,
                'price' => (float) $appointment->price,
                'notes' => $appointment->notes,
                'appointment_date' => $appointment->appointment_date,
                'appointment_time' => $appointment->appointment_time,
                'status' => $appointment->status,
            ];
        }

        $slots = [];
        for ($hour = 9; $hour <= 19; $hour++) {
            if ($hour === 12) {
                $time12 = '12:30 PM';
            } else {
                $time12 = Carbon::createFromTime($hour, 0)->format('g:i A');
            }
            $appts = $slotMap[$time12] ?? [];
            $slots[] = [
                'time' => $time12,
                'appointments' => $appts,
                'status' => count($appts) > 0 ? 'booked' : 'available',
            ];
        }

        return response()->json($slots);
    }

    public function availableSlots(Request $request)
    {
        $validated = $request->validate([
            'barber_id' => [
                'required',
                'integer',
                Rule::exists('users', 'id')->where(fn ($query) => $query
                    ->where('role', 'barber')
                    ->where('is_active', true)),
            ],
            'date' => [
                'required',
                'date_format:Y-m-d',
                'after_or_equal:'.Carbon::today((string) config('app.shop_timezone', 'Asia/Manila'))->toDateString(),
                'before_or_equal:'.Carbon::today((string) config('app.shop_timezone', 'Asia/Manila'))->addDays(30)->toDateString(),
            ],
            'ignore_appointment_id' => ['sometimes', 'integer', 'exists:appointments,id'],
        ]);

        if (isset($validated['ignore_appointment_id'])
            && ! in_array($request->user()?->role, ['admin', 'manager'], true)) {
            abort(403, 'Only staff may exclude an appointment while checking a reschedule.');
        }

        if (Carbon::parse($validated['date'])->isSunday()
            || ClosedDates::where('date_closed', $validated['date'])->where('is_removed', false)->exists()) {
            throw ValidationException::withMessages([
                'date' => 'The selected date is not available for booking.',
            ]);
        }

        $nextDate = Carbon::parse($validated['date'])->addDay()->toDateString();
        $slots = Appointment::with('service:id,duration')
            ->where('barber_user_id', $validated['barber_id'])
            ->where('appointment_date', '>=', $validated['date'])
            ->where('appointment_date', '<', $nextDate)
            ->whereIn('status', ['pending', 'approved'])
            ->when(
                isset($validated['ignore_appointment_id']),
                fn ($query) => $query->whereKeyNot($validated['ignore_appointment_id']),
            )
            ->get(['id', 'service_id', 'appointment_time', 'duration_minutes'])
            ->map(fn (Appointment $appointment): array => [
                'appointment_time' => substr((string) $appointment->appointment_time, 0, 5),
                'duration_minutes' => max(
                    1,
                    (int) ($appointment->duration_minutes ?? $appointment->service?->duration ?? 60),
                ),
            ])
            ->values();

        return response()->json([
            'data' => $slots,
        ]);
    }

    private function assertStaffCanCreateType(User $user, string $moduleKey): void
    {
        if ($user->role !== 'admin') {
            return;
        }

        if (! $user->canAccessModule($moduleKey)) {
            abort(403, "Forbidden: the {$moduleKey} module is required.");
        }
    }
}
