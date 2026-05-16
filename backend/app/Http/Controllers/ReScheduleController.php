<?php

namespace App\Http\Controllers;

use App\Http\Requests\ReScheduleRequest;
use App\Http\Resources\ReScheduleResource;
use App\Models\Appointment;
use App\Models\Notification;
use App\Models\ReSchedule;
use App\Traits\ApiResponseTrait;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReScheduleController extends Controller
{
    use ApiResponseTrait;

    public function index(Request $request)
    {
        $user = $request->user();

        $query = ReSchedule::with(['customer:id,fullname', 'service:id,name', 'barber:id,fullname'])
            ->latest();

        if ($user && $user->role === 'customer') {
            $query->where('customer_user_id', $user->id);
        }

        if ($request->filled('decision')) {
            $query->where('decision', $request->query('decision'));
        }

        return $this->success('Re-schedules fetched successfully', ReScheduleResource::collection($query->get()));
    }

    public function store(ReScheduleRequest $request)
    {
        $validated = $request->validated();
        $authUser = $request->user();

        $validated['created_by_user_id'] = $authUser?->id;
        $validated['created_by_role'] = $validated['created_by_role'] ?? ($authUser?->role === 'admin' ? 'admin' : 'manager');
        $validated['decision'] = 'pending';

        $reschedule = ReSchedule::create($validated);
        $reschedule->load(['customer:id,fullname', 'service:id,name', 'barber:id,fullname']);

        Notification::create([
            'user_id' => $reschedule->customer_user_id,
            'type' => 'reschedule_suggestion',
            'title' => 'New Re-schedule Suggestion',
            'message' => sprintf(
                'You have a suggested re-schedule for appointment #%d on %s at %s.',
                $reschedule->appointment_id,
                $reschedule->appointment_date,
                substr((string) $reschedule->appointment_time, 0, 5)
            ),
            'payload' => [
                'reschedule_id' => $reschedule->id,
                'appointment_id' => $reschedule->appointment_id,
            ],
            'created_by_user_id' => $authUser?->id,
        ]);

        return $this->created('Re-schedule saved successfully', new ReScheduleResource($reschedule));
    }

    public function decide(Request $request, string $id)
    {
        $validated = $request->validate([
            'decision' => 'required|in:accepted,declined',
        ]);

        $authUser = $request->user();
        $reschedule = ReSchedule::with('appointment')->findOrFail($id);

        if ($authUser && $authUser->role === 'customer' && $reschedule->customer_user_id !== $authUser->id) {
            return $this->error('Unauthorized to update this re-schedule.', [], 403);
        }

        if ($reschedule->decision !== 'pending') {
            return $this->error('This re-schedule has already been decided.', [], 422);
        }

        DB::transaction(function () use ($validated, $reschedule) {
            $decision = $validated['decision'];
            $appointment = Appointment::findOrFail($reschedule->appointment_id);

            if ($decision === 'accepted') {
                $hasConflict = Appointment::where('id', '!=', $appointment->id)
                    ->where('barber_user_id', $reschedule->barber_user_id)
                    ->where('appointment_date', $reschedule->appointment_date)
                    ->where('appointment_time', $reschedule->appointment_time)
                    ->whereIn('status', ['pending', 'approved'])
                    ->exists();

                if ($hasConflict) {
                    abort(422, 'Selected barber already has an appointment at this time.');
                }

                $appointment->update([
                    'service_id' => $reschedule->service_id,
                    'barber_user_id' => $reschedule->barber_user_id,
                    'appointment_date' => $reschedule->appointment_date,
                    'appointment_time' => $reschedule->appointment_time,
                    'duration_minutes' => $reschedule->duration_minutes,
                    'price' => $reschedule->price,
                    'notes' => $reschedule->notes,
                    'status' => 'approved',
                    'cancellation_reason' => null,
                ]);
            } else {
                $appointment->update([
                    'status' => 'cancelled',
                    'cancellation_reason' => 'Customer declined suggested re-schedule.',
                    'cancelled_at' => Carbon::now(),
                ]);
            }

            $reschedule->update([
                'decision' => $decision,
                'responded_at' => Carbon::now(),
            ]);
        });

        $reschedule->refresh()->load(['customer:id,fullname', 'service:id,name', 'barber:id,fullname']);

        return $this->success('Re-schedule decision submitted successfully.', new ReScheduleResource($reschedule));
    }
}
