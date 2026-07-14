<?php

namespace App\Http\Controllers;

use App\Http\Requests\AnalyticsPeriodRequest;
use App\Models\Appointment;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    private function getDateRange(string $period): array
    {
        $today = Carbon::today();

        $range = match ($period) {
            'daily' => [
                'from' => $today->copy()->subDays(6)->toDateString(),
                'to' => $today->toDateString(),
            ],
            'weekly' => [
                'from' => $today->copy()->subWeeks(11)->startOfWeek()->toDateString(),
                'to' => $today->toDateString(),
            ],
            'monthly' => [
                'from' => $today->copy()->subMonths(11)->startOfMonth()->toDateString(),
                'to' => $today->toDateString(),
            ],
            'yearly' => [
                'from' => $today->copy()->subYears(4)->startOfYear()->toDateString(),
                'to' => $today->toDateString(),
            ],
            default => [
                'from' => $today->copy()->subMonths(11)->startOfMonth()->toDateString(),
                'to' => $today->toDateString(),
            ],
        };

        $range['end_exclusive'] = Carbon::parse($range['to'])->addDay()->toDateString();

        return $range;
    }

    private function getGroupLabel(Carbon $date, string $period): string
    {
        return match ($period) {
            'daily' => $date->format('Y-m-d'),
            'weekly' => $date->format('o-W'),
            'monthly' => $date->format('Y-m'),
            'yearly' => $date->format('Y'),
            default => $date->format('Y-m'),
        };
    }

    public function kpi(AnalyticsPeriodRequest $request)
    {
        $period = $request->period();
        $range = $this->getDateRange($period);

        $completed = Appointment::where('status', 'completed')
            ->where('appointment_date', '>=', $range['from'])
            ->where('appointment_date', '<', $range['end_exclusive'])
            ->count();

        $totalRevenue = (float) Appointment::where('status', 'completed')
            ->where('appointment_date', '>=', $range['from'])
            ->where('appointment_date', '<', $range['end_exclusive'])
            ->sum('price');

        $cancelled = Appointment::where('status', 'cancelled')
            ->where('appointment_date', '>=', $range['from'])
            ->where('appointment_date', '<', $range['end_exclusive'])
            ->count();

        $noShow = Appointment::where('status', 'no_show')
            ->where('appointment_date', '>=', $range['from'])
            ->where('appointment_date', '<', $range['end_exclusive'])
            ->count();

        $walkin = Appointment::where('is_walkin', true)
            ->whereIn('status', ['completed', 'approved', 'cancelled', 'no_show'])
            ->where('appointment_date', '>=', $range['from'])
            ->where('appointment_date', '<', $range['end_exclusive'])
            ->count();

        $totalCustomers = Appointment::where('appointment_date', '>=', $range['from'])
            ->where('appointment_date', '<', $range['end_exclusive'])
            ->distinct('user_id')
            ->count('user_id');

        $avgRating = DB::table('appointment_feedback')
            ->join('appointments', 'appointments.id', '=', 'appointment_feedback.appointment_id')
            ->where('appointments.appointment_date', '>=', $range['from'])
            ->where('appointments.appointment_date', '<', $range['end_exclusive'])
            ->avg('appointment_feedback.rating');

        $completionRate = ($completed + $cancelled + $noShow) > 0
            ? round(($completed / ($completed + $cancelled + $noShow)) * 100, 1)
            : 0;

        return response()->json([
            'total_revenue' => $totalRevenue,
            'completed_appointments' => $completed,
            'average_rating' => $avgRating ? round((float) $avgRating, 1) : 0,
            'total_customers' => $totalCustomers,
            'completion_rate' => $completionRate,
            'walkin_count' => $walkin,
            'cancelled_count' => $cancelled,
            'date_range' => [
                'from' => $range['from'],
                'to' => $range['to'],
            ],
        ]);
    }

    public function revenue(AnalyticsPeriodRequest $request)
    {
        $period = $request->period();
        $range = $this->getDateRange($period);

        $rows = Appointment::select(['appointment_date', 'price'])
            ->where('status', 'completed')
            ->where('appointment_date', '>=', $range['from'])
            ->where('appointment_date', '<', $range['end_exclusive'])
            ->get()
            ->groupBy(fn ($appointment) => $this->getGroupLabel($appointment->appointment_date, $period))
            ->map(fn ($appointments, $label) => [
                'label' => (string) $label,
                'value' => (float) $appointments->sum('price'),
            ])
            ->sortBy('label')
            ->values();

        return response()->json($rows);
    }

    public function appointments(AnalyticsPeriodRequest $request)
    {
        $period = $request->period();
        $range = $this->getDateRange($period);

        $rows = Appointment::select(['appointment_date', 'status'])
            ->where('appointment_date', '>=', $range['from'])
            ->where('appointment_date', '<', $range['end_exclusive'])
            ->get()
            ->groupBy(fn ($appointment) => $this->getGroupLabel($appointment->appointment_date, $period))
            ->map(fn ($appointments, $label) => [
                'label' => (string) $label,
                'completed' => $appointments->where('status', 'completed')->count(),
                'cancelled' => $appointments->where('status', 'cancelled')->count(),
                'no_show' => $appointments->where('status', 'no_show')->count(),
            ])
            ->sortBy('label')
            ->values();

        return response()->json($rows);
    }

    public function services(AnalyticsPeriodRequest $request)
    {
        $range = $this->getDateRange($request->period());

        $rows = Appointment::with('service:id,name')
            ->where('status', 'completed')
            ->where('appointment_date', '>=', $range['from'])
            ->where('appointment_date', '<', $range['end_exclusive'])
            ->get()
            ->groupBy(fn ($appt) => $appt->service?->name ?? 'Unknown')
            ->map(fn ($appts, $name) => [
                'service_name' => $name,
                'completed_count' => $appts->count(),
                'revenue' => (float) $appts->sum('price'),
            ])
            ->values();

        return response()->json($rows);
    }

    public function barbers(AnalyticsPeriodRequest $request)
    {
        $range = $this->getDateRange($request->period());

        $rows = Appointment::with('barber:id,fullname')
            ->whereIn('status', ['completed', 'cancelled', 'no_show'])
            ->where('appointment_date', '>=', $range['from'])
            ->where('appointment_date', '<', $range['end_exclusive'])
            ->get()
            ->groupBy(fn ($appt) => $appt->barber?->fullname ?? 'Unknown')
            ->map(function ($appts, $name) {
                $completedAppts = $appts->where('status', 'completed');

                return [
                    'barber_name' => $name,
                    'completed_count' => $completedAppts->count(),
                    'revenue' => (float) $completedAppts->sum('price'),
                    'total_appointments' => $appts->count(),
                ];
            })
            ->values();

        return response()->json($rows);
    }

    public function ratings(AnalyticsPeriodRequest $request)
    {
        $range = $this->getDateRange($request->period());

        $rows = DB::table('appointment_feedback')
            ->select('rating', DB::raw('COUNT(*) as count'))
            ->join('appointments', 'appointments.id', '=', 'appointment_feedback.appointment_id')
            ->where('appointments.appointment_date', '>=', $range['from'])
            ->where('appointments.appointment_date', '<', $range['end_exclusive'])
            ->groupBy('rating')
            ->orderBy('rating')
            ->get()
            ->keyBy('rating');

        $result = [];
        for ($i = 1; $i <= 5; $i++) {
            $result[] = [
                'rating' => $i,
                'count' => (int) ($rows->get($i)?->count ?? 0),
            ];
        }

        return response()->json($result);
    }

    public function peakHours(AnalyticsPeriodRequest $request)
    {
        $range = $this->getDateRange($request->period());

        $rows = Appointment::select(['appointment_time'])
            ->whereIn('status', ['completed', 'approved'])
            ->where('appointment_date', '>=', $range['from'])
            ->where('appointment_date', '<', $range['end_exclusive'])
            ->get()
            ->groupBy(fn ($appointment) => sprintf('%02d:00', (int) substr($appointment->appointment_time, 0, 2)))
            ->filter(function ($appointments, $hour) {
                $hourValue = (int) substr($hour, 0, 2);

                return $hourValue >= 9 && $hourValue <= 19;
            })
            ->map(fn ($appointments, $hour) => [
                'hour' => $hour,
                'count' => $appointments->count(),
            ])
            ->sortBy('hour')
            ->values();

        return response()->json($rows);
    }

    public function dayOfWeek(AnalyticsPeriodRequest $request)
    {
        $range = $this->getDateRange($request->period());

        $dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        $rows = Appointment::select(['appointment_date', 'status'])
            ->where('appointment_date', '>=', $range['from'])
            ->where('appointment_date', '<', $range['end_exclusive'])
            ->get()
            ->groupBy(fn ($appointment) => $appointment->appointment_date->dayOfWeekIso - 1);

        $result = [];
        for ($i = 0; $i < 7; $i++) {
            $dayData = $rows->get($i, collect());
            $result[] = [
                'day' => $dayNames[$i],
                'day_index' => $i,
                'completed' => $dayData->where('status', 'completed')->count(),
                'cancelled' => $dayData->where('status', 'cancelled')->count(),
                'no_show' => $dayData->where('status', 'no_show')->count(),
                'total' => $dayData->count(),
            ];
        }

        return response()->json($result);
    }
}
