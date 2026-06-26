<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Appointment;
use Carbon\Carbon;

class AnalyticsController extends Controller
{
    private function getDateRange(string $period): array
    {
        $today = Carbon::today();

        return match ($period) {
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
    }

    private function getDateFormat(string $period): string
    {
        return match ($period) {
            'daily' => '%Y-%m-%d',
            'weekly' => '%Y-%u',
            'monthly' => '%Y-%m',
            'yearly' => '%Y',
            default => '%Y-%m',
        };
    }

    public function kpi(Request $request)
    {
        $period = $request->input('period', 'monthly');
        $range = $this->getDateRange($period);

        $completed = Appointment::where('status', 'completed')
            ->whereBetween('appointment_date', [$range['from'], $range['to']])
            ->count();

        $totalRevenue = (float) Appointment::where('status', 'completed')
            ->whereBetween('appointment_date', [$range['from'], $range['to']])
            ->sum('price');

        $cancelled = Appointment::where('status', 'cancelled')
            ->whereBetween('appointment_date', [$range['from'], $range['to']])
            ->count();

        $noShow = Appointment::where('status', 'no_show')
            ->whereBetween('appointment_date', [$range['from'], $range['to']])
            ->count();

        $walkin = Appointment::where('is_walkin', true)
            ->whereIn('status', ['completed', 'approved', 'cancelled', 'no_show'])
            ->whereBetween('appointment_date', [$range['from'], $range['to']])
            ->count();

        $totalCustomers = Appointment::whereBetween('appointment_date', [$range['from'], $range['to']])
            ->distinct('user_id')
            ->count('user_id');

        $avgRating = DB::table('appointment_feedback')
            ->join('appointments', 'appointments.id', '=', 'appointment_feedback.appointment_id')
            ->whereBetween('appointments.appointment_date', [$range['from'], $range['to']])
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
        ]);
    }

    public function revenue(Request $request)
    {
        $period = $request->input('period', 'monthly');
        $range = $this->getDateRange($period);
        $dateFormat = $this->getDateFormat($period);

        $rows = Appointment::select([
                DB::raw("DATE_FORMAT(appointment_date, '{$dateFormat}') as label"),
                DB::raw('SUM(price) as value'),
            ])
            ->where('status', 'completed')
            ->whereBetween('appointment_date', [$range['from'], $range['to']])
            ->groupBy('label')
            ->orderBy('label')
            ->get()
            ->map(fn ($row) => [
                'label' => $row->label,
                'value' => (float) $row->value,
            ]);

        return response()->json($rows);
    }

    public function appointments(Request $request)
    {
        $period = $request->input('period', 'monthly');
        $range = $this->getDateRange($period);
        $dateFormat = $this->getDateFormat($period);

        $rows = Appointment::select([
                DB::raw("DATE_FORMAT(appointment_date, '{$dateFormat}') as label"),
                DB::raw("SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed"),
                DB::raw("SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled"),
                DB::raw("SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show"),
            ])
            ->whereBetween('appointment_date', [$range['from'], $range['to']])
            ->groupBy('label')
            ->orderBy('label')
            ->get()
            ->map(fn ($row) => [
                'label' => $row->label,
                'completed' => (int) $row->completed,
                'cancelled' => (int) $row->cancelled,
                'no_show' => (int) $row->no_show,
            ]);

        return response()->json($rows);
    }

    public function services(Request $request)
    {
        $range = $this->getDateRange($request->input('period', 'monthly'));

        $rows = Appointment::with('service:id,name')
            ->where('status', 'completed')
            ->whereBetween('appointment_date', [$range['from'], $range['to']])
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

    public function barbers(Request $request)
    {
        $range = $this->getDateRange($request->input('period', 'monthly'));

        $rows = Appointment::with('barber:id,fullname')
            ->whereIn('status', ['completed', 'cancelled', 'no_show'])
            ->whereBetween('appointment_date', [$range['from'], $range['to']])
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

    public function ratings(Request $request)
    {
        $range = $this->getDateRange($request->input('period', 'monthly'));

        $rows = DB::table('appointment_feedback')
            ->join('appointments', 'appointments.id', '=', 'appointment_feedback.appointment_id')
            ->select('appointment_feedback.rating', DB::raw('COUNT(*) as count'))
            ->whereBetween('appointments.appointment_date', [$range['from'], $range['to']])
            ->groupBy('appointment_feedback.rating')
            ->orderBy('appointment_feedback.rating')
            ->get()
            ->map(fn ($row) => [
                'rating' => (int) $row->rating,
                'count' => (int) $row->count,
            ]);

        $ratingMap = $rows->keyBy('rating');
        $result = [];
        for ($i = 1; $i <= 5; $i++) {
            $result[] = [
                'rating' => $i,
                'count' => (int) ($ratingMap->get($i)?->count ?? 0),
            ];
        }

        return response()->json($result);
    }

    public function peakHours(Request $request)
    {
        $range = $this->getDateRange($request->input('period', 'monthly'));

        $rows = Appointment::select([
                DB::raw("DATE_FORMAT(appointment_time, '%H:00') as hour"),
                DB::raw('COUNT(*) as count'),
            ])
            ->whereIn('status', ['completed', 'approved'])
            ->whereBetween('appointment_date', [$range['from'], $range['to']])
            ->groupBy('hour')
            ->orderBy('hour')
            ->get()
            ->map(fn ($row) => [
                'hour' => $row->hour,
                'count' => (int) $row->count,
            ]);

        return response()->json($rows);
    }
}
