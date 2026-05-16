"use client";

import { useMemo } from "react";
import { InputWithLabel } from "@/components/common/InputWithLabel";
import { resetPasswordRequest } from "@/services/auth.api";
import {
  resetPasswordSchema,
  ResetPasswordSchemaFormValues,
} from "@/validations/auth.validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitErrorHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialEmail = useMemo(() => searchParams.get("email") ?? "", [searchParams]);
  const initialToken = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordSchemaFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: initialEmail,
      token: initialToken,
      password: "",
      password_confirmation: "",
    },
  });

  const onSubmit = async (data: ResetPasswordSchemaFormValues) => {
    try {
      await resetPasswordRequest(data);
      toast.success("Password reset successfully");
      router.push("/login");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to reset password";
      toast.error(message);
    }
  };

  const onFormInvalid: SubmitErrorHandler<ResetPasswordSchemaFormValues> = () => {
    toast.error("Please complete the form correctly");
  };

  return (
    <form className="w-full space-y-6" onSubmit={handleSubmit(onSubmit, onFormInvalid)}>
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
          <p className="absolute left-0 top-full text-red-500 text-xs">{errors.email.message}</p>
        )}
      </div>

      <div className="relative">
        <InputWithLabel
          id="token"
          type="text"
          label="Reset Token"
          placeholder="Paste your reset token"
          className="h-10 border-gray-300 focus-visible:ring-accent/40"
          {...formRegister("token")}
        />
        {errors.token && (
          <p className="absolute left-0 top-full text-red-500 text-xs">{errors.token.message}</p>
        )}
      </div>

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
          <p className="absolute left-0 top-full text-red-500 text-xs">{errors.password.message}</p>
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
        disabled={isSubmitting}
        className="bg-accent hover:bg-accent/90 mb-4 w-full text-white py-2 px-4 rounded-md transition duration-300"
      >
        {isSubmitting ? "Resetting..." : "Reset Password"}
      </button>
    </form>
  );
}
