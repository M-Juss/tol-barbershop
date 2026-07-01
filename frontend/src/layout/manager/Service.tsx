import { useState, useEffect } from "react";
import { Plus, AlertTriangle } from "lucide-react";
import { ServiceForm } from "@/forms/ServiceForm";
import { ServiceSchemaFormValues } from "@/validations/service.validation";
import { ServicesCard } from "@/components/common/ServicesCard";
import {
  getServices,
  createService,
  updateService,
  deleteService,
  type Service,
} from "@/services/manager/service.api";
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

// const initialServices: Service[] = [
//   {
//     id: 1,
//     name: "Regular Haircut",
//     description: "Classic haircut with basic styling",
//     duration: 30,
//     price: 200,
//   },
//   {
//     id: 2,
//     name: "Premium Haircut",
//     description: "Premium haircut with wash and styling",
//     duration: 45,
//     price: 250,
//   },
//   {
//     id: 3,
//     name: "Premium Haircut + Beard Trim",
//     description: "Complete grooming package with haircut and beard styling",
//     duration: 60,
//     price: 350,
//   },
//   {
//     id: 4,
//     name: "Deluxe Haircut + Hot Towel",
//     description: "Luxury haircut experience with hot towel treatment",
//     duration: 60,
//     price: 450,
//   },
//   {
//     id: 5,
//     name: "Beard Trim",
//     description: "Professional beard trimming and shaping",
//     duration: 20,
//     price: 150,
//   },
//   {
//     id: 6,
//     name: "Hair Color",
//     description: "Professional hair coloring service",
//     duration: 120,
//     price: 800,
//   },
// ];

export function Service() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<number | null>(null);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await getServices();
      setServices(data);
    } catch (error) {
      console.error("Failed to load services:", error);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingService(null);
    setShowModal(true);
  };

  const openEditModal = (service: Service) => {
    setEditingService(service);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingService(null);
  };

  const handleSubmit = async (data: ServiceSchemaFormValues) => {
    try {
      if (editingService) {
        await updateService(editingService.id, data);
        toast.success("Service updated successfully");
      } else {
        await createService(data);
        toast.success("Service created successfully");
      }
      await loadServices();
      closeModal();
    } catch (error) {
      console.error("Failed to save service:", error);
      toast.error("Failed to save service");
    }
  };

  const handleDelete = async (id: number) => {
    setServiceToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!serviceToDelete) return;
    try {
      await deleteService(serviceToDelete);
      await loadServices();
      setDeleteConfirmOpen(false);
      setServiceToDelete(null);
      toast.success("Service deleted successfully");
    } catch (error) {
      console.error("Failed to delete service:", error);
      toast.error("Failed to delete service");
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
          <span className="hidden xs:inline">Add Service</span>
          <span className="xs:hidden">Add</span>
        </button>
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">Loading services...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <ServicesCard
              key={service.id}
              id={service.id}
              name={service.name}
              description={service.description}
              duration={service.duration}
              price={service.price}
              is_active={isActiveValue(service.is_active)}
              onEdit={openEditModal}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <ServiceForm
        open={showModal}
        onClose={closeModal}
        onSubmit={handleSubmit}
        initialData={
          editingService
            ? {
                name: editingService.name,
                description: editingService.description,
                duration: editingService.duration,
                price: editingService.price,
                is_active: isActiveValue(editingService.is_active),
              }
            : undefined
        }
        title={editingService ? "Edit Service" : "Add New Service"}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Delete Service
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this service? This action cannot
              be undone.
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
