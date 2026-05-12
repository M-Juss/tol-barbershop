<?php

namespace App\Http\Controllers;

use App\Traits\ApiResponseTrait;
use App\Http\Requests\StaffRequest;
use App\Models\User;
use App\Http\Resources\StaffResource;
use Illuminate\Support\Facades\Storage;

class BarberController extends Controller
{
    use ApiResponseTrait;
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        try {
            $barber = User::where("role","barber")->get();
            $data = StaffResource::collection($barber);
            
            return $this->success('Barber fetched successfully', $data);
            
        } catch (\Exception $e) {
            return $this->error('Could not fetch barber', [], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StaffRequest $request)
    {
         try{
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
                'password' => bcrypt($validated['password'] ?? 'Staff123!'),
                'role' => 'barber',
                'is_active' => $validated['is_active'] ?? true,
                'image' => $imagePath ? Storage::url($imagePath) : null,
            ];
            
            User::create($staffData);
            return $this->created('Barber created successfully');
            
        } catch (\Exception $e) {
            return $this->error('Could not create barber: ' . $e->getMessage(), [], 500);
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
             $barber = User::find($id);
        
            if(!$barber){
                return $this->error('Barber not found', [], 404);
            }
            
            $validated = $request->validated();
            
            // Handle image upload using Storage::store()
            if ($request->hasFile('image')) {
                // Delete old image if exists
                if ($barber->image) {
                    $oldImagePath = str_replace('/storage/', '', $barber->image);
                    if (Storage::disk('public')->exists($oldImagePath)) {
                        Storage::disk('public')->delete($oldImagePath);
                    }
                }
                
                $imagePath = $request->file('image')->store('staff-images', 'public');
                $validated['image'] = Storage::url($imagePath);
            } else {
                $validated['image'] = $barber->image;
            }
            
            $barber->update([
                'fullname' => $validated['fullname'],
                'email' => $validated['email'],
                'contact_number' => $validated['contact_number'],
                'is_active' => $validated['is_active'] ?? $barber->is_active,
                'image' => $validated['image'],
            ]);
            
            return $this->success('Barber updated successfully');
            
        } catch (\Exception $e) {
            return $this->error('Could not update barber', [], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
    try {
             $barber = User::find($id);
        
            if(!$barber){
                return $this->error('Barber not found', [], 404);
            }
            
            $barber->delete();
            return $this->success('Barber deleted successfully');
            
        } catch (\Exception $e) {
            return $this->error('Could not delete barber', [], 500);
        }
    }
}