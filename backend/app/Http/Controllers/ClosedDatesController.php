<?php

namespace App\Http\Controllers;

use App\Http\Requests\ClosedDatesRequest;
use App\Http\Resources\ClosedDatesResource;
use App\Traits\ApiResponseTrait;
use App\Models\ClosedDates;

class ClosedDatesController extends Controller
{
    use ApiResponseTrait;
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        try{
            $closedDates = ClosedDates::orderBy("created_at","desc")->paginate(5);
            $data = ClosedDatesResource::collection($closedDates);
            
            return $this->success('Barber fetched successfully', $data);
            
        }catch(\Exception $e){
            return $this->error($e->getMessage(), [], 500);
        }
    }


    public function store(ClosedDatesRequest $request)
    {
        try {
            $validated = $request->validated();
            
            ClosedDates::create($validated);
    
            return $this->created('Closed date succescfully inserted');
        
            
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 500);
        }
    }



    public function destroy(string $id)
    {
        try{
            $closedDate = ClosedDates::find($id);
            
            if (!$closedDate) {
                return $this->error('Closed date not found', [], 404);
            }
            
            $closedDate->delete();
            return $this->success('Barber deleted successfully');
           
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 500);
        }
    }
}