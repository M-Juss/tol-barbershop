<?php

namespace App\Http\Controllers;

use App\Http\Requests\AppointmentRequest;
use App\Http\Resources\AppointmentResource;
use App\Models\Appointment;
use App\Models\Notification;
use App\Models\Service;
use App\Models\User;
use App\Services\PushNotificationService;
use App\Support\EntityChange;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AppointmentController extends Controller
{
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

        $appointment->update($validated);

        $detailsChanged = $isRescheduling;

        if ($nextStatus && $nextStatus !== $originalStatus) {
            $appointment->loadMissing(['service:id,name', 'barber:id,fullname']);

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
                            'Your %s booking #%d is now complete.',
                            $appointment->service?->name ?? 'barbershop service',
                            $appointment->id
                        ),
                        'payload' => [
                            'appointment_id' => $appointment->id,
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
                        'Your booking is now %s.',
                        str_replace('_', ' ', $nextStatus)
                    ),
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
                    ? sprintf('Your %s booking #%d is now complete.', $appointment->service?->name ?? 'barbershop service', $appointment->id)
                    : sprintf('Your booking is now %s.', str_replace('_', ' ', $nextStatus));

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
                'customer' => $appointment->user?->fullname,
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

    public function exportSummary()
    {
        $completedAppointments = Appointment::where('status', 'completed')->count();
        $pendingAppointments = Appointment::where('status', 'pending')->count();
        $cancelledAppointments = Appointment::where('status', 'cancelled')->count();
        $noShowAppointments = Appointment::where('status', 'no_show')->count();
        $walkinAppointments = Appointment::where('is_walkin', true)->count();
        $totalCustomers = User::where('role', 'customer')->count();
        $totalRevenue = (float) Appointment::where('status', 'completed')->sum('price');

        $startDate = Carbon::today()->subDays(29);
        $endDate = Carbon::today();

        $revenueRows = Appointment::select([
            DB::raw("DATE_FORMAT(appointment_date, '%Y-%m-%d') as date"),
            DB::raw('SUM(price) as revenue'),
        ])
            ->where('status', 'completed')
            ->whereBetween('appointment_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $revenuesByDate = $revenueRows->mapWithKeys(function ($row) {
            return [$row->date => (float) $row->revenue];
        });

        $dailyRevenue = [];
        $cursor = $startDate->copy();
        while ($cursor->lte($endDate)) {
            $key = $cursor->toDateString();
            $dailyRevenue[] = [
                'date' => $key,
                'revenue' => (float) ($revenuesByDate[$key] ?? 0),
            ];
            $cursor->addDay();
        }

        $serviceStats = Appointment::with('service:id,name')
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
            ->values()
            ->all();

        $appointments = Appointment::with(['user:id,fullname,email', 'barber:id,fullname', 'service:id,name'])
            ->latest()
            ->get()
            ->map(function ($appointment) {
                return [
                    'id' => $appointment->id,
                    'customer_name' => $appointment->is_walkin
                        ? ($appointment->walkin_customer_name ?? $appointment->user?->fullname)
                        : $appointment->user?->fullname,
                    'customer_email' => $appointment->is_walkin ? null : $appointment->user?->email,
                    'barber_name' => $appointment->barber?->fullname,
                    'service_name' => $appointment->service?->name,
                    'appointment_date' => $appointment->appointment_date,
                    'appointment_time' => $appointment->appointment_time,
                    'status' => $appointment->status,
                    'price' => (float) $appointment->price,
                    'is_walkin' => (bool) $appointment->is_walkin,
                    'notes' => $appointment->notes,
                    'created_at' => optional($appointment->created_at)?->toDateTimeString(),
                ];
            })
            ->values()
            ->all();

        return response()->json([
            'stats' => [
                'completed_appointments' => $completedAppointments,
                'pending_appointments' => $pendingAppointments,
                'cancelled_appointments' => $cancelledAppointments,
                'no_show_appointments' => $noShowAppointments,
                'walkin_appointments' => $walkinAppointments,
                'total_customers' => $totalCustomers,
                'total_revenue' => $totalRevenue,
            ],
            'daily_revenue' => $dailyRevenue,
            'service_stats' => $serviceStats,
            'appointments' => $appointments,
        ]);
    }
}
