<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\Service;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class WalkinAppointmentSeeder extends Seeder
{
    private array $walkins = [
        ['name' => 'Michael Smith', 'phone' => '09151111111'],
        ['name' => 'John Doe', 'phone' => '09152222222'],
        ['name' => 'Peter Jones', 'phone' => '09153333333'],
        ['name' => 'Tom Wilson', 'phone' => '09154444444'],
        ['name' => 'Jake Martinez', 'phone' => '09155555555'],
    ];

    public function run(): void
    {
        $barbers = User::where('role', 'barber')->get();
        $services = Service::all();

        if ($barbers->isEmpty() || $services->isEmpty()) {
            $this->command->warn('No barbers or services found. Run DefaultDataSeeder first.');

            return;
        }

        $now = Carbon::now();

        foreach ($this->walkins as $index => $walkin) {
            $date = $now->copy()->subDays(count($this->walkins) - $index);
            $hour = str_pad((string) random_int(9, 16), 2, '0', STR_PAD_LEFT);
            $time = $hour.':00';

            Appointment::create([
                'user_id' => null,
                'service_id' => $services->random()->id,
                'barber_user_id' => $barbers->random()->id,
                'appointment_date' => $date->toDateString(),
                'appointment_time' => $time,
                'duration_minutes' => 30,
                'price' => 200,
                'status' => 'completed',
                'is_walkin' => true,
                'walkin_customer_name' => $walkin['name'],
                'walkin_customer_contact_number' => $walkin['phone'],
                'completed_at' => $date,
            ]);
        }
    }
}
