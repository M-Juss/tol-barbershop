<?php

namespace App\Http\Controllers;

use App\Http\Requests\AppointmentFeedbackRequest;
use App\Http\Requests\FeedbackListRequest;
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
                'customer_name_snapshot' => $authUser->fullname,
            ],
        );

        $feedback->load(['user', 'appointment.service', 'appointment.barber']);
        EntityChange::dispatch('feedback');

        return $this->success(
            'Feedback submitted successfully.',
            new AppointmentFeedbackResource($feedback),
        );
    }

    public function toggleFeature(Request $request, $id)
    {
        $feedback = AppointmentFeedback::findOrFail($id);

        if ($feedback->is_featured) {
            $featuredCount = AppointmentFeedback::where('is_featured', true)->count();
            if ($featuredCount <= 1) {
                return $this->error('At least 1 feedback must remain featured.', [], 422);
            }
            $feedback->update(['is_featured' => false]);
            $feedback->load(['user', 'appointment.service', 'appointment.barber']);

            return $this->success('Feedback removed from featured.', new AppointmentFeedbackResource($feedback));
        }

        $featuredCount = AppointmentFeedback::where('is_featured', true)->count();

        if ($featuredCount >= 5) {
            return $this->error('Maximum of 5 featured feedback reached. Unfeature another item first.', [], 422);
        }

        $feedback->update(['is_featured' => true]);

        $feedback->load(['user', 'appointment.service', 'appointment.barber']);

        return $this->success('Feedback featured successfully.', new AppointmentFeedbackResource($feedback));
    }

    public function publicIndex(Request $request)
    {
        $feedback = AppointmentFeedback::with(['user:id,fullname', 'appointment.service:id,name', 'appointment.barber:id,fullname'])
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

    public function featuredIndex(Request $request)
    {
        $feedback = AppointmentFeedback::with(['user:id,fullname', 'appointment.service:id,name', 'appointment.barber:id,fullname'])
            ->where('is_featured', true)
            ->latest()
            ->limit(5)
            ->get();

        return $this->success('Featured feedback retrieved successfully.', [
            'feedback' => AppointmentFeedbackResource::collection($feedback),
        ]);
    }

    public function pendingFeedback(Request $request)
    {
        $authUser = $request->user();

        $appointments = Appointment::where('user_id', $authUser->id)
            ->where('status', 'completed')
            ->whereDoesntHave('feedback')
            ->with(['service:id,name', 'barber:id,fullname'])
            ->get();

        return $this->success('Pending feedback retrieved.', [
            'appointments' => $appointments->map(fn ($a) => [
                'appointment_id' => $a->id,
                'service_name' => $a->service?->name,
                'barber_name' => $a->barber?->fullname,
            ]),
        ]);
    }

    public function index(FeedbackListRequest $request)
    {
        $validated = $request->validated();

        $query = AppointmentFeedback::with(['user:id,fullname', 'appointment.service:id,name', 'appointment.barber:id,fullname']);

        if (! empty($validated['search'])) {
            $search = $validated['search'];
            $like = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $search).'%';
            $query->where(function ($q) use ($like) {
                $q->whereHas('user', fn ($uq) => $uq->whereRaw("fullname LIKE ? ESCAPE '!'", [$like]))
                    ->orWhereHas('appointment.barber', fn ($bq) => $bq->whereRaw("fullname LIKE ? ESCAPE '!'", [$like]))
                    ->orWhereHas('appointment.service', fn ($sq) => $sq->whereRaw("name LIKE ? ESCAPE '!'", [$like]))
                    ->orWhereRaw("comment LIKE ? ESCAPE '!'", [$like]);
            });
        }

        if (! empty($validated['rating'])) {
            $query->where('rating', $validated['rating']);
        }

        if (! empty($validated['featured'])) {
            if ($validated['featured'] === 'featured') {
                $query->where('is_featured', true);
            } elseif ($validated['featured'] === 'not_featured') {
                $query->where('is_featured', false);
            }
        }

        $sortField = $validated['sort'] ?? 'created_at';
        $sortDir = $validated['dir'] ?? 'desc';
        $perPage = $validated['per_page'] ?? 15;
        $feedback = $query
            ->orderBy($sortField, $sortDir)
            ->orderBy('id', $sortDir)
            ->paginate($perPage, ['*'], 'page', $validated['page'] ?? 1);

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
