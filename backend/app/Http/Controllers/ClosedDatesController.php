<?php

namespace App\Http\Controllers;

use App\Http\Requests\ClosedDatesRequest;
use App\Http\Resources\ClosedDatesResource;
use App\Models\Appointment;
use App\Models\ClosedDates;
use App\Models\Notification;
use App\Models\User;
use App\Support\EntityChange;
use App\Traits\ApiResponseTrait;
use Carbon\Carbon;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

class ClosedDatesController extends Controller
{
    use ApiResponseTrait;

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        if ($request->has('all')) {
            $showAll = filter_var($request->query('all'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);

            if ($showAll === null) {
                throw ValidationException::withMessages(['all' => 'The all field must be true or false.']);
            }

            $request->merge(['all' => $showAll]);
        }

        $validated = $request->validate([
            'all' => ['sometimes', 'boolean'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);
        $showAll = (bool) ($validated['all'] ?? false);
        $perPage = (int) ($validated['per_page'] ?? ($showAll ? 5 : 100));

        if ($showAll && ! in_array($request->user()?->role, ['admin', 'manager'], true)) {
            abort(403, 'Forbidden.');
        }

        try {
            if ($showAll) {
                // For activity log - show all records including removed ones
                $closedDates = ClosedDates::orderBy('created_at', 'desc')->paginate($perPage);
            } else {
                // For main display - only show non-removed records
                $closedDates = ClosedDates::where('is_removed', false)
                    ->orderBy('date_closed')
                    ->paginate($perPage);
            }

            return $this->success('Closed dates fetched successfully', [
                'data' => ClosedDatesResource::collection($closedDates)->items(),
                'current_page' => $closedDates->currentPage(),
                'last_page' => $closedDates->lastPage(),
                'per_page' => $closedDates->perPage(),
                'total' => $closedDates->total(),
            ]);

        } catch (Throwable $exception) {
            report($exception);

            return $this->error('Could not fetch closed dates', [], 500);
        }
    }

    public function store(ClosedDatesRequest $request)
    {
        try {
            $validated = $request->validated();

            $closedDate = DB::transaction(function () use ($validated): ClosedDates {
                $closedDate = ClosedDates::create($validated);

                return $closedDate;
            }, 3);
        } catch (ValidationException $exception) {
            throw $exception;
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages([
                'date_closed' => 'This date has already been marked as closed.',
            ]);
        } catch (Throwable $exception) {
            report($exception);

            return $this->error('Could not create closed date', [], 500);
        }

        EntityChange::dispatch('closed_dates');

        try {
            $message = sprintf(
                'The shop will be closed on %s due to - %s',
                Carbon::parse($closedDate->date_closed)->format('F d, Y'),
                $closedDate->reason,
            );
            $payload = json_encode([
                'closed_date_id' => $closedDate->id,
                'date_closed' => $closedDate->date_closed,
                'reason' => $closedDate->reason,
            ], JSON_THROW_ON_ERROR);
            $now = now();

            User::query()
                ->where('role', 'customer')
                ->where('is_active', true)
                ->select('id')
                ->chunkById(500, function ($customers) use ($message, $payload, $request, $now): void {
                    Notification::insert($customers->map(fn (User $customer): array => [
                        'user_id' => $customer->id,
                        'type' => 'closed_date',
                        'title' => 'Shop Closed Date Announced',
                        'message' => $message,
                        'payload' => $payload,
                        'is_read' => false,
                        'created_by_user_id' => $request->user()?->id,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ])->all());
                });

        } catch (Throwable $exception) {
            report($exception);
        }

        return $this->created('Closed date successfully inserted');
    }

    public function update(ClosedDatesRequest $request, string $id)
    {
        try {
            $validated = $request->validated();
            $closedDate = DB::transaction(function () use ($id, $validated): ClosedDates {
                $closedDate = ClosedDates::whereKey($id)->lockForUpdate()->first();
                if (! $closedDate) {
                    abort(404, 'Closed date not found.');
                }

                $closedDate->update($validated);

                return $closedDate;
            }, 3);

            EntityChange::dispatch('closed_dates');

            return $this->success('Closed date updated successfully', new ClosedDatesResource($closedDate));
        } catch (ValidationException $exception) {
            throw $exception;
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages([
                'date_closed' => 'This date has already been marked as closed.',
            ]);
        } catch (Throwable $exception) {
            report($exception);

            return $this->error('Could not update closed date', [], 500);
        }
    }

    public function checkConflicts(Request $request)
    {
        $validated = $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
        ]);

        $nextDate = Carbon::parse($validated['date'])->addDay()->toDateString();
        $count = Appointment::query()
            ->where('appointment_date', '>=', $validated['date'])
            ->where('appointment_date', '<', $nextDate)
            ->whereIn('status', ['pending', 'approved'])
            ->count();

        return $this->success('Conflict check completed', ['count' => $count]);
    }
}
