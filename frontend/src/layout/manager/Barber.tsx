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
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <Table className="min-w-[680px]">
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>Barber</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {barbers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-gray-500">
                    No barbers found.
                  </TableCell>
                </TableRow>
              ) : (
                barbers.map((barber) => (
                  <TableRow key={barber.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50">
                          <User className="size-4 text-blue-500" />
                        </div>
                        <span className="font-semibold text-gray-900">
                          {barber.fullname}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="size-4 shrink-0 text-gray-400" />
                        {barber.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 whitespace-nowrap text-gray-600">
                        <Phone className="size-4 shrink-0 text-gray-400" />
                        {barber.contact_number}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-medium",
                          !isActiveValue(barber.is_active)
                            ? "bg-gray-100 text-gray-500"
                            : "bg-green-100 text-green-600",
                        )}
                      >
                        {!isActiveValue(barber.is_active) ? "Inactive" : "Active"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(barber)}
                          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
                          aria-label={`Edit ${barber.fullname}`}
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(barber.id)}
                          className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50"
                          aria-label={`Delete ${barber.fullname}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
