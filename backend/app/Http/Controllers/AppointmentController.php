<?php

namespace App\Http\Controllers;

use App\Http\Requests\AppointmentHistoryRequest;
use App\Http\Requests\AppointmentRequest;
use App\Http\Requests\BatchAppointmentRequest;
use App\Http\Requests\BatchAppointmentStatusRequest;
use App\Http\Requests\DashboardScheduleRequest;
use App\Http\Resources\AppointmentResource;
use App\Models\Appointment;
use App\Models\ClosedDates;
use App\Models\Notification;
use App\Models\Service;
use App\Models\User;
use App\Services\AppointmentBookingService;
use App\Services\AppointmentNotificationService;
use App\Services\PushNotificationService;
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

    private const DASHBOARD_SLOTS = [
        ['value' => '09:00', 'label' => '9:00 AM'],
        ['value' => '10:00', 'label' => '10:00 AM'],
        ['value' => '11:00', 'label' => '11:00 AM'],
        ['value' => '12:30', 'label' => '12:30 PM'],
        ['value' => '13:00', 'label' => '1:00 PM'],
        ['value' => '14:00', 'label' => '2:00 PM'],
        ['value' => '15:00', 'label' => '3:00 PM'],
        ['value' => '16:00', 'label' => '4:00 PM'],
        ['value' => '17:00', 'label' => '5:00 PM'],
        ['value' => '18:00', 'label' => '6:00 PM'],
        ['value' => '19:00', 'label' => '7:00 PM'],
    ];

    public function __construct(
        private readonly AppointmentBookingService $bookingService,
        private readonly AppointmentNotificationService $appointmentNotificationService,
    ) {}

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
            ->orderByDesc('updated_at')
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
                $this->bookingService->assertDateAvailableAndLock(
                    (int) $resources['barber']->id,
                    $validated['appointment_date'],
                );
                $service = $resources['services']->get((int) $validated['service_id']);
                $now = Carbon::now();

                return Appointment::create([
                    'user_id' => null,
                    'service_id' => $service->id,
                    'barber_user_id' => $resources['barber']->id,
                    'appointment_date' => $validated['appointment_date'],
                    'appointment_time' => $validated['appointment_time'],
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

            $this->appointmentNotificationService->notifyStatus(
                $appointment,
                'pending',
                $appointment->user_id,
            );
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

            $this->appointmentNotificationService->notifyGroupStatus(
                new Collection($createdAppointments),
                'pending',
                $authUser->id,
            );
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
            $this->appointmentNotificationService->notifyGroupStatus(
                $userAppointments,
                $status,
                $request->user()?->id,
            );
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

                $today = Carbon::now((string) config('app.shop_timezone', 'Asia/Manila'))
                    ->toDateString();
                if ($detailsChanged && $originalStatus === 'approved' && $originalDate < $today) {
                    throw ValidationException::withMessages([
                        'appointment' => 'Past-due appointments cannot be rescheduled.',
                    ]);
                }

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

        $customerNotification = null;
        if ($nextStatus && $nextStatus !== $originalStatus) {
            $customerNotification = $this->appointmentNotificationService->notifyStatus(
                $appointment,
                $nextStatus,
                $request->user()?->id,
            );
        } elseif ($detailsChanged) {
            $customerNotification = $this->appointmentNotificationService->notifyRescheduled(
                $appointment,
                $request->user()?->id,
            );
        }

        if ($customerNotification) {
            EntityChange::dispatch('notifications');
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

    public function weeklySchedule(DashboardScheduleRequest $request)
    {
        $validated = $request->validated();
        $timezone = (string) config('app.shop_timezone', 'Asia/Manila');
        $selectedDate = Carbon::createFromFormat('!Y-m-d', $validated['date'], $timezone);
        $weekStart = $selectedDate->copy()->startOfWeek(Carbon::MONDAY);
        $weekEnd = $weekStart->copy()->addDays(6);
        $now = Carbon::now($timezone);
        $today = $now->copy()->startOfDay();

        $activeBarberIds = User::query()
            ->where('role', 'barber')
            ->where('is_active', true)
            ->pluck('id')
            ->map(fn ($id): int => (int) $id)
            ->all();

        $activeAppointments = Appointment::with('service:id,duration')
            ->whereBetween('appointment_date', [
                $weekStart->toDateString(),
                $weekEnd->toDateString(),
            ])
            ->whereIn('status', AppointmentBookingService::ACTIVE_STATUSES)
            ->whereIn('barber_user_id', $activeBarberIds)
            ->get([
                'id',
                'service_id',
                'barber_user_id',
                'appointment_date',
                'appointment_time',
                'duration_minutes',
            ]);

        $activeAppointmentsByDate = $activeAppointments->groupBy(
            fn (Appointment $appointment): string => $appointment->appointment_date->toDateString(),
        );

        $weeklyAppointmentStats = Appointment::withTrashed()
            ->whereBetween('appointment_date', [
                $weekStart->toDateString(),
                $weekEnd->toDateString(),
            ])
            ->selectRaw("
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_appointments,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_appointments,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_appointments
            ")
            ->first();

        $averageRating = DB::table('appointment_feedback')
            ->join('appointments', 'appointments.id', '=', 'appointment_feedback.appointment_id')
            ->whereBetween('appointments.appointment_date', [
                $weekStart->toDateString(),
                $weekEnd->toDateString(),
            ])
            ->avg('appointment_feedback.rating');

        $closures = ClosedDates::query()
            ->where('is_removed', false)
            ->whereBetween('date_closed', [
                $weekStart->toDateString(),
                $weekEnd->toDateString(),
            ])
            ->get(['date_closed', 'closure_scope', 'barber_user_id']);
        $shopClosedDateMap = $closures
            ->where('closure_scope', 'shop')
            ->mapWithKeys(fn (ClosedDates $closure): array => [(string) $closure->date_closed => true])
            ->all();
        $barberClosedDateMap = $closures
            ->where('closure_scope', 'barber')
            ->groupBy(fn (ClosedDates $closure): string => (string) $closure->date_closed)
            ->map(fn (Collection $dateClosures): array => $dateClosures
                ->pluck('barber_user_id')
                ->map(fn ($barberId): int => (int) $barberId)
                ->all())
            ->all();

        $days = [];
        for ($offset = 0; $offset < 7; $offset++) {
            $date = $weekStart->copy()->addDays($offset);
            $dateKey = $date->toDateString();
            $availableBarberIds = array_values(array_diff(
                $activeBarberIds,
                $barberClosedDateMap[$dateKey] ?? [],
            ));
            $isClosed = $date->isSunday()
                || isset($shopClosedDateMap[$dateKey])
                || $availableBarberIds === [];
            $isPast = $date->lt($today);
            $dayAppointments = $activeAppointmentsByDate->get($dateKey, new Collection);
            $occupiedIntervals = $this->dashboardOccupiedIntervals($dayAppointments);
            $totalSlots = 0;
            $availableSlots = 0;

            if (! $isClosed && ! $isPast) {
                foreach (self::DASHBOARD_SLOTS as $slot) {
                    $slotMinutes = $this->dashboardTimeToMinutes($slot['value']);
                    if ($this->dashboardSlotIsPast($date, $slotMinutes, $now)) {
                        continue;
                    }

                    $totalSlots += count($availableBarberIds);
                    $availableSlots += $this->dashboardAvailableBarberCount(
                        $availableBarberIds,
                        $occupiedIntervals,
                        $slotMinutes,
                    );
                }
            }

            $days[] = [
                'date' => $dateKey,
                'day' => strtoupper($date->format('D')),
                'day_number' => (int) $date->format('j'),
                'available_slots' => $availableSlots,
                'total_slots' => $totalSlots,
                'is_today' => $date->isSameDay($today),
                'is_past' => $isPast,
                'is_closed' => $isClosed,
                'is_fully_booked' => ! $isClosed
                    && ! $isPast
                    && $totalSlots > 0
                    && $availableSlots === 0,
            ];
        }

        $selectedDateKey = $selectedDate->toDateString();
        $selectedAppointments = Appointment::with([
            'user:id,fullname,email,contact_number',
            'barber:id,fullname',
            'service:id,name',
        ])
            ->whereDate('appointment_date', $selectedDateKey)
            ->whereIn('status', self::DASHBOARD_SLOT_STATUSES)
            ->get();
        $selectedActiveAppointments = $activeAppointmentsByDate->get(
            $selectedDateKey,
            new Collection,
        );
        $selectedAvailableBarberIds = array_values(array_diff(
            $activeBarberIds,
            $barberClosedDateMap[$selectedDateKey] ?? [],
        ));
        $selectedDateIsClosed = $selectedDate->isSunday()
            || isset($shopClosedDateMap[$selectedDateKey])
            || $selectedAvailableBarberIds === [];

        return response()->json([
            'selected_date' => $selectedDateKey,
            'week_start' => $weekStart->toDateString(),
            'week_end' => $weekEnd->toDateString(),
            'active_barbers' => count($activeBarberIds),
            'weekly_stats' => [
                'completed_appointments' => (int) ($weeklyAppointmentStats?->completed_appointments ?? 0),
                'approved_appointments' => (int) ($weeklyAppointmentStats?->approved_appointments ?? 0),
                'pending_appointments' => (int) ($weeklyAppointmentStats?->pending_appointments ?? 0),
                'average_rating' => $averageRating ? round((float) $averageRating, 1) : 0,
            ],
            'days' => $days,
            'time_slots' => $this->buildDashboardTimeSlots(
                $selectedDate,
                $selectedAppointments,
                $selectedActiveAppointments,
                $selectedAvailableBarberIds,
                $selectedDateIsClosed,
                $now,
            ),
        ]);
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
        foreach (self::DASHBOARD_SLOTS as $slot) {
            $appts = $slotMap[$slot['label']] ?? [];
            $slots[] = [
                'time' => $slot['label'],
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
                'before_or_equal:'.Carbon::today((string) config('app.shop_timezone', 'Asia/Manila'))->addDays(AppointmentBookingService::MAX_BOOKING_DAYS_AHEAD)->toDateString(),
            ],
            'ignore_appointment_id' => ['sometimes', 'integer', 'exists:appointments,id'],
        ]);

        if (isset($validated['ignore_appointment_id'])
            && ! in_array($request->user()?->role, ['admin', 'manager'], true)) {
            abort(403, 'Only staff may exclude an appointment while checking a reschedule.');
        }

        $hasClosure = ClosedDates::query()
            ->where('date_closed', $validated['date'])
            ->where('is_removed', false)
            ->where(function ($query) use ($validated): void {
                $query
                    ->where('closure_scope', 'shop')
                    ->orWhere(function ($barberQuery) use ($validated): void {
                        $barberQuery
                            ->where('closure_scope', 'barber')
                            ->where('barber_user_id', $validated['barber_id']);
                    });
            })
            ->exists();

        if (Carbon::parse($validated['date'])->isSunday() || $hasClosure) {
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

    private function buildDashboardTimeSlots(
        Carbon $date,
        Collection $appointments,
        Collection $activeAppointments,
        array $activeBarberIds,
        bool $isClosed,
        Carbon $now,
    ): array {
        $appointmentsByTime = $appointments->groupBy(
            fn (Appointment $appointment): string => substr((string) $appointment->appointment_time, 0, 5),
        );
        $occupiedIntervals = $this->dashboardOccupiedIntervals($activeAppointments);
        $isPastDate = $date->copy()->startOfDay()->lt($now->copy()->startOfDay());

        return collect(self::DASHBOARD_SLOTS)->map(function (array $slot) use (
            $activeBarberIds,
            $appointmentsByTime,
            $date,
            $isClosed,
            $isPastDate,
            $now,
            $occupiedIntervals,
        ): array {
            $slotMinutes = $this->dashboardTimeToMinutes($slot['value']);
            $isPast = $isPastDate || $this->dashboardSlotIsPast($date, $slotMinutes, $now);
            $availableBarbers = $isClosed || $isPast
                ? 0
                : $this->dashboardAvailableBarberCount(
                    $activeBarberIds,
                    $occupiedIntervals,
                    $slotMinutes,
                );
            $slotAppointments = $appointmentsByTime->get($slot['value'], new Collection);

            return [
                'time' => $slot['label'],
                'appointments' => $slotAppointments
                    ->map(fn (Appointment $appointment): array => [
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
                    ])
                    ->values()
                    ->all(),
                'status' => $slotAppointments->isNotEmpty() ? 'booked' : 'available',
                'available_barbers' => $availableBarbers,
                'total_barbers' => count($activeBarberIds),
                'is_past' => $isPast,
                'is_closed' => $isClosed,
                'is_fully_booked' => ! $isClosed
                    && ! $isPast
                    && count($activeBarberIds) > 0
                    && $availableBarbers === 0,
            ];
        })->all();
    }

    private function dashboardOccupiedIntervals(iterable $appointments): array
    {
        $intervals = [];

        foreach ($appointments as $appointment) {
            $start = $this->dashboardTimeToMinutes(
                substr((string) $appointment->appointment_time, 0, 5),
            );
            $duration = max(
                1,
                (int) ($appointment->duration_minutes ?? $appointment->service?->duration ?? 60),
            );
            $intervals[(int) $appointment->barber_user_id][] = [
                'start' => $start,
                'end' => $start + $duration,
            ];
        }

        return $intervals;
    }

    private function dashboardAvailableBarberCount(
        array $activeBarberIds,
        array $occupiedIntervals,
        int $slotMinutes,
    ): int {
        $available = 0;

        foreach ($activeBarberIds as $barberId) {
            $isOccupied = false;
            foreach ($occupiedIntervals[$barberId] ?? [] as $interval) {
                if ($slotMinutes >= $interval['start'] && $slotMinutes < $interval['end']) {
                    $isOccupied = true;
                    break;
                }
            }

            if (! $isOccupied) {
                $available++;
            }
        }

        return $available;
    }

    private function dashboardSlotIsPast(
        Carbon $date,
        int $slotMinutes,
        Carbon $now,
    ): bool {
        return $date->copy()
            ->setTime(intdiv($slotMinutes, 60), $slotMinutes % 60)
            ->addMinutes(15)
            ->lt($now);
    }

    private function dashboardTimeToMinutes(string $time): int
    {
        [$hours, $minutes] = array_map('intval', explode(':', $time));

        return ($hours * 60) + $minutes;
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
