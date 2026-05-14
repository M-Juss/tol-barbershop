import { useState, useEffect } from "react";
import {
  Plus,
  AlertTriangle,
  Mail,
  Phone,
  Pencil,
  Trash2,
  User,
} from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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

const getImageUrl = (image: string | null | undefined): string => {
  if (!image) return "";
  if (image.startsWith("http://") || image.startsWith("https://")) return image;

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/api\/?$/, "");
  const normalizedPath = image.startsWith("/") ? image : `/${image}`;
  return `${apiBase}${normalizedPath}`;
};

export function Admin() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<number | null>(null);

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const data = await getAdmins();
      setAdmins(data);
    } catch (error) {
      console.error("Failed to load admins:", error);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingAdmin(null);
    setShowModal(true);
  };

  const openEditModal = (admin: Admin) => {
    setEditingAdmin(admin);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAdmin(null);
  };

  const handleSubmit = async (
    data: AdminSchemaFormValues & { image?: File },
  ) => {
    try {
      if (editingAdmin) {
        await updateAdmin(editingAdmin.id, data);
        toast.success("Admin updated successfully");
      } else {
        await createAdmin(data);
        toast.success("Admin created successfully");
      }
      await loadAdmins();
      closeModal();
    } catch (error) {
      console.error("Failed to save admin:", error);
      toast.error("Failed to save admin");
    }
  };

  const handleDelete = async (id: number) => {
    setAdminToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!adminToDelete) return;
    try {
      await deleteAdmin(adminToDelete);
      await loadAdmins();
      setDeleteConfirmOpen(false);
      setAdminToDelete(null);
      toast.success("Admin deleted successfully");
    } catch (error) {
      console.error("Failed to delete admin:", error);
      toast.error("Failed to delete admin");
    }
  };

  return (
    <div className="w-full h-full bg-slate-100 p-4 sm:p-6 font-sans">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Admins
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            Manage administrative users
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 transition-colors text-white font-semibold rounded-xl px-4 sm:px-5 py-2.5 sm:py-3 text-sm whitespace-nowrap"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          <span className="hidden xs:inline">Add Admin</span>
          <span className="xs:hidden">Add</span>
        </button>
      </div>

      {/* Admins Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">Loading admins...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {admins.map((admin) => (
            <div
              key={admin.id}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col items-center relative"
            >
              {/* Status Tag */}
              <div className="absolute top-3 right-3">
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    !isActiveValue(admin.is_active)
                      ? "bg-gray-100 text-gray-500"
                      : "bg-green-100 text-green-600"
                  }`}
                >
                  {!isActiveValue(admin.is_active) ? "Inactive" : "Active"}
                </span>
              </div>

              {/* Avatar */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden mb-3 sm:mb-4 bg-gray-200 shrink-0">
                {admin.image ? (
                  <img
                    src={getImageUrl(admin.image)}
                    alt={admin.fullname}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "";
                      e.currentTarget.style.backgroundColor = "#f3f4f6";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-10 h-10 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Name & Role */}
              <p className="font-bold text-gray-900 text-base sm:text-lg text-center mb-3">
                {admin.fullname}
              </p>

              {/* Contact Info */}
              <div className="w-full space-y-2 mb-4">
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Mail className="w-4 h-4 shrink-0" strokeWidth={1.8} />
                  <span className="truncate">{admin.email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Phone className="w-4 h-4 shrink-0" strokeWidth={1.8} />
                  <span>{admin.contact_number}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="w-full space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(admin)}
                    className="flex-1 flex items-center justify-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
                  >
                    <Pencil className="w-4 h-4" strokeWidth={2} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(admin.id)}
                    className="bg-red-500 hover:bg-red-600 transition-colors text-white rounded-lg p-2"
                  >
                    <Trash2 className="w-5 h-5" strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AdminForm
        open={showModal}
        onClose={closeModal}
        onSubmit={handleSubmit}
        initialData={
          editingAdmin
            ? {
                fullname: editingAdmin.fullname,
                email: editingAdmin.email,
                contact_number: editingAdmin.contact_number,
                image: editingAdmin.image,
                is_active: isActiveValue(editingAdmin.is_active),
              }
            : undefined
        }
        title={editingAdmin ? "Edit Admin" : "Add New Admin"}
      />

      {/* Delete Confirmation Dialog */}
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
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
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
