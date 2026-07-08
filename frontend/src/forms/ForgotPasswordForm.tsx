"use client";

import { InputWithLabel } from "@/components/common/InputWithLabel";
import { forgotPasswordRequest } from "@/services/shared/auth.api";
import {
  ForgotPasswordSchemaFormValues,
  forgotPasswordSchema,
} from "@/validations/auth.validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitErrorHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useRateLimit } from "@/hooks/useRateLimit";
import { normalizeEmail } from "@/lib/sanitizer";

export function ForgotPasswordForm() {
  const router = useRouter();
  const rateLimit = useRateLimit({
    maxAttempts: 5,
    cooldownMinutes: 3,
    storageKey: "forgot_password_rate_limit",
  });

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordSchemaFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordSchemaFormValues) => {
    if (!rateLimit.attempt()) {
      return;
    }

    try {
      const sanitizedData = {
        email: normalizeEmail(data.email),
      };

      await forgotPasswordRequest(sanitizedData);
      toast.success("Password reset link sent");
      rateLimit.reset();

      router.push("/reset-password");
    } catch {
      toast.error("Failed to request password reset");
    }
  };

  const onFormInvalid: SubmitErrorHandler<
    ForgotPasswordSchemaFormValues
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
          id="email"
          type="email"
          label="Email"
          placeholder="Enter your account email"
          className="h-10 border-gray-300 focus-visible:ring-accent/40"
          {...formRegister("email")}
        />
        {errors.email && (
          <p className="absolute left-0 top-full text-red-500 text-xs">
            {errors.email.message}
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
            ? "Requesting..."
            : "Send Reset Link"}
      </button>
    </form>
  );
}
