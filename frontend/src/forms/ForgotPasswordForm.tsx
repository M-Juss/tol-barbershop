"use client";

import { InputWithLabel } from "@/components/common/InputWithLabel";
import { forgotPasswordRequest } from "@/services/shared/auth.api";
import {
  ForgotPasswordSchemaFormValues,
  forgotPasswordSchema,
} from "@/validations/auth.validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitErrorHandler, useForm } from "react-hook-form";
import { useState } from "react";
import { toast } from "sonner";
import { useRateLimit } from "@/hooks/useRateLimit";
import { normalizeEmail } from "@/lib/sanitizer";

export function ForgotPasswordForm() {
  const [requestSent, setRequestSent] = useState(false);
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
      setRequestSent(true);
      toast.success("Check your inbox for password reset instructions.");
    } catch {
      toast.error("Failed to request password reset");
    }
  };

  if (requestSent) {
    return (
      <div
        className="mb-6 w-full rounded-md border border-accent/30 bg-accent/10 p-4 text-center"
        role="status"
      >
        <p className="font-medium text-primary">Check your inbox</p>
        <p className="mt-2 text-sm text-gray-600">
          If an account exists for that email, we sent a password reset link.
          Check your spam folder if it does not arrive soon.
        </p>
      </div>
    );
  }

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
          maxLength={255}
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
