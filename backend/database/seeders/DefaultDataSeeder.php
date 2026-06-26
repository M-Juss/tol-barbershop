<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\AppointmentFeedback;
use App\Models\ClosedDates;
use App\Models\Notification;
use App\Models\ReSchedule;
use App\Models\Service;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DefaultDataSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedUsers();
        $this->seedServices();
    }

    private function seedUsers(): void
    {
        $users = [
            ['fullname' => 'Manager', 'email' => 'manager@gmail.com', 'contact_number' => '09123456788', 'password' => 'Manager123!', 'role' => 'manager', 'is_active' => true],
        ];

        foreach ($users as $user) {
            User::firstOrCreate(
                ['email' => $user['email']],
                [
                    'fullname' => $user['fullname'],
                    'contact_number' => $user['contact_number'],
                    'password' => Hash::make($user['password']),
                    'role' => $user['role'],
                    'is_active' => $user['is_active'],
                ]
            );
        }
    }

    private function seedServices(): void
    {
        $services = [
            ['name' => 'Regular Haircut', 'description' => 'Classic haircut with basic styling', 'duration' => 30, 'price' => 200.00],
            ['name' => 'Premium Haircut', 'description' => 'Premium haircut with wash and styling', 'duration' => 45, 'price' => 350.00],
            ['name' => 'Beard Trim', 'description' => 'Professional beard trimming and shaping', 'duration' => 20, 'price' => 150.00],
            ['name' => 'Kids Haircut', 'description' => 'Haircut for children 12 and under', 'duration' => 20, 'price' => 150.00],
            ['name' => 'Hot Towel Shave', 'description' => 'Luxury hot towel shave experience', 'duration' => 30, 'price' => 250.00],
        ];

        foreach ($services as $service) {
            Service::firstOrCreate(
                ['name' => $service['name']],
                $service
            );
        }
    }



}