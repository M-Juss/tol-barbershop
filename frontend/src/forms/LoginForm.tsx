"use client";

import { InputWithLabel } from "@/components/common/InputWithLabel";
import { SubmitErrorHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  loginSchema,
  LoginSchemaFormValues,
} from "@/validations/auth.validation";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getSavedRoleRoute } from "@/hooks/useRoleRoutePersistence";
import { useRateLimit } from "@/hooks/useRateLimit";
import { normalizeEmail } from "@/lib/sanitizer";
import { useAuth } from "@/contexts/AuthContext";

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

        const role = res.data.user.role;

        if (role === "customer") {
          router.push(getSavedRoleRoute("/customer") ?? "/customer");
        } else if (role === "admin") {
          router.push(getSavedRoleRoute("/admin") ?? "/admin");
        } else if (role === "manager") {
          router.push(getSavedRoleRoute("/manager") ?? "/manager");
        } else {
          toast.error("Login failed");
        }
      } else {
        toast.error("Login failed");
      }
    } catch {
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
        <InputWithLabel
          id="password"
          type="password"
          label="Password"
          placeholder="Enter your password"
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
