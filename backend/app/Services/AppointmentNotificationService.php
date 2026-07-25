<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Notification;
use App\Models\User;
use App\Support\DisplayId;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;

class AppointmentNotificationService
{
    public function notifyStatus(
        Appointment $appointment,
        string $status,
        ?int $createdByUserId = null,
    ): ?Notification {
        $appointment->loadMissing(['user', 'barber', 'service']);
        $customer = $appointment->user;

        if (! $customer) {
            return null;
        }

        if ($status === 'completed') {
            $alreadyNotified = Notification::where('user_id', $customer->id)
                ->whereIn('type', ['appointment_completed', 'appointment_feedback_request'])
                ->where('payload->appointment_id', $appointment->id)
                ->exists();

            if ($alreadyNotified) {
                return null;
            }
        }

        $copy = $this->statusCopy($appointment, $status);
        $payload = $this->appointmentPayload($appointment, $status, $copy['next_step']);

        $notification = Notification::create([
            'user_id' => $customer->id,
            'type' => $status === 'completed' ? 'appointment_completed' : 'appointment_status',
            'title' => $copy['title'],
            'message' => $copy['message'],
            'appointment_id' => $appointment->id,
            'service_name' => $appointment->service?->name,
            'barber_name' => $appointment->barber?->fullname,
            'appointment_date' => $appointment->appointment_date,
            'appointment_time' => $appointment->appointment_time,
            'price' => $appointment->price,
            'payload' => $payload,
            'created_by_user_id' => $createdByUserId,
        ]);

        $this->sendPush($customer, $copy['title'], $copy['message'], [
            'url' => '/customer/notification',
            'appointment_id' => $appointment->id,
        ]);

        return $notification;
    }

    public function notifyRescheduled(
        Appointment $appointment,
        ?int $createdByUserId = null,
    ): ?Notification {
        $appointment->loadMissing(['user', 'barber', 'service']);
        $customer = $appointment->user;

        if (! $customer) {
            return null;
        }

        $bookingId = DisplayId::booking($appointment->id);
        $date = $this->formatDate($appointment);
        $time = $this->formatTime($appointment);
        $service = $appointment->service?->name ?? 'barbershop service';
        $barber = $appointment->barber?->fullname ?? 'your barber';
        $title = 'Schedule Updated';
        $message = sprintf(
            'Your %s appointment %s has been moved to %s at %s with %s.',
            $service,
            $bookingId,
            $date,
            $time,
            $barber,
        );
        $nextStep = 'Please review the updated schedule and arrive about 5 minutes early.';

        $notification = Notification::create([
            'user_id' => $customer->id,
            'type' => 'appointment_rescheduled',
            'title' => $title,
            'message' => $message,
            'appointment_id' => $appointment->id,
            'service_name' => $appointment->service?->name,
            'barber_name' => $appointment->barber?->fullname,
            'appointment_date' => $appointment->appointment_date,
            'appointment_time' => $appointment->appointment_time,
            'price' => $appointment->price,
            'payload' => $this->appointmentPayload($appointment, 'rescheduled', $nextStep),
            'created_by_user_id' => $createdByUserId,
        ]);

        $this->sendPush($customer, $title, $message, [
            'url' => '/customer/notification',
            'appointment_id' => $appointment->id,
        ]);

        return $notification;
    }

    /**
     * @param  Collection<int, Appointment>  $appointments
     */
    public function notifyGroupStatus(
        Collection $appointments,
        string $status,
        ?int $createdByUserId = null,
    ): ?Notification {
        if ($appointments->isEmpty()) {
            return null;
        }

        $appointments->loadMissing(['user', 'barber', 'service']);
        $first = $appointments->first();
        $customer = $first?->user;

        if (! $first || ! $customer) {
            return null;
        }

        $copy = $this->groupStatusCopy($appointments, $status);
        $reason = in_array($status, ['cancelled', 'rejected'], true)
            ? $first->cancellation_reason
            : null;

        $notification = Notification::create([
            'user_id' => $customer->id,
            'type' => 'appointment_status',
            'title' => $copy['title'],
            'message' => $copy['message'],
            'payload' => [
                'batch_id' => $first->batch_id,
                'status' => $status,
                'appointment_count' => $appointments->count(),
                'appointment_date' => $first->appointment_date->toDateString(),
                'barber_name' => $first->barber?->fullname,
                'total_price' => (float) $appointments->sum('price'),
                'cancellation_reason' => $reason,
                'next_step' => $copy['next_step'],
                'appointments' => $appointments->map(fn (Appointment $appointment): array => [
                    'appointment_id' => $appointment->id,
                    'booking_id' => DisplayId::booking($appointment->id),
                    'customer_name' => $appointment->customerDisplayName(),
                    'service_name' => $appointment->service?->name,
                    'appointment_time' => substr((string) $appointment->appointment_time, 0, 5),
                    'price' => (float) $appointment->price,
                ])->values()->all(),
            ],
            'created_by_user_id' => $createdByUserId,
        ]);

        $this->sendPush($customer, $copy['title'], $copy['message'], [
            'url' => '/customer/notification',
            'batch_id' => $first->batch_id,
        ]);

        return $notification;
    }

    /**
     * @return array{title: string, message: string, next_step: string}
     */
    private function statusCopy(Appointment $appointment, string $status): array
    {
        $bookingId = DisplayId::booking($appointment->id);
        $date = $this->formatDate($appointment);
        $time = $this->formatTime($appointment);
        $service = $appointment->service?->name ?? 'barbershop service';
        $barber = $appointment->barber?->fullname ?? 'your barber';

        return match ($status) {
            'pending' => [
                'title' => 'Request Received',
                'message' => sprintf(
                    'We received your %s appointment request %s for %s at %s with %s. It is awaiting confirmation.',
                    $service,
                    $bookingId,
                    $date,
                    $time,
                    $barber,
                ),
                'next_step' => 'We will notify you after the barbershop reviews your request.',
            ],
            'approved' => [
                'title' => 'Appointment Confirmed',
                'message' => sprintf(
                    'Your %s appointment %s is confirmed for %s at %s with %s.',
                    $service,
                    $bookingId,
                    $date,
                    $time,
                    $barber,
                ),
                'next_step' => 'Please arrive about 5 minutes early so your visit can start on time.',
            ],
            'rejected' => [
                'title' => 'Request Not Approved',
                'message' => sprintf(
                    "We couldn't approve your %s appointment request %s for %s at %s.",
                    $service,
                    $bookingId,
                    $date,
                    $time,
                ),
                'next_step' => 'You can choose another available date or time and submit a new request.',
            ],
            'cancelled' => [
                'title' => 'Appointment Cancelled',
                'message' => sprintf(
                    'Your %s appointment %s, scheduled for %s at %s, has been cancelled.',
                    $service,
                    $bookingId,
                    $date,
                    $time,
                ),
                'next_step' => 'You can create another booking whenever you are ready.',
            ],
            'completed' => [
                'title' => 'Appointment Completed',
                'message' => sprintf(
                    'Your %s appointment %s is complete. Thank you for visiting TOL Barbershop.',
                    $service,
                    $bookingId,
                ),
                'next_step' => 'We would appreciate your feedback about your visit.',
            ],
            'no_show' => [
                'title' => 'Appointment Marked as No-Show',
                'message' => sprintf(
                    'Your %s appointment %s, scheduled for %s at %s, was marked as a no-show.',
                    $service,
                    $bookingId,
                    $date,
                    $time,
                ),
                'next_step' => 'If you believe this is incorrect, please contact the barbershop.',
            ],
            default => [
                'title' => 'Appointment Updated',
                'message' => sprintf('Your %s appointment %s has been updated.', $service, $bookingId),
                'next_step' => 'Open the appointment details to review the latest information.',
            ],
        };
    }

    /**
     * @param  Collection<int, Appointment>  $appointments
     * @return array{title: string, message: string, next_step: string}
     */
    private function groupStatusCopy(Collection $appointments, string $status): array
    {
        $first = $appointments->firstOrFail();
        $count = $appointments->count();
        $date = $this->formatDate($first);
        $barber = $first->barber?->fullname ?? 'your barber';

        return match ($status) {
            'pending' => [
                'title' => 'Group Booking Request Received',
                'message' => sprintf(
                    'We received your group booking request for %d appointments on %s with %s. It is awaiting confirmation.',
                    $count,
                    $date,
                    $barber,
                ),
                'next_step' => 'We will notify you after the barbershop reviews your group request.',
            ],
            'approved' => [
                'title' => 'Group Booking Confirmed',
                'message' => sprintf(
                    'Your group booking for %d appointments on %s with %s is confirmed.',
                    $count,
                    $date,
                    $barber,
                ),
                'next_step' => 'Please have everyone arrive about 5 minutes before their scheduled time.',
            ],
            'rejected' => [
                'title' => 'Group Booking Not Approved',
                'message' => sprintf(
                    "We couldn't approve your group booking request for %d appointments on %s.",
                    $count,
                    $date,
                ),
                'next_step' => 'You can choose another available date or set of times and submit a new request.',
            ],
            default => [
                'title' => 'Group Booking Updated',
                'message' => sprintf('Your group booking for %d appointments on %s has been updated.', $count, $date),
                'next_step' => 'Open the booking details to review the latest information.',
            ],
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function appointmentPayload(Appointment $appointment, string $status, string $nextStep): array
    {
        $reason = in_array($status, ['cancelled', 'rejected'], true)
            ? $appointment->cancellation_reason
            : null;

        return [
            'appointment_id' => $appointment->id,
            'booking_id' => DisplayId::booking($appointment->id),
            'status' => $status,
            'service_name' => $appointment->service?->name,
            'barber_name' => $appointment->barber?->fullname,
            'appointment_date' => $appointment->appointment_date->toDateString(),
            'appointment_time' => substr((string) $appointment->appointment_time, 0, 5),
            'price' => (float) $appointment->price,
            'cancellation_reason' => $reason,
            'next_step' => $nextStep,
        ];
    }

    private function formatDate(Appointment $appointment): string
    {
        return Carbon::parse($appointment->appointment_date)->format('F j, Y');
    }

    private function formatTime(Appointment $appointment): string
    {
        $time = substr((string) $appointment->appointment_time, 0, 5);

        return Carbon::createFromFormat('H:i', $time)->format('g:i A');
    }

    /**
     * @param  array<string, int|string|null>  $data
     */
    private function sendPush(User $customer, string $title, string $body, array $data): void
    {
        try {
            (new PushNotificationService)->send($customer, [
                'title' => $title,
                'body' => $body,
                'icon' => '/Tol-Logo-White-Bg.png',
                'badge' => '/Tol-Logo-White-Bg.png',
                'data' => $data,
            ]);
        } catch (\Throwable $exception) {
            report($exception);
        }
    }
}
