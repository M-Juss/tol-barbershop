<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Http\Requests\ServiceRequest;
use App\Http\Controllers\Controller;
use App\Traits\ApiResponseTrait;
use App\Models\Service;
use App\Http\Resources\ServiceResource;

class ServiceController extends Controller
{
    use ApiResponseTrait;

    public function index()
    {
    try {
       
        $services = Service::all();
        
        $data = [
            "services" => ServiceResource::collection($services),
        ];

        return $this->success('Services retrieved successfully', $data);
        
    } catch (\Exception $e) {
        return $this->error('Could not fetch services', [], 500);
    }
    }


    public function store(ServiceRequest $request)
    {
        try{
            $validated = $request->validated();
            
            Service::create($validated);
            
            return $this->created('Service created successfully');
            
            
        } catch (\Exception $e) {

        return $this->error(
            'Something went wrong',
            [],
            500
        );
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
    public function update(ServiceRequest $request, string $id)
    {
        try {
            $service = Service::find($id);
            
            if(!$service) {
                return $this->error('Service not found', [],404);
            }
            
            $service->update($request->validated());
            
            return $this->created('Service updated successfully');
                
            
        } catch (\Exception $e) {

        return $this->error(
            $e->getMessage(),
            [],
            500
        );
    }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        try {
            $service = Service::find($id);
            
            if(!$service) {
                return $this->error('Service not found', [],404);
            }
            
            $service->delete();
            
            return $this->success('Service deleted successfully');
                
            
        } catch (\Exception $e) {

        return $this->error(
            $e->getMessage(),
            [],
            500
        );
    }
    }
}