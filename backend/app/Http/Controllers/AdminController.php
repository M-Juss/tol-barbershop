<?php

namespace App\Http\Controllers;

use App\Http\Requests\StaffRequest;
use App\Http\Resources\StaffResource;
use App\Models\User;
use App\Support\EntityChange;
use App\Traits\ApiResponseTrait;
use Illuminate\Support\Facades\Storage;

class AdminController extends Controller
{
    use ApiResponseTrait;

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        try {
            $admin = User::where('role', 'admin')->get();
            $data = StaffResource::collection($admin);

            return $this->success('Admin fetched successfully', $data);

        } catch (\Exception $e) {
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

            // Handle image upload using Storage::store()
            $imagePath = null;
            if ($request->hasFile('image')) {
                $imagePath = $request->file('image')->store('staff-images', 'public');
            }

            $staffData = [
                'fullname' => $validated['fullname'],
                'email' => $validated['email'],
                'contact_number' => $validated['contact_number'],
                'password' => bcrypt($validated['password']),
                'role' => 'admin',
                'is_active' => $validated['is_active'] ?? true,
                'role_id' => $validated['role_id'] ?? null,
                'image' => $imagePath ? Storage::url($imagePath) : null,
            ];

            User::create($staffData);
            EntityChange::dispatch('admins');

            return $this->created('Admin created successfully');

        } catch (\Exception $e) {
            return $this->error('Could not create admin: '.$e->getMessage(), [], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(StaffRequest $request, string $id)
    {
        try {
            $admin = User::find($id);

            if (! $admin) {
                return $this->error('Admin not found', [], 404);
            }

            $validated = $request->validated();

            // Handle image upload using Storage::store()
            if ($request->hasFile('image')) {
                // Delete old image if exists
                if ($admin->image) {
                    $oldImagePath = str_replace('/storage/', '', $admin->image);
                    if (Storage::disk('public')->exists($oldImagePath)) {
                        Storage::disk('public')->delete($oldImagePath);
                    }
                }

                $imagePath = $request->file('image')->store('staff-images', 'public');
                $validated['image'] = Storage::url($imagePath);
            } else {
                $validated['image'] = $admin->image;
            }

            $admin->update([
                'fullname' => $validated['fullname'],
                'email' => $validated['email'],
                'contact_number' => $validated['contact_number'],
                'is_active' => $validated['is_active'] ?? $admin->is_active,
                'image' => $validated['image'],
                'role_id' => array_key_exists('role_id', $validated) ? $validated['role_id'] : $admin->role_id,
                'password' => ! empty($validated['password'])
                    ? bcrypt($validated['password'])
                    : $admin->password,
            ]);

            EntityChange::dispatch('admins');

            return $this->success('Admin updated successfully');

        } catch (\Exception $e) {
            return $this->error('Could not update admin', [], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        try {
            $admin = User::find($id);

            if (! $admin) {
                return $this->error('Admin not found', [], 404);
            }

            $admin->delete();
            EntityChange::dispatch('admins');

            return $this->success('Admin deleted successfully');

        } catch (\Exception $e) {
            return $this->error('Could not delete admin', [], 500);
        }
    }
}
