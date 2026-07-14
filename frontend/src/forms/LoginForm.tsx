"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { type SubmitErrorHandler, useForm } from "react-hook-form";
import { toast } from "sonner";

import { InputWithLabel } from "@/components/common/InputWithLabel";
import { PasswordInputWithLabel } from "@/components/common/PasswordInputWithLabel";
import { useAuth } from "@/contexts/AuthContext";
import { useRateLimit } from "@/hooks/useRateLimit";
import { ApiError } from "@/lib/api";
import { normalizeEmail } from "@/lib/sanitizer";
import {
  loginSchema,
  type LoginSchemaFormValues,
} from "@/validations/auth.validation";

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const rateLimit = useRateLimit({
    maxAttempts: 20,
    cooldownMinutes: 1,
    storageKey: "login_rate_limit",
  });

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchemaFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginSchemaFormValues) => {
    if (!rateLimit.attempt()) {
      return;
    }

    try {
      const sanitizedData = {
        ...data,
        email: normalizeEmail(data.email),
      };

      const res = await login(sanitizedData);

      if (res?.success) {
        toast.success("Logged in successfully");
        rateLimit.reset();
      } else {
        toast.error("Login failed");
      }
    } catch (error) {
      if (error instanceof ApiError && error.code === "EMAIL_UNVERIFIED") {
        rateLimit.reset();
        router.push(
          `/verify-email?email=${encodeURIComponent(normalizeEmail(data.email))}`,
        );
        toast.info("Verify your email before logging in.");
        return;
      }

      toast.error("Login failed");
    }
  };

  const onFormInvalid: SubmitErrorHandler<LoginSchemaFormValues> = () => {
    toast.error("All fields are required");
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit, onFormInvalid)}
      className="w-full space-y-6"
    >
      <div className="relative">
        <InputWithLabel
          id="email"
          type="email"
          label="Email"
          placeholder="Enter your email"
          maxLength={255}
          className="h-10 border-gray-300 focus-visible:ring-accent/40"
          {...formRegister("email")}
        />
        {errors.email && (
          <p className="absolute left-0 top-full  text-red-500 text-xs">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="relative">
        <PasswordInputWithLabel
          id="password"
          label="Password"
          placeholder="Enter your password"
          maxLength={255}
          autoComplete="current-password"
          className="h-10 border-gray-300 focus-visible:ring-accent/40"
          {...formRegister("password")}
        />
        {errors.password && (
          <p className="absolute left-0 top-full  text-red-500 text-xs">
            {errors.password.message}
          </p>
        )}
      </div>
      <div className="flex justify-end -mt-3">
        <a
          href="/forgot-password"
          className="text-xs text-accent hover:underline"
        >
          Forgot Password?
        </a>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !rateLimit.canAttempt}
        className="bg-accent hover:bg-accent/90 mb-4 w-full text-white py-2 px-4 rounded-md transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {rateLimit.isCooldown
          ? `Try again in ${rateLimit.formatCooldownTime(rateLimit.cooldownRemaining)}`
          : isSubmitting
            ? "Logging in..."
            : "Login"}
      </button>
    </form>
  );
}
