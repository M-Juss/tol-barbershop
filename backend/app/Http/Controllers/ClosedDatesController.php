<?php

namespace App\Http\Controllers;

use App\Http\Requests\ClosedDatesRequest;
use App\Http\Resources\ClosedDatesResource;
use App\Traits\ApiResponseTrait;
use App\Models\ClosedDates;
use Illuminate\Http\Request;

class ClosedDatesController extends Controller
{
    use ApiResponseTrait;
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        try{
            $showAll = $request->query('all', false);
            
            if ($showAll) {
                // For activity log - show all records including removed ones
                $closedDates = ClosedDates::orderBy("created_at","desc")->paginate(5);
            } else {
                // For main display - only show non-removed records
                $closedDates = ClosedDates::orderBy("created_at","desc")->where('is_removed', false)->paginate(5);
            }
            
            return $this->success('Closed dates fetched successfully', [
                'data' => ClosedDatesResource::collection($closedDates)->items(),
                'current_page' => $closedDates->currentPage(),
                'last_page' => $closedDates->lastPage(),
                'per_page' => $closedDates->perPage(),
                'total' => $closedDates->total()
            ]);
            
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



    public function update(ClosedDatesRequest $request, string $id)
    {
        try{
            $closedDate = ClosedDates::find($id);
            $closedDate->update($request->validated());
            if (!$closedDate) {
                return $this->error('Closed date not found', [], 404);
            }
            
            return $this->success('Closed date updated successfully', new ClosedDatesResource($closedDate));
           
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 500);
        }
    }
}