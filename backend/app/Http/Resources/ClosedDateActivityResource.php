<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClosedDateActivityResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'closed_date_id' => $this->closed_date_id,
            'action' => $this->action,
            'closure_scope' => $this->closure_scope,
            'date_closed' => $this->date_closed,
            'barber_user_id' => $this->barber_user_id,
            'barber_name' => $this->barber_name_snapshot,
            'reason' => $this->reason,
            'actor_name' => $this->actor_name_snapshot,
            'created_at' => $this->created_at,
        ];
    }
}
