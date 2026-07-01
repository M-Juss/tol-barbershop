<?php

namespace App\Http\Controllers;

use App\Http\Resources\NotificationResource;
use App\Models\Notification;
use App\Traits\ApiResponseTrait;
use Carbon\Carbon;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    use ApiResponseTrait;

    public function index(Request $request)
    {
        $authUser = $request->user();

        if (! $authUser) {
            return $this->error('Unauthorized.', [], 401);
        }

        $notifications = Notification::where('user_id', $authUser->id)
            ->latest()
            ->paginate(5);

        $unreadCount = Notification::where('user_id', $authUser->id)
            ->where('is_read', false)
            ->count();

        return $this->success('Notifications fetched successfully', [
            'unread_count' => $unreadCount,
            'notifications' => NotificationResource::collection($notifications),
            'pagination' => [
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
                'per_page' => $notifications->perPage(),
                'total' => $notifications->total(),
            ],
        ]);
    }

    public function markAsRead(Request $request, string $id)
    {
        $authUser = $request->user();
        if (! $authUser) {
            return $this->error('Unauthorized.', [], 401);
        }

        $notification = Notification::where('user_id', $authUser->id)->findOrFail($id);

        if (! $notification->is_read) {
            $notification->update([
                'is_read' => true,
                'read_at' => Carbon::now(),
            ]);
        }

        return $this->success('Notification marked as read.', new NotificationResource($notification));
    }

    public function markAllAsRead(Request $request)
    {
        $authUser = $request->user();
        if (! $authUser) {
            return $this->error('Unauthorized.', [], 401);
        }

        Notification::where('user_id', $authUser->id)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);

        return $this->success('All notifications marked as read.');
    }
}
