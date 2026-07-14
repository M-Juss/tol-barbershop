"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { type SubmitErrorHandler, useForm } from "react-hook-form";
import { toast } from "sonner";

import { InputWithLabel } from "@/components/common/InputWithLabel";
import { useRateLimit } from "@/hooks/useRateLimit";
import { ApiError } from "@/lib/api";
import {
  resetPasswordRequest,
  validateResetPasswordTokenRequest,
} from "@/services/shared/auth.api";
import {
  resetPasswordLinkSchema,
  resetPasswordSchema,
  type ResetPasswordSchemaFormValues,
} from "@/validations/auth.validation";

type ResetPasswordFormProps = {
  email: string;
  token: string;
};

type LinkStatus = "checking" | "valid" | "invalid" | "error";

export function ResetPasswordForm({ email, token }: ResetPasswordFormProps) {
  const hasValidLinkData = resetPasswordLinkSchema.safeParse({
    email,
    token,
  }).success;
  const [linkStatus, setLinkStatus] = useState<LinkStatus>(() =>
    hasValidLinkData ? "checking" : "invalid",
  );
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
      email,
      token,
      password: "",
      password_confirmation: "",
    },
  });

  useEffect(() => {
    if (!hasValidLinkData) return;

    const controller = new AbortController();

    const validateLink = async () => {
      try {
        const response = await validateResetPasswordTokenRequest(
          { email, token },
          controller.signal,
        );
        setLinkStatus(response.data.valid ? "valid" : "invalid");
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;

        if (error instanceof ApiError && error.status === 422) {
          setLinkStatus("invalid");
          return;
        }

        setLinkStatus("error");
      }
    };

    void validateLink();

    return () => controller.abort();
  }, [email, hasValidLinkData, token]);

  const onSubmit = async (data: ResetPasswordSchemaFormValues) => {
    if (!rateLimit.attempt()) return;

    try {
      await resetPasswordRequest({
        email: data.email,
        token: data.token,
        password: data.password,
        password_confirmation: data.password_confirmation,
      });
      toast.success("Password reset successfully");
      rateLimit.reset();
      window.location.replace("/login?password_reset=1");
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        setLinkStatus("invalid");
        toast.error("This reset link is invalid or expired.");
        return;
      }

      toast.error("Failed to reset password");
    }
  };

  const onFormInvalid: SubmitErrorHandler<
    ResetPasswordSchemaFormValues
  > = () => {
    toast.error("Please enter a valid password and confirmation");
  };

  if (linkStatus === "checking") {
    return (
      <div
        className="mb-6 w-full rounded-md border border-gray-200 bg-gray-50 p-4 text-center"
        role="status"
        aria-live="polite"
      >
        <p className="font-medium text-gray-700">Checking your reset link...</p>
        <p className="mt-2 text-sm text-gray-500">
          Please wait while we verify that it is still valid.
        </p>
      </div>
    );
  }

  if (linkStatus === "error") {
    return (
      <div
        className="mb-6 w-full rounded-md border border-amber-200 bg-amber-50 p-4 text-center"
        role="alert"
      >
        <p className="font-medium text-amber-800">
          We could not verify this reset link.
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Refresh the page to try again, or request a new link.
        </p>
        <a
          href="/forgot-password"
          className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
        >
          Request a new reset link
        </a>
      </div>
    );
  }

  if (linkStatus === "invalid") {
    return (
      <div
        className="mb-6 w-full rounded-md border border-red-200 bg-red-50 p-4 text-center"
        role="alert"
      >
        <p className="font-medium text-red-700">
          This password reset link is invalid or expired.
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Request a new link to continue securely.
        </p>
        <a
          href="/forgot-password"
          className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
        >
          Request a new reset link
        </a>
      </div>
    );
  }

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
          maxLength={255}
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "password-error" : undefined}
          className="h-10 border-gray-300 focus-visible:ring-accent/40"
          {...formRegister("password")}
        />
        {errors.password && (
          <p
            id="password-error"
            className="absolute left-0 top-full text-xs text-red-500"
          >
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
          maxLength={255}
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password_confirmation)}
          aria-describedby={
            errors.password_confirmation
              ? "password-confirmation-error"
              : undefined
          }
          className="h-10 border-gray-300 focus-visible:ring-accent/40"
          {...formRegister("password_confirmation")}
        />
        {errors.password_confirmation && (
          <p
            id="password-confirmation-error"
            className="absolute left-0 top-full text-xs text-red-500"
          >
            {errors.password_confirmation.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !rateLimit.canAttempt}
        className="mb-4 w-full rounded-md bg-accent px-4 py-2 text-white transition duration-300 hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
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
