<?php

namespace App\Http\Controllers;

use App\Support\EntityChange;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;

class EntityChangeController extends Controller
{
    use ApiResponseTrait;

    public function index(): JsonResponse
    {
        return $this->success('Entity change versions retrieved', [
            'appointments' => EntityChange::version('appointments'),
        ]);
    }
}
