import { cn } from "@/lib/utils";
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
import { BarberForm } from "@/forms/BarberForm";
import { BarberSchemaFormValues } from "@/validations/staff.validation";
import {
  getBarbers,
  createBarber,
  updateBarber,
  deleteBarber,
  type Barber,
} from "@/services/manager/barber.api";
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

export function Barber() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [barberToDelete, setBarberToDelete] = useState<number | null>(null);

  useEffect(() => {
    loadBarbers();
  }, []);

  const loadBarbers = async () => {
    try {
      setLoading(true);
      const data = await getBarbers();
      setBarbers(data);
    } catch (error) {
      console.error("Failed to load barbers:", error);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingBarber(null);
    setShowModal(true);
  };

  const openEditModal = (barber: Barber) => {
    setEditingBarber(barber);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBarber(null);
  };

  const handleSubmit = async (data: BarberSchemaFormValues) => {
    try {
      if (editingBarber) {
        await updateBarber(editingBarber.id, data);
        toast.success("Barber updated successfully");
      } else {
        await createBarber(data);
        toast.success("Barber created successfully");
      }
      await loadBarbers();
      closeModal();
    } catch {
      toast.error("Failed to save barber");
    }
  };

  const handleDelete = async (id: number) => {
    setBarberToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!barberToDelete) return;
    try {
      await deleteBarber(barberToDelete);
      await loadBarbers();
      setDeleteConfirmOpen(false);
      setBarberToDelete(null);
      toast.success("Barber deleted successfully");
    } catch {
      toast.error("Failed to delete barber");
    }
  };

  return (
    <div className="w-full h-full p-4 sm:p-6 pb-12 sm:pb-10 font-sans">
      <div className="flex justify-end mb-4">
        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 transition-colors text-white font-semibold rounded-lg px-3 py-1.5 text-xs whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
          <span className="hidden xs:inline">Add Barber</span>
          <span className="xs:hidden">Add</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">Loading barbers...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {barbers.map((barber) => (
            <div
              key={barber.id}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col items-center relative"
            >
              <div className="absolute top-3 right-3">
                <span
                  className={cn(
                    "text-xs font-medium px-2.5 py-1 rounded-full",
                    !isActiveValue(barber.is_active)
                      ? "bg-gray-100 text-gray-500"
                      : "bg-green-100 text-green-600",
                  )}
                >
                  {!isActiveValue(barber.is_active) ? "Inactive" : "Active"}
                </span>
              </div>

              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full mb-3 sm:mb-4 bg-blue-50 border border-blue-100 shrink-0 flex items-center justify-center">
                <User className="w-10 h-10 text-blue-400" />
              </div>

              <p className="font-bold text-gray-900 text-base sm:text-lg mb-3 text-center">
                {barber.fullname}
              </p>

              <div className="w-full space-y-2 mb-4">
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Mail className="w-4 h-4 shrink-0" strokeWidth={1.8} />
                  <span className="truncate">{barber.email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Phone className="w-4 h-4 shrink-0" strokeWidth={1.8} />
                  <span>{barber.contact_number}</span>
                </div>
              </div>

              <div className="w-full border-t border-gray-100 pt-3 flex items-center gap-2">
                <button
                  onClick={() => openEditModal(barber)}
                  className="flex-1 flex items-center justify-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
                >
                  <Pencil className="w-4 h-4" strokeWidth={2} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(barber.id)}
                  className="bg-red-500 hover:bg-red-600 transition-colors text-white rounded-lg p-2"
                >
                  <Trash2 className="w-5 h-5" strokeWidth={2} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <BarberForm
        open={showModal}
        onClose={closeModal}
        onSubmit={handleSubmit}
        initialData={
          editingBarber
            ? {
                fullname: editingBarber.fullname,
                email: editingBarber.email,
                contact_number: editingBarber.contact_number,
                is_active: isActiveValue(editingBarber.is_active),
              }
            : undefined
        }
        title={editingBarber ? "Edit Barber" : "Add New Barber"}
      />

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Delete Barber
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this barber? This action cannot be
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
