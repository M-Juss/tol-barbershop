<?php

namespace App\Http\Controllers;

use App\Http\Requests\AnalyticsPeriodRequest;
use App\Http\Requests\AnalyticsReportRequest;
use App\Models\Appointment;
use App\Services\AnalyticsReportService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    private AnalyticsReportService $reportService;

    public function __construct(AnalyticsReportService $reportService)
    {
        $this->reportService = $reportService;
    }

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

        $completed = Appointment::withTrashed()->where('status', 'completed')
            ->where('appointment_date', '>=', $range['from'])
            ->where('appointment_date', '<', $range['end_exclusive'])
            ->count();

        $totalRevenue = (float) Appointment::withTrashed()->where('status', 'completed')
            ->where('appointment_date', '>=', $range['from'])
            ->where('appointment_date', '<', $range['end_exclusive'])
            ->sum('price');

        $cancelled = Appointment::withTrashed()->where('status', 'cancelled')
            ->where('appointment_date', '>=', $range['from'])
            ->where('appointment_date', '<', $range['end_exclusive'])
            ->count();

        $noShow = Appointment::withTrashed()->where('status', 'no_show')
            ->where('appointment_date', '>=', $range['from'])
            ->where('appointment_date', '<', $range['end_exclusive'])
            ->count();

        $walkin = Appointment::withTrashed()->where('is_walkin', true)
            ->whereIn('status', ['completed', 'approved', 'cancelled', 'no_show'])
            ->where('appointment_date', '>=', $range['from'])
            ->where('appointment_date', '<', $range['end_exclusive'])
            ->count();

        $totalCustomers = Appointment::withTrashed()->where('appointment_date', '>=', $range['from'])
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

        $dateExpr = match ($period) {
            'daily' => 'DATE(appointment_date)',
            'weekly' => "strftime('%Y-%W', appointment_date)",
            'yearly' => "strftime('%Y', appointment_date)",
            default => "strftime('%Y-%m', appointment_date)",
        };

        $rows = DB::table('appointments')
            ->selectRaw("{$dateExpr} as label, SUM(price) as value")
            ->where('status', 'completed')
            ->where('appointment_date', '>=', $range['from'])
            ->where('appointment_date', '<', $range['end_exclusive'])
            ->groupBy('label')
            ->orderBy('label')
            ->get()
            ->map(fn ($row) => ['label' => (string) $row->label, 'value' => (float) $row->value]);

        return response()->json($rows);
    }

    public function appointments(AnalyticsPeriodRequest $request)
    {
        $period = $request->period();
        $range = $this->getDateRange($period);

        $dateExpr = match ($period) {
            'daily' => 'DATE(appointment_date)',
            'weekly' => "strftime('%Y-%W', appointment_date)",
            'yearly' => "strftime('%Y', appointment_date)",
            default => "strftime('%Y-%m', appointment_date)",
        };

        $rows = DB::table('appointments')
            ->selectRaw("{$dateExpr} as label, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled, SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show")
            ->where('appointment_date', '>=', $range['from'])
            ->where('appointment_date', '<', $range['end_exclusive'])
            ->groupBy('label')
            ->orderBy('label')
            ->get()
            ->map(fn ($row) => [
                'label' => (string) $row->label,
                'completed' => (int) $row->completed,
                'cancelled' => (int) $row->cancelled,
                'no_show' => (int) $row->no_show,
            ]);

        return response()->json($rows);
    }

    public function services(AnalyticsPeriodRequest $request)
    {
        $range = $this->getDateRange($request->period());

        $rows = DB::table('appointments')
            ->join('services', 'services.id', '=', 'appointments.service_id')
            ->selectRaw('services.name as service_name, COUNT(*) as completed_count, SUM(appointments.price) as revenue')
            ->where('appointments.status', 'completed')
            ->where('appointments.appointment_date', '>=', $range['from'])
            ->where('appointments.appointment_date', '<', $range['end_exclusive'])
            ->groupBy('services.name')
            ->get()
            ->map(fn ($row) => [
                'service_name' => (string) $row->service_name,
                'completed_count' => (int) $row->completed_count,
                'revenue' => (float) $row->revenue,
            ]);

        return response()->json($rows);
    }

    public function barbers(AnalyticsPeriodRequest $request)
    {
        $range = $this->getDateRange($request->period());

        $rows = DB::table('appointments')
            ->join('users', 'users.id', '=', 'appointments.barber_user_id')
            ->selectRaw("users.fullname as barber_name, SUM(CASE WHEN appointments.status = 'completed' THEN 1 ELSE 0 END) as completed_count, SUM(CASE WHEN appointments.status = 'completed' THEN appointments.price ELSE 0 END) as revenue, COUNT(*) as total_appointments")
            ->whereIn('appointments.status', ['completed', 'cancelled', 'no_show'])
            ->where('appointments.appointment_date', '>=', $range['from'])
            ->where('appointments.appointment_date', '<', $range['end_exclusive'])
            ->groupBy('users.fullname')
            ->get()
            ->map(fn ($row) => [
                'barber_name' => (string) $row->barber_name,
                'completed_count' => (int) $row->completed_count,
                'revenue' => (float) $row->revenue,
                'total_appointments' => (int) $row->total_appointments,
            ]);

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

        $rows = DB::table('appointments')
            ->selectRaw('SUBSTR(appointment_time, 1, 5) as hour, COUNT(*) as count')
            ->whereIn('status', ['completed', 'approved'])
            ->where('appointment_date', '>=', $range['from'])
            ->where('appointment_date', '<', $range['end_exclusive'])
            ->groupBy('hour')
            ->orderBy('hour')
            ->get()
            ->map(fn ($row) => ['hour' => (string) $row->hour, 'count' => (int) $row->count]);

        return response()->json($rows);
    }

    public function dayOfWeek(AnalyticsPeriodRequest $request)
    {
        $range = $this->getDateRange($request->period());

        $dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        $rows = DB::table('appointments')
            ->selectRaw("(CAST(strftime('%w', appointment_date) AS INTEGER) + 6) % 7 as day_index, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled, SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show, COUNT(*) as total")
            ->where('appointment_date', '>=', $range['from'])
            ->where('appointment_date', '<', $range['end_exclusive'])
            ->groupBy('day_index')
            ->get()
            ->keyBy('day_index');

        $result = [];
        for ($i = 0; $i < 7; $i++) {
            $dayData = $rows->get($i);
            $result[] = [
                'day' => $dayNames[$i],
                'day_index' => $i,
                'completed' => (int) ($dayData->completed ?? 0),
                'cancelled' => (int) ($dayData->cancelled ?? 0),
                'no_show' => (int) ($dayData->no_show ?? 0),
                'total' => (int) ($dayData->total ?? 0),
            ];
        }

        return response()->json($result);
    }

    public function reports(AnalyticsReportRequest $request)
    {
        $section = $request->section();
        $period = $request->period();
        $comparison = $request->comparison();
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $range = $this->reportService->getDateRange($period, $startDate, $endDate);
        $compRange = $this->reportService->getComparisonRange($range, $comparison);

        $data = match ($section) {
            'overview' => $this->reportService->getOverview($range, $compRange),
            'revenue' => $this->reportService->getRevenue($range, $compRange),
            'appointments' => $this->reportService->getAppointments($range, $compRange),
            'services' => $this->reportService->getServices($range, $compRange),
            'barbers' => $this->reportService->getBarbers($range, $compRange),
            'customers' => $this->reportService->getCustomers($range, $compRange),
            'all' => [
                'overview' => $this->reportService->getOverview($range),
                'revenue' => $this->reportService->getRevenue($range),
                'appointments' => $this->reportService->getAppointments($range),
                'services' => $this->reportService->getServices($range),
                'barbers' => $this->reportService->getBarbers($range),
                'customers' => $this->reportService->getCustomers($range),
            ],
            default => $this->reportService->getOverview($range, $compRange),
        };

        return response()->json([
            'meta' => [
                'section' => $section,
                'period' => $period,
                'comparison' => $comparison,
                'date_range' => [
                    'from' => $range['from'],
                    'to' => $range['to'],
                ],
                'comparison_range' => $compRange ? [
                    'from' => $compRange['from'],
                    'to' => $compRange['to'],
                ] : null,
                'granularity' => $range['granularity'],
                'earliest_date' => $this->reportService->getEarliestDate(),
                'timezone' => 'Asia/Manila',
            ],
            'data' => $data,
        ]);
    }
}
