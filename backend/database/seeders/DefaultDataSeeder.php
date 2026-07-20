<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\AppointmentFeedback;
use App\Models\Service;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Hash;

class DefaultDataSeeder extends Seeder
{
    private array $servicesData = [
        ['name' => 'Regular Haircut', 'description' => 'Classic haircut with basic styling', 'duration' => 30, 'price' => 200.00],
        ['name' => 'Premium Haircut', 'description' => 'Premium haircut with wash and styling', 'duration' => 45, 'price' => 350.00],
        ['name' => 'Beard Trim', 'description' => 'Professional beard trimming and shaping', 'duration' => 20, 'price' => 150.00],
        ['name' => 'Kids Haircut', 'description' => 'Haircut for children 12 and under', 'duration' => 20, 'price' => 150.00],
        ['name' => 'Hot Towel Shave', 'description' => 'Luxury hot towel shave experience', 'duration' => 30, 'price' => 250.00],
    ];

    private array $barbersData = [
        ['fullname' => 'Juan Dela Cruz', 'email' => 'juan@tolbarber.com', 'contact_number' => '09171234567'],
        ['fullname' => 'Pedro Santos', 'email' => 'pedro@tolbarber.com', 'contact_number' => '09181234567'],
        ['fullname' => 'Mario Reyes', 'email' => 'mario@tolbarber.com', 'contact_number' => '09191234567'],
    ];

    private array $customersData = [
        ['fullname' => 'Ana Marie Lopez', 'email' => 'ana@gmail.com', 'contact_number' => '09201234567'],
        ['fullname' => 'Benito Cruz', 'email' => 'ben@yahoo.com', 'contact_number' => '09211234567'],
        ['fullname' => 'Carla Gonzales', 'email' => 'carla@gmail.com', 'contact_number' => '09221234567'],
        ['fullname' => 'Dante Villanueva', 'email' => 'dante@gmail.com', 'contact_number' => '09231234567'],
        ['fullname' => 'Elena Rodriguez', 'email' => 'elena@gmail.com', 'contact_number' => '09241234567'],
        ['fullname' => 'Fernando Garcia', 'email' => 'fernando@yahoo.com', 'contact_number' => '09251234567'],
        ['fullname' => 'Gloria Santos', 'email' => 'gloria@gmail.com', 'contact_number' => '09261234567'],
    ];

    private array $timeSlots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

    private array $feedbackComments = [
        3 => ['Decent haircut, nothing special.', 'Okay service, fair for the price.', "It's fine, but I've had better."],
        4 => ['Good service, satisfied with the cut.', 'Really nice haircut, will come back.', 'Professional and friendly staff.', 'Great value for the price!'],
        5 => ['Excellent! Best barbershop in town!', 'Absolutely amazing service!', 'Perfect as always, highly recommend!', 'Love the attention to detail!', 'Best haircut I have ever had!'],
    ];

    private array $monthWeights = [
        1 => 0.6, 2 => 0.8, 3 => 1.1, 4 => 1.2, 5 => 1.1,
        6 => 0.9, 7 => 0.9, 8 => 0.8, 9 => 0.9, 10 => 0.8,
        11 => 0.6, 12 => 1.3,
    ];

    private array $dayWeights = [
        Carbon::MONDAY => 0.7,
        Carbon::TUESDAY => 0.8,
        Carbon::WEDNESDAY => 0.9,
        Carbon::THURSDAY => 1.0,
        Carbon::FRIDAY => 1.3,
        Carbon::SATURDAY => 1.4,
    ];

    private int $baseAppointmentsPerMonth = 18;

    public function run(): void
    {
        $this->seedUsers();
        $this->seedServices();
        $this->seedAppointments();
    }

    private function seedUsers(): void
    {
        $managerEmail = env('DEFAULT_MANAGER_EMAIL');
        $managerPassword = env('DEFAULT_MANAGER_PASSWORD');
        $managerName = env('DEFAULT_MANAGER_NAME');
        $managerContact = env('DEFAULT_MANAGER_CONTACT');

        if ($managerEmail && $managerPassword && $managerName && $managerContact) {
            User::firstOrCreate(
                ['email' => $managerEmail],
                [
                    'fullname' => $managerName,
                    'contact_number' => $managerContact,
                    'password' => Hash::make($managerPassword),
                    'role' => 'manager',
                    'is_active' => true,
                ]
            );
        }

        foreach ($this->barbersData as $barber) {
            User::firstOrCreate(
                ['email' => $barber['email']],
                [
                    'fullname' => $barber['fullname'],
                    'contact_number' => $barber['contact_number'],
                    'password' => Hash::make('Barber123!'),
                    'role' => 'barber',
                    'is_active' => true,
                ]
            );
        }

        foreach ($this->customersData as $customer) {
            User::firstOrCreate(
                ['email' => $customer['email']],
                [
                    'fullname' => $customer['fullname'],
                    'contact_number' => $customer['contact_number'],
                    'password' => Hash::make('Customer123!'),
                    'role' => 'customer',
                    'is_active' => true,
                ]
            );
        }
    }

    private function seedServices(): void
    {
        foreach ($this->servicesData as $service) {
            Service::firstOrCreate(
                ['name' => $service['name']],
                $service
            );
        }
    }

    private function pickRandom($items)
    {
        if ($items instanceof Collection) {
            return $items->random();
        }

        return $items[array_rand($items)];
    }

    private function createAppointment(Carbon $date, string $status, array $entities): Appointment
    {
        $service = $this->pickRandom($entities['services']);
        $time = $this->pickRandom($this->timeSlots);
        $isWalkin = $status === 'completed' && random_int(1, 100) <= 15;

        $customer = $this->pickRandom($entities['customers']);
        $barber = $this->pickRandom($entities['barbers']);

        $data = [
            'user_id' => $isWalkin ? null : $customer->id,
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'appointment_date' => $date->toDateString(),
            'appointment_time' => $time,
            'duration_minutes' => $service->duration,
            'price' => $service->price,
            'status' => $status,
            'is_walkin' => $isWalkin,
            'walkin_customer_name' => $isWalkin ? $customer->fullname : null,
            'walkin_customer_contact_number' => $isWalkin ? $customer->contact_number : null,
            'notes' => $isWalkin ? 'Walk-in customer' : null,
            'customer_name_snapshot' => $customer->fullname,
            'service_name_snapshot' => $service->name,
            'barber_name_snapshot' => $barber->fullname,
        ];

        if ($status === 'completed') {
            $bookedAt = $date->copy()->subDays(random_int(1, 14));
            $data['created_at'] = $bookedAt;
            $data['updated_at'] = $bookedAt;
            $data['approved_at'] = $date->copy()->subHours(random_int(1, 48));
            $data['completed_at'] = $date->copy()->addHours(random_int(1, 4));
        } elseif ($status === 'cancelled') {
            $bookedAt = $date->copy()->subDays(random_int(1, 7));
            $data['created_at'] = $bookedAt;
            $data['updated_at'] = $bookedAt;
            $data['cancelled_at'] = $date->copy()->subHours(random_int(1, 24));
        } elseif ($status === 'no_show') {
            $bookedAt = $date->copy()->subDays(random_int(1, 7));
            $data['created_at'] = $bookedAt;
            $data['updated_at'] = $bookedAt;
            $data['approved_at'] = $date->copy()->subHours(random_int(1, 48));
        } elseif ($status === 'approved') {
            $data['created_at'] = $date->copy()->subDays(random_int(1, 5));
            $data['updated_at'] = $date->copy()->subDays(random_int(1, 5));
            $data['approved_at'] = $date->copy()->subDays(random_int(1, 3));
        } elseif ($status === 'pending') {
            $data['created_at'] = $date->copy()->subDays(random_int(0, 3));
            $data['updated_at'] = $date->copy()->subDays(random_int(0, 3));
        }

        return Appointment::create($data);
    }

    private function seedFeedback(Appointment $appointment, Carbon $date, int $rating): void
    {
        if (! $appointment->user_id) {
            return;
        }

        $comments = $this->feedbackComments[$rating];
        $feedbackDate = $date->copy()->addHours(random_int(2, 72));

        AppointmentFeedback::create([
            'appointment_id' => $appointment->id,
            'user_id' => $appointment->user_id,
            'rating' => $rating,
            'comment' => $this->pickRandom($comments),
            'created_at' => $feedbackDate,
            'updated_at' => $feedbackDate,
            'customer_name_snapshot' => User::find($appointment->user_id)?->fullname,
        ]);
    }

    private function weightedRating(): int
    {
        $rand = random_int(1, 100);

        return match (true) {
            $rand <= 2 => 3,
            $rand <= 18 => 4,
            default => 5,
        };
    }

    private function seedAppointments(): void
    {
        $entities = [
            'barbers' => User::where('role', 'barber')->get(),
            'customers' => User::where('role', 'customer')->get(),
            'services' => Service::all(),
        ];

        $now = Carbon::now();

        // -------------------------------------------------------
        // 1. HISTORICAL APPOINTMENTS (2022 – 2026) for analytics
        // -------------------------------------------------------
        $startYear = 2022;
        $yearlyGrowth = [2022 => 0.6, 2023 => 0.8, 2024 => 1.0, 2025 => 1.2, 2026 => 1.4];

        for ($year = $startYear; $year <= $now->year; $year++) {
            $yearStart = Carbon::create($year, 1, 1);
            $yearEnd = $year < $now->year
                ? Carbon::create($year, 12, 31)
                : $now->copy();

            $growthFactor = $yearlyGrowth[$year] ?? 1.0;

            $monthCount = $yearStart->diffInMonths($yearEnd->copy()->endOfMonth()) + 1;
            for ($month = 1; $month <= $monthCount; $month++) {
                $monthDate = Carbon::create($year, $month, 1);
                $daysInMonth = $monthDate->daysInMonth;

                $monthFactor = $this->monthWeights[$month] ?? 0.9;
                $targetCount = (int) round($this->baseAppointmentsPerMonth * $growthFactor * $monthFactor);

                // For current month, only generate up to today
                $lastDay = $monthDate->isCurrentMonth() ? $now->day : $daysInMonth;

                $generated = 0;
                for ($day = 1; $day <= $lastDay; $day++) {
                    $date = Carbon::create($year, $month, $day);
                    if ($date->isSunday()) {
                        continue;
                    }

                    $dayFactor = $this->dayWeights[$date->dayOfWeek] ?? 0.8;

                    // Determine how many appointments on this day (mostly 0-2)
                    $dayTarget = max(0, round($targetCount * $dayFactor / 22 - 0.3 + lcg_value() * 0.6));
                    $dayTarget = min($dayTarget, 3);

                    for ($i = 0; $i < $dayTarget && $generated < $targetCount; $i++) {
                        $statusRoll = random_int(1, 100);
                        $status = match (true) {
                            $statusRoll <= 70 => 'completed',
                            $statusRoll <= 83 => 'cancelled',
                            $statusRoll <= 91 => 'no_show',
                            default => 'completed',
                        };

                        $appointment = $this->createAppointment($date, $status, $entities);

                        if ($status === 'completed' && random_int(1, 100) <= 75) {
                            $this->seedFeedback($appointment, $date, $this->weightedRating());
                        }

                        $generated++;
                    }
                }
            }
        }

        // -------------------------------------------------------
        // 2. SPECIFIC REQUESTED DATA
        // -------------------------------------------------------

        // 5 pending appointments (future dates)
        $pendingDates = [];
        $checkDate = $now->copy()->addDay();
        while (count($pendingDates) < 5) {
            if (! $checkDate->isSunday()) {
                $pendingDates[] = $checkDate->copy();
            }
            $checkDate->addDay();
        }
        foreach ($pendingDates as $date) {
            $this->createAppointment($date, 'pending', $entities);
        }

        // 7 approved appointments (future dates, spread out)
        $approvedDates = [];
        $checkDate = $now->copy()->addDay();
        while (count($approvedDates) < 7) {
            if (! $checkDate->isSunday()) {
                $approvedDates[] = $checkDate->copy();
            }
            $checkDate->addDay();
        }
        foreach ($approvedDates as $date) {
            $appt = $this->createAppointment($date, 'approved', $entities);
        }

        // 3 past due appointments (past dates, status: no_show or cancelled)
        $pastDueDates = [];
        $checkDate = $now->copy()->subDays(30);
        while (count($pastDueDates) < 3) {
            if (! $checkDate->isSunday()) {
                $pastDueDates[] = $checkDate->copy();
            }
            $checkDate->addDay();
        }
        $pastDueStatuses = ['no_show', 'no_show', 'cancelled'];
        foreach ($pastDueDates as $i => $date) {
            $this->createAppointment($date, $pastDueStatuses[$i], $entities);
        }
    }
}
