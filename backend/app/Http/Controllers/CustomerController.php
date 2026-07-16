<?php

namespace App\Http\Controllers;

use App\Http\Requests\CustomerListRequest;
use App\Http\Resources\CustomerResource;
use App\Http\Resources\CustomerResourceDetail;
use App\Models\Appointment;
use App\Models\User;
use App\Traits\ApiResponseTrait;
use Illuminate\Support\Facades\DB;

class CustomerController extends Controller
{
    use ApiResponseTrait;

    public function index(CustomerListRequest $request)
    {
        $validated = $request->validated();

        $baseQuery = User::where('role', 'customer');

        $totalCustomers = (clone $baseQuery)->count();

        $newThisMonth = (clone $baseQuery)
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->count();

        // Active/Inactive based on 60-day rule
        $activeQuery = (clone $baseQuery)
            ->where(function ($q) {
                $q->whereDoesntHave('appointments', fn ($aq) => $aq->where('status', 'completed'))
                    ->orWhereHas('appointments', fn ($aq) => $aq->where('status', 'completed')->where('appointment_date', '>=', now()->subDays(60)));
            });
        $activeCount = (clone $activeQuery)->count();
        $inactiveCount = $totalCustomers - $activeCount;

        $query = User::where('role', 'customer')
            ->withCount(['appointments as total_visits' => fn ($q) => $q->where('status', 'completed')])
            ->withCount(['appointments as no_show_count' => fn ($q) => $q->where('status', 'no_show')])
            ->withCount(['appointments as cancelled_count' => fn ($q) => $q->where('status', 'cancelled')])
            ->withSum(['appointments as lifetime_value' => fn ($q) => $q->whereIn('status', ['completed'])->whereNotNull('user_id')], 'price')
            ->withAvg('appointmentFeedback as average_rating', 'rating')
            ->addSelect([
                'last_visit_date' => Appointment::select('appointment_date')
                    ->whereColumn('user_id', 'users.id')
                    ->where('status', 'completed')
                    ->latest('appointment_date')
                    ->limit(1),
            ]);

        if (! empty($validated['search'])) {
            $search = $validated['search'];
            $like = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $search).'%';
            $query->where(function ($q) use ($like) {
                $q->whereRaw("fullname LIKE ? ESCAPE '!'", [$like])
                    ->orWhereRaw("email LIKE ? ESCAPE '!'", [$like])
                    ->orWhereRaw("contact_number LIKE ? ESCAPE '!'", [$like]);
            });
        }

        if (! empty($validated['status'])) {
            if ($validated['status'] === 'active') {
                $query->where(function ($q) {
                    $q->whereDoesntHave('appointments', fn ($aq) => $aq->where('status', 'completed'))
                        ->orWhereHas('appointments', fn ($aq) => $aq->where('status', 'completed')->where('appointment_date', '>=', now()->subDays(60)));
                });
            } else {
                $query->whereHas('appointments', fn ($q) => $q->where('status', 'completed'))
                    ->whereDoesntHave('appointments', fn ($q) => $q->where('status', 'completed')->where('appointment_date', '>=', now()->subDays(60)));
            }
        }

        $sortField = $validated['sort'] ?? 'fullname';
        $sortDir = $validated['dir'] ?? 'asc';
        $perPage = $validated['per_page'] ?? 15;
        $customers = $query
            ->orderBy($sortField, $sortDir)
            ->orderBy('id', $sortDir)
            ->paginate($perPage, ['*'], 'page', $validated['page'] ?? 1);

        return $this->success('Customers retrieved successfully.', [
            'customers' => CustomerResource::collection($customers),
            'meta' => [
                'current_page' => $customers->currentPage(),
                'last_page' => $customers->lastPage(),
                'per_page' => $customers->perPage(),
                'total' => $customers->total(),
            ],
            'stats' => [
                'total_customers' => $totalCustomers,
                'new_this_month' => $newThisMonth,
                'active_count' => $activeCount,
                'inactive_count' => $inactiveCount,
            ],
        ]);
    }

    public function show(string $id)
    {
        $user = User::where('role', 'customer')
            ->withCount(['appointments as total_visits' => fn ($q) => $q->where('status', 'completed')])
            ->withCount(['appointments as no_show_count' => fn ($q) => $q->where('status', 'no_show')])
            ->withCount(['appointments as cancelled_count' => fn ($q) => $q->where('status', 'cancelled')])
            ->withSum(['appointments as lifetime_value' => fn ($q) => $q->where('status', 'completed')->whereNotNull('user_id')], 'price')
            ->withAvg('appointmentFeedback as average_rating', 'rating')
            ->addSelect([
                'last_visit_date' => Appointment::select('appointment_date')
                    ->whereColumn('user_id', 'users.id')
                    ->where('status', 'completed')
                    ->latest('appointment_date')
                    ->limit(1),
            ])
            ->findOrFail($id);

        // Service preferences
        $servicePreferences = Appointment::select([
            DB::raw('services.name as service_name'),
            DB::raw('COUNT(*) as count'),
        ])
            ->join('services', 'services.id', '=', 'appointments.service_id')
            ->where('appointments.user_id', $user->id)
            ->where('appointments.status', 'completed')
            ->groupBy('services.name')
            ->orderByDesc('count')
            ->get();

        $user->setRelation('servicePreferences', $servicePreferences);

        // Barber preferences
        $barberPreferences = Appointment::select([
            DB::raw('barbers.fullname as barber_name'),
            DB::raw('COUNT(*) as count'),
        ])
            ->join('users as barbers', 'barbers.id', '=', 'appointments.barber_user_id')
            ->where('appointments.user_id', $user->id)
            ->where('appointments.status', 'completed')
            ->groupBy('barbers.fullname')
            ->orderByDesc('count')
            ->get();

        $user->setRelation('barberPreferences', $barberPreferences);

        // Recent 3 appointments
        $recentAppointments = Appointment::with(['service:id,name', 'barber:id,fullname'])
            ->where('user_id', $user->id)
            ->latest('appointment_date')
            ->latest('appointment_time')
            ->limit(3)
            ->get();

        $user->setRelation('recentAppointments', $recentAppointments);

        return $this->success('Customer retrieved successfully.', [
            'customer' => new CustomerResourceDetail($user),
        ]);
    }
}
