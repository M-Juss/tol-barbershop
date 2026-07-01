<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\AppointmentFeedback;
use App\Models\Service;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
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
        ['fullname' => 'Juan Dela Cruz', 'email' => 'juan@tolsbarber.com', 'contact_number' => '09171234567'],
        ['fullname' => 'Pedro Santos', 'email' => 'pedro@tolsbarber.com', 'contact_number' => '09181234567'],
        ['fullname' => 'Mario Reyes', 'email' => 'mario@tolsbarber.com', 'contact_number' => '09191234567'],
    ];

    private array $customersData = [
        ['fullname' => 'Ana Marie Lopez', 'email' => 'ana@gmail.com', 'contact_number' => '09201234567'],
        ['fullname' => 'Benito Cruz', 'email' => 'ben@yahoo.com', 'contact_number' => '09211234567'],
        ['fullname' => 'Carla Gonzales', 'email' => 'carla@gmail.com', 'contact_number' => '09221234567'],
        ['fullname' => 'Dante Villanueva', 'email' => 'dante@outlook.com', 'contact_number' => '09231234567'],
        ['fullname' => 'Elena Rodriguez', 'email' => 'elena@gmail.com', 'contact_number' => '09241234567'],
        ['fullname' => 'Fernando Garcia', 'email' => 'fernando@yahoo.com', 'contact_number' => '09251234567'],
        ['fullname' => 'Gloria Santos', 'email' => 'gloria@gmail.com', 'contact_number' => '09261234567'],
    ];

    public function run(): void
    {
        $this->seedUsers();
        $this->seedServices();
        $this->seedAppointments();
    }

    private function seedUsers(): void
    {
        User::firstOrCreate(
            ['email' => 'manager@gmail.com'],
            [
                'fullname' => 'Manager',
                'contact_number' => '09123456788',
                'password' => Hash::make('Manager123!'),
                'role' => 'manager',
                'is_active' => true,
            ]
        );

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

    private function seedAppointments(): void
    {
        $barbers = User::where('role', 'barber')->get();
        $customers = User::where('role', 'customer')->get();
        $services = Service::all();

        $timeSlots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

        $statusDistribution = [
            'completed' => 65,
            'cancelled' => 15,
            'no_show' => 8,
            'pending' => 7,
            'approved' => 5,
        ];

        $comments = [
            'Great service as always!',
            'The barber was very professional.',
            'Good haircut, will come back.',
            'Decent service for the price.',
            'Amazing! Best barbershop in town!',
            'Okay, but took a bit long.',
            'Very satisfied with the results.',
            'Nice and clean shop, friendly staff.',
            'Could have been better.',
            'Excellent attention to detail.',
            null,
            null,
            null,
        ];

        $now = Carbon::now();
        $start = $now->copy()->subMonths(11)->startOfMonth();
        $appointmentId = 0;

        $monthlyTargets = $this->getMonthlyBookingTargets($start, $now);

        foreach ($monthlyTargets as $monthData) {
            $monthStart = $monthData['start'];
            $monthEnd = $monthData['end'];
            $target = $monthData['count'];
            $busyFactor = $monthData['busy_factor'];

            $daysInMonth = $monthStart->daysInMonth;
            $openDays = 0;
            for ($d = 1; $d <= $daysInMonth; $d++) {
                $date = Carbon::create($monthStart->year, $monthStart->month, $d);
                if ($date->dayOfWeek !== Carbon::SUNDAY) {
                    $openDays++;
                }
            }

            $apptsPerDay = max(1, round($target / $openDays));

            for ($d = 1; $d <= $daysInMonth; $d++) {
                $date = Carbon::create($monthStart->year, $monthStart->month, $d);
                if ($date->dayOfWeek === Carbon::SUNDAY || $date->gt($now)) {
                    continue;
                }

                $dailyCount = random_int(max(0, $apptsPerDay - 1), $apptsPerDay + 1);
                if ($dailyCount === 0) {
                    continue;
                }

                $usedTimes = [];
                for ($a = 0; $a < $dailyCount; $a++) {
                    $barber = $barbers->random();
                    $customer = $customers->random();
                    $service = $services->random();
                    $status = $this->weightedRandom($statusDistribution);

                    $availableSlots = array_filter($timeSlots, fn ($t) => ! in_array($t, $usedTimes));
                    if (empty($availableSlots)) {
                        break;
                    }
                    $time = $availableSlots[array_rand($availableSlots)];
                    $usedTimes[] = $time;

                    $isWalkin = random_int(1, 100) <= 20;

                    $appointmentData = [
                        'user_id' => $customer->id,
                        'service_id' => $service->id,
                        'barber_user_id' => $barber->id,
                        'appointment_date' => $date->toDateString(),
                        'appointment_time' => $time,
                        'duration_minutes' => $service->duration,
                        'price' => $service->price,
                        'status' => $status,
                        'is_walkin' => $isWalkin,
                        'notes' => $isWalkin ? 'Walk-in customer' : null,
                    ];

                    if ($status === 'completed' || $status === 'cancelled' || $status === 'no_show') {
                        $appointmentData['approved_at'] = $date->copy()->subHours(random_int(1, 48));
                        if ($status === 'completed') {
                            $appointmentData['completed_at'] = $date->copy()->addHours(random_int(1, 4));
                        } elseif ($status === 'cancelled') {
                            $appointmentData['cancelled_at'] = $date->copy()->addHours(random_int(1, 24));
                        }
                    }

                    $appointment = Appointment::create($appointmentData);
                    $appointmentId++;

                    if ($status === 'completed' && random_int(1, 100) <= 70) {
                        $rating = $this->weightedRating($busyFactor);

                        AppointmentFeedback::create([
                            'appointment_id' => $appointment->id,
                            'user_id' => $customer->id,
                            'rating' => $rating,
                            'comment' => $comments[array_rand($comments)],
                            'created_at' => $date->copy()->addHours(random_int(2, 72)),
                            'updated_at' => $date->copy()->addHours(random_int(2, 72)),
                        ]);
                    }
                }
            }
        }
    }

    private function getMonthlyBookingTargets(Carbon $start, Carbon $now): array
    {
        $targets = [];
        $current = $start->copy();

        while ($current->lte($now)) {
            $month = $current->month;
            $year = $current->year;

            if ($month === 12) {
                $count = random_int(28, 35);
                $busyFactor = 1.1;
            } elseif ($month === 1) {
                $count = random_int(12, 18);
                $busyFactor = 0.8;
            } elseif ($month >= 3 && $month <= 5) {
                $count = random_int(18, 28);
                $busyFactor = 1.0;
            } else {
                $count = random_int(15, 25);
                $busyFactor = 0.9;
            }

            if ($current->isSameMonth($now) && $current->isSameYear($now)) {
                $daysSoFar = max(1, $now->day);
                $totalDays = $current->daysInMonth;
                $count = max(1, (int) round($count * ($daysSoFar / $totalDays)));
            }

            $targets[] = [
                'start' => $current->copy()->startOfMonth(),
                'end' => $current->copy()->endOfMonth()->min($now),
                'count' => $count,
                'busy_factor' => $busyFactor,
            ];

            $current->addMonth();
        }

        return $targets;
    }

    private function weightedRandom(array $weights): string
    {
        $total = array_sum($weights);
        $rand = random_int(1, $total);
        $cumulative = 0;

        foreach ($weights as $key => $weight) {
            $cumulative += $weight;
            if ($rand <= $cumulative) {
                return $key;
            }
        }

        return array_key_first($weights);
    }

    private function weightedRating(float $busyFactor): int
    {
        $weights = [
            5 => (int) (45 * $busyFactor),
            4 => 30,
            3 => 15,
            2 => 7,
            1 => 3,
        ];

        return (int) $this->weightedRandom($weights);
    }
}
