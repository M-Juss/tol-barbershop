"use client";
import { InputWithLabel } from "@/components/common/InputWithLabel";
import { SelectWithLabel } from "@/components/common/SelectWithLabel";
import { SubmitErrorHandler, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  barberSchema,
  BarberSchemaFormValues,
} from "@/validations/staff.validation";
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
import { toast } from "sonner";
import {
  sanitizeString,
  normalizeEmail,
  normalizePhone,
} from "@/lib/sanitizer";

type BarberFormProps = {
  open: boolean;
  onClose: () => void;
  onSubmit?: (data: BarberSchemaFormValues) => void;
  initialData?: BarberSchemaFormValues;
  title?: string;
};

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
    control,
  } = useForm<BarberSchemaFormValues>({
    resolver: zodResolver(barberSchema),
    defaultValues: {
      fullname: "",
      email: "",
      contact_number: "",
      is_active: true,
    },
  });

  const isActive = useWatch({ control, name: "is_active" });

  useEffect(() => {
    if (initialData) {
      reset({
        fullname: initialData.fullname ?? "",
        email: initialData.email ?? "",
        contact_number: String(initialData.contact_number ?? ""),
        is_active: Boolean(initialData.is_active),
      });
    } else {
      reset({
        fullname: "",
        email: "",
        contact_number: "",
        is_active: true,
      });
    }
  }, [initialData, open, reset]);

  const onFormSubmit = async (data: BarberSchemaFormValues) => {
    const sanitized = {
      ...data,
      fullname: sanitizeString(data.fullname),
      email: normalizeEmail(data.email),
      contact_number: normalizePhone(data.contact_number),
    };
    await onSubmit?.(sanitized);
  };

  const onFormInvalid: SubmitErrorHandler<BarberSchemaFormValues> = () => {
    toast.error("All fields are required");
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
          <div className="relative ">
            <InputWithLabel
              id="fullname"
              label="Full Name"
              placeholder="John Doe"
              className="border-gray-300 focus:border-gray-400 h-10"
              {...formRegister("fullname")}
            />
            {errors.fullname && (
              <p className="absolute left-0 top-full  text-red-500 text-xs">{errors.fullname.message}</p>
            )}
          </div>

          <div className="relative ">
            <InputWithLabel
              id="email"
              label="Email"
              placeholder="john@example.com"
              type="email"
              className="border-gray-300 focus:border-gray-400 h-10"
              {...formRegister("email")}
            />
            {errors.email && (
              <p className="absolute left-0 top-full  text-red-500 text-xs">{errors.email.message}</p>
            )}
          </div>

          <div className="relative ">
            <InputWithLabel
              id="contact_number"
              label="Contact Number"
              placeholder="09123456789"
              type="tel"
              inputMode="numeric"
              className="border-gray-300 focus:border-gray-400 h-10"
              maxLength={11}
              {...formRegister("contact_number")}
              onInput={(e: React.FormEvent<HTMLInputElement>) => {
                e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "");
              }}
            />
            {errors.contact_number && (
              <p className="absolute left-0 top-full  text-red-500 text-xs">
                {errors.contact_number.message}
              </p>
            )}
          </div>

          <SelectWithLabel
            id="is_active"
            label="Status"
            placeholder="Select status"
            options={statusOptions}
            value={isActive ? "true" : "false"}
            onValueChange={(value) => setValue("is_active", value === "true")}
          />

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
