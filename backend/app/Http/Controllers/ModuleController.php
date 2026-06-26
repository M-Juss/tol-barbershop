<?php

namespace App\Http\Controllers;

use App\Http\Resources\ModuleResource;
use App\Models\Module;
use App\Traits\ApiResponseTrait;

class ModuleController extends Controller
{
    use ApiResponseTrait;

    public function index()
    {
        $modules = Module::orderBy('id')->get();
        return $this->success('Modules retrieved successfully.', ModuleResource::collection($modules));
    }
}
