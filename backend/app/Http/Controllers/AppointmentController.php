<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use Illuminate\Http\Request;
use App\Http\Requests\AppointmentRequest;
use App\Http\Resources\AppointmentResource;

class AppointmentController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $appointments = Appointment::with([
            'user',
            'barber',
            'service',
        ])->latest()->get();

        return AppointmentResource::collection($appointments);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(AppointmentRequest $request)
    {
        // Prevent double booking
        $existingAppointment = Appointment::where('barber_user_id', $request->barber_user_id)
            ->where('appointment_date', $request->appointment_date)
            ->where('appointment_time', $request->appointment_time)
            ->whereIn('status', ['pending', 'approved'])
            ->exists();

        if ($existingAppointment) {
            return response()->json([
                'message' => 'Barber already has an appointment at this time.',
            ], 422);
        }

        $appointment = Appointment::create([
            'user_id' => $request->user_id,
            'service_id' => $request->service_id,
            'barber_user_id' => $request->barber_user_id,

            'appointment_date' => $request->appointment_date,
            'appointment_time' => $request->appointment_time,
            'duration_minutes' => $request->duration_minutes,

            'price' => $request->price,

            'status' => $request->status ?? 'pending',

            'notes' => $request->notes,
        ]);

        $appointment->load([
            'user',
            'barber',
            'service',
        ]);

        return new AppointmentResource($appointment);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $appointment = Appointment::with([
            'user',
            'barber',
            'service',
        ])->findOrFail($id);

        return new AppointmentResource($appointment);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(AppointmentRequest $request, string $id)
    {
        $appointment = Appointment::findOrFail($id);

        $appointment->update($request->validated());

        $appointment->load([
            'user',
            'barber',
            'service',
        ]);

        return new AppointmentResource($appointment);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $appointment = Appointment::findOrFail($id);

        $appointment->delete();

        return response()->json([
            'message' => 'Appointment deleted successfully.',
        ]);
    }
}
