import { useState, useEffect } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Shield,
  Check,
  Mail,
  Phone,
} from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { AdminForm } from "@/forms/AdminForm";
import { AdminSchemaFormValues } from "@/validations/staff.validation";
import {
  getAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  type Admin,
} from "@/services/manager/admin.api";
import {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getModules,
  type Role,
  type Module,
} from "@/services/manager/role.api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

const isActiveValue = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true";
  }
  return false;
};

export function Admin() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<number | null>(null);

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState("");
  const [selectedModuleIds, setSelectedModuleIds] = useState<number[]>([]);

  const [deleteRoleConfirmOpen, setDeleteRoleConfirmOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<number | null>(null);
  const [adminPage, setAdminPage] = useState(1);
  const adminPageSize = 8;

  const loadData = async () => {
    try {
      setLoading(true);
      const [adminsData, rolesData, modulesData] = await Promise.all([
        getAdmins(),
        getRoles(),
        getModules(),
      ]);
      setAdmins(adminsData);
      setRoles(rolesData);
      setModules(modulesData);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setAdminPage(1);
  }, [admins.length]);

  const adminTotalPages = Math.max(1, Math.ceil(admins.length / adminPageSize));
  const paginatedAdmins = admins.slice(
    (adminPage - 1) * adminPageSize,
    adminPage * adminPageSize,
  );

  const openAddAdmin = () => {
    setEditingAdmin(null);
    setShowAdminModal(true);
  };

  const openEditAdmin = (admin: Admin) => {
    setEditingAdmin(admin);
    setShowAdminModal(true);
  };

  const closeAdminModal = () => {
    setShowAdminModal(false);
    setEditingAdmin(null);
  };

  const handleAdminSubmit = async (data: AdminSchemaFormValues & { image?: File }) => {
    try {
      if (editingAdmin) {
        await updateAdmin(editingAdmin.id, data);
        toast.success("Admin updated successfully");
      } else {
        await createAdmin(data);
        toast.success("Admin created successfully");
      }
      await loadData();
      closeAdminModal();
    } catch {
      toast.error("Failed to save admin");
    }
  };

  const handleDeleteAdmin = async (id: number) => {
    setAdminToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteAdmin = async () => {
    if (!adminToDelete) return;
    try {
      await deleteAdmin(adminToDelete);
      await loadData();
      setDeleteConfirmOpen(false);
      setAdminToDelete(null);
      toast.success("Admin deleted successfully");
    } catch {
      toast.error("Failed to delete admin");
    }
  };

  const openAddRole = () => {
    setEditingRole(null);
    setRoleName("");
    setSelectedModuleIds(modules.length > 0 ? [modules[0].id] : []);
    setShowRoleModal(true);
  };

  const openEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setSelectedModuleIds(role.modules.map((m) => m.id));
    setShowRoleModal(true);
  };

  const closeRoleModal = () => {
    setShowRoleModal(false);
    setEditingRole(null);
  };

  const handleRoleSubmit = async () => {
    if (!roleName.trim()) {
      toast.error("Role name is required");
      return;
    }
    if (selectedModuleIds.length === 0) {
      toast.error("Please select at least one module");
      return;
    }
    try {
      if (editingRole) {
        await updateRole(editingRole.id, {
          name: roleName.trim(),
          module_ids: selectedModuleIds,
        });
        toast.success("Role updated successfully");
      } else {
        await createRole({
          name: roleName.trim(),
          module_ids: selectedModuleIds,
        });
        toast.success("Role created successfully");
      }
      await loadData();
      closeRoleModal();
    } catch {
      toast.error("Failed to save role");
    }
  };

  const handleDeleteRole = async (id: number) => {
    setRoleToDelete(id);
    setDeleteRoleConfirmOpen(true);
  };

  const confirmDeleteRole = async () => {
    if (!roleToDelete) return;
    try {
      await deleteRole(roleToDelete);
      await loadData();
      setDeleteRoleConfirmOpen(false);
      setRoleToDelete(null);
      toast.success("Role deleted successfully");
    } catch {
      toast.error("Failed to delete role");
    }
  };

  const toggleModule = (moduleId: number) => {
    setSelectedModuleIds((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId],
    );
  };

  if (loading) {
    return (
      <div className="w-full h-full font-sans flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-4 sm:p-6 pb-12 sm:pb-10 font-sans">
      {/* ===== Roles Section ===== */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Roles</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage permission roles for admin accounts
            </p>
          </div>
          <button
            onClick={openAddRole}
            className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 transition-colors text-white font-semibold rounded-lg px-3 py-1.5 text-xs whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span className="hidden xs:inline">Create Role</span>
            <span className="xs:hidden">Add</span>
          </button>
        </div>

        {roles.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center flex flex-col items-center justify-center">
            <Shield className="w-12 h-12 text-gray-300 mb-3" />
            <h3 className="text-base font-semibold text-gray-500 mb-1">No Roles Yet</h3>
            <p className="text-sm text-gray-400">
              Create a role to assign module permissions to admin accounts.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => (
              <div
                key={role.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-red-500" />
                    <h3 className="font-bold text-gray-900">{role.name}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditRole(role)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleDeleteRole(role.id)}
                      className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {role.modules.map((mod) => (
                    <span
                      key={mod.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full"
                    >
                      <Check className="w-3 h-3" />
                      {mod.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== Admins Section ===== */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Admins</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage admin accounts and assign roles
            </p>
          </div>
          <button
            onClick={openAddAdmin}
            className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 transition-colors text-white font-semibold rounded-lg px-3 py-1.5 text-xs whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span className="hidden xs:inline">Add Admin</span>
            <span className="xs:hidden">Add</span>
          </button>
        </div>

        {admins.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center flex flex-col items-center justify-center">
            <AlertTriangle className="w-12 h-12 text-gray-300 mb-3" />
            <h3 className="text-base font-semibold text-gray-500 mb-1">No Admins Yet</h3>
            <p className="text-sm text-gray-400">
              Add an admin account to manage the barbershop system.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: stacked cards */}
            <div className="flex flex-col gap-3 md:hidden">
              {paginatedAdmins.map((admin) => (
                <div
                  key={admin.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600">
                        {admin.fullname.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{admin.fullname}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Mail className="w-3 h-3" />
                          {admin.email}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Phone className="w-3 h-3" />
                          {admin.contact_number}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditAdmin(admin)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => handleDeleteAdmin(admin.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {admin.role_name ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">
                        <Shield className="w-3 h-3" />
                        {admin.role_name}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs italic">No role</span>
                    )}
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        !isActiveValue(admin.is_active)
                          ? "bg-gray-100 text-gray-500"
                          : "bg-green-100 text-green-600"
                      }`}
                    >
                      {!isActiveValue(admin.is_active) ? "Inactive" : "Active"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAdmins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium text-gray-900">
                        {admin.fullname}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {admin.email}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {admin.contact_number}
                      </TableCell>
                      <TableCell>
                        {admin.role_name ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">
                            <Shield className="w-3 h-3" />
                            {admin.role_name}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm italic">
                            No role
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                            !isActiveValue(admin.is_active)
                              ? "bg-gray-100 text-gray-500"
                              : "bg-green-100 text-green-600"
                          }`}
                        >
                          {!isActiveValue(admin.is_active) ? "Inactive" : "Active"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditAdmin(admin)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => handleDeleteAdmin(admin.id)}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination (shared) */}
            {adminTotalPages > 1 && (
              <Pagination className="mt-4 overflow-hidden px-1">
                <PaginationContent className="flex-nowrap gap-0.5">
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      className="h-8 w-8 sm:h-9 sm:w-auto"
                      text=""
                      onClick={(event) => {
                        event.preventDefault();
                        setAdminPage((prev) => Math.max(1, prev - 1));
                      }}
                    />
                  </PaginationItem>
                  {(() => {
                    const pages: (number | "...")[] = [];
                    const total = adminTotalPages;
                    const current = adminPage;
                    pages.push(1);
                    if (current > 3) pages.push("...");
                    const start = Math.max(2, current - 1);
                    const end = Math.min(total - 1, current + 1);
                    for (let i = start; i <= end; i++) pages.push(i);
                    if (current < total - 2) pages.push("...");
                    if (total > 1) pages.push(total);
                    return pages.map((pageNo, idx) =>
                      pageNo === "..." ? (
                        <PaginationItem key={`ellipsis-${idx}`}>
                          <PaginationEllipsis className="size-7 sm:size-8" />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={pageNo}>
                          <PaginationLink
                            href="#"
                            isActive={pageNo === current}
                            className="h-7 w-7 sm:h-8 sm:w-8 text-xs sm:text-sm font-medium rounded-lg"
                            onClick={(event) => {
                              event.preventDefault();
                              setAdminPage(pageNo);
                            }}
                          >
                            {pageNo}
                          </PaginationLink>
                        </PaginationItem>
                      ),
                    );
                  })()}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      className="h-8 w-8 sm:h-9 sm:w-auto"
                      text=""
                      onClick={(event) => {
                        event.preventDefault();
                        setAdminPage((prev) => Math.min(adminTotalPages, prev + 1));
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        )}
      </div>

      {/* Admin Form Dialog */}
      <AdminForm
        open={showAdminModal}
        onClose={closeAdminModal}
        onSubmit={handleAdminSubmit}
        roles={roles}
        initialData={
          editingAdmin
            ? {
                fullname: editingAdmin.fullname,
                email: editingAdmin.email,
                contact_number: editingAdmin.contact_number,
                image: editingAdmin.image,
                is_active: isActiveValue(editingAdmin.is_active),
                role_id: editingAdmin.role_id ?? undefined,
              }
            : undefined
        }
        title={editingAdmin ? "Edit Admin" : "Add New Admin"}
      />

      {/* Delete Admin Confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Delete Admin
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this admin? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteAdmin}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Form Dialog */}
      <Dialog open={showRoleModal} onOpenChange={closeRoleModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              {editingRole ? "Edit Role" : "Create Role"}
            </DialogTitle>
            <DialogDescription className="text-gray-500 text-sm mt-0.5">
              {editingRole
                ? "Update the role name and permissions"
                : "Define a new role with specific module permissions"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role Name
              </label>
              <Input
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="e.g. Front Desk"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Module Permissions
              </label>
              <div className="space-y-2">
                {modules.map((mod) => (
                  <div
                    key={mod.id}
                    onClick={() => toggleModule(mod.id)}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        selectedModuleIds.includes(mod.id)
                          ? "bg-red-500 border-red-500"
                          : "border-gray-300"
                      }`}
                    >
                      {selectedModuleIds.includes(mod.id) && (
                        <Check className="w-3.5 h-3.5 text-white" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {mod.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeRoleModal}>
              Cancel
            </Button>
            <Button
              onClick={handleRoleSubmit}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {editingRole ? "Update Role" : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Confirmation */}
      <Dialog open={deleteRoleConfirmOpen} onOpenChange={setDeleteRoleConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Delete Role
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this role? 
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRoleConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteRole}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
