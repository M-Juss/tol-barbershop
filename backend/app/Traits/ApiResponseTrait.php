<?php

namespace App\Traits;

use Illuminate\Http\JsonResponse;


trait ApiResponseTrait
{
    protected function success(
        string $message = 'Success',
        mixed $data = null,
        int $status = 200
    ): JsonResponse {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data'    => $data,
        ], $status);
    }

    protected function created(
        string $message = 'Created successfully',
        mixed $data = null
    ): JsonResponse {
        return $this->success($message, $data, 201);
    }

    protected function noData(
        string $message = 'Action completed'
    ): JsonResponse {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data'    => null,
        ], 200);
    }

    protected function error(
        string $message = 'Something went wrong',
        array $errors = [],
        int $status = 400
    ): JsonResponse {
        $body = [
            'success' => false,
            'message' => $message,
        ];

        if (!empty($errors)) {
            $body['errors'] = $errors;
        }

        return response()->json($body, $status);
    }

}