"use client";

import { InputWithLabel } from "@/components/common/InputWithLabel";
import { resetPasswordRequest } from "@/services/shared/auth.api";
import {
  resetPasswordSchema,
  ResetPasswordSchemaFormValues,
} from "@/validations/auth.validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitErrorHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useRateLimit } from "@/hooks/useRateLimit";

export function ResetPasswordForm() {
  const router = useRouter();
  const rateLimit = useRateLimit({
    maxAttempts: 5,
    cooldownMinutes: 3,
    storageKey: "reset_password_rate_limit",
  });

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordSchemaFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      password_confirmation: "",
    },
  });

  const onSubmit = async (data: ResetPasswordSchemaFormValues) => {
    if (!rateLimit.attempt()) {
      return;
    }

    try {
      await resetPasswordRequest({
        password: data.password,
        password_confirmation: data.password_confirmation,
      });
      toast.success("Password reset successfully");
      rateLimit.reset();
      router.push("/login");
    } catch {
      toast.error("Failed to reset password");
    }
  };

  const onFormInvalid: SubmitErrorHandler<
    ResetPasswordSchemaFormValues
  > = () => {
    toast.error("All fields are required");
  };

  return (
    <form
      className="w-full space-y-6"
      onSubmit={handleSubmit(onSubmit, onFormInvalid)}
    >
      <div className="relative">
        <InputWithLabel
          id="password"
          type="password"
          label="New Password"
          placeholder="Enter new password"
          className="h-10 border-gray-300 focus-visible:ring-accent/40"
          {...formRegister("password")}
        />
        {errors.password && (
          <p className="absolute left-0 top-full text-red-500 text-xs">
            {errors.password.message}
          </p>
        )}
      </div>

      <div className="relative">
        <InputWithLabel
          id="password_confirmation"
          type="password"
          label="Confirm New Password"
          placeholder="Confirm new password"
          className="h-10 border-gray-300 focus-visible:ring-accent/40"
          {...formRegister("password_confirmation")}
        />
        {errors.password_confirmation && (
          <p className="absolute left-0 top-full text-red-500 text-xs">
            {errors.password_confirmation.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !rateLimit.canAttempt}
        className="bg-accent hover:bg-accent/90 mb-4 w-full text-white py-2 px-4 rounded-md transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {rateLimit.isCooldown
          ? `Try again in ${rateLimit.formatCooldownTime(rateLimit.cooldownRemaining)}`
          : isSubmitting
            ? "Resetting..."
            : "Reset Password"}
      </button>
    </form>
  );
}
