<?php

namespace App\Services;

use App\Models\Appointment;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AnalyticsReportService
{
    private const SHOP_TIMEZONE = 'Asia/Manila';

    public function getDateRange(string $period, ?string $startDate = null, ?string $endDate = null): array
    {
        $today = Carbon::today(self::SHOP_TIMEZONE);

        if ($period === 'custom' && $startDate && $endDate) {
            $from = Carbon::parse($startDate, self::SHOP_TIMEZONE)->startOfDay();
            $to = Carbon::parse($endDate, self::SHOP_TIMEZONE)->endOfDay();
            $granularity = $this->inferGranularity($from, $to);

            return [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'end_exclusive' => $to->copy()->addDay()->toDateString(),
                'granularity' => $granularity,
            ];
        }

        $range = match ($period) {
            'daily' => [
                'from' => $today->copy()->subDays(6)->toDateString(),
                'to' => $today->toDateString(),
                'granularity' => 'daily',
            ],
            'weekly' => [
                'from' => $today->copy()->subDays(83)->toDateString(),
                'to' => $today->toDateString(),
                'granularity' => 'weekly',
            ],
            'monthly' => [
                'from' => $today->copy()->startOfMonth()->subMonths(11)->toDateString(),
                'to' => $today->toDateString(),
                'granularity' => 'monthly',
            ],
            'yearly' => [
                'from' => $today->copy()->subYears(4)->startOfYear()->toDateString(),
                'to' => $today->toDateString(),
                'granularity' => 'yearly',
            ],
            '7_days' => [
                'from' => $today->copy()->subDays(6)->toDateString(),
                'to' => $today->toDateString(),
                'granularity' => 'daily',
            ],
            '30_days' => [
                'from' => $today->copy()->subDays(27)->toDateString(),
                'to' => $today->toDateString(),
                'granularity' => 'weekly',
            ],
            '3_months' => [
                'from' => $today->copy()->subDays(83)->toDateString(),
                'to' => $today->toDateString(),
                'granularity' => 'weekly',
            ],
            '6_months' => [
                'from' => $today->copy()->startOfMonth()->subMonths(5)->toDateString(),
                'to' => $today->toDateString(),
                'granularity' => 'monthly',
            ],
            '12_months' => [
                'from' => $today->copy()->startOfMonth()->subMonths(11)->toDateString(),
                'to' => $today->toDateString(),
                'granularity' => 'monthly',
            ],
            default => [
                'from' => $today->copy()->subDays(6)->toDateString(),
                'to' => $today->toDateString(),
                'granularity' => 'daily',
            ],
        };

        $range['end_exclusive'] = Carbon::parse($range['to'], self::SHOP_TIMEZONE)->addDay()->toDateString();

        return $range;
    }

    public function getComparisonRange(array $range, string $comparison): ?array
    {
        if ($comparison === 'none') {
            return null;
        }

        $from = Carbon::parse($range['from']);
        $to = Carbon::parse($range['to']);
        $days = $from->diffInDays($to);

        if ($comparison === 'previous_year') {
            $compFrom = $from->copy()->subYear();
            $compTo = $from->copy()->subYear()->addDays($days);
        } else {
            $compTo = $from->copy()->subDay();
            $compFrom = $compTo->copy()->subDays($days);
        }

        $compTo = min($compTo, Carbon::yesterday(self::SHOP_TIMEZONE));

        if ($compFrom->isAfter($compTo)) {
            return null;
        }

        return [
            'from' => $compFrom->toDateString(),
            'to' => $compTo->toDateString(),
            'end_exclusive' => $compTo->copy()->addDay()->toDateString(),
        ];
    }

    public function getEarliestDate(): string
    {
        $earliest = Appointment::withTrashed()->min('appointment_date');

        return $earliest ? Carbon::parse($earliest)->toDateString() : now(self::SHOP_TIMEZONE)->toDateString();
    }

    public function getOverview(array $range, ?array $compRange = null): array
    {
        $data = $this->getOverviewMetrics($range['from'], $range['end_exclusive']);
        $data['comparison'] = $compRange
            ? $this->getOverviewMetrics($compRange['from'], $compRange['end_exclusive'])
            : null;
        $data['insights'] = $this->getInsights($range['from'], $range['end_exclusive']);

        return $data;
    }

    public function getRevenue(array $range, ?array $compRange = null): array
    {
        $data = $this->getRevenueMetrics($range['from'], $range['end_exclusive'], $range['granularity']);
        $data['comparison'] = $compRange
            ? $this->getRevenueMetrics($compRange['from'], $compRange['end_exclusive'], $range['granularity'])
            : null;

        return $data;
    }

    public function getAppointments(array $range, ?array $compRange = null): array
    {
        $data = $this->getAppointmentMetrics($range['from'], $range['end_exclusive'], $range['granularity']);
        $data['comparison'] = $compRange
            ? $this->getAppointmentMetrics($compRange['from'], $compRange['end_exclusive'], $range['granularity'])
            : null;

        return $data;
    }

    public function getServices(array $range, ?array $compRange = null): array
    {
        $data = $this->getServiceMetrics($range['from'], $range['end_exclusive']);
        $data['comparison'] = $compRange
            ? $this->getServiceMetrics($compRange['from'], $compRange['end_exclusive'])
            : null;

        return $data;
    }

    public function getBarbers(array $range, ?array $compRange = null): array
    {
        $data = $this->getBarberMetrics($range['from'], $range['end_exclusive']);
        $data['comparison'] = $compRange
            ? $this->getBarberMetrics($compRange['from'], $compRange['end_exclusive'])
            : null;

        return $data;
    }

    public function getCustomers(array $range, ?array $compRange = null): array
    {
        $data = $this->getCustomerMetrics($range['from'], $range['end_exclusive']);
        $data['comparison'] = $compRange
            ? $this->getCustomerMetrics($compRange['from'], $compRange['end_exclusive'])
            : null;

        return $data;
    }

    private function getOverviewMetrics(string $from, string $endExclusive): array
    {
        $completed = $this->countByStatus('completed', $from, $endExclusive);
        $cancelled = $this->countByStatus('cancelled', $from, $endExclusive);
        $noShow = $this->countByStatus('no_show', $from, $endExclusive);
        $totalRevenue = $this->sumRevenue($from, $endExclusive);
        $totalCustomers = $this->countDistinctCustomers($from, $endExclusive);
        $avgRating = $this->averageRating($from, $endExclusive);

        $resolved = $completed + $cancelled + $noShow;
        $completionRate = $resolved > 0 ? round(($completed / $resolved) * 100, 1) : 0;

        return [
            'total_revenue' => (float) $totalRevenue,
            'completed_appointments' => (int) $completed,
            'completion_rate' => $completionRate,
            'total_customers' => (int) $totalCustomers,
            'average_rating' => $avgRating ? round((float) $avgRating, 1) : 0,
            'cancelled_count' => (int) $cancelled,
            'no_show_count' => (int) $noShow,
        ];
    }

    private function getRevenueMetrics(string $from, string $endExclusive, string $granularity): array
    {
        $dailyRevenue = Appointment::withTrashed()
            ->select('appointment_date', DB::raw('SUM(price) as revenue'))
            ->where('status', 'completed')
            ->where('appointment_date', '>=', $from)
            ->where('appointment_date', '<', $endExclusive)
            ->groupBy('appointment_date')
            ->orderBy('appointment_date')
            ->get();

        $revenueBuckets = $this->makeBucketTemplate($from, $endExclusive, $granularity, [
            'value' => 0.0,
        ]);

        foreach ($dailyRevenue as $row) {
            $bucket = $this->bucketKey($row->appointment_date, $from, $granularity);
            $revenueBuckets[$bucket]['value'] += (float) $row->revenue;
        }

        $revenueByDate = collect(array_values($revenueBuckets));

        $totalRevenue = $revenueByDate->sum('value');
        $completedCount = $this->countByStatus('completed', $from, $endExclusive);
        $avgRevenuePerAppointment = $completedCount > 0 ? round($totalRevenue / $completedCount, 2) : 0;

        $revenueByService = Appointment::withTrashed()
            ->select('service_id', DB::raw('SUM(price) as revenue'), DB::raw('COUNT(*) as count'))
            ->where('status', 'completed')
            ->where('appointment_date', '>=', $from)
            ->where('appointment_date', '<', $endExclusive)
            ->groupBy('service_id')
            ->get()
            ->map(function ($row) {
                $name = $this->getServiceName($row->service_id);

                return [
                    'service_id' => (int) $row->service_id,
                    'service_name' => $name,
                    'revenue' => (float) $row->revenue,
                    'count' => (int) $row->count,
                ];
            })
            ->sortByDesc('revenue')
            ->values();

        $revenueByBarber = Appointment::withTrashed()
            ->select('barber_user_id', DB::raw('SUM(price) as revenue'), DB::raw('COUNT(*) as count'))
            ->where('status', 'completed')
            ->where('appointment_date', '>=', $from)
            ->where('appointment_date', '<', $endExclusive)
            ->groupBy('barber_user_id')
            ->get()
            ->map(function ($row) {
                $name = $this->getBarberName($row->barber_user_id);

                return [
                    'barber_id' => (int) $row->barber_user_id,
                    'barber_name' => $name,
                    'revenue' => (float) $row->revenue,
                    'count' => (int) $row->count,
                ];
            })
            ->sortByDesc('revenue')
            ->values();

        $onlineRevenue = (float) Appointment::withTrashed()
            ->where('status', 'completed')
            ->where('is_walkin', false)
            ->where('appointment_date', '>=', $from)
            ->where('appointment_date', '<', $endExclusive)
            ->sum('price');

        $walkinRevenue = (float) Appointment::withTrashed()
            ->where('status', 'completed')
            ->where('is_walkin', true)
            ->where('appointment_date', '>=', $from)
            ->where('appointment_date', '<', $endExclusive)
            ->sum('price');

        $peakRevenue = $revenueByDate->sortByDesc('value')->first();
        $lowRevenue = $revenueByDate->sortBy('value')->first();

        return [
            'total_revenue' => (float) $totalRevenue,
            'average_per_appointment' => $avgRevenuePerAppointment,
            'by_date' => $revenueByDate->values(),
            'by_service' => $revenueByService,
            'by_barber' => $revenueByBarber,
            'online_revenue' => $onlineRevenue,
            'walkin_revenue' => $walkinRevenue,
            'highest_period' => $peakRevenue ? ['date' => $peakRevenue['date'], 'value' => $peakRevenue['value']] : null,
            'lowest_period' => $lowRevenue ? ['date' => $lowRevenue['date'], 'value' => $lowRevenue['value']] : null,
        ];
    }

    private function getAppointmentMetrics(string $from, string $endExclusive, string $granularity): array
    {
        $appointments = Appointment::withTrashed()
            ->select('appointment_date', 'status', 'is_walkin', 'appointment_time')
            ->where('appointment_date', '>=', $from)
            ->where('appointment_date', '<', $endExclusive)
            ->get();

        $appointmentBuckets = $this->makeBucketTemplate($from, $endExclusive, $granularity, [
            'completed' => 0,
            'cancelled' => 0,
            'no_show' => 0,
            'approved' => 0,
            'pending' => 0,
            'total' => 0,
        ]);

        foreach ($appointments as $appointment) {
            $bucket = $this->bucketKey($appointment->appointment_date, $from, $granularity);
            if (array_key_exists($appointment->status, $appointmentBuckets[$bucket])) {
                $appointmentBuckets[$bucket][$appointment->status]++;
            }
            $appointmentBuckets[$bucket]['total']++;
        }

        $byDate = collect(array_values($appointmentBuckets));

        $completed = $appointments->where('status', 'completed')->count();
        $cancelled = $appointments->where('status', 'cancelled')->count();
        $noShow = $appointments->where('status', 'no_show')->count();
        $resolved = $completed + $cancelled + $noShow;

        $completedRate = $resolved > 0 ? round(($completed / $resolved) * 100, 1) : 0;
        $cancelledRate = $resolved > 0 ? round(($cancelled / $resolved) * 100, 1) : 0;
        $noShowRate = $resolved > 0 ? round(($noShow / $resolved) * 100, 1) : 0;

        $dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        $byDayOfWeek = $appointments
            ->groupBy(fn ($a) => $a->appointment_date->dayOfWeekIso - 1)
            ->map(fn ($appts, $dayIdx) => [
                'day' => $dayNames[$dayIdx],
                'day_index' => (int) $dayIdx,
                'completed' => $appts->where('status', 'completed')->count(),
                'cancelled' => $appts->where('status', 'cancelled')->count(),
                'no_show' => $appts->where('status', 'no_show')->count(),
                'total' => $appts->count(),
            ])
            ->sortBy('day_index')
            ->values();

        $peakHours = $appointments
            ->whereIn('status', ['completed', 'approved'])
            ->groupBy(fn ($a) => substr((string) $a->appointment_time, 0, 5))
            ->map(fn ($appts, $hour) => ['hour' => $hour, 'count' => $appts->count()])
            ->sortBy('hour')
            ->values();

        $onlineCount = $appointments->where('is_walkin', false)->count();
        $walkinCount = $appointments->where('is_walkin', true)->count();
        $totalDays = Carbon::parse($from, self::SHOP_TIMEZONE)
            ->diffInDays(Carbon::parse($endExclusive, self::SHOP_TIMEZONE));
        $avgPerDay = $totalDays > 0 ? round($appointments->count() / $totalDays, 1) : 0;

        return [
            'total' => (int) $appointments->count(),
            'completed' => (int) $completed,
            'cancelled' => (int) $cancelled,
            'no_show' => (int) $noShow,
            'completion_rate' => $completedRate,
            'cancellation_rate' => $cancelledRate,
            'no_show_rate' => $noShowRate,
            'average_per_day' => $avgPerDay,
            'online_count' => (int) $onlineCount,
            'walkin_count' => (int) $walkinCount,
            'by_date' => $byDate,
            'by_day_of_week' => $byDayOfWeek,
            'peak_hours' => $peakHours,
        ];
    }

    private function getServiceMetrics(string $from, string $endExclusive): array
    {
        $appointments = Appointment::withTrashed()
            ->select('service_id', 'status', 'price')
            ->where('appointment_date', '>=', $from)
            ->where('appointment_date', '<', $endExclusive)
            ->get();

        $byService = $appointments
            ->groupBy('service_id')
            ->map(function ($appts, $serviceId) {
                $name = $this->getServiceName($serviceId);
                $completed = $appts->where('status', 'completed');
                $cancelled = $appts->where('status', 'cancelled');
                $noShow = $appts->where('status', 'no_show');
                $resolved = $completed->count() + $cancelled->count() + $noShow->count();

                return [
                    'service_id' => (int) $serviceId,
                    'service_name' => $name,
                    'total_count' => $appts->count(),
                    'completed_count' => $completed->count(),
                    'cancelled_count' => $cancelled->count(),
                    'no_show_count' => $noShow->count(),
                    'revenue' => (float) $completed->sum('price'),
                    'average_revenue' => $completed->count() > 0 ? round((float) $completed->sum('price') / $completed->count(), 2) : 0,
                    'completion_rate' => $resolved > 0 ? round(($completed->count() / $resolved) * 100, 1) : 0,
                ];
            })
            ->sortByDesc('completed_count')
            ->values();

        $totalRevenue = $byService->sum('revenue');
        $totalCompleted = $byService->sum('completed_count');
        $avgRevenuePerService = $byService->isNotEmpty() ? round($totalRevenue / $byService->count(), 2) : 0;

        return [
            'services' => $byService,
            'most_booked' => $byService->isNotEmpty() ? $byService->first() : null,
            'least_booked' => $byService->isNotEmpty() ? $byService->last() : null,
            'average_revenue_per_service' => $avgRevenuePerService,
        ];
    }

    private function getBarberMetrics(string $from, string $endExclusive): array
    {
        $appointments = Appointment::withTrashed()
            ->select('barber_user_id', 'status', 'price')
            ->where('appointment_date', '>=', $from)
            ->where('appointment_date', '<', $endExclusive)
            ->whereIn('status', ['completed', 'cancelled', 'no_show'])
            ->get();

        $ratings = DB::table('appointment_feedback')
            ->join('appointments', 'appointments.id', '=', 'appointment_feedback.appointment_id')
            ->where('appointments.appointment_date', '>=', $from)
            ->where('appointments.appointment_date', '<', $endExclusive)
            ->select('appointments.barber_user_id', DB::raw('AVG(appointment_feedback.rating) as avg_rating'), DB::raw('COUNT(*) as rating_count'))
            ->groupBy('appointments.barber_user_id')
            ->get()
            ->keyBy('barber_user_id');

        $byBarber = $appointments
            ->groupBy('barber_user_id')
            ->map(function ($appts, $barberId) use ($ratings) {
                $name = $this->getBarberName($barberId);
                $completed = $appts->where('status', 'completed');
                $total = $appts->count();
                $resolved = $completed->count() + $appts->where('status', 'cancelled')->count() + $appts->where('status', 'no_show')->count();
                $ratingRow = $ratings->get($barberId);

                return [
                    'barber_id' => (int) $barberId,
                    'barber_name' => $name,
                    'completed_count' => $completed->count(),
                    'cancelled_count' => $appts->where('status', 'cancelled')->count(),
                    'no_show_count' => $appts->where('status', 'no_show')->count(),
                    'total_appointments' => $total,
                    'revenue' => (float) $completed->sum('price'),
                    'average_rating' => $ratingRow ? round((float) $ratingRow->avg_rating, 1) : null,
                    'rating_count' => $ratingRow ? (int) $ratingRow->rating_count : 0,
                    'completion_rate' => $resolved > 0 ? round(($completed->count() / $resolved) * 100, 1) : 0,
                ];
            })
            ->sortByDesc('completed_count')
            ->values();

        return ['barbers' => $byBarber];
    }

    private function getCustomerMetrics(string $from, string $endExclusive): array
    {
        $totalCustomers = $this->countDistinctCustomers($from, $endExclusive);

        $createdInRange = DB::table('users')
            ->where('role', 'customer')
            ->where('created_at', '>=', $from)
            ->where('created_at', '<', $endExclusive)
            ->count();

        $previousCustomerIds = DB::table('appointments')
            ->whereNotNull('user_id')
            ->where('appointment_date', '<', $from)
            ->distinct()
            ->pluck('user_id');

        $returningInRange = DB::table('appointments')
            ->whereNotNull('user_id')
            ->where('appointment_date', '>=', $from)
            ->where('appointment_date', '<', $endExclusive)
            ->distinct()
            ->pluck('user_id')
            ->filter(fn ($id) => $previousCustomerIds->contains($id))
            ->count();

        $repeatRate = $totalCustomers > 0 ? round(($returningInRange / $totalCustomers) * 100, 1) : 0;

        $ratings = DB::table('appointment_feedback')
            ->join('appointments', 'appointments.id', '=', 'appointment_feedback.appointment_id')
            ->where('appointments.appointment_date', '>=', $from)
            ->where('appointments.appointment_date', '<', $endExclusive)
            ->select('rating', DB::raw('COUNT(*) as count'))
            ->groupBy('rating')
            ->orderBy('rating')
            ->get()
            ->keyBy('rating');

        $ratingDistribution = [];
        for ($i = 1; $i <= 5; $i++) {
            $ratingDistribution[] = [
                'rating' => $i,
                'count' => (int) ($ratings->get($i)->count ?? 0),
            ];
        }

        $avgRating = $this->averageRating($from, $endExclusive);

        $avgByService = DB::table('appointment_feedback')
            ->join('appointments', 'appointments.id', '=', 'appointment_feedback.appointment_id')
            ->where('appointments.appointment_date', '>=', $from)
            ->where('appointments.appointment_date', '<', $endExclusive)
            ->select('appointments.service_id', DB::raw('AVG(appointment_feedback.rating) as avg_rating'), DB::raw('COUNT(*) as count'))
            ->groupBy('appointments.service_id')
            ->get()
            ->map(function ($row) {
                return [
                    'service_id' => (int) $row->service_id,
                    'service_name' => $this->getServiceName($row->service_id),
                    'average_rating' => round((float) $row->avg_rating, 1),
                    'count' => (int) $row->count,
                ];
            })
            ->sortByDesc('count')
            ->values();

        $avgByBarber = DB::table('appointment_feedback')
            ->join('appointments', 'appointments.id', '=', 'appointment_feedback.appointment_id')
            ->where('appointments.appointment_date', '>=', $from)
            ->where('appointments.appointment_date', '<', $endExclusive)
            ->select('appointments.barber_user_id', DB::raw('AVG(appointment_feedback.rating) as avg_rating'), DB::raw('COUNT(*) as count'))
            ->groupBy('appointments.barber_user_id')
            ->get()
            ->map(function ($row) {
                return [
                    'barber_id' => (int) $row->barber_user_id,
                    'barber_name' => $this->getBarberName($row->barber_user_id),
                    'average_rating' => round((float) $row->avg_rating, 1),
                    'count' => (int) $row->count,
                ];
            })
            ->sortByDesc('count')
            ->values();

        return [
            'total_customers_served' => (int) $totalCustomers,
            'new_customers' => (int) $createdInRange,
            'returning_customers' => (int) $returningInRange,
            'repeat_rate' => $repeatRate,
            'average_rating' => $avgRating ? round((float) $avgRating, 1) : 0,
            'rating_distribution' => $ratingDistribution,
            'average_by_service' => $avgByService,
            'average_by_barber' => $avgByBarber,
        ];
    }

    private function getInsights(string $from, string $endExclusive): array
    {
        $insights = [];

        $busiestDay = Appointment::withTrashed()
            ->select('appointment_date', DB::raw('COUNT(*) as count'))
            ->where('appointment_date', '>=', $from)
            ->where('appointment_date', '<', $endExclusive)
            ->groupBy('appointment_date')
            ->orderByDesc('count')
            ->first();

        if ($busiestDay) {
            $insights[] = [
                'label' => 'Busiest Day',
                'value' => Carbon::parse($busiestDay->appointment_date)->format('l, M j, Y'),
                'detail' => "{$busiestDay->count} appointment".($busiestDay->count !== 1 ? 's' : ''),
            ];
        }

        $peakHour = Appointment::withTrashed()
            ->select('appointment_time', DB::raw('COUNT(*) as count'))
            ->whereIn('status', ['completed', 'approved'])
            ->where('appointment_date', '>=', $from)
            ->where('appointment_date', '<', $endExclusive)
            ->groupBy('appointment_time')
            ->orderByDesc('count')
            ->first();

        if ($peakHour) {
            $hour = (int) substr($peakHour->appointment_time, 0, 2);
            $minute = substr($peakHour->appointment_time, 3, 2);
            $ampm = $hour >= 12 ? 'PM' : 'AM';
            $hour12 = $hour % 12 ?: 12;
            $insights[] = [
                'label' => 'Peak Hour',
                'value' => "{$hour12}:{$minute} {$ampm}",
                'detail' => "{$peakHour->count} appointment".($peakHour->count !== 1 ? 's' : ''),
            ];
        }

        $topService = Appointment::withTrashed()
            ->select('service_id', DB::raw('SUM(price) as revenue'))
            ->where('status', 'completed')
            ->where('appointment_date', '>=', $from)
            ->where('appointment_date', '<', $endExclusive)
            ->groupBy('service_id')
            ->orderByDesc('revenue')
            ->first();

        if ($topService) {
            $insights[] = [
                'label' => 'Highest-Revenue Service',
                'value' => $this->getServiceName($topService->service_id),
                'detail' => '₱'.number_format((float) $topService->revenue, 2),
            ];
        }

        $topBarber = Appointment::withTrashed()
            ->select('barber_user_id', DB::raw('COUNT(*) as count'))
            ->where('status', 'completed')
            ->where('appointment_date', '>=', $from)
            ->where('appointment_date', '<', $endExclusive)
            ->groupBy('barber_user_id')
            ->orderByDesc('count')
            ->first();

        if ($topBarber) {
            $insights[] = [
                'label' => 'Top Performing Barber',
                'value' => $this->getBarberName($topBarber->barber_user_id),
                'detail' => "{$topBarber->count} completed appointment".($topBarber->count !== 1 ? 's' : ''),
            ];
        }

        $completed = $this->countByStatus('completed', $from, $endExclusive);
        $cancelled = $this->countByStatus('cancelled', $from, $endExclusive);
        $noShow = $this->countByStatus('no_show', $from, $endExclusive);
        $resolved = $completed + $cancelled + $noShow;

        if ($resolved > 0) {
            $insights[] = [
                'label' => 'Completion Rate',
                'value' => round(($completed / $resolved) * 100, 1).'%',
                'detail' => "{$completed} completed of {$resolved} resolved",
            ];
        }

        $customers = $this->countDistinctCustomers($from, $endExclusive);
        if ($customers > 0) {
            $insights[] = [
                'label' => 'Customers Served',
                'value' => (string) $customers,
                'detail' => 'registered customers in period',
            ];
        }

        return $insights;
    }

    private function countByStatus(string $status, string $from, string $endExclusive): int
    {
        return (int) Appointment::withTrashed()
            ->where('status', $status)
            ->where('appointment_date', '>=', $from)
            ->where('appointment_date', '<', $endExclusive)
            ->count();
    }

    private function sumRevenue(string $from, string $endExclusive): float
    {
        return (float) Appointment::withTrashed()
            ->where('status', 'completed')
            ->where('appointment_date', '>=', $from)
            ->where('appointment_date', '<', $endExclusive)
            ->sum('price');
    }

    private function countDistinctCustomers(string $from, string $endExclusive): int
    {
        return (int) Appointment::withTrashed()
            ->whereNotNull('user_id')
            ->where('appointment_date', '>=', $from)
            ->where('appointment_date', '<', $endExclusive)
            ->distinct('user_id')
            ->count('user_id');
    }

    private function averageRating(string $from, string $endExclusive): ?float
    {
        return DB::table('appointment_feedback')
            ->join('appointments', 'appointments.id', '=', 'appointment_feedback.appointment_id')
            ->where('appointments.appointment_date', '>=', $from)
            ->where('appointments.appointment_date', '<', $endExclusive)
            ->avg('appointment_feedback.rating');
    }

    private function inferGranularity(Carbon $from, Carbon $to): string
    {
        $days = (int) $from->copy()->startOfDay()->diffInDays($to->copy()->startOfDay()) + 1;

        if ($days <= 7) {
            return 'daily';
        }
        if ($days <= 92) {
            return 'weekly';
        }

        return 'monthly';
    }

    private function makeBucketTemplate(string $from, string $endExclusive, string $granularity, array $defaults): array
    {
        $cursor = Carbon::parse($from, self::SHOP_TIMEZONE)->startOfDay();
        $end = Carbon::parse($endExclusive, self::SHOP_TIMEZONE)->startOfDay();
        $buckets = [];

        if ($granularity === 'monthly') {
            $cursor->startOfMonth();
        } elseif ($granularity === 'yearly') {
            $cursor->startOfYear();
        }

        while ($cursor->isBefore($end)) {
            $key = $cursor->toDateString();
            $buckets[$key] = ['date' => $key, ...$defaults];

            match ($granularity) {
                'weekly' => $cursor->addDays(7),
                'monthly' => $cursor->addMonthNoOverflow()->startOfMonth(),
                'yearly' => $cursor->addYear()->startOfYear(),
                default => $cursor->addDay(),
            };
        }

        return $buckets;
    }

    private function bucketKey(Carbon|string $date, string $from, string $granularity): string
    {
        $value = Carbon::parse($date, self::SHOP_TIMEZONE)->startOfDay();

        if ($granularity === 'weekly') {
            $rangeStart = Carbon::parse($from, self::SHOP_TIMEZONE)->startOfDay();
            $offset = (int) $rangeStart->diffInDays($value);

            return $rangeStart->addDays(intdiv($offset, 7) * 7)->toDateString();
        }

        if ($granularity === 'monthly') {
            return $value->startOfMonth()->toDateString();
        }

        if ($granularity === 'yearly') {
            return $value->startOfYear()->toDateString();
        }

        return $value->toDateString();
    }

    private function getServiceName(int $serviceId): string
    {
        $service = DB::table('services')->where('id', $serviceId)->first();

        return $service?->name ?? 'Unknown';
    }

    private function getBarberName(int $barberId): string
    {
        $user = DB::table('users')->where('id', $barberId)->first();

        return $user?->fullname ?? 'Unknown';
    }
}
