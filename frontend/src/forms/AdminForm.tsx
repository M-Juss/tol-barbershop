"use client";
import Image from "next/image";
import { InputWithLabel } from "@/components/common/InputWithLabel";
import { SelectWithLabel } from "@/components/common/SelectWithLabel";
import { SubmitErrorHandler, useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  adminCreateSchema,
  adminUpdateSchema,
  AdminSchemaFormValues,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  sanitizeString,
  normalizeEmail,
  normalizePhone,
} from "@/lib/sanitizer";
import { getImageUrl } from "@/lib/image";
import type { Role } from "@/services/manager/role.api";

type AdminFormProps = {
  open: boolean;
  onClose: () => void;
  onSubmit?: (data: AdminSchemaFormValues & { image?: File }) => void;
  initialData?: AdminSchemaFormValues;
  title?: string;
  roles?: Role[];
};

const statusOptions = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

export function AdminForm({
  open,
  onClose,
  onSubmit,
  initialData,
  title = "Add New Admin",
  roles = [],
}: AdminFormProps) {
  const isEditMode = Boolean(initialData);
  const resolver = zodResolver(
    isEditMode ? adminUpdateSchema : adminCreateSchema,
  ) as Resolver<AdminSchemaFormValues>;
  const {
    register: formRegister,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    control,
  } = useForm<AdminSchemaFormValues>({
    resolver,
    defaultValues: {
      fullname: "",
      email: "",
      contact_number: "",
      image: "",
      password: "",
      confirm_password: "",
      is_active: true,
      role_id: null,
    },
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const isActive = useWatch({ control, name: "is_active" });
  const roleId = useWatch({ control, name: "role_id" });

  useEffect(() => {
    const newImagePreview = typeof initialData?.image === "string"
      ? getImageUrl(initialData.image)
      : "";
    queueMicrotask(() => {
      setImagePreview(newImagePreview);
      setImageFile(null);
    });

    if (initialData) {
      reset({
        fullname: initialData.fullname ?? "",
        email: initialData.email ?? "",
        contact_number: String(initialData.contact_number ?? ""),
        image: initialData.image ?? "",
        password: "",
        confirm_password: "",
        is_active: Boolean(initialData.is_active),
        role_id: initialData.role_id ?? null,
      });
    } else {
      reset({
        fullname: "",
        email: "",
        contact_number: "",
        image: "",
        password: "",
        confirm_password: "",
        is_active: true,
        role_id: null,
      });
    }
  }, [initialData, open, reset]);

  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif"];
  const MAX_IMAGE_SIZE = 3 * 1024 * 1024;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG, and HEIC images are allowed");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Image must be less than 3MB");
      e.target.value = "";
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setValue("image", result);
    };
    reader.readAsDataURL(file);
  };

  const onFormSubmit = async (data: AdminSchemaFormValues) => {
    const sanitized = {
      ...data,
      fullname: sanitizeString(data.fullname),
      email: normalizeEmail(data.email),
      contact_number: normalizePhone(data.contact_number),
    };
    const submitData: AdminSchemaFormValues & { image?: File } = {
      ...sanitized,
      image: imageFile || undefined,
    };
    await onSubmit?.(submitData);
  };

  const onFormInvalid: SubmitErrorHandler<AdminSchemaFormValues> = () => {
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
            Fill in the admin information
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onFormSubmit, onFormInvalid)}
          className="space-y-4"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-200 border-2 border-gray-300">
              {imagePreview ? (
                <Image
                  src={imagePreview}
                  alt="Profile preview"
                  fill
                  sizes="96px"
                  className="object-cover"
                  unoptimized
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
                accept=".jpg,.jpeg,.png,.heic,.heif"
                onChange={handleImageChange}
                className="hidden"
                id="image"
              />
              <label
                htmlFor="image"
                className="cursor-pointer inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 transition-colors text-gray-700 font-medium rounded-lg px-4 py-2 text-sm"
              >
                Select Image
              </label>
            </div>
          </div>

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

          {isEditMode ? (
            <p className="text-xs text-gray-500">
              Leave this blank if you don&apos;t want to change password.
            </p>
          ) : null}

          <div className="relative ">
            <InputWithLabel
              id="password"
              label={isEditMode ? "Change Password" : "Password"}
              placeholder={
                isEditMode ? "Enter new password (optional)" : "Enter password"
              }
              type="password"
              className="border-gray-300 focus:border-gray-400 h-10"
              {...formRegister("password")}
            />
            {errors.password && (
              <p className="absolute left-0 top-full text-red-500 text-xs">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="relative ">
            <InputWithLabel
              id="confirm_password"
              label={
                isEditMode ? "Confirm New Password" : "Confirm Password"
              }
              placeholder="Confirm password"
              type="password"
              className="border-gray-300 focus:border-gray-400 h-10"
              {...formRegister("confirm_password")}
            />
            {errors.confirm_password && (
              <p className="absolute left-0 top-full text-red-500 text-xs">
                {errors.confirm_password.message}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <Select
              value={roleId != null ? String(roleId) : ""}
              onValueChange={(value) =>
                setValue("role_id", value ? Number(value) : null)
              }
            >
              <SelectTrigger className="w-full border-gray-300 h-10">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={String(role.id)}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
                  ? "Update Admin"
                  : "Add Admin"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
