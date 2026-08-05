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
use Illuminate\Support\Facades\DB;

class AppointmentFeedbackController extends Controller
{
    use ApiResponseTrait;

    public function store(AppointmentFeedbackRequest $request)
    {
        $authUser = $request->user();
        $validated = $request->validated();

        $comment = $validated['comment'] ?? null;
        $result = DB::transaction(function () use ($validated, $authUser, $comment): array {
            $appointment = Appointment::with(['service', 'user'])
                ->where('id', $validated['appointment_id'])
                ->where('user_id', $authUser->id)
                ->lockForUpdate()
                ->first();

            if (! $appointment) {
                return ['error' => 'Appointment not found.', 'status' => 404];
            }

            if ($appointment->status !== 'completed') {
                return [
                    'error' => 'Feedback can only be submitted for completed appointments.',
                    'status' => 422,
                ];
            }

            $feedback = AppointmentFeedback::updateOrCreate(
                ['appointment_id' => $appointment->id],
                [
                    'user_id' => $authUser->id,
                    'rating' => $validated['rating'],
                    'comment' => is_string($comment) && trim($comment) !== ''
                        ? trim($comment)
                        : null,
                    'is_featured' => false,
                    'customer_name_snapshot' => $authUser->fullname,
                ],
            );

            return ['feedback' => $feedback];
        }, 3);

        if (isset($result['error'])) {
            return $this->error($result['error'], [], $result['status']);
        }

        /** @var AppointmentFeedback $feedback */
        $feedback = $result['feedback'];

        $feedback->load(['user', 'appointment.service', 'appointment.barber']);
        EntityChange::dispatch('feedback');

        return $this->success(
            'Feedback submitted successfully.',
            new AppointmentFeedbackResource($feedback),
        );
    }

    public function toggleFeature(Request $request, $id)
    {
        $result = DB::transaction(function () use ($id): array {
            $featuredIds = AppointmentFeedback::where('is_featured', true)
                ->orderBy('id')
                ->lockForUpdate()
                ->pluck('id');
            $feedback = AppointmentFeedback::whereKey($id)
                ->lockForUpdate()
                ->first();

            if (! $feedback) {
                abort(404);
            }

            $featuredCount = $featuredIds->count();

            if ($feedback->is_featured && $featuredCount <= 1) {
                return ['error' => 'At least 1 feedback must remain featured.'];
            }

            if (! $feedback->is_featured && $featuredCount >= 5) {
                return ['error' => 'You can feature up to 5 items. Unfeature one first.'];
            }

            $feedback->update(['is_featured' => ! $feedback->is_featured]);

            return [
                'feedback' => $feedback,
                'message' => $feedback->is_featured
                    ? 'Feedback featured successfully.'
                    : 'Feedback removed from featured.',
            ];
        }, 3);

        if (isset($result['error'])) {
            return $this->error($result['error'], [], 422);
        }

        /** @var AppointmentFeedback $feedback */
        $feedback = $result['feedback'];

        $feedback->load(['user', 'appointment.service', 'appointment.barber']);
        EntityChange::dispatch('feedback');

        return $this->success($result['message'], new AppointmentFeedbackResource($feedback));
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
        ])->withHeaders([
            'Cache-Control' => 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
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
        ])->withHeaders([
            'Cache-Control' => 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
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
