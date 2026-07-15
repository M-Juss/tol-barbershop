"use client";

import { Circle, CircleCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type SubmitErrorHandler,
  useForm,
  useWatch,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { InputWithLabel } from "@/components/common/InputWithLabel";
import { PasswordInputWithLabel } from "@/components/common/PasswordInputWithLabel";
import { useRateLimit } from "@/hooks/useRateLimit";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  normalizeEmail,
  normalizePhone,
  sanitizeString,
} from "@/lib/sanitizer";
import { registerCustomerRequest } from "@/services/shared/auth.api";
import {
  registerSchema,
  type RegisterSchemaFormValues,
} from "@/validations/auth.validation";

const passwordRequirements = [
  {
    label: "At least 6 characters",
    test: (password: string) => password.length >= 6,
  },
];

export function RegisterForm() {
  const router = useRouter();
  const rateLimit = useRateLimit({
    maxAttempts: 20,
    cooldownMinutes: 1,
    storageKey: "register_rate_limit",
  });

  const {
    register: formRegister,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterSchemaFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      terms_accepted: false,
      privacy_acknowledged: false,
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

  const onSubmit = async (data: RegisterSchemaFormValues) => {
    if (!rateLimit.attempt()) return;

    try {
      const sanitizedData = {
        ...data,
        fullname: sanitizeString(data.fullname),
        email: normalizeEmail(data.email),
        contact_number: normalizePhone(data.contact_number),
      };

      const response = await registerCustomerRequest(sanitizedData);

      if (response.success === true) {
        toast.success("Account created. Check your inbox to verify your email.");
        rateLimit.reset();
        router.push(
          `/verify-email?email=${encodeURIComponent(sanitizedData.email)}`,
        );
      } else {
        toast.error("Registration failed");
      }
    } catch (error) {
      const emailErrors =
        error instanceof ApiError &&
        error.errors &&
        typeof error.errors === "object"
          ? (error.errors as Record<string, unknown>).email
          : null;
      const emailMessages = Array.isArray(emailErrors)
        ? emailErrors
        : [emailErrors];
      const emailExists = emailMessages.some(
        (message) =>
          typeof message === "string" &&
          /already|taken|exists/i.test(message),
      );

      if (emailExists) {
        router.push(
          `/verify-email?email=${encodeURIComponent(normalizeEmail(data.email))}`,
        );
        toast.info(
          "This email is already registered. Resend verification below or log in.",
        );
        return;
      }

      toast.error("Registration failed");
    }
  };

  const onFormInvalid: SubmitErrorHandler<RegisterSchemaFormValues> = () => {
    toast.error("All fields are required");
  };

  return (
    <form
      action=""
      className="w-full space-y-6"
      onSubmit={handleSubmit(onSubmit, onFormInvalid)}
    >
      <div className="relative ">
        <InputWithLabel
          id="fullname"
          type="text"
          label="Full Name"
          placeholder="Enter your full name"
          maxLength={255}
          className="h-10 border-gray-300 focus-visible:ring-accent/40"
          {...formRegister("fullname")}
        />
        {errors.fullname && (
          <p className="absolute left-0 top-full  text-red-500 text-xs">
            {errors.fullname.message}
          </p>
        )}
      </div>

      <div className="relative ">
        <InputWithLabel
          id="contact_number"
          type="tel"
          inputMode="numeric"
          label="Contact Number"
          placeholder="Enter your contact number"
          className="h-10 border-gray-300 focus-visible:ring-accent/40"
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

      <div className="relative ">
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

      <div className="space-y-2">
        <PasswordInputWithLabel
          id="password"
          label="Password"
          placeholder="Enter your password"
          maxLength={255}
          autoComplete="new-password"
          className="h-10 border-gray-300 focus-visible:ring-accent/40"
          {...formRegister("password")}
        />
        {errors.password && (
          <p className="text-xs text-red-500">
            {errors.password.message}
          </p>
        )}
        <ul className="grid gap-1.5 sm:grid-cols-2" aria-live="polite">
          {passwordRequirements.map((requirement) => {
            const isMet = requirement.test(password);
            const RequirementIcon = isMet ? CircleCheck : Circle;

            return (
              <li
                key={requirement.label}
                className={cn(
                  "flex items-center gap-1.5 text-xs transition-colors",
                  isMet ? "font-medium text-green-600" : "text-gray-500",
                )}
              >
                <RequirementIcon
                  className="size-3.5 shrink-0"
                  aria-hidden="true"
                />
                {requirement.label}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="space-y-2">
        <PasswordInputWithLabel
          id="password_confirmation"
          label="Confirm Password"
          placeholder="Confirm your password"
          maxLength={255}
          autoComplete="new-password"
          className="h-10 border-gray-300 focus-visible:ring-accent/40"
          {...formRegister("password_confirmation")}
        />
        {errors.password_confirmation && (
          <p className="text-xs text-red-500">
            {errors.password_confirmation.message}
          </p>
        )}
        <p
          className={cn(
            "flex items-center gap-1.5 text-xs transition-colors",
            passwordsMatch ? "font-medium text-green-600" : "text-gray-500",
          )}
          aria-live="polite"
        >
          {passwordsMatch ? (
            <CircleCheck className="size-3.5" aria-hidden="true" />
          ) : (
            <Circle className="size-3.5" aria-hidden="true" />
          )}
          {passwordsMatch ? "Passwords match" : "Passwords must match"}
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-gray-700">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 accent-primary"
              {...formRegister("terms_accepted")}
            />
            <span>
              I have read and agree to the{" "}
              <Link
                href="/terms-of-use"
                target="_blank"
                className="font-medium text-accent hover:underline"
              >
                Terms of Use
              </Link>
              .
            </span>
          </label>
          {errors.terms_accepted && (
            <p className="mt-1 text-xs text-red-500">
              {errors.terms_accepted.message}
            </p>
          )}
        </div>

        <div>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-gray-700">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 accent-primary"
              {...formRegister("privacy_acknowledged")}
            />
            <span>
              I acknowledge that I have read the{" "}
              <Link
                href="/privacy-policy"
                target="_blank"
                className="font-medium text-accent hover:underline"
              >
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          {errors.privacy_acknowledged && (
            <p className="mt-1 text-xs text-red-500">
              {errors.privacy_acknowledged.message}
            </p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !rateLimit.canAttempt}
        className="bg-accent hover:bg-accent/90 mb-4 w-full text-white py-2 px-4 rounded-md transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {rateLimit.isCooldown
          ? `Try again in ${rateLimit.formatCooldownTime(rateLimit.cooldownRemaining)}`
          : isSubmitting
            ? "Registering..."
            : "Register"}
      </button>
    </form>
  );
}
