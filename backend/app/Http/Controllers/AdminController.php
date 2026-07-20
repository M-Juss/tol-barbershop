<?php

namespace App\Http\Controllers;

use App\Http\Requests\StaffRequest;
use App\Http\Resources\StaffResource;
use App\Models\PushSubscription;
use App\Models\User;
use App\Services\SupportTicketAssignmentService;
use App\Support\EntityChange;
use App\Traits\ApiResponseTrait;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

class AdminController extends Controller
{
    use ApiResponseTrait;

    public function __construct(private readonly SupportTicketAssignmentService $supportTickets) {}

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        try {
            $admin = User::where('role', 'admin')->get();
            $data = StaffResource::collection($admin);

            return $this->success('Admin fetched successfully', $data);

        } catch (Throwable $exception) {
            report($exception);

            return $this->error('Could not fetch staff', [], 500);
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
                'password' => bcrypt($validated['password']),
                'role' => 'admin',
                'is_active' => $validated['is_active'] ?? true,
                'role_id' => $validated['role_id'] ?? null,
            ];

            User::create($staffData);
            EntityChange::dispatch('admins');

            return $this->created('Admin created successfully');

        } catch (Throwable $exception) {
            report($exception);

            return $this->error('Could not create admin', [], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        try {
            $admin = User::where('role', 'admin')->find($id);

            if (! $admin) {
                return $this->error('Admin not found', [], 404);
            }

            return $this->success('Admin fetched successfully', new StaffResource($admin));
        } catch (Throwable $exception) {
            report($exception);

            return $this->error('Could not fetch admin', [], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(StaffRequest $request, string $id)
    {
        try {
            $admin = User::where('role', 'admin')->find($id);

            if (! $admin) {
                return $this->error('Admin not found', [], 404);
            }

            $validated = $request->validated();

            $passwordChanged = ! empty($validated['password']);
            $isBeingDeactivated = $admin->is_active && array_key_exists('is_active', $validated) && ! $validated['is_active'];
            $updates = [
                'fullname' => $validated['fullname'],
                'email' => $validated['email'],
                'contact_number' => $validated['contact_number'],
                'is_active' => $validated['is_active'] ?? $admin->is_active,
                'role_id' => array_key_exists('role_id', $validated) ? $validated['role_id'] : $admin->role_id,
            ];

            if ($passwordChanged) {
                $updates['password'] = bcrypt($validated['password']);
                $updates['remember_token'] = Str::random(60);
            }

            $admin->forceFill($updates)->save();

            if ($passwordChanged || $isBeingDeactivated) {
                $admin->tokens()->delete();

                if (config('session.driver') === 'database') {
                    DB::table((string) config('session.table', 'sessions'))
                        ->where('user_id', $admin->id)
                        ->delete();
                }
            }

            if ($isBeingDeactivated) {
                PushSubscription::where('user_id', $admin->id)->delete();
            }

            if (! $admin->is_active || ! $admin->canAccessModule('customer-service')) {
                $this->supportTickets->requeueAssignedTickets($admin->id);
            }

            EntityChange::dispatch('admins');

            return $this->success('Admin updated successfully');

        } catch (Throwable $exception) {
            report($exception);

            return $this->error('Could not update admin', [], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        try {
            $admin = User::where('role', 'admin')->find($id);

            if (! $admin) {
                return $this->error('Admin not found', [], 404);
            }

            DB::transaction(function () use ($admin): void {
                $this->supportTickets->requeueAssignedTickets($admin->id);
                PushSubscription::where('user_id', $admin->id)->delete();
                $admin->tokens()->delete();

                if (config('session.driver') === 'database') {
                    DB::table((string) config('session.table', 'sessions'))
                        ->where('user_id', $admin->id)
                        ->delete();
                }

                $admin->delete();
            });
            EntityChange::dispatch('admins');

            return $this->success('Admin deleted successfully');

        } catch (Throwable $exception) {
            report($exception);

            return $this->error('Could not delete admin', [], 500);
        }
    }
}
