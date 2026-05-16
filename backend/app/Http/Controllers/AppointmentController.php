<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Notification;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use App\Http\Requests\AppointmentRequest;
use App\Http\Resources\AppointmentResource;

class AppointmentController extends Controller
{
    private const DASHBOARD_SLOT_STATUSES = ['completed', 'approved', 'pending', 'no_show'];

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $appointments = Appointment::with([
            'user',
            'barber',
            'service',
        ])->latest()->get();

        return AppointmentResource::collection($appointments);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(AppointmentRequest $request)
    {
        $validated = $request->validated();
        $isWalkin = (bool) ($validated['is_walkin'] ?? false);

        if ($isWalkin) {
            $now = Carbon::now();
            $normalizedPhone = preg_replace('/\D+/', '', (string) ($validated['walkin_customer_contact_number'] ?? ''));
            $dummyEmail = 'walkin+' . ($normalizedPhone !== '' ? $normalizedPhone : uniqid()) . '+' . $now->timestamp . '@walkin.local';

            $customer = User::create([
                'fullname' => $validated['walkin_customer_name'] ?? 'Walk-in Customer',
                'email' => $dummyEmail,
                'contact_number' => $validated['walkin_customer_contact_number'] ?? '',
                'password' => bcrypt('Walkin123!'),
                'role' => 'customer',
                'is_active' => true,
            ]);

            $appointment = Appointment::create([
                'user_id' => $customer->id,
                'service_id' => $validated['service_id'],
                'barber_user_id' => $validated['barber_user_id'],
                'appointment_date' => $now->toDateString(),
                'appointment_time' => $now->format('H:i'),
                'duration_minutes' => $validated['duration_minutes'] ?? null,
                'price' => $validated['price'],
                'status' => 'completed',
                'is_walkin' => true,
                'notes' => $validated['notes'] ?? null,
                'completed_at' => $now,
            ]);

            $appointment->load(['user', 'barber', 'service']);
            return new AppointmentResource($appointment);
        }

        // Prevent double booking
        $existingAppointment = Appointment::where('barber_user_id', $request->barber_user_id)
            ->where('appointment_date', $request->appointment_date)
            ->where('appointment_time', $request->appointment_time)
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
            'duration_minutes' => $validated['duration_minutes'] ?? null,

            'price' => $validated['price'],

            'status' => $validated['status'] ?? 'pending',
            'is_walkin' => (bool) ($validated['is_walkin'] ?? false),

            'notes' => $validated['notes'] ?? null,
        ]);

        $appointment->load([
            'user',
            'barber',
            'service',
        ]);

        return new AppointmentResource($appointment);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $appointment = Appointment::with([
            'user',
            'barber',
            'service',
        ])->findOrFail($id);

        return new AppointmentResource($appointment);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(AppointmentRequest $request, string $id)
    {
        $appointment = Appointment::findOrFail($id);
        $originalStatus = $appointment->status;
        $validated = $request->validated();

        if (($validated['status'] ?? null) === 'cancelled') {
            $reason = $validated['cancellation_reason'] ?? null;
            $validated['cancellation_reason'] = is_string($reason) && trim($reason) !== ''
                ? trim($reason)
                : null;
        } else {
            $validated['cancellation_reason'] = null;
        }

        $appointment->update($validated);

        if (($validated['status'] ?? null) && $validated['status'] !== $originalStatus) {
            Notification::create([
                'user_id' => $appointment->user_id,
                'type' => 'appointment_status',
                'title' => 'Appointment Status Updated',
                'message' => sprintf(
                    'Your appointment #%d is now %s.',
                    $appointment->id,
                    str_replace('_', ' ', $validated['status'])
                ),
                'payload' => [
                    'appointment_id' => $appointment->id,
                    'status' => $validated['status'],
                ],
                'created_by_user_id' => $request->user()?->id,
            ]);
        }

        $appointment->load([
            'user',
            'barber',
            'service',
        ]);

        return new AppointmentResource($appointment);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $appointment = Appointment::findOrFail($id);

        $appointment->delete();

        return response()->json([
            'message' => 'Appointment deleted successfully.',
        ]);
    }

    public function overviewStats()
    {
        $completedAppointments = Appointment::where('status', 'completed')->count();
        $pendingAppointments = Appointment::where('status', 'pending')->count();
        $totalCustomers = User::where('role', 'customer')->count();
        $totalRevenue = (float) Appointment::where('status', 'completed')->sum('price');

        return response()->json([
            'completed_appointments' => $completedAppointments,
            'pending_appointments' => $pendingAppointments,
            'total_customers' => $totalCustomers,
            'total_revenue' => $totalRevenue,
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

        $appointments = Appointment::with(['user:id,fullname', 'barber:id,fullname', 'service:id,name'])
            ->whereDate('appointment_date', $date)
            ->whereIn('status', self::DASHBOARD_SLOT_STATUSES)
            ->get();

        $slotMap = [];
        foreach ($appointments as $appointment) {
            $time24 = substr((string) $appointment->appointment_time, 0, 5);
            $time12 = Carbon::createFromFormat('H:i', $time24)->format('g:i A');

            $slotMap[$time12] = [
                'time' => $time12,
                'customer' => $appointment->user?->fullname,
                'service' => $appointment->service?->name,
                'barber' => $appointment->barber?->fullname,
                'status' => $appointment->status,
            ];
        }

        $slots = [];
        for ($hour = 9; $hour <= 19; $hour++) {
            $time12 = Carbon::createFromTime($hour, 0)->format('g:i A');
            $slots[] = $slotMap[$time12] ?? [
                'time' => $time12,
                'customer' => null,
                'service' => null,
                'barber' => null,
                'status' => 'available',
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
                    'customer_name' => $appointment->user?->fullname,
                    'customer_email' => $appointment->user?->email,
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
