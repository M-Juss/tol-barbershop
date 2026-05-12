"use client";
import { InputWithLabel } from "@/components/common/InputWithLabel";
import { SelectWithLabel } from "@/components/common/SelectWithLabel";
import { SubmitErrorHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  barberSchema,
  BarberSchemaFormValues,
} from "@/validations/staff.validation";
import { useEffect, useState } from "react";
import { User } from "lucide-react";
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

interface BarberFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: (data: BarberSchemaFormValues & { image?: File }) => void;
  initialData?: BarberSchemaFormValues;
  title?: string;
}

const statusOptions = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

export function BarberForm({
  open,
  onClose,
  onSubmit,
  initialData,
  title = "Add New Barber",
}: BarberFormProps) {
  const {
    register: formRegister,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<BarberSchemaFormValues>({
    resolver: zodResolver(barberSchema),
    defaultValues: {
      fullname: "",
      email: "",
      contact_number: "",
      image: "",
      is_active: true,
    },
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  useEffect(() => {
    const newImagePreview = initialData?.image || "";
    setImagePreview(newImagePreview);
    setImageFile(null);

    if (initialData) {
      reset({
        fullname: initialData.fullname ?? "",
        email: initialData.email ?? "",
        contact_number: String(initialData.contact_number ?? ""),
        image: initialData.image ?? "",
        is_active: Boolean(initialData.is_active),
      });
    } else {
      reset({
        fullname: "",
        email: "",
        contact_number: "",
        image: "",
        is_active: true,
      });
    }
  }, [initialData, open, reset]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setValue("image", result);
      };
      reader.readAsDataURL(file);
    }
  };

  const onFormSubmit = async (data: BarberSchemaFormValues) => {
    // Include the image file if selected
    const submitData: BarberSchemaFormValues & { image?: File } = {
      ...data,
      image: imageFile || undefined,
    };
    await onSubmit?.(submitData);
  };

  const onFormInvalid: SubmitErrorHandler<BarberSchemaFormValues> = (
    formErrors,
  ) => {
    const firstMessage = Object.values(formErrors)[0]?.message;
    toast.error(
      typeof firstMessage === "string"
        ? firstMessage
        : "Please check the form fields.",
    );
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900">
            {title}
          </DialogTitle>
          <DialogDescription className="text-gray-500 text-sm mt-0.5">
            Fill in the barber information
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onFormSubmit, onFormInvalid)}
          className="space-y-4"
        >
          {/* Profile Image */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 border-2 border-gray-300">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Profile preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-12 h-12 text-gray-400" />
                </div>
              )}
            </div>
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="cursor-pointer inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 transition-colors text-gray-700 font-medium rounded-lg px-4 py-2 text-sm"
              >
                Select Image
              </label>
            </div>
          </div>

          {/* Full Name */}
          <InputWithLabel
            id="fullname"
            label="Full Name"
            placeholder="John Doe"
            className="border-gray-300 focus:border-gray-400 h-10"
            {...formRegister("fullname")}
          />
          {errors.fullname && (
            <p className="text-red-500 text-xs">{errors.fullname.message}</p>
          )}

          {/* Email */}
          <InputWithLabel
            id="email"
            label="Email"
            placeholder="john@example.com"
            type="email"
            className="border-gray-300 focus:border-gray-400 h-10"
            {...formRegister("email")}
          />
          {errors.email && (
            <p className="text-red-500 text-xs">{errors.email.message}</p>
          )}

          {/* Contact Number */}
          <InputWithLabel
            id="contact_number"
            label="Contact Number"
            placeholder="09123456789"
            type="tel"
            className="border-gray-300 focus:border-gray-400 h-10"
            {...formRegister("contact_number")}
          />
          {errors.contact_number && (
            <p className="text-red-500 text-xs">
              {errors.contact_number.message}
            </p>
          )}

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
                  ? "Update Barber"
                  : "Add Barber"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
