<?php

namespace App\Http\Controllers;

use App\Http\Requests\StaffRequest;
use App\Http\Resources\StaffResource;
use App\Models\User;
use App\Support\EntityChange;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Throwable;

class BarberController extends Controller
{
    use ApiResponseTrait;

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        try {
            $query = User::where('role', 'barber');

            if (! $request->user()?->canAccessModule('management')) {
                $query->where('is_active', true);
            }

            $barber = $query->get();
            $data = StaffResource::collection($barber);

            return $this->success('Barber fetched successfully', $data);

        } catch (Throwable $exception) {
            report($exception);

            return $this->error('Could not fetch barber', [], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StaffRequest $request)
    {
        try {
            $validated = $request->validated();

            $staffData = [
                'fullname' => $validated['fullname'],
                'email' => $validated['email'],
                'contact_number' => $validated['contact_number'],
                'password' => bcrypt($validated['password'] ?? 'Staff123!'),
                'role' => 'barber',
                'is_active' => $validated['is_active'] ?? true,
            ];

            User::create($staffData);
            EntityChange::dispatch('barbers');

            return $this->created('Barber created successfully');

        } catch (Throwable $exception) {
            report($exception);

            return $this->error('Could not create barber', [], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, string $id)
    {
        try {
            $query = User::where('role', 'barber');

            if (! $request->user()?->canAccessModule('management')) {
                $query->where('is_active', true);
            }

            $barber = $query->find($id);

            if (! $barber) {
                return $this->error('Barber not found', [], 404);
            }

            return $this->success('Barber fetched successfully', new StaffResource($barber));
        } catch (Throwable $exception) {
            report($exception);

            return $this->error('Could not fetch barber', [], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(StaffRequest $request, string $id)
    {
        try {
            $barber = User::where('role', 'barber')->find($id);

            if (! $barber) {
                return $this->error('Barber not found', [], 404);
            }

            $validated = $request->validated();

            $barber->update([
                'fullname' => $validated['fullname'],
                'email' => $validated['email'],
                'contact_number' => $validated['contact_number'],
                'is_active' => $validated['is_active'] ?? $barber->is_active,
            ]);

            EntityChange::dispatch('barbers');

            return $this->success('Barber updated successfully');

        } catch (Throwable $exception) {
            report($exception);

            return $this->error('Could not update barber', [], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        try {
            $barber = User::where('role', 'barber')->find($id);

            if (! $barber) {
                return $this->error('Barber not found', [], 404);
            }

            $barber->delete();
            EntityChange::dispatch('barbers');

            return $this->success('Barber deleted successfully');

        } catch (Throwable $exception) {
            report($exception);

            return $this->error('Could not delete barber', [], 500);
        }
    }
}
