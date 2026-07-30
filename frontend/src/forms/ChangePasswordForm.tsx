"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Circle, CircleCheck } from "lucide-react";
import { useEffect } from "react";
import {
  type SubmitErrorHandler,
  useForm,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";

import { PasswordInputWithLabel } from "@/components/common/PasswordInputWithLabel";
import { Button } from "@/components/ui/button";
import {
  changePasswordSchema,
  type ChangePasswordSchemaFormValues,
} from "@/validations/user.validation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const passwordRequirements = [
  {
    label: "At least 6 characters",
    test: (password: string) => password.length >= 6,
  },
];

type ChangePasswordFormProps = {
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
    control,
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
  const password = useWatch({ control, name: "password", defaultValue: "" });
  const passwordConfirmation = useWatch({
    control,
    name: "password_confirmation",
    defaultValue: "",
  });
  const passwordsMatch =
    passwordConfirmation.length > 0 && password === passwordConfirmation;

  useEffect(() => {
    if (open) {
      reset({ current_password: "", password: "", password_confirmation: "" });
    }
  }, [open, reset]);

  const onFormInvalid: SubmitErrorHandler<ChangePasswordSchemaFormValues> = () => {
    toast.error("All fields are required");
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
          method="post"
          onSubmit={handleSubmit(onFormSubmit, onFormInvalid)}
          className="space-y-4"
        >
          <div>
            <PasswordInputWithLabel
              id="current_password"
              label="Current Password"
              placeholder="Enter current password"
              maxLength={255}
              autoComplete="current-password"
              className="h-10"
              {...register("current_password")}
            />
            {errors.current_password && (
              <p className="mt-1 text-xs text-red-500">
                {errors.current_password.message}
              </p>
            )}
          </div>

          <div className="space-y-0.5">
            <PasswordInputWithLabel
              id="password"
              label="New Password"
              placeholder="Enter new password"
              maxLength={255}
              autoComplete="new-password"
              className="h-10"
              {...register("password")}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">
                {errors.password.message}
              </p>
            )}
            <ul className="grid gap-0.5" aria-live="polite">
              {passwordRequirements.map((requirement) => {
                const isMet = requirement.test(password);
                const RequirementIcon = isMet ? CircleCheck : Circle;

                return (
                  <li
                    key={requirement.label}
                    className={cn(
                      "flex items-center gap-1 text-[11px] transition-colors",
                      isMet
                        ? "font-medium text-green-600"
                        : "text-gray-500",
                    )}
                  >
                    <RequirementIcon
                      className="size-3 shrink-0"
                      aria-hidden="true"
                    />
                    {requirement.label}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="space-y-0.5">
            <PasswordInputWithLabel
              id="password_confirmation"
              label="Confirm Password"
              placeholder="Re-enter new password"
              maxLength={255}
              autoComplete="new-password"
              className="h-10"
              {...register("password_confirmation")}
            />
            {errors.password_confirmation && (
              <p className="mt-1 text-xs text-red-500">
                {errors.password_confirmation.message}
              </p>
            )}
            <p
              className={cn(
                "flex items-center gap-1 text-[11px] transition-colors",
                passwordsMatch
                  ? "font-medium text-green-600"
                  : "text-gray-500",
              )}
              aria-live="polite"
            >
              {passwordsMatch ? (
                <CircleCheck className="size-3" aria-hidden="true" />
              ) : (
                <Circle className="size-3" aria-hidden="true" />
              )}
              {passwordsMatch
                ? "Passwords match"
                : "Passwords must match"}
            </p>
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
