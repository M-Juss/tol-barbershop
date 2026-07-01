<?php

namespace App\Http\Controllers;

use App\Http\Requests\AppointmentFeedbackRequest;
use App\Http\Resources\AppointmentFeedbackResource;
use App\Models\Appointment;
use App\Models\AppointmentFeedback;
use App\Support\EntityChange;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class AppointmentFeedbackController extends Controller
{
    use ApiResponseTrait;

    public function store(AppointmentFeedbackRequest $request)
    {
        $authUser = $request->user();
        $validated = $request->validated();

        $appointment = Appointment::with(['service', 'user'])
            ->where('id', $validated['appointment_id'])
            ->where('user_id', $authUser->id)
            ->first();

        if (! $appointment) {
            return $this->error('Appointment not found.', [], 404);
        }

        if ($appointment->status !== 'completed') {
            return $this->error('Feedback can only be submitted for completed appointments.', [], 422);
        }

        $comment = $validated['comment'] ?? null;

        $feedback = AppointmentFeedback::updateOrCreate(
            ['appointment_id' => $appointment->id],
            [
                'user_id' => $authUser->id,
                'rating' => $validated['rating'],
                'comment' => is_string($comment) && trim($comment) !== ''
                    ? trim($comment)
                    : null,
            ],
        );

        $feedback->load(['user', 'appointment.service']);
        EntityChange::dispatch('feedback');

        return $this->success(
            'Feedback submitted successfully.',
            new AppointmentFeedbackResource($feedback),
        );
    }

    public function publicIndex(Request $request)
    {
        $feedback = AppointmentFeedback::with(['user:id,fullname', 'appointment.service:id,name'])
            ->where('rating', 5)
            ->whereNotNull('comment')
            ->where('comment', '<>', '')
            ->latest()
            ->limit(10)
            ->get();

        return $this->success('Feedback retrieved successfully.', [
            'feedback' => AppointmentFeedbackResource::collection($feedback),
        ]);
    }

    public function pendingFeedback(Request $request)
    {
        $authUser = $request->user();

        $appointments = Appointment::where('user_id', $authUser->id)
            ->where('status', 'completed')
            ->whereDoesntHave('feedback')
            ->with('service:id,name')
            ->get();

        return $this->success('Pending feedback retrieved.', [
            'appointments' => $appointments->map(fn ($a) => [
                'appointment_id' => $a->id,
                'service_name' => $a->service?->name,
            ]),
        ]);
    }

    public function index(Request $request)
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'rating' => ['nullable', 'integer', 'min:1', 'max:5'],
        ]);

        $query = AppointmentFeedback::with(['user:id,fullname', 'appointment.service:id,name']);

        if (! empty($validated['search'])) {
            $search = $validated['search'];
            $query->where(function ($q) use ($search) {
                $q->whereHas('user', fn ($uq) => $uq->where('fullname', 'like', "%{$search}%"))
                    ->orWhereHas('appointment.service', fn ($sq) => $sq->where('name', 'like', "%{$search}%"))
                    ->orWhere('comment', 'like', "%{$search}%");
            });
        }

        if (! empty($validated['rating'])) {
            $query->where('rating', $validated['rating']);
        }

        $sortField = $request->input('sort', 'created_at');
        $sortDir = $request->input('dir', 'desc');
        $allowedSorts = ['created_at', 'rating'];
        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, $sortDir === 'asc' ? 'asc' : 'desc');
        }

        $perPage = min((int) $request->input('per_page', 15), 50);
        $feedback = $query->paginate($perPage);

        return $this->success('Feedback retrieved successfully.', [
            'feedback' => AppointmentFeedbackResource::collection($feedback),
            'meta' => [
                'current_page' => $feedback->currentPage(),
                'last_page' => $feedback->lastPage(),
                'per_page' => $feedback->perPage(),
                'total' => $feedback->total(),
            ],
        ]);
    }
}
