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
        $entityTypes = [
            'appointments',
            'support_tickets',
            'notifications',
            'closed_dates',
            'barbers',
            'services',
            'gallery_images',
            'feedback',
            'admins',
        ];

        return $this->success(
            'Entity change versions retrieved',
            EntityChange::versions($entityTypes),
        );
    }
}
