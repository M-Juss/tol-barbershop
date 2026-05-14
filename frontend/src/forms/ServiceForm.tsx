"use client";
import { InputWithLabel } from "@/components/common/InputWithLabel";
import { SelectWithLabel } from "@/components/common/SelectWithLabel";
import { TextAreaWithLabel } from "@/components/common/TextAreaWithLabel";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  serviceSchema,
  ServiceSchemaFormValues,
} from "@/validations/service.validation";
import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ServiceFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: (data: ServiceSchemaFormValues) => void;
  initialData?: ServiceSchemaFormValues;
  title?: string;
}

const statusOptions = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

export function ServiceForm({
  open,
  onClose,
  onSubmit,
  initialData,
  title = "Add New Service",
}: ServiceFormProps) {
  const {
    register: formRegister,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<ServiceSchemaFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: "",
      description: "",
      duration: 0,
      price: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (initialData) {
      reset(initialData);
    } else {
      reset({
        name: "",
        description: "",
        duration: 0,
        price: 0,
        is_active: true,
      });
    }
  }, [initialData, open, reset]);

  const onFormSubmit = async (data: ServiceSchemaFormValues) => {
    try {
      await onSubmit?.(data);
      reset();
      onClose();
    } catch (error: unknown) {
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900">
            {title}
          </DialogTitle>
          <DialogDescription className="text-gray-500 text-sm mt-0.5">
            Fill in the service information
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
          {/* Service Name */}
          <div className="relative ">
            <InputWithLabel
              id="name"
              label="Service Name"
              placeholder="e.g., Premium Haircut"
              className="border-gray-300 focus:border-gray-400 h-10"
              {...formRegister("name")}
            />
            {errors.name && (
              <p className="absolute left-0 top-full  text-red-500 text-xs">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="relative ">
            <TextAreaWithLabel
              id="description"
              label="Description"
              placeholder="Describe the service..."
              rows={3}
              className="border border-gray-300 focus:border-gray-400"
              {...formRegister("description")}
            />
            {errors.description && (
              <p className="absolute left-0 top-full  text-red-500 text-xs">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Duration & Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative ">
              <InputWithLabel
                id="duration"
                label="Duration (minutes)"
                type="number"
                className="border-gray-300 focus:border-gray-400 h-10"
                {...formRegister("duration", { valueAsNumber: true })}
              />
              {errors.duration && (
                <p className="absolute left-0 top-full  text-red-500 text-xs">
                  {errors.duration.message}
                </p>
              )}
            </div>
            <div className="relative ">
              <InputWithLabel
                id="price"
                label="Price (₱)"
                type="number"
                className="border-gray-300 focus:border-gray-400 h-10"
                {...formRegister("price", { valueAsNumber: true })}
              />
              {errors.price && (
                <p className="absolute left-0 top-full  text-red-500 text-xs">{errors.price.message}</p>
              )}
            </div>
          </div>

          {/* Status */}
          <SelectWithLabel
            id="is_active"
            label="Status"
            placeholder="Select status"
            options={statusOptions}
            value={watch("is_active") ? "true" : "false"}
            onValueChange={(value) => setValue("is_active", value === "true")}
          />

          {/* Actions */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isSubmitting
                ? "Saving..."
                : initialData
                  ? "Update Service"
                  : "Add Service"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
