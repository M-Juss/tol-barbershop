<?php

namespace App\Http\Controllers;

use App\Http\Requests\AppointmentHistoryRequest;
use App\Http\Requests\AppointmentRequest;
use App\Http\Requests\BatchAppointmentRequest;
use App\Http\Resources\AppointmentResource;
use App\Models\Appointment;
use App\Models\Notification;
use App\Models\Service;
use App\Models\User;
use App\Services\PushNotificationService;
use App\Support\DisplayId;
use App\Support\EntityChange;
use App\Traits\ApiResponseTrait;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AppointmentController extends Controller
{
    use ApiResponseTrait;

    private const DASHBOARD_SLOT_STATUSES = ['completed', 'approved', 'pending', 'no_show'];

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
        } elseif (! in_array($user?->role, ['admin', 'manager'], true)) {
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
        $service = Service::findOrFail($validated['service_id']);

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
            $now = Carbon::now();

            $appointment = Appointment::create([
                'user_id' => null,
                'service_id' => $validated['service_id'],
                'barber_user_id' => $validated['barber_user_id'],
                'appointment_date' => $now->toDateString(),
                'appointment_time' => $now->format('H:i'),
                'duration_minutes' => $service->duration,
                'price' => $service->price,
                'status' => 'completed',
                'is_walkin' => true,
                'walkin_customer_name' => $validated['walkin_customer_name'] ?? null,
                'walkin_customer_contact_number' => $validated['walkin_customer_contact_number'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'completed_at' => $now,
            ]);

            $appointment->load(['barber', 'service']);
            $appointment->update([
                'customer_name_snapshot' => $appointment->walkin_customer_name,
                'service_name_snapshot' => $appointment->service?->name,
                'barber_name_snapshot' => $appointment->barber?->fullname,
            ]);
            EntityChange::dispatch('appointments');

            return new AppointmentResource($appointment);
        }

        // Prevent double booking
        $existingAppointment = Appointment::where('barber_user_id', $validated['barber_user_id'])
            ->where('appointment_date', $validated['appointment_date'])
            ->where('appointment_time', $validated['appointment_time'])
            ->whereIn('status', ['pending', 'approved'])
            ->exists();

        if ($existingAppointment) {
            return response()->json([
                'message' => 'Barber already has an appointment at this time.',
            ], 422);
        }

        $appointment = Appointment::create([
            'user_id' => $validated['user_id'],
            'service_id' => $validated['service_id'],
            'barber_user_id' => $validated['barber_user_id'],

            'appointment_date' => $validated['appointment_date'],
            'appointment_time' => $validated['appointment_time'],
            'duration_minutes' => $service->duration,

            'price' => $service->price,

            'status' => $validated['status'] ?? 'pending',
            'is_walkin' => (bool) ($validated['is_walkin'] ?? false),

            'notes' => $validated['notes'] ?? null,
        ]);

        $appointment->load([
            'user',
            'barber',
            'service',
        ]);

        $appointment->update([
            'customer_name_snapshot' => $appointment->is_walkin
                ? $appointment->walkin_customer_name
                : $appointment->user?->fullname,
            'service_name_snapshot' => $appointment->service?->name,
            'barber_name_snapshot' => $appointment->barber?->fullname,
        ]);

        if ($appointment->status === 'pending' && ! $canManage) {
            $adminUsers = User::whereIn('role', ['admin', 'manager'])->get();

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
        $canManage = in_array($authUser?->role, ['admin', 'manager'], true);

        if (! $canManage && $authUser?->role !== 'customer') {
            abort(403, 'Unauthorized.');
        }

        $slots = $validated['appointments'];
        $barberUserId = (int) $validated['barber_user_id'];
        $appointmentDate = $validated['appointment_date'];
        $batchId = 'BATCH-'.now()->timestamp.'-'.($authUser->id ?? 'guest');

        $services = Service::whereIn('id', collect($slots)->pluck('service_id'))->get()->keyBy('id');

        foreach ($slots as $slot) {
            $service = $services->get($slot['service_id']);
            if (! $service) {
                return response()->json(['message' => 'Invalid service selected.'], 422);
            }
        }

        $existingAppointments = Appointment::where('barber_user_id', $barberUserId)
            ->where('appointment_date', $appointmentDate)
            ->whereIn('status', ['pending', 'approved'])
            ->get()
            ->keyBy(function ($appt) {
                return substr((string) $appt->appointment_time, 0, 5);
            });

        $slotTimes = [];
        foreach ($slots as $slot) {
            $time = $slot['appointment_time'];

            if (isset($existingAppointments[$time])) {
                return response()->json([
                    'message' => "The time slot {$time} is already booked.",
                ], 422);
            }

            if (in_array($time, $slotTimes, true)) {
                return response()->json([
                    'message' => "Duplicate time slot {$time} in your booking.",
                ], 422);
            }

            $slotTimes[] = $time;
        }

        $createdAppointments = DB::transaction(function () use ($slots, $barberUserId, $appointmentDate, $batchId, $services, $authUser, $validated) {
            $appointments = [];

            foreach ($slots as $slot) {
                $service = $services->get($slot['service_id']);

                $appointment = Appointment::create([
                    'user_id' => $authUser->id,
                    'service_id' => $slot['service_id'],
                    'barber_user_id' => $barberUserId,
                    'appointment_date' => $appointmentDate,
                    'appointment_time' => $slot['appointment_time'],
                    'duration_minutes' => $service->duration,
                    'price' => $service->price,
                    'status' => 'pending',
                    'batch_id' => $batchId,
                    'customer_name' => $slot['customer_name'] ?? null,
                    'customer_name_snapshot' => filled($slot['customer_name'] ?? null)
                        ? $slot['customer_name']
                        : $authUser->fullname,
                    'notes' => $validated['notes'] ?? null,
                ]);

                $appointments[] = $appointment;
            }

            return $appointments;
        });

        if ($authUser->role === 'customer') {
            $appointmentNames = collect($createdAppointments)->map(function ($appt) {
                return ($appt->customer_name ?? $appt->user?->fullname).' — '.($appt->service?->name ?? 'Service');
            })->implode(', ');

            $adminUsers = User::whereIn('role', ['admin', 'manager'])->get();

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

        $createdAppointments[0]->load(['user', 'barber', 'service']);
        $createdAppointments[0]->loadMissing(['user', 'barber', 'service']);

        return AppointmentResource::collection(collect($createdAppointments));
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

        $appointment = Appointment::findOrFail($id);
        $originalStatus = $appointment->status;
        $originalBarberId = $appointment->barber_user_id;
        $originalDate = $appointment->appointment_date;
        $originalTime = $appointment->appointment_time;
        $validated = $request->validated();
        $nextStatus = $validated['status'] ?? null;
        $service = Service::findOrFail($validated['service_id']);
        $validated['duration_minutes'] = $service->duration;
        $validated['price'] = $service->price;

        if ($nextStatus === 'cancelled' || $nextStatus === 'rejected') {
            $reason = $validated['cancellation_reason'] ?? null;
            $validated['cancellation_reason'] = is_string($reason) && trim($reason) !== ''
                ? trim($reason)
                : null;
        } else {
            $validated['cancellation_reason'] = null;
        }

        if ($nextStatus === 'completed' && $originalStatus !== 'completed' && ! $appointment->completed_at) {
            $validated['completed_at'] = Carbon::now();
        }

        if ($nextStatus === 'rejected' && $originalStatus !== 'rejected') {
            $validated['rejected_at'] = Carbon::now();
        }

        $isRescheduling = (
            $nextStatus === 'approved' || $nextStatus === null
        ) && (
            (string) $validated['barber_user_id'] !== (string) $originalBarberId ||
            $validated['appointment_date'] !== $originalDate ||
            $validated['appointment_time'] !== $originalTime
        );

        if ($isRescheduling) {
            $hasConflict = Appointment::where('id', '!=', $id)
                ->where('barber_user_id', $validated['barber_user_id'])
                ->where('appointment_date', $validated['appointment_date'])
                ->where('appointment_time', $validated['appointment_time'])
                ->whereIn('status', ['pending', 'approved'])
                ->exists();

            if ($hasConflict) {
                return response()->json([
                    'message' => 'Selected barber already has an appointment at this time.',
                ], 422);
            }
        }

        $appointment->loadMissing(['user', 'barber', 'service']);

        $appointment->update(array_merge($validated, [
            'customer_name_snapshot' => $appointment->is_walkin
                ? ($appointment->walkin_customer_name ?? $validated['walkin_customer_name'] ?? null)
                : (filled($appointment->customer_name)
                    ? $appointment->customer_name
                    : $appointment->user?->fullname),
            'service_name_snapshot' => $service->name,
            'barber_name_snapshot' => $appointment->barber?->fullname,
        ]));

        $detailsChanged = $isRescheduling;

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
    public function destroy(string $id)
    {
        $appointment = Appointment::findOrFail($id);

        $appointment->delete();
        EntityChange::dispatch('appointments');

        return response()->json([
            'message' => 'Appointment deleted successfully.',
        ]);
    }

    public function overviewStats()
    {
        $completedAppointments = Appointment::where('status', 'completed')->count();
        $pendingAppointments = Appointment::where('status', 'pending')->count();
        $approvedAppointments = Appointment::where('status', 'approved')->count();
        $totalCustomers = User::where('role', 'customer')->count();
        $totalRevenue = (float) Appointment::where('status', 'completed')->sum('price');

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

        $rows = Appointment::select([
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
        $rows = Appointment::with('service:id,name')
            ->where('status', 'completed')
            ->get()
            ->groupBy(function ($appointment) {
                return $appointment->service?->name ?? 'Unknown';
            })
            ->map(function ($appointments, $serviceName) {
                return [
                    'service_name' => $serviceName,
                    'completed_count' => $appointments->count(),
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
            $time12 = Carbon::createFromTime($hour, 0)->format('g:i A');
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
            'barber_id' => ['required', 'integer', 'exists:users,id'],
            'date' => ['required', 'date_format:Y-m-d'],
        ]);

        $times = Appointment::where('barber_user_id', $validated['barber_id'])
            ->where('appointment_date', $validated['date'])
            ->whereIn('status', ['pending', 'approved'])
            ->pluck('appointment_time')
            ->map(fn ($time) => substr((string) $time, 0, 5))
            ->values();

        return response()->json([
            'data' => $times,
        ]);
    }
}
