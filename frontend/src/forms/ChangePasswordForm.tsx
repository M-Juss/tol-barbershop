"use client";

import { SubmitErrorHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  changePasswordSchema,
  ChangePasswordSchemaFormValues,
} from "@/validations/user.validation";
import { InputWithLabel } from "@/components/common/InputWithLabel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { toast } from "sonner";

interface ChangePasswordFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: (payload: ChangePasswordSchemaFormValues) => Promise<void> | void;
  title?: string;
}

export function ChangePasswordForm({
  open,
  onClose,
  onSubmit,
  title = "Change Password",
}: ChangePasswordFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ChangePasswordSchemaFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: "",
      password: "",
      password_confirmation: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({ current_password: "", password: "", password_confirmation: "" });
    }
  }, [open, reset]);

  const onFormInvalid: SubmitErrorHandler<ChangePasswordSchemaFormValues> = (
    formErrors,
  ) => {
    const firstMessage = Object.values(formErrors)[0]?.message;
    toast.error(
      typeof firstMessage === "string"
        ? firstMessage
        : "Please check the form fields.",
    );
  };

  const onFormSubmit = async (data: ChangePasswordSchemaFormValues) => {
    await onSubmit?.(data);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900">
            {title}
          </DialogTitle>
          <DialogDescription className="text-gray-500 text-sm mt-0.5">
            Update your account password.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onFormSubmit, onFormInvalid)}
          className="space-y-4"
        >
          <div>
            <InputWithLabel
              id="current_password"
              label="Current Password"
              type="password"
              placeholder="Enter current password"
              className="h-10"
              {...register("current_password")}
            />
            {errors.current_password && (
              <p className="text-red-500 text-xs mt-1">
                {errors.current_password.message}
              </p>
            )}
          </div>

          <div>
            <InputWithLabel
              id="password"
              label="New Password"
              type="password"
              placeholder="Enter new password"
              className="h-10"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          <div>
            <InputWithLabel
              id="password_confirmation"
              label="Confirm Password"
              type="password"
              placeholder="Re-enter new password"
              className="h-10"
              {...register("password_confirmation")}
            />
            {errors.password_confirmation && (
              <p className="text-red-500 text-xs mt-1">
                {errors.password_confirmation.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Update Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
