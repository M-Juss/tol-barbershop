<?php

namespace App\Http\Controllers;

use App\Http\Requests\RoleRequest;
use App\Http\Resources\RoleResource;
use App\Models\Role;
use App\Models\User;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    use ApiResponseTrait;

    public function index()
    {
        $roles = Role::with('modules')->latest()->get();
        return $this->success('Roles retrieved successfully.', RoleResource::collection($roles));
    }

    public function store(RoleRequest $request)
    {
        $role = Role::create($request->safe()->only('name'));
        $role->modules()->sync($request->input('module_ids', []));
        $role->load('modules');

        return $this->success('Role created successfully.', new RoleResource($role), 201);
    }

    public function show(Role $role)
    {
        $role->load('modules');
        return $this->success('Role retrieved successfully.', new RoleResource($role));
    }

    public function update(RoleRequest $request, Role $role)
    {
        $role->update($request->safe()->only('name'));
        $role->modules()->sync($request->input('module_ids', []));
        $role->load('modules');

        return $this->success('Role updated successfully.', new RoleResource($role));
    }

    public function destroy(Role $role)
    {
        $activeAdminsCount = $role->users()
            ->where('role', 'admin')
            ->where('is_active', true)
            ->count();

        if ($activeAdminsCount > 0) {
            return $this->error(
                "Cannot delete this role. {$activeAdminsCount} active admin(s) are currently assigned to it.",
                [],
                409
            );
        }

        $role->users()->where('role', 'admin')->update(['role_id' => null]);
        $role->delete();
        return $this->noData('Role deleted successfully.');
    }
}
